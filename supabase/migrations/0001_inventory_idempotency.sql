-- =====================================================================
-- 0001 — atomic stock reservation, safe restoration, duplicate-order guard
--
-- * place_order() now TAKES stock in the same transaction that creates the
--   order (conditional UPDATE ... WHERE stock >= qty, rows processed in id
--   order so concurrent orders cannot deadlock). The last piece can only be
--   sold once, however many customers press "order" at the same moment.
-- * Optional p_idempotency_key: the browser sends one random key per checkout;
--   retries / double clicks / flaky networks return the SAME order instead of
--   creating a second one (advisory lock + unique index).
-- * Cancelling an order gives its pieces back; un-cancelling takes them again
--   (refused if they were sold meanwhile); deleting a reserved order gives them back.
-- * stock_movements records every change made by orders (admin-readable).
--
-- Backward compatible: callers that send only (p_customer, p_items) keep working
-- and get the same prices, fees and response fields as before (+ "duplicate").
-- Verify after applying:
--   select public.place_order('{"name":"..."}'::jsonb, '[]'::jsonb);  -- raises invalid_name
--   select count(*) from public.stock_movements;                      -- table exists, admin-only
-- Rollback: supabase/rollbacks/0001_inventory_idempotency.down.sql
-- =====================================================================

alter table public.orders
  add column idempotency_key uuid,
  add column stock_state text not null default 'none',
  add column shipping_tbd boolean not null default false,
  add column cancelled_at timestamp with time zone;
alter table public.orders add constraint orders_stock_state_check check (stock_state in ('none', 'reserved', 'released'));
create unique index orders_idempotency_key_idx on public.orders (idempotency_key) where idempotency_key is not null;

create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  order_no bigint,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('order', 'cancel', 'uncancel', 'delete')),
  created_at timestamp with time zone not null default now()
);
create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);
create index stock_movements_order_idx on public.stock_movements (order_id);
alter table public.stock_movements enable row level security;
create policy stock_movements_admin_read on public.stock_movements as permissive for select to authenticated
  using (( select private.is_admin() as is_admin));
revoke all on public.stock_movements from anon, authenticated, service_role;
grant select on public.stock_movements to authenticated;

-- ---------------------------------------------------------------- checkout
drop function public.place_order(jsonb, jsonb);
create function public.place_order(p_customer jsonb, p_items jsonb, p_idempotency_key uuid default null)
 returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_name    text := btrim(coalesce(p_customer->>'name', ''));
  v_phone   text := btrim(coalesce(p_customer->>'phone', ''));
  v_country text := left(nullif(btrim(coalesce(p_customer->>'country', '')), ''), 80);
  v_local   boolean;
  v_items jsonb := '[]'::jsonb;
  v_sub integer := 0; v_fee integer := 0; v_free integer; v_tbd boolean := false;
  v_id uuid; v_no bigint; it jsonb; q integer; r record; s jsonb; raw text;
  v_order text[] := '{}';          -- product ids in the customer's order of appearance
  v_qty jsonb := '{}'::jsonb;      -- product id -> total quantity
  v_rows jsonb := '{}'::jsonb;     -- product id -> {name, price, image, stocked}
  v_pid uuid; v_any_stock boolean := false; prev public.orders;
begin
  -- 1) the same checkout sent twice (double click, retry after a timeout): return the first order
  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 7341));
    select * into prev from public.orders where idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('order_no', prev.order_no, 'subtotal', prev.subtotal, 'delivery', prev.delivery,
        'total', prev.total, 'items', prev.items, 'country', prev.country,
        'international', prev.country not in ('العراق', 'Iraq', 'iraq'), 'shipping_tbd', prev.shipping_tbd, 'duplicate', true);
    end if;
  end if;

  -- 2) validate (same rules and error codes as before)
  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'invalid_name'; end if;
  if length(regexp_replace(v_phone, '\D', '', 'g')) < 7 or length(v_phone) > 30 then raise exception 'invalid_phone'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 40 then
    raise exception 'invalid_items';
  end if;
  v_country := coalesce(v_country, 'العراق');
  v_local := v_country in ('العراق', 'Iraq', 'iraq');

  -- 3) merge repeated lines of the same product (quantity per line clamped 1..50 as before, total capped at 50)
  for it in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(it) is distinct from 'object' or coalesce(it->>'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'product_unavailable';
    end if;
    q := least(greatest(coalesce(nullif(it->>'qty', '')::integer, 1), 1), 50);
    v_pid := (it->>'id')::uuid;
    if not v_qty ? v_pid::text then v_order := v_order || v_pid::text; end if;
    v_qty := jsonb_set(v_qty, array[v_pid::text], to_jsonb(least(coalesce((v_qty->>v_pid::text)::integer, 0) + q, 50)));
  end loop;

  -- 4) take stock atomically, products in id order (no deadlocks between concurrent orders)
  for v_pid in select x::uuid from unnest(v_order) x order by 1 loop
    q := (v_qty->>v_pid::text)::integer;
    select p.id, p.name, p.price, p.images, p.stock into r from public.products p where p.id = v_pid and p.active;
    if not found then raise exception 'product_unavailable'; end if;
    if r.stock is not null then
      update public.products p set stock = p.stock - q
        where p.id = v_pid and p.active and p.stock is not null and p.stock >= q
        returning p.id, p.name, p.price, p.images, p.stock into r;
      if not found then raise exception 'out_of_stock'; end if;
      v_any_stock := true;
    end if;
    v_rows := v_rows || jsonb_build_object(v_pid::text, jsonb_build_object('name', r.name, 'price', r.price,
      'image', coalesce(r.images[1], ''), 'stocked', r.stock is not null));
  end loop;

  -- 5) lines in the customer's order, priced from the database (never from the browser)
  foreach raw in array v_order loop
    q := (v_qty->>raw)::integer;
    v_sub := v_sub + (v_rows->raw->>'price')::integer * q;
    v_items := v_items || jsonb_build_object('id', raw::uuid, 'name', v_rows->raw->>'name', 'price', (v_rows->raw->>'price')::integer,
                                             'qty', q, 'image', v_rows->raw->>'image');
  end loop;

  -- 6) delivery fee (unchanged rules)
  select data into s from public.settings where id = 1;
  if v_local then
    raw := s #>> '{shop,delivery_fee}';
    v_fee := case when raw ~ '^\d+$' then raw::integer else 0 end;
    raw := s #>> '{shop,free_delivery_over}';
  else
    raw := s #>> '{shop,intl_delivery_fee}';
    v_fee := case when raw ~ '^\d+$' then raw::integer else 0 end;
    v_tbd := v_fee = 0;
    raw := s #>> '{shop,intl_free_over}';
  end if;
  v_free := case when raw ~ '^\d+$' and raw::integer > 0 then raw::integer end;
  if v_free is not null and v_sub >= v_free then v_fee := 0; v_tbd := false; end if;

  insert into public.orders (customer_name, phone, country, city, address, notes, items, subtotal, delivery, total,
                             idempotency_key, stock_state, shipping_tbd)
  values (v_name, v_phone, v_country, left(coalesce(p_customer->>'city', ''), 80), left(coalesce(p_customer->>'address', ''), 300),
          left(coalesce(p_customer->>'notes', ''), 1000), v_items, v_sub, v_fee, v_sub + v_fee,
          p_idempotency_key, case when v_any_stock then 'reserved' else 'none' end, v_tbd)
  returning id, order_no into v_id, v_no;

  insert into public.stock_movements (product_id, order_id, order_no, delta, reason)
  select x::uuid, v_id, v_no, -(v_qty->>x)::integer, 'order' from unnest(v_order) x where (v_rows->x->>'stocked')::boolean;

  return jsonb_build_object('order_no', v_no, 'subtotal', v_sub, 'delivery', v_fee, 'total', v_sub + v_fee,
                            'items', v_items, 'country', v_country, 'international', not v_local, 'shipping_tbd', v_tbd,
                            'duplicate', false);
end $function$;
revoke all on function public.place_order(jsonb, jsonb, uuid) from public;
grant execute on function public.place_order(jsonb, jsonb, uuid) to anon, authenticated;

-- ---------------------------------------------------------------- give back / take again
create function private.order_stock_sync()
 returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare m record;
begin
  if tg_op = 'DELETE' then
    if old.stock_state = 'reserved' then
      for m in select product_id, -sum(delta)::integer as qty from public.stock_movements
               where order_id = old.id group by product_id having sum(delta) < 0 order by product_id loop
        update public.products set stock = stock + m.qty where id = m.product_id and stock is not null;
        insert into public.stock_movements (product_id, order_id, order_no, delta, reason)
          values (m.product_id, null, old.order_no, m.qty, 'delete');
      end loop;
    end if;
    return old;
  end if;

  -- cancelled: return what this order is holding
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_at := now();
    if old.stock_state = 'reserved' then
      for m in select product_id, -sum(delta)::integer as qty from public.stock_movements
               where order_id = old.id group by product_id having sum(delta) < 0 order by product_id loop
        update public.products set stock = stock + m.qty where id = m.product_id and stock is not null;
        insert into public.stock_movements (product_id, order_id, order_no, delta, reason)
          values (m.product_id, old.id, old.order_no, m.qty, 'cancel');
      end loop;
      new.stock_state := 'released';
    end if;
  -- brought back from cancelled: take the same pieces again, or refuse
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    new.cancelled_at := null;
    if old.stock_state = 'released' then
      for m in select product_id, -sum(delta)::integer as qty from public.stock_movements
               where order_id = old.id and reason = 'order' group by product_id order by product_id loop
        update public.products set stock = stock - m.qty where id = m.product_id and (stock is null or stock >= m.qty);
        if not found then raise exception 'out_of_stock_on_restore'; end if;
        insert into public.stock_movements (product_id, order_id, order_no, delta, reason)
          values (m.product_id, old.id, old.order_no, -m.qty, 'uncancel');
      end loop;
      new.stock_state := 'reserved';
    end if;
  end if;
  return new;
end $function$;
revoke all on function private.order_stock_sync() from public, anon, authenticated, service_role;

create trigger orders_stock_sync before update of status on public.orders
  for each row when (old.status is distinct from new.status) execute function private.order_stock_sync();
create trigger orders_stock_release before delete on public.orders
  for each row execute function private.order_stock_sync();

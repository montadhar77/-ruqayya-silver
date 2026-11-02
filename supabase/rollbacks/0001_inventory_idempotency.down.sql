-- Rollback of 0001_inventory_idempotency: back to the baseline checkout (no stock reservation).
-- Stock already taken by orders stays as it is (it is not added back) — check stock_movements first
-- if you need to correct quantities by hand. Order rows are kept; only the new columns go.
drop trigger if exists orders_stock_sync on public.orders;
drop trigger if exists orders_stock_release on public.orders;
drop function if exists private.order_stock_sync();
drop function if exists public.place_order(jsonb, jsonb, uuid);
drop table if exists public.stock_movements;
alter table public.orders drop constraint if exists orders_stock_state_check;
drop index if exists public.orders_idempotency_key_idx;
alter table public.orders
  drop column if exists idempotency_key,
  drop column if exists stock_state,
  drop column if exists shipping_tbd,
  drop column if exists cancelled_at;

create or replace function public.place_order(p_customer jsonb, p_items jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_name    text := btrim(coalesce(p_customer->>'name', ''));
  v_phone   text := btrim(coalesce(p_customer->>'phone', ''));
  v_country text := left(nullif(btrim(coalesce(p_customer->>'country', '')), ''), 80);
  v_local   boolean;
  v_items jsonb := '[]'::jsonb;
  v_sub integer := 0; v_fee integer := 0; v_free integer; v_tbd boolean := false;
  v_no bigint; it jsonb; q integer; r record; s jsonb; raw text;
begin
  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'invalid_name'; end if;
  if length(regexp_replace(v_phone, '\D', '', 'g')) < 7 or length(v_phone) > 30 then raise exception 'invalid_phone'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 40 then
    raise exception 'invalid_items';
  end if;
  v_country := coalesce(v_country, 'العراق');
  v_local := v_country in ('العراق', 'Iraq', 'iraq');

  for it in select value from jsonb_array_elements(p_items) loop
    q := least(greatest(coalesce(nullif(it->>'qty', '')::integer, 1), 1), 50);
    select p.id, p.name, p.price, p.images, p.stock into r
      from public.products p where p.id = (it->>'id')::uuid and p.active;
    if not found then raise exception 'product_unavailable'; end if;
    if r.stock is not null and r.stock < q then raise exception 'out_of_stock'; end if;
    v_sub := v_sub + r.price * q;
    v_items := v_items || jsonb_build_object('id', r.id, 'name', r.name, 'price', r.price, 'qty', q,
                                             'image', coalesce(r.images[1], ''));
  end loop;

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

  insert into public.orders (customer_name, phone, country, city, address, notes, items, subtotal, delivery, total)
  values (v_name, v_phone, v_country, left(coalesce(p_customer->>'city', ''), 80), left(coalesce(p_customer->>'address', ''), 300),
          left(coalesce(p_customer->>'notes', ''), 1000), v_items, v_sub, v_fee, v_sub + v_fee)
  returning order_no into v_no;

  return jsonb_build_object('order_no', v_no, 'subtotal', v_sub, 'delivery', v_fee, 'total', v_sub + v_fee,
                            'items', v_items, 'country', v_country, 'international', not v_local, 'shipping_tbd', v_tbd);
end $function$;
revoke all on function public.place_order(jsonb, jsonb) from public;
grant execute on function public.place_order(jsonb, jsonb) to anon, authenticated;

-- =====================================================================
-- معرض رقية (عليها السلام) — store schema
-- Applied to Supabase project "ruqayya-silver" (hnkjmthvgfknwdnehegr).
-- Built alongside the earlier, empty generic exhibition tables.
-- =====================================================================

-- The earlier generic tables (exhibitions, artworks, site_settings, messages, ...) were empty
-- and are left untouched; the store uses the tables below.

-- admin helper (public.admins + private.is_admin() already exist; recreated defensively)
create schema if not exists private;
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

create or replace function public.am_i_admin() returns boolean
language sql stable set search_path = public, pg_temp as $$ select private.is_admin(); $$;
grant execute on function public.am_i_admin() to authenticated;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end $$;

-- 2) tables
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  subtitle text not null default '',
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  icon text not null default 'gift',
  image_url text not null default '',
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null check (length(name) between 1 and 200),
  description text not null default '',
  price integer not null default 0 check (price >= 0),
  old_price integer check (old_price is null or old_price >= 0),
  images text[] not null default '{}',
  badge text not null default '',
  metal text not null default '',
  stone text not null default '',
  weight text not null default '',
  size text not null default '',
  stock integer check (stock is null or stock >= 0),
  featured boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_list_idx on public.products (active, sort, created_at desc);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint generated always as identity (start with 1001) unique,
  customer_name text not null,
  phone text not null,
  city text not null default '',
  address text not null default '',
  notes text not null default '',
  items jsonb not null default '[]'::jsonb,
  subtotal integer not null default 0,
  delivery integer not null default 0,
  total integer not null default 0,
  status text not null default 'new' check (status in ('new','confirmed','shipped','delivered','cancelled')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_created_idx on public.orders (created_at desc);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  phone text not null default '' check (length(phone) <= 40),
  body text not null check (length(btrim(body)) between 2 and 3000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

-- 3) row level security
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.inquiries enable row level security;
alter table public.admins enable row level security;

create policy settings_read on public.settings for select to anon, authenticated using (true);
create policy settings_admin_ins on public.settings for insert to authenticated with check ((select private.is_admin()));
create policy settings_admin_upd on public.settings for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy categories_read on public.categories for select to anon, authenticated using (active or (select private.is_admin()));
create policy categories_admin_ins on public.categories for insert to authenticated with check ((select private.is_admin()));
create policy categories_admin_upd on public.categories for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy categories_admin_del on public.categories for delete to authenticated using ((select private.is_admin()));

create policy products_read on public.products for select to anon, authenticated using (active or (select private.is_admin()));
create policy products_admin_ins on public.products for insert to authenticated with check ((select private.is_admin()));
create policy products_admin_upd on public.products for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy products_admin_del on public.products for delete to authenticated using ((select private.is_admin()));

create policy orders_admin_read on public.orders for select to authenticated using ((select private.is_admin()));
create policy orders_admin_upd on public.orders for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy orders_admin_del on public.orders for delete to authenticated using ((select private.is_admin()));

create policy inquiries_public_ins on public.inquiries for insert to anon, authenticated with check (is_read = false);
create policy inquiries_admin_read on public.inquiries for select to authenticated using ((select private.is_admin()));
create policy inquiries_admin_upd on public.inquiries for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy inquiries_admin_del on public.inquiries for delete to authenticated using ((select private.is_admin()));


grant select on public.settings, public.categories, public.products to anon, authenticated;
grant insert, update on public.settings to authenticated;
grant insert, update, delete on public.categories, public.products to authenticated;
grant select, update, delete on public.orders to authenticated;
grant insert on public.inquiries to anon, authenticated;
grant select, update, delete on public.inquiries to authenticated;

-- 4) checkout: prices are recomputed on the server, so a visitor cannot change them
create or replace function public.place_order(p_customer jsonb, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_name  text := btrim(coalesce(p_customer->>'name', ''));
  v_phone text := btrim(coalesce(p_customer->>'phone', ''));
  v_items jsonb := '[]'::jsonb;
  v_sub integer := 0; v_fee integer := 0; v_free integer;
  v_no bigint; it jsonb; q integer; r record; s jsonb; raw text;
begin
  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'invalid_name'; end if;
  if length(regexp_replace(v_phone, '\D', '', 'g')) < 7 or length(v_phone) > 30 then raise exception 'invalid_phone'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 40 then
    raise exception 'invalid_items';
  end if;

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
  raw := s #>> '{shop,delivery_fee}';
  v_fee := case when raw ~ '^\d+$' then raw::integer else 0 end;
  raw := s #>> '{shop,free_delivery_over}';
  v_free := case when raw ~ '^\d+$' and raw::integer > 0 then raw::integer end;
  if v_free is not null and v_sub >= v_free then v_fee := 0; end if;

  insert into public.orders (customer_name, phone, city, address, notes, items, subtotal, delivery, total)
  values (v_name, v_phone, left(coalesce(p_customer->>'city', ''), 80), left(coalesce(p_customer->>'address', ''), 300),
          left(coalesce(p_customer->>'notes', ''), 1000), v_items, v_sub, v_fee, v_sub + v_fee)
  returning order_no into v_no;

  return jsonb_build_object('order_no', v_no, 'subtotal', v_sub, 'delivery', v_fee, 'total', v_sub + v_fee, 'items', v_items);
end $$;
revoke all on function public.place_order(jsonb, jsonb) from public;
grant execute on function public.place_order(jsonb, jsonb) to anon, authenticated;

-- 5) media storage (logo, intro video, slides, product photos)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800, array['image/*', 'video/*'])
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = array['image/*', 'video/*'];

create policy media_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'media' and (select private.is_admin()));
create policy media_admin_update on storage.objects for update to authenticated using (bucket_id = 'media' and (select private.is_admin()));
create policy media_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and (select private.is_admin()));
create policy media_admin_select on storage.objects for select to authenticated using (bucket_id = 'media' and (select private.is_admin()));

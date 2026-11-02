-- =====================================================================
-- 0000_baseline.sql — the live production schema as of 2026-11-02
-- Rebuilt from the live database (project ruqayya-silver) with read-only
-- catalog queries. This file is NEVER applied to production (it already
-- matches it); it exists so a fresh database (local tests, staging) starts
-- from exactly the same structure. Every later migration builds on it.
-- =====================================================================

create schema if not exists private;
create schema if not exists extensions;

-- ---------- helper functions ----------
create or replace function public.touch_updated_at()
 returns trigger language plpgsql set search_path to 'public', 'pg_temp'
as $function$ begin new.updated_at = now(); return new; end $function$;

-- ---------- tables ----------
create table public.admins (
  user_id uuid not null,
  created_at timestamp with time zone default now() not null
);

create table public.settings (
  id smallint default 1 not null,
  data jsonb default '{}'::jsonb not null,
  updated_at timestamp with time zone default now() not null
);

create table public.categories (
  id uuid default gen_random_uuid() not null,
  name text not null,
  subtitle text default ''::text not null,
  slug text not null,
  icon text default 'gift'::text not null,
  image_url text default ''::text not null,
  sort integer default 0 not null,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table public.products (
  id uuid default gen_random_uuid() not null,
  category_id uuid,
  name text not null,
  description text default ''::text not null,
  price integer default 0 not null,
  old_price integer,
  images text[] default '{}'::text[] not null,
  badge text default ''::text not null,
  metal text default ''::text not null,
  stone text default ''::text not null,
  weight text default ''::text not null,
  size text default ''::text not null,
  stock integer,
  featured boolean default false not null,
  active boolean default true not null,
  sort integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.orders (
  id uuid default gen_random_uuid() not null,
  order_no bigint generated always as identity (start with 1001) not null,
  customer_name text not null,
  phone text not null,
  city text default ''::text not null,
  address text default ''::text not null,
  notes text default ''::text not null,
  items jsonb default '[]'::jsonb not null,
  subtotal integer default 0 not null,
  delivery integer default 0 not null,
  total integer default 0 not null,
  status text default 'new'::text not null,
  admin_note text default ''::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  country text default 'العراق'::text not null
);

create table public.inquiries (
  id uuid default gen_random_uuid() not null,
  name text not null,
  phone text default ''::text not null,
  body text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default now() not null
);

-- legacy tables from the earlier exhibition project (empty; dropped by 0008 once approved)
create table public.exhibitions (
  id uuid default gen_random_uuid() not null,
  title text default '[EXHIBITION TITLE]'::text not null,
  slug text not null,
  summary text default ''::text not null,
  description text default ''::text not null,
  opening_date text default '[OPENING DATE]'::text not null,
  closing_date text default '[CLOSING DATE]'::text not null,
  opening_hours text default '[OPENING HOURS]'::text not null,
  address text default '[ADDRESS]'::text not null,
  admission text default '[ADMISSION]'::text not null,
  is_published boolean default false not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
create table public.artworks (
  id uuid default gen_random_uuid() not null,
  exhibition_id uuid not null,
  title text default '[ARTWORK TITLE]'::text not null,
  slug text not null,
  medium text default ''::text not null,
  year text default ''::text not null,
  description text default ''::text not null,
  image_path text,
  image_alt text default ''::text not null,
  image_width integer,
  image_height integer,
  sort_order integer default 0 not null,
  is_published boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  title_ar text default ''::text not null,
  description_ar text default ''::text not null,
  category text default ''::text not null,
  material text default ''::text not null,
  gemstone text default ''::text not null,
  availability text default ''::text not null,
  price text default ''::text not null,
  is_featured boolean default false not null
);
create table public.artwork_images (
  id uuid default gen_random_uuid() not null,
  artwork_id uuid not null,
  image_path text not null,
  alt text default ''::text not null,
  width integer,
  height integer,
  sort_order integer default 0 not null,
  is_primary boolean default false not null,
  created_at timestamp with time zone default now() not null
);
create table public.messages (
  id uuid default gen_random_uuid() not null,
  name text not null,
  email text not null,
  body text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default now() not null
);
create table public.newsletter_subscribers (
  id uuid default gen_random_uuid() not null,
  email text not null,
  is_confirmed boolean default false not null,
  created_at timestamp with time zone default now() not null
);
create table public.site_settings (
  id smallint default 1 not null,
  site_title text default '[SITE TITLE]'::text not null,
  site_tagline text default '[SITE TAGLINE]'::text not null,
  site_description text default '[SITE DESCRIPTION]'::text not null,
  contact_email text default '[EMAIL]'::text not null,
  contact_phone text default '[PHONE]'::text not null,
  address text default '[ADDRESS]'::text not null,
  instagram_url text default ''::text not null,
  updated_at timestamp with time zone default now() not null
);
create table public.social_links (
  platform text not null,
  url text default ''::text not null,
  is_enabled boolean default false not null,
  sort_order integer default 0 not null,
  updated_at timestamp with time zone default now() not null
);

-- ---------- constraints ----------
alter table public.admins add constraint admins_pkey PRIMARY KEY (user_id);
alter table public.artwork_images add constraint artwork_images_pkey PRIMARY KEY (id);
alter table public.artworks add constraint artworks_pkey PRIMARY KEY (id);
alter table public.categories add constraint categories_pkey PRIMARY KEY (id);
alter table public.exhibitions add constraint exhibitions_pkey PRIMARY KEY (id);
alter table public.inquiries add constraint inquiries_pkey PRIMARY KEY (id);
alter table public.messages add constraint messages_pkey PRIMARY KEY (id);
alter table public.newsletter_subscribers add constraint newsletter_subscribers_pkey PRIMARY KEY (id);
alter table public.orders add constraint orders_pkey PRIMARY KEY (id);
alter table public.products add constraint products_pkey PRIMARY KEY (id);
alter table public.settings add constraint settings_pkey PRIMARY KEY (id);
alter table public.site_settings add constraint site_settings_pkey PRIMARY KEY (id);
alter table public.social_links add constraint social_links_pkey PRIMARY KEY (platform);
alter table public.artworks add constraint artworks_slug_key UNIQUE (slug);
alter table public.categories add constraint categories_slug_key UNIQUE (slug);
alter table public.exhibitions add constraint exhibitions_slug_key UNIQUE (slug);
alter table public.newsletter_subscribers add constraint newsletter_subscribers_email_key UNIQUE (email);
alter table public.orders add constraint orders_order_no_key UNIQUE (order_no);
alter table public.categories add constraint categories_name_check CHECK (((length(name) >= 1) AND (length(name) <= 120)));
alter table public.categories add constraint categories_slug_check CHECK ((slug ~ '^[a-z0-9-]+$'::text));
alter table public.inquiries add constraint inquiries_body_check CHECK (((length(btrim(body)) >= 2) AND (length(btrim(body)) <= 3000)));
alter table public.inquiries add constraint inquiries_name_check CHECK (((length(btrim(name)) >= 2) AND (length(btrim(name)) <= 120)));
alter table public.inquiries add constraint inquiries_phone_check CHECK ((length(phone) <= 40));
alter table public.orders add constraint orders_status_check CHECK ((status = ANY (ARRAY['new'::text, 'confirmed'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text])));
alter table public.products add constraint products_name_check CHECK (((length(name) >= 1) AND (length(name) <= 200)));
alter table public.products add constraint products_old_price_check CHECK (((old_price IS NULL) OR (old_price >= 0)));
alter table public.products add constraint products_price_check CHECK ((price >= 0));
alter table public.products add constraint products_stock_check CHECK (((stock IS NULL) OR (stock >= 0)));
alter table public.settings add constraint settings_id_check CHECK ((id = 1));
alter table public.site_settings add constraint site_settings_id_check CHECK ((id = 1));
alter table public.admins add constraint admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.artwork_images add constraint artwork_images_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE CASCADE;
alter table public.artworks add constraint artworks_exhibition_id_fkey FOREIGN KEY (exhibition_id) REFERENCES public.exhibitions(id) ON DELETE CASCADE;
alter table public.products add constraint products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- ---------- indexes ----------
CREATE INDEX artwork_images_artwork_idx ON public.artwork_images USING btree (artwork_id, sort_order, created_at);
CREATE UNIQUE INDEX artwork_images_single_primary_idx ON public.artwork_images USING btree (artwork_id) WHERE is_primary;
CREATE INDEX artworks_category_idx ON public.artworks USING btree (category, is_published) WHERE (category <> ''::text);
CREATE INDEX artworks_exhibition_idx ON public.artworks USING btree (exhibition_id, sort_order, created_at);
CREATE INDEX artworks_featured_idx ON public.artworks USING btree (is_featured, is_published, sort_order) WHERE is_featured;
CREATE INDEX artworks_public_page_idx ON public.artworks USING btree (is_published, sort_order, created_at, id);
CREATE INDEX artworks_recent_idx ON public.artworks USING btree (created_at DESC);
CREATE INDEX exhibitions_published_idx ON public.exhibitions USING btree (is_published, sort_order DESC, created_at DESC);
CREATE INDEX messages_unread_idx ON public.messages USING btree (is_read, created_at DESC);
CREATE INDEX newsletter_recent_idx ON public.newsletter_subscribers USING btree (created_at DESC);
CREATE INDEX orders_created_idx ON public.orders USING btree (created_at DESC);
CREATE INDEX products_category_idx ON public.products USING btree (category_id);
CREATE INDEX products_list_idx ON public.products USING btree (active, sort, created_at DESC);

-- ---------- triggers ----------
CREATE TRIGGER artworks_touch BEFORE UPDATE ON public.artworks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER exhibitions_touch BEFORE UPDATE ON public.exhibitions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER site_settings_touch BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER social_links_touch BEFORE UPDATE ON public.social_links FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- admin check ----------
create or replace function private.is_admin()
 returns boolean language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$function$;
grant usage on schema private to anon, authenticated;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

create or replace function public.am_i_admin()
 returns boolean language sql stable set search_path to 'public', 'pg_temp'
as $function$ select private.is_admin(); $function$;
grant execute on function public.am_i_admin() to authenticated;

-- ---------- checkout (live version, with worldwide shipping) ----------
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

-- ---------- row level security ----------
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.inquiries enable row level security;
alter table public.exhibitions enable row level security;
alter table public.artworks enable row level security;
alter table public.artwork_images enable row level security;
alter table public.messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.site_settings enable row level security;
alter table public.social_links enable row level security;

create policy admins_self_read on public.admins as permissive for select to anon, authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin)));
create policy artwork_images_admin_delete on public.artwork_images as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy artwork_images_admin_insert on public.artwork_images as permissive for insert to authenticated with check (( SELECT private.is_admin() AS is_admin));
create policy artwork_images_admin_update on public.artwork_images as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy artwork_images_read on public.artwork_images as permissive for select to anon, authenticated using ((EXISTS ( SELECT 1 FROM public.artworks a WHERE (a.id = artwork_images.artwork_id))));
create policy artworks_admin_delete on public.artworks as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy artworks_admin_insert on public.artworks as permissive for insert to authenticated with check (( SELECT private.is_admin() AS is_admin));
create policy artworks_admin_update on public.artworks as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy artworks_read on public.artworks as permissive for select to anon, authenticated using ((( SELECT private.is_admin() AS is_admin) OR (is_published AND (EXISTS ( SELECT 1 FROM public.exhibitions e WHERE ((e.id = artworks.exhibition_id) AND e.is_published))))));
create policy categories_admin_del on public.categories as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy categories_admin_ins on public.categories as permissive for insert to authenticated with check (( SELECT private.is_admin() AS is_admin));
create policy categories_admin_upd on public.categories as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy categories_read on public.categories as permissive for select to anon, authenticated using ((active OR ( SELECT private.is_admin() AS is_admin)));
create policy exhibitions_admin_delete on public.exhibitions as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy exhibitions_admin_insert on public.exhibitions as permissive for insert to authenticated with check (( SELECT private.is_admin() AS is_admin));
create policy exhibitions_admin_update on public.exhibitions as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy exhibitions_read on public.exhibitions as permissive for select to anon, authenticated using ((is_published OR ( SELECT private.is_admin() AS is_admin)));
create policy inquiries_admin_del on public.inquiries as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy inquiries_admin_read on public.inquiries as permissive for select to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy inquiries_admin_upd on public.inquiries as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy inquiries_public_ins on public.inquiries as permissive for insert to anon, authenticated with check ((is_read = false));
create policy messages_admin_delete on public.messages as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy messages_admin_read on public.messages as permissive for select to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy messages_admin_write on public.messages as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy messages_public_insert on public.messages as permissive for insert to anon, authenticated with check ((((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 120)) AND ((length(TRIM(BOTH FROM email)) >= 3) AND (length(TRIM(BOTH FROM email)) <= 200)) AND ((length(TRIM(BOTH FROM body)) >= 1) AND (length(TRIM(BOTH FROM body)) <= 4000)) AND (is_read = false)));
create policy newsletter_admin_delete on public.newsletter_subscribers as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy newsletter_admin_read on public.newsletter_subscribers as permissive for select to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy newsletter_public_insert on public.newsletter_subscribers as permissive for insert to anon, authenticated with check ((((length(TRIM(BOTH FROM email)) >= 3) AND (length(TRIM(BOTH FROM email)) <= 200)) AND (POSITION(('@'::text) IN (email)) > 1) AND (is_confirmed = false)));
create policy orders_admin_del on public.orders as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy orders_admin_read on public.orders as permissive for select to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy orders_admin_upd on public.orders as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy products_admin_del on public.products as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy products_admin_ins on public.products as permissive for insert to authenticated with check (( SELECT private.is_admin() AS is_admin));
create policy products_admin_upd on public.products as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy products_read on public.products as permissive for select to anon, authenticated using ((active OR ( SELECT private.is_admin() AS is_admin)));
create policy settings_admin_ins on public.settings as permissive for insert to authenticated with check (( SELECT private.is_admin() AS is_admin));
create policy settings_admin_upd on public.settings as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy settings_read on public.settings as permissive for select to anon, authenticated using (true);
create policy settings_admin_write on public.site_settings as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy settings_public_read on public.site_settings as permissive for select to anon, authenticated using (true);
create policy social_links_admin_update on public.social_links as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy social_links_read on public.social_links as permissive for select to anon, authenticated using (true);

-- ---------- table privileges (as observed live) ----------
revoke all on all tables in schema public from anon, authenticated, service_role;
grant select, references, trigger, truncate on public.admins, public.settings, public.categories, public.products,
  public.exhibitions, public.artworks, public.artwork_images, public.site_settings, public.social_links to anon;
grant insert, references, trigger, truncate on public.inquiries, public.messages, public.newsletter_subscribers to anon;
grant references, trigger, truncate on public.orders to anon;
grant select, references, trigger, truncate on public.admins to authenticated;
grant select, insert, update, delete, references, trigger, truncate on public.categories, public.products,
  public.exhibitions, public.artworks, public.artwork_images, public.inquiries, public.messages to authenticated;
grant select, insert, delete, references, trigger, truncate on public.newsletter_subscribers to authenticated;
grant select, update, delete, references, trigger, truncate on public.orders to authenticated;
grant select, insert, update, references, trigger, truncate on public.settings to authenticated;
grant select, update, references, trigger, truncate on public.site_settings, public.social_links to authenticated;
grant references, trigger, truncate on all tables in schema public to service_role;

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800, array['image/*', 'video/*']),
       ('artwork-images', 'artwork-images', true, 12582912, array['image/webp'])
on conflict (id) do nothing;

create policy media_admin_insert on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'media'::text) AND ( SELECT private.is_admin() AS is_admin)));
create policy media_admin_update on storage.objects as permissive for update to authenticated using (((bucket_id = 'media'::text) AND ( SELECT private.is_admin() AS is_admin)));
create policy media_admin_delete on storage.objects as permissive for delete to authenticated using (((bucket_id = 'media'::text) AND ( SELECT private.is_admin() AS is_admin)));
create policy media_admin_select on storage.objects as permissive for select to authenticated using (((bucket_id = 'media'::text) AND ( SELECT private.is_admin() AS is_admin)));
create policy artwork_images_admin_delete on storage.objects as permissive for delete to authenticated using (((bucket_id = 'artwork-images'::text) AND ( SELECT private.is_admin() AS is_admin)));
create policy artwork_images_admin_insert on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'artwork-images'::text) AND ( SELECT private.is_admin() AS is_admin) AND (name ~~ 'artworks/%'::text)));
create policy artwork_images_admin_update on storage.objects as permissive for update to authenticated using (((bucket_id = 'artwork-images'::text) AND ( SELECT private.is_admin() AS is_admin))) with check (((bucket_id = 'artwork-images'::text) AND ( SELECT private.is_admin() AS is_admin) AND (name ~~ 'artworks/%'::text)));
create policy artwork_images_public_read on storage.objects as permissive for select to anon, authenticated using ((bucket_id = 'artwork-images'::text));

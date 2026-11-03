-- =====================================================================
-- 0006 — a catalogue that stays fast with thousands of products and orders
--
-- * private.ar_norm(): Arabic-aware text normalisation (harakat and tatweel removed,
--   أ/إ/آ/ٱ → ا, ى → ي, ة → ه, ؤ → و, ئ → ي, Arabic/Persian digits → 0-9, lower case).
--   Same rules as the storefront's own search box.
-- * Trigram indexes (pg_trgm) so "contains" searches on products and orders use an
--   index instead of reading every row.
-- * Read functions for the storefront (anon). They are SECURITY DEFINER so the trigram
--   index can be used (row level security only allows leakproof operators in index
--   scans, and LIKE is not one); each of them returns ACTIVE products only — exactly
--   what row level security lets a visitor see — and settings/categories that are public.
--     catalog_home(p_limit)            settings + categories with counts + the first
--                                      products (+ featured), and whether that is all of them
--     list_products(cat, sort, n, k)   one page of a department / the whole shop
--     search_products(q, n, k)         ranked Arabic search, paged
--     product_page(id)                 one product + 4 related
--     products_by_ids(ids)             the products in a visitor's cart
--   All are STABLE, so PostgREST also accepts GET (cacheable at the CDN).
-- * Dashboard functions (aal2 admins only): admin_orders (paged, filtered, searched,
--   with per-status counts), admin_stats (one small call instead of loading every order).
-- * Supporting indexes for the order, inquiry and department lists.
--
-- Backward compatible: nothing existing changes. The site and dashboard use these
-- functions when present and fall back to the previous queries when not.
-- Verify after applying:
--   select jsonb_array_length(public.catalog_home() -> 'prods');                 -- products returned
--   select public.search_products('عقيق') -> 'total';                            -- matches
--   select private.ar_norm('أَحْمَد إبراهيم مكتبة ١٢٣');                         -- 'احمد ابراهيم مكتبه 123'
-- Rollback: supabase/rollbacks/0006_catalog_api.down.sql
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------- normalisation ----------
-- COST tells the planner these are expensive per row (regex + translate), so it prefers the trigram indexes
create function private.ar_norm(t text)
 returns text language sql immutable parallel safe cost 200 set search_path to ''
as $function$
  select btrim(regexp_replace(lower(translate(
           regexp_replace(coalesce(t, ''), '[ً-ٰٟـ]', '', 'g'),
           'أإآٱىةؤئ٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹',
           'اااايهوي01234567890123456789')), '\s+', ' ', 'g'))
$function$;

-- searchable text of a product (name first, so a name hit ranks highest)
create function private.product_doc(p_name text, p_stone text, p_metal text, p_badge text, p_description text)
 returns text language sql immutable parallel safe cost 500 set search_path to ''
as $function$
  select private.ar_norm(concat_ws(' ', p_name, p_stone, p_metal, p_badge, p_description))
$function$;

create function private.order_doc(p_no bigint, p_name text, p_phone text, p_city text, p_country text)
 returns text language sql immutable parallel safe cost 500 set search_path to ''
as $function$
  select private.ar_norm(concat_ws(' ', p_no::text, p_name, regexp_replace(private.ar_norm(p_phone), '\D', '', 'g'), p_city, p_country))
$function$;

-- LIKE pattern for "contains", with the user's % and _ taken literally
create function private.like_any(q text)
 returns text language sql immutable parallel safe set search_path to ''
as $function$
  select '%' || replace(replace(replace(coalesce(q, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%'
$function$;

revoke all on function private.ar_norm(text), private.product_doc(text, text, text, text, text),
  private.order_doc(bigint, text, text, text, text), private.like_any(text) from public;
grant execute on function private.ar_norm(text), private.product_doc(text, text, text, text, text),
  private.order_doc(bigint, text, text, text, text), private.like_any(text) to anon, authenticated, service_role;

-- ---------- indexes ----------
create index products_search_trgm_idx on public.products
  using gin (private.product_doc(name, stone, metal, badge, description) extensions.gin_trgm_ops);
create index products_cat_list_idx on public.products (category_id, sort, created_at desc) where active;
create index products_featured_idx on public.products (sort, created_at desc) where active and featured;
create index orders_search_trgm_idx on public.orders
  using gin (private.order_doc(order_no, customer_name, phone, city, country) extensions.gin_trgm_ops);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index inquiries_list_idx on public.inquiries (is_read, created_at desc);

-- ---------- storefront ----------
create function public.catalog_home(p_limit integer default 60)
 returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  with lim as (select least(greatest(coalesce(p_limit, 60), 1), 200) as n),
  s as (select data from public.settings where id = 1),
  counts as (select category_id, count(*) as n from public.products where active group by category_id),
  first as (
    select p.* from public.products p where p.active
    order by p.sort, p.created_at desc, p.id limit (select n from lim)),
  extra as (
    select p.* from public.products p
    where p.active and p.id not in (select id from first)
      and (p.featured or p.id::text = (select data #>> '{sections,featured,product_id}' from s))
    order by p.sort, p.created_at desc, p.id limit 24),
  prods as (select * from first union all select * from extra),
  total as (select count(*) as n from public.products where active)
  select jsonb_build_object(
    'settings', coalesce((select data from s), '{}'::jsonb),
    'cats', coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object('count', coalesce(k.n, 0)) order by c.sort, c.created_at)
                      from public.categories c left join counts k on k.category_id = c.id where c.active), '[]'::jsonb),
    'prods', coalesce((select jsonb_agg(to_jsonb(p) order by p.sort, p.created_at desc, p.id) from prods p), '[]'::jsonb),
    'total', (select n from total),
    'complete', (select n from total) <= (select n from lim))
$function$;

create function public.list_products(p_category uuid default null, p_sort text default 'default',
                                     p_limit integer default 24, p_offset integer default 0)
 returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  with base as (
    select p.* from public.products p
    where p.active and (p_category is null or p.category_id = p_category)),
  page as (
    select b.*, row_number() over (
             order by case when p_sort = 'low' then b.price end asc nulls last,
                      case when p_sort = 'high' then b.price end desc nulls last,
                      case when p_sort = 'new' then b.created_at end desc nulls last,
                      b.sort, b.created_at desc, b.id) as rn
    from base b
    order by rn
    limit least(greatest(coalesce(p_limit, 24), 1), 60) offset least(greatest(coalesce(p_offset, 0), 0), 100000))
  select jsonb_build_object(
    'total', (select count(*) from base),
    'items', coalesce((select jsonb_agg(to_jsonb(x) - 'rn' order by x.rn) from page x), '[]'::jsonb))
$function$;

create function public.search_products(p_q text, p_limit integer default 24, p_offset integer default 0)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_s text := left(private.ar_norm(p_q), 80);
  v_pat text := private.like_any(left(private.ar_norm(p_q), 80));
  v_res jsonb;
begin
  -- plpgsql passes the pattern as a value the planner can see, so the trigram index is used
  if v_s = '' then return jsonb_build_object('q', '', 'total', 0, 'items', '[]'::jsonb); end if;
  with cats as (select c.id from public.categories c where c.active and private.ar_norm(c.name) like v_pat),
  -- two index-friendly halves: text match (trigram index) and department match (category_id)
  matched as (
    select p.id from public.products p
    where p.active and private.product_doc(p.name, p.stone, p.metal, p.badge, p.description) like v_pat
    union
    select p.id from public.products p where p.active and p.category_id in (select id from cats)),
  -- ranking: name matches first, then how closely the name matches, then the shop's own order
  hits as (
    select p.*, n.nn like v_pat as name_hit, extensions.word_similarity(v_s, n.nn) as score
    from public.products p join matched m on m.id = p.id
    cross join lateral (select private.ar_norm(p.name) as nn) n),
  page as (
    select h.*, row_number() over (order by h.name_hit desc, h.score desc, h.sort, h.created_at desc, h.id) as rn
    from hits h
    order by rn
    limit least(greatest(coalesce(p_limit, 24), 1), 60) offset least(greatest(coalesce(p_offset, 0), 0), 10000))
  select jsonb_build_object(
    'q', v_s,
    'total', (select count(*) from hits),
    'items', coalesce((select jsonb_agg(to_jsonb(x) - 'name_hit' - 'score' - 'rn' order by x.rn) from page x), '[]'::jsonb))
  into v_res;
  return v_res;
end
$function$;

create function public.product_page(p_id uuid)
 returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  with p as (select * from public.products where id = p_id and active)
  select jsonb_build_object(
    'product', (select to_jsonb(p) from p),
    'related', coalesce((select jsonb_agg(to_jsonb(r) order by r.sort, r.created_at desc) from (
       select x.* from public.products x, p
       where x.active and x.id <> p.id and x.category_id = p.category_id
       order by x.sort, x.created_at desc, x.id limit 4) r), '[]'::jsonb))
$function$;

create function public.products_by_ids(p_ids uuid[])
 returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(jsonb_agg(to_jsonb(p) order by p.sort, p.created_at desc), '[]'::jsonb)
  from public.products p
  where p.active and p.id = any ((coalesce(p_ids, '{}'::uuid[]))[1:60])
$function$;

revoke all on function public.catalog_home(integer), public.list_products(uuid, text, integer, integer),
  public.search_products(text, integer, integer), public.product_page(uuid), public.products_by_ids(uuid[]) from public;
grant execute on function public.catalog_home(integer), public.list_products(uuid, text, integer, integer),
  public.search_products(text, integer, integer), public.product_page(uuid), public.products_by_ids(uuid[])
  to anon, authenticated, service_role;

-- ---------- dashboard ----------
create function public.admin_orders(p_status text default null, p_q text default null,
                                    p_limit integer default 50, p_offset integer default 0)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_q text := left(private.ar_norm(p_q), 80);
  v_digits text;
  v_pat text;
  v_res jsonb;
begin
  if not private.is_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  -- a phone number or an order number may be typed with spaces, dashes or "+"
  if v_q ~ '^[0-9 +()-]+$' then v_digits := regexp_replace(v_q, '\D', '', 'g'); v_q := v_digits; end if;
  v_pat := private.like_any(v_q);
  with base as (
    select o.* from public.orders o
    where (coalesce(v_q, '') = '' or private.order_doc(o.order_no, o.customer_name, o.phone, o.city, o.country) like v_pat)),
  filtered as (select * from base where p_status is null or p_status = '' or status = p_status),
  page as (
    select * from filtered order by created_at desc, order_no desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200) offset least(greatest(coalesce(p_offset, 0), 0), 1000000))
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'counts', (select jsonb_build_object('all', count(*),
                 'new', count(*) filter (where status = 'new'), 'confirmed', count(*) filter (where status = 'confirmed'),
                 'shipped', count(*) filter (where status = 'shipped'), 'delivered', count(*) filter (where status = 'delivered'),
                 'cancelled', count(*) filter (where status = 'cancelled')) from base),
    'items', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc, x.order_no desc) from page x), '[]'::jsonb))
  into v_res;
  return v_res;
end
$function$;

create function public.admin_stats()
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_month timestamptz := date_trunc('month', now() at time zone 'Asia/Baghdad') at time zone 'Asia/Baghdad';
  v_res jsonb;
begin
  if not private.is_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  select jsonb_build_object(
    'orders_new', (select count(*) from public.orders where status = 'new'),
    'orders_total', (select count(*) from public.orders),
    'sales_month', (select coalesce(sum(total), 0) from public.orders where status <> 'cancelled' and created_at >= v_month),
    'orders_month', (select count(*) from public.orders where status <> 'cancelled' and created_at >= v_month),
    'last_order_at', (select max(created_at) from public.orders),
    'inquiries_unread', (select count(*) from public.inquiries where not is_read),
    'last_inquiry_at', (select max(created_at) from public.inquiries),
    'products_total', (select count(*) from public.products),
    'products_active', (select count(*) from public.products where active),
    'products_no_photo', (select count(*) from public.products where cardinality(images) = 0),
    'products_out', (select count(*) from public.products where active and stock = 0),
    'products_low', (select count(*) from public.products where active and stock between 1 and 2))
  into v_res;
  return v_res;
end
$function$;

revoke all on function public.admin_orders(text, text, integer, integer), public.admin_stats() from public, anon;
grant execute on function public.admin_orders(text, text, integer, integer), public.admin_stats() to authenticated;

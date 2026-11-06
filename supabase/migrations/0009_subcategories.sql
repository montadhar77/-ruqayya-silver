-- =====================================================================
-- 0009 — sub-departments (e.g. men's rings → agate rings, turquoise rings …)
--
-- * categories.parent_id: a department can hold sub-departments (one level only).
-- * products.subcategory_id: optional; a product stays in its department
--   (category_id, so every existing list, count and filter keeps working) and may also
--   sit in one of that department's sub-departments.
-- * A sub-department that does not belong to the product's department is cleared
--   automatically; moving a sub-department moves its products with it.
-- * catalog_home counts products per sub-department; list_products takes p_sub;
--   search also matches sub-department names.
-- * Seeds the stone sub-departments of "خواتم رجالية" and "خواتم نسائية" (editable,
--   hideable and deletable from the dashboard).
-- Verify after applying:
--   select name from public.categories where parent_id is not null order by parent_id, sort;
-- Rollback: supabase/rollbacks/0009_subcategories.down.sql
-- =====================================================================

alter table public.categories add column parent_id uuid references public.categories(id) on delete cascade;
alter table public.products add column subcategory_id uuid references public.categories(id) on delete set null;
create index categories_parent_idx on public.categories (parent_id, sort) where parent_id is not null;
create index products_subcategory_idx on public.products (subcategory_id, sort, created_at desc) where active and subcategory_id is not null;

-- one level only
create function private.check_category_parent()
 returns trigger language plpgsql set search_path to ''
as $function$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then raise exception 'category_parent_self' using errcode = '23514'; end if;
    if exists (select 1 from public.categories c where c.id = new.parent_id and c.parent_id is not null) then
      raise exception 'category_too_deep' using errcode = '23514';
    end if;
    if exists (select 1 from public.categories c where c.parent_id = new.id) then
      raise exception 'category_has_children' using errcode = '23514';
    end if;
  end if;
  return new;
end
$function$;
create trigger categories_parent_check before insert or update of parent_id on public.categories
  for each row execute function private.check_category_parent();

-- moving a sub-department carries its products along (or, if it becomes a department, makes it theirs)
create function private.follow_category_parent()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if new.parent_id is null then
    update public.products set category_id = new.id, subcategory_id = null where subcategory_id = new.id;
  else
    update public.products set category_id = new.parent_id where subcategory_id = new.id;
  end if;
  return null;
end
$function$;
create trigger categories_parent_follow after update of parent_id on public.categories
  for each row when (old.parent_id is distinct from new.parent_id) execute function private.follow_category_parent();

-- a product's sub-department must belong to its department, otherwise it is cleared
create function private.check_product_subcategory()
 returns trigger language plpgsql set search_path to ''
as $function$
begin
  if new.subcategory_id is not null and not exists (
       select 1 from public.categories c
       where c.id = new.subcategory_id and c.parent_id is not null and c.parent_id = new.category_id) then
    new.subcategory_id := null;
  end if;
  return new;
end
$function$;
create trigger products_subcategory_check before insert or update of category_id, subcategory_id on public.products
  for each row execute function private.check_product_subcategory();

-- trigger functions: nobody calls them directly
revoke all on function private.check_category_parent(), private.follow_category_parent(), private.check_product_subcategory() from public;

-- ---------- storefront functions (same results as 0006, plus sub-departments) ----------
create or replace function public.catalog_home(p_limit integer default 60)
 returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  with lim as (select least(greatest(coalesce(p_limit, 60), 1), 200) as n),
  s as (select data from public.settings where id = 1),
  counts as (select category_id, count(*) as n from public.products where active group by category_id),
  subcounts as (select subcategory_id, count(*) as n from public.products where active and subcategory_id is not null group by subcategory_id),
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
    'cats', coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object('count', coalesce(case when c.parent_id is null then k.n else sk.n end, 0))
                                       order by c.parent_id nulls first, c.sort, c.created_at)
                      from public.categories c
                      left join counts k on k.category_id = c.id
                      left join subcounts sk on sk.subcategory_id = c.id
                      where c.active and (c.parent_id is null or exists (select 1 from public.categories pc where pc.id = c.parent_id and pc.active))), '[]'::jsonb),
    'prods', coalesce((select jsonb_agg(to_jsonb(p) order by p.sort, p.created_at desc, p.id) from prods p), '[]'::jsonb),
    'total', (select n from total),
    'complete', (select n from total) <= (select n from lim))
$function$;

drop function public.list_products(uuid, text, integer, integer);
create function public.list_products(p_category uuid default null, p_sort text default 'default',
                                     p_limit integer default 24, p_offset integer default 0, p_sub uuid default null)
 returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  with base as (
    select p.* from public.products p
    where p.active and (p_category is null or p.category_id = p_category)
      and (p_sub is null or p.subcategory_id = p_sub)),
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
revoke all on function public.list_products(uuid, text, integer, integer, uuid) from public;
grant execute on function public.list_products(uuid, text, integer, integer, uuid) to anon, authenticated, service_role;

create or replace function public.search_products(p_q text, p_limit integer default 24, p_offset integer default 0)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_s text := left(private.ar_norm(p_q), 80);
  v_pat text := private.like_any(left(private.ar_norm(p_q), 80));
  v_res jsonb;
begin
  if v_s = '' then return jsonb_build_object('q', '', 'total', 0, 'items', '[]'::jsonb); end if;
  with cats as (select c.id from public.categories c where c.active and private.ar_norm(c.name) like v_pat),
  matched as (
    select p.id from public.products p
    where p.active and private.product_doc(p.name, p.stone, p.metal, p.badge, p.description) like v_pat
    union
    select p.id from public.products p where p.active and p.category_id in (select id from cats)
    union
    select p.id from public.products p where p.active and p.subcategory_id in (select id from cats)),
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

-- ---------- the stone sub-departments of the two ring departments ----------
insert into public.categories (parent_id, name, subtitle, slug, icon, active, sort)
select p.id, s.name, s.subtitle, s.slug, p.icon, true, s.sort
from public.categories p
join (values
  ('mens-rings', 'خواتم العقيق الرجالية', 'عقيق يماني', 'mens-rings-aqeeq', 1),
  ('mens-rings', 'خواتم الفيروز الرجالية', 'فيروز نيشابوري', 'mens-rings-turquoise', 2),
  ('mens-rings', 'خواتم الياقوت الرجالية', 'ياقوت', 'mens-rings-ruby', 3),
  ('mens-rings', 'خواتم دُرّ النجف الرجالية', 'دُرّ النجف', 'mens-rings-durr-najaf', 4),
  ('mens-rings', 'خواتم الشذر الرجالية', 'شذر', 'mens-rings-shathar', 5),
  ('mens-rings', 'خواتم الزمرد الرجالية', 'زمرد', 'mens-rings-emerald', 6),
  ('mens-rings', 'خواتم الزبرجد الرجالية', 'زبرجد', 'mens-rings-peridot', 7),
  ('mens-rings', 'خواتم الجزع الرجالية', 'جزع يماني', 'mens-rings-jaza', 8),
  ('mens-rings', 'خواتم السليماني الرجالية', 'سليماني', 'mens-rings-sulaimani', 9),
  ('mens-rings', 'خواتم الحديد الصيني الرجالية', 'حديد صيني', 'mens-rings-hadid', 10),
  ('womens-rings', 'خواتم العقيق النسائية', 'عقيق', 'womens-rings-aqeeq', 1),
  ('womens-rings', 'خواتم الفيروز النسائية', 'فيروز', 'womens-rings-turquoise', 2),
  ('womens-rings', 'خواتم الياقوت النسائية', 'ياقوت', 'womens-rings-ruby', 3),
  ('womens-rings', 'خواتم الزمرد النسائية', 'زمرد', 'womens-rings-emerald', 4),
  ('womens-rings', 'خواتم دُرّ النجف النسائية', 'دُرّ النجف', 'womens-rings-durr-najaf', 5),
  ('womens-rings', 'خواتم اللؤلؤ النسائية', 'لؤلؤ', 'womens-rings-pearl', 6),
  ('womens-rings', 'خواتم المرجان النسائية', 'مرجان', 'womens-rings-coral', 7),
  ('womens-rings', 'خواتم الزركون النسائية', 'زركون', 'womens-rings-zircon', 8)
) as s(parent_slug, name, subtitle, slug, sort) on p.slug = s.parent_slug and p.parent_id is null
on conflict (slug) do nothing;

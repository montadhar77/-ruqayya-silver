-- Rollback of 0009_subcategories: back to departments without sub-departments.
-- Sub-departments are deleted (their products stay in their departments).
drop trigger if exists products_subcategory_check on public.products;
drop trigger if exists categories_parent_follow on public.categories;
drop trigger if exists categories_parent_check on public.categories;
drop function if exists private.check_product_subcategory();
drop function if exists private.follow_category_parent();
drop function if exists private.check_category_parent();

-- storefront functions exactly as in 0006
create or replace function public.catalog_home(p_limit integer default 60)
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

drop function if exists public.list_products(uuid, text, integer, integer, uuid);
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
revoke all on function public.list_products(uuid, text, integer, integer) from public;
grant execute on function public.list_products(uuid, text, integer, integer) to anon, authenticated, service_role;

create or replace function public.search_products(p_q text, p_limit integer default 24, p_offset integer default 0)
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

drop index if exists public.products_subcategory_idx;
drop index if exists public.categories_parent_idx;
alter table public.products drop column if exists subcategory_id;
delete from public.categories where parent_id is not null;
alter table public.categories drop column if exists parent_id;

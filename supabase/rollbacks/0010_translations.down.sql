-- Rollback of 0010_translations: back to Arabic-only products and departments.
-- The translations written in the dashboard are deleted with their columns
-- (export them first if they may be needed again:
--   select id, i18n from public.products where i18n <> '{}';
--   select id, i18n from public.categories where i18n <> '{}';).

-- search exactly as in 0009
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

drop index if exists public.products_i18n_trgm_idx;
drop function if exists private.i18n_doc(jsonb);
alter table public.categories drop constraint if exists categories_i18n_shape;
alter table public.products drop constraint if exists products_i18n_shape;
alter table public.categories drop column if exists i18n;
alter table public.products drop column if exists i18n;

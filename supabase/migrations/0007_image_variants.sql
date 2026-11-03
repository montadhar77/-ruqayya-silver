-- =====================================================================
-- 0007 — lighter images and a tidy media library
--
-- Images uploaded from the dashboard are now stored in three sizes:
--   products/<name>.v.webp        up to 1800 px  (the address kept in the database, as before)
--   products/<name>.v-1080.webp   1080 px        (product page on phones, cards on large screens)
--   products/<name>.v-480.webp     480 px        (cards on phones, thumbnails, cart, dashboard)
-- The storefront picks the right one with srcset; older images keep working unchanged.
-- Nothing in the database schema needs to change for that.
--
-- This migration adds admin_unused_media(): files in the "media" bucket that nothing uses
-- any more (not a product photo, department image, setting such as the logo/hero/video,
-- nor a photo shown in an existing order), so the dashboard can free storage space.
-- Size variants count as used when their main image is used. Only files older than
-- p_min_age_hours (default 24) are listed, so an upload that is not saved yet is safe.
-- Deleting goes through the Storage API from the dashboard (aal2 admins only).
-- Verify after applying:   select public.admin_unused_media();   -- as an admin: {"count":…,"bytes":…,"names":[…]}
-- Rollback: supabase/rollbacks/0007_image_variants.down.sql
-- =====================================================================

create function public.admin_unused_media(p_min_age_hours integer default 24)
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
declare
  v_res jsonb;
begin
  if not private.is_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  with sources as (
    select array_to_string(images, ' ') as t from public.products
    union all select image_url from public.categories
    union all select data::text from public.settings
    union all select items::text from public.orders),
  refs as (
    select distinct m[1] as name
    from sources, regexp_matches(sources.t, '/storage/v1/object/public/media/([^"''?#\s,)<>]+)', 'g') as m),
  objs as (
    select o.name, coalesce((o.metadata ->> 'size')::bigint, 0) as size, o.created_at,
           regexp_replace(o.name, '\.v-(480|1080)\.(webp|jpg)$', '.v.\2') as base
    from storage.objects o
    where o.bucket_id = 'media'
      and o.created_at < now() - make_interval(hours => greatest(coalesce(p_min_age_hours, 24), 1))),
  unused as (select * from objs where not exists (select 1 from refs where refs.name = objs.base))
  select jsonb_build_object(
    'count', (select count(*) from unused),
    'bytes', (select coalesce(sum(size), 0) from unused),
    'names', coalesce((select jsonb_agg(name order by created_at) from (select * from unused order by created_at limit 1000) u), '[]'::jsonb))
  into v_res;
  return v_res;
end
$function$;

revoke all on function public.admin_unused_media(integer) from public, anon;
grant execute on function public.admin_unused_media(integer) to authenticated;

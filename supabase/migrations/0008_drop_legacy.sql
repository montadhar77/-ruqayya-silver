-- =====================================================================
-- 0008 — remove the empty tables left from the earlier exhibition project
--
-- exhibitions, artworks, artwork_images, messages, newsletter_subscribers,
-- site_settings, social_links: nothing in the site or the dashboard uses them, they
-- were empty when audited (2026-11-02), and each one is an extra API surface
-- (e.g. anyone could insert into messages / newsletter_subscribers).
-- Also drops the storage policies of the unused "artwork-images" bucket. The bucket
-- itself is removed from the Supabase dashboard (Storage) once confirmed empty.
--
-- SAFETY: refuses to run if any of these tables (or the bucket) still holds data.
-- PRODUCTION: only with the owner's explicit approval, after a backup.
-- Verify after applying:
--   select to_regclass('public.exhibitions');   -- null
-- Rollback: supabase/rollbacks/0008_drop_legacy.down.sql (recreates the empty tables)
-- =====================================================================

do $$
declare t text; n bigint;
begin
  foreach t in array array['exhibitions', 'artworks', 'artwork_images', 'messages', 'newsletter_subscribers', 'site_settings', 'social_links'] loop
    if to_regclass('public.' || t) is not null then
      execute format('select count(*) from public.%I', t) into n;
      if n > 0 then raise exception 'legacy table public.% is not empty (% rows) — not dropped', t, n; end if;
    end if;
  end loop;
  select count(*) into n from storage.objects where bucket_id = 'artwork-images';
  if n > 0 then raise exception 'bucket artwork-images still holds % files — not dropped', n; end if;
end $$;

drop table if exists public.artwork_images;
drop table if exists public.artworks;
drop table if exists public.exhibitions;
drop table if exists public.messages;
drop table if exists public.newsletter_subscribers;
drop table if exists public.site_settings;
drop table if exists public.social_links;

drop policy if exists artwork_images_admin_delete on storage.objects;
drop policy if exists artwork_images_admin_insert on storage.objects;
drop policy if exists artwork_images_admin_update on storage.objects;
drop policy if exists artwork_images_public_read on storage.objects;

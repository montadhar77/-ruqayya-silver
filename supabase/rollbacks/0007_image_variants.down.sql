-- Rollback of 0007_image_variants. Images already stored in three sizes keep working
-- with any version of the site (the main address is unchanged).
drop function if exists public.admin_unused_media(integer);

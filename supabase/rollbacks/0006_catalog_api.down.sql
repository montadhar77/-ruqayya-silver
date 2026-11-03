-- Rollback of 0006_catalog_api: removes the catalogue/dashboard functions and their indexes.
-- The pg_trgm extension is left installed (harmless, and it may be used elsewhere).
drop function if exists public.admin_stats();
drop function if exists public.admin_orders(text, text, integer, integer);
drop function if exists public.products_by_ids(uuid[]);
drop function if exists public.product_page(uuid);
drop function if exists public.search_products(text, integer, integer);
drop function if exists public.list_products(uuid, text, integer, integer);
drop function if exists public.catalog_home(integer);
drop index if exists public.inquiries_list_idx;
drop index if exists public.orders_status_created_idx;
drop index if exists public.orders_search_trgm_idx;
drop index if exists public.products_featured_idx;
drop index if exists public.products_cat_list_idx;
drop index if exists public.products_search_trgm_idx;
drop function if exists private.like_any(text);
drop function if exists private.order_doc(bigint, text, text, text, text);
drop function if exists private.product_doc(text, text, text, text, text);
drop function if exists private.ar_norm(text);

-- Rollback of 0004_hardening: privileges, upload types and error log as before.
drop function if exists public.client_error_summary();
drop function if exists public.log_client_error(text, text, text);
delete from private.rate_rules where kind = 'client_error';
drop table if exists private.client_errors;
update storage.buckets set allowed_mime_types = array['image/*', 'video/*'] where id = 'media';
do $$
declare t text; v_extra text := case when current_setting('server_version_num')::integer >= 170000 then ', maintain' else '' end;
begin
  -- exactly the tables that had these privileges before 0004 (the baseline tables)
  foreach t in array array['admins', 'settings', 'categories', 'products', 'orders', 'inquiries', 'exhibitions', 'artworks',
                           'artwork_images', 'messages', 'newsletter_subscribers', 'site_settings', 'social_links'] loop
    execute format('grant truncate, references, trigger%s on public.%I to anon, authenticated, service_role', v_extra, t);
  end loop;
  execute format('alter default privileges for role postgres in schema public grant truncate, references, trigger%s on tables to anon, authenticated, service_role', v_extra);
end $$;

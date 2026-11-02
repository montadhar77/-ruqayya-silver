-- =====================================================================
-- 0004 — least privilege for the API roles, safer uploads, client error log
--
-- * API roles (anon / authenticated / service_role) lose TRUNCATE, REFERENCES,
--   TRIGGER (and MAINTAIN on PostgreSQL 17) on every public table. These are
--   not reachable through the REST API today, but nothing needs them, and
--   TRUNCATE ignores row level security. Same for tables created later.
-- * Upload bucket "media": only the image/video formats the dashboard produces
--   (no SVG, which can carry scripts).
-- * private.client_errors + public.log_client_error(): the shop pages report
--   JavaScript errors (no personal data, rate limited); admins read a summary.
-- Rollback: supabase/rollbacks/0004_hardening.down.sql
-- =====================================================================

do $$
declare t record; v_extra text := case when current_setting('server_version_num')::integer >= 170000 then ', maintain' else '' end;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm') loop
    execute format('revoke truncate, references, trigger%s on public.%I from anon, authenticated, service_role', v_extra, t.relname);
  end loop;
  execute format('alter default privileges for role postgres in schema public revoke truncate, references, trigger%s on tables from anon, authenticated, service_role', v_extra);
end $$;

update storage.buckets
   set allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'image/avif', 'image/gif', 'video/mp4', 'video/webm']
 where id = 'media';

create table private.client_errors (
  id bigint generated always as identity primary key,
  page text not null default '',
  message text not null,
  source text not null default '',
  created_at timestamp with time zone not null default now()
);
create index client_errors_created_idx on private.client_errors (created_at desc);
revoke all on private.client_errors from public, anon, authenticated, service_role;

insert into private.rate_rules (kind, scope, max_count, window_seconds) values
  ('client_error', 'ip', 20, 600),
  ('client_error', 'all', 500, 600);

create function public.log_client_error(p_page text, p_message text, p_source text default '')
 returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  perform private.hit('client_error', private.request_ip(), null);
  insert into private.client_errors (page, message, source)
  values (left(coalesce(p_page, ''), 200), left(coalesce(nullif(btrim(p_message), ''), '(empty)'), 500), left(coalesce(p_source, ''), 300));
  if random() < 0.02 then
    delete from private.client_errors where created_at < now() - interval '30 days';
  end if;
exception when raise_exception then
  null;   -- over the limit: drop silently, never bother the visitor
end $function$;
revoke all on function public.log_client_error(text, text, text) from public;
grant execute on function public.log_client_error(text, text, text) to anon, authenticated;

create function public.client_error_summary()
 returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  select case when private.is_admin() then coalesce((
    select jsonb_build_object('last_24h', count(*) filter (where created_at > now() - interval '1 day'),
                              'last_7d', count(*),
                              'top', (select coalesce(jsonb_agg(x order by x.n desc), '[]'::jsonb) from (
                                        select message, count(*) as n, max(created_at) as last from private.client_errors
                                        where created_at > now() - interval '7 days' group by message order by n desc limit 5) x))
    from private.client_errors where created_at > now() - interval '7 days'), '{}'::jsonb) end
$function$;
revoke all on function public.client_error_summary() from public, anon;
grant execute on function public.client_error_summary() to authenticated;

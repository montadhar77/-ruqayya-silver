-- =====================================================================
-- STAGING ONLY. Makes a fresh Supabase project behave like the live one
-- before any migration runs (observed on production 2026-11-02, read-only):
--   * objects created by postgres in public: anon/authenticated/service_role
--     get only TRUNCATE, REFERENCES, TRIGGER, MAINTAIN on new tables and
--     nothing on new sequences/functions (PUBLIC keeps EXECUTE on functions)
--   * the ensure_rls event trigger turns on row level security for every new table
-- Order on a new staging project: bootstrap.sql -> migrations/0000.. -> staging/seed.sql
-- =====================================================================
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant truncate, references, trigger, maintain on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, service_role;

create or replace function public.rls_auto_enable()
 returns event_trigger language plpgsql security definer set search_path to 'pg_catalog'
as $function$
declare cmd record;
begin
  for cmd in select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO') and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null and cmd.schema_name in ('public') then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
      exception when others then
        raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    end if;
  end loop;
end;
$function$;
revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role;
drop event trigger if exists ensure_rls;
create event trigger ensure_rls on ddl_command_end when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();

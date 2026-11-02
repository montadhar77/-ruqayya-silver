-- =====================================================================
-- Local stand-in for the parts of a Supabase database that the
-- migrations depend on: API roles, auth schema, storage schema, and the
-- default privileges observed on the live project (2026-11-02):
--   new tables  -> anon/authenticated/service_role get only TRUNCATE, REFERENCES, TRIGGER
--   new functions -> PostgreSQL default: PUBLIC may EXECUTE (must be revoked explicitly)
-- so every migration must grant exactly what the API needs, as in production.
-- Used ONLY by the local test harness (tests/db). Never run on Supabase.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit; end if;
end $$;
grant anon, authenticated, service_role to authenticator;

create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- ---------- auth ----------
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim', true), ''),
                  nullif(current_setting('request.jwt.claims', true), ''))::jsonb
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

-- ---------- storage ----------
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text not null unique,
  owner uuid,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated;
grant all on storage.buckets to service_role;

-- ---------- default privileges, as on the live project ----------
alter default privileges in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges in schema public grant truncate, references, trigger on tables to anon, authenticated, service_role;
-- Functions keep PostgreSQL's built-in default (PUBLIC may EXECUTE). A per-schema
-- default cannot remove that grant, so on the live project new functions are also
-- callable by anon unless a migration revokes it. Tests assume this worst case.

-- ---------- live project's ensure_rls event trigger (RLS on for every new public table) ----------
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

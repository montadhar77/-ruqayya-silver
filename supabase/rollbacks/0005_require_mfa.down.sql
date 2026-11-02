-- Rollback of 0005_require_mfa: admins need only their password again.
drop function if exists public.admin_gate();
create or replace function private.is_admin()
 returns boolean language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$function$;
drop table if exists private.admin_policy;

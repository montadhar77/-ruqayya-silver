-- =====================================================================
-- 0005 — admins must pass two-step verification (TOTP) before they can change anything
--
-- private.is_admin() — used by every write policy, storage policy and am_i_admin() —
-- now also requires an "aal2" session (password + authenticator code). A stolen
-- password alone can no longer change products, read orders or upload files.
-- public.admin_gate() tells the dashboard what to show: enrolment / code / dashboard.
-- Switch (owner, SQL editor), e.g. if the phone with the authenticator app is lost:
--   update private.admin_policy set require_mfa = false;   -- then remove the factor in
--   Supabase > Authentication > Users > (user) > MFA, sign in, enrol again, set true.
-- PRODUCTION: apply only after the dashboard with the MFA screens is deployed.
-- Rollback: supabase/rollbacks/0005_require_mfa.down.sql
-- =====================================================================

create table private.admin_policy (
  id smallint primary key default 1 check (id = 1),
  require_mfa boolean not null default true
);
insert into private.admin_policy default values;
revoke all on private.admin_policy from public, anon, authenticated, service_role;

create or replace function private.is_admin()
 returns boolean language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  select exists (select 1 from public.admins a where a.user_id = auth.uid())
     and (coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
          or not coalesce((select p.require_mfa from private.admin_policy p where p.id = 1), true));
$function$;

create function public.admin_gate()
 returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp'
as $function$
  select jsonb_build_object(
    'admin', exists (select 1 from public.admins a where a.user_id = auth.uid()),
    'mfa_required', coalesce((select p.require_mfa from private.admin_policy p where p.id = 1), true),
    'aal', coalesce(auth.jwt() ->> 'aal', 'aal1'))
$function$;
revoke all on function public.admin_gate() from public, anon;
grant execute on function public.admin_gate() to authenticated;

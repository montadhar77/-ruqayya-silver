#!/usr/bin/env bash
# Restore drill: proves a backup can actually be restored, without touching any live database.
#   scripts/restore-drill.sh backup.dump.age age-identity.txt [target-db-url]
# Default target: a new throw-away database on the local test cluster (scripts/local-db.sh),
# prepared with the Supabase stand-in (roles, auth, storage). Prints row counts and checks.
set -euo pipefail
cd "$(dirname "$0")/.."
file="${1:?backup file (.dump.age)}"; key="${2:?age identity file}"
AGE="${AGE:-age}"
if [ -f "$file.sha256" ]; then ( cd "$(dirname "$file")" && sha256sum -c "$(basename "$file").sha256" ); fi
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
"$AGE" --decrypt --identity "$key" --output "$tmp/db.dump" "$file"
# Schema always comes from the versioned migrations; the backup supplies the DATA.
# (On a new Supabase project: staging/bootstrap.sql + all migrations first, then this script with its URL.)
if [ -n "${3:-}" ]; then
  target="$3"
else
  HOST="${RQ_PG_HOST:-/tmp/pgrq}"; PORT="${RQ_PG_PORT:-54329}"; name="rq_restore_$(date +%s)_$$"
  psql -h "$HOST" -p "$PORT" -U postgres -qc "create database $name"
  target="postgresql://postgres@/$name?host=$HOST&port=$PORT"
  psql "$target" -q -v ON_ERROR_STOP=1 -f supabase/tests/stub.sql >/dev/null
  for m in supabase/migrations/[0-9][0-9][0-9][0-9]_*.sql; do psql "$target" -q -v ON_ERROR_STOP=1 -f "$m" >/dev/null; done
fi
# rows the migrations themselves insert are replaced by the backed-up values
psql "$target" -q -v ON_ERROR_STOP=1 -c "do \$\$ declare t text; begin
  foreach t in array array['private.rate_rules', 'private.notify_state', 'private.admin_policy'] loop
    if to_regclass(t) is not null then execute 'truncate ' || t; end if; end loop; end \$\$;"
# admin accounts live in the Auth service of each project: re-add the owner after a restore
# (insert into public.admins select id from auth.users where email = '...';)
pg_restore --list "$tmp/db.dump" | grep -v "TABLE DATA public admins " > "$tmp/items.list"
pg_restore --data-only --no-owner --exit-on-error --use-list="$tmp/items.list" --dbname="$target" "$tmp/db.dump"
psql "$target" -At -v ON_ERROR_STOP=1 <<'SQL'
select 'products=' || count(*) from public.products;
select 'categories=' || count(*) from public.categories;
select 'orders=' || count(*) from public.orders;
select 'inquiries=' || count(*) from public.inquiries;
select 'settings=' || count(*) from public.settings;
select 'last_order=' || coalesce(max(order_no)::text, '-') from public.orders;
select 'rls_tables_without_rls=' || count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
select 'checkout_function=' || count(*) from pg_proc where proname = 'create_order';
SQL
echo "restored into: $target"

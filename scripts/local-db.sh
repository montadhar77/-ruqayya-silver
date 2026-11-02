#!/usr/bin/env bash
# Local throw-away PostgreSQL cluster for the automated tests (never Supabase).
#   scripts/local-db.sh start | stop | status
# Settings (env): RQ_PG_DIR (default /tmp/pgrq), RQ_PG_PORT (default 54329)
set -euo pipefail
DIR="${RQ_PG_DIR:-/tmp/pgrq}"; PORT="${RQ_PG_PORT:-54329}"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$PGBIN/initdb" ] || { echo "PostgreSQL server binaries not found (set PGBIN)"; exit 1; }
as_pg() {   # PostgreSQL refuses to run as root
  if [ "$(id -u)" = 0 ]; then id pgrunner >/dev/null 2>&1 || useradd -m pgrunner; chown -R pgrunner "$DIR"; su pgrunner -c "$*"; else bash -c "$*"; fi
}
case "${1:-start}" in
  start)
    mkdir -p "$DIR"
    if [ ! -f "$DIR/data/PG_VERSION" ]; then
      as_pg "$PGBIN/initdb -D $DIR/data -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null"
    fi
    if ! as_pg "$PGBIN/pg_ctl -D $DIR/data status >/dev/null 2>&1"; then
      as_pg "$PGBIN/pg_ctl -D $DIR/data -l $DIR/log.txt -w start -o \"-p $PORT -k $DIR -c listen_addresses='' -c max_connections=300 -c shared_preload_libraries=pg_stat_statements -c fsync=off\""
    fi
    echo "local test database: psql -h $DIR -p $PORT -U postgres" ;;
  stop) as_pg "$PGBIN/pg_ctl -D $DIR/data -m fast stop" ;;
  status) as_pg "$PGBIN/pg_ctl -D $DIR/data status" ;;
  *) echo "usage: $0 start|stop|status"; exit 2 ;;
esac

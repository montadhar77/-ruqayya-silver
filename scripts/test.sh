#!/usr/bin/env bash
# Runs every automated test locally:  scripts/test.sh [db|e2e|functions|all]
# Needs: PostgreSQL 16+ server binaries, Python 3.11+ with tests/requirements.txt,
# Google Chrome or Chromium (RQ_CHROME), PostgREST 12 (RQ_POSTGREST) and Deno 2 (RQ_DENO).
set -euo pipefail
cd "$(dirname "$0")/.."
what="${1:-all}"
scripts/local-db.sh start >/dev/null
if [ "$what" = db ] || [ "$what" = all ]; then python3 -m pytest tests/db -q; fi
if { [ "$what" = functions ] || [ "$what" = all ]; } && [ -d supabase/functions ]; then
  "${RQ_DENO:-deno}" test --allow-net --allow-env --allow-read supabase/functions/
fi
if [ "$what" = e2e ] || [ "$what" = all ]; then python3 -m pytest tests/e2e -q; fi

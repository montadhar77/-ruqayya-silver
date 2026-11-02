#!/usr/bin/env bash
# Encrypted database backup.
#   SUPABASE_DB_URL=postgresql://... AGE_RECIPIENT=age1... scripts/backup.sh [out-dir]
# Dumps the shop's own schemas (public, private: products, orders, messages, settings,
# stock moves, alert bookkeeping) in pg_dump custom format, encrypts it for the owner's
# age public key, and writes a checksum. The plain dump never leaves the temp folder.
set -euo pipefail
: "${SUPABASE_DB_URL:?set SUPABASE_DB_URL (Supabase > Project Settings > Database > connection string)}"
: "${AGE_RECIPIENT:?set AGE_RECIPIENT (the age public key, age1...)}"
AGE="${AGE:-age}"; OUT="${1:-.}"
mkdir -p "$OUT"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
stamp="$(date -u +%Y%m%dT%H%MZ)"
pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --schema=public --schema=private --file="$tmp/db.dump"
"$AGE" --encrypt --recipient "$AGE_RECIPIENT" --output "$OUT/ruqayya-$stamp.dump.age" "$tmp/db.dump"
( cd "$OUT" && sha256sum "ruqayya-$stamp.dump.age" > "ruqayya-$stamp.dump.age.sha256" )
echo "$OUT/ruqayya-$stamp.dump.age"

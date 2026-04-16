#!/usr/bin/env bash
set -euo pipefail

# Import a PostgreSQL custom dump into Supabase (or any Postgres target).
# Usage:
#   SUPABASE_DATABASE_URL='postgresql://...' bash scripts/db-import-supabase.sh backups/neon.dump
#   bash scripts/db-import-supabase.sh --target-url 'postgresql://...' --dump backups/neon.dump

TARGET_URL="${SUPABASE_DATABASE_URL:-${DATABASE_URL:-}}"
DUMP_FILE="${1:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target-url)
      TARGET_URL="$2"
      shift 2
      ;;
    --dump)
      DUMP_FILE="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [[ -z "${TARGET_URL}" ]]; then
  echo "Error: target database URL is required." >&2
  echo "Set SUPABASE_DATABASE_URL or pass --target-url." >&2
  exit 1
fi

if [[ -z "${DUMP_FILE}" || ! -f "${DUMP_FILE}" ]]; then
  echo "Error: valid dump file is required." >&2
  echo "Pass dump file path as first argument or use --dump." >&2
  exit 1
fi

PG_RESTORE_BIN="pg_restore"
if [[ -x "/opt/homebrew/opt/postgresql@17/bin/pg_restore" ]]; then
  PG_RESTORE_BIN="/opt/homebrew/opt/postgresql@17/bin/pg_restore"
fi

echo "Importing ${DUMP_FILE} into target database ..."
"${PG_RESTORE_BIN}" \
  --verbose \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname "${TARGET_URL}" \
  "${DUMP_FILE}"

echo "Import complete."

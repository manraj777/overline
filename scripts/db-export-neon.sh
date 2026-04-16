#!/usr/bin/env bash
set -euo pipefail

# Export a PostgreSQL dump from Neon (or any Postgres source).
# Usage:
#   NEON_DATABASE_URL='postgresql://...' bash scripts/db-export-neon.sh
#   bash scripts/db-export-neon.sh --source-url 'postgresql://...' --out backups/neon.dump

SOURCE_URL="${NEON_DATABASE_URL:-${DATABASE_URL:-}}"
OUT_FILE="${1:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-url)
      SOURCE_URL="$2"
      shift 2
      ;;
    --out)
      OUT_FILE="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [[ -z "${SOURCE_URL}" ]]; then
  echo "Error: source database URL is required." >&2
  echo "Set NEON_DATABASE_URL or pass --source-url." >&2
  exit 1
fi

mkdir -p backups
if [[ -z "${OUT_FILE}" ]]; then
  OUT_FILE="backups/neon-$(date +%Y%m%d-%H%M%S).dump"
fi

PG_DUMP_BIN="pg_dump"
if [[ -x "/opt/homebrew/opt/postgresql@17/bin/pg_dump" ]]; then
  PG_DUMP_BIN="/opt/homebrew/opt/postgresql@17/bin/pg_dump"
fi

echo "Exporting database to ${OUT_FILE} ..."
"${PG_DUMP_BIN}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  --file "${OUT_FILE}" \
  "${SOURCE_URL}"

echo "Export complete: ${OUT_FILE}"

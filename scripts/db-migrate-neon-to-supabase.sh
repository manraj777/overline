#!/usr/bin/env bash
set -euo pipefail

# One-command Neon -> Supabase migration helper.
# Required env vars:
#   NEON_DATABASE_URL=postgresql://...
#   SUPABASE_DATABASE_URL=postgresql://...
# Optional:
#   DUMP_FILE=backups/neon.dump
#
# This script:
# 1) Exports source DB
# 2) Imports into Supabase
# 3) Runs Prisma migrate deploy against Supabase

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "${NEON_DATABASE_URL:-}" ]]; then
  echo "Error: NEON_DATABASE_URL is required" >&2
  exit 1
fi

if [[ -z "${SUPABASE_DATABASE_URL:-}" ]]; then
  echo "Error: SUPABASE_DATABASE_URL is required" >&2
  exit 1
fi

DUMP_PATH="${DUMP_FILE:-backups/neon-$(date +%Y%m%d-%H%M%S).dump}"

bash "${ROOT_DIR}/scripts/db-export-neon.sh" --source-url "${NEON_DATABASE_URL}" --out "${DUMP_PATH}"
bash "${ROOT_DIR}/scripts/db-import-supabase.sh" --target-url "${SUPABASE_DATABASE_URL}" --dump "${DUMP_PATH}"

echo "Running Prisma migrate deploy against Supabase ..."
(
  cd "${ROOT_DIR}/apps/backend"
  DATABASE_URL="${SUPABASE_DATABASE_URL}" pnpm prisma:migrate:prod
)

echo "Migration workflow completed. Dump file: ${DUMP_PATH}"

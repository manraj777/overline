#!/usr/bin/env bash
# Overline backend redeploy script (run on EC2 inside the repo root).
#
#   ./deploy/deploy.sh                # standard redeploy
#   ./deploy/deploy.sh --with-prisma  # also runs prisma generate + db push
#   ./deploy/deploy.sh --branch dev   # deploy a non-main branch
#
# Idempotent and safe to re-run. Exits non-zero on any failure so PM2 keeps
# the previous process alive.

set -euo pipefail

# ---- config -----------------------------------------------------------------
PM2_APP_NAME="${PM2_APP_NAME:-overline-backend}"
BRANCH="main"
RUN_PRISMA=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-prisma) RUN_PRISMA=1; shift ;;
    --branch)      BRANCH="${2:?--branch needs a value}"; shift 2 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

# ---- locate repo root -------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

log() { printf '\033[1;36m[deploy]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[deploy:error]\033[0m %s\n' "$*" >&2; exit 1; }

command -v pnpm >/dev/null || fail "pnpm not found in PATH"
command -v pm2  >/dev/null || fail "pm2 not found in PATH"
command -v git  >/dev/null || fail "git not found in PATH"

# ---- 1. pull latest code ----------------------------------------------------
log "Fetching origin/$BRANCH"
git fetch --prune origin "$BRANCH"

if [[ -n "$(git status --porcelain)" ]]; then
  fail "Working tree is dirty. Commit/stash changes on EC2 before deploying."
fi

git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
COMMIT_SHA="$(git rev-parse --short HEAD)"
log "Now at $BRANCH @ $COMMIT_SHA"

# ---- 2. install deps (monorepo root) ---------------------------------------
log "pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

# ---- 3. prisma (optional) ---------------------------------------------------
if [[ "$RUN_PRISMA" -eq 1 ]]; then
  log "Running prisma generate + db push"
  pnpm --filter "./apps/backend" exec prisma generate
  pnpm --filter "./apps/backend" exec prisma db push
else
  # Always regenerate the client in case the schema moved underneath us.
  log "Running prisma generate (schema-only)"
  pnpm --filter "./apps/backend" exec prisma generate
fi

# ---- 4. build backend -------------------------------------------------------
log "Building apps/backend"
pnpm --filter "./apps/backend" run build

# ---- 5. restart pm2 ---------------------------------------------------------
if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  log "Restarting PM2 app: $PM2_APP_NAME"
  pm2 restart "$PM2_APP_NAME" --update-env
else
  log "Starting PM2 app: $PM2_APP_NAME (first run)"
  pm2 start "apps/backend/dist/main.js" --name "$PM2_APP_NAME" --update-env
fi

pm2 save >/dev/null
log "Deployed $COMMIT_SHA. Tailing logs (Ctrl-C to exit)..."

# ---- 6. tail logs briefly so a crash is obvious ----------------------------
exec pm2 logs "$PM2_APP_NAME" --lines 50

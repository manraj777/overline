#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HERMESC_PATH="$(find "$ROOT_DIR/node_modules/.pnpm" -type f -path "*/node_modules/hermes-compiler/hermesc/osx-bin/hermesc" | head -n 1)"

if [[ -z "${HERMESC_PATH:-}" || ! -x "$HERMESC_PATH" ]]; then
  echo "ERROR: Could not locate executable hermesc binary under node_modules/.pnpm"
  exit 1
fi

exec "$HERMESC_PATH" "$@"

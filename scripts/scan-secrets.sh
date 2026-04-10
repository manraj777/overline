#!/usr/bin/env bash

set -euo pipefail

# Scan tracked files for hardcoded Google API key patterns.
if git grep -nE 'AIza[0-9A-Za-z_-]{35}' -- . ':!*.md' ':!.github/workflows/secret-scan.yml'; then
  echo "Detected Google API key pattern in tracked files. Move secrets to environment or local-only config."
  exit 1
fi

# Ensure mobile google-services files are never tracked.
tracked="$(git ls-files apps/mobile-admin/android/app/google-services.json apps/mobile-user/android/app/google-services.json || true)"
if [ -n "$tracked" ]; then
  echo "google-services.json must not be tracked by git:"
  echo "$tracked"
  exit 1
fi

echo "Secret scan passed."
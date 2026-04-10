#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

git -C "$repo_root" config core.hooksPath .githooks
chmod +x "$repo_root/.githooks/pre-commit"
chmod +x "$repo_root/scripts/scan-secrets.sh"

echo "Git hooks configured. pre-commit will now run secret scan checks."
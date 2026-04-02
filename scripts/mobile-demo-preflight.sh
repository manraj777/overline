#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[demo-preflight] Checking required files and env"

MISSING=0

if [[ ! -f "$ROOT_DIR/apps/mobile-user/android/app/google-services.json" ]]; then
  echo "[missing] apps/mobile-user/android/app/google-services.json"
  MISSING=1
fi

if [[ ! -f "$ROOT_DIR/apps/backend/.env" ]]; then
  echo "[missing] apps/backend/.env"
  MISSING=1
else
  if ! grep -q "^RAZORPAY_KEY_ID=" "$ROOT_DIR/apps/backend/.env"; then
    echo "[missing] RAZORPAY_KEY_ID in apps/backend/.env"
    MISSING=1
  fi
  if ! grep -q "^RAZORPAY_KEY_SECRET=" "$ROOT_DIR/apps/backend/.env"; then
    echo "[missing] RAZORPAY_KEY_SECRET in apps/backend/.env"
    MISSING=1
  fi
fi

if [[ "$MISSING" -eq 1 ]]; then
  echo "[demo-preflight] FAILED. Add missing items and re-run."
  exit 1
fi

echo "[demo-preflight] OK"

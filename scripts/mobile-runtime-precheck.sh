#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

log() {
  printf "\n[precheck] %s\n" "$1"
}

fail() {
  printf "\n[precheck][error] %s\n" "$1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

log "Checking required tools"
require_cmd node
require_cmd pnpm
require_cmd npx

log "Node version"
node -v

log "pnpm version"
pnpm -v

log "Running backend compile check"
cd "$ROOT_DIR/apps/backend"
pnpm run build

log "Running mobile-user lint checks on key runtime flow files"
cd "$ROOT_DIR/apps/mobile-user"
npx eslint \
  src/navigation/RootNavigator.tsx \
  src/screens/booking/BookingScreen.tsx \
  src/screens/profile/ProfileScreen.tsx \
  src/screens/profile/EditProfileScreen.tsx \
  src/screens/chat/ChatScreen.tsx \
  src/api/client.ts

log "Running mobile-admin lint checks on key runtime flow files"
cd "$ROOT_DIR/apps/mobile-admin"
npx eslint \
  src/navigation/RootNavigator.tsx \
  src/screens/dashboard/DashboardScreen.tsx \
  src/screens/bookings/BookingsScreen.tsx \
  src/screens/bookings/BookingDetailScreen.tsx \
  src/screens/bookings/VerifyCodeScreen.tsx \
  src/screens/settings/SettingsScreen.tsx \
  src/screens/settings/PayoutDetailsScreen.tsx \
  src/screens/settings/StaffManagementScreen.tsx \
  src/screens/services/ServicesScreen.tsx \
  src/screens/auth/OtpVerifyScreen.tsx \
  src/api/client.ts

log "Precheck complete"
printf "\nNext manual device steps:\n"
printf "1) Start backend: cd apps/backend && pnpm run dev\n"
printf "2) Start user app metro: cd apps/mobile-user && pnpm start\n"
printf "3) Start admin app metro: cd apps/mobile-admin && pnpm start\n"
printf "4) Android USB: adb reverse tcp:8081 tcp:8081 && adb reverse tcp:3001 tcp:3001\n"
printf "5) Run checklist: docs/MOBILE_RUNTIME_QA_CHECKLIST.md\n"

#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-release}"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ "$MODE" != "debug" && "$MODE" != "release" ]]; then
	echo "Usage: bash build-apks.sh [debug|release]"
	exit 1
fi

if [[ "$MODE" == "release" ]]; then
	TASK="assembleRelease"
	APK_DIR="release"
else
	TASK="assembleDebug"
	APK_DIR="debug"
	echo "WARNING: Debug APK requires Metro server at runtime and is not for standalone emulator/device testing."
fi

echo "Building $MODE APKs for Overline apps..."

# mobile-user requires google-services.json for Google Sign-In/Firebase plugin.
if [[ ! -f "$ROOT_DIR/apps/mobile-user/android/app/google-services.json" ]]; then
	echo "ERROR: Missing file apps/mobile-user/android/app/google-services.json"
	echo "Google login APK cannot be built without Firebase Android config."
	exit 1
fi

echo "\nBuilding Admin App (mobile-admin)..."
cd "$ROOT_DIR/apps/mobile-admin/android"
./gradlew clean "$TASK"

echo "\nBuilding User App (mobile-user)..."
cd "$ROOT_DIR/apps/mobile-user/android"
./gradlew clean "$TASK"

cd "$ROOT_DIR"

echo "\nBuild completed successfully."
echo "User App APK:  apps/mobile-user/android/app/build/outputs/apk/$APK_DIR/app-$APK_DIR.apk"
echo "Admin App APK: apps/mobile-admin/android/app/build/outputs/apk/$APK_DIR/app-$APK_DIR.apk"

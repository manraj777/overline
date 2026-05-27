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

validate_google_services() {
	local file_path="$1"
	local package_name="$2"

	node - "$file_path" "$package_name" <<'NODE'
const fs = require('fs');

const filePath = process.argv[2];
const packageName = process.argv[3];

let payload;
try {
	payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (error) {
	console.error(`ERROR: ${filePath} is not valid JSON`);
	process.exit(1);
}

const clients = Array.isArray(payload.client) ? payload.client : [];
const appClient = clients.find((entry) => {
	return entry?.client_info?.android_client_info?.package_name === packageName;
});

if (!appClient) {
	console.error(`ERROR: ${filePath} does not contain package_name ${packageName}`);
	process.exit(1);
}

const oauthClients = Array.isArray(appClient.oauth_client) ? appClient.oauth_client : [];
const hasAndroidOAuth = oauthClients.some((entry) => entry?.client_type === 1);
const hasWebOAuth = oauthClients.some((entry) => entry?.client_type === 3);

if (!hasAndroidOAuth) {
	console.error(`ERROR: ${filePath} is missing Android OAuth client (client_type 1) for ${packageName}.`);
	console.error('Google Sign-In will fail with developer_error until Firebase Android OAuth is configured with SHA fingerprints.');
	process.exit(1);
}

if (!hasWebOAuth) {
	console.error(`ERROR: ${filePath} is missing Web OAuth client (client_type 3) for ${packageName}.`);
	process.exit(1);
}

console.log(`Verified Google OAuth config in ${filePath} for ${packageName}`);
NODE
}

# Both Android apps require google-services.json for Google Sign-In/Firebase plugin.
if [[ ! -f "$ROOT_DIR/apps/mobile-admin/android/app/google-services.json" ]]; then
	echo "ERROR: Missing file apps/mobile-admin/android/app/google-services.json"
	echo "Admin APK cannot provide Google login without Firebase Android config."
	exit 1
fi

if [[ ! -f "$ROOT_DIR/apps/mobile-user/android/app/google-services.json" ]]; then
	echo "ERROR: Missing file apps/mobile-user/android/app/google-services.json"
	echo "User APK cannot provide Google login without Firebase Android config."
	exit 1
fi

validate_google_services "$ROOT_DIR/apps/mobile-admin/android/app/google-services.json" "com.overlineadmin"
validate_google_services "$ROOT_DIR/apps/mobile-user/android/app/google-services.json" "com.overlineuser"

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

#!/bin/bash

# Ensure script halts on any error
set -e

echo "🔨 Building Release APKs for Overline Apps..."
echo "This will create standalone APKs connected to the Production Backend that can run on any network."

# 1. Build Mobile Admin APK
echo "\n📱 Building Admin App (mobile-admin)..."
cd apps/mobile-admin/android
./gradlew clean assembleRelease
cd ../../../

# 2. Build Mobile User APK
echo "\n📱 Building User App (mobile-user)..."
cd apps/mobile-user/android
./gradlew clean assembleRelease
cd ../../../

echo "\n✅ Build completed successfully!"
echo "You can find your APKs at the following locations:"
echo "➡️  User App:  apps/mobile-user/android/app/build/outputs/apk/release/app-release.apk"
echo "➡️  Admin App: apps/mobile-admin/android/app/build/outputs/apk/release/app-release.apk"

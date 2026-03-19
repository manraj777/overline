#!/bin/bash
# Patch React Native Gradle plugin ktfmtCheck issue
# This is a known issue with RN 0.84 where tasks.named conflicts with ktfmt plugin tasks

GRADLE_FILE="node_modules/@react-native/gradle-plugin/build.gradle.kts"

if [ -f "$GRADLE_FILE" ]; then
  # Use findByName instead of named to avoid task already exists error
  sed -i '' 's/tasks.named("ktfmtCheck")/tasks.findByName("ktfmtCheck")?.apply/' "$GRADLE_FILE"
  sed -i '' 's/tasks.named("ktfmtFormat")/tasks.findByName("ktfmtFormat")?.apply/' "$GRADLE_FILE"
  echo "✅ Patched @react-native/gradle-plugin ktfmt tasks"
fi

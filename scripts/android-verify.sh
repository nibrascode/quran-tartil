#!/usr/bin/env bash
# Fails the build if the merged manifest lacks a required permission.
set -euo pipefail
m=$(find android/app/build/intermediates -name AndroidManifest.xml -path "*merged_manifest*" | head -1)
echo "merged manifest: $m"
for p in RECORD_AUDIO VIBRATE POST_NOTIFICATIONS WAKE_LOCK INTERNET; do
  grep -q "android.permission.$p\"" "$m" || { echo "MISSING $p"; exit 1; }
done
echo "all required permissions present"

#!/usr/bin/env bash
# Fails if the built APK does not carry the app icon (adaptive background colour, foreground layer, round + legacy icons, splash).
set -euo pipefail
apk=${1:?apk path}
AAPT2=$(ls "$ANDROID_HOME"/build-tools/*/aapt2 | tail -1)
out=$("$AAPT2" dump resources "$apk")
echo "$out" | grep -B1 -A3 ic_launcher_background | head -12 || true
grep -A3 "ic_launcher_background" <<<"$out" | grep -qi "06193a" || { echo "adaptive icon background colour missing"; exit 1; }
for n in ic_launcher_foreground ic_launcher_round splash_icon; do grep -q "$n" <<<"$out" || { echo "missing resource $n"; exit 1; }; done
# release builds shrink/obfuscate resource paths (res/Xk.png), so check the resource table, not file names
grep -A12 "mipmap/ic_launcher_foreground" <<<"$out" | grep -qE "\(file\) res/.*\.png" || { echo "foreground png missing"; exit 1; }
"$AAPT2" dump badging "$apk" | grep -E "application-icon|launchable" | head -3
echo "icon verified in $apk"

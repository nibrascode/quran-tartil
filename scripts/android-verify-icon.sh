#!/usr/bin/env bash
# Fails if the built APK does not carry the app icon (adaptive background colour, foreground layer, round + legacy icons, splash).
set -euo pipefail
apk=${1:?apk path}
AAPT2=$(ls "$ANDROID_HOME"/build-tools/*/aapt2 | tail -1)
out=$("$AAPT2" dump resources "$apk")
echo "$out" | grep -A1 "ic_launcher_background" | grep -qi "ff06193a" || { echo "adaptive icon background colour missing"; exit 1; }
for n in ic_launcher_foreground ic_launcher_round splash_icon; do echo "$out" | grep -q "$n" || { echo "missing resource $n"; exit 1; }; done
files=$(unzip -l "$apk")
echo "$files" | grep -qE "mipmap-xxxhdpi.*ic_launcher_foreground\.png" || { echo "foreground png missing"; exit 1; }
"$AAPT2" dump badging "$apk" | grep -E "application-icon|launchable" | head -3
echo "icon verified in $apk"

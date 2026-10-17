#!/usr/bin/env bash
# Patches the generated Android project (android/ is not committed): permissions + speech-service visibility.
set -euo pipefail
f=android/app/src/main/AndroidManifest.xml
add() { grep -q "android.permission.$1\"" "$f" || sed -i "s#</manifest>#    <uses-permission android:name=\"android.permission.$1\" />\n</manifest>#" "$f"; }
for p in INTERNET RECORD_AUDIO MODIFY_AUDIO_SETTINGS VIBRATE POST_NOTIFICATIONS WAKE_LOCK; do add "$p"; done
# microphone is optional hardware: do not hide the app from devices without it
grep -q "hardware.microphone" "$f" || sed -i 's#</manifest>#    <uses-feature android:name="android.hardware.microphone" android:required="false" />\n</manifest>#' "$f"
# Android 11+ package visibility: lets the app find the system speech recogniser
grep -q "android.speech.RecognitionService" "$f" || sed -i 's#</manifest>#    <queries>\n        <intent><action android:name="android.speech.RecognitionService" /></intent>\n    </queries>\n</manifest>#' "$f"
echo "--- manifest permissions"; grep -E "uses-permission|uses-feature|RecognitionService" "$f"

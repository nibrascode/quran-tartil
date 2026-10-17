# Quran Tartil

Offline Quran reading PWA (Vite + React + TypeScript, mobile first), wrapped for Android with Capacitor.

- **Text:** Arabic only, Tanzil Uthmani 1.1, bundled verbatim (offline). Attribution and terms are shown in the About screen and in `LICENSE`.
- **Layout:** 604-page Madinah mushaf pagination from Tanzil metadata (free, CC BY). Each page fills the screen: the text is scaled to the largest size that fits. Line breaks are **not** identical to the printed mushaf (no free per-line data was used).
- **Page turning:** Arabic book direction. Swipe left-to-right or tap the left edge = next page (enters from the left); right edge = previous; middle = menu. Jump by surah, juz, page or slider. Starts at page 1 on first launch and then resumes.
- **UI languages:** az, en, tr, ar (RTL), ru. The Quran text is never translated.
- **Font:** Amiri Quran (OFL 1.1).

## Develop
```
npm install
npm run dev        # dev server
npm test           # data integrity tests
npm run build      # static build in dist/
```
## Android
`npm run build && npx cap add android && npx cap sync android` then build in Android Studio. CI (`.github/workflows/android-debug.yml`) builds a debug APK artifact on every push to main.

### Releases (signed APK + AAB)
`.github/workflows/android-release.yml` (manual run or a `v*` tag) builds a signed APK and AAB. It needs these repository secrets: `ANDROID_KEYSTORE_BASE64` (base64 of the PKCS12 keystore), `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`. The keystore is never committed. Losing it means you can no longer update the app on Google Play (unless you enrolled in Play App Signing): keep an offline backup. Create one with `openssl req -x509 -newkey rsa:4096 -days 10000 -nodes ...` + `openssl pkcs12 -export -name quran ...`.

## Tartil checker (experimental)
Menu > Tartil check: pick an ayah of the current page, press Start and recite. Each word turns green (matches), red (a different word was heard or a word was skipped) and the app warns.

Honest limits: it compares **words only** (no tajweed, no letter-level makharij); accuracy depends on the recogniser. Web/Chrome uses the browser Web Speech API (`ar-SA`, usually online via the browser vendor). The Android app uses `@capacitor-community/speech-recognition` (the system recogniser, also usually online). A fully offline on-device ONNX model (e.g. Whisper tiny/base Arabic) is **not** included yet: it would add tens of MB and needs real-device testing. Matching logic: `src/tartil.ts` (word-level edit distance after normalising harakat and letter variants), covered by `scripts/tartil.test.mjs`.

## v0.2 features
- Opening pages 1-2 set line by line like the printed mushaf (ornate surah frame, centred lines, full screen height); other pages fill the screen with fitted font size and line spacing.
- Book-style 3D page turn (spine on the right), bookmarks, last read, khatm progress, daily goal + streak, daily reminder (Android), Arabic diacritic-insensitive search, ayah copy/share (Arabic text only, with Tanzil credit).
- **Recite mode** (mic button in the reader's bottom bar): words are revealed and coloured green/red as you recite, the page turns itself, pause/stop/review.
- **Strictness** Easy / Medium / Hard (Settings > Tartil check options): matching threshold, look-alike letters, skipped words, and how soon a mistake is shown.
- Settings as expandable cards (language, theme, text size, page-turn animation, keep screen on, reminders, tartil options, reset/clear data), Privacy Policy in 5 languages (`PRIVACY.md`, in app, and `privacy.html` on the web build; generated from `scripts/privacy-source.json` by `npm run privacy`).
- Audio recitation is intentionally **not** included: no reciter audio with a clear permissive license was found (EveryAyah / Islamic Network files have undocumented per-recording rights).

## Practice, backup, tablets
- **Practice tab:** ayah repeat (×1–10), weak-word drill (mistakes from recitation are remembered; a clean pass clears them), and Hifz mode (add ayahs, recite with the text hidden, Leitner spaced repetition: 1/2/4/8/16/32/64 days; pass = 80%+). Logic: `src/practice.ts` (tests in `scripts/practice.test.mjs`).
- **Backup:** Settings → Backup exports/imports bookmarks, progress, mistakes and memorization as JSON (validated, merged, never overwrites). `src/backup.ts`.
- **Tablets / landscape ≥ 900px:** two facing mushaf pages (odd on the right).
- **CI:** `.github/workflows/e2e.yml` runs Playwright audits (page fill/overflow, UI sweep over 5 languages × 3 themes, practice, backup, spread).

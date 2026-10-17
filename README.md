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

## Tartil checker (experimental)
See the in-app notice: Arabic speech recognition is imperfect and cannot judge tajweed.

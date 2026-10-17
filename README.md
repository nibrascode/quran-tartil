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

## App icon
`assets/icon-source.jpg` is the master art. `python3 scripts/make-icons.py` (Pillow + numpy) regenerates the web icons in `public/` (favicon, apple-touch, PWA 192/512 + maskable) and the Android resources in `assets/android-res/` (legacy, round, adaptive foreground, background colour `#06193A`, splash). `scripts/android-setup.sh` copies them into the generated Android project; CI verifies the icon is inside the APK.
## Voice navigation
Open the mic anywhere and start reciting: isti'adha and basmala are ignored, the ayah is recognised from its first words across the whole Quran (`src/voiceNav.ts`), the page jumps there and tracking starts from that ayah at every strictness level.

## Home screen
The app opens on a Home screen (`src/Home.tsx`): greeting and logo, a "Continue reading" card with khatm progress, the ayah of the day (deterministic per local date, Arabic only), daily-goal and khatm rings with the streak, and quick actions (start tartil, practice due count, surah/page/juz, bookmarks, mistakes, search, settings). The home button in the reader's top bar and dock returns to it. E2E audits skip it with `sessionStorage["qt.home"]="0"`; `scripts/e2e/home.mjs` covers Home itself.

## Speech recognition quality
What the app does (see `src/speech.ts`, `src/asr.ts`):
- Web Speech: `continuous`, `interimResults`, `maxAlternatives = 5`. Every result's alternatives are scored against the words expected next (current + following ayahs, imla'i spelling aware); the engine's favourite is replaced only by an alternative that matches strictly more expected words, never on confidence alone.
- Gapless auto-restart: when the engine ends (silence), it is restarted immediately; the session resumes from the next expected word and skips repeated overlap words (`ReciteSession.newRecogniser`). It gives up only after 6 instant failures in a row.
- A noise-suppressed, echo-cancelled mic stream (`getUserMedia`) is held next to the recogniser. Note: Chrome's Web Speech API captures audio itself, so this mainly warms up permission/audio path; it is not guaranteed to change what the recogniser hears.
- Android (Capacitor plugin): `maxResults = 5` alternatives, partial results, no popup, same expected-text scoring.
- Settings → "Speech diagnostics": engine, locale, average/last confidence, results, auto-restarts, alternatives swapped, last heard text, and a live microphone test.

Honest limits: locales (ar-SA/EG/AE/MA) cannot be compared without real devices, so ar-SA stays the default and the user can switch. Web Speech sends audio to the browser vendor's server (online only); Quranic Arabic is outside what these engines are trained on, and tajweed cannot be judged.

Free stronger fallback: WASM Whisper (e.g. transformers.js / whisper.cpp) was evaluated but NOT integrated. Costs: tiny/base models (40-150 MB) must be downloaded once, and are noticeably worse than Google's Arabic on Quranic text; `small` (~250 MB) is better but far slower than real time on mid-range phones (seconds per utterance), so word-by-word live colouring would lag. It would also add large assets to an offline PWA and the APK. Recommendation: keep the platform recogniser for live use; consider Whisper-small only as an optional, user-downloaded, per-ayah (non-live) "check after reciting" mode.

## Recitation matching: research notes and measured accuracy
How others do it: Tarteel trains its own acoustic model (CTC on crowd-sourced recitation) and aligns the decoded text to the known verse; the open-source "Tilawa" project runs an on-device streaming CTC model and fuzzy-matches against the Quran text (its model assets are non-commercial). Those models are Quran-specific acoustic models; a free general recogniser (Web Speech / Android SpeechRecognizer) cannot be constrained to the expected text, so this app does the next best thing: it scores the engine's alternatives against the expected words, then aligns (DP over words, with split/merge, repeat and partial-word handling) using the expected ayah as the reference.

Offline corpus (`scripts/recog-corpus.mjs`, `scripts/recog-corpus.test.mjs`): 389 ayahs sampled across the Quran (4-24 words), each turned into noisy but *correct* recitations and into *wrong* ones. Accepted = ayah closes with score 100 and no mistake.

| correct variant | before | after |
|---|---|---|
| clean / hamza-alif-ta marbuta variants / imla'i spelling / merged words / "wa" split | 100% | 100% |
| word split in two (e.g. يع ملون) | 94.9% | 100% |
| word repeated by the engine (stutter / echo) | 94.6% / 93.1% | 100% / 100% |
| number word written as digit ("3" for ثلاثة), only 3 ayahs in the sample | 66% easy, 0% medium/hard | 100% |
| restart after a pause, engine repeats 0 / 1 / 2 last words | 100 / 100 / 99.7% | 100 / 100 / 99.7% |

Wrong recitations that must NOT be accepted (false accepts): substituted word 0/389, wrong consonant 0/389, swapped order 0 (medium, hard) in all levels; skipped word 0/389 at medium and hard. At Easy only a dropped 1-2 letter particle (و، في، من...) is forgiven: 41/389 skipped-word cases and 1 swap pass there (before this change a skipped content word of any length also passed: 117 -> 41 after restricting; 349/389 in the previous version). The corpus simulates recogniser *text* errors; it cannot measure acoustic accuracy, which needs real recordings on a device.

## QA
`scripts/e2e/qa.mjs` is the systematic sweep (home in 6 sizes x 5 languages x 3 themes, every menu tab and settings card, search, bookmarks, ayah sheet, mic start/stop/pause/resume/rapid/background/leave, onboarding, reduced motion, tablet/landscape, offline reload, page-turn timing, touch targets, accessible names). Android-only behaviour (back button, system bars, permissions, notifications, haptics, share sheet) cannot run in headless Chrome and is listed in the release notes as device-verified-by-owner.

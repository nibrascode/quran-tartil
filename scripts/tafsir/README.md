# Hosted tafsirs (public/tf/<id>/<sura>.json)
- Source: Quran.com API v4 `tafsirs/{id}/by_chapter` — As-Sa'di (91), At-Tafsir al-Muyassar (16, King Fahd Complex), Ibn Kathir (14). Fetched once with `python3 scripts/tafsir/fetch.py`, converted to plain text.
- One file per surah, array index = ayah-1. "" means the source has no separate entry (grouped with the ayah before; the app shows the shared entry with its range). Source placeholders "×", "*", "-" are stored as "".
- Sizes: Sa'di 5.9 MB, Muyassar 2.0 MB, Ibn Kathir 15.4 MB (largest file 2.0 MB, surah 2). Served by GitHub Pages, not bundled in the APK (CI removes dist/tf before cap sync).
- Checked by scripts/tafsir.test.mjs (6236 entries each, clean Arabic text) and scripts/e2e/library.mjs (in-panel download, text equals the file).

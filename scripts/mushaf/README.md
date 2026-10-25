# Madinah 15-line mushaf data (src/data/mushaf15.json)

- Source: quran.com API v4 `verses/by_page` with `word_fields=text_qpc_hafs,char_type_name,v1_page,line_v1` (KFGQPC Madinah Mushaf, 1405H print / QCF v1 layout: 604 pages, 15 lines, 8 on pages 1-2).
- `python3 fetch.py` (writes q/*.json), then `python3 build.py v1` (writes mushaf_v1.json, copied to src/data/mushaf15.json).
- Checks run by build.py: all 6236 ayahs present; every ayah's letter skeleton equals Tanzil Uthmani 1.1 (hamza-carrier spelling normalised; only 17:7 differs in spelling, ليسـٔوا vs ليسوءوا, same reading); every empty line is a surah banner / basmala slot; page starts identical to the Tanzil pagination already used by the app (so saved pages, bookmarks, juz and search need no migration).
- Font: KFGQPC Uthmanic Script HAFS v18 (src/fonts/UthmanicHafs1Ver18.woff2), King Fahd Glorious Quran Printing Complex, free to use, not modified.

## Tajweed
fetch_t.py downloads `text_uthmani_tajweed` (quran.com API v4); tajweed.py aligns the rule tags onto the QPC Hafs words (difflib) and writes markers U+E000<code>…U+E001 into mushaf15.json. 46633 words marked, 0 text mismatches.

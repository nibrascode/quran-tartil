#!/usr/bin/env python3
"""Fetch QuranEnc.com translations (unaltered text + footnotes) into public/tr/<key>/<sura>.json and public/tr/quranenc.json (metadata).
Licence (QuranEnc): text used without changes, credit the publisher and QuranEnc.com, show the version."""
import json, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
KEYS = "english_hilali_khan english_saheeh english_rwwad urdu_junagarhi german_bubenheim spanish_garcia hausa_gummi uyghur_saleh turkish_shahin turkish_rwwad persian_ih tajik_arifi pashto_rwwad dutch_center uzbek_mansour kyrgyz_hakimov kurdish_bamoki hindi_omari tamil_omar somali_yacob japanese_saeedsato french_rashid portuguese_nasr".split()
API = "https://quranenc.com/api/v1/"
ROOT = os.path.join(os.path.dirname(__file__), "../../public/tr")
AYAS = [s["ayas"] for s in json.load(open(os.path.join(os.path.dirname(__file__), "../../src/data/meta.json")))["suras"]] if os.path.exists(os.path.join(os.path.dirname(__file__), "../../src/data/meta.json")) else None
def get(url):
    for i in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "quran-tartil"}), timeout=60) as r: return json.load(r)
        except Exception as e:
            if i == 5: raise
            time.sleep(2 + i * 3)
meta = {x["key"]: x for x in get(API + "translations/list")["translations"]}
def one(job):
    k, s = job
    rs = get(f"{API}translation/sura/{k}/{s}")["result"]
    rs.sort(key=lambda r: int(r["aya"]))
    t = [r["translation"] for r in rs]; f = [r.get("footnotes") or "" for r in rs]
    out = {"t": t}
    if any(f): out["f"] = f
    os.makedirs(f"{ROOT}/{k}", exist_ok=True)
    json.dump(out, open(f"{ROOT}/{k}/{s}.json", "w"), ensure_ascii=False, separators=(",", ":"))
keys = sys.argv[1:] or KEYS
with ThreadPoolExecutor(12) as ex: list(ex.map(one, [(k, s) for k in keys for s in range(1, 115)]))
info = {k: {"title": meta[k]["title"], "version": meta[k]["version"], "last_update": meta[k]["last_update"], "lang": meta[k]["language_iso_code"], "dir": meta[k]["direction"], "description": meta[k]["description"]} for k in KEYS}
json.dump(info, open(f"{ROOT}/quranenc.json", "w"), ensure_ascii=False, indent=1)
print("ok", len(keys))

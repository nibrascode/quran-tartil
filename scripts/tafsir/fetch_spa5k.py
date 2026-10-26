#!/usr/bin/env python3
"""Arabic tafsirs / i'rab from spa5k/tafsir_api (mirror of QUL, qul.tarteel.ai) -> public/tf/<id>/<sura>.json
(array per ayah, plain text with paragraphs; "" = covered by the entry before: missing or repeated text in the source)."""
import json, os, re, sys, time, html, urllib.request, concurrent.futures as cf
SRC = {"mukhtasar": "ar-tafsir-al-mukhtasar", "aysar": "abu-bakr-jabir-al-jazairi", "baghawi": "ar-tafsir-al-baghawi", "samani": "tafsir-al-sam-ani",
       "tabari": "ar-tafsir-al-tabari", "irab_muyassar": "al-i-rab-al-muyassar", "irab_darwish": "i-rab-al-quran-li-al-darwish", "jadwal": "al-jadwal-fi-i-rab-al-quran"}
BASE = "https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/"
meta = json.load(open("src/data/meta.json"))
def get(u):
    for i in range(6):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "quran-tartil"}), timeout=120))
        except Exception as e: err = e; time.sleep(2 * (i + 1))
    raise err
def to_text(h):
    h = re.sub(r"<\s*br\s*/?>", "\n", h, flags=re.I); h = re.sub(r"</(p|div|h\d|li)>", "\n\n", h, flags=re.I); h = re.sub(r"<[^>]+>", "", h)
    h = html.unescape(h).replace("\u00a0", " "); h = re.sub(r"[ \t]+\n", "\n", h); h = re.sub(r"\n{3,}", "\n\n", h)
    return h.strip()
def sura(job):
    tid, slug, s = job
    n = meta["suras"][s - 1]["ayas"]; out = [""] * n
    for x in get(f"{BASE}{slug}/{s}.json"):
        a = int(x["ayah"]); t = to_text(x.get("text") or "")
        if 1 <= a <= n and t not in ("×", "*", "-", "—"): out[a - 1] = t
    for i in range(n - 1, 0, -1):  # the same text repeated for each ayah of a group: keep it once (on the first ayah)
        if out[i] and out[i] == out[i - 1]: out[i] = ""
    os.makedirs(f"public/tf/{tid}", exist_ok=True)
    json.dump(out, open(f"public/tf/{tid}/{s}.json", "w"), ensure_ascii=False, separators=(",", ":"))
ids = sys.argv[1:] or list(SRC)
with cf.ThreadPoolExecutor(10) as ex: list(ex.map(sura, [(t, SRC[t], s) for t in ids for s in range(1, 115)]))
print("done", ids)

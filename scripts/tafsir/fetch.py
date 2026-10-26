# Fetch tafsirs from the quran.com API once and write static per-surah files to public/tf/<id>/<sura>.json
# (array of plain-text entries, index = ayah-1; "" = covered by the previous entry, e.g. Ibn Kathir groups ayahs).
import json, os, re, sys, time, urllib.request, html, concurrent.futures as cf
SRC = {"saadi": 91, "muyassar": 16, "ibnkathir": 14}
meta = json.load(open("src/data/meta.json"))
def get(u):
    for i in range(5):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64)", "Accept": "application/json"}), timeout=60))
        except Exception as e: err = e; time.sleep(2 * (i + 1))
    raise err
def to_text(h):
    h = re.sub(r"<\s*br\s*/?>", "\n", h, flags=re.I); h = re.sub(r"</(p|div|h\d|li)>", "\n\n", h, flags=re.I); h = re.sub(r"<[^>]+>", "", h)
    h = html.unescape(h).replace("\u00a0", " "); h = re.sub(r"[ \t]+\n", "\n", h); h = re.sub(r"\n{3,}", "\n\n", h)
    return h.strip()
def sura(args):
    tid, qc, s = args
    n = meta["suras"][s - 1]["ayas"]; out = [""] * n; p = 1; last = 1
    while p <= last:
        d = get(f"https://api.quran.com/api/v4/tafsirs/{qc}/by_chapter/{s}?per_page=50&page={p}")
        last = d["pagination"]["total_pages"] or 1
        for t in d["tafsirs"]:
            a = int(t["verse_key"].split(":")[1]); out[a - 1] = "" if to_text(t.get("text") or "") in ("×", "*", "-", "—") else to_text(t.get("text") or "")  # "×" = no separate entry in the source
        p += 1
    os.makedirs(f"public/tf/{tid}", exist_ok=True)
    json.dump(out, open(f"public/tf/{tid}/{s}.json", "w"), ensure_ascii=False, separators=(",", ":"))
    return tid, s
ids = sys.argv[1:] or list(SRC)
jobs = [(t, SRC[t], s) for t in ids for s in range(1, 115)]
with cf.ThreadPoolExecutor(6) as ex:
    for i, r in enumerate(ex.map(sura, jobs)): pass
print("done", len(jobs))

import json, urllib.request, concurrent.futures as cf, os
def get(p):
    fn=f"t/{p}.json"
    if os.path.exists(fn): return
    u=f"https://api.quran.com/api/v4/verses/by_page/{p}?words=true&word_fields=text_uthmani_tajweed&fields=text_qpc_hafs&per_page=300&mushaf=1"
    for i in range(4):
        try:
            d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64)","Accept":"application/json"}),timeout=30)); break
        except Exception as e:
            err=e; import time; time.sleep(2*(i+1))
    else: raise err
    out=[]
    for v in d["verses"]:
        out.append({"k":v["verse_key"],"w":[w.get("text_uthmani_tajweed") for w in v["words"]]})
    json.dump(out,open(fn,"w"),ensure_ascii=False)
os.makedirs("t",exist_ok=True)
with cf.ThreadPoolExecutor(4) as ex: list(ex.map(get,range(1,605)))
print(len(os.listdir("t")))

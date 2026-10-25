import json, urllib.request, concurrent.futures as cf, os
def get(p):
    fn=f"q/{p}.json"
    if os.path.exists(fn): return
    u=f"https://api.quran.com/api/v4/verses/by_page/{p}?words=true&word_fields=text_qpc_hafs,char_type_name,v1_page,line_v1,v2_page,line_v2&fields=text_qpc_hafs&per_page=300&mushaf=1"
    for i in range(4):
        try:
            d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0 (X11; Linux x86_64)","Accept":"application/json"}),timeout=30)); break
        except Exception as e:
            err=e; import time; time.sleep(2*(i+1))
    else: raise err
    out=[]
    for v in d["verses"]:
        out.append({"k":v["verse_key"],"w":[[w["text_qpc_hafs"],w["line_v1"],w["char_type_name"],w["v1_page"],w["line_v2"],w["v2_page"]] for w in v["words"]]})
    json.dump(out,open(fn,"w"),ensure_ascii=False)
os.makedirs("q",exist_ok=True)
with cf.ThreadPoolExecutor(4) as ex: list(ex.map(get,range(1,605)))
print(len(os.listdir("q")))

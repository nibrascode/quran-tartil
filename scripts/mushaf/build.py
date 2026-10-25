import json,re,unicodedata,sys
ED=sys.argv[1]
tz={}
for l in open('/workspace/quran-tartil/src/data/quran-uthmani.txt',encoding='utf8'):
    m=re.match(r'^(\d+)\|(\d+)\|(.*)$',l.strip())
    if m: tz[(int(m[1]),int(m[2]))]=m[3]
def sk(t):
    t=t.replace('\u064A\u0654','ئ').replace('\u0648\u0654','ؤ').replace('ي\u0654','ئ').replace('ـٔ','ء')
    t=re.sub('[ٱأإآٲٳ]','ا',t); t=t.replace('ئ','ي').replace('ؤ','و').replace('ى','ي').replace('ی','ي').replace('ۦ','ي').replace('ۥ','و')
    return ''.join(c for c in t if '\u0621'<=c<='\u064A' and c not in 'ءـ')
V={}
for p in range(1,605):
    for v in json.load(open(f'q/{p}.json')):
        if len(v['w'])>len(V.get(v['k'],[])): V[v['k']]=v['w']
order=sorted(V,key=lambda k:tuple(map(int,k.split(':'))))
pages=[{} for _ in range(604)]; qpc={}
if True:
    for k in order:
        s,a=map(int,k.split(':'))
        for w,l1,ty,p1,l2,p2 in V[k]:
            ln,pg=(l1,p1) if ED=='v1' else (l2,p2)
            L=pages[pg-1]
            qpc.setdefault((s,a),[]).append(w if ty=='word' else None)
            seg=L.setdefault(ln,[])
            if seg and seg[-1][0]==s and seg[-1][1]==a: seg[-1][2]+=' '+w
            else: seg.append([s,a,w])
# verify text
bad=[]
for k,t in tz.items():
    q=' '.join(w for w in qpc.get(k,[]) if w)
    tt=t
    if k[1]==1 and k[0] not in (1,9): tt=' '.join(t.split()[4:])
    if sk(q)!=sk(tt): bad.append(k)
print('ayahs',len(tz),len(qpc),'skeleton mismatches',len(bad),bad[:15])
json.dump({'pages':[{str(k):v for k,v in L.items()} for L in pages]},open('raw.json','w'),ensure_ascii=False)
import difflib
for k in []:
    q=sk(' '.join(w for w in qpc[k] if w)); t=tz[k]
    if k[1]==1 and k[0] not in (1,9): t=' '.join(t.split()[4:])
    t=sk(t)
    sm=difflib.SequenceMatcher(None,q,t)
    print(k,[(op,q[i1:i2],t[j1:j2]) for op,i1,i2,j1,j2 in sm.get_opcodes() if op!='equal'])
# ---- final layout with header / basmala rows
out=[]; issues=[]
for i,L in enumerate(pages):
    p=i+1; n=8 if p<=2 else 15
    rows=[None]*n
    for ln,segs in L.items(): rows[ln-1]=segs
    # empty runs
    j=0
    while j<n:
        if rows[j] is not None: j+=1; continue
        k=j
        while k<n and rows[k] is None: k+=1
        run=list(range(j,k))
        # surah that follows the run
        if k<n: s,a=rows[k][0][0],rows[k][0][1]
        else:
            nx=pages[i+1]; first=nx[min(nx)][0]; s,a=first[0],first[1]
        if a!=1: issues.append((p,run,'run not before surah start'))
        needB = s not in (1,9)
        if k==n:  # at page end: header(s) only, basmala goes to next page if no room
            kinds=['h','b'][:len(run)] if needB else ['h']*len(run)
        else:
            if len(run)>=2: kinds=['h','b'] if needB else ['h','h']
            else:
                prevEnd = j==0 and p>1 and out[-1][-1][0] in ('h',)
                kinds=['b'] if (needB and prevEnd) else ['h']
            if len(run)>2: issues.append((p,run,'long run'))
        for r,kd in zip(run,kinds): rows[r]=[kd,s]
        j=k
    out.append(rows)
print('layout issues',issues[:10],len(issues))
json.dump(out,open(f'/workspace/qpc/mushaf_{ED}.json','w'),ensure_ascii=False,separators=(',',':'))
import os; print(os.path.getsize('/workspace/quran-tartil/src/data/mushaf15.json'))
print(out[0][:2]); print(out[1][:3]); print([r[:2] if r[0] in('h','b') else '...' for r in out[603]])

meta=json.load(open('/workspace/quran-tartil/src/data/meta.json'))
st=[]
for i,rows in enumerate(out):
    f=next(r for r in rows if r[0] not in ('h','b')); st.append([f[0][0],f[0][1]])
print(ED,'tanzil start diffs',sum(1 for a,b in zip(st,meta['pages']) if a!=b), 'p397',st[396],'p396',st[395])

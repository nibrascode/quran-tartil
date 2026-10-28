# Restores the small meem signs (U+06E2 iqlab, U+06ED) that the uploaded Mushaf view's page files left out,
# taking them from src/data/quran-uthmani.txt (Tanzil Uthmani). Nothing else is changed.
import json,unicodedata as u,re
MARKS=set('\u0670\u06e2\u06e5\u06e6\u06ed\u0653\u0654\u06df\u06e0\u06e1\u06ea\u06eb\u06ec\u06e8')
def ismark(c): return u.combining(c) or c in MARKS
def clusters(w):
  out=[]
  for ch in w:
    if ch=='\u0640': continue
    if ismark(ch) and out: out[-1][1].add(ch)
    else: out.append([ch,set()])
  return out
B='بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ '
ref={}
for l in open('src/data/quran-uthmani.txt'):
  p=l.rstrip('\n').split('|')
  if len(p)==3:
    s,a=int(p[0]),int(p[1]);t=u.normalize('NFC',p[2])
    ref[(s,a)]=t.split(' ')
fixed=0
def fixword(pw,rw):
  global fixed
  pc,rc=clusters(u.normalize('NFD',pw)),clusters(u.normalize('NFD',rw))
  if [c[0] for c in pc]!=[c[0] for c in rc]: return pw
  # insert missing small meem after the base letter's existing marks
  res=[];i=-1
  for ch in pw:
    res.append(ch)
  out='';ci=-1;pending=None
  chars=list(pw)
  for k,ch in enumerate(chars):
    if ch!='\u0640' and not (ismark(ch) and ci>=0): ci+=1
    out+=ch
    nxt=chars[k+1] if k+1<len(chars) else None
    if ci>=0 and (nxt is None or not ismark(nxt)):
      miss=[m for m in ('\u06e2','\u06ed') if m in rc[ci][1] and m not in pc[ci][1]]
      if miss and (nxt is None or nxt!='\u0640' or True):
        out+=''.join(miss);fixed+=len(miss)
        pc[ci][1].update(miss)
  return out
for n in range(1,605):
  fn=f'src/mushaf/data/pages/p{n}.json';raw=open(fn).read();d=json.loads(raw);s,a=d['s'],d['a'];idx=[]
  changed=False
  for line in d['lines']:
    for j,c in enumerate(line):
      if isinstance(c,str): idx.append((line,j))
      elif 'h' in c: s,a,idx=c['h'],1,[]
      elif 'n' in c:
        r=ref[(s,a)]
        if a==1 and s not in(1,9) and len(r)>=4+len(idx): r=r[len(r)-len(idx):] if len(r)-len(idx)==4 else r
        words=[(L,J,x) for (L,J) in idx for x in [L[J]]]
        # page chunks may carry a pause sign as a separate token after a space
        pw=[x.split(' ')[0] for (_,_,x) in words]
        if len(pw)==len(r):
          for (L,J,x),rw,p0 in zip(words,r,pw):
            nw=fixword(p0,rw)
            if nw!=p0: L[J]=nw+x[len(p0):];changed=True
        a+=1;idx=[]
  if changed: open(fn,'w').write(json.dumps(d,ensure_ascii=False,separators=(',',':')))
print('marks restored',fixed)

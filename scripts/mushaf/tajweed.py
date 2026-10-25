import json,re,difflib
CODES={'ham_wasl':'h','laam_shamsiyah':'l','madda_normal':'m','madda_permissible':'p','madda_necessary':'n','madda_obligatory':'o','qalaqah':'q','ikhafa':'k','ikhafa_shafawi':'K','idgham_ghunnah':'g','idgham_wo_ghunnah':'G','idgham_shafawi':'s','idgham_mutajanisayn':'j','idgham_mutaqaribayn':'r','iqlab':'i','ghunnah':'u','slnt':'x'}
T={}
for p in range(1,605):
    for v in json.load(open(f't/{p}.json')):
        if len(v['w'])>len(T.get(v['k'],[])): T[v['k']]=v['w']
def runs(tj):
    # returns list of (char, cls) from tajweed html (innermost rule wins)
    out=[]; stack=[]
    for tok in re.findall(r'<rule class=([\w-]+)>|</rule>|<[^>]+>|([^<])',tj):
        cls,ch=tok
        if cls: stack.append(cls)
        elif ch: out.append((ch, next((CODES[c] for c in reversed(stack) if c in CODES),None)))
        elif stack and tok==('',''): pass
    return out
def endtags(tj): return tj
def mark(q,tj):
    if not tj or '<rule' not in tj: return q
    # handle </rule> pops
    out=[]; stack=[]
    for m in re.finditer(r'<rule class=([\w-]+)>|(</rule>)|<[^>]+>|([^<])',tj):
        if m.group(1): stack.append(m.group(1))
        elif m.group(2): stack and stack.pop()
        elif m.group(3): out.append((m.group(3), next((CODES[c] for c in reversed(stack) if c in CODES),None)))
    ts=''.join(c for c,_ in out)
    cls=[None]*len(q)
    sm=difflib.SequenceMatcher(None,ts,q,autojunk=False)
    for op,i1,i2,j1,j2 in sm.get_opcodes():
        if op in('equal','replace'):
            for k in range(j2-j1): cls[j1+k]=out[min(i1+k,i2-1)][1] if i2>i1 else None
    # combining marks follow their base letter's class
    for i,c in enumerate(q):
        if i and re.match(r'[\u064B-\u065F\u0670\u06D6-\u06ED]',c) and cls[i] is None: cls[i]=cls[i-1]
    s=''; cur=None
    for c,k in zip(q,cls):
        if k!=cur:
            if cur: s+='\uE001'
            if k: s+='\uE000'+k
            cur=k
        s+=c
    if cur: s+='\uE001'
    return s

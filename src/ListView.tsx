import { useEffect, useRef, useState } from "react";
import { ayahs, indexOf, pageOfAyah, stripBasmala, suras, firstSuraOfPage } from "./quran";
import { RESOURCES, status, surahTexts, type Res } from "./library";
import { readTicks } from "./LibPanel";
import { suraTitle } from "./pageChrome";

/**
 * List view of a surah: one card per ayah with the Arabic text, then the ticked translation(s) and tafsir(s)
 * (the same ticks as the ayah panels; only what is on the device). Long tafsirs scroll inside a fixed-height box.
 */
const LV = {
  az: { mushaf: "Mushaf görünüşü", prev: "Əvvəlki surə", next: "Növbəti surə", none: "Tərcümə və ya təfsir göstərmək üçün ayəyə toxunun, “Tərcümə” / “Təfsir” panelində birini endirib seçin.", see: "Bax:" },
  en: { mushaf: "Mushaf view", prev: "Previous surah", next: "Next surah", none: "To show a translation or tafsir here, tap an ayah and download and tick one in the Translation / Tafsir panel.", see: "See" },
  ar: { mushaf: "عرض المصحف", prev: "السورة السابقة", next: "السورة التالية", none: "لعرض ترجمة أو تفسير هنا، المس آية ثم نزّل واحدًا وحدّده في لوحة الترجمة / التفسير.", see: "انظر" },
};
type Txt = { r: Res; t: string[]; f: string[] };
export const firstAyahOfPage = (p: number) => { const s = firstSuraOfPage(p).i; let a = 1; while (a < suras[s - 1].ayas && pageOfAyah(s, a) < p) a++; return { s, a }; };

export function ListView({ page, lang, onClose }: { page: number; lang: string; onClose: (page: number) => void }) {
  const u = LV[(lang as "az") in LV ? (lang as "az") : "en"];
  const start = firstAyahOfPage(page);
  const [s, setS] = useState(start.s);
  const [txt, setTxt] = useState<Txt[] | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const top = useRef({ s: start.s, a: start.a });
  const jump = useRef<number | null>(start.a);
  useEffect(() => {
    let live = true; setTxt(null);
    (async () => {
      const out: Txt[] = [];
      for (const kind of ["tr", "tf"] as const) {
        const list = RESOURCES.filter((r) => r.kind === kind);
        const ns = await Promise.all(list.map((r) => status(r.id)));
        const have = list.filter((_, i) => ns[i] >= 114);
        const ticks = readTicks(kind) ?? (have[0] ? [have[0].id] : []);
        for (const r of have.filter((r) => ticks.includes(r.id))) { const d = await surahTexts(r.id, s); if (d) out.push({ r, ...d }); }
      }
      if (live) setTxt(out);
    })();
    return () => { live = false; };
  }, [s]);
  // open at the first ayah of the page that was on screen
  useEffect(() => {
    if (!txt || jump.current == null) return;
    const el = box.current?.querySelector(`[data-a="${jump.current}"]`) as HTMLElement | null;
    if (el && box.current) box.current.scrollTop = el.offsetTop - 8;
    jump.current = null;
  }, [txt]);
  const onScroll = () => {
    const b = box.current; if (!b) return;
    for (const c of b.querySelectorAll<HTMLElement>(".lv-card")) if (c.offsetTop + c.offsetHeight > b.scrollTop + 10) { top.current = { s, a: Number(c.dataset.a) }; break; }
  };
  const go = (ns: number) => { setS(ns); jump.current = 1; top.current = { s: ns, a: 1 }; if (box.current) box.current.scrollTop = 0; };
  const n = suras[s - 1].ayas;
  const multi = (txt?.length || 0) > 1;
  return (
    <div className="lv" dir={lang === "ar" ? "rtl" : "ltr"} role="region" aria-label={suraTitle(s, lang)}>
      <div className="lv-head">
        <button type="button" className="ib lv-sprev" aria-label={u.prev} disabled={s <= 1} onClick={() => go(s - 1)}>{lang === "ar" ? "›" : "‹"}</button>
        <b dir="auto">{suraTitle(s, lang)}</b>
        <button type="button" className="ib lv-snext" aria-label={u.next} disabled={s >= 114} onClick={() => go(s + 1)}>{lang === "ar" ? "‹" : "›"}</button>
        <button type="button" className="ib lv-toggle on" aria-label={u.mushaf} title={u.mushaf} aria-pressed="true" onClick={() => onClose(pageOfAyah(top.current.s, top.current.a))}><ListIcon /></button>
      </div>
      <div className="lv-body" ref={box} onScroll={onScroll}>
        {txt && !txt.length && <p className="lv-none">{u.none}</p>}
        {Array.from({ length: n }, (_, i) => i + 1).map((a) => {
          const x = ayahs[indexOf(s, a)];
          const ar = a === 1 && s !== 1 && s !== 9 ? stripBasmala(x.t) : x.t;
          return (
            <div className="lv-card" key={s + ":" + a} data-a={a}>
              <span className="lv-ref" dir="ltr">{s}:{a}</span>
              <p className="lv-ar" dir="rtl" lang="ar">{ar}</p>
              {txt?.map(({ r, t, f }) => {
                const e = t[a - 1];
                if (!e) { // covered by the entry before (shared tafsir range): point to it, do not repeat it
                  if (r.kind !== "tf") return null;
                  let from = a; while (from > 1 && !t[from - 1]) from--;
                  return t[from - 1] ? <small key={r.id} className="lv-see" data-id={r.id} dir="auto">{multi ? r.name + " · " : ""}{u.see} {s}:{from}</small> : null;
                }
                return (
                  <div key={r.id} className={"lv-x " + r.kind} data-id={r.id} dir={r.dir || "ltr"} lang={r.lang}>
                    {multi && <b className="lv-name" dir="auto">{r.kind === "tr" ? r.lname + " · " + r.name : r.name}</b>}
                    {r.kind === "tf" ? <div className="lv-tf" tabIndex={0}>{e}</div> : <p>{e}</p>}
                    {f[a - 1] && <div className="lib-fn">{f[a - 1]}</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
export const ListIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="4" cy="6" r="1.4" fill="currentColor" /><circle cx="4" cy="12" r="1.4" fill="currentColor" /><circle cx="4" cy="18" r="1.4" fill="currentColor" /></svg>;

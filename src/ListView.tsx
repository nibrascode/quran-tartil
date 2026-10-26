import { useEffect, useRef, useState } from "react";
import { pageItems, firstSuraOfPage, toArabicDigits, PAGES, type Item } from "./quran";
import { RESOURCES, status, surahTexts, type Res } from "./library";
import { readTicks } from "./LibPanel";
import { suraTitle } from "./pageChrome";

/**
 * List view of a surah: one card per ayah with the Arabic text, then the ticked translation(s) and tafsir(s)
 * (the same ticks as the ayah panels; only what is on the device). Long tafsirs scroll inside a fixed-height box.
 */
const LV = {
  az: { mushaf: "Mushaf görünüşü", prev: "Əvvəlki səhifə", next: "Növbəti səhifə", page: "Səhifə", none: "Tərcümə və ya təfsir göstərmək üçün ayəyə toxunun, “Tərcümə” / “Təfsir” panelində birini endirib seçin.", see: "Bax:" },
  en: { mushaf: "Mushaf view", prev: "Previous page", next: "Next page", page: "Page", none: "To show a translation or tafsir here, tap an ayah and download and tick one in the Translation / Tafsir panel.", see: "See" },
  ar: { mushaf: "عرض المصحف", prev: "الصفحة السابقة", next: "الصفحة التالية", page: "صفحة", none: "لعرض ترجمة أو تفسير هنا، المس آية ثم نزّل واحدًا وحدّده في لوحة الترجمة / التفسير.", see: "انظر" },
};
type Txt = { r: Res; t: string[]; f: string[] };

export function ListView({ page: page0, lang, onClose }: { page: number; lang: string; onClose: (page: number) => void }) {
  const u = LV[(lang as "az") in LV ? (lang as "az") : "en"];
  const [page, setPage] = useState(page0);
  const items = pageItems(page).filter((x): x is Extract<Item, { k: "ayah" }> => x.k === "ayah");
  const [txt, setTxt] = useState<Record<number, Txt[]> | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const suraKey = [...new Set(items.map((x) => x.s))].join(",");
  useEffect(() => {
    let live = true;
    (async () => {
      const out: Record<number, Txt[]> = {};
      const pick: Res[] = [];
      for (const kind of ["tr", "tf"] as const) {
        const list = RESOURCES.filter((r) => r.kind === kind);
        const ns = await Promise.all(list.map((r) => status(r.id)));
        const have = list.filter((_, i) => ns[i] >= 114);
        const ticks = readTicks(kind) ?? (have[0] ? [have[0].id] : []);
        pick.push(...have.filter((r) => ticks.includes(r.id)));
      }
      for (const s of suraKey.split(",").map(Number)) { out[s] = []; for (const r of pick) { const d = await surahTexts(r.id, s); if (d) out[s].push({ r, ...d }); } }
      if (live) setTxt(out);
    })();
    return () => { live = false; };
  }, [suraKey]);
  const goPage = (p: number) => { if (p < 1 || p > PAGES) return; setPage(p); if (box.current) box.current.scrollTop = 0; };
  // horizontal swipe turns pages like the Mushaf (finger to the right = next page); vertical scrolling is left alone
  const t0 = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTs = (e: React.TouchEvent) => { const p = e.touches[0]; t0.current = e.touches.length === 1 ? { x: p.clientX, y: p.clientY, t: Date.now() } : null; };
  const onTe = (e: React.TouchEvent) => {
    const s0 = t0.current; t0.current = null; if (!s0) return;
    const p = e.changedTouches[0]; const dx = p.clientX - s0.x, dy = p.clientY - s0.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy) && Date.now() - s0.t < 900) goPage(page + (dx > 0 ? 1 : -1));
  };
  const multi = Object.values(txt || {}).some((l) => l.length > 1);
  const none = txt && Object.values(txt).every((l) => !l.length);
  const s1 = items[0]?.s || firstSuraOfPage(page).i;
  const pn = lang === "ar" ? toArabicDigits(page) : String(page);
  const arrow = (d: "l" | "r") => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d={d === "l" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return (
    <div className="lv" dir={lang === "ar" ? "rtl" : "ltr"} role="region" aria-label={suraTitle(s1, lang) + " · " + pn} data-page={page}>
      <div className="lv-head" dir="ltr">
        {/* Mushaf order: the next page is to the left */}
        <button type="button" className="ib lv-pnext" aria-label={u.next} disabled={page >= PAGES} onClick={() => goPage(page + 1)}>{arrow("l")}</button>
        <span className="lv-title"><b dir="auto">{suraTitle(s1, lang)}</b><small className="lv-pno" dir="auto">{u.page} {pn}</small></span>
        <button type="button" className="ib lv-pprev" aria-label={u.prev} disabled={page <= 1} onClick={() => goPage(page - 1)}>{arrow("r")}</button>
        <button type="button" className="ib lv-toggle on" aria-label={u.mushaf} title={u.mushaf} aria-pressed="true" onClick={() => onClose(page)}><ListIcon /></button>
      </div>
      <div className="lv-body" ref={box} onTouchStart={onTs} onTouchEnd={onTe}>
        {none && <p className="lv-none">{u.none}</p>}
        {items.map(({ s, a, text }) => (
          <div className="lv-card" key={s + ":" + a} data-s={s} data-a={a}>
            <span className="lv-ref" dir="ltr">{s}:{a}</span>
            <p className="lv-ar" dir="rtl" lang="ar">{text}</p>
            {txt?.[s]?.map(({ r, t, f }) => {
              const e = t[a - 1];
              if (!e) {
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
        ))}
      </div>
    </div>
  );
}
export const ListIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="4" cy="6" r="1.4" fill="currentColor" /><circle cx="4" cy="12" r="1.4" fill="currentColor" /><circle cx="4" cy="18" r="1.4" fill="currentColor" /></svg>;

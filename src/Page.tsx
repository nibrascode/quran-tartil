import { useEffect, useLayoutEffect, useRef, useState, memo, useContext } from "react";
import { PageChrome, suraTitle } from "./pageChrome";
import { toArabicDigits, firstSuraOfPage, juzOfPage, suras } from "./quran";

/**
 * Madinah Mushaf (KFGQPC, 1405H / QCF v1 layout): 15 lines per page (8 on pages 1-2), line breaks and page breaks as printed.
 * Words: KFGQPC Uthmanic Hafs text (text_qpc_hafs) with per-word line numbers from quran.com (line_v1 / v1_page), see scripts/mushaf-data.md.
 * Rows: ["h", sura] surah banner, ["b", sura] basmala, or [[sura, ayah, "word word ... ٧"], ...] segments of a text line.
 */
type Seg = [number, number, string];
type Row = ["h" | "b", number] | Seg[];
let DATA: Row[][] | null = null;
let loading: Promise<Row[][]> | null = null;
if (typeof document !== "undefined") { document.fonts?.load(`20px "UthmanicHafs"`).catch(() => {}); }
export function loadMushaf(): Promise<Row[][]> {
  if (DATA) return Promise.resolve(DATA);
  return (loading ||= import("./data/mushaf15.json").then((m) => (DATA = (m.default as unknown) as Row[][])));
}
const isEnd = (w: string) => /^[\u0660-\u0669]+$/.test(w);
const BASMALA = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ";
/** a surah banner row is taller than a text row, like the printed frame (reference design) */
const HEAD_W = 1.75;
const isHead = (r: Row): r is ["h" | "b", number] => typeof r[0] === "string";

/** words carry optional tajweed runs: \uE000 + rule code ... \uE001 (the text between the markers is the exact KFGQPC text) */
const plain = (w: string) => w.replace(/\uE000.|\uE001/g, "");
function TjWord({ w }: { w: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\uE000(.)([^\uE001]*)\uE001|([^\uE000]+)/g;
  let m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(w))) parts.push(m[1] ? <span key={k++} className={"tj tj-" + (m[1] === m[1].toUpperCase() && m[1] !== m[1].toLowerCase() ? m[1].toLowerCase() + "2" : m[1])}>{m[2]}</span> : m[3]);
  return <>{parts}</>;
}
const Line = ({ r, tj }: { r: Seg[]; tj?: boolean }) => (
  <>{r.flatMap(([s, a, t], k) => t.split(" ").map((w, i) => isEnd(w)
    ? <span key={k + "-" + i} className="end ayah" data-s={s} data-a={a} aria-label={"آية " + a}>{w}</span>
    : <span key={k + "-" + i} className="w ayah" data-s={s} data-a={a}>{tj && w.includes("\uE000") ? <TjWord w={w} /> : plain(w)}</span>))}</>
);

export const Page = memo(function Page({ page, scale = 1 }: { page: number; scale?: number }) {
  const [rows, setRows] = useState<Row[] | null>(DATA ? DATA[page - 1] : null);
  useEffect(() => { if (!DATA) loadMushaf().then((d) => setRows(d[page - 1])); else setRows(DATA[page - 1]); }, [page]);
  const box = useRef<HTMLDivElement>(null);
  const meas = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ page: number; f: number; short: boolean[]; tallH: number } | null>(null);
  const sura = firstSuraOfPage(page);
  const n = page <= 2 ? 8 : 15;

  useLayoutEffect(() => {
    const b = box.current, m = meas.current;
    if (!b || !m || !rows) return;
    const run = () => {
      // never fit with a fallback font: widths would be wrong and the text would visibly reflow once the real font arrives
      if (document.fonts && !document.fonts.check('20px "UthmanicHafs"')) return;
      const ws = Array.from(m.children).map((c) => (c as HTMLElement).getBoundingClientRect().width / 100);
      const max = Math.max(...ws.filter((w) => w > 0), 1);
      const W = b.clientWidth - 2, H = b.clientHeight;
      const units = rows.reduce((u, r) => u + (isHead(r) && r[0] === "h" ? HEAD_W : 1), 0) + Math.max(0, n - rows.length);
      const byW = (W * (page <= 2 ? 0.66 : 0.985)) / max;
      // landscape (phone turned sideways): size the text by the width and let the page scroll vertically
      const land = W > H * 1.15;
      const lh = page <= 2 ? 2.2 : 1.72;
      const f = Math.max(10, land ? byW : Math.min(byW, H / units / lh));
      const tallH = land ? Math.max(H, units * f * lh) : 0;
      // the printed mushaf justifies every line; only the opening pages and a surah's short closing line are centred
      const short = ws.map((w) => page <= 2 || (w > 0 && w * f < W * 0.62));
      setFit({ page, f, short, tallH });
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(b);
    document.fonts?.ready.then(run);
    return () => ro.disconnect();
  }, [page, rows, n]);

  const ch = useContext(PageChrome);
  const stop = (e: React.PointerEvent) => e.stopPropagation();
  const f = fit && fit.page === page ? fit.f * Math.min(1, scale) : 0;
  return (
    <div className="page" lang="ar" dir="rtl" data-page={page}>
      <div className="frame">
        <div className="page-head" dir="ltr">
          <button type="button" className="ph-back" aria-label={ch.backLabel || "Back"} onPointerDown={stop} onPointerUp={stop} onClick={() => ch.onBack?.()}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          <span className="ph-title" dir="auto">{suraTitle(sura.i, ch.lang)}</span>
          <span className="ph-juz" dir="auto">{ch.juzLabel} {ch.lang === "ar" ? toArabicDigits(juzOfPage(page)) : juzOfPage(page)}</span>
          <button type="button" className="ph-set" aria-label={ch.settingsLabel || "Settings"} onPointerDown={stop} onPointerUp={stop} onClick={() => ch.onSettings?.()}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2.5l2.2 2.6 3.4-.4.4 3.4 2.6 2.2-2.6 2.2-.4 3.4-3.4-.4L12 21.5l-2.2-2.6-3.4.4-.4-3.4L3.4 13.7 6 11.5l.4-3.4 3.4.4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></button>
        </div>
        <i className="side-orn r" aria-hidden="true" /><i className="side-orn l" aria-hidden="true" />
        <div className={"page-body" + (fit && fit.page === page && fit.tallH > 0 ? " tall" : "")} ref={box}>
          <div className={"mtext flow mushaf" + (page <= 2 ? " fixed" : "")} style={{ fontSize: f || 16, height: fit && fit.page === page && fit.tallH ? fit.tallH : undefined, visibility: f ? undefined : "hidden", gridTemplateRows: rows ? rows.map((r) => (isHead(r) && r[0] === "h" ? HEAD_W + "fr" : "1fr")).join(" ") : `repeat(${n}, 1fr)`, ["--rowh" as string]: (box.current ? box.current.clientHeight / n : 40) + "px" }}>
            {rows?.map((r, i) => isHead(r)
              ? r[0] === "h"
                ? <div className="sura-head orn" key={i}><span className="cart"><span>سُورَةُ {suras[r[1] - 1].name}</span></span><i className="sh-div" aria-hidden="true" /></div>
                : <div className="bism" key={i}><span>{BASMALA}</span></div>
              : <div className={"ln" + (fit?.short[i] ? " c" : "")} key={i}><Line r={r} tj={ch.tajweed} /></div>)}
          </div>
          <div className="meas mushaf" ref={meas} aria-hidden="true">{rows?.map((r, i) => <div key={i}>{isHead(r) ? null : <Line r={r} />}</div>)}</div>
        </div>
        <div className="page-foot" aria-label={"Page " + page}><span className="pf-l" aria-hidden="true" /><span className="page-no">{ch.lang === "ar" ? toArabicDigits(page) : page}</span><span className="pf-r" aria-hidden="true" /></div>
      </div>
    </div>
  );
});

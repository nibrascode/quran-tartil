import { createContext, useEffect, useLayoutEffect, useRef, useState, memo, useContext, useId } from "react";
import { PageChrome, suraTitle } from "./pageChrome";
import { Illumination, useOpeningGeom } from "./Opening";
import { ListIcon } from "./ListView";
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
/** an ayah-end medallion is kept close to the words on both sides (as printed): previous word + marker + next word form one
 *  justification unit, so the line's free space goes between ordinary words, never around the markers */
const Line = ({ r, tj }: { r: Seg[]; tj?: boolean }) => {
  const toks = r.flatMap(([s, a, t], k) => t.split(" ").map((w, i) => isEnd(w)
    ? { end: true, el: <span key={k + "-" + i} className="end ayah" data-s={s} data-a={a} aria-label={"آية " + a}>{w}</span> }
    : { end: false, el: <span key={k + "-" + i} className="w ayah" data-s={s} data-a={a}>{tj && w.includes("\uE000") ? <TjWord w={w} /> : plain(w)}</span> }));
  const out: React.ReactNode[] = [];
  for (let i = 0; i < toks.length; ) {
    let j = i + 1; while (j < toks.length && (toks[j - 1].end || toks[j].end)) j++;
    out.push(j - i > 1 ? <span className="wk" key={"g" + i}>{toks.slice(i, j).map((t) => t.el)}</span> : toks[i].el); i = j;
  }
  return <>{out}</>;
};

/** two-page spread: both pages report their fitted size and render the smaller one, so the spread has one font size */
export const SpreadFit = createContext<{ set: (page: number, f: number) => void; f: number } | null>(null);
export const Page = memo(function Page({ page, scale = 1 }: { page: number; scale?: number }) {
  const [rows, setRows] = useState<Row[] | null>(DATA ? DATA[page - 1] : null);
  useEffect(() => { if (!DATA) loadMushaf().then((d) => setRows(d[page - 1])); else setRows(DATA[page - 1]); }, [page]);
  const box = useRef<HTMLDivElement>(null);
  const share = useContext(SpreadFit); const shareRef = useRef(share); shareRef.current = share;
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
      const ws = Array.from(m.children).map((c) => (c as HTMLElement).offsetWidth / 100);
      const max = Math.max(...ws.filter((w) => w > 0), 1);
      const cs = getComputedStyle(b); const W = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2, H = b.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const units = rows.reduce((u, r) => u + (isHead(r) && r[0] === "h" ? HEAD_W : 1), 0) + Math.max(0, n - rows.length);
      const byW = (W * (page <= 2 ? 0.66 : 0.985)) / max;
      // landscape (phone turned sideways): size the text by the width and let the page scroll vertically
      const land = W > H * 1.15;
      const lh = page <= 2 ? 2.2 : 1.64;
      const f = Math.max(10, land ? byW : Math.min(byW, H / units / lh));
      const tallH = land ? Math.max(H, units * f * lh) : 0;
      // the printed mushaf justifies every line; only the opening pages and a surah's short closing line are centred
      const endsSura = (r: Row) => { if (isHead(r) || !r.length) return false; const [ss, aa, t] = r[r.length - 1]; return aa === suras[ss - 1].ayas && isEnd(t.trim().split(/\s+/).pop() || ""); };
      const short = ws.map((w, i) => page <= 2 || (endsSura(rows[i]) && w > 0 && w * f < W * 0.62));
      setFit({ page, f, short, tallH });
      shareRef.current?.set(page, f);
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(b);
    document.fonts?.ready.then(run);
    return () => ro.disconnect();
  }, [page, rows, n]);

  const ch = useContext(PageChrome);
  const og = useOpeningGeom(page);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [ows, setOws] = useState<{ page: number; ws: number[] } | null>(null);
  useLayoutEffect(() => {
    if (page > 2 || !rows) return;
    const m = meas.current; if (!m) return;
    const run = () => { if (document.fonts && !document.fonts.check('20px "UthmanicHafs"')) return; setOws({ page, ws: Array.from(m.children).map((c) => (c as HTMLElement).offsetWidth / 100) }); };
    run(); document.fonts?.ready.then(run);
  }, [page, rows]);
  let openOwn = 0;
  let open: { f: number; lines: { y: number; w: number; c: boolean }[] } | null = null;
  if (page <= 2 && rows && ows && ows.page === page && og.w) {
    const idx = rows.map((r, i) => (isHead(r) && r[0] === "h" ? -1 : i)).filter((i) => i >= 0);
    const k = idx.length, { cx, cy, rx, ry } = og.med; void cx;
    const P = 2.0; // line pitch in em
    const lay = (f: number) => idx.map((ri, j) => { const y = cy + (j - (k - 1) / 2) * f * P; const q = (y - cy) / (ry * 1.04); const a = 2 * rx * Math.sqrt(Math.max(0, 1 - q * q)) * 0.93; return { y, a, nat: ows.ws[ri] * f }; });
    let f = Math.min(og.h, og.w) / 6;
    while (f > 8 && (lay(f).some((l) => l.nat > l.a) || k * f * P > ry * 1.8)) f *= 0.98;
    openOwn = f;
    // two-page spread 1|2: both opening pages use the smaller size
    if (share && share.f > 0) f = Math.min(f, share.f);
    open = { f, lines: lay(f).map((l, j) => ({ y: l.y, w: j === k - 1 ? l.nat : l.a, c: j === k - 1 })) };
  }
  useEffect(() => { if (page <= 2 && openOwn) shareRef.current?.set(page, openOwn); }, [page, openOwn]);
  const stop = (e: React.PointerEvent) => e.stopPropagation();
  const f = fit && fit.page === page && !(share && page > 2 && !share.f) ? Math.min(fit.f, share && share.f > 0 ? share.f : Infinity) * Math.min(1, scale) : 0;
  return (
    <div className="page" lang="ar" dir="rtl" data-page={page}>
      <div className="frame">
        <div className="page-head" dir="ltr">
          <button type="button" className="ph-back" aria-label={ch.backLabel || "Back"} onPointerDown={stop} onPointerUp={stop} onClick={() => ch.onBack?.()}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          <span className="ph-title" dir="auto">{suraTitle(sura.i, ch.lang)}</span>
          <span className="ph-juz" dir="auto">{ch.juzLabel} {ch.lang === "ar" ? toArabicDigits(juzOfPage(page)) : juzOfPage(page)}</span>
          {ch.onHifz && <button type="button" className={"ph-hifz" + (ch.hifzOn ? " on" : "")} aria-pressed={!!ch.hifzOn} aria-label={ch.hifzLabel} title={ch.hifzLabel} onPointerDown={stop} onPointerUp={stop} onClick={() => ch.onHifz?.()}><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />{ch.hifzOn && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}</svg></button>}
          {ch.onNight && <button type="button" className={"ph-night" + (ch.nightOn ? " on" : "")} aria-pressed={!!ch.nightOn} aria-label={ch.nightLabel} title={ch.nightLabel} onPointerDown={stop} onPointerUp={stop} onClick={() => ch.onNight?.()}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill={ch.nightOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg></button>}
          {ch.onList && <button type="button" className="ph-list" aria-label={ch.listLabel || "List view"} title={ch.listLabel} onPointerDown={stop} onPointerUp={stop} onClick={() => ch.onList?.()}><ListIcon /></button>}
          <button type="button" className="ph-set" aria-label={ch.settingsLabel || "Settings"} onPointerDown={stop} onPointerUp={stop} onClick={() => ch.onSettings?.()}><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2.5l2.2 2.6 3.4-.4.4 3.4 2.6 2.2-2.6 2.2-.4 3.4-3.4-.4L12 21.5l-2.2-2.6-3.4.4-.4-3.4L3.4 13.7 6 11.5l.4-3.4 3.4.4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></button>
        </div>
        <i className="side-orn r" aria-hidden="true" /><i className="side-orn l" aria-hidden="true" />
        {page <= 2 ? <div className="page-body opn" ref={(el) => { (box as React.MutableRefObject<HTMLDivElement | null>).current = el; (og.ref as React.MutableRefObject<HTMLDivElement | null>).current = el; }}>
          <Illumination w={og.w} h={og.h} med={og.med} id={uid} />
          <div className="mtext mushaf opn-t" style={{ fontSize: open ? open.f : 16, visibility: open && !(share && !share.f) ? undefined : "hidden" }}>
            {(() => { let j = 0; return rows?.map((r, i) => {
              if (isHead(r) && r[0] === "h") return <div className="sura-head opn-cart" key={i} style={{ top: og.cartY, height: og.cartH, fontSize: og.cartH * 0.5 }}><span>سُورَةُ {suras[r[1] - 1].name}</span></div>;
              const L = open?.lines[j++]; const st = L ? { top: L.y - (open!.f * 1.0), width: L.w, height: open!.f * 2 } : undefined;
              return isHead(r) ? <div className="bism opn-l c" key={i} style={st}><span>{BASMALA}</span></div>
                : <div className={"ln opn-l" + (L?.c ? " c" : "")} key={i} style={st}><Line r={r} tj={ch.tajweed} /></div>; }); })()}
          </div>
          <div className="meas mushaf" ref={meas} aria-hidden="true">{rows?.map((r, i) => <div key={i}>{isHead(r) ? (r[0] === "b" ? <span>{BASMALA}</span> : null) : <Line r={r} />}</div>)}</div>
        </div> :
        <div className={"page-body" + (fit && fit.page === page && fit.tallH > 0 ? " tall" : "")} ref={box}>
          <div className={"mtext flow mushaf" + (page <= 2 ? " fixed" : "")} style={{ fontSize: f || 16, height: fit && fit.page === page && fit.tallH ? fit.tallH : undefined, visibility: f ? undefined : "hidden", gridTemplateRows: rows ? rows.map((r) => (isHead(r) && r[0] === "h" ? HEAD_W + "fr" : "1fr")).join(" ") : `repeat(${n}, 1fr)`, ["--rowh" as string]: (box.current ? box.current.clientHeight / n : 40) + "px" }}>
            {rows?.map((r, i) => isHead(r)
              ? r[0] === "h"
                ? <div className="sura-head orn" key={i}><span className="cart"><span>سُورَةُ {suras[r[1] - 1].name}</span></span><i className="sh-div" aria-hidden="true" /></div>
                : <div className="bism" key={i}><span>{BASMALA}</span></div>
              : <div className={"ln" + (fit?.short[i] ? " c" : "")} key={i}><Line r={r} tj={ch.tajweed} /></div>)}
          </div>
          <div className="meas mushaf" ref={meas} aria-hidden="true">{rows?.map((r, i) => <div key={i}>{isHead(r) ? null : <Line r={r} />}</div>)}</div>
        </div>}
        <div className="page-foot" aria-label={"Page " + page}><span className="pf-l" aria-hidden="true" /><span className="page-no">{ch.lang === "ar" ? toArabicDigits(page) : page}</span><span className="pf-r" aria-hidden="true" /></div>
      </div>
    </div>
  );
});

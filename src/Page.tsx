import { useLayoutEffect, useRef, useState, memo, useContext } from "react";
import { PageChrome, suraTitle } from "./pageChrome";
import { plan, planFixed, GAP_MIN, GAP_NAT, ROWS, type Seg, type Plan } from "./layout";

/** printed line structure of pages 1 and 2: [ayah, from word, to word) pieces per line */
const FIXED: Record<number, [string, number, number][][]> = {
  1: [[["1:1", 0, 4]], [["1:2", 0, 4]], [["1:3", 0, 2], ["1:4", 0, 3]], [["1:5", 0, 4], ["1:6", 0, 1]], [["1:6", 1, 3], ["1:7", 0, 3]], [["1:7", 3, 7]], [["1:7", 7, 9]]],
  2: [[["2:1", 0, 1], ["2:2", 0, 6]], [["2:2", 6, 7], ["2:3", 0, 5]], [["2:3", 5, 8], ["2:4", 0, 4]], [["2:4", 4, 12]], [["2:5", 0, 6]], [["2:5", 6, 8]]],
};
import { normalizeAr } from "./tartil";
import { pageItems, toArabicDigits, BISMILLAH, firstSuraOfPage, juzOfPage, suras, type Item } from "./quran";

const words = (t: string) => t.split(" ").filter(Boolean);
/** each word is its own span (so live recitation can reveal/mark words); stop-mark tokens stay visible */
const W = ({ w, s, a }: { w: string; s: number; a: number }) => <span className={"w ayah" + (normalizeAr(w) ? "" : " mark")} data-s={s} data-a={a}>{w}{" "}</span>;

type Group = { s: number; a: number; toks: { w: string; i: number }[]; end?: number };
type PageData = { segs: { kind: Seg["kind"]; sura?: (typeof suras)[number]; groups: Group[]; endsSura: boolean }[] };

/** words (+ their stop marks) become unbreakable groups; the ayah-end sign sticks to the last group */
function build(items: Item[]): PageData {
  const segs: PageData["segs"] = [];
  let cur: PageData["segs"][number] | null = null;
  for (const it of items) {
    if (it.k === "head") { segs.push({ kind: "head", sura: it.sura, groups: [], endsSura: false }); cur = null; continue; }
    if (it.k === "bism") { segs.push({ kind: "bism", groups: [], endsSura: false }); cur = null; continue; }
    if (!cur) { cur = { kind: "text", groups: [], endsSura: false }; segs.push(cur); }
    const toks = words(it.text);
    let g: Group | null = null;
    toks.forEach((w, i) => {
      if (!normalizeAr(w) && g) g.toks.push({ w, i });
      else { g = { s: it.s, a: it.a, toks: [{ w, i }] }; cur!.groups.push(g); }
    });
    if (g) (g as Group).end = it.a;
    cur.endsSura = it.a === suras[it.s - 1].ayas;
  }
  // a segment only "ends a sura" if its last ayah does (a following head always means so)
  segs.forEach((sg, i) => { if (sg.kind === "text" && segs[i + 1]?.kind === "head") sg.endsSura = true; });
  return { segs };
}

const GroupView = ({ g }: { g: Group }) => (
  <span className="g">
    {g.toks.map((t) => <span key={t.i} className={"w ayah" + (normalizeAr(t.w) ? "" : " mark")} data-s={g.s} data-a={g.a}>{t.w}{" "}</span>)}
    {g.end !== undefined && <span className="end ayah" data-s={g.s} data-a={g.a} aria-label={"آية " + g.end}><span className="en">{toArabicDigits(g.end)}</span></span>}
  </span>
);

/**
 * One mushaf page. Pages 1-2: centred lines, ornate surah frame, spread evenly over the full height.
 * Other pages: 15 rows, every line word-justified to the full width (see layout.ts); surah heads and basmala take a row each.
 */
export const Page = memo(function Page({ page, scale = 1 }: { page: number; scale?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const meas = useRef<HTMLDivElement>(null);
  const widths = useRef<number[][] | null>(null);
  const [pls, setPl] = useState<{ page: number; plan: Plan; H: number } | null>(null);
  const pl = pls && pls.page === page ? pls.plan : null;
  const items = pageItems(page);
  const sura = firstSuraOfPage(page);
  const fixed = FIXED[page];
  const data = build(items);

  /** flattened group ranges of the printed lines (pages 1-2), or null if the data does not match */
  const ranges = (): [number, number][] | null => {
    if (!fixed) return null;
    const ts = data.segs.findIndex((x) => x.kind === "text");
    const gs = data.segs[ts].groups;
    const off = new Map<string, number>(), cnt = new Map<string, number>();
    gs.forEach((g, i) => { const k = g.s + ":" + g.a; if (!off.has(k)) off.set(k, i); cnt.set(k, (cnt.get(k) || 0) + 1); });
    const out: [number, number][] = [];
    let next = 0;
    for (const line of fixed) {
      const first = off.get(line[0][0]), last = line[line.length - 1];
      if (first === undefined) return null;
      const a = first + line[0][1], b = off.get(last[0])! + last[2];
      if (a !== next || b <= a || line.some(([k, f, t]) => t > cnt.get(k)! || f > t)) return null;
      out.push([a, b]); next = b;
    }
    return next === gs.length ? out : null;
  };

  useLayoutEffect(() => {
    const b = box.current;
    if (!b) return;
    const m = meas.current!;
    widths.current = null;
    const measure = () => {
      const gs = Array.from(m.querySelectorAll<HTMLElement>(".g"));
      let k = 0;
      widths.current = data.segs.map((sg) => sg.groups.map(() => gs[k++].getBoundingClientRect().width / 100));
    };
    const run = () => {
      if (!widths.current) measure();
      const segs: Seg[] = data.segs.map((sg, i) => ({ kind: sg.kind, w: widths.current![i], endsSura: sg.endsSura }));
      const r = ranges();
      // short screens (landscape phones): keep rows readable and let the page scroll instead of squeezing 15 rows into a strip
      const rowsN = r ? r.length + segs.length - 1 : ROWS;
      const H = Math.max(b.clientHeight, rowsN * (r ? 56 : 40));
      setPl({ page, plan: r ? planFixed(segs, segs.findIndex((x) => x.kind === "text"), r, b.clientWidth - 2, H) : plan(segs, b.clientWidth - 2, H), H });
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(b);
    document.fonts?.ready.then(() => { widths.current = null; run(); });
    return () => ro.disconnect();
  }, [page]); // eslint-disable-line

  const ch = useContext(PageChrome);
  const stop = (e: React.PointerEvent) => e.stopPropagation();
  const fsz = pl ? pl.f * Math.min(1, scale) : 16;
  const n = pl ? pl.rows.length : ROWS;
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
        <div className={"page-body" + (pls && pls.page === page && pls.H > (box.current?.clientHeight ?? 0) + 1 ? " tall" : "")} ref={box}>
          <div className={"mtext flow" + (fixed ? " fixed" : "")} style={{ fontSize: fsz, height: pls && pls.page === page && pls.H > (box.current?.clientHeight ?? 0) + 1 ? pls.H : undefined, gridTemplateRows: `repeat(${n}, 1fr)`, ["--rowh" as string]: (pls ? pls.H / n : 40) + "px", ["--gap" as string]: GAP_MIN + "em", ["--nat" as string]: GAP_NAT + "em" }}>
            {pl?.rows.map((r, i) => {
              const sg = data.segs[r.seg];
              if (r.type !== "line") return r.type === "head" ? <div className="sura-head orn" key={i}><span className="cart"><span>سُورَةُ {sg.sura!.name}</span></span></div> : <div className="bism" key={i}><span>{BISMILLAH}</span></div>;
              return <div className={"ln" + (r.centered ? " c" : "")} key={i}>{sg.groups.slice(r.from, r.to).map((g, k) => <GroupView key={k} g={g} />)}</div>;
            })}
          </div>
          <div className="meas" ref={meas} aria-hidden="true">{data.segs.map((sg) => sg.groups.map((g, k) => <GroupView key={k} g={g} />))}</div>
        </div>
        <div className="page-foot" aria-label={"Page " + page}><span className="pf-l" aria-hidden="true" /><span className="page-no">{ch.lang === "ar" ? toArabicDigits(page) : page}</span><span className="pf-r" aria-hidden="true" /></div>
      </div>
    </div>
  );
});

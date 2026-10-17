import { useLayoutEffect, useRef, useState, memo } from "react";
import { plan, GAP_MIN, GAP_NAT, ROWS, type Seg, type Plan } from "./layout";
import { normalizeAr } from "./tartil";
import { pageItems, toArabicDigits, BISMILLAH, firstSuraOfPage, juzOfPage, suras, type Item } from "./quran";

/** Break an ayah into evenly sized display lines (used on the two opening pages, which are set line by line like the printed mushaf). */
function lines(words: string[], max = 5): string[] {
  const n = Math.max(1, Math.ceil(words.length / max));
  const per = Math.ceil(words.length / n);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += per) out.push(words.slice(i, i + per).join(" "));
  return out;
}

const words = (t: string) => t.split(" ").filter(Boolean);
/** each word is its own span (so live recitation can reveal/mark words); stop-mark tokens stay visible */
const W = ({ w, s, a }: { w: string; s: number; a: number }) => <span className={"w ayah" + (normalizeAr(w) ? "" : " mark")} data-s={s} data-a={a}>{w}{" "}</span>;

function Opening({ items }: { items: Item[] }) {
  return (
    <>
      {items.map((it, i) => {
        if (it.k === "head") return <div className="sura-head orn" key={i}><span>سورة {it.sura.name}</span></div>;
        if (it.k === "bism") return <div className="line bism" key={i}>{BISMILLAH}</div>;
        const ls = lines(words(it.text));
        return ls.map((l, j) => (
          <div className="line" key={i + "-" + j}>
            {l.split(" ").map((w, k) => <W key={k} w={w} s={it.s} a={it.a} />)}{j === ls.length - 1 && <>{" "}<span className="end ayah" data-s={it.s} data-a={it.a} aria-label={"آية " + it.a}>{"\u06DD" + toArabicDigits(it.a)}</span></>}
          </div>
        ));
      })}
    </>
  );
}

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
    {g.end !== undefined && <span className="end ayah" data-s={g.s} data-a={g.a} aria-label={"آية " + g.end}>{"\u06DD" + toArabicDigits(g.end)}</span>}
  </span>
);

/**
 * One mushaf page. Pages 1-2: centred lines, ornate surah frame, spread evenly over the full height.
 * Other pages: 15 rows, every line word-justified to the full width (see layout.ts); surah heads and basmala take a row each.
 */
export const Page = memo(function Page({ page, scale = 1 }: { page: number; scale?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const txt = useRef<HTMLDivElement>(null);
  const meas = useRef<HTMLDivElement>(null);
  const widths = useRef<number[][] | null>(null);
  const [pl, setPl] = useState<Plan | null>(null);
  const items = pageItems(page);
  const sura = firstSuraOfPage(page);
  const opening = page <= 2;
  const data = opening ? null : build(items);

  useLayoutEffect(() => {
    const b = box.current, t = txt.current;
    if (!b || !t) return;
    if (opening) {
      // largest font where every line fits the width and the natural block height fits; extra height becomes even spacing
      const fitOpening = () => {
        const natural = () => Array.from(t.children).reduce((h, c) => h + (c as HTMLElement).offsetHeight, 0);
        const widest = () => Array.from(t.children).every((c) => (c as HTMLElement).scrollWidth <= b.clientWidth + 1);
        let lo = 12, hi = 70;
        for (let i = 0; i < 10; i++) {
          const mid = (lo + hi) / 2;
          t.style.fontSize = mid + "px";
          if (widest() && natural() <= b.clientHeight * 0.9) lo = mid; else hi = mid;
        }
        t.style.fontSize = lo * scale + "px";
      };
      fitOpening();
      const ro = new ResizeObserver(fitOpening);
      ro.observe(b);
      document.fonts?.ready.then(fitOpening);
      return () => ro.disconnect();
    }
    const m = meas.current!;
    const measure = () => {
      const gs = Array.from(m.querySelectorAll<HTMLElement>(".g"));
      let k = 0;
      widths.current = data!.segs.map((sg) => sg.groups.map(() => gs[k++].getBoundingClientRect().width / 100));
    };
    const run = () => {
      if (!widths.current) measure();
      const segs: Seg[] = data!.segs.map((sg, i) => ({ kind: sg.kind, w: widths.current![i], endsSura: sg.endsSura }));
      setPl(plan(segs, b.clientWidth - 2, b.clientHeight));
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(b);
    document.fonts?.ready.then(() => { widths.current = null; run(); });
    return () => ro.disconnect();
  }, [page, opening]); // eslint-disable-line

  const fsz = pl ? pl.f * Math.min(1, scale) : 16;
  return (
    <div className="page" lang="ar" dir="rtl" data-page={page}>
      <div className="frame">
        <div className="page-head" aria-hidden="true"><span>سورة {sura.name}</span><span>الجزء {toArabicDigits(juzOfPage(page))}</span></div>
        <div className="page-body" ref={box}>
          {opening ? (
            <div className="mtext opening" ref={txt}><Opening items={items} /></div>
          ) : (
            <>
              <div className="mtext flow" ref={txt} style={{ fontSize: fsz, gridTemplateRows: `repeat(${ROWS}, 1fr)`, ["--gap" as string]: GAP_MIN + "em", ["--nat" as string]: GAP_NAT + "em" }}>
                {pl?.rows.map((r, i) => {
                  const sg = data!.segs[r.seg];
                  if (r.type !== "line") return r.type === "head" ? <div className="sura-head orn" key={i}><span>سورة {sg.sura!.name}</span></div> : <div className="bism" key={i}>{BISMILLAH}</div>;
                  return <div className={"ln" + (r.centered ? " c" : "")} key={i}>{sg.groups.slice(r.from, r.to).map((g, k) => <GroupView key={k} g={g} />)}</div>;
                })}
              </div>
              <div className="meas" ref={meas} aria-hidden="true">{data!.segs.map((sg) => sg.groups.map((g, k) => <GroupView key={k} g={g} />))}</div>
            </>
          )}
        </div>
        <div className="page-no">{toArabicDigits(page)}</div>
      </div>
    </div>
  );
});

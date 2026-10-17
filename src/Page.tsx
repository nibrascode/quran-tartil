import { useLayoutEffect, useRef, memo } from "react";
import { normalizeAr } from "./tartil";
import { pageItems, toArabicDigits, BISMILLAH, firstSuraOfPage, juzOfPage, type Item } from "./quran";

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
const W = ({ w }: { w: string }) => <span className={"w" + (normalizeAr(w) ? "" : " mark")}>{w}{" "}</span>;

function Opening({ items }: { items: Item[] }) {
  return (
    <>
      {items.map((it, i) => {
        if (it.k === "head") return <div className="sura-head orn" key={i}><span>سورة {it.sura.name}</span></div>;
        if (it.k === "bism") return <div className="line bism" key={i}>{BISMILLAH}</div>;
        const ls = lines(words(it.text));
        return ls.map((l, j) => (
          <div className="line ayah" key={i + "-" + j} data-s={it.s} data-a={it.a}>
            {l.split(" ").map((w, k) => <W key={k} w={w} />)}{j === ls.length - 1 && <>{" "}<span className="end" aria-label={"آية " + it.a}>{"\u06DD" + toArabicDigits(it.a)}</span></>}
          </div>
        ));
      })}
    </>
  );
}

/**
 * One mushaf page. Pages 1-2: centred lines, ornate surah frame, spread evenly over the full height (font sized to the widest line).
 * Other pages: font size and line height are both fitted so the justified text fills the framed area.
 */
export const Page = memo(function Page({ page, scale = 1 }: { page: number; scale?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const txt = useRef<HTMLDivElement>(null);
  const items = pageItems(page);
  const sura = firstSuraOfPage(page);
  const opening = page <= 2;

  useLayoutEffect(() => {
    const b = box.current, t = txt.current;
    if (!b || !t) return;
    const fitOpening = () => {
      // largest font where every line fits the width and the natural block height fits; extra height becomes even spacing
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
    const fitFlow = () => {
      const fits = () => t.scrollHeight <= b.clientHeight + 1;
      t.style.setProperty("--lh", "1.8");
      let lo = 11, hi = 46;
      for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; t.style.fontSize = mid + "px"; if (fits()) lo = mid; else hi = mid; }
      t.style.fontSize = lo * scale + "px";
      // spend the remaining height on line spacing (clearer stacked marks)
      let l = 1.8, h = 3;
      for (let i = 0; i < 8; i++) { const mid = (l + h) / 2; t.style.setProperty("--lh", String(mid)); if (fits()) l = mid; else h = mid; }
      t.style.setProperty("--lh", String(l));
    };
    const fit = opening ? fitOpening : fitFlow;
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [page, scale, opening]);

  return (
    <div className="page" lang="ar" dir="rtl" data-page={page}>
      <div className="frame">
        <div className="page-head" aria-hidden="true"><span>سورة {sura.name}</span><span>الجزء {toArabicDigits(juzOfPage(page))}</span></div>
        <div className="page-body" ref={box}>
          <div className={"mtext" + (opening ? " opening" : "")} ref={txt}>
            {opening ? <Opening items={items} /> : items.map((it, i) =>
              it.k === "head" ? (
                <div className="sura-head orn" key={i}><span>سورة {it.sura.name}</span></div>
              ) : it.k === "bism" ? (
                <div className="bism" key={i}>{BISMILLAH}</div>
              ) : (
                <span key={i} className="ayah" data-s={it.s} data-a={it.a}>
                  {words(it.text).map((w, k) => <W key={k} w={w} />)}<span className="end" aria-label={"آية " + it.a}>{"\u06DD" + toArabicDigits(it.a)}</span>{" "}
                </span>
              ),
            )}
          </div>
        </div>
        <div className="page-no">{toArabicDigits(page)}</div>
      </div>
    </div>
  );
});

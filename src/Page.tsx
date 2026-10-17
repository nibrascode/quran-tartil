import { useLayoutEffect, useRef, memo } from "react";
import { pageItems, toArabicDigits, BISMILLAH } from "./quran";

/** One mushaf page. The text is scaled to the largest size that still fits the available height. */
export const Page = memo(function Page({ page }: { page: number }) {
  const box = useRef<HTMLDivElement>(null);
  const txt = useRef<HTMLDivElement>(null);
  const items = pageItems(page);

  useLayoutEffect(() => {
    const b = box.current, t = txt.current;
    if (!b || !t) return;
    const fit = () => {
      const short = page <= 2;
      let lo = 11, hi = short ? 40 : 46;
      for (let i = 0; i < 9; i++) {
        const mid = (lo + hi) / 2;
        t.style.fontSize = mid + "px";
        if (t.scrollHeight <= b.clientHeight + 1) lo = mid; else hi = mid;
      }
      t.style.fontSize = lo + "px";
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [page]);

  return (
    <div className="page" dir="rtl" lang="ar" data-page={page}>
      <div className="page-body" ref={box} style={{ justifyContent: page <= 2 ? "center" : "flex-start" }}>
        <div className="mtext" ref={txt}>
          {items.map((it, i) =>
            it.k === "head" ? (
              <div className="sura-head" key={i}><span>سورة {it.sura.name}</span></div>
            ) : it.k === "bism" ? (
              <div className="bism" key={i}>{BISMILLAH}</div>
            ) : (
              <span key={i} className="ayah" data-s={it.s} data-a={it.a}>
                {it.text}{" "}<span className="end">{"\u06DD" + toArabicDigits(it.a)}</span>{" "}
              </span>
            ),
          )}
        </div>
      </div>
      <div className="page-no">{toArabicDigits(page)}</div>
    </div>
  );
});

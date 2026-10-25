import { playPageTurn } from "./pageSound";
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { Page } from "./Page";
import { PAGES } from "./quran";

type Props = { page: number; setPage: (p: number) => void; onTap: (ayah: { s: number; a: number } | null, page?: number) => void; scale?: number; animate?: boolean };
type Flip = { to: number; dir: "next" | "prev" };
const MAX_ANGLE = 96;
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const SPREAD_Q = "(min-width: 900px) and (min-aspect-ratio: 5/4)";
/** tablets / desktop landscape: two facing mushaf pages (odd on the right, even on the left) */
export function useSpread(): boolean {
  const [s, setS] = useState(() => typeof matchMedia !== "undefined" && matchMedia(SPREAD_Q).matches);
  useEffect(() => { const m = matchMedia(SPREAD_Q); const f = () => setS(m.matches); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  return s;
}
export const spreadBase = (p: number) => (p % 2 ? p : p - 1);

/**
 * Arabic book: the spine is on the right. Going to the NEXT page lifts the left edge of the current page and turns it over the spine
 * (swipe left-to-right or tap the left edge). Going back lays the previous page down again.
 */
export function Reader({ page, setPage, onTap, scale = 1, animate = true }: Props) {
  const spread = useSpread();
  const [flip, setFlip] = useState<Flip | null>(null);
  const over = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const prog = useRef(0);
  const raf = useRef(0);
  const drag = useRef<{ x: number; y: number; t: number; dx: number; moved: boolean } | null>(null);
  const flipRef = useRef<Flip | null>(null);
  flipRef.current = flip;

  const flap = useRef<HTMLDivElement>(null);
  // Paper curl: the lifted sheet folds along a vertical line. Spine on the right, so the left edge lifts and travels right.
  // q = how far the fold has travelled (0 = flat, 1 = turned). The part left of the fold is the turned flap (paper back),
  // the under page shows through on the left with a soft shadow at the fold. Only transform/clip-path change -> compositor-friendly.
  const apply = (p: number) => {
    prog.current = p;
    const f = flipRef.current, o = over.current, sh = shade.current, fl = flap.current;
    if (!f || !o) return;
    const W = o.clientWidth || 1;
    const q = f.dir === "next" ? p : 1 - p;
    const xf = q * W, fw = Math.min(xf, W - xf);
    o.style.clipPath = `inset(0 0 0 ${xf}px)`;
    if (fl) { fl.style.transform = `translateX(${xf}px)`; fl.style.width = fw + "px"; fl.style.opacity = q > 0.002 && q < 0.998 ? "1" : "0"; }
    if (sh) { sh.style.transform = `translateX(${xf - W}px)`; sh.style.opacity = String(0.9 * Math.sin(Math.PI * Math.min(1, q * 1.4 + 0.05))); }
  };
  useLayoutEffect(() => { if (flip) apply(prog.current); }, [flip]);

  const finish = useCallback((commit: boolean, f: Flip) => {
    if (commit) { setPage(f.to); playPageTurn(); }
    setFlip(null);
    prog.current = 0;
  }, [setPage]);

  const tween = useCallback((f: Flip, target: 0 | 1) => {
    cancelAnimationFrame(raf.current);
    if (reduced() || !animate) { apply(target); finish(target === 1, f); return; }
    const from = prog.current, dur = 80 + 240 * Math.abs(target - from), t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      apply(from + (target - from) * e);
      if (k < 1) raf.current = requestAnimationFrame(step); else finish(target === 1, f);
    };
    raf.current = requestAnimationFrame(step);
  }, [finish]);

  const start = useCallback((dir: "next" | "prev"): Flip | null => {
    if (spread) return null;
    const to = page + (dir === "next" ? 1 : -1);
    if (to < 1 || to > PAGES) return null;
    const f = { to, dir };
    prog.current = 0;
    flipRef.current = f;
    setFlip(f);
    return f;
  }, [page, spread]);

  const turn = useCallback((dir: "next" | "prev") => {
    if (flipRef.current) return;
    if (spread) { const to = spreadBase(page) + (dir === "next" ? 2 : -2); if (to >= 1 && to <= PAGES) setPage(to); return; }
    const f = start(dir);
    if (f) requestAnimationFrame(() => requestAnimationFrame(() => tween(f, 1)));
  }, [start, tween, spread, page, setPage]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowLeft" || e.key === "PageDown") turn("next");
      if (e.key === "ArrowRight" || e.key === "PageUp") turn("prev");
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [turn]);

  const down = (e: React.PointerEvent) => { if (flipRef.current) return; drag.current = { x: e.clientX, y: e.clientY, t: Date.now(), dx: 0, moved: false }; };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    d.dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(d.dx) > 10 && Math.abs(d.dx) > Math.abs(dy)) {
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      start(d.dx > 0 ? "next" : "prev");
    }
    const f = flipRef.current;
    if (d.moved && f) {
      const w = (e.currentTarget as HTMLElement).clientWidth * 0.75;
      apply(Math.max(0, Math.min(1, (f.dir === "next" ? d.dx : -d.dx) / w)));
    }
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null;
    if (!d) return;
    const f = flipRef.current;
    if (d.moved && f) { const fast = Math.abs(d.dx) / Math.max(1, Date.now() - d.t) > 0.5; tween(f, prog.current > 0.3 || fast ? 1 : 0); return; }
    if (Math.abs(d.dx) < 10 && Math.abs(e.clientY - d.y) < 10 && Date.now() - d.t < 500) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      if (fx < 0.18) turn("next"); else if (fx > 0.82) turn("prev");
      else {
        // top and bottom strips always toggle the bars; elsewhere a tap on an ayah selects it
        const el = fy < 0.08 || fy > 0.92 ? null : ((e.target as HTMLElement).closest?.(".ayah") as HTMLElement | null);
        onTap(el ? { s: Number(el.dataset.s), a: Number(el.dataset.a) } : null, el ? Number((el.closest(".page") as HTMLElement | null)?.dataset.page) || undefined : undefined);
      }
    }
  };
  const cancel = () => { drag.current = null; const f = flipRef.current; if (f) tween(f, 0); };

  const under = flip ? (flip.dir === "next" ? flip.to : page) : page;
  const overPage = flip ? (flip.dir === "next" ? page : flip.to) : 0;
  return (
    <div className="reader" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} role="region" aria-label={`Mushaf ${page}`}>
      {spread ? (
        <div className="layer"><div className="spread" dir="rtl"><Page page={spreadBase(page)} scale={scale} />{spreadBase(page) + 1 <= PAGES && <Page page={spreadBase(page) + 1} scale={scale} />}</div></div>
      ) : (
        <>
          {/* the current page and both neighbours stay mounted and laid out (keyed by page number), so a turn only changes
              which already-measured layer is visible: no reflow or half-fitted text during the turn */}
          {[page - 1, page, page + 1].concat(flip ? [flip.to - 1, flip.to + 1] : []).filter((n, i, a) => n >= 1 && n <= PAGES && a.indexOf(n) === i).sort((x, y) => (x === overPage ? 1 : 0) - (y === overPage ? 1 : 0)).map((n) => {
            const role = n === overPage ? "over" : n === under ? "under" : "pre";
            return <div key={n} className={"layer " + role} ref={role === "over" ? over : undefined} aria-hidden={role === "pre" || undefined}><Page page={n} scale={scale} />{role === "under" && <div className="shade" ref={shade} />}</div>;
          })}
          {flip && <div className="flap" ref={flap} aria-hidden="true" />}
        </>
      )}
      <div className="sr-only" aria-live="polite">{page}</div>
    </div>
  );
}

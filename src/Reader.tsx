import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { Page } from "./Page";
import { PAGES } from "./quran";

type Props = { page: number; setPage: (p: number) => void; onTap: (ayah: { s: number; a: number } | null) => void; scale?: number; animate?: boolean };
type Flip = { to: number; dir: "next" | "prev" };
const MAX_ANGLE = 96;
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Arabic book: the spine is on the right. Going to the NEXT page lifts the left edge of the current page and turns it over the spine
 * (swipe left-to-right or tap the left edge). Going back lays the previous page down again.
 */
export function Reader({ page, setPage, onTap, scale = 1, animate = true }: Props) {
  const [flip, setFlip] = useState<Flip | null>(null);
  const over = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const prog = useRef(0);
  const raf = useRef(0);
  const drag = useRef<{ x: number; y: number; t: number; dx: number; moved: boolean } | null>(null);
  const flipRef = useRef<Flip | null>(null);
  flipRef.current = flip;

  const apply = (p: number) => {
    prog.current = p;
    const f = flipRef.current, o = over.current, sh = shade.current;
    if (!f || !o) return;
    const a = (f.dir === "next" ? p : 1 - p) * MAX_ANGLE;
    o.style.transform = `rotateY(${a}deg)`;
    o.style.boxShadow = `${-14 * (1 - Math.abs(a / MAX_ANGLE - 0.5) * 2)}px 0 28px rgba(0,0,0,${0.25 * Math.sin((a / MAX_ANGLE) * Math.PI)})`;
    if (sh) sh.style.opacity = String(f.dir === "next" ? 0.55 * (1 - p) : 0.55 * p);
  };
  useLayoutEffect(() => { if (flip) apply(prog.current); }, [flip]);

  const finish = useCallback((commit: boolean, f: Flip) => {
    if (commit) setPage(f.to);
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
    const to = page + (dir === "next" ? 1 : -1);
    if (to < 1 || to > PAGES) return null;
    const f = { to, dir };
    prog.current = 0;
    flipRef.current = f;
    setFlip(f);
    return f;
  }, [page]);

  const turn = useCallback((dir: "next" | "prev") => {
    if (flipRef.current) return;
    const f = start(dir);
    if (f) requestAnimationFrame(() => requestAnimationFrame(() => tween(f, 1)));
  }, [start, tween]);

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
        onTap(el ? { s: Number(el.dataset.s), a: Number(el.dataset.a) } : null);
      }
    }
  };
  const cancel = () => { drag.current = null; const f = flipRef.current; if (f) tween(f, 0); };

  const under = flip ? (flip.dir === "next" ? flip.to : page) : page;
  const overPage = flip ? (flip.dir === "next" ? page : flip.to) : 0;
  return (
    <div className="reader" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} role="region" aria-label={`Mushaf ${page}`}>
      <div className="layer"><Page page={under} scale={scale} /><div className="shade" ref={shade} /></div>
      {flip && <div className="layer over" ref={over}><Page page={overPage} scale={scale} /></div>}
      <div className="sr-only" aria-live="polite">{page}</div>
    </div>
  );
}

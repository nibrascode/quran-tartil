import { useEffect, useRef, useState, useCallback } from "react";
import { Page } from "./Page";
import { PAGES } from "./quran";

type Props = { page: number; setPage: (p: number) => void; onCenterTap: () => void };

/** Arabic book turning: a swipe left-to-right (or tap on the left edge) goes to the NEXT page, which enters from the left. */
export function Reader({ page, setPage, onCenterTap }: Props) {
  const [dir, setDir] = useState<"next" | "prev" | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; t: number; dx: number; id: number } | null>(null);

  const go = useCallback((delta: 1 | -1) => {
    const n = page + delta;
    if (n < 1 || n > PAGES) return;
    setDir(delta === 1 ? "next" : "prev");
    setPage(n);
  }, [page, setPage]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") go(1);
      if (e.key === "ArrowRight") go(-1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go]);

  const down = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, t: Date.now(), dx: 0, id: e.pointerId }; };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    d.dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(d.dx) > 8 && Math.abs(d.dx) > Math.abs(dy)) {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      const c = el.current; if (c) { c.style.animation = "none"; c.style.transform = `translateX(${d.dx}px)`; }
    }
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null;
    if (!d) return;
    const c = el.current; if (c) { c.style.transform = ""; c.style.animation = ""; }
    const dy = e.clientY - d.y;
    if (Math.abs(d.dx) > 50 && Math.abs(d.dx) > Math.abs(dy)) { go(d.dx > 0 ? 1 : -1); return; }
    if (Math.abs(d.dx) < 10 && Math.abs(dy) < 10 && Date.now() - d.t < 500) {
      const w = (e.currentTarget as HTMLElement).clientWidth, f = (e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left) / w;
      if (f < 0.28) go(1); else if (f > 0.72) go(-1); else onCenterTap();
    }
  };

  return (
    <div className="reader" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; const c = el.current; if (c) { c.style.transform = ""; c.style.animation = ""; } }}>
      <div key={page} ref={el} className={"turn " + (dir ? "from-" + (dir === "next" ? "left" : "right") : "")}>
        <Page page={page} />
      </div>
    </div>
  );
}

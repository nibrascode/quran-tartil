import pageOne from "@/data/pages/p1.json";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Catalog } from "@/components/catalog";
import { MushafPage } from "@/components/mushaf-page";
import { Rosette } from "@/components/marks";
import {
  PAGE_COUNT,
  loadPage,
  peekPage,
  prefetch,
  readMarks,
  rememberPage,
  surah,
  writeMarks,
  type PageData,
} from "@/lib/quran";

export function Reader({ initialPage, onHome }: { initialPage: number; onHome: () => void }) {
  const girihId = useId().replace(/:/g, "");
  const [page, setPage] = useState(initialPage);
  const [view, setView] = useState<{ n: number; data: PageData } | null>(
    initialPage === 1 ? { n: 1, data: pageOne as PageData } : null,
  );
  const [sides, setSides] = useState<{ prev: PageData | null; next: PageData | null }>({
    prev: null,
    next: null,
  });
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [marks, setMarks] = useState<number[]>([]);
  const [booted, setBooted] = useState(false);
  const pageRef = useRef(initialPage);
  const bodyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<PageData | null>(null);
  const nextRef = useRef<PageData | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    t: number;
    lx: number;
    ly: number;
    lt: number;
    vx: number;
    dx: number;
    active: boolean;
    locked: boolean;
    mode: "x" | "v";
    pull: number;
    pullDir: 0 | 1 | -1;
  } | null>(null);
  const animating = useRef(false);
  const tokenRef = useRef(0);
  const timerRef = useRef(0);

  const apply = useCallback((dx: number, animate: boolean) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = animate ? "transform 340ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    el.style.transform = `translate3d(calc(-100% / 3 + ${dx}px), 0, 0)`;
  }, []);

  const commit = useCallback((delta: 1 | -1) => {
    const cur = pageRef.current;
    const n = Math.min(PAGE_COUNT, Math.max(1, cur + delta));
    if (n === cur) return;
    const incoming = (delta === 1 ? nextRef.current : prevRef.current) ?? peekPage(n);
    if (incoming) setView({ n, data: incoming });
    pageRef.current = n;
    setPage(n);
  }, []);

  const slide = useCallback(
    (dx: number, delta: 1 | -1) => {
      const el = trackRef.current;
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!el || reduce) {
        apply(0, false);
        commit(delta);
        return;
      }
      animating.current = true;
      const token = ++tokenRef.current;
      apply(dx, true);
      const finish = () => {
        if (tokenRef.current !== token) return;
        tokenRef.current += 1;
        window.clearTimeout(timerRef.current);
        el.removeEventListener("transitionend", onEnd);
        animating.current = false;
        commit(delta);
      };
      const onEnd = (ev: TransitionEvent) => {
        if (ev.target !== el || ev.propertyName !== "transform") return;
        finish();
      };
      el.addEventListener("transitionend", onEnd);
      timerRef.current = window.setTimeout(finish, 420);
    },
    [apply, commit],
  );

  useEffect(() => {
    setMarks(readMarks());
    pageRef.current = initialPage;
    setPage(initialPage);
    setBooted(true);
  }, [initialPage]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    if (!booted) return;
    let cancel = false;
    setError("");
    loadPage(page)
      .then((d) => {
        if (!cancel) setView({ n: page, data: d });
      })
      .catch(() => {
        if (!cancel) setError("Səhifə açılmadı. Bir daha yoxlayın.");
      });
    const side = (n: number) =>
      n < 1 || n > PAGE_COUNT ? Promise.resolve(null) : loadPage(n).catch(() => null);
    void Promise.all([side(page - 1), side(page + 1)]).then(([prev, next]) => {
      if (cancel) return;
      prevRef.current = prev;
      nextRef.current = next;
      setSides({ prev, next });
    });
    rememberPage(page);
    for (const delta of [-2, -1, 1, 2]) prefetch(page + delta);
    return () => {
      cancel = true;
    };
  }, [page, booted]);

  useLayoutEffect(() => {
    const sc = trackRef.current?.children[1] as HTMLElement | undefined;
    if (sc) sc.scrollTop = 0;
    if (drag.current?.locked || animating.current) return;
    apply(0, false);
  }, [view?.n, page, apply]);

  useEffect(() => {
    const onResize = () => {
      if (drag.current?.locked || animating.current) return;
      apply(0, false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [apply]);

  useEffect(() => {
    document.title = view
      ? `${surah(view.data.s).az} surəsi · Qurani-Kərim`
      : "Qurani-Kərim";
  }, [view]);

  const go = useCallback(
    (delta: 1 | -1) => {
      if (animating.current || drag.current?.locked) return;
      const cur = pageRef.current;
      const next = Math.min(PAGE_COUNT, Math.max(1, cur + delta));
      if (next === cur) return;
      const w = bodyRef.current?.clientWidth ?? 0;
      if (!w) {
        commit(delta);
        return;
      }
      slide(delta === 1 ? w : -w, delta);
    },
    [commit, slide],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") go(1);
      if (e.key === "ArrowRight" || e.key === "ArrowUp") go(-1);
      if (e.key === "Escape") setCatalog(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const toggleMark = () => {
    setMarks((cur) => {
      const next = cur.includes(page)
        ? cur.filter((n) => n !== page)
        : [...cur, page].sort((a, b) => a - b);
      writeMarks(next);
      return next;
    });
  };

  const marked = marks.includes(page);

  const endDrag = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    const w = bodyRef.current?.clientWidth ?? 1;
    if (d.mode === "v") {
      if (d.pull > 64) {
        if (d.pullDir === 1 && pageRef.current < PAGE_COUNT) slide(w, 1);
        else if (d.pullDir === -1 && pageRef.current > 1) slide(-w, -1);
      }
      return;
    }
    if (!d.locked) {
      apply(0, false);
      setChrome((on) => !on);
      return;
    }
    const dx = e.clientX - d.x;
    const passed = Math.abs(dx) > w * 0.18 || Math.abs(d.vx) > 0.45;
    const toNext = dx > 0 || d.vx > 0.45;
    if (passed && toNext && pageRef.current < PAGE_COUNT && dx >= -8) {
      slide(w, 1);
      return;
    }
    if (passed && !toNext && pageRef.current > 1 && dx <= 8) {
      slide(-w, -1);
      return;
    }
    apply(0, true);
  };

  return (
    <div className="stage">
      <div className={chrome ? "book reader chrome" : "book reader"}>
        <header className="topbar">
          <button type="button" className="icon-btn" onClick={onHome} aria-label="Ana səhifə">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M14.5 5.5 8 12l6.5 6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="topbar-title">
            <strong>
              {view ? `${view.data.s}. ${surah(view.data.s).az}` : "Qurani-Kərim"}
            </strong>
            <span>{view ? `Cüz ${view.data.j}` : ""}</span>
          </div>
          <button
            type="button"
            className={marked ? "icon-btn gold" : "icon-btn"}
            onClick={toggleMark}
            aria-pressed={marked}
            aria-label={marked ? "İşarəni sil" : "Səhifəni işarələ"}
          >
            <Rosette filled={marked} />
          </button>
        </header>

        <div
          className="body"
          ref={bodyRef}
          onPointerDown={(e) => {
            if (e.button !== 0 || animating.current || catalog) return;
            const t = e.target as HTMLElement;
            if (t.closest("button, a, input")) return;
            bodyRef.current?.setPointerCapture(e.pointerId);
            const now = performance.now();
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              t: now,
              lx: e.clientX,
              ly: e.clientY,
              lt: now,
              vx: 0,
              dx: 0,
              active: true,
              locked: false,
              mode: "x",
              pull: 0,
              pullDir: 0,
            };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d?.active || animating.current) return;
            const dx = e.clientX - d.x;
            const dy = e.clientY - d.y;
            if (!d.locked) {
              if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
              const phoneLand = window.matchMedia("(orientation: landscape) and (max-height: 560px)").matches;
              if (Math.abs(dy) > Math.abs(dx) && phoneLand) {
                d.locked = true;
                d.mode = "v";
                bodyRef.current?.setPointerCapture(e.pointerId);
              } else if (Math.abs(dy) > Math.abs(dx)) {
                d.active = false;
                return;
              } else {
                d.locked = true;
                d.mode = "x";
                bodyRef.current?.setPointerCapture(e.pointerId);
              }
            }
            if (d.mode === "v") {
              const sc = trackRef.current?.children[1] as HTMLElement | undefined;
              if (!sc) return;
              const deltaY = e.clientY - d.ly;
              d.ly = e.clientY;
              const max = Math.max(0, sc.scrollHeight - sc.clientHeight);
              const atBottom = sc.scrollTop >= max - 2;
              const atTop = sc.scrollTop <= 1;
              if (deltaY < 0 && atBottom) {
                d.pull = d.pullDir === 1 ? d.pull - deltaY : -deltaY;
                d.pullDir = 1;
              } else if (deltaY > 0 && atTop) {
                d.pull = d.pullDir === -1 ? d.pull + deltaY : deltaY;
                d.pullDir = -1;
              } else {
                d.pull = 0;
                d.pullDir = 0;
                sc.scrollTop = Math.min(max, Math.max(0, sc.scrollTop - deltaY));
              }
              return;
            }
            const now = performance.now();
            const dt = now - d.lt;
            if (dt > 0) d.vx = (e.clientX - d.lx) / dt;
            d.lx = e.clientX;
            d.lt = now;
            let x = dx;
            if (x > 0 && pageRef.current >= PAGE_COUNT) x *= 0.22;
            if (x < 0 && pageRef.current <= 1) x *= 0.22;
            d.dx = x;
            apply(x, false);
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="track" ref={trackRef}>
            <div className="turn" aria-hidden="true">
              {sides.next && <MushafPage data={sides.next} />}
            </div>
            <div className="turn">
              {view && view.n === page ? <MushafPage key={view.n} data={view.data} /> : null}
            </div>
            <div className="turn" aria-hidden="true">
              {sides.prev && <MushafPage data={sides.prev} />}
            </div>
          </div>
          {error && <p className="banner">{error}</p>}
        </div>

        <footer className="foot">
          <svg className="foot-shape" viewBox="0 0 390 108" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <pattern id={girihId} width="28" height="28" patternUnits="userSpaceOnUse">
                <polygon points={GIRIH} fill="none" stroke="currentColor" strokeWidth="0.95" />
                <polygon points={GIRIH_A} fill="none" stroke="currentColor" strokeWidth="0.95" />
                <polygon points={GIRIH_B} fill="none" stroke="currentColor" strokeWidth="0.95" />
                <polygon points={GIRIH_C} fill="none" stroke="currentColor" strokeWidth="0.95" />
                <polygon points={GIRIH_D} fill="none" stroke="currentColor" strokeWidth="0.95" />
                <path d="M14 0V28M0 14H28" fill="none" stroke="currentColor" strokeWidth="0.55" />
              </pattern>
              <clipPath id={`${girihId}-foot`}>
                <path d={FOOT} />
              </clipPath>
            </defs>
            <path className="foot-fill" d={FOOT} />
            <g className="girih" clipPath={`url(#${girihId}-foot)`}>
              <rect width="108" height="108" fill={`url(#${girihId})`} />
              <rect x="282" width="108" height="108" fill={`url(#${girihId})`} />
            </g>
            <path className="foot-gold" d={FOOT_LINE} />
            <g className="foot-orn">
              <path d="M154 63.5 L176 52" />
              <path d="M236 63.5 L214 52" />
              <path d="M147 64.5 151.2 60.4 155.3 64.5 151.2 68.6Z" />
              <path d="M243 64.5 238.8 60.4 234.7 64.5 238.8 68.6Z" />
            </g>
          </svg>
          <div className="medal-row">
            <button type="button" className="medal" onClick={() => setCatalog(true)} aria-label={`Səhifə ${page}`}>
              <svg viewBox="0 0 92 36" aria-hidden="true">
                <path d="M46 2C62 2 74 8 82 18 74 28 62 34 46 34 30 34 18 28 10 18 18 8 30 2 46 2Z" />
                <path d="M46 6.5C60 6.5 70 11.5 76 18 70 24.5 60 29.5 46 29.5 32 29.5 22 24.5 16 18 22 11.5 32 6.5 46 6.5Z" />
              </svg>
              <span>{page}</span>
            </button>
          </div>
        </footer>

        <button type="button" className="edge prev" onClick={() => go(-1)} disabled={page <= 1} aria-label="Əvvəlki səhifə">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9.5 5.5 16 12l-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" className="edge next" onClick={() => go(1)} disabled={page >= PAGE_COUNT} aria-label="Növbəti səhifə">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {catalog && (
          <Catalog
            page={page}
            marks={marks}
            onClose={() => setCatalog(false)}
            onJump={(n) => {
              if (n === pageRef.current) {
                setCatalog(false);
                return;
              }
              const incoming = peekPage(n);
              if (incoming) setView({ n, data: incoming });
              pageRef.current = n;
              setPage(n);
              setCatalog(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

const FOOT_LINE =
  "M0 0H4C4 28 26 54 64 62C98 68 128 66 154 61C168 57 178 50 186 44C190 40 192 37 195 36C198 37 200 40 204 44C212 50 222 57 236 61C262 66 292 68 326 62C364 54 386 28 386 0H390";
const FOOT = `${FOOT_LINE}V108H0Z`;

function starPts(cx: number, cy: number, rOut: number, rIn: number) {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = (Math.PI / 8) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

const GIRIH = starPts(14, 14, 7.1, 2.85);
const GIRIH_A = starPts(0, 0, 7.1, 2.85);
const GIRIH_B = starPts(28, 0, 7.1, 2.85);
const GIRIH_C = starPts(0, 28, 7.1, 2.85);
const GIRIH_D = starPts(28, 28, 7.1, 2.85);

import { useLayoutEffect, useRef, useState } from "react";
import { suras } from "./quran";

/**
 * Mushaf pages 1-2 as printed (King Fahd Complex, Madinah): the whole page is an illuminated panel,
 * the surah name sits in a cartouche at the top of the inner panel, and the text is set in a scalloped
 * oval medallion in the centre. Every line is justified to the width of the oval at its height; the
 * closing line is centred. Line breaks are the printed ones (rows from mushaf15.json).
 */
type Seg = [number, number, string];
export type ORow = ["h" | "b", number] | Seg[];

function scallop(cx: number, cy: number, rx: number, ry: number, lobes: number, depth: number) {
  let d = "";
  const N = lobes * 12;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const k = 1 + depth * Math.abs(Math.sin((t * lobes) / 2));
    d += (i ? "L" : "M") + (cx + rx * k * Math.cos(t)).toFixed(1) + " " + (cy + ry * k * Math.sin(t)).toFixed(1);
  }
  return d + "Z";
}

export function Illumination({ w, h, med, id }: { w: number; h: number; med: { cx: number; cy: number; rx: number; ry: number }; id: string }) {
  if (!w || !h) return null;
  const i1 = Math.min(w, h) * 0.035, i2 = i1 + Math.min(w, h) * 0.035; // thin bands, as printed: the medallion gets the room
  const { cx, cy, rx, ry } = med;
  return (
    <svg className="opn-ill" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs>
        <pattern id={"opnA" + id} width="34" height="34" patternUnits="userSpaceOnUse">
          <rect width="34" height="34" fill="var(--o-b)" />
          <g fill="none" stroke="var(--o-l)" strokeWidth="1.1"><circle cx="17" cy="17" r="11" /><circle cx="0" cy="0" r="11" /><circle cx="34" cy="0" r="11" /><circle cx="0" cy="34" r="11" /><circle cx="34" cy="34" r="11" /></g>
          <g fill="var(--o-f)"><path d="M17 9c3 4 3 12 0 16c-3-4-3-12 0-16z" /><path d="M9 17c4-3 12-3 16 0c-4 3-12 3-16 0z" /></g>
          <circle cx="17" cy="17" r="2.2" fill="var(--o-d)" />
        </pattern>
        <pattern id={"opnB" + id} width="26" height="26" patternUnits="userSpaceOnUse">
          <rect width="26" height="26" fill="var(--o-b2)" />
          <path d="M13 3c5 5 5 15 0 20c-5-5-5-15 0-20z" fill="var(--o-f2)" stroke="var(--o-l)" strokeWidth=".7" />
          <circle cx="0" cy="0" r="3" fill="var(--o-d)" /><circle cx="26" cy="0" r="3" fill="var(--o-d)" /><circle cx="0" cy="26" r="3" fill="var(--o-d)" /><circle cx="26" cy="26" r="3" fill="var(--o-d)" />
        </pattern>
      </defs>
      <rect x="1" y="1" width={w - 2} height={h - 2} rx="6" fill={`url(#opnA${id})`} stroke="var(--o-d)" strokeWidth="2" />
      <rect x={i1 - 5} y={i1 - 5} width={w - 2 * i1 + 10} height={h - 2 * i1 + 10} fill="none" stroke="var(--o-d)" strokeWidth="1.5" />
      <rect x={i1} y={i1} width={w - 2 * i1} height={h - 2 * i1} fill={`url(#opnB${id})`} stroke="var(--o-d)" strokeWidth="2" />
      <rect x={i2} y={i2} width={w - 2 * i2} height={h - 2 * i2} fill={`url(#opnA${id})`} stroke="var(--o-d)" strokeWidth="2" />
      <rect x={i2 + 4} y={i2 + 4} width={w - 2 * i2 - 8} height={h - 2 * i2 - 8} fill="none" stroke="var(--o-l)" strokeWidth="1" />
      {/* interlaced rings above and below the medallion, as printed */}
      <g fill="none" stroke="var(--o-d)" strokeWidth="2.2">
        <ellipse cx={cx - rx * 0.09} cy={cy - ry - ry * 0.08} rx={rx * 0.13} ry={ry * 0.13} /><ellipse cx={cx + rx * 0.09} cy={cy - ry - ry * 0.08} rx={rx * 0.13} ry={ry * 0.13} />
        <ellipse cx={cx - rx * 0.09} cy={cy + ry + ry * 0.08} rx={rx * 0.13} ry={ry * 0.13} /><ellipse cx={cx + rx * 0.09} cy={cy + ry + ry * 0.08} rx={rx * 0.13} ry={ry * 0.13} />
      </g>
      <path d={scallop(cx, cy, rx * 1.05, ry * 1.05, 18, 0.05)} fill="var(--o-d)" />
      <path d={scallop(cx, cy, rx * 1.02, ry * 1.02, 18, 0.05)} fill="var(--o-l)" />
      <path d={scallop(cx, cy, rx, ry, 18, 0.05)} fill="var(--o-p)" />
    </svg>
  );
}

export function useOpeningGeom(page: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [g, setG] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const run = () => setG({ w: el.clientWidth, h: el.clientHeight });
    run(); const ro = new ResizeObserver(run); ro.observe(el); return () => ro.disconnect();
  }, [page]);
  const { w, h } = g;
  const i2 = Math.min(w, h) * 0.07;
  const cartH = Math.max(26, Math.min(h * 0.06, 46));
  const cartY = i2 + h * 0.03;
  const top = cartY + cartH + h * 0.035, bot = h - i2 - h * 0.035;
  // big medallion: nearly the whole inner panel (the rings above/below need ≈ 0.2 ry)
  const med = { cx: w / 2, cy: (top + bot) / 2, rx: (w - 2 * i2) * 0.465, ry: Math.min((bot - top) / 2 / 1.12, (w - 2 * i2) * 0.8) };
  return { ref, w, h, med, cartY, cartH };
}

export const suraName = (s: number) => suras[s - 1].name;

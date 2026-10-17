/**
 * Mushaf line layout: every standard page is 15 lines, each line word-justified to the full width.
 * Widths are in em (font-size 1). Pure functions (no DOM), so the layout of all 604 pages can be checked in tests.
 */
export const ROWS = 15;
export const GAP_MIN = 0.14; // em, tightest space between words
export const GAP_NAT = 0.28; // em, natural space

export type Seg = { kind: "head" | "bism" | "text"; w: number[]; endsSura: boolean };
export type Line = { seg: number; from: number; to: number; centered: boolean }; // groups [from, to)
export type Plan = { f: number; rows: ({ type: "head" | "bism"; seg: number } | ({ type: "line" } & Line))[]; lines: number };

const span = (w: number[], a: number, b: number) => { let s = (b - a - 1) * GAP_MIN; for (let i = a; i < b; i++) s += w[i]; return s; };

/** first-fit line starts */
export function greedy(w: number[], cap: number): number[] {
  const starts: number[] = [];
  let i = 0;
  while (i < w.length) {
    starts.push(i);
    let j = i + 1;
    while (j < w.length && span(w, i, j + 1) <= cap) j++;
    i = j;
  }
  return starts;
}

/** exactly n lines, minimising the squared slack of every line (so all lines are about equally full) */
export function balanced(w: number[], n: number, cap: number): number[] {
  const m = w.length;
  n = Math.min(n, m);
  const INF = 1e18;
  const cost = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(INF));
  const from = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  cost[0][0] = 0;
  for (let l = 1; l <= n; l++) {
    for (let j = l; j <= m; j++) {
      for (let i = j - 1; i >= l - 1; i--) {
        const used = span(w, i, j);
        if (used > cap && j - i > 1) break;
        if (cost[l - 1][i] >= INF) continue;
        const slack = Math.max(0, cap - used) / cap;
        const c = cost[l - 1][i] + slack * slack;
        if (c < cost[l][j]) { cost[l][j] = c; from[l][j] = i; }
      }
    }
  }
  if (cost[n][m] >= INF) return greedy(w, cap);
  const starts: number[] = [];
  for (let l = n, j = m; l >= 1; l--) { const i = from[l][j]; starts.unshift(i); j = i; }
  return starts;
}

const countAt = (segs: Seg[], cap: number) => segs.reduce((n, s) => n + (s.kind === "text" ? greedy(s.w, cap).length : 1), 0);

/** @param W line width in px, @param H body height in px */
export function plan(segs: Seg[], W: number, H: number): Plan {
  const pitch = H / ROWS;
  let lo = 6, hi = Math.min(pitch / 1.45, W * 0.062); // cap: sparse pages get looser lines instead of a bigger font
  // largest font where the page still needs at most 15 lines
  if (countAt(segs, W / lo) > ROWS) hi = lo; else {
    for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (countAt(segs, W / mid) <= ROWS) lo = mid; else hi = mid; }
  }
  const f = lo, cap = W / f;
  const textIdx = segs.map((s, i) => (s.kind === "text" ? i : -1)).filter((i) => i >= 0);
  const n = new Map<number, number>(textIdx.map((i) => [i, greedy(segs[i].w, cap).length]));
  let total = countAt(segs, cap);
  // spare rows (when the height, not the width, limited the font): loosen the biggest flowing segment so the page still has 15 lines
  while (total < ROWS && textIdx.length) {
    const cand = [...textIdx].sort((a, b) => (segs[a].endsSura ? 1 : 0) - (segs[b].endsSura ? 1 : 0) || (n.get(b)! - n.get(a)!))[0];
    if (n.get(cand)! >= segs[cand].w.length) break;
    n.set(cand, n.get(cand)! + 1); total++;
  }
  const rows: Plan["rows"] = [];
  segs.forEach((s, si) => {
    if (s.kind !== "text") { rows.push({ type: s.kind, seg: si }); return; }
    const count = n.get(si)!;
    const padded = count > greedy(s.w, cap).length;
    // a sura's closing line may stay short (centred) like the printed mushaf; everything else is fully justified
    const starts = s.endsSura && !padded ? greedy(s.w, cap) : balanced(s.w, count, cap);
    starts.forEach((a, k) => {
      const b = k + 1 < starts.length ? starts[k + 1] : s.w.length;
      const last = k === starts.length - 1;
      rows.push({ type: "line", seg: si, from: a, to: b, centered: s.endsSura && !padded && last && span(s.w, a, b) < cap * 0.82 });
    });
  });
  return { f, rows, lines: rows.length };
}

/** fixed hand-set structure (pages 1-2 of the Madinah mushaf: 8 rows spread over the whole page, line breaks as printed) */
export function planFixed(segs: Seg[], textSeg: number, ranges: [number, number][], W: number, H: number): Plan {
  const w = segs[textSeg].w;
  const rowsN = segs.length - 1 + ranges.length;
  const pitch = H / rowsN;
  let maxEm = 0;
  ranges.forEach(([a, b]) => { maxEm = Math.max(maxEm, span(w, a, b)); });
  const f = Math.min(pitch / 1.7, W / (maxEm + 0.1));
  const cap = W / f;
  const rows: Plan["rows"] = [];
  segs.forEach((sg, si) => {
    if (sg.kind !== "text") { rows.push({ type: sg.kind, seg: si }); return; }
    ranges.forEach(([a, b]) => rows.push({ type: "line", seg: si, from: a, to: b, centered: span(w, a, b) < cap * 0.8 }));
  });
  return { f, rows, lines: rows.length };
}

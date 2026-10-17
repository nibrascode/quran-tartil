import { normalizeAr, spelledOut } from "./tartil";

/** Longest in-order overlap between what an alternative says and the words we expect to hear next. */
export function lcsLen(a: string[], b: (string | { n: string; sp: string })[]): number {
  const same = (x: string, y: string | { n: string; sp: string }) => (typeof y === "string" ? x === y : x === y.n || x === y.sp);
  const dp = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) { const t = dp[j]; dp[j] = same(a[i - 1], b[j - 1]) ? prev + 1 : Math.max(dp[j], dp[j - 1]); prev = t; }
  }
  return dp[b.length];
}
export type Alt = { transcript: string; confidence?: number };
/**
 * Speech engines return several hypotheses per result (maxAlternatives). The first is the engine's favourite, but for Quran
 * recitation the expected text is known: pick the alternative that fits the expected words best. The engine's favourite is only
 * replaced when another alternative matches strictly more expected words (never on confidence alone), so unrelated speech is untouched.
 */
export function pickAlternative(alts: Alt[], expected: string[]): { index: number; alt: Alt; matched: number } {
  if (!alts.length) return { index: 0, alt: { transcript: "" }, matched: 0 };
  const exp = expected.map((w) => { const n = normalizeAr(w), sp = spelledOut(w); return n ? { n, sp: sp ? normalizeAr(sp) : n } : null; }).filter((x): x is { n: string; sp: string } => !!x);
  let best = 0, bestScore = -1;
  alts.forEach((a, i) => {
    const sc = exp.length ? lcsLen(a.transcript.split(/\s+/).map(normalizeAr).filter(Boolean), exp) : 0;
    if (i === 0) { bestScore = sc; best = 0; } else if (sc > bestScore) { bestScore = sc; best = i; }
  });
  return { index: best, alt: alts[best], matched: Math.max(0, bestScore) };
}

/** Live diagnostics of the speech engine (shown in Settings). */
export type Diag = { engine: string; locale: string; supported: boolean; results: number; finals: number; restarts: number; altSwaps: number; lastConf: number | null; avgConf: number | null; confN: number; lastText: string; error: string; secure: boolean; startedAt: number };
export const diag: Diag = { engine: "–", locale: "–", supported: false, results: 0, finals: 0, restarts: 0, altSwaps: 0, lastConf: null, avgConf: null, confN: 0, lastText: "", error: "", secure: true, startedAt: 0 };
export function diagReset(engine: string, locale: string) { Object.assign(diag, { engine, locale, results: 0, finals: 0, restarts: 0, altSwaps: 0, lastConf: null, avgConf: null, confN: 0, lastText: "", error: "", startedAt: Date.now() }); }
export function diagResult(text: string, conf: number | undefined, final: boolean, swapped: boolean) {
  diag.results++; if (final) diag.finals++; if (swapped) diag.altSwaps++; diag.lastText = text;
  if (typeof conf === "number" && conf > 0) { diag.lastConf = conf; diag.avgConf = ((diag.avgConf ?? 0) * diag.confN + conf) / (diag.confN + 1); diag.confN++; }
}
/** restart policy: restart at once after the engine ends (gapless); give up only when it keeps failing right after starting */
export function nextRestart(fastFails: number, ranMs: number): { fastFails: number; giveUp: boolean } {
  const f = ranMs < 400 ? fastFails + 1 : 0;
  return { fastFails: f, giveUp: f >= 6 };
}

// Experimental recitation checker: compares recognised Arabic words with the expected ayah words.
// It checks WORDS only (not tajweed, not makharij). Speech recognition errors will produce false warnings.

const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g; // harakat, quranic marks, tatweel

export function normalizeAr(w: string): string {
  return w
    .replace(MARKS, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627") // آ أ إ ٱ -> ا
    .replace(/\u0649/g, "\u064A") // ى -> ي
    .replace(/\u0629/g, "\u0647") // ة -> ه
    .replace(/\u0624/g, "\u0648") // ؤ -> و
    .replace(/\u0626/g, "\u064A") // ئ -> ي
    .replace(/[^\u0621-\u064A]/g, "");
}
export const words = (t: string) => t.split(/\s+/).map(normalizeAr).filter(Boolean);

function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
export const similarity = (a: string, b: string) => (a || b ? 1 - lev(a, b) / Math.max(a.length, b.length) : 1);

export type WordState = "ok" | "bad" | "missing" | "pending";
export type Result = { states: WordState[]; extra: string[]; matched: number; done: boolean };

/**
 * Align heard words to the expected ayah (word-level edit distance, expected tail is free = "not recited yet").
 * ok: same word (similarity >= threshold); bad: a different word was heard in that place; missing: skipped word; pending: not reached.
 */
export function align(expectedRaw: string[], heardRaw: string[], threshold = 0.72): Result {
  const E = expectedRaw.map(normalizeAr), H = heardRaw.map(normalizeAr).filter(Boolean);
  const n = E.length, m = H.length;
  const D: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) D[i][0] = i;
  for (let j = 1; j <= m; j++) D[0][j] = j;
  const subCost = (i: number, j: number) => { const s = similarity(E[i - 1], H[j - 1]); return s >= threshold ? 0 : 1; };
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + subCost(i, j));
  let bi = 0;
  for (let i = 0; i <= n; i++) if (D[i][m] < D[bi][m]) bi = i;
  // prefer the longest prefix among equal costs (so correct recitation reaches the end)
  for (let i = 0; i <= n; i++) if (D[i][m] === D[bi][m] && i > bi) bi = i;
  const states: WordState[] = new Array(n).fill("pending");
  const extra: string[] = [];
  let i = bi, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + subCost(i, j)) { states[i - 1] = subCost(i, j) === 0 ? "ok" : "bad"; i--; j--; }
    else if (i > 0 && D[i][j] === D[i - 1][j] + 1) { states[i - 1] = "missing"; i--; }
    else { extra.unshift(H[j - 1]); j--; }
  }
  const matched = states.filter((s) => s === "ok").length;
  return { states, extra, matched, done: bi === n && states.every((s) => s === "ok") };
}

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

// Letters that speech recognisers often confuse (and that sound close): cheaper substitution so one such slip is tolerated.
const CONF = new Set(["ذز", "ثس", "ضد", "ظز", "طت", "صس", "قك", "حه", "عا", "غخ", "ءا", "ذد", "ظض"]);
const near = (a: string, b: string) => CONF.has(a + b) || CONF.has(b + a);
function lev(a: string, b: string, nearCost = 0.45): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : near(a[i - 1], b[j - 1]) ? nearCost : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
    }
    prev = cur;
  }
  return prev[n];
}
export const similarity = (a: string, b: string, nearCost = 0.45) => (a || b ? 1 - lev(a, b, nearCost) / Math.max(a.length, b.length) : 1);
/** Word match: very short words (1-2 letters) must be exact, longer ones may differ slightly. */
export const sameBase = (e: string, h: string, threshold = 0.72, nearCost = 0.45) => (e.length <= 2 || h.length <= 2 ? e === h : similarity(e, h, nearCost) >= threshold);

/**
 * Sound-alike skeleton used on Easy: ignores madd length (ا و ي inside a word), alif wasla / assimilated "ال",
 * ghunna / idgham (interior and tanween ن, doubled letters) and merges letters that sound alike (ص ث س, ض ظ ذ ز د, ط ت, ق ك, ح ه ة, ع ء ا, غ خ).
 */
const CLASSES: Record<string, string> = { ص: "س", ث: "س", ض: "د", ظ: "د", ذ: "د", ز: "د", ط: "ت", ق: "ك", ح: "ه", ة: "ه", ع: "ا", ء: "ا", غ: "خ", ش: "ش" };
export function phon(w: string): string {
  let x = w;
  if (x.startsWith("ال") && x.length > 3) x = x.slice(2); else if (x[0] === "ا" && x.length > 2) x = x.slice(1);
  x = Array.from(x).map((c) => CLASSES[c] ?? c).join("");
  const mapped = x;
  x = x[0] + x.slice(1).replace(/[اوي]/g, "");
  if (x.length > 3 && x.endsWith("ن")) x = x.slice(0, -1);
  x = x[0] + x.slice(1).replace(/ن(?=.)/g, "");
  x = x.replace(/(.)\1+/g, "$1");
  return x.length < 2 ? mapped : x;
}
/** sound-alike word match (Easy): equal skeletons, or very close skeletons */
export function phonSame(e: string, h: string): boolean {
  // idgham / ghunna on short nun words (من، عن، إن): the nun is heard assimilated into the next letter
  if (e.length === 2 && e[1] === "ن" && h[0] === e[0] && (h.length === 1 || (h.length === 2 && "يرملو".includes(h[1])))) return true;
  if (e.length <= 2 || h.length <= 2) return e.length === h.length && Array.from(e).every((c, i) => (CLASSES[c] ?? c) === (CLASSES[h[i]] ?? h[i]));
  const a = phon(e), b = phon(h);
  if (a === b) return true;
  return Math.min(a.length, b.length) >= 3 && similarity(a, b, 0.3) >= 0.75;
}

export const same = sameBase;
export type WordState = "ok" | "bad" | "missing" | "pending" | "skip";
export type Level = "easy" | "medium" | "hard";
/** How strict mistake detection is. threshold: word similarity needed; nearCost: price of a look-alike letter (ذ/ز...); delay: how many further words must be heard before a mistake is shown; forgive: isolated skipped words tolerated; extras: extra words lower the score. */
export type AlignOpts = { threshold: number; nearCost: number; delay: number; forgive: number; extras: boolean; phonetic?: boolean; final?: boolean };
export const LEVELS: Record<Level, AlignOpts> = {
  easy: { threshold: 0.55, nearCost: 0.25, delay: 2, forgive: 1, extras: false, phonetic: true },
  medium: { threshold: 0.72, nearCost: 0.45, delay: 1, forgive: 0, extras: false },
  hard: { threshold: 0.86, nearCost: 1, delay: 0, forgive: 0, extras: true },
};
export type Result = { states: WordState[]; extra: string[]; matched: number; done: boolean; score: number; reached: number; used: number };

/**
 * Align heard words to the expected ayah (word-level edit distance; the unrecited expected tail is free = "pending").
 * Handles recogniser word splits/merges (2 heard = 1 expected, 1 heard = 2 expected).
 * ok: same word; bad: a different word was heard there; missing: skipped; pending: not reached yet.
 */
export function align(expectedRaw: string[], heardRaw: string[], optsIn: number | AlignOpts = 0.72): Result {
  const o: AlignOpts = typeof optsIn === "number" ? { ...LEVELS.medium, threshold: optsIn, delay: 0 } : optsIn;
  const threshold = o.threshold, nc = o.nearCost, mt = Math.max(threshold, 0.85); // merges/splits of words need a closer match
  const E = expectedRaw.map(normalizeAr), H = heardRaw.map(normalizeAr).filter(Boolean);
  const n = E.length, m = H.length;
  const same = sameBase; // merges/splits of words use the plain match
  const sub = o.phonetic ? (e: string, h: string, t: number, c: number) => sameBase(e, h, t, c) || phonSame(e, h) : sameBase;
  const INF = 1e9;
  const D: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(INF));
  const B: string[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(""));
  D[0][0] = 0;
  const upd = (i: number, j: number, c: number, b: string) => { if (c < D[i][j]) { D[i][j] = c; B[i][j] = b; } };
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    const d = D[i][j];
    if (d >= INF) continue;
    if (i < n) upd(i + 1, j, d + 1, "del");
    if (j < m) upd(i, j + 1, d + 1, "ins");
    if (i < n && j < m) upd(i + 1, j + 1, d + (sub(E[i], H[j], threshold, nc) ? 0 : 1), "sub");
    if (i < n && j + 1 < m && same(E[i], H[j] + H[j + 1], mt, nc)) upd(i + 1, j + 2, d, "mergeH");
    if (i + 1 < n && j < m && same(E[i] + E[i + 1], H[j], mt, nc)) upd(i + 2, j + 1, d, "mergeE");
  }
  let bi = 0;
  for (let i = 0; i <= n; i++) if (D[i][m] < D[bi][m] || (D[i][m] === D[bi][m] && i > bi)) bi = i;
  const states: WordState[] = new Array(n).fill("pending");
  const extra: string[] = [];
  let i = bi, j = m, used = -1;
  while (i > 0 || j > 0) {
    const b = B[i][j];
    if (used < 0 && b !== "ins") used = j;
    if (b === "sub") { states[i - 1] = sub(E[i - 1], H[j - 1], threshold, nc) ? "ok" : "bad"; i--; j--; }
    else if (b === "mergeH") { states[i - 1] = "ok"; i--; j -= 2; }
    else if (b === "mergeE") { states[i - 1] = "ok"; states[i - 2] = "ok"; i -= 2; j--; }
    else if (b === "del") { states[i - 1] = "missing"; i--; }
    else { extra.unshift(H[j - 1]); j--; }
  }
  if (used < 0) used = 0;
  // mistakes are only shown once enough further words were heard (unless the recitation is finished)
  if (!o.final) for (let k = Math.max(0, bi - o.delay); k < bi; k++) if (states[k] === "bad" || states[k] === "missing") states[k] = "pending";
  // isolated skipped words are forgiven on easy
  if (o.forgive > 0 && states.filter((x) => x === "missing").length <= o.forgive) for (let k = 0; k < n; k++) if (states[k] === "missing") states[k] = "skip";
  const matched = states.filter((x) => x === "ok").length;
  const denom = n + (o.extras ? extra.length : 0);
  return { states, extra, matched, done: bi === n && states.every((x) => x === "ok" || x === "skip"), score: denom ? Math.round((matched / denom) * 100) : 0, reached: bi, used };
}

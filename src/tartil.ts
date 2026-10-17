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
/** expected words, marks kept (the dagger alif etc. is needed to accept the imla'i spelling); align() normalises */
export const words = (t: string) => t.split(/\s+/).filter((w) => normalizeAr(w));

/**
 * Word matching rules (no similarity scoring: a different word or a different consonant letter NEVER passes, at any level).
 *  - all levels: exact match after normalisation (harakat, hamza seats, alef maqsura, ta marbuta), or the imla'i spelling of the Uthmani
 *    word (dagger alif / small waw / small ya written out: الرحمن = الرحمان, ذلك = ذالك).
 *  - Easy only: light tajweed-level variance that never changes a consonant: alif wasla / assimilated "ال", doubled letters (shadda, idgham),
 *    a dropped hamza, ghunna / tanween nun and pausal alif at the end of a word.
 */
const DAGGER: Record<string, string> = { "\u0670": "\u0627", "\u06E5": "\u0648", "\u06E6": "\u064A" };
/** imla'i spelling of an Uthmani word (null when it has no such marks) */
export function spelledOut(raw: string): string | null {
  if (!/[\u0670\u06E5\u06E6]/.test(raw)) return null;
  let out = "";
  for (const ch of raw) out += DAGGER[ch] ?? ch;
  const r = normalizeAr(out);
  return r && r !== normalizeAr(raw) ? r : null;
}
/** Easy-mode skeleton: consonants only change by tajweed phenomena, never by substitution */
export function skeleton(w: string): string {
  let x = w.replace(/\u0621/g, "");
  if (x.startsWith("ال") && x.length > 3) x = x.slice(2); else if (x[0] === "ا" && x.length > 2) x = x.slice(1);
  x = x.replace(/(.)\1+/g, "$1");
  if (x.length > 3 && /[نا]$/.test(x)) x = x.slice(0, -1);
  return x;
}
export const sameBase = (e: string, h: string) => e === h;
export const phon = skeleton;
/** Easy: equal skeletons (both at least 3 letters, so short words stay exact) */
export function phonSame(e: string, h: string): boolean {
  if (e.length < 3 || h.length < 3) return e === h;
  return skeleton(e) === skeleton(h);
}

/** Recognisers write number words as digits ("3" for ثلاثة): a digit token matches an expected word that starts with the number word's stem. */
const NUM_STEMS: Record<string, string[]> = {
  "1": ["واحد", "احد"], "2": ["اثن", "ثنت", "اثنا"], "3": ["ثلث", "ثلاث"], "4": ["اربع"], "5": ["خمس"], "6": ["ست", "سدس"], "7": ["سبع"], "8": ["ثمن", "ثماني"], "9": ["تسع"], "10": ["عشر"],
  "20": ["عشرين"], "30": ["ثلثين", "ثلاثين"], "40": ["اربعين"], "50": ["خمسين"], "60": ["ستين"], "70": ["سبعين"], "80": ["ثمنين", "ثمانين"], "90": ["تسعين"], "99": ["تسع"], "100": ["ماية", "مايه", "مائه", "مائة", "ماءه"], "1000": ["الف"],
};
const ARDIG = "٠١٢٣٤٥٦٧٨٩";
/** normalised heard token: digit tokens become "#<latin digits>" (never lost to normalisation) */
export function normHeard(w: string): string {
  if (/^[0-9\u0660-\u0669]+$/.test(w)) return "#" + w.replace(/[\u0660-\u0669]/g, (d) => String(ARDIG.indexOf(d)));
  return normalizeAr(w);
}
export function numberMatches(expected: string, h: string): boolean {
  if (h[0] !== "#") return false;
  const e = expected.replace(/^[وفبل]?(ال)?/, "");
  return (NUM_STEMS[h.slice(1)] ?? []).some((st) => e.startsWith(st) || expected.includes(st));
}

export type WordState = "ok" | "bad" | "missing" | "pending" | "skip";
export type Level = "easy" | "medium" | "hard";
/** How strict mistake detection is. delay: how many further words must be heard before a mistake is shown; forgive: isolated skipped words tolerated; extras: extra words lower the score; phonetic: light tajweed-level variance (Easy only). Word matching itself never accepts a different word or letter. */
export type AlignOpts = { delay: number; forgive: number; extras: boolean; phonetic?: boolean; final?: boolean };
export const LEVELS: Record<Level, AlignOpts> = {
  easy: { delay: 2, forgive: 1, extras: false, phonetic: true },
  medium: { delay: 1, forgive: 0, extras: false },
  hard: { delay: 0, forgive: 0, extras: true },
};
export type Result = { states: WordState[]; extra: string[]; matched: number; done: boolean; score: number; reached: number; used: number; partial: boolean };

/**
 * Align heard words to the expected ayah (word-level edit distance; the unrecited expected tail is free = "pending").
 * Handles recogniser word splits/merges (2 heard = 1 expected, 1 heard = 2 expected).
 * ok: same word; bad: a different word was heard there; missing: skipped; pending: not reached yet.
 */
export function align(expectedRaw: string[], heardRaw: string[], optsIn: AlignOpts = LEVELS.medium): Result {
  const o: AlignOpts = optsIn;
  const E = expectedRaw.map(normalizeAr), H = heardRaw.map(normHeard).filter(Boolean);
  const n = E.length, m = H.length;
  const ALT = expectedRaw.map(spelledOut);
  const eq = (i: number, h: string) => E[i] === h || ALT[i] === h || numberMatches(E[i], h) || (!!ALT[i] && numberMatches(ALT[i]!, h)) || (!!o.phonetic && (phonSame(E[i], h) || (!!ALT[i] && phonSame(ALT[i]!, h))));
  // a recogniser may still be writing the newest word: a proper prefix of the expected word is "in progress", not a mistake (interim results only)
  const part = (i: number, j: number) => !o.final && j === m - 1 && H[j].length >= 1 && H[j][0] !== "#" && [E[i], ALT[i]].some((x) => !!x && x.length > H[j].length && x.startsWith(H[j]));
  const eqCat = (i: number, h: string) => E[i] === h || ALT[i] === h; // recogniser split / merged words: same letters only
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
    if (i < n && j < m) upd(i + 1, j + 1, d + (eq(i, H[j]) || part(i, j) ? 0 : 1), "sub");
    if (j > 0 && j < m && H[j] === H[j - 1]) upd(i, j + 1, d, "dup"); // the recogniser repeated the previous word: ignored
    if (i < n && j + 1 < m && eqCat(i, H[j] + H[j + 1])) upd(i + 1, j + 2, d, "mergeH");
    if (i + 1 < n && j < m && [E[i] + E[i + 1], (ALT[i] ?? E[i]) + (ALT[i + 1] ?? E[i + 1])].includes(H[j])) upd(i + 2, j + 1, d, "mergeE");
  }
  let bi = 0;
  for (let i = 0; i <= n; i++) if (D[i][m] < D[bi][m] || (D[i][m] === D[bi][m] && i > bi)) bi = i;
  const states: WordState[] = new Array(n).fill("pending");
  const extra: string[] = [];
  let i = bi, j = m, used = -1, partial = false;
  while (i > 0 || j > 0) {
    const b = B[i][j];
    if (used < 0 && b !== "ins" && b !== "dup") used = j;
    if (b === "dup") { j--; }
    else if (b === "sub") { states[i - 1] = eq(i - 1, H[j - 1]) ? "ok" : part(i - 1, j - 1) ? "pending" : "bad"; if (part(i - 1, j - 1) && !eq(i - 1, H[j - 1])) partial = true; i--; j--; }
    else if (b === "mergeH") { states[i - 1] = "ok"; i--; j -= 2; }
    else if (b === "mergeE") { states[i - 1] = "ok"; states[i - 2] = "ok"; i -= 2; j--; }
    else if (b === "del") { states[i - 1] = "missing"; i--; }
    else { extra.unshift(H[j - 1]); j--; }
  }
  if (used < 0) used = 0;
  // mistakes are only shown once enough further words were heard (unless the recitation is finished)
  if (!o.final) for (let k = Math.max(0, bi - o.delay); k < bi; k++) if (states[k] === "bad" || states[k] === "missing") states[k] = "pending";
  // isolated skipped words are forgiven on easy
  // (only 1-2 letter particles: a recogniser drops و / في / من, never a content word)
  if (o.forgive > 0 && states.filter((x) => x === "missing").length <= o.forgive && states.every((x, k) => x !== "missing" || E[k].length <= 2)) for (let k = 0; k < n; k++) if (states[k] === "missing") states[k] = "skip";
  const matched = states.filter((x) => x === "ok").length;
  const denom = n + (o.extras ? extra.length : 0);
  return { states, extra, matched, done: bi === n && states.every((x) => x === "ok" || x === "skip"), score: denom ? Math.round((matched / denom) * 100) : 0, reached: bi, used, partial };
}

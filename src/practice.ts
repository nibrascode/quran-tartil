/** Pure practice logic: weak words from recitation mistakes + hifz (memorisation) spaced repetition (Leitner boxes). */
export type Mistake = { key: string; word: string; n: number };
export type Weak = { key: string; word: string; n: number; last: string };
export type Card = { box: number; due: string; reps: number; lapses: number };
export type Hifz = Record<string, Card>;

export const INTERVALS = [0, 1, 2, 4, 8, 16, 32, 64]; // days per box
export const PASS_SCORE = 80; // ayah score (%) that counts as remembered
const MAX_WEAK = 200;

export const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + n));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
};

/** merge a session's mistakes into the persistent weak-word list (most recent / most frequent first, capped) */
export function mergeWeak(weak: Weak[], ev: Mistake[], today: string): Weak[] {
  const m = new Map(weak.map((w) => [w.key + "|" + w.word, { ...w }]));
  for (const e of ev) {
    const id = e.key + "|" + e.word, x = m.get(id);
    if (x) { x.n += e.n; x.last = today; } else m.set(id, { key: e.key, word: e.word, n: e.n, last: today });
  }
  return [...m.values()].sort((a, b) => (a.last < b.last ? 1 : a.last > b.last ? -1 : b.n - a.n)).slice(0, MAX_WEAK);
}
/** a clean pass of an ayah clears its weak words */
export const clearWeak = (weak: Weak[], key: string): Weak[] => weak.filter((w) => w.key !== key);
/** distinct ayahs with weak words, worst first */
export function weakAyahs(weak: Weak[]): string[] {
  const t = new Map<string, number>();
  for (const w of weak) t.set(w.key, (t.get(w.key) || 0) + w.n);
  return [...t.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

export const addCards = (h: Hifz, keys: string[], today: string): Hifz => {
  const r = { ...h };
  for (const k of keys) if (!r[k]) r[k] = { box: 0, due: today, reps: 0, lapses: 0 };
  return r;
};
export const removeCard = (h: Hifz, key: string): Hifz => { const r = { ...h }; delete r[key]; return r; };
/** grade one review: pass moves up a box, fail drops back to box 1 (due tomorrow-ish) */
export function review(h: Hifz, key: string, score: number, today: string): Hifz {
  const c = h[key]; if (!c) return h;
  const ok = score >= PASS_SCORE;
  const box = ok ? Math.min(INTERVALS.length - 1, c.box + 1) : Math.min(1, c.box);
  return { ...h, [key]: { box, due: addDays(today, ok ? INTERVALS[box] : 0), reps: c.reps + 1, lapses: c.lapses + (ok ? 0 : 1) } };
}
/** cards due today or earlier, oldest due first (then lowest box) */
export const dueKeys = (h: Hifz, today: string): string[] =>
  Object.entries(h).filter(([, c]) => c.due <= today).sort((a, b) => (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : a[1].box - b[1].box)).map(([k]) => k);
export const hifzStats = (h: Hifz, today: string) => ({ total: Object.keys(h).length, due: dueKeys(h, today).length, learned: Object.values(h).filter((c) => c.box >= 4).length });

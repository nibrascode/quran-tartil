import type { Weak, Hifz } from "./practice";
const PAGES = 604; // Madinah mushaf

export type Bookmark = { s: number; a: number; page: number; ts: number };
export type Settings = {
  bookmarks: Bookmark[];
  visited: number[]; // pages read in the current khatm
  khatms: number;
  days: Record<string, number>; // yyyy-mm-dd -> distinct pages read that day
  dayPages: number[]; // pages counted today
  today: string;
  goal: number; // pages per day
  reminder: { on: boolean; h: number; m: number };
  onboarded: boolean;
  weak: Weak[]; // words got wrong while reciting
  hifz: Hifz; // memorization cards (spaced repetition)
  prefs: Prefs;
};
export type Prefs = {
  fontScale: number; // 0.8 .. 1 (1 = fill the page as much as possible)
  flip: "flip" | "none";
  keepAwake: boolean;
  recLang: "ar-SA" | "ar-EG" | "ar-AE" | "ar-MA";
  strict: "easy" | "medium" | "hard";
  haptics: boolean;
  repeat: number; // ayah repeat count (1..10)
  hide: boolean; // hide-ayahs mode: text hidden, only the ayah markers stay; words appear as they are recited
};
export const defaultPrefs = (): Prefs => ({ fontScale: 1, flip: "flip", keepAwake: false, recLang: "ar-SA", strict: "medium", hide: false, haptics: true, repeat: 3 });
export const KEY = "qt.v2";
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const defaults = (): Settings => ({ bookmarks: [], visited: [], khatms: 0, days: {}, dayPages: [], today: dayKey(), goal: 2, reminder: { on: false, h: 20, m: 0 }, onboarded: false, weak: [], hifz: {}, prefs: defaultPrefs() });

export function load(): Settings {
  try { const j = JSON.parse(localStorage.getItem(KEY) || "{}"); const pr = { ...defaultPrefs(), ...(j.prefs || {}) } as Prefs; pr.strict = (({ lenient: "easy", normal: "medium", strict: "hard" } as Record<string, Prefs["strict"]>)[pr.strict as string] ?? pr.strict) as Prefs["strict"]; return { ...defaults(), ...j, prefs: pr }; } catch { return defaults(); }
}

/** Pure: mark a page as read (khatm + daily). */
export function markRead(st: Settings, page: number, now = new Date()): Settings {
  const today = dayKey(now);
  let s = { ...st };
  if (s.today !== today) s = { ...s, today, dayPages: [] };
  if (!s.dayPages.includes(page)) {
    s.dayPages = [...s.dayPages, page];
    const days = { ...s.days, [today]: s.dayPages.length };
    const keys = Object.keys(days).sort().slice(-90);
    s.days = Object.fromEntries(keys.map((k) => [k, days[k]]));
  }
  if (!s.visited.includes(page)) {
    s.visited = [...s.visited, page];
    if (s.visited.length >= PAGES) { s.khatms += 1; s.visited = []; }
  }
  return s;
}
/** Consecutive days (ending today or yesterday) with at least `goal` pages. */
export function streak(st: Settings, now = new Date()): number {
  let n = 0;
  const d = new Date(now);
  const met = (k: string) => (st.days[k] || 0) >= st.goal;
  if (!met(dayKey(d))) d.setDate(d.getDate() - 1);
  while (met(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export const toggleBookmark = (st: Settings, b: Omit<Bookmark, "ts">): Settings => {
  const has = st.bookmarks.some((x) => x.s === b.s && x.a === b.a);
  return { ...st, bookmarks: has ? st.bookmarks.filter((x) => !(x.s === b.s && x.a === b.a)) : [{ ...b, ts: Date.now() }, ...st.bookmarks] };
};


import type { Settings, Bookmark } from "./storeLogic";
import type { Weak, Hifz } from "./practice";

export const BACKUP_APP = "quran-tartil";
export type Backup = { app: string; version: 1; exportedAt: string; bookmarks: Bookmark[]; visited: number[]; khatms: number; days: Record<string, number>; goal: number; weak: Weak[]; hifz: Hifz };

export function exportBackup(st: Settings, now = new Date()): Backup {
  return { app: BACKUP_APP, version: 1, exportedAt: now.toISOString(), bookmarks: st.bookmarks, visited: st.visited, khatms: st.khatms, days: st.days, goal: st.goal, weak: st.weak, hifz: st.hifz };
}
const isInt = (n: unknown, lo: number, hi: number): n is number => typeof n === "number" && Number.isInteger(n) && n >= lo && n <= hi;
const keyOk = (k: unknown): k is string => typeof k === "string" && /^\d{1,3}:\d{1,3}$/.test(k) && isInt(+k.split(":")[0], 1, 114) && isInt(+k.split(":")[1], 1, 286);

/** Validates a backup file; returns null when it is not one. Invalid entries are dropped, never trusted. */
export function parseBackup(text: string): Backup | null {
  let j: any;
  try { j = JSON.parse(text); } catch { return null; }
  if (!j || j.app !== BACKUP_APP || j.version !== 1) return null;
  const bookmarks: Bookmark[] = (Array.isArray(j.bookmarks) ? j.bookmarks : []).filter((b: any) => b && isInt(b.s, 1, 114) && isInt(b.a, 1, 286) && isInt(b.page, 1, 604)).map((b: any) => ({ s: b.s, a: b.a, page: b.page, ts: typeof b.ts === "number" ? b.ts : 0 }));
  const visited: number[] = [...new Set((Array.isArray(j.visited) ? j.visited : []).filter((p: unknown) => isInt(p, 1, 604)) as number[])];
  const days: Record<string, number> = {};
  if (j.days && typeof j.days === "object") for (const [k, v] of Object.entries(j.days)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && isInt(v, 0, 604)) days[k] = v as number;
  const weak: Weak[] = (Array.isArray(j.weak) ? j.weak : []).filter((w: any) => w && keyOk(w.key) && typeof w.word === "string" && w.word.length < 40 && isInt(w.n, 1, 100000)).map((w: any) => ({ key: w.key, word: w.word, n: w.n, last: typeof w.last === "string" ? w.last.slice(0, 10) : "1970-01-01" }));
  const hifz: Hifz = {};
  if (j.hifz && typeof j.hifz === "object") for (const [k, c] of Object.entries<any>(j.hifz)) if (keyOk(k) && c && isInt(c.box, 0, 7) && typeof c.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.due) && isInt(c.reps, 0, 1e6) && isInt(c.lapses, 0, 1e6)) hifz[k] = { box: c.box, due: c.due, reps: c.reps, lapses: c.lapses };
  return { app: BACKUP_APP, version: 1, exportedAt: typeof j.exportedAt === "string" ? j.exportedAt : "", bookmarks, visited, khatms: isInt(j.khatms, 0, 10000) ? j.khatms : 0, days, goal: isInt(j.goal, 1, 604) ? j.goal : 2, weak, hifz };
}

/** Merge a backup into the current state without losing anything on either side. */
export function mergeBackup(st: Settings, b: Backup): Settings {
  const seen = new Set(st.bookmarks.map((x) => x.s + ":" + x.a));
  const bookmarks = [...st.bookmarks, ...b.bookmarks.filter((x) => !seen.has(x.s + ":" + x.a))].sort((a, c) => c.ts - a.ts);
  const days = { ...st.days }; for (const [k, v] of Object.entries(b.days)) days[k] = Math.max(days[k] || 0, v);
  const w = new Map(st.weak.map((x) => [x.key + "|" + x.word, x]));
  for (const x of b.weak) { const o = w.get(x.key + "|" + x.word); w.set(x.key + "|" + x.word, o ? { ...o, n: Math.max(o.n, x.n), last: o.last > x.last ? o.last : x.last } : x); }
  const hifz: Hifz = { ...st.hifz };
  for (const [k, c] of Object.entries(b.hifz)) if (!hifz[k] || c.reps > hifz[k].reps) hifz[k] = c;
  return { ...st, bookmarks, visited: [...new Set([...st.visited, ...b.visited])].sort((a, c) => a - c), khatms: Math.max(st.khatms, b.khatms), days, weak: [...w.values()], hifz };
}

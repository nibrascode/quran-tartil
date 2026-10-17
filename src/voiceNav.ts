import { normalizeAr, phonSame, spelledOut } from "./tartil";

/** Flattened Quran words for "which ayah is this?" voice navigation. */
export type NavIndex = { words: string[]; alt: (string | null)[]; ayah: number[]; off: number[]; keys: string[]; first: Map<string, number[]> };
export type NavAyah = { s: number; a: number; tokens: string[] };
export type NavMatch = { s: number; a: number; page: number; score: number; offset: number };

const skel = (w: string) => w.replace(/(.)\1+/g, "$1");
export function buildNavIndex(list: NavAyah[]): NavIndex {
  const idx: NavIndex = { words: [], alt: [], ayah: [], off: [], keys: [], first: new Map() };
  list.forEach((x, i) => {
    idx.keys.push(x.s + ":" + x.a);
    let o = 0;
    for (const raw of x.tokens) {
      const n = normalizeAr(raw); if (!n) continue;
      const at = idx.words.length;
      idx.words.push(n); idx.alt.push(spelledOut(raw)); idx.ayah.push(i); idx.off.push(o++);
      for (const f of new Set([skel(n), ...(idx.alt[at] ? [skel(idx.alt[at]!)] : [])])) { const l = idx.first.get(f); if (l) l.push(at); else idx.first.set(f, [at]); }
    }
  });
  return idx;
}
const wordEq = (idx: NavIndex, at: number, h: string) => idx.words[at] === h || idx.alt[at] === h || (h.length >= 3 && idx.words[at].length >= 3 && phonSame(idx.words[at], h));

/**
 * Finds where in the whole Quran the heard words start (diacritic-insensitive; matching continues across ayah boundaries, so
 * repeated phrases are told apart by the words that follow). Only ayah beginnings are candidates (that is where a reciter starts).
 * Ties are broken by closeness to the current page, then by order.
 */
export function locateAyah(idx: NavIndex, heardRaw: string[], pageOfAyahIndex: (i: number) => number, curPage: number, ayahInfo: (i: number) => { s: number; a: number }): { best: NavMatch | null; second: number; ambiguous: boolean } {
  const H = heardRaw.map(normalizeAr).filter(Boolean);
  if (!H.length) return { best: null, second: 0, ambiguous: false };
  const cands = new Set<number>([...(idx.first.get(skel(H[0])) ?? [])]);
  // recogniser spellings that differ in the first word: also try words with an equal consonant skeleton is too costly; exact skeleton only
  const res: { at: number; score: number; page: number }[] = [];
  for (const at of cands) {
    if (idx.off[at] !== 0) continue;
    let k = 0;
    while (k < H.length && at + k < idx.words.length && wordEq(idx, at + k, H[k])) k++;
    if (k > 0) res.push({ at, score: k, page: pageOfAyahIndex(idx.ayah[at]) });
  }
  if (!res.length) return { best: null, second: 0, ambiguous: false };
  res.sort((x, y) => y.score - x.score || Math.abs(x.page - curPage) - Math.abs(y.page - curPage) || x.at - y.at);
  const top = res[0], tied = res.filter((r) => r.score === top.score).length;
  const info = ayahInfo(idx.ayah[top.at]);
  return { best: { s: info.s, a: info.a, page: top.page, score: top.score, offset: 0 }, second: res.length > tied ? res[tied].score : 0, ambiguous: tied > 1 };
}

/** Decision rule while words keep arriving: jump as soon as one candidate clearly leads (>= 3 words). Identical openings (e.g. 2:255 and 3:2) wait for the words that tell them apart; after 12 words the nearest page wins. */
export function decideNav(heardCount: number, r: { best: NavMatch | null; ambiguous: boolean }): "wait" | "go" | "giveup" {
  if (!r.best) return heardCount >= 8 ? "giveup" : "wait";
  if (r.best.score >= 3 && !r.ambiguous) return "go";
  if (r.best.score >= 3 && heardCount >= 12) return "go";
  return heardCount >= (r.best.score >= 3 ? 12 : 9) ? "giveup" : "wait";
}

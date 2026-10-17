import raw from "./data/quran-uthmani.txt?raw";
import meta from "./data/meta.json";

export type Sura = { i: number; ayas: number; name: string; tname: string; ename: string; type: string };
export type Ayah = { s: number; a: number; t: string };
export const suras = meta.suras as Sura[];
export const PAGES = meta.pages.length; // 604 (Madinah mushaf)

// Tanzil file lines look like "sura|aya|text"; "#" lines are the license block (kept verbatim in the bundle, shown in About).
export const ayahs: Ayah[] = [];
for (const line of raw.split("\n")) {
  const m = /^(\d+)\|(\d+)\|(.*)$/.exec(line);
  if (m) ayahs.push({ s: +m[1], a: +m[2], t: m[3].trim() });
}
export const LICENSE_BLOCK = raw.split("\n").filter((l) => l.startsWith("#")).map((l) => l.replace(/^#\s?/, "")).join("\n").trim();

// The basmala is taken verbatim from Tanzil (1:1) so that the prefix match is exact.
export const BISMILLAH = ayahs[0].t;

const bare = (w: string) => w.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
/** Drops the 4-word basmala prefix (compared without diacritics: Tanzil 95:1 carries a slightly different mark order). */
export function stripBasmala(t: string): string {
  const w = t.split(" ");
  const b = BISMILLAH.split(" ");
  if (w.length > 4 && b.every((x, i) => bare(x) === bare(w[i]))) return w.slice(4).join(" ").trim();
  return t;
}

const suraStart: number[] = [];
ayahs.forEach((x, i) => { if (x.a === 1) suraStart[x.s] = i; });
export const indexOf = (s: number, a: number) => suraStart[s] + a - 1;

const pageStart = meta.pages.map(([s, a]) => indexOf(s, a));
const juzStart = meta.juz.map(([s, a]) => indexOf(s, a));

export function pageOfIndex(i: number): number {
  let lo = 0, hi = PAGES - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (pageStart[mid] <= i) lo = mid; else hi = mid - 1; }
  return lo + 1;
}
export const pageOfAyah = (s: number, a: number) => pageOfIndex(indexOf(s, a));
export const pageOfJuz = (j: number) => pageOfIndex(juzStart[j - 1]);
export function juzOfPage(p: number): number {
  const i = pageStart[p - 1];
  let j = 0;
  while (j + 1 < juzStart.length && juzStart[j + 1] <= i) j++;
  return j + 1;
}

export type Item =
  | { k: "head"; sura: Sura }
  | { k: "bism" }
  | { k: "ayah"; s: number; a: number; text: string };

/** Ayahs of a page, in order. Tanzil prefixes the first ayah of every sura (except 1 and 9) with the basmala; it is shown as its own line. */
export function pageItems(p: number): Item[] {
  const from = pageStart[p - 1];
  const to = p < PAGES ? pageStart[p] : ayahs.length;
  const out: Item[] = [];
  for (let i = from; i < to; i++) {
    const x = ayahs[i];
    let text = x.t;
    if (x.a === 1) {
      out.push({ k: "head", sura: suras[x.s - 1] });
      if (x.s !== 1 && x.s !== 9) {
        text = stripBasmala(text);
        out.push({ k: "bism" });
      }
    }
    if (text) out.push({ k: "ayah", s: x.s, a: x.a, text });
  }
  return out;
}
export function firstSuraOfPage(p: number): Sura {
  const i = pageStart[p - 1];
  return suras[ayahs[i].s - 1];
}
export const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);

import { ayahs, pageOfAyah, stripBasmala } from "./quran";
import { normalizeAr, words } from "./tartil";

export type Hit = { s: number; a: number; page: number; text: string };
let index: string[] | null = null;
const build = () => (index ??= ayahs.map((x) => words(x.a === 1 && x.s !== 1 && x.s !== 9 ? stripBasmala(x.t) : x.t).map(normalizeAr).join(" ")));

/** Diacritic-insensitive Arabic search; "2:255" jumps to a reference. Query words must all appear (in any order) in the ayah. */
export function search(q: string, limit = 80): Hit[] {
  const ref = /^\s*(\d{1,3})\s*[:\-.]\s*(\d{1,3})\s*$/.exec(q.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
  if (ref) {
    const i = ayahs.findIndex((x) => x.s === +ref[1] && x.a === +ref[2]);
    return i >= 0 ? [{ s: ayahs[i].s, a: ayahs[i].a, page: pageOfAyah(ayahs[i].s, ayahs[i].a), text: ayahs[i].t }] : [];
  }
  const terms = q.split(/\s+/).map(normalizeAr).filter((w) => w.length > 0);
  if (!terms.length || terms.join("").length < 2) return [];
  const idx = build();
  const out: Hit[] = [];
  for (let i = 0; i < idx.length && out.length < limit; i++) {
    const h = idx[i];
    if (terms.every((t) => h.includes(t))) out.push({ s: ayahs[i].s, a: ayahs[i].a, page: pageOfAyah(ayahs[i].s, ayahs[i].a), text: ayahs[i].t });
  }
  return out;
}

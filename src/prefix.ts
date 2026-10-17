import { normalizeAr, phonSame } from "./tartil";

/** Words that are never a mistake when spoken before reciting: isti'adha (always ignored) and the basmala (ignored unless it is part of the expected text). */
export const ISTIADHA = ["اعوذ", "بالله", "من", "الشيطان", "الرجيم"].map(normalizeAr);
export const BASMALA = ["بسم", "الله", "الرحمن", "الرحيم"].map(normalizeAr);
const eq = (h: string, e: string) => h === e || (h.length >= 3 && e.length >= 3 && phonSame(e, h));

/**
 * Length of the isti'adha / basmala prefix at the start of `heard` (partial phrases count while they are still being spoken).
 * `expectedFirst`: first expected word of the ayah being recited; when it is "بسم" (Fatiha 1:1) the basmala is part of the text and is kept.
 */
export function ignoredPrefix(heard: string[], expectedFirst = ""): number {
  const H = heard.map(normalizeAr).filter(Boolean);
  let pos = 0;
  if (H.length && eq(H[0], ISTIADHA[0])) {
    let k = 0;
    while (k < ISTIADHA.length && pos < H.length && (eq(H[pos], ISTIADHA[k]) || (k === 2 && H[pos] === "ومن"))) { pos++; k++; }
  }
  if (normalizeAr(expectedFirst).startsWith("بسم")) return pos; // the basmala is expected text here
  if (pos < H.length && eq(H[pos], BASMALA[0])) {
    let k = 0, p = pos;
    // a lone "الله" after "بسم" etc. must follow in order
    while (k < BASMALA.length && p < H.length && eq(H[p], BASMALA[k])) { p++; k++; }
    pos = p;
  }
  return pos;
}

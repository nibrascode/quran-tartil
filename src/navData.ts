import { ayahs, stripBasmala, pageOfIndex } from "./quran";
import { buildNavIndex, type NavIndex } from "./voiceNav";

let cache: NavIndex | null = null;
/** whole-Quran word index for voice navigation (built once, on first use) */
export const navIndex = (): NavIndex => (cache ??= buildNavIndex(ayahs.map((x) => ({ s: x.s, a: x.a, tokens: (x.a === 1 ? stripBasmala(x.t) : x.t).split(" ").filter(Boolean) }))));
export const navPageOf = (i: number) => pageOfIndex(i);
export const navInfo = (i: number) => ({ s: ayahs[i].s, a: ayahs[i].a });

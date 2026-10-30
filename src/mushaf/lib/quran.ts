import meta from "@/data/meta.json";

export type Mark = { n: number };
export type Head = { h: number };
export type Basmala = { b: 1 };
export type Chunk = string | Mark | Head | Basmala;

export type PageData = {
  s: number;
  a: number;
  j: number;
  b: 0 | 1;
  lines: Chunk[][];
};

export type SurahMeta = {
  n: number;
  az: string;
  ar: string;
  page: number;
  ayahs: number;
};

export const SURAHS = meta.surahs as SurahMeta[];
export const JUZ_PAGES = meta.juzPages as number[];
export const PAGE_COUNT = 604;

const MADANI = new Set([
  2, 3, 4, 5, 8, 9, 13, 22, 24, 33, 47, 48, 49, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 98, 99, 110,
]);

export function isMadani(n: number): boolean {
  return MADANI.has(n);
}

const EAST = "٠١٢٣٤٥٦٧٨٩";

export function eastern(n: number): string {
  return String(n).replace(/\d/g, (d) => EAST[Number(d)] ?? d);
}

export function surah(n: number): SurahMeta {
  return SURAHS[n - 1] ?? SURAHS[0];
}

export function isMark(c: Chunk): c is Mark {
  return typeof c === "object" && c !== null && "n" in c;
}
export function isHead(c: Chunk): c is Head {
  return typeof c === "object" && c !== null && "h" in c;
}
export function isBasmala(c: Chunk): c is Basmala {
  return typeof c === "object" && c !== null && "b" in c;
}

const loaders = import.meta.glob("../data/pages/p*.json") as Record<
  string,
  () => Promise<{ default: PageData }>
>;

const cache = new Map<number, PageData>();
const inflight = new Map<number, Promise<PageData>>();

export function peekPage(n: number): PageData | null {
  return cache.get(n) ?? null;
}

export function loadPage(n: number): Promise<PageData> {
  const hit = cache.get(n);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(n);
  if (pending) return pending;
  const key = `../data/pages/p${n}.json`;
  const loader = loaders[key];
  if (!loader) return Promise.reject(new Error(`Səhifə ${n} tapılmadı`));
  const p = loader().then((mod) => {
    cache.set(n, mod.default);
    inflight.delete(n);
    return mod.default;
  });
  inflight.set(n, p);
  return p;
}

export function prefetch(n: number) {
  if (n < 1 || n > PAGE_COUNT || cache.has(n) || inflight.has(n)) return;
  void loadPage(n).catch(() => {});
}

const STORE_PAGE = "meshef-page";
const STORE_MARKS = "meshef-marks";

export function readSavedPage(): number {
  if (typeof window === "undefined") return 1;
  const hash = Number(window.location.hash.replace(/\D/g, ""));
  if (hash >= 1 && hash <= PAGE_COUNT) return hash;
  const saved = Number(window.localStorage.getItem(STORE_PAGE));
  if (saved >= 1 && saved <= PAGE_COUNT) return saved;
  return 1;
}

export function rememberPage(n: number) {
  try {
    window.localStorage.setItem(STORE_PAGE, String(n));
    const url = new URL(window.location.href);
    url.hash = String(n);
    window.history.replaceState(null, "", url);
  } catch {
    /* private mode */
  }
}

export function readMarks(): number[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORE_MARKS) || "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.filter((n) => typeof n === "number" && n >= 1 && n <= PAGE_COUNT);
  } catch {
    return [];
  }
}

export function writeMarks(marks: number[]) {
  window.localStorage.setItem(STORE_MARKS, JSON.stringify(marks));
}

export function fold(s: string): string {
  return s
    .toLocaleLowerCase("az")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/â|á/g, "a")
    .replace(/î|í/g, "i")
    .replace(/û|ú/g, "u")
    .replace(/[أإآٱ]/g, "ا");
}

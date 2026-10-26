// On-device translations and tafsirs, downloaded only when the user taps "Download" in Settings.
// Stored in IndexedDB per surah (resumable, deletable). Nothing is bundled into the reader.
import { suras } from "./quran";

export type Res = { id: string; kind: "tr" | "tf"; name: string; by: string; lang: "ru" | "az" | "ar"; size: string; src: string; qc?: number };
export const RESOURCES: Res[] = [
  { id: "az.musayev", kind: "tr", name: "Azərbaycanca", by: "Əlixan Musayev", lang: "az", size: "≈ 0.9 MB", src: "Tanzil.net (az.musayev)" },
  { id: "ru.kuliev", kind: "tr", name: "Русский", by: "Эльмир Кулиев", lang: "ru", size: "≈ 1.4 MB", src: "Tanzil.net (ru.kuliev)" },
  { id: "saadi", kind: "tf", name: "تيسير الكريم الرحمن", by: "السعدي", lang: "ar", size: "≈ 8 MB", src: "Quran.com API (tafsir 91)", qc: 91 },
  { id: "muyassar", kind: "tf", name: "التفسير الميسر", by: "مجمع الملك فهد", lang: "ar", size: "≈ 2 MB", src: "Quran.com API (tafsir 16)", qc: 16 },
  { id: "ibnkathir", kind: "tf", name: "تفسير ابن كثير", by: "ابن كثير", lang: "ar", size: "≈ 45 MB", src: "Quran.com API (tafsir 14)", qc: 14 },
];

let dbp: Promise<IDBDatabase> | null = null;
const db = () => (dbp ||= new Promise((ok, no) => { const r = indexedDB.open("qt-lib", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }));
async function tx<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const d = await db();
  return new Promise((ok, no) => { const t = d.transaction("kv", mode); const r = f(t.objectStore("kv")); t.oncomplete = () => ok(r ? r.result : undefined); t.onerror = () => no(t.error); });
}
const get = <T,>(k: string) => tx<T>("readonly", (s) => s.get(k) as IDBRequest<T>);
const put = (k: string, v: unknown) => tx("readwrite", (s) => { s.put(v, k); });

/** html from the API -> plain text with paragraphs (never injected as HTML) */
export function toText(html: string): string {
  return html.replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|div|h\d|li)>/gi, "\n\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function status(id: string): Promise<number> { return (await get<number>(id + ":n")) || 0; } // surahs stored (114 = complete)

const running = new Map<string, { stop: boolean }>();
export async function download(r: Res, onProgress: (n: number) => void): Promise<void> {
  const ctl = { stop: false }; running.set(r.id, ctl);
  try {
    if (r.kind === "tr") {
      const res = await fetch(new URL("tr/" + r.id + ".json", document.baseURI).href);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const j = (await res.json()) as { v: string[][] };
      for (let s = 1; s <= 114; s++) await put(r.id + ":" + s, j.v[s - 1]);
      await put(r.id + ":n", 114); onProgress(114); return;
    }
    let n = await status(r.id);
    for (let s = n + 1; s <= 114; s++) {
      if (ctl.stop) throw new Error("stopped");
      const out: string[] = new Array(suras[s - 1].ayas).fill("");
      for (let p = 1, last = 1; p <= last; p++) {
        const res = await fetch(`https://api.quran.com/api/v4/tafsirs/${r.qc}/by_chapter/${s}?per_page=50&page=${p}`);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const j = await res.json() as { tafsirs: { verse_key: string; text: string }[]; pagination: { total_pages: number } };
        last = j.pagination.total_pages || 1;
        for (const t of j.tafsirs) { const a = +t.verse_key.split(":")[1]; if (a >= 1 && a <= out.length) out[a - 1] = toText(t.text || ""); }
      }
      await put(r.id + ":" + s, out); await put(r.id + ":n", s); n = s; onProgress(s);
    }
  } finally { running.delete(r.id); }
}
export const stop = (id: string) => { const c = running.get(id); if (c) c.stop = true; };
export async function remove(id: string) { await tx("readwrite", (s) => { s.delete(IDBKeyRange.bound(id + ":", id + ":\uffff")); }); }

/** text for one ayah; a tafsir entry may cover several ayahs (Ibn Kathir): then the shared entry and its range are returned */
export async function entry(id: string, s: number, a: number): Promise<{ text: string; from: number; to: number } | null> {
  const v = await get<string[]>(id + ":" + s);
  if (!v) return null;
  let from = a; while (from > 1 && !v[from - 1]) from--;
  if (!v[from - 1]) return { text: "", from: a, to: a };
  let to = from; while (to < v.length && !v[to]) to++;
  return { text: v[from - 1], from, to };
}

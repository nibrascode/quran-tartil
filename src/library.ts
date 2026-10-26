import { Capacitor } from "@capacitor/core";
// On-device translations and tafsirs, downloaded only when the user taps "Download" in Settings.
// Stored in IndexedDB per surah (resumable, deletable). Nothing is bundled into the reader.
import { suras } from "./quran";

import TR from "./data/translations.json";

/** translations: Tanzil (Musayev, Kuliev: one file) and QuranEnc.com (unaltered text + footnotes, per surah: public/tr/<key>/<s>.json).
 * lname = the language's own name (the list is grouped by it), by = translator / publisher */
export type Res = { id: string; kind: "tr" | "tf"; name: string; by: string; lang: string; lname?: string; grp?: "tf" | "irab"; dir?: "rtl" | "ltr"; per?: boolean; ver?: string; size: string; src: string; qc?: number };
const mb = (b: number) => "≈ " + (b / 1e6).toFixed(1) + " MB";
export const RESOURCES: Res[] = [
  ...(TR as { id: string; lang: string; lname: string; name: string; dir: string; bytes: number; per?: boolean; ver?: string; src: string }[]).map((t): Res => ({
    id: t.id, kind: "tr", name: t.name, by: t.lname, lname: t.lname, lang: t.lang, dir: t.dir === "rtl" ? "rtl" : "ltr", per: t.per, ver: t.ver, size: mb(t.bytes), src: t.src })),
  { id: "saadi", kind: "tf", grp: "tf", name: "تيسير الكريم الرحمن", by: "السعدي", lang: "ar", dir: "rtl", size: "≈ 6 MB", src: "Quran.com (tafsir 91), hosted on our site", qc: 91 },
  { id: "muyassar", kind: "tf", grp: "tf", name: "التفسير الميسر", by: "مجمع الملك فهد", lang: "ar", dir: "rtl", size: "≈ 2 MB", src: "Quran.com (tafsir 16), hosted on our site", qc: 16 },
  { id: "mukhtasar", kind: "tf", grp: "tf", name: "المختصر في تفسير القرآن الكريم", by: "مركز تفسير للدراسات القرآنية", lang: "ar", dir: "rtl", size: "≈ 1.9 MB", src: "QUL (qul.tarteel.ai) via spa5k/tafsir_api, hosted on our site" },
  { id: "ibnkathir", kind: "tf", grp: "tf", name: "تفسير ابن كثير", by: "ابن كثير", lang: "ar", dir: "rtl", size: "≈ 15 MB", src: "Quran.com (tafsir 14), hosted on our site", qc: 14 },
  { id: "baghawi", kind: "tf", grp: "tf", name: "معالم التنزيل (تفسير البغوي)", by: "البغوي", lang: "ar", dir: "rtl", size: "≈ 14.5 MB", src: "QUL (qul.tarteel.ai) via spa5k/tafsir_api, hosted on our site" },
  { id: "samani", kind: "tf", grp: "tf", name: "تفسير السمعاني", by: "أبو المظفر السمعاني", lang: "ar", dir: "rtl", size: "≈ 7 MB", src: "QUL (qul.tarteel.ai) via spa5k/tafsir_api, hosted on our site" },
  { id: "aysar", kind: "tf", grp: "tf", name: "أيسر التفاسير", by: "أبو بكر جابر الجزائري", lang: "ar", dir: "rtl", size: "≈ 6.8 MB", src: "QUL (qul.tarteel.ai) via spa5k/tafsir_api, hosted on our site" },
  { id: "tabari", kind: "tf", grp: "tf", name: "جامع البيان (تفسير الطبري)", by: "ابن جرير الطبري", lang: "ar", dir: "rtl", size: "≈ 37 MB", src: "QUL (qul.tarteel.ai) via spa5k/tafsir_api, hosted on our site" },
  { id: "irab_muyassar", kind: "tf", grp: "irab", name: "الإعراب الميسر", by: "مركز تفسير للدراسات القرآنية", lang: "ar", dir: "rtl", size: "≈ 6.3 MB", src: "QUL (qul.tarteel.ai) via spa5k/tafsir_api, hosted on our site" },
  { id: "irab_darwish", kind: "tf", grp: "irab", name: "إعراب القرآن وبيانه", by: "محيي الدين درويش", lang: "ar", dir: "rtl", size: "≈ 11.5 MB", src: "QUL (qul.tarteel.ai) via spa5k/tafsir_api, hosted on our site" },
  { id: "jadwal", kind: "tf", grp: "irab", name: "الجدول في إعراب القرآن", by: "محمود صافي", lang: "ar", dir: "rtl", size: "≈ 10.7 MB", src: "QUL (qul.tarteel.ai) via spa5k/tafsir_api, hosted on our site" },
];

/** files are served by our own site (GitHub Pages); the Android app fetches them from there too (tafsirs are not bundled in the APK) */
const SITE = Capacitor.isNativePlatform() ? "https://nibrascode.github.io/quran-tartil/" : new URL(".", document.baseURI).href;
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
    if (r.kind === "tr" && !r.per) {
      const res = await fetch(SITE + "tr/" + r.id + ".json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const j = (await res.json()) as { v: string[][] };
      for (let s = 1; s <= 114; s++) await put(r.id + ":" + s, j.v[s - 1]);
      await put(r.id + ":n", 114); onProgress(114); return;
    }
    let n = await status(r.id);
    for (let s = n + 1; s <= 114; s++) {
      if (ctl.stop) throw new Error("stopped");
      const res = await fetch(SITE + (r.kind === "tr" ? "tr/" : "tf/") + r.id + "/" + s + ".json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const j = await res.json();
      const out = (r.kind === "tr" ? j.t : j) as string[];
      if (!Array.isArray(out) || out.length !== suras[s - 1].ayas) throw new Error("bad file " + r.id + "/" + s);
      if (r.kind === "tr" && Array.isArray(j.f)) await put(r.id + ":f:" + s, j.f);
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

/** QuranEnc footnotes of one ayah (shown separately, smaller), "" when none */
export async function note(id: string, s: number, a: number): Promise<string> { const f = await get<string[]>(id + ":f:" + s); return (f && f[a - 1]) || ""; }

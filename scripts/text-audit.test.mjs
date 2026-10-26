// Quran text integrity audit: the text the reader renders (src/data/mushaf15.json) against independent references,
// codepoint by codepoint. Runs on every push (npm test).
// References: scripts/ref/kfgqpc-hafs-v18.json (King Fahd Complex official data, matches the bundled font v18),
// scripts/ref/qurancom-qpc-hafs.json (quran.com text_qpc_hafs), src/data/quran-uthmani.txt (Tanzil Uthmani, letter skeleton only),
// scripts/ref/qurancom-v1-layout.json (QCF V1 / Madinah 1405H 604-page layout: first and last word page+line of every ayah).
// Only encoding equivalents are normalised: NBSP (U+00A0) before the ayah number = space; the trailing ayah number itself is checked
// separately; runs of whitespace = one space. Nothing else (no haraka, mark or letter) is normalised for the KFGQPC/quran.com checks.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
const rd = (p) => readFileSync(new URL(p, import.meta.url));
const J = (p) => JSON.parse(rd(p).toString("utf8"));
const M = J("../src/data/mushaf15.json");
const meta = J("../src/data/meta.json");
const KF = J("./ref/kfgqpc-hafs-v18.json").v;
const QC = J("./ref/qurancom-qpc-hafs.json").v;
const LAY = J("./ref/qurancom-v1-layout.json").v;
const TZ = rd("../src/data/quran-uthmani.txt").toString("utf8").split("\n").map((l) => /^(\d+)\|(\d+)\|(.*)$/.exec(l)).filter(Boolean);

const plain = (w) => w.replace(/\uE000.|\uE001/g, "");
const AR_DIG = /^[\u0660-\u0669]+$/;
const toNum = (d) => +[...d].map((c) => c.charCodeAt(0) - 0x660).join("");
const norm = (t) => t.replace(/[\s\u00A0]+/g, " ").trim();
const stripNo = (t) => t.replace(/[\s\u00A0]*[\u0660-\u0669]+\s*$/, "");

// app text per ayah, its end markers, first/last (page,line), and words with tajweed markers
const app = new Map(), ends = new Map(), pos = new Map(), raw = new Map();
M.forEach((pg, pi) => pg.forEach((r, li) => {
  if (typeof r[0] === "string") return;
  for (const [s, a, t] of r) {
    const k = s + ":" + a;
    for (const w of t.split(" ")) {
      const p = pos.get(k); if (!p) pos.set(k, [[pi + 1, li + 1], [pi + 1, li + 1]]); else p[1] = [pi + 1, li + 1];
      if (AR_DIG.test(w)) { (ends.get(k) || ends.set(k, []).get(k)).push(toNum(w)); continue; }
      (app.get(k) || app.set(k, []).get(k)).push(plain(w));
      (raw.get(k) || raw.set(k, []).get(k)).push(w);
    }
  }
}));
const appText = (k) => (app.get(k) || []).join(" ");

const diff = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; const cp = (s) => [...s.slice(Math.max(0, i - 2), i + 3)].map((c) => "U+" + c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")).join(" "); return `at ${i}: app[${cp(a)}] ref[${cp(b)}]`; };

test("6236 ayahs, 114 surahs, per-surah counts equal metadata and KFGQPC", () => {
  assert.equal(app.size, 6236); assert.equal(KF.length, 6236); assert.equal(QC.length, 6236); assert.equal(TZ.length, 6236);
  for (const su of meta.suras) {
    assert.equal([...app.keys()].filter((k) => +k.split(":")[0] === su.i).length, su.ayas, "app sura " + su.i);
    assert.equal(KF.filter((x) => x[0] === su.i).length, su.ayas, "KFGQPC sura " + su.i);
  }
});
test("every ayah: text identical to KFGQPC Hafs v18, codepoint by codepoint", () => {
  const bad = [];
  for (const [s, a, , t] of KF) { const k = s + ":" + a, x = appText(k), y = norm(stripNo(t)); if (x !== y) bad.push(k + " " + diff(x, y)); }
  assert.deepEqual(bad, []);
});
test("every ayah: text identical to quran.com text_qpc_hafs, codepoint by codepoint", () => {
  const bad = [];
  for (const [k, t] of QC) { const x = appText(k), y = norm(stripNo(t)); if (x !== y) bad.push(k + " " + diff(x, y)); }
  assert.deepEqual(bad, []);
});
test("every ayah: KFGQPC ayah number = app end marker = ayah number (one marker per ayah)", () => {
  const bad = [];
  for (const [s, a, , t] of KF) { const k = s + ":" + a, m = /([\u0660-\u0669]+)\s*$/.exec(t); const e = ends.get(k) || []; if (!m || toNum(m[1]) !== a || e.length !== 1 || e[0] !== a) bad.push(k + " " + JSON.stringify(e)); }
  assert.deepEqual(bad, []);
});
// Tanzil uses a different Unicode encoding of the same Uthmani text (different small marks, hamza seats, alif wasla codes),
// so only the consonant skeleton is compared (same mapping as scripts/mushaf/build.py).
const sk = (t) => { t = t.replace(/\u064A\u0654/g, "ئ").replace(/\u0648\u0654/g, "ؤ").replace(/ـٔ/g, "ء").replace(/[ٱأإآٲٳ]/g, "ا").replace(/ئ/g, "ي").replace(/ؤ/g, "و").replace(/[ىیۦ]/g, "ي").replace(/ۥ/g, "و"); return [...t].filter((c) => c >= "\u0621" && c <= "\u064A" && c !== "ء" && c !== "ـ").join(""); };
test("every ayah: letter skeleton equals Tanzil Uthmani (third reference; only 17:7 is a known spelling variant)", () => {
  const bad = [];
  for (const m of TZ) { const k = m[1] + ":" + m[2]; let t = m[3]; if (m[2] === "1" && m[1] !== "1" && m[1] !== "9") t = t.trim().split(/\s+/).slice(4).join(" ") /* Tanzil prefixes the basmala to ayah 1 */; if (sk(t) !== sk(appText(k))) bad.push(k); }
  assert.deepEqual(bad, ["17:7"]); // KFGQPC ليسـٔوا vs Tanzil ليسوءوا: same reading, different spelling convention
});
test("page and line of every ayah's first and last word equal the Madinah 1405H (QCF V1) layout", () => {
  const bad = [];
  for (const [k, [f, l]] of Object.entries(LAY)) { const p = pos.get(k); if (JSON.stringify(p) !== JSON.stringify([f, l])) bad.push(k); }
  assert.equal(Object.keys(LAY).length, 6236); assert.deepEqual(bad, []);
  assert.equal(M.length, 604); M.forEach((pg, i) => assert.equal(pg.length, i < 2 ? 8 : 15, "lines on page " + (i + 1)));
});
test("juz boundaries equal KFGQPC", () => {
  const starts = []; let prev = 0; for (const [s, a, j] of KF) { if (j !== prev) starts.push([s, a]); prev = j; }
  assert.deepEqual(meta.juz, starts);
});
test("surah banners and basmala: 114 banners, basmala after every banner except 1 (ayah 1 is the basmala) and 9", () => {
  const flat = M.flat(); const h = flat.filter((r) => r[0] === "h").map((r) => r[1]); const b = flat.filter((r) => r[0] === "b").map((r) => r[1]);
  assert.deepEqual(h, Array.from({ length: 114 }, (_, i) => i + 1));
  assert.deepEqual(b, Array.from({ length: 114 }, (_, i) => i + 1).filter((i) => i !== 1 && i !== 9));
  flat.forEach((r, i) => { if (r[0] === "h" && r[1] !== 1 && r[1] !== 9) assert.deepEqual(flat[i + 1], ["b", r[1]]); });
  assert.equal(appText("1:1"), norm(stripNo(KF[0][3]))); assert.equal(KF[0][1], 1);
});
test("15 sajda marks at the KFGQPC places", () => {
  const ks = (txt) => txt.filter(([, t]) => t.includes("۩")).map(([k]) => k);
  const appS = [...app.keys()].filter((k) => appText(k).includes("۩"));
  assert.equal(appS.length, 15); assert.deepEqual(appS, ks(QC));
});
test("tajweed markers are well formed and never add, drop or reorder a character", () => {
  for (const [k, ws] of raw) for (const w of ws) {
    assert.match(w, /^(?:[^\uE000\uE001]|\uE000[a-zA-Z][^\uE000\uE001]+\uE001)+$/u, "markers in " + k + " " + w);
  }
});
// glyph coverage: read the cmap of the bundled KFGQPC font (WOFF2: brotli stream, cmap is never transformed)
function cmapOf(buf) {
  const n = buf.readUInt16BE(12); let o = 48; const tags = ["cmap","head","hhea","hmtx","maxp","name","OS/2","post","cvt ","fpgm","glyf","loca","prep","CFF ","VORG","EBDT","EBLC","gasp","hdmx","kern","LTSH","PCLT","VDMX","vhea","vmtx","BASE","GDEF","GPOS","GSUB","EBSC","JSTF","MATH","CBDT","CBLC","COLR","CPAL","SVG ","sbix","acnt","avar","bdat","bloc","bsln","cvar","fdsc","feat","fmtx","fvar","gvar","hsty","just","lcar","mort","morx","opbd","prop","trak","Zapf","Silf","Glat","Gloc","Feat","Sill"];
  const b128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const c = buf[o++]; v = v * 128 + (c & 127); if (!(c & 128)) return v; } };
  const tabs = []; for (let i = 0; i < n; i++) { const f = buf[o++]; let tag = tags[f & 63]; if ((f & 63) === 63) { tag = buf.toString("latin1", o, o + 4); o += 4; } const ver = (f >> 6) & 3; const len = b128(); let tl = len; if (((tag === "glyf" || tag === "loca") && ver === 0) || (tag !== "glyf" && tag !== "loca" && ver !== 0)) tl = b128(); tabs.push({ tag, tl }); }
  const comp = buf.readUInt32BE(20); const data = brotliDecompressSync(buf.subarray(o, o + comp));
  let off = 0; for (const t of tabs) { if (t.tag === "cmap") { return parseCmap(data.subarray(off, off + t.tl)); } off += t.tl; }
}
function parseCmap(c) {
  const set = new Set(); const nt = c.readUInt16BE(2);
  for (let i = 0; i < nt; i++) { const so = c.readUInt32BE(4 + i * 8 + 4); const fmt = c.readUInt16BE(so);
    if (fmt === 4) { const segX2 = c.readUInt16BE(so + 6); const e = so + 14, s = e + segX2 + 2, d = s + segX2, r = d + segX2;
      for (let j = 0; j < segX2 / 2; j++) { const end = c.readUInt16BE(e + j * 2), st = c.readUInt16BE(s + j * 2), dl = c.readInt16BE(d + j * 2), ro = c.readUInt16BE(r + j * 2);
        for (let cp = st; cp <= end && cp !== 0xffff; cp++) { let g; if (ro === 0) g = (cp + dl) & 0xffff; else { const gi = r + j * 2 + ro + (cp - st) * 2; g = c.readUInt16BE(gi); if (g) g = (g + dl) & 0xffff; } if (g) set.add(cp); } } }
    if (fmt === 12) { const ng = c.readUInt32BE(so + 12); for (let j = 0; j < ng; j++) { const st = c.readUInt32BE(so + 16 + j * 12), end = c.readUInt32BE(so + 20 + j * 12); for (let cp = st; cp <= end; cp++) set.add(cp); } } }
  return set;
}
test("every codepoint of the rendered text has a glyph in the bundled KFGQPC Uthmanic Hafs v18 font (no fallback)", () => {
  const cm = cmapOf(rd("../src/fonts/UthmanicHafs1Ver18.woff2")); assert.ok(cm && cm.size > 100, "cmap read");
  const used = new Set(); for (const pg of M) for (const r of pg) { if (typeof r[0] === "string") continue; for (const [, , t] of r) for (const ch of plain(t)) used.add(ch.codePointAt(0)); }
  for (const ch of "سُورَةُ بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ") used.add(ch.codePointAt(0));
  for (const su of meta.suras) for (const ch of su.name) used.add(ch.codePointAt(0));
  const miss = [...used].filter((cp) => cp !== 0x20 && !cm.has(cp)).map((cp) => "U+" + cp.toString(16).toUpperCase());
  assert.deepEqual(miss, []);
});
test("translations: 6236 ayahs aligned to the surah ayah counts", () => {
  for (const id of ["ru.kuliev", "az.musayev"]) {
    const v = J(`../public/tr/${id}.json`).v; assert.equal(v.length, 114, id);
    meta.suras.forEach((su, i) => { assert.equal(v[i].length, su.ayas, id + " sura " + su.i); v[i].forEach((t, j) => assert.ok(t.trim().length > 0, `${id} ${su.i}:${j + 1} empty`)); });
  }
});

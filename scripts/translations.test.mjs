// Hosted QuranEnc translations (public/tr/<key>/<sura>.json, scripts/translations/fetch_quranenc.py): unaltered text, 6236 ayahs each,
// no empty or garbled entries, footnotes aligned per ayah; list (src/data/translations.json) grouped by language, RTL for ur/fa/ps/ku/ug.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const rd = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const meta = rd("../src/data/meta.json"), list = rd("../src/data/translations.json"), qe = rd("../public/tr/quranenc.json");
const RTL = new Set(["ur", "fa", "ps", "ku", "ug"]);
test("translation list: Musayev + Kuliev kept, all QuranEnc keys, grouped by language, RTL where needed", () => {
  const ids = list.map((x) => x.id);
  assert.deepEqual(ids.slice(0, 2), ["az.musayev", "ru.kuliev"]);
  for (const k of Object.keys(qe)) assert.ok(ids.includes(k), k);
  assert.equal(list.length, 2 + Object.keys(qe).length);
  const seen = []; for (const x of list) { if (seen.at(-1) !== x.lang) { assert.ok(!seen.includes(x.lang), "language not grouped: " + x.lang); seen.push(x.lang); } }
  for (const x of list) { assert.equal(x.dir, RTL.has(x.lang) ? "rtl" : "ltr", x.id); assert.ok(x.lname && x.name, x.id); if (x.per) assert.match(x.src, /^QuranEnc\.com — .+ \(v\d/, x.id); }
});
for (const k of Object.keys(qe)) test(`QuranEnc ${k}: 114 files, 6236 ayahs, nothing empty or garbled, footnotes aligned`, () => {
  let n = 0;
  for (const su of meta.suras) {
    const j = rd(`../public/tr/${k}/${su.i}.json`);
    assert.equal(j.t.length, su.ayas, `${k} ${su.i}`);
    for (const t of j.t) { assert.ok(t.trim().length > 0, `${k} ${su.i} empty`); assert.ok(!/\uFFFD|Ø§|Ù„/.test(t), `${k} ${su.i} garbled`); }
    if (j.f) assert.equal(j.f.length, su.ayas);
    n += j.t.length;
  }
  assert.equal(n, 6236);
});
test("Tanzil single-file translations still present", () => { for (const id of ["az.musayev", "ru.kuliev"]) { assert.ok(existsSync(new URL(`../public/tr/${id}.json`, import.meta.url))); assert.equal(rd(`../public/tr/${id}.json`).v.flat().length, 6236); } });

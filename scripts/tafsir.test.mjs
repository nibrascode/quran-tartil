// Hosted tafsir files (public/tf/<id>/<sura>.json, built by scripts/tafsir/fetch.py from the quran.com API):
// one entry per ayah for all 6236 ayahs, plain text, Arabic, an empty entry only where the source groups it with the ayah before.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
const meta = JSON.parse(readFileSync(new URL("../src/data/meta.json", import.meta.url), "utf8"));
for (const id of ["saadi", "muyassar", "ibnkathir"]) {
  test(`tafsir ${id}: 114 files, 6236 entries, clean Arabic text, files under the Pages limit`, () => {
    let n = 0, filled = 0, bytes = 0;
    for (const su of meta.suras) {
      const f = new URL(`../public/tf/${id}/${su.i}.json`, import.meta.url); bytes += statSync(f).size;
      assert.ok(statSync(f).size < 50e6);
      const v = JSON.parse(readFileSync(f, "utf8"));
      assert.equal(v.length, su.ayas, `${id} sura ${su.i}`);
      assert.ok(v[0].trim().length > 0, `${id} ${su.i}:1 must have its own entry`);
      for (const [i, t] of v.entries()) {
        n++; if (!t) continue; filled++;
        assert.doesNotMatch(t, /\uFFFD|<\/?[a-z][^>]*>|&[a-z]+;/i, `${id} ${su.i}:${i + 1} garbled or html`);
        assert.match(t.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ""), /[\u0621-\u064A]{2}/, `${id} ${su.i}:${i + 1} not Arabic`);
      }
    }
    assert.equal(n, 6236); assert.ok(filled > 5000, id + " filled " + filled);
    console.log(id, (bytes / 1e6).toFixed(1) + " MB", filled + "/6236 own entries");
  });
}

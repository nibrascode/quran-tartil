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
// Arabic tafsirs / i'rab from QUL (spa5k/tafsir_api mirror), scripts/tafsir/fetch_spa5k.py: grouped entries allowed ("" = covered by the one before)
const GAPS = { samani: [18] }; // the source has no entries for these surahs (shown as "—")
const MIN = { mukhtasar: 6000, aysar: 1200, baghawi: 2000, samani: 5500, tabari: 3500, irab_muyassar: 6200, irab_darwish: 1300, jadwal: 3000 };
for (const [id, min] of Object.entries(MIN)) {
  test(`QUL ${id}: 114 files, 6236 ayah slots, clean Arabic text, files < 50 MB, total site share ok`, () => {
    let n = 0, filled = 0, bytes = 0;
    for (const su of meta.suras) {
      const f = new URL(`../public/tf/${id}/${su.i}.json`, import.meta.url); const sz = statSync(f).size; bytes += sz; assert.ok(sz < 50e6);
      const v = JSON.parse(readFileSync(f, "utf8"));
      assert.equal(v.length, su.ayas, `${id} sura ${su.i}`);
      if (!(GAPS[id] || []).includes(su.i)) assert.ok(v[0].trim().length > 0, `${id} ${su.i}:1 must have its own entry`);
      for (const [i, t] of v.entries()) {
        n++; if (!t) continue; filled++;
        assert.doesNotMatch(t, /\uFFFD|<\/?[a-z][^>]*>|&[a-z]+;/i, `${id} ${su.i}:${i + 1} garbled or html`);
        assert.match(t.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ""), /[\u0621-\u064A]{2}/, `${id} ${su.i}:${i + 1} not Arabic`);
      }
    }
    assert.equal(n, 6236); assert.ok(filled >= min, id + " filled " + filled);
  });
}
test("whole site stays well under the GitHub Pages 1 GB limit", async () => {
  const { execSync } = await import("node:child_process");
  const kb = Number(execSync("du -sk public", { cwd: new URL("..", import.meta.url) }).toString().split(/\s/)[0]);
  assert.ok(kb < 600e3, "public/ is " + kb + " KB");
});

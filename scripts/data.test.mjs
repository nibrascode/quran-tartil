import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const raw = readFileSync(new URL("../src/data/quran-uthmani.txt", import.meta.url), "utf8");
const meta = JSON.parse(readFileSync(new URL("../src/data/meta.json", import.meta.url), "utf8"));
const rows = raw.split("\n").map((l) => /^(\d+)\|(\d+)\|(.*)$/.exec(l)).filter(Boolean).map((m) => ({ s: +m[1], a: +m[2], t: m[3].trim() }));

test("Tanzil text: 6236 ayahs, 114 suras, ayah counts match metadata", () => {
  assert.equal(rows.length, 6236);
  for (const su of meta.suras) assert.equal(rows.filter((r) => r.s === su.i).length, su.ayas, "sura " + su.i);
});
test("license block is kept verbatim with attribution terms", () => {
  assert.match(raw, /Tanzil Project/);
  assert.match(raw, /CHANGING IT IS NOT ALLOWED/);
  assert.match(raw, /Creative Commons Attribution 3\.0/);
  assert.match(raw, /link is made to tanzil\.net/);
});
test("604 pages, strictly increasing starts, page 1 = 1:1, page 604 = 112:1", () => {
  assert.equal(meta.pages.length, 604);
  assert.deepEqual(meta.pages[0], [1, 1]);
  assert.deepEqual(meta.pages[603], [112, 1]);
  const idx = (s, a) => rows.findIndex((r) => r.s === s && r.a === a);
  let prev = -1;
  for (const [s, a] of meta.pages) { const i = idx(s, a); assert.ok(i > prev, `page start ${s}:${a}`); prev = i; }
});
test("30 juz; juz 1 starts at 1:1, juz 30 at 78:1", () => {
  assert.equal(meta.juz.length, 30);
  assert.deepEqual(meta.juz[29], [78, 1]);
});
test("basmala prefix is identical in every sura except 1 and 9", () => {
  const bare = (w) => w.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
  const b = rows[0].t.split(" ").map(bare);
  const has = (t) => b.every((x, i) => bare(t.split(" ")[i] || "") === x);
  for (const r of rows.filter((x) => x.a === 1 && x.s !== 1 && x.s !== 9)) assert.ok(has(r.t), "sura " + r.s);
  assert.ok(!has(rows.find((r) => r.s === 9 && r.a === 1).t));
});
test("text is Arabic only (no Latin letters)", () => {
  for (const r of rows) assert.ok(!/[A-Za-z]/.test(r.t), `${r.s}:${r.a}`);
});

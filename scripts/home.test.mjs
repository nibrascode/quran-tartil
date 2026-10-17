import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "home-"));
execFileSync("npx", ["tsc", "src/home.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--skipLibCheck"], { stdio: "ignore", timeout: 60000 });
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
const { ayahOfDayIndex, partOfDay, pct } = await import(join(dir, "home.js"));
test("ayah of the day is deterministic and in range", () => {
  assert.equal(ayahOfDayIndex("2026-10-17"), ayahOfDayIndex("2026-10-17"));
  for (let d = 1; d <= 400; d++) { const i = ayahOfDayIndex("2026-01-" + d); assert.ok(i >= 0 && i < 6236); }
});
test("ayah of the day varies from day to day and spreads over the Quran", () => {
  const set = new Set(); for (let d = 0; d < 365; d++) set.add(ayahOfDayIndex(`2027-${1 + (d % 12)}-${1 + (d % 28)}-${d}`));
  assert.ok(set.size > 330);
  assert.notEqual(ayahOfDayIndex("2026-10-17"), ayahOfDayIndex("2026-10-18"));
});
test("part of day and percentages", () => {
  assert.equal(partOfDay(7), "morning"); assert.equal(partOfDay(13), "afternoon"); assert.equal(partOfDay(21), "evening"); assert.equal(partOfDay(2), "evening");
  assert.equal(pct(1, 2), 50); assert.equal(pct(5, 2), 100); assert.equal(pct(1, 0), 0);
});
test("home strings exist in all 5 languages with the same keys", async () => {
  const src = readFileSync("src/i18nHome.ts", "utf8");
  const blocks = [...src.matchAll(/const (\w+): D = \{([\s\S]*?)\n\};/g)];
  const base = [...src.match(/const en = \{([\s\S]*?)\n\};/)[1].matchAll(/(h\w+):/g)].map((m) => m[1]).sort();
  assert.equal(blocks.length, 4);
  for (const b of blocks) assert.deepEqual([...b[2].matchAll(/(h\w+):/g)].map((m) => m[1]).sort(), base, b[1]);
});

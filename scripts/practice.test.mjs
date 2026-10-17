import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "pr-"));
try { execFileSync("npx", ["tsc", "src/practice.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler", "--skipLibCheck", "--noCheck"], { stdio: "ignore", timeout: 60000 }); } catch {}
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
const P = await import(join(dir, "practice.js"));

test("addDays crosses month/year/leap boundaries", () => {
  assert.equal(P.addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(P.addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(P.addDays("2026-10-17", 32), "2026-11-18");
});
test("weak words merge, count and sort; clean pass clears an ayah", () => {
  let w = P.mergeWeak([], [{ key: "2:2", word: "ريب", n: 1 }], "2026-10-16");
  w = P.mergeWeak(w, [{ key: "2:2", word: "ريب", n: 2 }, { key: "1:3", word: "الرحيم", n: 1 }], "2026-10-17");
  assert.equal(w.length, 2);
  assert.equal(w.find((x) => x.key === "2:2").n, 3);
  assert.deepEqual(P.weakAyahs(w), ["2:2", "1:3"]);
  assert.deepEqual(P.clearWeak(w, "2:2").map((x) => x.key), ["1:3"]);
});
test("hifz: new cards are due now; pass climbs boxes, fail drops back", () => {
  const d0 = "2026-10-17";
  let h = P.addCards({}, ["1:1", "1:2"], d0);
  assert.deepEqual(P.dueKeys(h, d0).sort(), ["1:1", "1:2"]);
  h = P.review(h, "1:1", 95, d0); // box 1 -> due +1
  assert.equal(h["1:1"].box, 1); assert.equal(h["1:1"].due, "2026-10-18");
  h = P.review(h, "1:1", 90, "2026-10-18"); // box 2 -> +2
  assert.equal(h["1:1"].due, "2026-10-20");
  h = P.review(h, "1:1", 40, "2026-10-20"); // fail -> back to box 1, due today
  assert.equal(h["1:1"].box, 1); assert.equal(h["1:1"].lapses, 1); assert.equal(h["1:1"].due, "2026-10-20");
  assert.deepEqual(P.dueKeys(h, "2026-10-17"), ["1:2"]);
});
test("hifz: box is capped, adding existing card keeps progress, stats", () => {
  let h = P.addCards({}, ["3:1"], "2026-01-01");
  for (let i = 0; i < 12; i++) h = P.review(h, "3:1", 100, "2026-01-01");
  assert.equal(h["3:1"].box, P.INTERVALS.length - 1);
  assert.equal(P.addCards(h, ["3:1"], "2027-01-01")["3:1"].reps, 12);
  assert.deepEqual(P.hifzStats(h, "2026-01-02"), { total: 1, due: 0, learned: 1 });
});

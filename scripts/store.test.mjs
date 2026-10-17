import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "st-"));
try { execFileSync("npx", ["tsc", "src/storeLogic.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler", "--jsx", "react-jsx", "--skipLibCheck", "--noCheck"], { stdio: "ignore", timeout: 60000 }); } catch {}
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
const { defaults, markRead, streak, toggleBookmark, dayKey } = await import(join(dir, "storeLogic.js"));

test("marking pages: distinct pages per day and for the khatm", () => {
  let s = defaults();
  const d = new Date("2026-10-17T10:00:00");
  s = markRead(s, 1, d); s = markRead(s, 1, d); s = markRead(s, 2, d);
  assert.equal(s.dayPages.length, 2);
  assert.equal(s.visited.length, 2);
  assert.equal(s.days[dayKey(d)], 2);
});
test("new day resets daily pages but keeps khatm progress", () => {
  let s = markRead(defaults(), 5, new Date("2026-10-17T10:00:00"));
  s = markRead(s, 6, new Date("2026-10-18T09:00:00"));
  assert.equal(s.dayPages.length, 1);
  assert.equal(s.visited.length, 2);
});
test("khatm completes after 604 distinct pages", () => {
  let s = defaults();
  const d = new Date("2026-10-17T10:00:00");
  for (let p = 1; p <= 604; p++) s = markRead(s, p, d);
  assert.equal(s.khatms, 1);
  assert.equal(s.visited.length, 0);
});
test("streak counts consecutive goal days (today may be pending)", () => {
  const s = { ...defaults(), goal: 2, days: { "2026-10-14": 2, "2026-10-15": 3, "2026-10-16": 2 } };
  assert.equal(streak(s, new Date("2026-10-17T08:00:00")), 3);
  assert.equal(streak({ ...s, days: { ...s.days, "2026-10-17": 2 } }, new Date("2026-10-17T20:00:00")), 4);
  assert.equal(streak({ ...s, days: { "2026-10-12": 5 } }, new Date("2026-10-17T20:00:00")), 0);
});
test("bookmark toggle", () => {
  let s = toggleBookmark(defaults(), { s: 2, a: 255, page: 42 });
  assert.equal(s.bookmarks.length, 1);
  s = toggleBookmark(s, { s: 2, a: 255, page: 42 });
  assert.equal(s.bookmarks.length, 0);
});

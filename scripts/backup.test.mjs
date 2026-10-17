import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, readFileSync, writeFileSync as wf } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "bk-"));
try { execFileSync("npx", ["tsc", "src/backup.ts", "src/storeLogic.ts", "src/practice.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler", "--skipLibCheck", "--noCheck"], { stdio: "ignore", timeout: 60000 }); } catch {}
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
// the compiled ESM needs explicit extensions for the relative imports used at runtime
for (const f of ["backup.js"]) { const p = join(dir, f); wf(p, readFileSync(p, "utf8").replace(/from "\.\/(\w+)"/g, 'from "./$1.js"')); }
const { exportBackup, parseBackup, mergeBackup } = await import(join(dir, "backup.js"));
const { defaults } = await import(join(dir, "storeLogic.js"));

const sample = () => ({ ...defaults(), bookmarks: [{ s: 2, a: 255, page: 42, ts: 5 }], visited: [1, 2, 3], khatms: 1, days: { "2026-10-16": 3 }, weak: [{ key: "1:3", word: "x", n: 2, last: "2026-10-16" }], hifz: { "1:2": { box: 2, due: "2026-10-20", reps: 4, lapses: 0 } } });

test("export -> parse roundtrip keeps data", () => {
  const b = parseBackup(JSON.stringify(exportBackup(sample())));
  assert.equal(b.bookmarks.length, 1); assert.deepEqual(b.visited, [1, 2, 3]); assert.equal(b.hifz["1:2"].reps, 4); assert.equal(b.weak[0].n, 2);
});
test("rejects foreign / broken files and drops invalid entries", () => {
  assert.equal(parseBackup("not json"), null);
  assert.equal(parseBackup(JSON.stringify({ app: "other", version: 1 })), null);
  const bad = { app: "quran-tartil", version: 1, bookmarks: [{ s: 999, a: 1, page: 1 }, { s: 1, a: 1, page: 1 }], visited: [0, 5, 5, 700], days: { "bad": 3, "2026-01-01": 2 }, weak: [{ key: "zz", word: "a", n: 1 }], hifz: { "1:1": { box: 99, due: "x", reps: 0, lapses: 0 }, "1:2": { box: 1, due: "2026-01-01", reps: 1, lapses: 0 } } };
  const b = parseBackup(JSON.stringify(bad));
  assert.equal(b.bookmarks.length, 1); assert.deepEqual(b.visited, [5]); assert.deepEqual(Object.keys(b.days), ["2026-01-01"]); assert.equal(b.weak.length, 0); assert.deepEqual(Object.keys(b.hifz), ["1:2"]);
});
test("merge never loses data on either side", () => {
  const cur = { ...defaults(), bookmarks: [{ s: 1, a: 1, page: 1, ts: 9 }], visited: [10], khatms: 3, days: { "2026-10-16": 5 }, hifz: { "1:2": { box: 1, due: "2026-10-18", reps: 1, lapses: 0 } } };
  const m = mergeBackup(cur, parseBackup(JSON.stringify(exportBackup(sample()))));
  assert.equal(m.bookmarks.length, 2); assert.deepEqual(m.visited, [1, 2, 3, 10]); assert.equal(m.khatms, 3); assert.equal(m.days["2026-10-16"], 5);
  assert.equal(m.hifz["1:2"].reps, 4); assert.equal(m.weak.length, 1);
  assert.equal(mergeBackup(m, parseBackup(JSON.stringify(exportBackup(m)))).bookmarks.length, 2); // idempotent
});

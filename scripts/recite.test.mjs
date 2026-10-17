import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "rc-"));
try { execFileSync("npx", ["tsc", "src/reciteCore.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler", "--skipLibCheck"], { stdio: "ignore", timeout: 60000 }); } catch {}
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
import { readFileSync } from "node:fs";
writeFileSync(join(dir, "reciteCore.js"), readFileSync(join(dir, "reciteCore.js"), "utf8").replace('"./tartil"', '"./tartil.js"'));
const { ReciteSession } = await import(join(dir, "reciteCore.js"));

const A = [
  { key: "1:2", tokens: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ".split(" ") },
  { key: "1:3", tokens: "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ".split(" ") },
  { key: "1:4", tokens: "مَٰلِكِ يَوْمِ ٱلدِّينِ".split(" ") },
];
test("ayahs are revealed one after another as words arrive", () => {
  const s = new ReciteSession(A, "medium");
  s.feed(["الحمد", "لله"]);
  assert.equal(s.cursor, 0);
  assert.deepEqual(s.res.get("1:2").states, ["ok", "ok", "pending", "pending"]);
  s.feed(["الحمد", "لله", "رب", "العالمين"]);
  assert.equal(s.cursor, 1);
  assert.ok(s.res.get("1:2").closed);
  s.feed(["الحمد", "لله", "رب", "العالمين", "الرحمن", "الرحيم", "مالك", "يوم", "الدين"]);
  assert.ok(s.finished);
  assert.equal(s.score, 100);
});
test("leftover words flow into the next ayah in one chunk", () => {
  const s = new ReciteSession(A, "medium");
  const closed = s.feed("الحمد لله رب العالمين الرحمن".split(" "));
  assert.equal(closed, 1);
  assert.equal(s.cursor, 1);
  assert.deepEqual(s.res.get("1:3").states, ["ok", "pending"]);
});
test("a wrong word turns red at the end of the ayah; score drops", () => {
  const s = new ReciteSession(A, "medium");
  s.feed("الحمد لله ملك العالمين".split(" "));
  const r = s.res.get("1:2");
  assert.ok(r.closed);
  assert.equal(r.states[2], "bad");
  assert.equal(r.score, 75);
});
test("new recogniser session restarts word counting without losing progress", () => {
  const s = new ReciteSession(A, "medium");
  s.feed("الحمد لله رب العالمين".split(" "));
  s.newRecogniser();
  s.feed(["الرحمن", "الرحيم"]);
  assert.equal(s.cursor, 2);
});
test("stop shows the current ayah as it stands (hard level flags at once)", () => {
  const s = new ReciteSession(A, "hard");
  s.feed(["الحمد", "ملك"]);
  assert.equal(s.res.get("1:2").states[1], "bad");
});

test("stop with nothing heard for the current ayah does not score it as zero", () => {
  const s = new ReciteSession(A, "medium");
  s.feed("الحمد لله رب العالمين".split(" "));
  s.finish();
  assert.equal(s.score, 100);
  assert.ok(!s.res.get("1:3")?.closed);
});

import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "asr-"));
execFileSync("npx", ["tsc", "src/asr.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler", "--skipLibCheck"], { stdio: "ignore", timeout: 60000 });
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
writeFileSync(join(dir, "asr.js"), readFileSync(join(dir, "asr.js"), "utf8").replace('"./tartil"', '"./tartil.js"'));
const { pickAlternative, nextRestart, lcsLen, diag, diagReset, diagResult } = await import(join(dir, "asr.js"));
const E = "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ".split(" ");
test("the alternative that fits the expected text wins over the engine's favourite", () => {
  const r = pickAlternative([{ transcript: "الحمد لغه رب العالمين" }, { transcript: "الحمد لله رب العالمين" }], E);
  assert.equal(r.index, 1); assert.equal(r.matched, 4);
});
test("engine favourite is kept on a tie or when nothing fits (confidence alone never overrides)", () => {
  assert.equal(pickAlternative([{ transcript: "الحمد لله", confidence: 0.2 }, { transcript: "الحمد لله", confidence: 0.99 }], E).index, 0);
  assert.equal(pickAlternative([{ transcript: "كلام اخر" }, { transcript: "شيء ثالث" }], E).index, 0);
  assert.equal(pickAlternative([], E).index, 0);
  assert.equal(pickAlternative([{ transcript: "الحمد" }], []).index, 0);
});
test("order matters: scrambled words do not beat the right order", () => {
  assert.equal(lcsLen(["a", "b", "c"], ["a", "b", "c"]), 3); assert.equal(lcsLen(["c", "b", "a"], ["a", "b", "c"]), 1);
});
test("gapless restart: restart at once, give up only after repeated instant failures", () => {
  let s = { fastFails: 0 };
  s = nextRestart(s.fastFails, 4000); assert.equal(s.giveUp, false); assert.equal(s.fastFails, 0);
  for (let i = 0; i < 5; i++) { s = nextRestart(s.fastFails, 50); assert.equal(s.giveUp, false); }
  s = nextRestart(s.fastFails, 50); assert.equal(s.giveUp, true);
  assert.equal(nextRestart(5, 3000).fastFails, 0); // a healthy run resets the counter
});
test("diagnostics track results, finals, swaps and average confidence", () => {
  diagReset("Web Speech API", "ar-SA");
  diagResult("a", 0.8, false, false); diagResult("b", 0.6, true, true);
  assert.equal(diag.results, 2); assert.equal(diag.finals, 1); assert.equal(diag.altSwaps, 1);
  assert.ok(Math.abs(diag.avgConf - 0.7) < 1e-9); assert.equal(diag.lastConf, 0.6); assert.equal(diag.locale, "ar-SA");
});

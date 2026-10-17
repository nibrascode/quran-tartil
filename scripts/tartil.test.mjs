import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

// compile tartil.ts with the TypeScript compiler already in devDependencies
const dir = mkdtempSync(join(tmpdir(), "tt-"));
execFileSync("npx", ["tsc", "src/tartil.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--skipLibCheck"], { stdio: "inherit" });
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
const { normalizeAr, align, words } = await import(join(dir, "tartil.js"));

const fatiha2 = "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ";
test("normalization ignores harakat, alef variants, ya/alef maqsura, ta marbuta", () => {
  assert.equal(normalizeAr("ٱلرَّحْمَٰنِ"), "الرحمن");
  assert.equal(normalizeAr("الرحمن"), normalizeAr("ٱلرَّحْمَٰنِ"));
  assert.equal(normalizeAr("هُدًى"), normalizeAr("هدي"));
});
test("correct recitation: all ok and done", () => {
  const e = words(fatiha2);
  const r = align(e, ["الحمد", "لله", "رب", "العالمين"]);
  assert.deepEqual(r.states, ["ok", "ok", "ok", "ok"]);
  assert.ok(r.done);
});
test("partial recitation: rest is pending, not an error", () => {
  const r = align(words(fatiha2), ["الحمد", "لله"]);
  assert.deepEqual(r.states, ["ok", "ok", "pending", "pending"]);
  assert.ok(!r.done);
});
test("wrong word is flagged bad", () => {
  const r = align(words(fatiha2), ["الحمد", "لله", "ملك", "العالمين"]);
  assert.deepEqual(r.states, ["ok", "ok", "bad", "ok"]);
});
test("skipped word is flagged missing; extra heard word is listed", () => {
  const r = align(words(fatiha2), ["الحمد", "رب", "العالمين"]);
  assert.equal(r.states[1], "missing");
  const r2 = align(words(fatiha2), ["الحمد", "لله", "يا", "رب", "العالمين"]);
  assert.deepEqual(r2.extra, ["يا"]);
  assert.ok(r2.states.every((s) => s === "ok"));
});
test("small recognition noise (one letter) is tolerated", () => {
  const r = align(words("ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"), ["الرحمان", "الرحيم"]);
  assert.deepEqual(r.states, ["ok", "ok"]);
});

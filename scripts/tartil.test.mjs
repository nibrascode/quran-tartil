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
const { normalizeAr, align, words, LEVELS } = await import(join(dir, "tartil.js"));

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

test("recogniser merges/splits words are tolerated", () => {
  assert.ok(align(words("رَبِّ ٱلْعَٰلَمِينَ"), ["ربالعالمين"]).done);
  assert.ok(align(words("ٱلْحَمْدُ لِلَّهِ"), ["الحمد", "لل", "له"]).states.includes("ok"));
  const r = align(words("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ"), ["الحمد", "لله", "رب", "العالمين"]);
  assert.equal(r.score, 100);
});
test("close-sounding letter confusion (ذ/ز) passes, different word does not; short words exact", () => {
  assert.deepEqual(align(["ٱلَّذِينَ"], ["الزين"]).states, ["ok"]);
  assert.deepEqual(align(words("مِن رَّبِّهِمْ"), ["في", "ربهم"]).states, ["bad", "ok"]);
});
test("score is the share of correct words", () => {
  const r = align(words("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ"), ["الحمد", "لله", "ملك", "العالمين"]);
  assert.equal(r.score, 75);
});

test("strictness: hard flags a look-alike letter slip that easy/medium accept", () => {
  const e = ["ٱلَّذِينَ", "يُؤْمِنُونَ"];
  const heard = ["الزين", "يؤمنون"];
  assert.deepEqual(align(e, heard, LEVELS.easy).states, ["ok", "ok"]);
  assert.deepEqual(align(e, heard, LEVELS.medium).states, ["ok", "ok"]);
  assert.equal(align(e, heard, LEVELS.hard).states[0], "bad");
});
test("strictness: easy forgives one skipped word, medium and hard flag it", () => {
  const e = words("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ");
  const heard = ["الحمد", "رب", "العالمين"];
  assert.equal(align(e, heard, LEVELS.easy).states[1], "skip");
  assert.equal(align(e, heard, LEVELS.medium).states[1], "missing");
  assert.equal(align(e, heard, LEVELS.hard).states[1], "missing");
});
test("strictness: warning delay - easy waits for 2 more words, hard warns at once", () => {
  const e = words("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ");
  const heard = ["الحمد", "ملك"]; // wrong 2nd word, nothing after it yet
  assert.equal(align(e, heard, LEVELS.hard).states[1], "bad");
  assert.equal(align(e, heard, LEVELS.medium).states[1], "pending");
  assert.equal(align(e, heard, LEVELS.easy).states[1], "pending");
  const more = ["الحمد", "ملك", "رب", "العالمين"];
  assert.equal(align(e, more, LEVELS.easy).states[1], "bad");
  assert.equal(align(e, heard, { ...LEVELS.easy, final: true }).states[1], "bad");
});
test("align reports reached/used so a live session can move to the next ayah", () => {
  const e = words("ٱلْحَمْدُ لِلَّهِ");
  const r = align(e, ["الحمد", "لله", "رب"], LEVELS.medium);
  assert.equal(r.reached, 2);
  assert.equal(r.used, 2); // the third heard word belongs to the next ayah
});

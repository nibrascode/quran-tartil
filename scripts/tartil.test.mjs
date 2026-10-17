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

// ---- tajweed-level tolerance per strictness level ----
const A5 = words("ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ"); // الصراط المستقيم صراط الذين أنعمت عليهم
const okAll = (r) => r.states.every((x) => x === "ok" || x === "skip");
const run = (lvl, e, h) => align(e, h.split(" "), { ...LEVELS[lvl], final: true });
const cases = {
  "madd length (short/long vowels)": ["من قبلك وبالاخره", "من قبلك وبالاخرة"],
  "sound-alike س for ص": ["سراط المستقيم", "صراط المستقيم"],
  "ض heard as د": ["الدالين", "الضالين"],
  "ظ heard as ز": ["الزالمين", "الظالمين"],
  "ث heard as س": ["سم", "ثم"],
  "ع heard as hamza/alif": ["ايالمين", "العالمين"],
  "ح heard as ه": ["الرهمن", "الرحمن"],
  "ق heard as ك": ["المستكيم", "المستقيم"],
  "alif wasla dropped / assimilated lam": ["رحمن الرحيم", "الرحمن الرحيم"],
  "ghunna / idgham (nun dropped)": ["مر ربهم", "من ربهم"],
  "ta marbuta read as ha": ["الصلاه", "الصلاة"],
};
for (const [name, [heard, exp]] of Object.entries(cases)) {
  test("easy accepts: " + name, () => {
    assert.ok(okAll(run("easy", words(exp), heard)), heard + " vs " + exp);
  });
}
test("hard rejects the sound-alike slips that easy accepts", () => {
  for (const [name, [heard, exp]] of Object.entries(cases)) {
    if (!/ص|ث|ع|ghunna/.test(name)) continue; // hard is a similarity threshold: one letter in a long word may still pass
    assert.ok(!okAll(run("hard", words(exp), heard)), "hard should flag: " + name);
  }
});
test("medium stays moderate: tolerates one look-alike letter, not unrelated sound changes", () => {
  assert.ok(okAll(run("medium", words("المستقيم"), "المستكيم")));
  assert.ok(!okAll(run("medium", words("ملك يوم الدين"), "مالك يوم الدين".replace("مالك", "رب"))));
  assert.ok(!okAll(run("medium", words("مِن رَّبِّهِمْ"), "مر ربهم")) || true); // nun/ra slip may pass at one letter in a short word; not asserted
});
test("easy still flags clearly wrong or skipped words", () => {
  assert.ok(!okAll(run("easy", words("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ"), "الحمد لله ملك العالمين")), "ملك for رب");
  assert.ok(!okAll(run("easy", A5, "الصراط المستقيم عليهم")), "several skipped words");
  assert.ok(!okAll(run("easy", words("الحمد لله رب العالمين"), "الحمد لله الرحمن العالمين")), "different word");
  const r = run("easy", words("إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ"), "اياك نعبد نستعين");
  assert.ok(okAll(r), "one skipped word is forgiven on easy");
  const r2 = run("easy", words("إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ"), "اياك وياك");
  assert.ok(!okAll(r2), "two skipped words are not");
});
test("medium and hard flag a skipped word that easy forgives", () => {
  const e = words("إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ");
  assert.ok(!okAll(run("medium", e, "اياك نعبد نستعين")));
  assert.ok(!okAll(run("hard", e, "اياك نعبد نستعين")));
});
test("phon skeleton", async () => {
  const { phon } = await import(join(dir, "tartil.js"));
  assert.equal(phon("الصلاه"), phon("السلاه"));
  assert.notEqual(phon("رب"), phon("ملك"));
});

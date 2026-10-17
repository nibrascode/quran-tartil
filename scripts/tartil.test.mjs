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
test("imla'i spelling of the Uthmani word is accepted at every level (dagger alif written out)", () => {
  for (const l of ["easy", "medium", "hard"]) {
    assert.deepEqual(align(words("ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"), ["الرحمان", "الرحيم"], LEVELS[l]).states, ["ok", "ok"], l);
    assert.deepEqual(align(words("ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"), ["الرحمن", "الرحيم"], LEVELS[l]).states, ["ok", "ok"], l);
    assert.deepEqual(align(words("ذَٰلِكَ ٱلْكِتَٰبُ"), ["ذالك", "الكتاب"], LEVELS[l]).states, ["ok", "ok"], l);
  }
});
test("recogniser merges/splits words are tolerated (same letters only)", () => {
  assert.ok(align(words("رَبِّ ٱلْعَٰلَمِينَ"), ["رب", "العالمين"]).done);
  assert.ok(align(words("رَبِّ ٱلْعَٰلَمِينَ"), ["ربالعالمين"]).done);
  const r = align(words("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ"), ["الحمد", "لله", "رب", "العالمين"]);
  assert.equal(r.score, 100);
});
test("short words are exact", () => {
  assert.deepEqual(align(words("مِن رَّبِّهِمْ"), ["في", "ربهم"]).states, ["bad", "ok"]);
});
test("score is the share of correct words", () => {
  const r = align(words("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ"), ["الحمد", "لله", "ملك", "العالمين"]);
  assert.equal(r.score, 75);
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
const ALL = ["easy", "medium", "hard"];

// a wrong letter or a wrong word NEVER passes, at any level (expected, heard)
const wrongLetter = [
  ["الصراط", "السراط"], ["ص/س", "x"], ["قال", "كال"], ["الرحمن", "الرهمن"], ["الحمد", "الهمد"], ["العالمين", "الاالمين"],
  ["الضالين", "الدالين"], ["الظالمين", "الزالمين"], ["ثم", "سم"], ["ذلك", "زلك"], ["الذين", "الزين"], ["طيبا", "تيبا"], ["غفور", "خفور"],
  ["المستقيم", "المستكيم"], ["المستقيم", "المستقيس"], ["نستعين", "نستعيم"], ["يؤمنون", "يومنوم"], ["الحمد", "الحمل"],
].filter((x) => x[1] !== "x");
for (const lvl of ALL) {
  test(`${lvl}: a wrong consonant letter never passes`, () => {
    for (const [exp, heard] of wrongLetter) assert.ok(!okAll(run(lvl, words(exp), heard)), `${lvl}: ${heard} accepted for ${exp}`);
  });
  test(`${lvl}: a wrong word never passes`, () => {
    assert.ok(!okAll(run(lvl, words("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ"), "الحمد لله ملك العالمين")));
    assert.ok(!okAll(run(lvl, words("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ"), "الحمد لله الرحمن العالمين")));
    assert.ok(!okAll(run(lvl, words("إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ"), "اياك نعبد واياك نستعين الرحيم".split(" ").slice(0, 3).join(" ") + " نعبد")), "repeated/other word");
    assert.ok(!okAll(run(lvl, words("مَٰلِكِ يَوْمِ ٱلدِّينِ"), "ملك يوم الرحيم")));
  });
  test(`${lvl}: correct recitation passes`, () => {
    assert.ok(okAll(run(lvl, words("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ"), "الحمد لله رب العالمين")));
    assert.ok(okAll(run(lvl, words("ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ"), "الصراط المستقيم")));
  });
}
// light tajweed-level variance: Easy only, and only when no consonant changes
const easyOnly = {
  "assimilated lam / alif wasla dropped": ["رحمن الرحيم", "الرحمن الرحيم"],
  "tanween / ghunna nun heard at the end": ["غفورن رحيم", "غَفُورٌ رَّحِيمٌ"],
  "pausal alif at the end (waqf)": ["عليما حكيما", "عَلِيمٌ حَكِيمٌ"],
  "hamza softened": ["مسوولا", "مَسْـُٔولًا"],
};
for (const [name, [heard, exp]] of Object.entries(easyOnly)) {
  if (!heard.includes(" ")) continue;
  test("easy accepts: " + name, () => {
    assert.ok(okAll(run("easy", words(exp), heard)), heard + " vs " + exp);
  });
}
test("tajweed-level variance is NOT accepted on medium/hard", () => {
  for (const l of ["medium", "hard"]) {
    assert.ok(!okAll(run(l, words("الرحمن الرحيم"), "رحمن الرحيم")), l + " lam dropped");
    assert.ok(!okAll(run(l, words("غَفُورٌ رَّحِيمٌ"), "غفورن رحيم")), l + " tanween nun");
  }
});
test("easy still forgives one skipped word, medium/hard do not; several skips fail on easy", () => {
  const e = words("إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ");
  assert.ok(okAll(run("easy", e, "اياك نعبد نستعين")));
  assert.ok(!okAll(run("easy", e, "اياك وياك")));
  assert.ok(!okAll(run("medium", e, "اياك نعبد نستعين")));
  assert.ok(!okAll(run("hard", e, "اياك نعبد نستعين")));
  assert.ok(!okAll(run("easy", words("ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ"), "الصراط المستقيم عليهم")));
});
test("skeleton keeps consonants distinct", async () => {
  const { skeleton } = await import(join(dir, "tartil.js"));
  assert.notEqual(skeleton("الصلاه"), skeleton("السلاه"));
  assert.notEqual(skeleton("رب"), skeleton("ملك"));
  assert.equal(skeleton("الرحمن"), skeleton("رحمن"));
});

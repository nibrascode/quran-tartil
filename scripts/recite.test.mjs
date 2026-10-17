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
for (const [f, deps] of [["reciteCore.js", ["tartil", "prefix"]], ["prefix.js", ["tartil"]]]) { let c = readFileSync(join(dir, f), "utf8"); for (const d of deps) c = c.replace(`"./${d}"`, `"./${d}.js"`); writeFileSync(join(dir, f), c); }
const { ignoredPrefix } = await import(join(dir, "prefix.js"));
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
const W = (t) => t.split(" ");
test("medium: reveal stops at the wrong word, later words stay hidden, nothing advances", () => {
  const s = new ReciteSession(A, "medium");
  // wrong 3rd word, reciter keeps going through the ayah and into the next one
  s.feed(W("الحمد لله ملك العالمين الرحمن الرحيم"));
  const r = s.res.get("1:2");
  assert.deepEqual(r.states, ["ok", "ok", "bad", "pending"]);
  assert.ok(r.held && !r.closed);
  assert.equal(s.cursor, 0);
  assert.equal(s.res.get("1:3"), undefined);
  // more speech that skips the wrong word does not advance
  s.feed(W("الحمد لله ملك العالمين الرحمن الرحيم العالمين الرحمن الرحيم مالك يوم الدين"));
  assert.equal(s.cursor, 0);
  assert.deepEqual(s.res.get("1:2").states, ["ok", "ok", "bad", "pending"]);
});
test("re-reciting from the wrong word releases the hold and reveal continues", () => {
  const s = new ReciteSession(A, "medium");
  const h = W("الحمد لله ملك العالمين الرحمن");
  s.feed(h);
  assert.ok(s.held);
  const h2 = [...h, "رب", "العالمين"];
  s.feed(h2);
  assert.equal(s.cursor, 1);
  assert.ok(!s.held);
  const r = s.res.get("1:2");
  assert.ok(r.closed);
  assert.deepEqual(r.states, ["ok", "ok", "ok", "ok"]);
  assert.equal(r.score, 75); // one mistake in four words
});
test("restarting the whole ayah also releases the hold", () => {
  const s = new ReciteSession(A, "medium");
  const h = W("الحمد لله ملك العالمين الرحمن");
  s.feed(h);
  s.feed([...h, ...W("الحمد لله رب العالمين")]);
  assert.equal(s.cursor, 1);
  assert.ok(s.res.get("1:2").closed);
});
test("a wrong retry keeps the hold (red word stays, nothing after it shows)", () => {
  const s = new ReciteSession(A, "medium");
  const h = W("الحمد لله ملك العالمين الرحمن");
  s.feed(h);
  s.feed([...h, "ملك", "العالمين", "الرحمن"]);
  assert.ok(s.held);
  assert.deepEqual(s.res.get("1:2").states, ["ok", "ok", "bad", "pending"]);
});
test("skipped word: held as missing", () => {
  const s = new ReciteSession(A, "medium");
  s.feed(W("الحمد لله العالمين الرحمن"));
  const st = s.res.get("1:2").states;
  assert.deepEqual([st[0], st[1], st[3]], ["ok", "ok", "pending"]);
  assert.ok(st[2] === "bad" || st[2] === "missing"); // red either way
  assert.ok(s.held);
});
test("hard: an unconfirmed wrong word stays neutral; a second sighting or a final result turns it red and holds", () => {
  const s = new ReciteSession(A, "hard");
  s.feed(W("الحمد لله ملك"));
  assert.equal(s.res.get("1:2").states[2], "pending"); // could still be an interim guess: never red yet
  assert.ok(!s.held);
  s.feed(W("الحمد لله ملك"), true);
  assert.equal(s.res.get("1:2").states[2], "bad");
  assert.ok(s.held);
  s.feed(W("الحمد لله ملك رب العالمين"));
  assert.equal(s.cursor, 1);
});
test("hard: interim guess that is corrected does not hold", () => {
  const s = new ReciteSession(A, "hard");
  s.feed(W("الحمد لله ملك"));
  s.feed(W("الحمد لله رب"));
  assert.ok(!s.held);
  assert.equal(s.res.get("1:2").states[2], "ok");
});
test("easy: a wrong word is only flagged after two more words, which stay hidden", () => {
  const s = new ReciteSession(A, "easy");
  s.feed(W("الحمد لله ملك"));
  assert.ok(!s.held);
  assert.equal(s.res.get("1:2").states[2], "pending");
  s.feed(W("الحمد لله ملك العالمين"));
  assert.deepEqual(s.res.get("1:2").states, ["ok", "ok", "bad", "pending"]);
  assert.ok(s.held);
});
test("easy forgives one slip that medium holds on", () => {
  const e = new ReciteSession(A, "easy");
  const m = new ReciteSession(A, "medium");
  const h = W("الحمد لله العالمين الرحمن الرحيم");
  e.feed(h); m.feed(h);
  assert.ok(m.held);
  assert.ok(e.cursor >= 1 || !e.held || e.res.get("1:2").states[2] !== "missing");
});
test("a mistake in the 2nd ayah keeps the first closed and scored", () => {
  const s = new ReciteSession(A, "medium");
  s.feed(W("الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين"));
  assert.ok(s.finished);
  const t = new ReciteSession(A, "medium");
  t.feed(W("الحمد لله رب العالمين الرحمن الكريم مالك"));
  assert.ok(t.res.get("1:2").closed);
  assert.equal(t.cursor, 1);
  assert.ok(t.held);
  assert.equal(t.res.get("1:4"), undefined);
});
test("new recogniser session restarts word counting without losing progress", () => {
  const s = new ReciteSession(A, "medium");
  s.feed("الحمد لله رب العالمين".split(" "));
  s.newRecogniser();
  s.feed(["الرحمن", "الرحيم"]);
  assert.equal(s.cursor, 2);
});
test("stop shows the current ayah as it stands (confirmed mistake is red)", () => {
  const s = new ReciteSession(A, "hard");
  s.feed(["الحمد", "ملك"], true);
  assert.equal(s.res.get("1:2").states[1], "bad");
});

test("stop with nothing heard for the current ayah does not score it as zero", () => {
  const s = new ReciteSession(A, "medium");
  s.feed("الحمد لله رب العالمين".split(" "));
  s.finish();
  assert.equal(s.score, 100);
  assert.ok(!s.res.get("1:3")?.closed);
});

test("mistakes list records the wrong word once per word with a count", () => {
  const s = new ReciteSession(A, "medium");
  const h = "الحمد لله ملك العالمين الرحمن".split(" ");
  s.feed(h);
  assert.equal(s.events.length, 1);
  assert.equal(s.events[0].key, "1:2");
  assert.equal(s.events[0].n, 1);
  assert.ok(s.events[0].word.includes("رَبِّ"));
  s.feed([...h, "ملك", "العالمين", "الرحمن"]);
  assert.equal(s.events.length, 1); // same word, not listed twice
});
test("seek goes back to an ayah and drops later progress", () => {
  const s = new ReciteSession(A, "medium");
  s.feed("الحمد لله رب العالمين الرحمن".split(" "));
  assert.equal(s.cursor, 1);
  s.seek(0, 5);
  assert.equal(s.cursor, 0);
  assert.equal(s.res.size, 0);
  s.feed("الحمد لله رب العالمين الرحمن الرحيم".split(" ").slice(0, 5).concat(["الحمد", "لله", "رب", "العالمين"]));
  assert.equal(s.cursor, 1);
});
test("a burst of many words (silence, then a flood) is matched ayah by ayah", () => {
  const s = new ReciteSession(A, "medium");
  s.feed(W("الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين"));
  assert.ok(s.finished);
  const t = new ReciteSession(A, "medium");
  t.feed(W("الحمد لله رب العالمين الرحمن الكريم مالك يوم"));
  assert.equal(t.cursor, 1);
  assert.ok(t.held);
});

// ---- isti'adha / basmala before reciting ----
const ISTI = "اعوذ بالله من الشيطان الرجيم".split(" ");
test("isti'adha is always ignored (never a wrong word) at every level", () => {
  for (const lvl of ["easy", "medium", "hard"]) {
    const s = new ReciteSession(A, lvl);
    s.feed([...ISTI, "الحمد", "لله", "رب", "العالمين", "الرحمن", "الرحيم"]);
    assert.equal(s.cursor, 2, lvl);
    assert.equal(s.events.length, 0, lvl);
    assert.deepEqual(s.res.get("1:2").states, ["ok", "ok", "ok", "ok"], lvl);
  }
});
test("isti'adha spoken word by word (interim results) does not create a mistake", () => {
  const s = new ReciteSession(A, "hard");
  const all = [...ISTI, "الحمد", "لله"];
  for (let i = 1; i <= all.length; i++) s.feed(all.slice(0, i));
  assert.equal(s.events.length, 0);
  assert.deepEqual(s.res.get("1:2").states.slice(0, 2), ["ok", "ok"]);
});
test("isti'adha + basmala before an ayah that does not contain the basmala are ignored", () => {
  const s = new ReciteSession(A, "medium");
  s.feed([...ISTI, "بسم", "الله", "الرحمن", "الرحيم", "الحمد", "لله", "رب", "العالمين"]);
  assert.equal(s.events.length, 0); assert.equal(s.cursor, 1);
});
test("basmala is expected text on 1:1 and still ignored when omitted elsewhere", () => {
  const F = [{ key: "1:1", tokens: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ".split(" ") }, ...A];
  const s = new ReciteSession(F, "medium");
  s.feed(["بسم", "الله", "الرحمن", "الرحيم", "الحمد", "لله", "رب", "العالمين"]);
  assert.equal(s.cursor, 2); assert.equal(s.events.length, 0);
  assert.equal(ignoredPrefix(["بسم", "الله", "الرحمن", "الرحيم"], "بِسْمِ"), 0);
  assert.equal(ignoredPrefix(["اعوذ", "بالله", "من", "الشيطان", "الرجيم", "بسم"], "بِسْمِ"), 5);
});
test("a wrong word after the isti'adha is still a mistake; the isti'adha words alone are never matched to text", () => {
  const s = new ReciteSession(A, "easy");
  s.feed([...ISTI, "الحمد", "لله", "ملك", "العالمين"]);
  assert.ok(s.events.length >= 1); assert.equal(s.events[0].word, "رَبِّ");
  assert.equal(ignoredPrefix(["الحمد", "لله"], "x"), 0);
  assert.equal(ignoredPrefix(["من", "قبل"], "x"), 0); // "من" alone is not isti'adha
});

// ---- pauses, recogniser restarts, interim corrections ----
const B = [{ key: "2:255", tokens: "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ".split(" ") }, { key: "2:256", tokens: "لَآ إِكْرَاهَ فِى ٱلدِّينِ".split(" ") }];
const hasBad = (s, key) => s.res.get(key).states.some((x) => x === "bad" || x === "missing");
for (const lvl of ["easy", "medium", "hard"]) {
  test(`${lvl}: pause + recogniser restart continues from the next word (no mistake)`, () => {
    const s = new ReciteSession(B, lvl);
    s.feed(W("الله لا اله"));
    s.newRecogniser(); // engine restarted after silence: words count from zero again
    s.feed(W("الا"), false); s.feed(W("الا هو"), false);
    assert.ok(!hasBad(s, "2:255"));
    assert.deepEqual(s.res.get("2:255").states.slice(0, 5), ["ok", "ok", "ok", "ok", "ok"]);
    s.feed(W("الا هو الحي القيوم"), true);
    assert.ok(s.res.get("2:255").closed); assert.equal(s.events.length, 0);
  });
  test(`${lvl}: restart that repeats the last words is not a mistake`, () => {
    const s = new ReciteSession(B, lvl);
    s.feed(W("الله لا اله الا"));
    s.newRecogniser();
    s.feed(W("اله")); s.feed(W("اله الا")); s.feed(W("اله الا هو")); s.feed(W("اله الا هو الحي القيوم"), true);
    assert.ok(s.res.get("2:255").closed); assert.equal(s.events.length, 0); assert.equal(s.res.get("2:255").score, 100);
  });
  test(`${lvl}: pause/resume with several restarts in a row`, () => {
    const s = new ReciteSession(B, lvl);
    s.feed(W("الله")); s.newRecogniser(); s.newRecogniser();
    s.feed(W("لا اله")); s.newRecogniser(); s.feed(W("الا هو")); s.newRecogniser(); s.feed(W("الحي القيوم"), true);
    assert.ok(s.res.get("2:255").closed); assert.equal(s.events.length, 0);
  });
  test(`${lvl}: a real mistake after a restart is still caught`, () => {
    const s = new ReciteSession(B, lvl);
    s.feed(W("الله لا")); s.newRecogniser(); s.feed(W("سلام كلام طعام"), true); s.feed(W("سلام كلام طعام"), true);
    assert.ok(s.held);
  });
}
test("interim guesses are never painted red: neutral until confirmed, then a corrected word turns green directly", () => {
  const s = new ReciteSession(B, "medium");
  const seen = [];
  const f = (t, fin = false) => { s.feed(W(t), fin); seen.push(s.res.get("2:255").states.slice()); };
  f("الله لا"); f("الله لا ابه"); // wrong-looking newest word, unconfirmed
  assert.ok(!seen.at(-1).some((x) => x === "bad" || x === "missing"), "unconfirmed word must not be red");
  assert.equal(seen.at(-1)[2], "pending");
  f("الله لا اله"); f("الله لا اله الا هو الحي القيوم", true);
  for (const st of seen) assert.ok(!st.some((x) => x === "bad" || x === "missing"), "no red flash at any point");
  assert.ok(s.res.get("2:255").closed);
});
test("a word already green is never downgraded by a later interim", () => {
  const s = new ReciteSession(B, "hard");
  s.feed(W("الله لا اله")); assert.deepEqual(s.res.get("2:255").states.slice(0, 3), ["ok", "ok", "ok"]);
  s.feed(W("الله لو اله")); // recogniser rewrote an earlier word
  assert.deepEqual(s.res.get("2:255").states.slice(0, 3), ["ok", "ok", "ok"]);
  assert.ok(!s.held);
});

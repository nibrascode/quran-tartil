import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "st-"));
try { execFileSync("npx", ["tsc", "src/reciteCore.ts", "src/stabilize.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler", "--skipLibCheck"], { stdio: "ignore", timeout: 60000 }); } catch {}
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
for (const [f, deps] of [["reciteCore.js", ["tartil", "prefix"]], ["prefix.js", ["tartil"]]]) { let c = readFileSync(join(dir, f), "utf8"); for (const d of deps) c = c.replace(`"./${d}"`, `"./${d}.js"`); writeFileSync(join(dir, f), c); }
const { ReciteSession } = await import(join(dir, "reciteCore.js"));
const { Stabilizer, CONFIRM_MS } = await import(join(dir, "stabilize.js"));

const A = [
  { key: "1:2", tokens: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ".split(" ") },
  { key: "1:3", tokens: "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ".split(" ") },
];
const W = (t) => t.split(" ");

/** faked recogniser: [time ms, cumulative words, isFinal]; the clock also ticks between events like the hook's timer */
function run(level, events, endAt) {
  const sess = new ReciteSession(A, level), stab = new Stabilizer(CONFIRM_MS[level]);
  const seen = []; // every colouring the user could ever see
  const snap = (t) => seen.push({ t, st: JSON.parse(JSON.stringify([...sess.res.entries()])) });
  let now = 0;
  const step = (to) => { for (; now < to; now += 25) { const before = stab.waiting; const st = stab.poll(now); if (before) { sess.feed(st, true); snap(now); } } };
  for (const [t, words, fin] of events) { step(t); now = t; const st = stab.push(W(words), !!fin, now); sess.feed(st, true); snap(now); }
  step(endAt);
  return { sess, seen };
}
const everBad = (seen) => seen.some((s) => s.st.some(([, r]) => r.states.some((x) => x === "bad" || x === "missing")));
const okCount = (r) => r.states.filter((x) => x === "ok").length;

test("interim guess that is corrected never flashes red", () => {
  for (const level of ["easy", "medium", "hard"]) {
    const { sess, seen } = run(level, [
      [0, "الحمد", 0], [120, "الحمد لله", 0], [240, "الحمد لله ملك", 0], // wrong interim guess for "رب"
      [330, "الحمد لله رب", 0], [450, "الحمد لله رب العالمين", 1],
    ], 1500);
    assert.ok(!everBad(seen), level + ": red flashed");
    assert.equal(sess.cursor, 1, level);
    assert.equal(sess.res.get("1:2").score, 100);
  }
});
test("a correct word turns green as soon as it is confirmed, without waiting for the end", () => {
  const { seen } = run("medium", [[0, "الحمد", 0], [100, "الحمد لله", 0], [200, "الحمد لله رب", 0]], 1000);
  const r = seen.at(-1).st.find(([k]) => k === "1:2")[1];
  assert.deepEqual(r.states, ["ok", "ok", "ok", "pending"]);
  // and it never went ok -> something else
  for (const s of seen) { const x = s.st.find(([k]) => k === "1:2"); if (x) assert.ok(x[1].states.every((v) => v === "ok" || v === "pending")); }
});
test("interim words are held back until confirmed", () => {
  const stab = new Stabilizer(400);
  assert.deepEqual(stab.push(["الحمد"], false, 0), []);
  assert.deepEqual(stab.push(["الحمد", "لله"], false, 100), ["الحمد"]); // followed by another word and unchanged
  assert.deepEqual(stab.poll(300), ["الحمد"]);
  assert.deepEqual(stab.poll(600), ["الحمد", "لله"]); // unchanged for 400ms
  assert.deepEqual(stab.push(["الحمد", "لله", "رب"], true, 650), ["الحمد", "لله", "رب"]); // final releases at once
});
test("released words never change afterwards", () => {
  const stab = new Stabilizer(300);
  stab.push(["الحمد", "لله"], false, 0); stab.push(["الحمد", "لله"], false, 400);
  assert.deepEqual(stab.push(["الحمد", "شيء", "رب"], false, 450).slice(0, 2), ["الحمد", "لله"]);
});
test("a real mistake is still flagged promptly after confirmation (per level)", () => {
  for (const [level, extra] of [["hard", ""], ["medium", " العالمين"], ["easy", " العالمين الرحمن"]]) {
    const { seen, sess } = run(level, [[0, "الحمد لله ملك" + extra, 0], [200, "الحمد لله ملك" + extra, 0]], 1200);
    const flaggedAt = seen.find((s) => s.st.some(([, r]) => r.states.some((x) => x === "bad" || x === "missing")));
    assert.ok(flaggedAt, level + " never flagged");
    assert.ok(flaggedAt.t <= CONFIRM_MS[level] + 100 + 25, level + " flagged late: " + flaggedAt.t);
    assert.ok(sess.held, level);
  }
});
test("a stable wrong word that is then re-recited correctly is green after the retry", () => {
  const { sess } = run("medium", [[0, "الحمد لله ملك العالمين", 1], [600, "الحمد لله ملك العالمين رب العالمين", 1]], 1500);
  assert.equal(sess.cursor, 1);
});

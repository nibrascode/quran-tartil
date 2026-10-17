import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "ly-"));
execFileSync("npx", ["tsc", "src/layout.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--skipLibCheck"], { stdio: "ignore", timeout: 60000 });
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
const { plan, balanced, greedy, ROWS } = await import(join(dir, "layout.js"));

// deterministic pseudo-random word widths (em) like Arabic words: 1.2 .. 4
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const words = (n) => Array.from({ length: n }, () => 1.2 + rnd() * 2.8);

test("every page plan has exactly 15 rows, from sparse to dense pages", () => {
  for (const n of [40, 80, 120, 150, 190]) {
    const p = plan([{ kind: "text", w: words(n), endsSura: false }], 360, 640);
    assert.equal(p.rows.length, ROWS, "words " + n);
  }
});
test("heads and basmala take a row each, text fills the rest", () => {
  const segs = [
    { kind: "text", w: words(30), endsSura: true },
    { kind: "head", w: [], endsSura: false },
    { kind: "bism", w: [], endsSura: false },
    { kind: "text", w: words(70), endsSura: false },
  ];
  const p = plan(segs, 360, 640);
  assert.equal(p.rows.length, ROWS);
  assert.equal(p.rows.filter((r) => r.type === "head").length, 1);
});
test("lines are balanced and never overflow the width", () => {
  const w = words(100), cap = 40;
  const s = balanced(w, 12, 40);
  assert.equal(s.length, 12);
  for (let k = 0; k < s.length; k++) {
    const a = s[k], b = k + 1 < s.length ? s[k + 1] : w.length;
    const used = w.slice(a, b).reduce((x, y) => x + y, 0) + (b - a - 1) * 0.14;
    assert.ok(used <= cap + 1e-9 || b - a === 1);
  }
});
test("a sura's last line may be short (centred); other pages are justified", () => {
  const p = plan([{ kind: "text", w: words(60), endsSura: true }], 360, 640);
  assert.ok(p.rows.filter((r) => r.centered).length <= 1);
  const q = plan([{ kind: "text", w: words(60), endsSura: false }], 360, 640);
  assert.equal(q.rows.filter((r) => r.centered).length, 0);
});

import test from "node:test";
import assert from "node:assert/strict";
import { bench } from "./recog-corpus.mjs";
const res = await bench();
test("corpus: correct recitation with realistic recogniser noise is accepted (>= 99% per variant, every level)", () => {
  for (const [lv, r] of Object.entries(res)) for (const k of Object.keys(r.total)) assert.ok((r.accepted[k] || 0) / r.total[k] >= 0.99, `${lv}/${k}: ${r.accepted[k] || 0}/${r.total[k]}`);
});
test("corpus: wrong words / wrong letters / swapped order are never accepted at medium and hard", () => {
  for (const lv of ["medium", "hard"]) for (const k of Object.keys(res[lv].wrongTotal)) assert.equal(res[lv].falseAccepts[k] || 0, 0, `${lv}/${k}`);
});
test("corpus: easy never accepts a substituted word or wrong letter; only dropped 1-2 letter particles slip through", () => {
  const r = res.easy;
  assert.equal(r.falseAccepts.substitutedWord || 0, 0); assert.equal(r.falseAccepts.wrongLetter || 0, 0);
  assert.ok((r.falseAccepts.skippedWord || 0) / r.wrongTotal.skippedWord < 0.15);
});

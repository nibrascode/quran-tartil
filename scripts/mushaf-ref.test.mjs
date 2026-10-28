// The main (uploaded) Mushaf view: its 604 page files must hold exactly the Quran text of src/data/quran-uthmani.txt
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const ref = new Map();
for (const l of fs.readFileSync("src/data/quran-uthmani.txt", "utf8").split("\n")) { const [s, a, t] = l.split("|"); if (t) ref.set(`${s}:${a}`, t); }
// Tanzil prefixes the basmala to ayah 1 and leaves out the small pause signs (the page files show both as in print); both are ignored here, every letter and haraka is compared
// tatweel and the small pause signs are left out of the comparison; marks on one letter are compared as a set (same marks, any order); every letter and every haraka must match
const MARK = /[\u064B-\u065F\u0670\u06DF-\u06E8\u06EA-\u06ED]/;
const norm = (t) => {
  const cl = [];
  for (const ch of t.normalize("NFC").replace(/[\u0640\u06D6-\u06DC\u06DE\u06E9]/g, "").replace(/\s+/g, " ").trim()) {
    if (MARK.test(ch) && cl.length) cl[cl.length - 1].push(ch); else cl.push([ch]);
  }
  return cl.map(([b, ...m]) => b + m.sort().join("")).join("");
};
const BASM = norm("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ") + " ";
test("mushaf view: every ayah matches the reference, in order, none missing", () => {
  let s = 0, a = 0, words = [], seen = 0, bad = [];
  for (let p = 1; p <= 604; p++) {
    const d = JSON.parse(fs.readFileSync(`src/mushaf/data/pages/p${p}.json`, "utf8"));
    if (!words.length) { s = d.s; a = d.a; }
    for (const line of d.lines) for (const c of line) {
      if (typeof c === "string") words.push(c);
      else if ("h" in c) { s = c.h; a = 1; words = []; }
      else if ("b" in c) {}
      else if ("n" in c) {
        assert.equal(c.n, a, `p${p} marker order ${s}:${a}`);
        const got = norm(words.join(" ")), want = ((w) => (a === 1 && s !== 1 && s !== 9 && w.split(" ").length === got.split(" ").length + 4 && w.split(" ").slice(1, 4).join(" ") === BASM.trim().split(" ").slice(1).join(" ") ? w.split(" ").slice(4).join(" ") : w))(norm(ref.get(`${s}:${a}`) ?? ""));
        if (got !== want) bad.push(`${s}:${a} p${p}`);
        seen++; a++; words = [];
      }
    }
  }
  assert.deepEqual(bad.slice(0, 10), []);
  assert.equal(seen, 6236);
});

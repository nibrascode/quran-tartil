import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "vn-"));
try { execFileSync("npx", ["tsc", "src/voiceNav.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler", "--skipLibCheck"], { stdio: "ignore", timeout: 60000 }); } catch {}
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
writeFileSync(join(dir, "voiceNav.js"), readFileSync(join(dir, "voiceNav.js"), "utf8").replace('"./tartil"', '"./tartil.js"'));
const { buildNavIndex, locateAyah, decideNav } = await import(join(dir, "voiceNav.js"));
const meta = JSON.parse(readFileSync(new URL("../src/data/meta.json", import.meta.url), "utf8"));
const rows = readFileSync(new URL("../src/data/quran-uthmani.txt", import.meta.url), "utf8").split("\n").map((l) => /^(\d+)\|(\d+)\|(.*)$/.exec(l)).filter(Boolean).map((m) => ({ s: +m[1], a: +m[2], t: m[3].trim() }));
const bare = (w) => w.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "");
const B = rows[0].t.split(" ");
const list = rows.map((r) => { let w = r.t.split(" "); if (r.a === 1 && r.s !== 1 && r.s !== 9 && w.length > 4 && B.every((x, i) => bare(x) === bare(w[i]))) w = w.slice(4); return { s: r.s, a: r.a, tokens: w }; });
const idx = buildNavIndex(list);
// page of an ayah via the page start table
const starts = meta.pages.map(([s, a]) => rows.findIndex((r) => r.s === s && r.a === a));
const pageOf = (i) => { let p = 1; starts.forEach((st, k) => { if (st <= i) p = k + 1; }); return p; };
const info = (i) => ({ s: list[i].s, a: list[i].a });
const find = (txt, cur = 1) => locateAyah(idx, txt.split(" "), pageOf, cur, info);
const at = (r) => r.best && r.best.s + ":" + r.best.a;

test("index covers the whole Quran", () => { assert.equal(idx.keys.length, 6236); assert.ok(idx.words.length > 77000); });
test("finds ayahs from the first words (diacritic-insensitive, other pages)", () => {
  assert.equal(at(find("الحمد لله رب العالمين")), "1:2");
  assert.equal(at(find("قل هو الله احد", 1)), "112:1");
  assert.equal(at(find("تبارك الذي بيده الملك")), "67:1");
  assert.equal(at(find("والعصر ان الانسان لفي خسر")), "103:1");
  assert.equal(find("قل هو الله احد").best.page, pageOf(rows.findIndex((r) => r.s === 112 && r.a === 1)));
});
test("imla'i / Uthmani spelling variants both work (dagger alif)", () => {
  assert.equal(at(find("الرحمان الرحيم")), "1:3");
  assert.equal(at(find("الرحمن الرحيم")), "1:3");
});
test("repeated openings are told apart by the following words (alif lam mim etc.)", () => {
  assert.equal(at(find("الم ذلك الكتاب لا ريب فيه")), "2:1");
  assert.equal(at(find("الم الله لا اله الا هو الحي القيوم")), "3:1");
  assert.equal(at(find("الم غلبت الروم")), "30:1");
  assert.equal(at(find("الم تنزيل الكتاب لا ريب فيه")), "32:1");
});
test("ties are broken by the current page, then order", () => {
  const r1 = find("الم", 1), r2 = find("الم", 400);
  assert.ok(r1.ambiguous && r2.ambiguous);
  assert.equal(at(r1), "2:1"); // nearest to page 1 / earliest
  const pages = [2, 3, 29, 30, 31, 32].map((s) => pageOf(rows.findIndex((r) => r.s === s && r.a === 1))).sort((a, b) => Math.abs(a - 400) - Math.abs(b - 400));
  assert.equal(r2.best.page, pages[0]);
});
test("decision rule: waits while ambiguous, jumps when one candidate leads, gives up on garbage", () => {
  assert.equal(decideNav(1, find("الم")), "wait");
  assert.equal(decideNav(3, find("الحمد لله رب")), "go");
  assert.equal(decideNav(2, find("الحمد لله")), "wait");
  assert.equal(decideNav(8, find("كلمات عشوائية غير موجودة")), "giveup");
  // identical openings: Ayat al-Kursi vs 3:2 are told apart by later words, never guessed early
  const k6 = find("الله لا اله الا هو الحي"); assert.ok(k6.ambiguous); assert.equal(decideNav(6, k6), "wait");
  assert.equal(at(find("الله لا اله الا هو الحي القيوم لا تاخذه سنه ولا نوم")), "2:255");
  assert.equal(decideNav(10, find("الله لا اله الا هو الحي القيوم لا تاخذه سنه")), "go");
  assert.equal(at(find("الله لا اله الا هو الحي القيوم نزل عليك الكتاب بالحق")), "3:2");
  assert.equal(decideNav(12, find("الله لا اله الا هو الحي")), "go"); // still tied after 12 words: nearest page
});

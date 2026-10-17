import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "i18n-"));
execFileSync("npx", ["esbuild", "src/i18n.ts", "--bundle", "--format=esm", "--outfile=" + join(dir, "i18n.mjs"), "--log-level=error"], { timeout: 60000 });
const { T } = await import(join(dir, "i18n.mjs"));
const LANGS = ["az", "tr", "ar", "ru"];
const en = T.en;
// strings that are legitimately identical across languages (brand, codes, symbols, loanwords)
const SAME_OK = /^(Quran Tartil|Nibras Code|tanzil\.net|ar-[A-Z]{2}|[\d\W]*|Amiri|Tanzil|OK|SIL|JSON|Android|Quran|Tartil|Haptic|Online|[A-Za-z]{1,3})$/;
test("every language has every key (no missing / undefined strings)", () => {
  for (const l of LANGS) { const miss = Object.keys(en).filter((k) => T[l][k] === undefined || T[l][k] === ""); assert.deepEqual(miss, [], l); }
});
test("placeholders {n} {a} {p}... are preserved in every translation", () => {
  const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(",");
  for (const l of LANGS) for (const k of Object.keys(en)) if (typeof en[k] === "string") assert.equal(ph(T[l][k]), ph(en[k]), `${l}.${k}`);
});
test("translations are really translated (no English left over), per language", () => {
  for (const l of LANGS) {
    const same = Object.keys(en).filter((k) => typeof en[k] === "string" && en[k].length > 3 && T[l][k] === en[k] && !SAME_OK.test(en[k]));
    assert.ok(same.length <= 6, `${l}: untranslated ${same.length}: ${same.slice(0, 12).join(", ")}`);
  }
});
test("Arabic UI strings contain Arabic script; Russian contains Cyrillic", () => {
  const bad = (re, l) => Object.keys(en).filter((k) => typeof en[k] === "string" && en[k].length > 12 && !re.test(T[l][k]) && !/tanzil|http/i.test(T[l][k]));
  assert.ok(bad(/[\u0600-\u06FF]/, "ar").length <= 3, "ar: " + bad(/[\u0600-\u06FF]/, "ar").join(","));
  assert.ok(bad(/[\u0400-\u04FF]/, "ru").length <= 3, "ru: " + bad(/[\u0400-\u04FF]/, "ru").join(","));
});
test("no URL-like or html text in any UI string except the tanzil credit", () => {
  for (const l of ["en", ...LANGS]) for (const [k, v] of Object.entries(T[l])) if (typeof v === "string" && /<[a-z]|https?:\/\//i.test(v)) assert.ok(/tanzil/i.test(v + k), `${l}.${k}`);
});

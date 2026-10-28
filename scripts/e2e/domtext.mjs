// Rendered-text audit: every page's DOM text (word spans, incl. tajweed-coloured runs, and ayah markers) must equal the data,
// which scripts/text-audit.test.mjs checks against KFGQPC v18 and quran.com codepoint by codepoint.
import { chromium } from "playwright-core";
import { readFileSync } from "fs";
const M = JSON.parse(readFileSync(new URL("../../src/data/mushaf15.json", import.meta.url), "utf8"));
const plain = (w) => w.replace(/\uE000.|\uE001/g, "");
const want = (n) => M[n - 1].filter((r) => typeof r[0] !== "string").flatMap((r) => r.flatMap(([s, a, t]) => t.split(" ").map((w) => s + ":" + a + " " + plain(w))));
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const step = +(process.env.STEP || 1);
let bad = 0, pages = 0, words = 0, tj = 0;
for (const tajweed of [true, false]) {
  const p = await (await b.newContext({ viewport: { width: 412, height: 860 } })).newPage();
  await p.addInitScript((tw) => { sessionStorage.setItem("qt.home", "0"); localStorage.setItem("qt.v2", JSON.stringify({ onboarded: true, mig: 1, prefs: { tajweed: tw } })); }, tajweed);
  await p.goto(process.env.URL || "http://127.0.0.1:4180/", { waitUntil: "networkidle" });
  for (let n = 1; n <= 604; n += tajweed ? step : Math.max(step, 25)) {
    await p.evaluate((n) => localStorage.setItem("page", n), n); await p.reload({ waitUntil: "load" });
    await p.waitForSelector(".layer:not(.pre):not(.over) .page .ayah").catch(async (e) => { console.log("page", n, "url", p.url(), "body", (await p.evaluate(() => document.body.innerText.slice(0, 300)))); throw e; });
    const got = await p.evaluate(() => { const pg = document.querySelector(".layer:not(.pre):not(.over) .page"); return { w: [...pg.querySelectorAll(".mtext .ayah")].map((e) => e.dataset.s + ":" + e.dataset.a + " " + e.textContent), tj: pg.querySelectorAll(".mtext .tj").length }; });
    const exp = want(n); pages++; words += exp.length; tj += got.tj;
    if (got.w.length !== exp.length || got.w.some((w, i) => w !== exp[i])) { bad++; const i = got.w.findIndex((w, i) => w !== exp[i]); console.log("MISMATCH page", n, "tajweed", tajweed, "at", i, JSON.stringify(got.w[i]), JSON.stringify(exp[i])); }
    if (tajweed && n > 2 && got.tj === 0) { bad++; console.log("no tajweed spans on page", n); }
  }
  await p.context().close();
}
console.log("pages", pages, "words+markers", words, "tajweed spans", tj, "mismatches", bad);
await b.close(); if (bad) process.exit(1);

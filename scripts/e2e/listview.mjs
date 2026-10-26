// List view: top-bar icon toggles ayah cards for the surah (opens at the page's first ayah), Arabic text, the ticked translation and tafsir
// from the device, long tafsir scrolls inside a fixed-height box, icon returns to the Mushaf at the ayah on top. AR / AZ / EN, phone + tablet.
import { chromium } from "playwright-core";
import { readFileSync } from "fs";
const BASE = process.env.URL || "http://127.0.0.1:4180/";
const file = (p) => JSON.parse(readFileSync(new URL("../../public/" + p, import.meta.url), "utf8"));
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
let fail = 0; const bad = (m) => { fail++; console.log("FAIL", m); if (process.env.CI) console.log("::error title=listview::" + m); };
process.on("unhandledRejection", (e) => { console.log("::error title=listview crash::" + String(e?.message || e).split("\n").slice(0, 3).join(" | ")); process.exit(1); });
const L = ".layer:not(.pre):not(.over) .page, .spread .page";
const LBL = { az: "Siyahı görünüşü", en: "List view", ar: "عرض القائمة" };
const ctx = await b.newContext({ viewport: { width: 412, height: 860 } });
for (const [lang, w, h] of [["en", 412, 860], ["az", 1280, 800], ["ar", 412, 860]]) {
  const p = await ctx.newPage(); await p.setViewportSize({ width: w, height: h });
  await p.addInitScript((l) => { sessionStorage.setItem("qt.home", "0"); localStorage.setItem("lang", l); if (!sessionStorage.getItem("x")) { localStorage.setItem("page", "2"); sessionStorage.setItem("x", "1"); } localStorage.setItem("qt.v2", JSON.stringify({ onboarded: true })); }, lang);
  await p.goto(BASE, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  if (lang === "en") { // download Musayev + Ibn Kathir through the ayah panels (ticked automatically)
    for (const [label, id] of [["Translation", "az.musayev"], ["Tafsir", "ibnkathir"]]) {
      if (!(await p.locator(".asheet").count())) { await p.locator(`${L.split(",")[0]} .w.ayah[data-s="2"]`).first().click({ force: true }); await p.waitForTimeout(300); }
      await p.locator(".asheet .arow", { hasText: label }).click(); await p.waitForSelector(".lib-sheet");
      await p.waitForSelector(".lib-sheet .lib-dd, .lib-sheet .lib-body, .lib-sheet .lib-hint");
      if ((await p.locator(".lib-sheet .lib-allbtn").getAttribute("aria-expanded")) !== "true") await p.locator(".lib-sheet .lib-allbtn").click();
      await p.locator(`.lib-sheet .lib-opt[data-id="${id}"] .lib-dl`).click();
      for (let i = 0; i < 600 && !(await p.locator(`.lib-sheet .lib-body[data-id="${id}"]`).count()); i++) await p.waitForTimeout(200);
      await p.locator(".lib-sheet .x").click(); await p.waitForTimeout(200);
    }
  }
  const btn = p.locator(`.page .ph-list[aria-label="${LBL[lang]}"]`).first();
  if (!(await btn.count())) { bad(lang + ": no list icon"); continue; }
  if (await p.locator(".asheet").count()) await p.locator(".asheet .x").click();
  await p.locator(`${L.split(",")[0]} .ph-list, .spread .page .ph-list`).first().click(); await p.waitForSelector(".lv .lv-card");
  await p.waitForTimeout(500);
  const n = await p.locator(".lv .lv-card").count();
  if (n !== 286) bad(`${lang}: ${n} cards for al-Baqarah`);
  const topA = await p.evaluate(() => { const b = document.querySelector(".lv-body"); for (const c of b.querySelectorAll(".lv-card")) if (c.offsetTop + c.offsetHeight > b.scrollTop + 10) return Number(c.dataset.a); });
  if (topA < 1 || topA > 6) bad(`${lang}: list did not open at the page's first ayah (top ${topA})`);
  if (!(await p.locator('.lv-card[data-a="5"] .lv-ar').textContent()).includes("أُو۟لَٰٓئِكَ")) bad(lang + ": arabic text missing");
  if (lang !== "ar") {
    const mz = file("tr/az.musayev.json").v[1];
    if ((await p.locator('.lv-card[data-a="5"] .lv-x.tr[data-id="az.musayev"] p').textContent()).trim() !== mz[4].trim()) bad(lang + ": translation text differs");
    // a long tafsir is boxed with its own scroll
    const ik = file("tf/ibnkathir/2.json"); let a = 1; for (let i = 0; i < ik.length; i++) if (ik[i].length > ik[a - 1].length) a = i + 1;
    await p.evaluate((a) => document.querySelector(`.lv-card[data-a="${a}"]`).scrollIntoView(), a); await p.waitForTimeout(200);
    const box = await p.evaluate((a) => { const e = document.querySelector(`.lv-card[data-a="${a}"] .lv-tf`); const cs = getComputedStyle(e); return { sh: e.scrollHeight, ch: e.clientHeight, ov: cs.overflowY }; }, a);
    if (!(box.sh > box.ch + 50 && box.ch <= 330 && box.ov === "auto")) bad(`${lang}: long tafsir not boxed ${JSON.stringify(box)}`);
  } else if (!(await p.locator(".lv-x").count())) bad("ar: ticks from the panels not reused");
  if ((await p.locator(".lv").getAttribute("dir")) !== (lang === "ar" ? "rtl" : "ltr")) bad(lang + ": direction");
  // scroll to ayah 100 and return: the Mushaf opens at its page
  await p.evaluate(() => { const b = document.querySelector(".lv-body"); b.scrollTop = document.querySelector('.lv-card[data-a="100"]').offsetTop + 2; b.dispatchEvent(new Event("scroll")); }); await p.waitForTimeout(300);
  await p.locator(".lv .lv-toggle").click(); await p.waitForTimeout(800);
  if (await p.locator(".lv").count()) bad(lang + ": list did not close");
  const pages = await p.locator(L).evaluateAll((e) => e.map((x) => Number(x.dataset.page)));
  if (!pages.some((x) => x >= 15 && x <= 16)) bad(`${lang}: mushaf page after list ${pages}`); // 2:100 is on page 15-16
  console.log(lang, w + "x" + h, "cards", n, "top", topA, "back to", pages.join("/"));
  await p.close();
}
await b.close(); if (fail) process.exit(1);

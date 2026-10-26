// List view (page-based): top-bar icon toggles the ayah cards of the current page, horizontal swipe / header arrows turn pages, Arabic text, the ticked translation and tafsir
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
const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true });
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
  const cards = () => p.locator(".lv .lv-card").evaluateAll((e) => e.map((x) => x.dataset.s + ":" + x.dataset.a).join(","));
  const lvPage = async () => Number(await p.locator(".lv").getAttribute("data-page"));
  const swipe = (dx, dy) => p.evaluate(([dx, dy]) => { const el = document.querySelector(".lv-body"); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const T = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
    el.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [T(x, y)], changedTouches: [T(x, y)] }));
    el.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [T(x + dx, y + dy)] })); }, [dx, dy]);
  const c0 = await cards();
  if (c0 !== "2:1,2:2,2:3,2:4,2:5" || (await lvPage()) !== 2) bad(`${lang}: page 2 cards ${c0} page ${await lvPage()}`);
  if (!(await p.locator(".lv-pno").textContent()).includes(lang === "ar" ? "٢" : "2")) bad(lang + ": page number not shown");
  if (!(await p.locator('.lv-card[data-a="5"] .lv-ar').textContent()).includes("أُو۟لَٰٓئِكَ")) bad(lang + ": arabic text missing");
  if (lang !== "ar") {
    const mz = file("tr/az.musayev.json").v[1];
    if ((await p.locator('.lv-card[data-a="5"] .lv-x.tr[data-id="az.musayev"] p').textContent()).trim() !== mz[4].trim()) bad(lang + ": translation text differs");
    const box = await p.evaluate(() => [...document.querySelectorAll(".lv-tf")].map((e) => ({ sh: e.scrollHeight, ch: e.clientHeight, ov: getComputedStyle(e).overflowY })).sort((a, b) => b.sh - a.sh)[0]);
    if (!(box && box.sh > box.ch + 50 && box.ch <= 330 && box.ov === "auto")) bad(`${lang}: long tafsir not boxed ${JSON.stringify(box)}`);
    // the inner tafsir box scrolls on its own
    const inner = await p.evaluate(() => { const e = [...document.querySelectorAll(".lv-tf")].find((e) => e.scrollHeight > e.clientHeight + 50); e.scrollTop = 120; return e.scrollTop; });
    if (inner < 100) bad(lang + ": tafsir box does not scroll");
  } else if (!(await p.locator(".lv-x").count())) bad("ar: ticks from the panels not reused");
  if ((await p.locator(".lv").getAttribute("dir")) !== (lang === "ar" ? "rtl" : "ltr")) bad(lang + ": direction");
  // the first card sits fully below the header
  const clip = await p.evaluate(() => document.querySelector(".lv-card").getBoundingClientRect().top - document.querySelector(".lv-head").getBoundingClientRect().bottom);
  if (clip < 0) bad(lang + ": first card under the header " + clip);
  // swipe: vertical-ish moves do nothing, finger to the right = next page, to the left = previous
  await swipe(40, 220); await p.waitForTimeout(200); if ((await lvPage()) !== 2) bad(lang + ": vertical swipe turned the page");
  await swipe(200, 20); await p.waitForTimeout(300); if ((await lvPage()) !== 3 || !(await cards()).startsWith("2:6")) bad(`${lang}: swipe next -> ${await lvPage()} ${await cards()}`);
  await swipe(-200, 10); await p.waitForTimeout(300); if ((await lvPage()) !== 2) bad(lang + ": swipe prev -> " + (await lvPage()));
  await p.evaluate(() => { document.querySelector(".lv-body").scrollTop = 400; });
  await p.locator(".lv .lv-pnext").click(); await p.waitForTimeout(300);
  if ((await lvPage()) !== 3 || (await p.evaluate(() => document.querySelector(".lv-body").scrollTop)) !== 0) bad(lang + ": header next / scroll reset");
  // across a surah boundary: page 49 -> 50 starts Al Imran
  for (let i = 0; i < 46; i++) await p.locator(".lv .lv-pnext").click();
  await p.waitForTimeout(300);
  if ((await lvPage()) !== 49) bad(lang + ": header arrows " + (await lvPage()));
  await swipe(200, 0); await p.waitForTimeout(300);
  const c50 = await cards(); if ((await lvPage()) !== 50 || !c50.startsWith("3:1")) bad(`${lang}: page 50 cards ${c50.slice(0, 30)}`);
  await p.locator(".lv .lv-pprev").click(); await p.waitForTimeout(200); if ((await lvPage()) !== 49) bad(lang + ": header prev");
  const n = (await cards()).split(",").length;
  // back to the Mushaf on the list's page
  await p.locator(".lv .lv-toggle").click(); await p.waitForTimeout(800);
  if (await p.locator(".lv").count()) bad(lang + ": list did not close");
  const pages = await p.locator(L).evaluateAll((e) => e.map((x) => Number(x.dataset.page)));
  if (!pages.includes(49)) bad(`${lang}: mushaf page after list ${pages}`);
  const topA = c0;
  console.log(lang, w + "x" + h, "cards", n, "top", topA, "back to", pages.join("/"));
  await p.close();
}
await b.close(); if (fail) process.exit(1);

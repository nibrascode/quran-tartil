// Reader features: ayah notes (add / edit / list / delete), search in downloaded translations -> opens the ayah, continue button on Home,
// daily goal in juz, hifz mode (first word only, tap to reveal) in the Mushaf and the list view, night toggle in the page bar,
// share as text (Arabic + ticked translation + reference) and as an image, Arabic tab / Settings labels. EN phone, AZ tablet, AR phone.
import { chromium } from "playwright-core";
const BASE = process.env.URL || "http://127.0.0.1:4180/";
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
let fail = 0; const bad = (m) => { fail++; console.log("FAIL", m); if (process.env.CI) console.log("::error title=features::" + m); };
process.on("unhandledRejection", (e) => { console.log("::error title=features crash::" + String(e?.message || e).split("\n").slice(0, 3).join(" | ")); process.exit(1); });
const L = ".layer:not(.pre):not(.over) .page, .spread .page";
const X = { en: { note: "Add note", tab: ["Search", "Bookmarks", "Progress", "Settings"], cont: "Continue where you left off" },
  az: { note: "Qeyd əlavə et", tab: ["Axtarış", "Əlfəcinlər", "İrəliləyiş", "Ayarlar"], cont: "Qaldığınız yerdən davam edin" },
  ar: { note: "إضافة ملاحظة", tab: ["بحث", "العلامات", "التقدم", "الإعدادات"], cont: "تابع من حيث توقفت" } };
const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, acceptDownloads: true });
await ctx.addInitScript(() => { window.__shared = []; Object.defineProperty(navigator, "share", { configurable: true, value: async (d) => { window.__shared.push({ text: d.text || "", files: (d.files || []).map((f) => f.type + ":" + f.size) }); } });
  Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true }); });
for (const [lang, w, h] of [["en", 412, 860], ["az", 1280, 800], ["ar", 412, 860]]) {
  const p = await ctx.newPage(); await p.setViewportSize({ width: w, height: h });
  await p.addInitScript((l) => { if (!localStorage.getItem("e2e.home")) sessionStorage.setItem("qt.home", "0"); localStorage.setItem("lang", l); if (!sessionStorage.getItem("x")) { localStorage.setItem("page", "2"); sessionStorage.setItem("x", "1");
    const v = JSON.parse(localStorage.getItem("qt.v2") || "{}"); v.onboarded = true; v.bookmarks = []; v.prefs = { ...(v.prefs || {}), hifzView: false }; localStorage.setItem("qt.v2", JSON.stringify(v)); localStorage.setItem("theme", "light"); localStorage.setItem("qt.list", "0"); } }, lang);
  await p.goto(BASE, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  const menu = async (c) => { await p.locator(".ph-set:visible").first().click(); await p.waitForSelector(".ph-pop"); await p.locator(".ph-pop " + c).first().click(); };
  const tapAyah = async (a) => { await p.locator(`${L.split(",")[0]} .w.ayah[data-s="2"][data-a="${a}"], .spread .page .w.ayah[data-s="2"][data-a="${a}"]`).first().click({ force: true }); await p.waitForSelector(".asheet", { timeout: 8000 }).catch(async (e) => { await p.screenshot({ path: "/tmp/feat-" + lang + ".png" }); throw e; }); };
  if (lang === "en") { // translation on the device (ticked automatically)
    await tapAyah(2); await p.locator(".asheet .arow", { hasText: "Translation" }).click(); await p.waitForSelector(".lib-sheet .lib-dd, .lib-sheet .lib-body, .lib-sheet .lib-hint");
    if ((await p.locator(".lib-sheet .lib-allbtn").getAttribute("aria-expanded")) !== "true") await p.locator(".lib-sheet .lib-allbtn").click();
    await p.locator('.lib-sheet .lib-opt[data-id="az.musayev"] .lib-dl').click();
    for (let i = 0; i < 600 && !(await p.locator('.lib-sheet .lib-body[data-id="az.musayev"]').count()); i++) await p.waitForTimeout(200);
    await p.locator(".lib-sheet .x").click(); await p.waitForTimeout(200);
  }
  // 1. note
  if (!(await p.locator(".asheet").count())) await tapAyah(3);
  const nb = p.locator(".asheet .anote"); if (!(await nb.textContent()).includes(X[lang].note)) bad(lang + ": note label " + (await nb.textContent()));
  await nb.click(); await p.fill(".note-ed textarea", "note-" + lang); await p.click(".note-save"); await p.waitForTimeout(200);
  if (!(await p.locator(".asheet .anote-t").textContent()).includes("note-" + lang)) bad(lang + ": note not shown in the sheet");
  // share as text and image
  await p.click(".asheet .ashare"); await p.waitForTimeout(400);
  await p.click(".asheet .ashare-img"); await p.waitForTimeout(1500);
  const sh = await p.evaluate(() => window.__shared.splice(0));
  if (!sh[0] || !sh[0].text.includes("البقرة") || !/[\u0621-\u064A]/.test(sh[0].text)) bad(lang + ": share text " + JSON.stringify(sh[0]));
  if (lang === "en" && !sh[0]?.text.includes("Musayev")) bad("en: share text lacks the ticked translation");
  if (!sh[1] || !/^image\/png:\d{4,}/.test(sh[1].files[0] || "")) bad(lang + ": share image " + JSON.stringify(sh[1]));
  await p.locator(".asheet .x").click(); await p.waitForTimeout(200);
  // menu: bookmarks list with note -> jump
  await menu(".ph-settings"); await p.waitForTimeout(400);
  const tabs = await p.evaluate(() => [...document.querySelectorAll(".menu .tab, .sheet .tab, [role=tab]")].map((x) => x.textContent.trim()));
  for (const t of X[lang].tab) if (!tabs.includes(t)) bad(`${lang}: tab label ${t} missing (${tabs.join("|")})`);
  await p.locator("button", { hasText: X[lang].tab[1] }).first().click(); await p.waitForTimeout(300);
  if (!(await p.locator(".bm-note", { hasText: "note-" + lang }).count())) bad(lang + ": note not in the bookmarks list");
  // goal in juz
  await p.locator("button", { hasText: X[lang].tab[2] }).first().click(); await p.waitForTimeout(300);
  await p.click('.goal-juz [data-juz="2"]'); await p.waitForTimeout(200);
  if ((await p.evaluate(() => JSON.parse(localStorage.getItem("qt.v2")).goal)) !== 40) bad(lang + ": juz goal not stored");
  if (!(await p.locator(".goal-now").textContent()).includes("40")) bad(lang + ": goal text");
  // search in translations (az.musayev is on the device)
  await p.locator("button", { hasText: X[lang].tab[0] }).first().click(); await p.waitForTimeout(300);
  await p.fill(".menu input.field[dir=auto], input.field[dir=auto]", "Kitab"); await p.waitForTimeout(1500);
  const hits = p.locator(".tr-hit"); if (!(await hits.count())) bad(lang + ": no translation hits");
  else { const before = await p.evaluate(() => localStorage.getItem("page")); await hits.nth(3).click(); await p.waitForTimeout(800);
    if ((await p.evaluate(() => localStorage.getItem("page"))) === before && (await hits.count())) bad(lang + ": hit did not open the ayah"); }
  await p.evaluate(() => localStorage.setItem("page", "2")); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1000);
  // 6. night toggle
  await menu(".ph-night"); await p.waitForTimeout(300);
  if ((await p.evaluate(() => document.documentElement.dataset.theme)) !== "dark") bad(lang + ": night toggle did not darken");
  await menu(".ph-night"); await p.waitForTimeout(300);
  if ((await p.evaluate(() => document.documentElement.dataset.theme)) === "dark") bad(lang + ": night toggle did not restore");
  // 5. hifz in the Mushaf
  await menu(".ph-hifz"); await p.waitForTimeout(500);
  const vis = () => p.evaluate((sel) => { const pg = [...document.querySelectorAll(sel)].find((x) => x.querySelector('.w.ayah[data-s="2"][data-a="4"]')); const ws = !pg ? [] : [...pg.querySelectorAll('.w.ayah[data-s="2"][data-a="4"]')]; return ws.map((w) => getComputedStyle(w).color === "rgba(0, 0, 0, 0)" ? 0 : 1).join(""); }, L.split(",")[0].trim() + ", .spread .page");
  const v0 = await vis(); if (!/^10+$/.test(v0)) bad(lang + ": hifz not first-word-only " + v0);
  { await p.locator(".ph-set:visible").first().click(); await p.waitForSelector(".ph-pop"); if (await p.locator(".ph-pop .ph-hifz circle").count()) bad(lang + ": hifz icon is still an eye"); await p.locator(".ph-set:visible").first().click(); await p.waitForTimeout(150); }
  { const hb = await p.evaluate(() => [...document.querySelectorAll(".page .page-head")].filter((h) => h.getBoundingClientRect().width > 0).map((h) => [...h.querySelectorAll(":scope > button")].map((b) => b.className.split(" ")[0]).join(","))); if (hb.some((x) => x !== "ph-back,ph-set")) bad(lang + ": top bar has extra buttons " + hb.join(" / ")); }
  await p.locator(`.w.ayah[data-s="2"][data-a="4"]`).first().click({ force: true }); await p.waitForTimeout(300);
  const nx = p.locator(".hz-next"); const NX = { en: "Continue", az: "Davam", ar: "متابعة" }[lang];
  if (!(await nx.count()) || !(await nx.textContent()).includes(NX)) bad(lang + ": no Continue button");
  else {
    const v1 = await vis(); if (v1 !== "1" + "0".repeat(v1.length - 1)) bad(lang + ": tap revealed more than the first word " + v1);
    await nx.click(); await p.waitForTimeout(150); if (!(await vis()).startsWith("110")) bad(lang + ": Continue did not reveal word 2: " + (await vis()));
    for (let i = 0; i < 40 && (await nx.textContent()).includes("2:4"); i++) await nx.click();
    if (/0/.test(await vis())) bad(lang + ": ayah not fully revealed " + (await vis()));
    if (!(await nx.textContent()).includes("2:5")) bad(lang + ": did not move to the next ayah: " + (await nx.textContent()));
    for (let i = 0; i < 40 && (await nx.textContent()).includes("2:5"); i++) await nx.click();
    await p.waitForTimeout(900);
    const on6 = await p.evaluate(() => [...document.querySelectorAll('.layer:not(.pre):not(.over) .page .w.ayah[data-s="2"][data-a="6"], .spread .page .w.ayah[data-s="2"][data-a="6"]')].some((e) => e.getBoundingClientRect().width > 0));
    if (!(await nx.textContent()).includes("2:6") || !on6) bad(lang + ": did not cross to the next page (2:6) " + (await nx.textContent()));
  }
  await p.evaluate(() => localStorage.setItem("page", "2")); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1000);
  // hifz in the list view
  if (await p.locator(".asheet").count()) await p.locator(".asheet .x").click();
  await menu(".ph-list"); await p.waitForSelector(".lv .lv-card");
  const rest = p.locator('.lv-card[data-a="4"] .lv-rest'); if (!(await rest.count()) || (await rest.evaluate((e) => getComputedStyle(e).color)) !== "rgba(0, 0, 0, 0)") bad(lang + ": list hifz not hiding");
  await p.locator('.lv-card[data-a="4"] .lv-ar').click(); await p.waitForTimeout(200);
  if ((await rest.count()) && (await rest.evaluate((e) => getComputedStyle(e).color)) === "rgba(0, 0, 0, 0)") bad(lang + ": list tap did not reveal");
  await p.locator(".lv .lv-toggle").first().click().catch(() => {}); await p.waitForTimeout(300);
  await p.evaluate(() => { const v = JSON.parse(localStorage.getItem("qt.v2")); v.prefs.hifzView = false; localStorage.setItem("qt.v2", JSON.stringify(v)); });
  // 3. continue on Home
  await p.evaluate(() => { sessionStorage.removeItem("qt.home"); localStorage.setItem("e2e.home", "1"); }); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1000);
  const c = p.locator("#h-continue"); if (!(await c.count()) || !(await c.textContent()).includes(X[lang].cont)) bad(lang + ": continue button " + (await c.textContent().catch(() => "-")));
  else { await c.click(); await p.waitForTimeout(800); if (!(await p.locator(".w.ayah").count())) bad(lang + ": continue did not open the Mushaf"); }
  await p.evaluate(() => localStorage.removeItem("e2e.home"));
  console.log(lang, "done");
  await p.close();
}
await b.close();
console.log(fail ? `features: ${fail} failure(s)` : "features: all ok"); process.exit(fail ? 1 : 0);

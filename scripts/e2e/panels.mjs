// Fresh profile (nothing downloaded), ayah menu → Translation / Tafsir: the list with download buttons is shown in the panel itself,
// never a "go to Settings" empty state. AR / AZ / EN, phone and tablet two-page view.
import { chromium } from "playwright-core";
import { readFileSync } from "fs";
const TRIDS = JSON.parse(readFileSync(new URL("../../src/data/translations.json", import.meta.url), "utf8")).map((x) => x.id).join(",");
const BASE = process.env.URL || "http://127.0.0.1:4180/";
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const LBL = { az: ["Tərcümə", "Təfsir"], en: ["Translation", "Tafsir"], ar: ["الترجمة", "التفسير"] };
const SETTINGS = /Ayarlara keç|Open Settings|فتح الإعدادات|Settings ›|Ayarlarda|الإعدادات ›/;
let bad = 0;
for (const [w, h] of [[412, 860], [1280, 800]]) for (const lang of ["ar", "az", "en"]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true });
  const p = await ctx.newPage();
  await p.addInitScript((l) => { sessionStorage.setItem("qt.home", "0"); localStorage.setItem("lang", l); localStorage.setItem("page", "5"); localStorage.setItem("qt.v2", JSON.stringify({ onboarded: true })); }, lang);
  await p.goto(BASE, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  for (const [i, kind] of [[0, "tr"], [1, "tf"]]) {
    if (!(await p.locator(".asheet").count())) { await p.locator('.layer:not(.pre):not(.over) .page .w.ayah[data-s="2"]').nth(5).tap({ force: true }); await p.waitForTimeout(400); }
    if (!(await p.locator(".asheet").count())) { await p.screenshot({ path: "/tmp/noasheet.png" }); console.log("taps", await p.locator('.w.ayah[data-s="2"][data-a="26"]').count()); }
    await p.locator(".asheet .arow", { hasText: LBL[lang][i] }).click({ timeout: 8000 }); await p.waitForSelector(".lib-sheet"); await p.waitForTimeout(400);
    const sel = ".lib-sheet .lib-dd .lib-opt[data-id]";
    const ids = await p.locator(sel).evaluateAll((e) => e.map((x) => x.dataset.id).join(","));
    const dl = await p.locator(sel + " .lib-dl").count();
    const dis = await p.locator(sel + " input[type=checkbox]:disabled").count();
    const allRow = await p.locator(".lib-sheet .lib-dd .lib-opt.all input").count();
    const txt = await p.locator(".lib-sheet").innerText();
    const want = kind === "tr" ? TRIDS : "saadi,muyassar,ibnkathir";
    const k = want.split(",").length;
    const btn = p.locator(".lib-sheet .lib-allbtn");
    const exp0 = await btn.getAttribute("aria-expanded");
    await btn.click(); await p.waitForTimeout(150); const closed = (await p.locator(".lib-sheet .lib-dd").count()) === 0 && (await btn.getAttribute("aria-expanded")) === "false";
    await btn.click(); await p.waitForTimeout(150); const reopened = (await p.locator(".lib-sheet .lib-dd").count()) === 1;
    let srch = true;
    if (kind === "tr") { await p.locator(".lib-sheet .lib-find").fill("اردو"); await p.waitForTimeout(150); srch = (await p.locator(sel).evaluateAll((e) => e.map((x) => x.dataset.id).join(","))) === "urdu_junagarhi" && (await p.locator(".lib-sheet .lib-grp").count()) === 1; await p.locator(".lib-sheet .lib-find").fill(""); await p.waitForTimeout(100);
      srch &&= (await p.locator(".lib-sheet .lib-grp").count()) >= 20; }
    const ok = srch && ids === want && dl === k && dis === k && allRow === 1 && exp0 === "true" && closed && reopened && !SETTINGS.test(txt) && (await btn.textContent()).includes("(" + k + ")");
    if (!ok) { bad++; console.log("FAIL", w + "x" + h, lang, kind, ids, dl, dis, allRow, exp0, closed, reopened, JSON.stringify(txt.slice(0, 160))); }
    else console.log("ok", w + "x" + h, lang, kind, ids);
    await p.screenshot({ path: `/tmp/panel_${w}_${lang}_${kind}.png` });
    await p.locator(".lib-sheet .x").click(); await p.waitForTimeout(300);
  }
  await ctx.close();
}
await b.close(); if (bad) process.exit(1);

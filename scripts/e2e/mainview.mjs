// Main view (t363u): first open of / shows the uploaded Mushaf view (surah list -> Mushaf page); the earlier app with its page styles opens from Settings -> "Digər görünüşlər" (classic.html).
import { chromium } from "playwright-core";
const BASE = process.env.URL || "http://127.0.0.1:4180/";
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
let fail = 0; const bad = (m) => { fail++; console.log("FAIL", m); if (process.env.CI) console.log("::error title=mainview::" + m); };
for (const vp of [{ width: 390, height: 844 }, { width: 1024, height: 768 }]) {
  const p = await (await b.newContext({ viewport: vp })).newPage(); const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(BASE, { waitUntil: "networkidle" });
  const rows = await p.locator(".home-list .index-row").count();
  if (rows !== 114) bad(`${vp.width}: home list has ${rows} surahs`);
  await p.locator(".home-list .index-row").first().click(); await p.waitForTimeout(1500);
  const txt = await p.evaluate(() => document.body.innerText);
  if (!txt.includes("ٱلْحَمْدُ")) bad(`${vp.width}: page 1 text not shown`);
  await p.goto(BASE, { waitUntil: "networkidle" });
  await p.locator(".topbar .icon-btn").first().click();
  const link = p.locator('[data-testid="other-views"]');
  if (!(await link.isVisible())) bad(`${vp.width}: "Digər görünüşlər" link missing`);
  await link.click(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
  if (!p.url().includes("classic.html")) bad(`${vp.width}: link went to ${p.url()}`);
  const old = await p.evaluate(() => document.querySelector("#root")?.innerHTML.length || 0);
  if (old < 500) bad(`${vp.width}: classic app did not render`);
  if (errs.length) bad(`${vp.width}: page errors ${errs.join(" | ")}`);
  console.log(vp.width, "rows", rows, "classic html", old);
}
await b.close(); console.log(fail ? `mainview: ${fail} FAIL` : "mainview: OK"); process.exit(fail ? 1 : 0);

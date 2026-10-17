// Tablet two-page spread: facing pages, layout fits both halves, turning moves by 2, tapping the left page selects there.
import { chromium } from "playwright-core";
const URL = process.env.URL || "http://127.0.0.1:4180/";
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
let bad = 0; const fail = (m) => { bad++; console.log("FAIL", m); };
for (const [w, h] of [[1180, 820], [1024, 768], [1366, 1024]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
await p.context().addInitScript(() => { try { sessionStorage.setItem("qt.home", "0"); } catch {} }); // audits start in the reader, not on Home
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.addInitScript(() => localStorage.setItem("qt.v2", JSON.stringify({ onboarded: true })));
  await p.goto(URL);
  const check = (pg) => p.evaluate(() => {
    const pages = [...document.querySelectorAll(".spread .page")]; const out = { n: pages.length, nums: pages.map((x) => +x.dataset.page), issues: [] };
    pages.forEach((pg) => {
      const body = pg.querySelector(".page-body").getBoundingClientRect(), fr = pg.querySelector(".frame").getBoundingClientRect(), tall = !!pg.querySelector(".page-body.tall");
      [...pg.querySelector(".mtext").children].forEach((r, i) => { const rc = r.getBoundingClientRect(); if (rc.left < body.left - 1 || rc.right > body.right + 1) out.issues.push(`p${pg.dataset.page} row${i} x`); if (!tall && (rc.top < body.top - 3 || rc.bottom > body.bottom + 3)) out.issues.push(`p${pg.dataset.page} row${i} y`); if (r.scrollWidth > r.clientWidth + 1) out.issues.push(`p${pg.dataset.page} row${i} scrollW`); });
      if (fr.right > innerWidth + 1 || fr.left < -1) out.issues.push("frame outside viewport");
    });
    const [r, l] = pages.map((x) => x.getBoundingClientRect()); if (r && l && !(r.left < l.left)) out.issues.push("order: first (odd) page must be on the right"); // RTL: first child sits right? see below
    return out;
  });
  for (const pg of [1, 2, 3, 50, 77, 187, 255, 300, 445, 603, 604]) {
    await p.evaluate((pg) => localStorage.setItem("page", pg), pg); await p.reload({ waitUntil: "networkidle" }); await p.waitForSelector(".spread .page .ln, .spread .page .sura-head"); await p.waitForTimeout(350);
    const r = await check(pg);
    const base = pg % 2 ? pg : pg - 1;
    const want = base + 1 <= 604 ? [base, base + 1] : [base];
    if (JSON.stringify(r.nums) !== JSON.stringify(want)) fail(`${w}x${h} page ${pg}: shows ${r.nums} want ${want}`);
    // odd page must be on the right
    const pos = await p.evaluate(() => [...document.querySelectorAll(".spread .page")].map((x) => Math.round(x.getBoundingClientRect().left)));
    if (pos.length === 2 && !(pos[0] > pos[1])) fail(`${w}x${h} p${pg}: odd page is not on the right ${pos}`);
    r.issues.filter((x) => !x.startsWith("order")).forEach((x) => fail(`${w}x${h} p${pg}: ${x}`));
  }
  // turning: next moves by two pages (key ArrowLeft), prev back
  await p.evaluate(() => localStorage.setItem("page", "50")); await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(300);
  await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(500);
  let nums = await p.evaluate(() => [...document.querySelectorAll(".spread .page")].map((x) => +x.dataset.page)); if (nums.join() !== "51,52") fail(`${w}: next -> ${nums}`);
  await p.keyboard.press("ArrowRight"); await p.waitForTimeout(500);
  nums = await p.evaluate(() => [...document.querySelectorAll(".spread .page")].map((x) => +x.dataset.page)); if (nums.join() !== "49,50") fail(`${w}: prev -> ${nums}`);
  // tap an ayah on the LEFT (even) page: ayah sheet opens and the band is drawn on that page
  const pt = await p.evaluate(() => { const pg = document.querySelector('.spread .page[data-page="50"]'); const e = [...pg.querySelectorAll(".mtext .ln:nth-child(6) .w.ayah")].find((x) => { const r = x.getBoundingClientRect(); const R = pg.getBoundingClientRect(); return r.x > R.x + 60 && r.x < R.right - 60; }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(700);
  const sheet = await p.$(".asheet"); if (!sheet) fail(`${w}: no ayah sheet after tapping the left page`);
  const bands = await p.evaluate(() => [...document.querySelectorAll(".band")].filter((x) => x.closest('.page[data-page="50"]')).length); if (!bands) fail(`${w}: no band on the tapped page`);
  if (errs.length) fail("page errors " + errs.join("|"));
  if (w === 1180) await p.screenshot({ path: process.env.SHOT || "/tmp/spread.png" });
  await p.close();
}
console.log(bad ? `${bad} failures` : "OK spread"); await b.close(); if (bad) process.exit(1);

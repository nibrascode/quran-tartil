// Ayah menu → Translation / Tafsir panels: download right in the panel (with progress), content appears and equals the hosted file.
import { chromium } from "playwright-core";
import { readFileSync } from "fs";
const BASE = process.env.URL || "http://127.0.0.1:4180/";
const file = (p) => JSON.parse(readFileSync(new globalThis.URL("../../public/" + p, import.meta.url), "utf8"));
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: 412, height: 860 } })).newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript(() => { sessionStorage.setItem("qt.home", "0"); localStorage.setItem("lang", "en"); localStorage.setItem("page", "397"); if (!localStorage.getItem("qt.v2")) localStorage.setItem("qt.v2", JSON.stringify({ onboarded: true })); });
await p.goto(BASE, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
let fail = 0; const bad = (m) => { fail++; console.log("FAIL", m); };
const L = ".layer:not(.pre):not(.over) .page";
const openPanel = async (label) => {
  if (!(await p.locator(".asheet").count())) { await p.locator(L + ' .w.ayah[data-s="29"][data-a="8"]').first().click({ force: true }); await p.waitForTimeout(400); }
  await p.locator(".asheet .arow", { hasText: label }).click(); await p.waitForSelector(".lib-sheet"); await p.waitForTimeout(400);
};
for (const [label, id, path, pick] of [["Translation", "az.musayev", "tr/az.musayev.json", (j) => j.v[28][7]], ["Tafsir", "ibnkathir", "tf/ibnkathir/29.json", (j) => j[7]]]) {
  await openPanel(label);
  if (!(await p.locator(".lib-sheet .lib-none").count())) bad(label + ": no download offer when nothing is downloaded");
  const t0 = Date.now(); let sawProgress = false;
  await p.locator(`.lib-sheet .lib-row[data-id="${id}"] button`).click();
  while (!(await p.locator(".lib-sheet .lib-body p").count()) || (await p.locator(".lib-sheet .lib-body p").first().textContent()) === "…") {
    if (await p.locator(`.lib-sheet .lib-row[data-id="${id}"] [role=progressbar]`).count()) sawProgress = true;
    if (Date.now() - t0 > 600000) { bad(label + ": download did not finish"); break; }
    await p.waitForTimeout(150);
  }
  const shown = (await p.locator(".lib-sheet .lib-body p").first().textContent()).trim();
  const want = pick(file(path)).trim();
  if (shown !== want) bad(`${label}: 29:8 text differs from the hosted file (${shown.slice(0, 40)} | ${want.slice(0, 40)})`);
  if (id === "ibnkathir" && !sawProgress) bad("no progress bar seen for Ibn Kathir");
  console.log(label, id, "downloaded in", ((Date.now() - t0) / 1000).toFixed(1) + "s", "progress", sawProgress, "ok", shown === want);
  await p.locator(".lib-sheet .x").click(); await p.waitForTimeout(300);
}
// all 114 surahs of Ibn Kathir stored; a grouped entry shows its ayah range
const stored = await p.evaluate(() => new Promise((ok) => { const r = indexedDB.open("qt-lib"); r.onsuccess = () => { const q = r.result.transaction("kv").objectStore("kv").get("ibnkathir:n"); q.onsuccess = () => ok(q.result); }; }));
if (stored !== 114) bad("ibnkathir stored surahs " + stored);
console.log("ibnkathir surahs stored", stored, "errors", errs);
await b.close(); if (fail || errs.length) process.exit(1);

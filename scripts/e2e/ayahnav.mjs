// Ayah Translation / Tafsir panels: previous / next ayah across surah boundaries (1:1 prev and 114:6 next disabled), header ref and text follow,
// ticks stay, the Mushaf page follows the ayah, a shared tafsir range is skipped as a whole, arrows mirror in Arabic.
import { chromium } from "playwright-core";
import { readFileSync } from "fs";
const BASE = process.env.URL || "http://127.0.0.1:4180/";
const file = (p) => JSON.parse(readFileSync(new URL("../../public/" + p, import.meta.url), "utf8"));
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
let fail = 0; const bad = (m) => { fail++; console.log("FAIL", m); };
const L = ".layer:not(.pre):not(.over) .page";
async function start(lang, page, w = 412, h = 860) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.addInitScript(([l, pg]) => { sessionStorage.setItem("qt.home", "0"); localStorage.setItem("lang", l); if (!sessionStorage.getItem("x")) { localStorage.setItem("page", String(pg)); sessionStorage.setItem("x", "1"); } localStorage.setItem("qt.v2", JSON.stringify({ onboarded: true })); }, [lang, page]);
  await p.goto(BASE, { waitUntil: "networkidle" }); await p.waitForTimeout(1200); return p;
}
const ref = (p) => p.locator(".lib-sheet .ahead .ref").textContent();
const body = async (p, id) => { for (let i = 0; i < 60; i++) { const t = await p.locator(`.lib-sheet .lib-body[data-id="${id}"] p`).first().textContent().catch(() => "…"); if (t && t !== "…") return t.trim(); await p.waitForTimeout(100); } return ""; };
const tapCenter = async (p) => { const h = await p.evaluateHandle(() => { for (const e of document.querySelectorAll(".w.ayah")) { const r = e.getBoundingClientRect(); if (r.width < 4 || r.top < 200 || r.bottom > innerHeight - 120) continue; if (document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest(".w.ayah") === e) return e; } return null; }); const el = h.asElement(); if (el) await el.click({ force: true }); await p.waitForTimeout(300); };
const goTo = async (p, want) => { const [ws, wa] = want.split(":").map(Number); for (let i = 0; i < 900; i++) { const [s, a] = (await ref(p)).split(":").map(Number); if (s === ws && a === wa) return true; const fw = s < ws || (s === ws && a < wa); const before = s + ":" + a; await p.locator(".lib-sheet " + (fw ? ".lib-next" : ".lib-prev")).click(); for (let k = 0; k < 100 && (await ref(p)) === before; k++) await p.waitForTimeout(20); } return false; };
const open = async (p, label, sa) => { if (sa) await p.locator(`${L} .w.ayah[data-s="${sa[0]}"][data-a="${sa[1]}"]`).first().click({ force: true }); else await tapCenter(p); await p.waitForTimeout(300); await p.locator(".asheet .arow", { hasText: label }).click(); await p.waitForSelector(".lib-sheet"); await p.waitForTimeout(300); };
const dl = async (p, id) => { if ((await p.locator(".lib-sheet .lib-allbtn").getAttribute("aria-expanded")) !== "true") await p.locator(".lib-sheet .lib-allbtn").click();
  await p.locator(`.lib-sheet .lib-opt[data-id="${id}"] .lib-dl`).click(); await body(p, id); for (let i = 0; i < 300 && !(await p.locator(`.lib-sheet .lib-body[data-id="${id}"]`).count()); i++) await p.waitForTimeout(200);
  await p.locator(".lib-sheet .lib-allbtn").click(); };
const mz = file("tr/az.musayev.json").v;
{ // EN: back from 2:3 over the surah boundary to 1:1, page follows, text follows
  const p = await start("en", 2);
  await open(p, "Translation", [2, 3]); await dl(p, "az.musayev");
  for (const [want, pg] of [["2:2", 2], ["2:1", 2], ["1:7", 1]]) {
    { const before = await ref(p); await p.locator(".lib-sheet .lib-prev").click(); for (let k = 0; k < 150 && (await ref(p)) === before; k++) await p.waitForTimeout(20); } await p.waitForTimeout(300);
    if ((await ref(p)) !== want) bad("prev ref " + (await ref(p)) + " want " + want);
    const [s, a] = want.split(":").map(Number);
    if ((await body(p, "az.musayev")) !== mz[s - 1][a - 1].trim()) bad("text at " + want);
    const shown = await p.locator(L).first().getAttribute("data-page"); if (Number(shown) !== pg) bad(`page ${shown} for ${want}`);
  }
  for (let i = 0; i < 6; i++) { const before = await ref(p); await p.locator(".lib-sheet .lib-prev").click(); for (let k = 0; k < 150 && (await ref(p)) === before; k++) await p.waitForTimeout(20); }
  await p.waitForTimeout(300);
  if ((await ref(p)) !== "1:1" || !(await p.locator(".lib-sheet .lib-prev").isDisabled())) bad("1:1 prev not disabled (" + (await ref(p)) + ")");
  await p.locator(".lib-sheet .lib-next").click(); await p.waitForTimeout(300);
  if ((await ref(p)) !== "1:2") bad("next from 1:1");
  if ((await p.locator(".lib-sheet .lib-next").getAttribute("aria-label")) !== "Next ayah") bad("EN label");
  // Ibn Kathir: the first shared range in the file (5:96-97) is skipped as a whole by next; prev from after it lands on its start
  let S = 0, a0 = 0; for (let su = 1; su <= 114 && !S; su++) { const ik = file(`tf/ibnkathir/${su}.json`); for (let i = 0; i < ik.length - 1; i++) if (ik[i] && !ik[i + 1]) { S = su; a0 = i + 1; break; } }
  const ik = file(`tf/ibnkathir/${S}.json`); let a1 = a0 + 1; while (!ik[a1 - 1]) a1++;
  await p.locator(".lib-sheet .x").click(); await p.waitForTimeout(200);
  await p.locator(".asheet .arow", { hasText: "Tafsir" }).click(); await p.waitForSelector(".lib-sheet"); await p.waitForTimeout(300); await dl(p, "ibnkathir");
  await p.locator(".lib-sheet .x").click(); await p.waitForTimeout(200);
  await p.locator(".asheet .arow", { hasText: "Tafsir" }).click(); await p.waitForSelector(".lib-sheet"); await p.waitForTimeout(300);
  if (!(await goTo(p, `${S}:${a0}`))) bad("did not reach " + S + ":" + a0);
  await body(p, "ibnkathir"); await p.locator(".lib-sheet .lib-next").click(); await p.waitForTimeout(400);
  if ((await ref(p)) !== `${S}:${a1}`) bad(`range ${S}:${a0}-${a1 - 1}: next went to ${await ref(p)} want ${S}:${a1}`);
  const pgNow = Number(await p.locator(L).first().getAttribute("data-page"));
  if (!(await p.locator(`.page[data-page="${pgNow}"] .w.ayah[data-s="${S}"][data-a="${a1}"]`).count())) bad("mushaf page does not show the panel ayah");
  const a0r = `${S}:${a0}-${a1 - 1}`;
  console.log(`EN prev/next ok, 1:1 disabled, Ibn Kathir range ${a0r} skipped -> ${await ref(p)}`);
}
{ // AR: forward to 114:6, disabled; arrows mirrored; ticks kept
  const p = await start("ar", 604);
  await p.locator(`${L} .w.ayah`).nth(3).click({ force: true }); await p.waitForTimeout(300);
  await p.locator(".asheet .arow", { hasText: "الترجمة" }).click(); await p.waitForSelector(".lib-sheet"); await dl(p, "az.musayev");
  for (let i = 0; i < 80 && !(await p.locator(".lib-sheet .lib-next").isDisabled()); i++) { const before = await ref(p); await p.locator(".lib-sheet .lib-next").click(); for (let k = 0; k < 100 && (await ref(p)) === before; k++) await p.waitForTimeout(20); }
  if ((await ref(p)) !== "114:6" || !(await p.locator(".lib-sheet .lib-next").isDisabled())) bad("114:6 next not disabled (" + (await ref(p)) + ")");
  if (!(await p.locator('.lib-sheet .lib-body[data-id="az.musayev"]').count())) bad("ticks lost");
  const nb = await p.locator(".lib-sheet .lib-next").boundingBox(), pb = await p.locator(".lib-sheet .lib-prev").boundingBox();
  if (!(nb.x < pb.x)) bad("RTL: next should be on the left");
  if ((await p.locator(".lib-sheet .lib-next").getAttribute("aria-label")) !== "الآية التالية") bad("AR label");
  await p.screenshot({ path: "/tmp/nav_ar.png" });
  console.log("AR 114:6 disabled, rtl arrows, ticks kept");
}
await b.close(); if (fail) process.exit(1);

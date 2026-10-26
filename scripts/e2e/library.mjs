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
const bodyText = async (id) => (await p.locator(`.lib-sheet .lib-body[data-id="${id}"] p`).first().textContent())?.trim();
const waitText = async (id, label) => { const t0 = Date.now(); let saw = false;
  while (!(await p.locator(`.lib-sheet .lib-body[data-id="${id}"] p`).count()) || (await bodyText(id)) === "…") {
    if (await p.locator(`.lib-sheet .lib-opt[data-id="${id}"] [role=progressbar]`).count()) saw = true;
    if (Date.now() - t0 > 600000) { bad(label + ": download did not finish"); break; } await p.waitForTimeout(150); }
  return { saw, s: ((Date.now() - t0) / 1000).toFixed(1) }; };
const ensureOpen = async () => { await p.waitForSelector(".lib-sheet .lib-dd, .lib-sheet .lib-body, .lib-sheet .lib-hint"); if ((await p.locator(".lib-sheet .lib-allbtn").getAttribute("aria-expanded")) !== "true") await p.locator(".lib-sheet .lib-allbtn").click(); await p.waitForTimeout(150); };
const close = async () => { await p.locator(".lib-sheet .x").click(); await p.waitForTimeout(300); };
for (const [label, id, path, pick] of [["Translation", "az.musayev", "tr/az.musayev.json", (j) => j.v[28][7]], ["Tafsir", "ibnkathir", "tf/ibnkathir/29.json", (j) => j[7]]]) {
  await openPanel(label); await ensureOpen();
  if ((await p.locator(".lib-sheet .lib-dd .lib-opt[data-id] .lib-dl").count()) < 2) bad(label + ": no download icons");
  await p.locator(`.lib-sheet .lib-opt[data-id="${id}"] .lib-dl`).click();
  const r = await waitText(id, label);
  const shown = await bodyText(id), want = pick(file(path)).trim();
  if (shown !== want) bad(`${label}: 29:8 text differs from the hosted file`);
  if (!(await p.locator(`.lib-sheet .lib-opt[data-id="${id}"] input`).isChecked())) bad(label + ": not ticked after download");
  if (id === "ibnkathir" && !r.saw) bad("no progress bar seen for Ibn Kathir");
  console.log(label, id, "downloaded in", r.s + "s", "progress", r.saw, "ok", shown === want);
  await close();
}
// tafsir: download Muyassar too → both ticked and stacked with names; untick Ibn Kathir → only Muyassar; remembered; "All" ticks both
await openPanel("Tafsir"); await ensureOpen();
await p.locator('.lib-sheet .lib-opt[data-id="muyassar"] .lib-dl').click(); await waitText("muyassar", "muyassar");
const muW = file("tf/muyassar/29.json"); const muWant = (muW[7] || muW[6]).trim();
let bodies = await p.locator(".lib-sheet .lib-body").evaluateAll((e) => e.map((x) => x.dataset.id).join(","));
if (bodies !== "muyassar,ibnkathir" || (await p.locator(".lib-sheet .lib-body .lib-name").count()) !== 2) bad("two ticked tafsirs not stacked with names: " + bodies);
if ((await bodyText("muyassar")) !== muWant) bad("muyassar text differs");
await p.locator('.lib-sheet .lib-opt[data-id="ibnkathir"] input').uncheck(); await p.waitForTimeout(200);
bodies = await p.locator(".lib-sheet .lib-body").evaluateAll((e) => e.map((x) => x.dataset.id).join(","));
if (bodies !== "muyassar" || (await p.locator(".lib-sheet .lib-body .lib-name").count()) !== 0) bad("untick did not hide Ibn Kathir: " + bodies);
await p.locator(".lib-sheet .lib-allbtn").click(); await p.waitForTimeout(150);
if (await p.locator(".lib-sheet .lib-dd").count()) bad("dropdown did not close");
await close(); await openPanel("Tafsir");
bodies = await p.locator(".lib-sheet .lib-body").evaluateAll((e) => e.map((x) => x.dataset.id).join(","));
if (bodies !== "muyassar") bad("ticks not remembered: " + bodies);
if (await p.locator(".lib-sheet .lib-dd").count()) bad("dropdown should start closed when something is downloaded");
await ensureOpen(); await p.locator(".lib-sheet .lib-opt.all input").check(); await p.waitForTimeout(300);
await p.screenshot({ path: "/tmp/lib_all.png" });
bodies = await p.locator(".lib-sheet .lib-body").evaluateAll((e) => e.map((x) => x.dataset.id).join(","));
if (bodies !== "muyassar,ibnkathir") bad("All did not tick every downloaded tafsir: " + bodies);
console.log("tafsir ticks: stacked/untick/remember/all ok", bodies);
await close();
// a QuranEnc RTL translation with footnotes: found via search, downloaded per surah, unaltered text, rendered RTL, footnote shown separately
await openPanel("Translation"); await ensureOpen();
await p.locator(".lib-sheet .lib-find").fill("Urdu"); await p.waitForTimeout(150);
await p.locator('.lib-sheet .lib-opt[data-id="urdu_junagarhi"] .lib-dl').click(); await waitText("urdu_junagarhi", "urdu");
const ur = file("tr/urdu_junagarhi/29.json");
if ((await bodyText("urdu_junagarhi")) !== ur.t[7].trim()) bad("urdu 29:8 differs from the hosted file");
if ((await p.locator('.lib-sheet .lib-body[data-id="urdu_junagarhi"]').getAttribute("dir")) !== "rtl") bad("urdu not RTL");
if (ur.f?.[7] && (await p.locator('.lib-sheet .lib-body[data-id="urdu_junagarhi"] .lib-fn').textContent()) !== ur.f[7]) bad("urdu footnote not shown");
if (!/QuranEnc\.com — .*\(v\d/.test(await p.locator('.lib-sheet .lib-body[data-id="urdu_junagarhi"] .lib-src').textContent())) bad("QuranEnc credit/version missing");
console.log("urdu QuranEnc: rtl, footnote", !!ur.f?.[7]);
await close();
if (errs.length) bad("page errors " + errs.join(" | "));
await b.close(); if (fail || errs.length) process.exit(1);

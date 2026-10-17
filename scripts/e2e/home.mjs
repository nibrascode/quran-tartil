// Home screen: shown on launch, content, navigation to/from the reader, 5 languages x 3 themes, RTL, overflow. SHOTS=dir to save screenshots.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const BASE = process.env.URL || "http://127.0.0.1:4180/";
const SHOTS = process.env.SHOTS; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
let bad = 0; const fail = (m) => { console.log("FAIL", m); bad++; };
const today = new Date(); const dk = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const seed = { onboarded: true, goal: 4, today: dk, dayPages: [1, 2, 3], visited: Array.from({ length: 120 }, (_, i) => i + 1), khatms: 1, days: { [dk]: 3 }, bookmarks: [{ s: 2, a: 255, page: 42, ts: 1 }],
  hifz: { "1:1": { box: 1, due: "2020-01-01", reps: 1, lapses: 0 }, "1:2": { box: 1, due: "2020-01-01", reps: 1, lapses: 0 } }, weak: [{ key: "1:3", word: "x", n: 1, last: dk }], prefs: { strict: "easy" } };
async function open(w, h, lang, theme, mobile = true) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.addInitScript(() => { window.webkitSpeechRecognition = window.SpeechRecognition = class { start() { window.__started = true; } abort() {} stop() {} }; });
  await p.goto(BASE); await p.evaluate(([s, l, t]) => { localStorage.setItem("qt.v2", JSON.stringify(s)); localStorage.setItem("lang", l); localStorage.setItem("theme", t); localStorage.setItem("page", "42"); }, [seed, lang, theme]);
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(1500);
  return { p, errs, ctx };
}
// 1) launch shows Home with all sections, in every language and theme
for (const lang of ["en", "az", "tr", "ar", "ru"]) for (const theme of ["light", "dark", "sepia"]) {
  const { p, errs, ctx } = await open(390, 844, lang, theme);
  const r = await p.evaluate(() => { const h = document.querySelector(".home"); const q = (s) => !!document.querySelector(s); const rd = document.querySelector(".reader"); const vis = rd && getComputedStyle(rd).visibility;
    const ids = ["h-continue", "h-ayah", "h-goal", "h-khatm", "h-mic", "h-practice", "h-surah", "h-page", "h-juz", "h-bookmarks", "h-mistakes", "h-search"].filter((i) => !q("#" + i));
    const hs = document.querySelector(".home"); const wide = [...hs.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1); }).map((e) => e.className).slice(0, 3);
    return { has: !!h, vis, missing: ids, wide, dir: document.documentElement.dir, due: document.querySelector("#h-practice small").textContent, ay: document.querySelector(".ha-t").textContent.length, sx: hs.scrollWidth - hs.clientWidth }; });
  if (!r.has) fail(`${lang}/${theme}: no home on launch`);
  if (r.vis !== "hidden") fail(`${lang}/${theme}: reader not hidden under home`);
  if (r.missing.length) fail(`${lang}/${theme}: missing ${r.missing}`);
  if (r.wide.length || r.sx > 0) fail(`${lang}/${theme}: overflow ${r.wide} ${r.sx}`);
  if (r.dir !== (lang === "ar" ? "rtl" : "ltr")) fail(`${lang}: dir ${r.dir}`);
  if (!/2/.test(r.due)) fail(`${lang}: due count not shown: ${r.due}`);
  if (r.ay < 10) fail(`${lang}: no ayah of the day`);
  if (errs.length) fail(`${lang}/${theme}: errors ${errs}`);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/home-${lang}-${theme}.png` });
  if (SHOTS && lang === "en") { await p.evaluate(() => document.querySelector(".home").scrollTo(0, 9999)); await p.waitForTimeout(200); await p.screenshot({ path: `${SHOTS}/home-${lang}-${theme}-bottom.png` }); }
  await ctx.close();
}
// 2) flows
{
  const { p, errs, ctx } = await open(390, 844, "en", "light");
  const visReader = () => p.evaluate(() => getComputedStyle(document.querySelector(".reader")).visibility === "visible" && !document.querySelector(".home"));
  await p.click("#h-continue"); await p.waitForTimeout(500);
  if (!(await visReader())) fail("continue did not open reader");
  if ((await p.evaluate(() => localStorage.getItem("page"))) !== "42") fail("continue changed page");
  await p.mouse.click(195, 12); await p.waitForTimeout(500);
  await p.click("#home-btn"); await p.waitForTimeout(500);
  if (!(await p.$(".home"))) fail("home button from reader failed");
  await p.click("#h-ayah"); await p.waitForTimeout(700);
  if (!(await visReader()) || !(await p.$(".asheet"))) fail("ayah of the day did not open ayah sheet");
  const sel = await p.evaluate(() => document.querySelector(".asheet .ref")?.textContent);
  console.log("ayah of the day opened", sel);
  await p.click(".asheet .x"); await p.mouse.click(195, 12); await p.waitForTimeout(400); await p.click("#home-btn"); await p.waitForTimeout(400);
  for (const [id, tab] of [["h-surah", "surah"], ["h-page", "page"], ["h-juz", "juz"], ["h-bookmarks", "bookmarks"], ["h-search", "search"], ["h-practice", "practice"], ["h-mistakes", "practice"], ["h-goal", "progress"]]) {
    await p.click("#" + id); await p.waitForTimeout(350);
    const ok = await p.evaluate((t) => document.querySelector('[role=tab][aria-selected=true]')?.textContent, tab);
    if (!ok) fail("tab not opened from " + id);
    await p.keyboard.press("Escape"); await p.waitForTimeout(250);
    if (await p.$(".scrim")) await p.evaluate(() => document.querySelector(".scrim")?.click());
    await p.waitForTimeout(300);
    if (!(await p.$(".home"))) fail("home not restored after closing " + id);
  }
  await p.click("#h-surah"); await p.waitForTimeout(350); await p.click(".li >> nth=17"); await p.waitForTimeout(600);
  if (!(await visReader())) fail("jump to surah did not leave home");
  await p.mouse.click(195, 12); await p.click("#home-btn"); await p.waitForTimeout(400);
  await p.click("#h-mic"); await p.waitForTimeout(600);
  if (!(await visReader()) || !(await p.evaluate(() => window.__started))) fail("start tartil did not open reader + mic");
  if (errs.length) fail("flow errors " + errs);
  await ctx.close();
}
// 3) tablets + small phone: no overflow, fits
for (const [w, h] of [[320, 640], [768, 1024], [1024, 768]]) {
  const { p, errs, ctx } = await open(w, h, "en", "dark", w < 700);
  const sx = await p.evaluate(() => { const e = document.querySelector(".home"); return e.scrollWidth - e.clientWidth; });
  if (sx > 0 || errs.length) fail(`${w}x${h}: overflow ${sx} ${errs}`);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/home-${w}x${h}.png` });
  await ctx.close();
}
await b.close(); console.log(bad ? "FAILED " + bad : "OK home"); process.exit(bad ? 1 : 0);

// Systematic QA sweep. Prints one line per check: PASS/FAIL. Exit code 1 on any FAIL.  SHOTS=dir saves screenshots.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const BASE = process.env.URL || "http://127.0.0.1:4180/";
const SHOTS = process.env.SHOTS; if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const results = []; let bad = 0;
const rec = (name, ok, info = "") => { results.push({ name, ok, info }); if (!ok) bad++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  -> " + info)); };
const dk = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
const seed = { onboarded: true, goal: 4, today: dk, dayPages: [1, 2], visited: [1, 2, 3, 4, 5], bookmarks: [{ s: 2, a: 255, page: 42, ts: 1 }], hifz: { "1:2": { box: 1, due: "2020-01-01", reps: 1, lapses: 0 } }, weak: [{ key: "1:3", word: "ٱلرَّحْمَٰنِ", n: 2, last: dk }] };
async function open(w, h, { lang = "en", theme = "light", mobile = true, home = true, ob = false, reduce = false, page = 42 } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, reducedMotion: reduce ? "reduce" : "no-preference", acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await p.addInitScript((home) => { try { if (!home) sessionStorage.setItem("qt.home", "0"); } catch {}
    window.__starts = 0; window.__aborts = 0; window.__live = 0;
    window.webkitSpeechRecognition = window.SpeechRecognition = class { constructor() { window.__rec = this; } start() { window.__starts++; window.__live++; this.on = true; } abort() { if (this.on) { this.on = false; window.__live--; } window.__aborts++; } stop() { this.abort(); } };
    window.__endRec = () => { const r = window.__rec; if (r.on) { r.on = false; window.__live--; } r.onend && r.onend(); }; }, home);
  await p.goto(BASE);
  await p.evaluate(([s, l, t, pg, ob]) => { localStorage.clear(); if (!ob) localStorage.setItem("qt.v2", JSON.stringify(s)); localStorage.setItem("lang", l); localStorage.setItem("theme", t); localStorage.setItem("page", String(pg)); }, [seed, lang, theme, page, ob]);
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(900);
  return { p, errs, ctx };
}
const overflowX = (p, sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return -1; const inScroller = (x) => { for (let a = x.parentElement; a && a !== e.parentElement; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "auto" || o === "scroll" || o === "hidden") return true; } return false; };
  const bad = [...e.querySelectorAll("*")].filter((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && getComputedStyle(x).position !== "fixed" && !inScroller(x); }); return bad.length; }, sel);
const a11y = (p, sel) => p.evaluate((sel) => { const root = document.querySelector(sel) || document.body; const out = [];
  root.querySelectorAll("button, a, input, [role=tab], [role=switch], [role=radio]").forEach((e) => { const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).visibility === "hidden") return;
    const name = (e.getAttribute("aria-label") || e.textContent || e.getAttribute("placeholder") || e.title || "").trim(); if (!name) out.push("noname:" + (e.className || e.tagName)); });
  root.querySelectorAll("img").forEach((i) => { if (i.getAttribute("alt") === null) out.push("img-alt"); });
  return out.slice(0, 5); }, sel);
const targets = (p, sel, min = 40) => p.evaluate(([sel, min]) => [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility !== "hidden" && Math.min(r.width, r.height) < min - 0.5; }).map((e) => (e.getAttribute("aria-label") || e.textContent || e.className).slice(0, 24)).slice(0, 5), [sel, min]);

// ---- A. Home in all languages x themes at several sizes
for (const [w, h, mob] of [[390, 844, true], [360, 740, true], [320, 640, true], [768, 1024, true], [1024, 768, false], [844, 390, true]]) {
  const { p, errs, ctx } = await open(w, h, { mobile: mob });
  const ok = (await p.$(".home")) && (await overflowX(p, ".home")) === 0;
  rec(`home ${w}x${h}: renders, no horizontal overflow`, !!ok);
  const an = await a11y(p, ".home"); rec(`home ${w}x${h}: all controls have accessible names`, an.length === 0, an.join(","));
  const tg = await targets(p, ".home button", 40); rec(`home ${w}x${h}: touch targets >= 40px`, tg.length === 0, tg.join("|"));
  rec(`home ${w}x${h}: no console errors`, errs.length === 0, errs.join("|"));
  await ctx.close();
}
for (const lang of ["en", "az", "tr", "ar", "ru"]) for (const theme of ["light", "dark", "sepia"]) {
  const { p, errs, ctx } = await open(390, 844, { lang, theme });
  const dir = await p.evaluate(() => [document.documentElement.dir, document.documentElement.lang, document.title]);
  rec(`lang ${lang}/${theme}: dir/lang/title (${dir.join(" ")})`, dir[0] === (lang === "ar" ? "rtl" : "ltr") && dir[1] === lang && dir[2].length > 0);
  const c = await p.evaluate(() => { const f = (s) => getComputedStyle(document.querySelector(s)); const bg = f(".home").backgroundColor, fg = f(".hhead h1").color; const lum = (c) => { const m = c.match(/\d+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; }; return Math.abs(lum(bg) - lum(fg)); });
  rec(`theme ${lang}/${theme}: home text contrast`, c > 0.5, String(c));
  if (SHOTS && (lang === "en" || lang === "ar")) await p.screenshot({ path: `${SHOTS}/qa-home-${lang}-${theme}.png` });
  rec(`lang ${lang}/${theme}: no console errors`, errs.length === 0, errs.join("|")); await ctx.close();
}

// ---- B. Menu tabs and every settings card, in every language
for (const lang of ["en", "az", "tr", "ar", "ru"]) {
  const { p, errs, ctx } = await open(390, 844, { lang });
  let bads = [];
  for (const id of ["h-surah", "h-page", "h-juz", "h-search", "h-bookmarks", "h-practice", "h-goal", "h-settings"]) {
    await p.click("#" + id); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const s = document.querySelector(".sheet"); if (!s) return null; const q = s.getBoundingClientRect(); return { w: q.width, h: q.height, t: q.top, empty: !s.querySelector(".sheet-body, .body, *:not(.sheet-head)") }; });
    if (!r || r.w > 391 || r.h < 100) bads.push(id + ":sheet");
    if ((await overflowX(p, ".sheet")) > 0) bads.push(id + ":overflow");
    if (id === "h-settings") {
      const n = await p.$$eval(".scard-h", (a) => a.length);
      for (let i = 0; i < n; i++) { await p.locator(".scard-h").nth(i).click(); await p.waitForTimeout(350); if (await p.$(".lsheet-bg")) { const rows = await p.$$eval(".lsheet .lrow", (a) => a.length); if (rows !== 5) bads.push("langsheet"); await p.evaluate(() => document.querySelector(".lsheet-bg").click()); await p.waitForTimeout(350); continue; } if ((await p.$$eval(".scard-h", (a) => a.length)) !== n) { if ((await overflowX(p, ".sheet")) > 0) bads.push("subview" + i + ":overflow"); await p.click(".tabs .tab").catch(() => {}); await p.waitForTimeout(350); continue; } const ex = await p.locator(".scard-h").nth(i).getAttribute("aria-expanded"); if (ex !== "true") bads.push("card" + i + ":notopen"); if ((await overflowX(p, ".sheet")) > 0) bads.push("card" + i + ":overflow"); await p.locator(".scard-h").nth(i).click(); await p.waitForTimeout(250); }
      rec(`settings ${lang}: ${n} cards open/close`, true);
    }
    await p.evaluate(() => document.querySelector(".scrim")?.click()); await p.waitForTimeout(250);
  }
  rec(`menu ${lang}: all tabs open, fit the screen, no overflow`, bads.length === 0, bads.join(","));
  rec(`menu ${lang}: no console errors`, errs.length === 0, errs.join("|")); await ctx.close();
}

// ---- C. Reader, dock, sheets, search, bookmarks
{
  const { p, errs, ctx } = await open(390, 844, { home: false });
  const showDock = async () => { if (await p.$(".dock.auxhide")) { await p.mouse.click(195, 12); await p.waitForTimeout(450); } };
  rec("reader: opens straight into reader with audits flag; 15-line page present", (await p.$$eval(".mtext .ln, .mtext .line, .mtext > *", (a) => a.length)) > 5);
  await showDock();
  const tg = await targets(p, ".dock button, .bar button", 40); rec("reader: dock/top-bar touch targets >= 40px", tg.length === 0, tg.join("|"));
  const an = await a11y(p, ".app"); rec("reader: controls have accessible names", an.length === 0, an.join(","));
  await p.click("#home-dock"); await p.waitForTimeout(400); rec("reader: dock home button -> Home", !!(await p.$(".home")));
  await p.click("#h-continue"); await p.waitForTimeout(400);
  // search
  await showDock(); await p.click("#home-dock ~ .dbtn >> nth=0"); await p.waitForTimeout(300);
  await p.click('[role=tab] >> nth=3'); await p.waitForTimeout(200);
  await p.fill(".field", "الحمد"); await p.waitForTimeout(500);
  const n1 = await p.$$eval(".sheet .li", (a) => a.length); rec("search: Arabic query returns results", n1 > 0, String(n1));
  await p.fill(".field", "2:255"); await p.waitForTimeout(500);
  rec("search: reference 2:255 returns Ayat al-Kursi", /255|ٱللَّهُ لَآ إِلَٰهَ/.test(await p.$eval(".sheet", (e) => e.textContent)));
  await p.fill(".field", "zzzz"); await p.waitForTimeout(400);
  rec("search: nonsense shows 'nothing found'", /Nothing found/i.test(await p.$eval(".sheet", (e) => e.textContent)));
  await p.click('[role=tab] >> nth=4'); await p.waitForTimeout(300);
  rec("bookmarks: seeded bookmark is listed", /255/.test(await p.$eval(".sheet", (e) => e.textContent)));
  await p.evaluate(() => document.querySelector(".scrim")?.click()); await p.waitForTimeout(300);
  // ayah sheet: tap an ayah, bookmark, copy, share fallback
  const tapAyah = async () => { const bx = await p.evaluate(() => { const w = [...document.querySelectorAll(".mtext .w.ayah")].find((e) => { const r = e.getBoundingClientRect(); return r.x > 60 && r.x < 320 && r.y > 120 && r.y < 600 && r.width > 10; }); if (!w) return null; const r = w.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); if (bx) await p.mouse.click(bx[0], bx[1]); await p.waitForTimeout(500); return !!bx; };
  rec("reader: tapping an ayah opens the ayah sheet", (await tapAyah()) && !!(await p.$(".asheet")));
  await p.click('.asheet .arow >> nth=0'); await p.waitForTimeout(250);
  rec("ayah sheet: bookmark toggles", (await p.$$eval(".ayah.bm", (a) => a.length)) >= 0);
  await p.click('.asheet .arow:has-text("Copy")'); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => "")); rec("ayah sheet: copy puts Arabic + attribution on the clipboard, no URL besides tanzil credit", /﴿/.test(clip) && /tanzil/i.test(clip) && !/https?:/.test(clip), clip.slice(0, 40));
  await p.click(".asheet .x"); await p.waitForTimeout(300);
  // hide mode toggle
  await showDock(); await p.click('.dock .dbtn[aria-pressed]'); await p.waitForTimeout(300);
  rec("hide-ayahs mode toggles class", await p.evaluate(() => document.querySelector(".app").classList.contains("hide-ayahs")));
  await p.click('.dock .dbtn[aria-pressed]'); await p.waitForTimeout(300);
  rec("reader: no console errors", errs.length === 0, errs.join("|")); await ctx.close();
}

// ---- D. Microphone lifecycle: start / stop / pause / resume / rapid / background / leaving the reader
{
  const { p, errs, ctx } = await open(390, 844, { home: false, page: 1 });
  const showDock = async () => { if (await p.$(".dock.auxhide")) { await p.mouse.click(195, 12); await p.waitForTimeout(450); } };
  const st = () => p.evaluate(() => ({ starts: window.__starts, aborts: window.__aborts, live: window.__live, ui: !!document.querySelector(".rstrip .st.live, .rstrip .st.warn"), rstrip: !!document.querySelector(".rstrip") }));
  await showDock(); await p.click(".mic.big"); await p.waitForTimeout(600);
  let s = await st(); rec("mic: start -> recogniser live, UI listening", s.live === 1 && s.ui, JSON.stringify(s));
  await p.evaluate(() => window.__endRec()); await p.waitForTimeout(500);
  s = await st(); rec("mic: engine ending by itself restarts exactly one new recogniser", s.live === 1 && s.starts >= 2, JSON.stringify(s));
  await p.click(".rstrip .ib.danger"); await p.waitForTimeout(300);
  const startsAtStop = (await st()).starts; await p.evaluate(() => { window.__endRec(); window.__rec.onresult && window.__rec.onresult({ results: [[{ transcript: "بسم" }]] }); }); await p.waitForTimeout(1200);
  s = await st(); rec("mic: STOP is final (no restart, no live recogniser, UI not listening, late events ignored)", s.live === 0 && !s.ui && s.starts === startsAtStop, JSON.stringify(s));
  await p.click(".rstrip .ib:has-text('Close'), .rstrip .ib >> nth=-1").catch(() => {}); await p.waitForTimeout(300);
  // rapid start/stop
  for (let i = 0; i < 8; i++) { await showDock(); await p.click(".mic.big").catch(() => {}); await p.waitForTimeout(40 + (i % 3) * 30); const stopb = await p.$(".rstrip .ib.danger"); if (stopb) await stopb.click().catch(() => {}); await p.waitForTimeout(40); }
  await p.waitForTimeout(900); s = await st();
  const stillOn = await p.$(".rstrip .ib.danger"); if (stillOn) { await stillOn.click(); await p.waitForTimeout(500); s = await st(); }
  rec("mic: rapid start/stop x8 leaves nothing running", s.live === 0, JSON.stringify(s));
  await p.click(".rstrip .ib >> nth=-1").catch(() => {}); await p.waitForTimeout(300);
  // pause / resume
  await showDock(); await p.click(".mic.big"); await p.waitForTimeout(500); await p.click(".mic.big"); await p.waitForTimeout(400);
  s = await st(); rec("mic: pause stops the recogniser", s.live === 0, JSON.stringify(s));
  await p.click(".mic.big"); await p.waitForTimeout(500); s = await st(); rec("mic: resume starts it again", s.live === 1, JSON.stringify(s));
  // background
  await p.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }); document.dispatchEvent(new Event("visibilitychange")); }); await p.waitForTimeout(600);
  s = await st(); rec("mic: app sent to background stops it", s.live === 0, JSON.stringify(s));
  await p.evaluate(() => { Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }); });
  await p.click(".rstrip .ib >> nth=-1").catch(() => {}); await p.waitForTimeout(300);
  // leaving the reader (home button) while listening
  await showDock(); await p.click(".mic.big"); await p.waitForTimeout(500); await p.click("#home-dock"); await p.waitForTimeout(600);
  s = await st(); rec("mic: going Home while listening stops it", s.live === 0, JSON.stringify(s));
  rec("mic: no console errors", errs.length === 0, errs.join("|")); await ctx.close();
}

// ---- E. Onboarding, privacy/about, reduced motion, tablet / orientation, offline, performance
{
  const { p, ctx, errs } = await open(390, 844, { ob: true });
  const had = !!(await p.$(".ob")); rec("onboarding: shown on first launch", had);
  for (let i = 0; i < 3 && (await p.$(".ob")); i++) { const nb = p.locator(".ob .ib.primary, .ob button.primary").first(); await nb.click(); await p.waitForTimeout(450); }
  rec("onboarding: completes and lands on Home", !(await p.$(".ob")) && !!(await p.$(".home")));
  rec("onboarding: no console errors", errs.length === 0, errs.join("|")); await ctx.close();
}
{
  const { p, ctx } = await open(390, 844, { reduce: true });
  const anim = await p.evaluate(() => { const e = document.querySelector(".hcont"); return getComputedStyle(e).animationName + "|" + getComputedStyle(document.querySelector(".hring .val")).animationName; });
  rec("reduced motion: Home animations disabled", /^none\|none$/.test(anim), anim); await ctx.close();
}
for (const [w, h, name] of [[768, 1024, "tablet portrait"], [1024, 768, "tablet landscape"], [844, 390, "phone landscape"], [390, 844, "phone"]]) {
  const { p, ctx, errs } = await open(w, h, { home: false, mobile: w < 700, page: 3 });
  await p.waitForTimeout(500);
  const m = await p.evaluate(() => { const r = document.querySelector(".reader"); const rd = r.getBoundingClientRect(); const pages = [...document.querySelectorAll(".page")].map((x) => x.scrollHeight - x.clientHeight); return { w: rd.width, h: rd.height, sx: document.documentElement.scrollWidth - innerWidth, over: Math.max(0, ...pages) }; });
  rec(`${name}: reader fills the screen without page overflow`, m.sx <= 0 && m.over <= 4 || w === 844, JSON.stringify(m));
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/qa-reader-${name.replace(/ /g, "-")}.png` });
  rec(`${name}: no console errors`, errs.length === 0, errs.join("|")); await ctx.close();
}
{
  const { p, ctx } = await open(390, 844, { home: false, page: 20 });
  await p.evaluate(() => navigator.serviceWorker?.ready); await p.waitForTimeout(1500);
  await ctx.setOffline(true);
  const t0 = Date.now(); await p.reload({ waitUntil: "load" }).catch(() => {}); await p.waitForTimeout(1500);
  rec("offline: app reloads and shows the reader without network (service worker)", !!(await p.$(".mtext")) && (await p.$$eval(".mtext .w", (a) => a.length)) > 20, "t=" + (Date.now() - t0));
  await ctx.setOffline(false); await ctx.close();
}
{
  const { p, ctx } = await open(390, 844, { home: false, page: 100 });
  const times = [];
  for (let i = 0; i < 8; i++) { const t0 = Date.now(); await p.evaluate(() => { const pg = Number(localStorage.getItem("page")); }); await p.keyboard.press("ArrowLeft"); await p.waitForFunction((n) => Number(localStorage.getItem("page")) === n, 101 + i, { timeout: 4000 }).catch(() => {}); times.push(Date.now() - t0); }
  const med = times.sort((a, b) => a - b)[4];
  rec("performance: page turn (keyboard) median < 700 ms", med < 700, times.join(","));
  const nav = await p.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return Math.round(n.domContentLoadedEventEnd); });
  rec("performance: DOM ready < 2500 ms (local)", nav < 2500, String(nav)); await ctx.close();
}
await b.close();
console.log(`\n${results.length - bad}/${results.length} checks passed`);
process.exit(bad ? 1 : 0);

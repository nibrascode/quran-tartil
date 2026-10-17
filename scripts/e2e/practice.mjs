// Practice flows with a faked recogniser: ayah repeat x3, hifz review (graded), weak words from a mistake.
import { chromium } from "playwright-core";
const URL = process.env.URL || "http://127.0.0.1:4180/";
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
await p.context().addInitScript(() => { try { sessionStorage.setItem("qt.home", "0"); } catch {} }); // audits start in the reader, not on Home
const showDock = async () => { if (await p.$(".dock.auxhide")) { await p.mouse.click(195, 12); await p.waitForTimeout(450); } };
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript(() => { window.webkitSpeechRecognition = window.SpeechRecognition = class { start() { window.__rec = this; } abort() {} stop() {} }; window.__said = ""; });
await p.goto(URL); await p.evaluate(() => { localStorage.setItem("qt.v2", JSON.stringify({ onboarded: true, prefs: { strict: "easy", repeat: 3 } })); localStorage.setItem("page", "1"); localStorage.setItem("lang", "en"); });
await p.reload({ waitUntil: "networkidle" });
const say = async (w) => { await p.evaluate((w) => { window.__said += " " + w; window.__rec.onresult({ results: [[{ transcript: window.__said }]] }); }, w); await p.waitForTimeout(1100); };
const fail = (m) => { console.log("FAIL", m, errs); process.exitCode = 1; };
const tapAyah = async (a) => { const bx = await p.evaluate((a) => { const all = [...document.querySelectorAll(`.mtext .w.ayah[data-s="1"][data-a="${a}"]`)].filter((e) => { const r = e.getBoundingClientRect(); return r.x + r.width / 2 > 80 && r.x + r.width / 2 < 300; }); const e = all[0]; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, a); await p.mouse.click(bx.x, bx.y); await p.waitForTimeout(500); };

// 1) repeat x3 of 1:2
await tapAyah(2);
await p.click('.asheet .arow:has-text("Repeat this ayah")'); await p.waitForTimeout(800);
for (let i = 0; i < 3; i++) { await say("الحمد لله رب العالمين"); }
await p.waitForTimeout(900);
const st1 = await p.evaluate(() => document.querySelector(".rstrip")?.textContent || "");
if (!/review|Review|finished|Done|ayahs/i.test(st1) && st1) console.log("strip after repeat:", st1);
const stillOn = await p.evaluate(() => !!document.querySelector(".st.live, .st.warn"));
if (stillOn) fail("repeat x3 should end the session after 3 passes");
else console.log("OK repeat x3 ended");

// 2) hifz: add 1:2 via ayah sheet, review hidden, recite correctly -> box 1
await p.evaluate(() => { window.__said = ""; });
await p.click(".rstrip .ib:has-text('Close'), .rstrip .ib >> nth=-1").catch(() => {}); await p.waitForTimeout(300);
await tapAyah(2);
await p.click('.asheet .arow:has-text("Add to memorization")'); await p.waitForTimeout(300);
const hz = await p.evaluate(() => JSON.parse(localStorage.getItem("qt.v2")).hifz);
if (!hz["1:2"]) fail("hifz card not stored"); else console.log("OK hifz card added", JSON.stringify(hz["1:2"]));
await p.click('.asheet .x'); await p.waitForTimeout(300);
await showDock(); await p.click('.dock button[aria-label="Go to surah / page"]'); await p.waitForTimeout(400);
await p.click('[role=tab]:has-text("Practice")', {timeout:5000}); await p.waitForTimeout(300);
await p.click('button:has-text("Review due")'); await p.waitForTimeout(1200);
const hidden = await p.evaluate(() => document.querySelector(".app")?.classList.contains("hide-ayahs"));
if (!hidden) fail("hifz review should hide the ayahs");
await p.evaluate(() => { window.__said = ""; });
await say("الحمد لله رب العالمين"); await p.waitForTimeout(1500);
const hz2 = await p.evaluate(() => JSON.parse(localStorage.getItem("qt.v2")).hifz["1:2"]);
if (!hz2 || hz2.box !== 1 || hz2.reps !== 1) fail("hifz card not graded: " + JSON.stringify(hz2)); else console.log("OK hifz graded", JSON.stringify(hz2));

// 3) weak words: a wrong word is stored and then listed
await p.waitForTimeout(800);
if (await p.$(".rstrip .ib")) { await p.click(".rstrip .ib"); await p.waitForTimeout(300); if (await p.$(".rstrip .ib")) { await p.click(".rstrip .ib"); await p.waitForTimeout(300); } }
await p.evaluate(() => { window.__said = ""; });
await tapAyah(3);
await p.click('.asheet .arow:has-text("Recite this ayah")'); await p.waitForTimeout(700);
await say("مالك يوم"); await say("الدين");
await p.click(".rstrip .ib.danger"); await p.waitForTimeout(600);
const weak = await p.evaluate(() => JSON.parse(localStorage.getItem("qt.v2")).weak);
if (!weak.length) fail("mistakes were not stored as weak words"); else console.log("OK weak words stored", JSON.stringify(weak.map((w) => w.key + ":" + w.word)));
await showDock(); await p.click('.dock button[aria-label="Go to surah / page"]'); await p.waitForTimeout(400);
await p.click('[role=tab]:has-text("Practice")'); await p.waitForTimeout(300);
if (!(await p.$(".practice .plist .mw"))) fail("weak words not listed in the Practice tab"); else console.log("OK weak words listed");
console.log("errors", errs); if (errs.length) process.exitCode = 1;
await b.close();

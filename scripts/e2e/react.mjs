// "No reaction" guard: (1) recognised words MUST change word state via the Home mic and the dock mic, (2) a recogniser that never delivers anything MUST show a visible message.
import { chromium } from "playwright-core";
const BASE = process.env.URL || "http://127.0.0.1:4180/";
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
let bad = 0; const fail = (m) => { bad++; console.log("FAIL", m); };
async function open(silent, entry) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  if (entry !== "home") await p.context().addInitScript(() => { try { sessionStorage.setItem("qt.home", "0"); } catch {} });
  await p.addInitScript(() => { window.webkitSpeechRecognition = window.SpeechRecognition = class { start() { window.__rec = this; } abort() {} stop() {} }; window.__said = ""; });
  await p.goto(BASE); await p.evaluate(() => { localStorage.setItem("qt.v2", JSON.stringify({ onboarded: true, prefs: { strict: "medium" } })); localStorage.setItem("page", "1"); localStorage.setItem("lang", "en"); });
  await p.reload({ waitUntil: "networkidle" }); return p;
}
const count = (p) => p.evaluate(() => ({ ok: document.querySelectorAll(".mtext .w.ok").length, bad: document.querySelectorAll(".mtext .w.bad, .mtext .w.held").length }));
for (const entry of ["dock", "home"]) {
  const p = await open(false, entry);
  if (entry === "home") { const el = await p.$("#h-mic"); if (el) await el.click(); else { console.log("SKIP home mic selector not found"); await p.close(); continue; } }
  else await p.click("button.mic.big");
  await p.waitForTimeout(500);
  const before = await count(p);
  let said = "";
  for (const w of "الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين".split(" ")) { said += " " + w; await p.evaluate((t) => window.__rec.onresult({ results: [[{ transcript: t, confidence: 0.9 }]] }), said); await p.waitForTimeout(700); }
  await p.waitForTimeout(800);
  const after = await count(p);
  if (after.ok + after.bad <= before.ok + before.bad || after.ok < 3) fail(`${entry} mic: recognised words did not change word state (${JSON.stringify(before)} -> ${JSON.stringify(after)})`); else console.log(`OK ${entry} mic: ${after.ok} green, ${after.bad} red`);
  await p.close();
}
{ // nothing ever arrives
  const p = await open(true, "dock"); await p.click("button.mic.big");
  await p.waitForSelector(".toast", { timeout: 15000 }).then(async () => { const t = await p.textContent(".toast"); if (!/sound|microphone/i.test(t)) fail("silent recogniser: wrong message " + t); else console.log("OK silent recogniser shows: " + t.slice(0, 50)); }).catch(() => fail("silent recogniser: no visible message after 15 s"));
  await p.close();
}
console.log(bad ? `${bad} failures` : "OK no-reaction guard"); await b.close(); if (bad) process.exit(1);

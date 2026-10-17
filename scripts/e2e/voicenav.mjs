// Mic opened on the wrong page: isti'adha + basmala are ignored, the ayah is recognised from its first words and tracked from there (all 3 levels).
import { chromium } from "playwright-core";
const BASE = process.env.URL || "http://127.0.0.1:4180/";
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
let bad = 0; const fail = (m) => { bad++; console.log("FAIL", m); };
const cases = [["67:1", "تبارك الذي بيده الملك وهو على كل شيء قدير"], ["112:1", "قل هو الله احد الله الصمد"], ["2:255", "الله لا اله الا هو الحي القيوم لا تاخذه سنه ولا نوم"]];
for (const strict of ["easy", "medium", "hard"]) for (const [key, text] of cases) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.addInitScript(() => { window.webkitSpeechRecognition = window.SpeechRecognition = class { start() { window.__rec = this; } abort() {} stop() {} }; window.__said = ""; });
  await p.goto(BASE); await p.evaluate((st) => { localStorage.setItem("qt.v2", JSON.stringify({ onboarded: true, prefs: { strict: st } })); localStorage.setItem("page", "300"); localStorage.setItem("lang", "en"); }, strict);
  await p.reload({ waitUntil: "networkidle" });
  await p.click("button.mic"); await p.waitForTimeout(400);
  const say = async (w) => { await p.evaluate((w) => { window.__said += " " + w; window.__rec.onresult({ results: [[{ transcript: window.__said }]] }); }, w); await p.waitForTimeout(1000); };
  await say("اعوذ بالله من الشيطان الرجيم"); await say("بسم الله الرحمن الرحيم");
  const words = text.split(" ");
  for (let i = 0; i < words.length; i += 2) await say(words.slice(i, i + 2).join(" "));
  await p.waitForTimeout(800);
  const r = await p.evaluate((key) => { const [s, a] = key.split(":"); const pg = document.querySelector(".page"); return { page: +pg.dataset.page, ok: document.querySelectorAll(`.mtext .w.ayah[data-s="${s}"][data-a="${a}"].ok`).length, bad: document.querySelectorAll(".mtext .w.bad").length, held: !!document.querySelector(".st.warn"), strip: document.querySelector(".rinfo")?.textContent || "" }; }, key);
  if (r.page === 300) fail(`${strict} ${key}: did not leave page 300`);
  if (r.ok < 3) fail(`${strict} ${key}: only ${r.ok} words tracked (${JSON.stringify(r)})`);
  if (r.bad || r.held) fail(`${strict} ${key}: isti'adha/basmala or recitation flagged as a mistake (${JSON.stringify(r)})`);
  else console.log(`OK ${strict} ${key} -> page ${r.page}, ${r.ok} words tracked`);
  if (errs.length) fail("page errors " + errs.join("|"));
  await p.close();
}
console.log(bad ? `${bad} failures` : "OK voice navigation"); await b.close(); if (bad) process.exit(1);

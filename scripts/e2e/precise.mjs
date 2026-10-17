// Precise engine (on-device Whisper) end to end with a FAKE worker and a fake microphone: consent/download UI (progress, cancel, delete),
// engine choice, live recitation through the real pipeline, diagnostics, and a hard stop that terminates the worker.
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
const URL = process.env.URL || "http://127.0.0.1:4180/";
// "speech-like" audio for the fake microphone (16 kHz mono wav, 4 s of voice + 2 s of silence, looped by Chrome)
const wav = "/tmp/qt-fake-mic.wav", n = 16000 * 6, buf = Buffer.alloc(44 + n * 2);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(16000, 24); buf.writeUInt32LE(32000, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) buf.writeInt16LE(i > 16000 * 4 ? 0 : Math.round(9000 * Math.sin((2 * Math.PI * 180 * i) / 16000) * (0.7 + 0.3 * Math.sin((2 * Math.PI * 4 * i) / 16000))), 44 + i * 2);
writeFileSync(wav, buf);
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--use-file-for-fake-audio-capture=" + wav, "--autoplay-policy=no-user-gesture-required"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, permissions: ["microphone"] });
const p = await ctx.newPage();
await ctx.addInitScript(() => { try { sessionStorage.setItem("qt.home", "0"); } catch {} });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.addInitScript(() => {
  // no Web Speech API: only the Precise engine can recognise
  delete window.SpeechRecognition; delete window.webkitSpeechRecognition;
  window.__fw = { spawned: 0, terminated: 0, runs: 0, slow: false };
  window.__qtPreciseWorker = () => {
    const w = { onmessage: null, onerror: null, dead: false, postMessage(m) {
      const say = (d) => { if (!w.dead) w.onmessage?.({ data: d }); };
      if (m.t === "load") {
        if (m.ort === undefined || m.app === undefined) say({ t: "error", msg: "no ort path" });
        const total = 108e6; let l = 0; const step = () => { if (w.dead) return; l += total / 8; say({ t: "progress", loaded: l, total, file: "m.onnx" }); if (window.__fw.slow) { return; } if (l >= total) say({ t: "ready", ms: 12, threads: 1, backend: "wasm (fake)" }); else setTimeout(step, 120); }; step();
      } else if (m.t === "run") {
        window.__fw.runs++; const a = m.audio; let pk = 0; for (let i = 0; i < a.length; i++) pk = Math.max(pk, Math.abs(a[i]));
        let f = -1, l = -1; for (let i = 0; i < a.length; i++) if (Math.abs(a[i]) > pk * 0.15) { if (f < 0) f = i; l = i; }
        const ws = ["الْحَمْدُ", "لِلَّهِ", "رَبِّ", "الْعَالَمِينَ"]; const s0 = f / 16000, d = Math.max(0.4, (l - f) / 16000);
        // the fake "model" hears the four words of ayah 2 spread over the voiced part of the window (only when a whole burst is inside)
        setTimeout(() => say({ t: "result", id: m.id, sec: 0.3, words: f < 0 ? [] : ws.map((x, i) => ({ w: x, s: s0 + (i * d) / 4, e: s0 + ((i + 1) * d) / 4 - 0.03 })) }), 150);
      }
    }, terminate() { w.dead = true; window.__fw.terminated++; } };
    window.__fw.spawned++; return w;
  };
});
const fail = (m) => { console.log("FAIL", m, errs); process.exitCode = 1; };
await p.goto(URL); await p.evaluate(() => { localStorage.setItem("qt.v2", JSON.stringify({ onboarded: true, prefs: { strict: "easy", repeat: 3 } })); localStorage.setItem("page", "1"); localStorage.setItem("lang", "en"); });
await p.reload({ waitUntil: "networkidle" });
const showDock = async () => { if (await p.$(".dock.auxhide")) { await p.mouse.click(195, 12); await p.waitForTimeout(450); } };
const openEngine = async () => { await showDock(); await p.click("#home-dock ~ .dbtn >> nth=0"); await p.waitForTimeout(300); await p.click('[role=tab]:has-text("Settings")'); await p.waitForTimeout(300); await p.click('.scard-h:has-text("Recognition engine")'); await p.waitForTimeout(500); };
await openEngine();
if (!(await p.$("#precise-dl"))) fail("download button missing (consent UI)"); else console.log("OK consent card: download button, size shown:", /108 MB/.test(await p.textContent("#precise-card")));
// cancel path
await p.evaluate(() => { window.__fw.slow = true; });
await p.click("#precise-dl"); await p.waitForTimeout(400);
if (!(await p.$(".pbar")) || !(await p.$("#precise-cancel"))) fail("progress bar / cancel missing");
await p.click("#precise-cancel"); await p.waitForTimeout(300);
const t1 = await p.textContent("#precise-card");
if (!/cancelled/i.test(t1) || (await p.evaluate(() => window.__fw.terminated)) < 1) fail("cancel did not stop the download: " + t1); else console.log("OK download cancel terminates the worker");
// real (fake) download
await p.evaluate(() => { window.__fw.slow = false; });
await p.click("#precise-dl"); await p.waitForSelector("#precise-del", { timeout: 8000 }).catch(() => {});
if (!(await p.$("#precise-del")) || !/Installed/.test(await p.textContent("#precise-card"))) fail("model not marked installed"); else console.log("OK download -> installed, delete offered");
await p.click("#eng-precise"); await p.waitForTimeout(200);
if ((await p.getAttribute("#eng-precise", "aria-checked")) !== "true") fail("engine choice not applied");
// recite ayah 2 with the Precise engine
await p.reload({ waitUntil: "networkidle" });
const tapAyah = async (a) => { const bx = await p.evaluate((a) => { const all = [...document.querySelectorAll(`.mtext .w.ayah[data-s="1"][data-a="${a}"]`)].filter((e) => { const r = e.getBoundingClientRect(); return r.x + r.width / 2 > 80 && r.x + r.width / 2 < 310; }); const r = all[0]?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; }, a); if (bx) await p.mouse.click(bx.x, bx.y); await p.waitForTimeout(500); };
await tapAyah(2);
await p.click('.asheet .arow:has-text("Recite this ayah")');
let closed = false; for (let i = 0; i < 70 && !closed; i++) { await p.waitForTimeout(250); closed = await p.evaluate(() => !!document.querySelector(".ayah.closed") || /100%/.test(document.querySelector(".rstrip")?.textContent || "")); }
const runs = await p.evaluate(() => window.__fw.runs);
if (!closed) fail("the ayah was not completed through the Precise engine (runs: " + runs + ")"); else console.log("OK recited ayah 2 through Precise (worker runs:", runs + ")");
// stop is final: worker terminated, no more runs
const before = await p.evaluate(() => ({ t: window.__fw.terminated, s: window.__fw.spawned }));
const stopBtn = await p.$('[aria-label="Stop"], #rec-stop, .rbtn.stop, button:has-text("Stop")'); if (stopBtn) await stopBtn.click().catch(() => {});
await p.waitForTimeout(600);
const after = await p.evaluate(() => ({ t: window.__fw.terminated, s: window.__fw.spawned, runs: window.__fw.runs }));
await p.waitForTimeout(1500);
const later = await p.evaluate(() => window.__fw.runs);
if (stopBtn && after.t < after.s - (before.s - before.t) ) fail("worker not terminated by stop " + JSON.stringify({ before, after })); else if (stopBtn && later !== after.runs) fail("worker kept running after stop"); else console.log("OK stop terminates the worker", JSON.stringify(after), stopBtn ? "" : "(stop button not found, recitation had already ended)");
// delete
await openEngine();
await p.click("#precise-del"); await p.waitForTimeout(500);
if (!(await p.$("#precise-dl")) || !/Not installed/.test(await p.textContent("#precise-card"))) fail("delete did not remove the model"); else console.log("OK delete model");
if (errs.length) fail("page errors"); else console.log("errors []");
await b.close();

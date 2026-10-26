// Two-page spread at tablet sizes (1024x673, 1280x800), every spread 3-4 … 603-604: both pages share one font size, every non-centred line is justified to the full width, no line wraps; only surah-ending short lines (and the last pages) are centred.
import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
let bad = 0, n = 0;
for (const [w,h] of [[1024,673],[1280,800]]) {
const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })).newPage();
for (let pg = 3; pg <= 604; pg += 2) {
  await p.addInitScript((x) => { sessionStorage.setItem("qt.home", "0"); localStorage.setItem("page", String(x)); localStorage.setItem("qt.v2", JSON.stringify({ onboarded: true })); }, pg);
  if (pg === 3) await p.goto((process.env.URL || "http://127.0.0.1:4180/"), { waitUntil: "networkidle" }); else await p.evaluate((x)=>{localStorage.setItem("page",String(x));location.reload()}, pg);
  await p.waitForFunction(() => [...document.querySelectorAll(".spread .mtext")].every(t => t.style.visibility !== "hidden"));
  await p.waitForTimeout(150);
  const r = await p.evaluate(() => [...document.querySelectorAll(".spread .page")].map(e => { const t = e.querySelector(".mtext"); const fs=parseFloat(t.style.fontSize); const W=t.clientWidth; const lines=[...t.querySelectorAll(".ln")]; return { pg:+e.dataset.page, fs, c: lines.map((l,i)=>[i, l.classList.contains("c")]).filter(x=>x[1]).map(x=>x[0]), narrow: lines.filter(l=>!l.classList.contains("c")).map(l=>{const k=[...l.children]; if(!k.length) return 0; const L=Math.min(...k.map(c=>c.getBoundingClientRect().left)), R=Math.max(...k.map(c=>c.getBoundingClientRect().right)); return (R-L)/l.clientWidth;}).filter(x=>x<0.97).length, wrap: lines.filter(l=>l.scrollHeight>fs*2.4).length }; }));
  n++;
  const msg = [];
  if (r.length===2 && Math.abs(r[0].fs-r[1].fs)>0.6) msg.push("fs "+r[0].fs+"/"+r[1].fs);
  for (const x of r) { if (x.narrow) msg.push(x.pg+" unjustified "+x.narrow); if (x.wrap) msg.push(x.pg+" wrapped "+x.wrap); if (x.c.length) msg.push(x.pg+" centred "+x.c); }
  if (msg.length) { if (msg.some(m=>!/centred/.test(m))) bad++; console.log(w, pg, msg.join("; ")); }
}}
console.log("spreads", n, "bad", bad); await b.close(); if (bad) process.exit(1);

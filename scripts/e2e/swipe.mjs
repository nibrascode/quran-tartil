// Touch page turning on phones and tablets (real touch events via CDP, not mouse): swipe both ways, edge taps.
import { chromium } from "playwright-core";
const URL = process.env.URL || "http://127.0.0.1:4180/";
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const sizes = (process.env.S || "390x844,768x1024,800x1280,834x1194,1024x768,1280x800").split(",");
let bad = 0;
for (const s of sizes) {
  const [w, h] = s.split("x").map(Number);
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.addInitScript((process_PAGE) => { sessionStorage.setItem("qt.home", "0"); localStorage.setItem("qt.v2", JSON.stringify({ onboarded: true })); if (!sessionStorage.getItem("init")) { localStorage.setItem("page", process_PAGE); sessionStorage.setItem("init", "1"); } }, process.env.P || "100");
  await p.goto(URL, { waitUntil: "networkidle" }); await p.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(p);
  const pg = () => p.evaluate(() => +localStorage.getItem("page"));
  const swipe = async (x0, x1) => {
    const y = h * 0.5, n = 10;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y }] });
    for (let i = 1; i <= n; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / n, y }] }); await p.waitForTimeout(16); }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await p.waitForTimeout(900);
  };
  const tap = async (x) => { await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: h * 0.5 }] }); await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await p.waitForTimeout(900); };
  const spread = await p.evaluate(() => !!document.querySelector(".spread"));
  const step = spread ? 2 : 1;
  const p0 = await pg();
  await swipe(w * 0.25, w * 0.8); const p1 = await pg();        // left-to-right = next
  await swipe(w * 0.8, w * 0.25); const p2 = await pg();        // right-to-left = previous
  await tap(w * 0.06); const p3 = await pg();                   // left edge = next
  await tap(w * 0.94); const p4 = await pg();                   // right edge = previous
  const base = spread ? p0 - (p0 % 2 ? 0 : 1) : p0;
  const ok = p1 === base + step && p2 === base && p3 === base + step && p4 === base;
  if (!ok) bad++;
  console.log(s, spread ? "spread" : "single", [p0, p1, p2, p3, p4].join(" > "), ok ? "OK" : "FAIL");
  await ctx.close();
}
await b.close();
if (bad) process.exit(1);

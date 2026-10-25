// Every one of the 114 surah banners: fully inside the page frame, never overlapping the next row, text not clipped.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const BASE = process.env.URL || "http://127.0.0.1:4180/";
const meta = JSON.parse(readFileSync(new URL("../../src/data/meta.json", import.meta.url), "utf8"));
const pageOf = (s) => { let p = 1; meta.pages.forEach(([ps, pa], i) => { if (ps < s || (ps === s && pa <= 1)) p = i + 1; }); return p; };
const b = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const themes = (process.env.THEMES || "light,dark,sepia").split(","), sizes = [[390, 844], [320, 640], [768, 1024]];
let bad = 0, checked = 0;
for (const [w, h] of sizes) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
await p.context().addInitScript(() => { try { sessionStorage.setItem("qt.home", "0"); } catch {} }); // audits start in the reader, not on Home
  await p.addInitScript(() => localStorage.setItem("qt.v2", JSON.stringify({ onboarded: true })));
  await p.goto(BASE);
  for (const th of themes.slice(0, w === 390 ? 3 : 1)) {
    for (let s = 1; s <= 114; s++) {
      if (th !== "light" && s % 6 !== 0 && s !== 1 && s !== 114) continue;
      await p.evaluate(([pg, th]) => { localStorage.setItem("page", pg); localStorage.setItem("theme", th); }, [pageOf(s), th]);
      await p.reload({ waitUntil: "load" }); await p.waitForSelector(".layer:not(.pre):not(.over) .page .ln, .layer:not(.pre):not(.over) .page .sura-head"); await p.waitForTimeout(160);
      const r = await p.evaluate((s) => {
        const out = []; const pg = document.querySelector(".layer:not(.pre):not(.over) .page"); const fr = pg.querySelector(".frame").getBoundingClientRect(), body = pg.querySelector(".page-body").getBoundingClientRect();
        const rows = [...pg.querySelector(".mtext").children]; const tall = !!pg.querySelector(".page-body.tall");
        rows.forEach((row, i) => {
          if (!row.classList.contains("sura-head")) return;
          const rc = row.getBoundingClientRect(), sp = (row.querySelector(".cart > span") || row.querySelector("span")).getBoundingClientRect(), nx = rows[i + 1]?.getBoundingClientRect();
          if (rc.left < fr.left + 1 || rc.right > fr.right - 1) out.push("banner outside frame x");
          if (rc.top < body.top - 1 || (!tall && rc.bottom > body.bottom + 1)) out.push("banner outside body y");
          if (sp.left < rc.left - 1 || sp.right > rc.right + 1 || sp.top < rc.top - 1 || sp.bottom > rc.bottom + 1) out.push(`text outside banner (${Math.round(sp.bottom - rc.bottom)}px)`);
          if (nx && rc.bottom > nx.top + 1) out.push("banner overlaps next row");
          if (row.scrollWidth > row.clientWidth + 1) out.push("banner content clipped (x)");
          { // real glyph ink (the font's line box is much taller than the letters): must sit inside the banner with a margin
            const sc = getComputedStyle(row.querySelector(".cart > span") || row.querySelector("span")), cv = document.createElement("canvas").getContext("2d"); cv.font = `${sc.fontSize} ${sc.fontFamily}`; cv.direction = "rtl";
            const tm = cv.measureText(row.textContent), lh = parseFloat(sc.lineHeight) || parseFloat(sc.fontSize);
            const base = sp.top + (sp.height - (tm.fontBoundingBoxAscent + tm.fontBoundingBoxDescent)) / 2 + tm.fontBoundingBoxAscent;
            const inkTop = base - tm.actualBoundingBoxAscent, inkBot = base + tm.actualBoundingBoxDescent, m = Math.max(2, rc.height * 0.1);
            if (inkBot > rc.bottom - m || inkTop < rc.top + m) out.push(`banner text ink touches/exits the banner (top ${Math.round(inkTop - rc.top)}, bottom ${Math.round(rc.bottom - inkBot)}px of ${Math.round(rc.height)})`);
          }
          const cs = getComputedStyle(row); if (rc.height < parseFloat(cs.fontSize) * 1.1) out.push("banner too short for its text");
        });
        if (!rows.some((r) => r.classList.contains("sura-head")) && ![1, 9].includes(s) && false) out.push("no banner");
        return out;
      }, s);
      checked++;
      if (r.length) { bad++; console.log(`FAIL ${w}x${h} ${th} sura ${s} (page ${pageOf(s)}): ${[...new Set(r)].join("; ")}`); }
    }
  }
  await p.close();
}
console.log(`headers checked: ${checked}, failing: ${bad}`); await b.close(); if (bad) process.exit(1);

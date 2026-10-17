// Offline recognition corpus: the expected text itself + noisy variants that simulate realistic recogniser output.
// Correct variants must be accepted (score 100, no mistake); wrong variants must be caught (never silently accepted).
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
export async function load() {
  const dir = mkdtempSync(join(tmpdir(), "corp-"));
  execFileSync("npx", ["tsc", "src/reciteCore.ts", "src/asr.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler", "--skipLibCheck"], { stdio: "ignore", timeout: 90000 });
  writeFileSync(join(dir, "package.json"), '{"type":"module"}');
  for (const [f, deps] of [["reciteCore.js", ["tartil", "prefix"]], ["prefix.js", ["tartil"]], ["asr.js", ["tartil"]]]) { try { let c = readFileSync(join(dir, f), "utf8"); for (const d of deps) c = c.split(`"./${d}"`).join(`"./${d}.js"`); writeFileSync(join(dir, f), c); } catch {} }
  const { ReciteSession } = await import(join(dir, "reciteCore.js"));
  const { normalizeAr, spelledOut } = await import(join(dir, "tartil.js"));
  return { ReciteSession, normalizeAr, spelledOut };
}
// deterministic PRNG
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export function corpus() {
  const lines = readFileSync("src/data/quran-uthmani.txt", "utf8").split("\n").map((l) => /^(\d+)\|(\d+)\|(.*)$/.exec(l)).filter(Boolean).map((m) => ({ s: +m[1], a: +m[2], t: m[3].trim() }));
  const pick = lines.filter((x) => x.a > 1 || x.s === 1 ? true : true).filter((x, i) => i % 13 === 0).filter((x) => { const n = x.t.split(" ").length; return n >= 4 && n <= 24; });
  return { all: lines, sample: pick };
}
const strip = (w) => w.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "");
const NUMW = [["ثلاث", "3"], ["سبع", "7"], ["ثمان", "8"], ["تسع", "9"], ["خمس", "5"], ["ست", "6"], ["اربع", "4"], ["أربع", "4"]];
export function variants(tokens, ctx, seed) {
  const r = rng(seed); const T = tokens.filter((t) => strip(t).length > 0 && !/^[\u06D6-\u06DC]+$/.test(t)); const bare = T.map(strip);
  const out = {};
  out.clean = bare.slice();
  out.hamzaTa = bare.map((w) => w.replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[أإآ]/g, "ا").replace(/ؤ/g, "و").replace(/ئ/g, "ي"));
  out.standardSpelling = T.map((w) => ctx.spelledOut(w) ?? strip(w));
  { const w = bare.slice(); const k = Math.floor(r() * Math.max(1, w.length - 1)); if (w.length > 2) w.splice(k, 2, w[k] + w[k + 1]); out.merged1 = w; }
  { const w = bare.slice(); for (let i = 0, c = 0; i < w.length - 1 && c < 3; i += 3 + Math.floor(r() * 2)) { w.splice(i, 2, w[i] + w[i + 1]); c++; } out.merged3 = w; }
  { const w = []; let done = false; for (const x of bare) { if (!done && x.length >= 5 && r() < 0.5) { const c = 2 + Math.floor(r() * (x.length - 3)); w.push(x.slice(0, c), x.slice(c)); done = true; } else w.push(x); } out.split = w; }
  out.waSplit = bare.flatMap((x, i) => (i === 0 && /^[وف]/.test(x) && x.length > 3 ? [x[0], x.slice(1)] : [x]));
  { const w = bare.map((x) => { const f = NUMW.find(([s]) => x.startsWith(s) && x.length <= s.length + 2); return f ? f[1] : x; }); out.digits = w; out._hasDigits = w.some((x) => /^\d+$/.test(x)); }
  { const w = bare.slice(); const k = Math.floor(r() * w.length); w.splice(k, 0, w[k]); out.stutter = w; }
  { const w = bare.slice(); const k = 1 + Math.floor(r() * Math.max(1, w.length - 1)); w.splice(k + 1, 0, w[k]); out.echo = w; }
  out.noisyMix = (() => { let w = out.standardSpelling.map((x) => x.replace(/ة/g, "ه").replace(/[أإآ]/g, "ا")); if (w.length > 3) { const k = Math.floor(r() * (w.length - 1)); w.splice(k, 2, w[k] + w[k + 1]); } return w; })();
  return out;
}
export function wrongs(tokens, all, seed) {
  const r = rng(seed ^ 0x9e37); const bare = tokens.map(strip).filter(Boolean); const out = {};
  const pool = all[Math.floor(r() * all.length)].t.split(" ").map(strip).filter((w) => w.length > 3);
  const k = Math.floor(r() * bare.length);
  { const w = bare.slice(); w[k] = pool[Math.floor(r() * pool.length)] || "كتاب"; if (w[k] !== bare[k]) out.substitutedWord = w; }
  { const w = bare.slice(); if (w.length > 3) { w.splice(Math.max(1, k), 1); out.skippedWord = w; } }
  { const w = bare.slice(); const L = { ب: "ت", ت: "ب", د: "ذ", ص: "س", س: "ص", ق: "ك", ك: "ق", ح: "ه", ع: "ا", ط: "ت", ض: "د", ظ: "ز", ث: "س" }; const i = w.findIndex((x, j) => j >= 0 && [...x].some((c) => L[c] && c !== "ا")); if (i >= 0) { const x = [...w[i]]; const p = x.findIndex((c) => L[c]); x[p] = L[x[p]]; w[i] = x.join(""); out.wrongLetter = w; } }
  { const w = bare.slice(); if (w.length > 3) { [w[1], w[2]] = [w[2], w[1]]; if (w[1] !== bare[1]) out.swappedOrder = w; } }
  return out;
}
export function run(ctx, level, tokens, words, { chunk = 2, restartAt = -1, overlap = 0 } = {}) {
  const A = [{ key: "x:1", tokens }];
  const s = new ctx.ReciteSession(A, level);
  let i = 0, base = 0;
  while (i < words.length) {
    i = Math.min(words.length, i + chunk);
    if (restartAt >= 0 && base === 0 && i >= restartAt) { s.feed(words.slice(0, i), false); s.newRecogniser(); base = i; const rep = words.slice(Math.max(0, i - overlap), i); const rest = words.slice(i); let h = rep.slice(); i = words.length; for (let c = 0; c <= rest.length; c += chunk) { s.feed(h.concat(rest.slice(0, c)), c >= rest.length); } h = rep.concat(rest); s.feed(h, true); break; }
    s.feed(words.slice(0, i), i >= words.length);
  }
  s.feed(words, true); s.feed(words, true);
  const r = s.res.get("x:1");
  return { accepted: s.cursor >= 1 && r?.closed && r.score === 100 && s.events.length === 0, held: s.held, closed: !!r?.closed, score: r?.score ?? 0 };
}
export async function bench(levels = ["easy", "medium", "hard"]) {
  const ctx = await load(); const { all, sample } = corpus();
  const res = {};
  for (const lv of levels) {
    const acc = {}, tot = {}, wacc = {}, wtot = {};
    sample.forEach((ay, idx) => {
      const tokens = ay.t.split(" ");
      const V = variants(tokens, ctx, idx + 1);
      for (const [name, w] of Object.entries(V)) {
        if (name.startsWith("_") || (name === "digits" && !V._hasDigits)) continue;
        tot[name] = (tot[name] || 0) + 1; if (run(ctx, lv, tokens, w).accepted) acc[name] = (acc[name] || 0) + 1;
      }
      // pause/restart in the middle, engine repeats the last 0..2 words
      for (const ov of [0, 1, 2]) { const nm = "restart+overlap" + ov; tot[nm] = (tot[nm] || 0) + 1; if (run(ctx, lv, tokens, V.clean, { restartAt: Math.floor(V.clean.length / 2), overlap: ov }).accepted) acc[nm] = (acc[nm] || 0) + 1; }
      const W = wrongs(tokens, all, idx + 7);
      for (const [name, w] of Object.entries(W)) { wtot[name] = (wtot[name] || 0) + 1; const o = run(ctx, lv, tokens, w); if (o.accepted) wacc[name] = (wacc[name] || 0) + 1; }
    });
    res[lv] = { n: sample.length, accepted: acc, total: tot, falseAccepts: wacc, wrongTotal: wtot };
  }
  return res;
}
if (process.argv[1] && process.argv[1].endsWith("recog-corpus.mjs")) {
  const res = await bench();
  for (const [lv, r] of Object.entries(res)) {
    console.log(`\n== ${lv} (${r.n} ayahs)`);
    for (const k of Object.keys(r.total)) console.log(`  ${k.padEnd(20)} accepted ${String(r.accepted[k] || 0).padStart(3)}/${r.total[k]}  ${(100 * (r.accepted[k] || 0) / r.total[k]).toFixed(1)}%`);
    for (const k of Object.keys(r.wrongTotal)) console.log(`  WRONG ${k.padEnd(16)} falsely accepted ${r.falseAccepts[k] || 0}/${r.wrongTotal[k]}`);
  }
}

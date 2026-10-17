// Near-live "Precise" engine benchmark: real EveryAyah recitations are streamed in (virtual) real time through the SAME Pipeline
// (windows, VAD, stitching) as the app, decoded by the Quran-tuned Whisper tiny (q8 ONNX, transformers.js), and the committed words are
// fed to the SAME ReciteSession. Decode time is the real measured CPU time of this box, charged to the virtual clock.
// usage: node scripts/precise-bench.mjs [--threads N] [--sets a,b] [--degrade clean,noise,...] [--win 5] [--hop 1] [--json out.json]
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const NOEXP = process.argv.includes("--noexp"); const THREADS = +arg("threads", 0), WIN = +arg("win", 5), HOP = +arg("hop", 1), MARGIN = +arg("margin", 1);
const AUDIO = arg("audio", "/workspace/bench-whisper/au");
const MODEL = arg("model", "Sharjeelbaig/whisper-tiny-ar-quran-onnx");
const SETS = [
  { name: "Alafasy 1:1-7", r: "Alafasy_128kbps", s: 1, a: [1, 2, 3, 4, 5, 6, 7] },
  { name: "Husary 112+113", r: "Husary_128kbps", s: 112, a: [1, 2, 3, 4], more: { s: 113, a: [1, 2, 3, 4, 5] } },
  { name: "Abdul Basit 93:1-11", r: "Abdul_Basit_Murattal_192kbps", s: 93, a: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { name: "Minshawy 108", r: "Minshawy_Murattal_128kbps", s: 108, a: [1, 2, 3] },
  { name: "Minshawy 2:255", r: "Minshawy_Murattal_128kbps", s: 2, a: [255] },
];
const want = (arg("sets", "") || "").split(",").filter(Boolean);
const DEG = (arg("degrade", "clean,noise10,quiet,fast,slow,hard")).split(",");

// ---- compile app modules
const dir = mkdtempSync(join(tmpdir(), "pb-"));
execFileSync("npx", ["tsc", "src/reciteCore.ts", "src/asr.ts", "src/precise/pipeline.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler", "--skipLibCheck"], { stdio: "ignore", timeout: 120000 });
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
const fix = (f, deps) => { const p = join(dir, f); let c = readFileSync(p, "utf8"); for (const d of deps) c = c.split(`"./${d}"`).join(`"./${d}.js"`); writeFileSync(p, c); };
fix("reciteCore.js", ["tartil", "prefix"]); fix("prefix.js", ["tartil"]); fix("asr.js", ["tartil"]); fix("precise/pipeline.js", ["vad"]);
const { ReciteSession } = await import(join(dir, "reciteCore.js"));
const { Pipeline } = await import(join(dir, "precise/pipeline.js"));
const { normalizeAr } = await import(join(dir, "tartil.js"));

const lines = readFileSync("src/data/quran-uthmani.txt", "utf8").split("\n").map((l) => /^(\d+)\|(\d+)\|(.*)$/.exec(l)).filter(Boolean).map((m) => ({ s: +m[1], a: +m[2], t: m[3].trim() }));
const ayahText = (s, a) => lines.find((x) => x.s === s && x.a === a).t;

// ---- audio
function pcm(file, tempo = 1) {
  const f = tempo !== 1 ? ["-filter:a", `atempo=${tempo}`] : [];
  const r = spawnSync("ffmpeg", ["-loglevel", "error", "-i", file, ...f, "-ar", "16000", "-ac", "1", "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  const b = r.stdout; return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}
const rms = (x) => { let s = 0; for (const v of x) s += v * v; return Math.sqrt(s / x.length); };
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
function degrade(x, kind) {
  const y = Float32Array.from(x);
  const noise = (snr) => { const sig = rms(y), n = sig / Math.pow(10, snr / 20); let lp = 0; for (let i = 0; i < y.length; i++) { lp = 0.7 * lp + 0.3 * gauss(); y[i] += (lp * 0.6 + gauss() * 0.4) * n; } };
  if (kind === "noise10") noise(10);
  if (kind === "quiet") for (let i = 0; i < y.length; i++) y[i] *= 0.06;
  if (kind === "hard") { noise(15); for (let i = 0; i < y.length; i++) y[i] *= 0.12; }
  return y;
}
function build(set, kind) {
  const tempo = kind === "fast" ? 1.2 : kind === "slow" ? 0.8 : kind === "hard" ? 1.1 : 1;
  const parts = [], refs = [];
  const add = (s, ayas) => { for (const a of ayas) { const f = join(AUDIO, `${set.r}_${String(s).padStart(3, "0")}${String(a).padStart(3, "0")}.mp3`); if (!existsSync(f)) throw new Error("missing " + f); parts.push(pcm(f, tempo), new Float32Array(Math.round(16000 * 0.45))); { let tk = ayahText(s, a).split(" "); if (a === 1 && s !== 1 && /^بِسْمِ/.test(tk[0]) && tk.length > 4) tk = tk.slice(4); /* EveryAyah's first ayah audio has no basmala */ refs.push({ s, a, tokens: tk }); } } };
  add(set.s, set.a); if (set.more) add(set.more.s, set.more.a);
  parts.push(new Float32Array(16000 * 2)); // the reciter stops: endpoint flush
  const n = parts.reduce((t, p) => t + p.length, 0), x = new Float32Array(n); let o = 0; for (const p of parts) { x.set(p, o); o += p.length; }
  return { x: degrade(x, kind), refs };
}

// ---- decoder
const { pipeline } = await import("@huggingface/transformers");
// the base ONNX export ships a stripped generation_config (no alignment heads / language table): use openai/whisper-base's (same architecture) like the app does
if (/base/.test(MODEL) && /raghib/.test(MODEL)) { const gc = readFileSync("public/precise/base-generation_config.json"); const of = globalThis.fetch; globalThis.fetch = async (u, o) => (String(u).includes("generation_config.json") ? new Response(gc, { headers: { "content-type": "application/json" } }) : of(u, o)); }
const t0 = Date.now();
const asr = await pipeline("automatic-speech-recognition", MODEL, { dtype: "q8", ...(THREADS ? { session_options: { intraOpNumThreads: THREADS, interOpNumThreads: 1 } } : {}) });
console.log(`model ready in ${Date.now() - t0} ms (threads: ${THREADS || "default"}), win ${WIN}s hop ${HOP}s margin ${MARGIN}s`);
async function decode(samples) {
  const t = performance.now();
  let words;
  if (process.argv.includes("--nots")) { const r = await asr(samples, { language: "ar", task: "transcribe" }); words = r.text.split(/\s+/).filter(Boolean).map((w) => ({ w, s: -1, e: -1 })); }
  else { const r = await asr(samples, { language: "ar", task: "transcribe", return_timestamps: "word" }); words = (r.chunks || []).map((c) => ({ w: c.text, s: c.timestamp[0] ?? 0, e: c.timestamp[1] ?? 0 })); }
  return { words, sec: (performance.now() - t) / 1000 };
}
await decode(new Float32Array(16000 * 2).map(() => (Math.random() - 0.5) * 0.01)); // warm-up

const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
// word accuracy: longest in-order match between reference and heard words (fuzzy: >=0.75 character similarity)
const wsim = (a, b) => { if (a === b) return 1; const d = lev([...a], [...b]); return 1 - d / Math.max(a.length, b.length); };
const lcsFuzzy = (ref, hyp) => { const dp = Array.from({ length: ref.length + 1 }, () => new Array(hyp.length + 1).fill(0)); for (let i = 1; i <= ref.length; i++) for (let j = 1; j <= hyp.length; j++) dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1], wsim(ref[i - 1], hyp[j - 1]) >= 0.75 ? dp[i - 1][j - 1] + 1 : 0); return dp[ref.length][hyp.length]; };
const pct = (v, p) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };

async function stream(x, refs) {
  const P = new Pipeline({ win: WIN, hop: HOP, margin: MARGIN });
  const expAll = refs.flatMap((r) => r.tokens);
  const STEP = 1600; // 100 ms chunks
  let now = 0, fed = 0, pend = null, inferTotal = 0;
  const events = []; // {t, words:[...], e:[...]}
  const sources = [];
  while (fed < x.length || pend) {
    if (fed < x.length) { P.push(x.subarray(fed, Math.min(x.length, fed + STEP))); fed += STEP; now += 0.1; }
    else now += 0.1;
    if (pend && now >= pend.at) {
      const r = P.done(pend.job, pend.words, pend.sec); if (process.env.TRACE) console.log(`t=${now.toFixed(1)} win ${pend.job.start.toFixed(1)}-${pend.job.end.toFixed(1)}${pend.job.endpoint ? " EP" : ""} hyp: ${pend.words.map((w) => w.w.trim() + "@" + (w.s + pend.job.start).toFixed(1) + "-" + (w.e + pend.job.start).toFixed(1)).join(" ")}\n    => commit [${r.words.join(" ")}] tent [${r.tentative.join(" ")}]`); pend = null;
      if (r.words.length) events.push({ t: now, words: r.words, until: P.committedUntil });
    }
    if (!pend) { if (!NOEXP) { const k = P.committed.length; const at = Math.max(0, Math.floor(k * 0.95) - 2); P.setExpected(expAll.slice(at, at + 40)); } const job = P.poll(now * 1000); if (job) { const { words, sec } = await decode(job.samples); inferTotal += sec; pend = { job, words, sec, at: now + sec }; } }
    if (fed >= x.length && now > x.length / 16000 + 30) break;
  }
  return { P, events, inferTotal, audioSec: x.length / 16000, jobs: P.jobs };
}

const out = [];
for (const set of SETS) {
  if (want.length && !want.some((w) => set.name.includes(w))) continue;
  for (const kind of DEG) {
    const { x, refs } = build(set, kind);
    const res = await stream(x, refs);
    const hyp = res.P.committed.map((w) => normalizeAr(w)).filter(Boolean);
    const ref = refs.flatMap((r) => r.tokens).map((w) => normalizeAr(w)).filter(Boolean);
    const wer = lev(ref, hyp) / ref.length; if (process.env.DBG) { console.log("REF", ref.join(" ")); console.log("HYP", hyp.join(" ")); }
    const lastWordLag = res.events.length ? res.events[res.events.length - 1].t - (x.length / 16000 - 2) : 0;
    const lags = []; for (const ev of res.events) for (const _ of ev.words) lags.push(ev.t - ev.until);
    const l = lcsFuzzy(ref, hyp); const row = { set: set.name, kind, words: ref.length, wer: +(wer * 100).toFixed(1), wordAcc: +(100 * l / ref.length).toFixed(1), extra: +(100 * (hyp.length - l) / Math.max(1, hyp.length)).toFixed(1), rtf: +(res.inferTotal / res.audioSec).toFixed(2), jobs: res.jobs, lagMedian: +pct(lags, 0.5).toFixed(2), lagP90: +pct(lags, 0.9).toFixed(2), finalLag: +lastWordLag.toFixed(2), level: {} };
    for (const level of ["easy", "medium", "hard"]) {
      const ss = new ReciteSession(refs.map((r) => ({ key: r.s + ":" + r.a, tokens: r.tokens })), level);
      const all = []; for (const ev of res.events) { all.push(...ev.words); ss.feed(all, false); }
      ss.feed(all, true); ss.feed(all, true);
      if (process.env.DBG && level === "medium") console.log("EVENTS", JSON.stringify(ss.events), "cursor", ss.cursor);
      row.level[level] = { closed: [...ss.res.values()].filter((v) => v.closed).length + "/" + refs.length, cursor: ss.cursor, holds: ss.events.length, held: ss.held };
    }
    out.push(row);
    console.log(`${set.name.padEnd(22)} ${kind.padEnd(8)} wordAcc ${String(row.wordAcc).padStart(5)}% extra ${String(row.extra).padStart(4)}%  rtf ${row.rtf}  lag med ${row.lagMedian}s p90 ${row.lagP90}s final ${row.finalLag}s  | closed easy ${row.level.easy.closed} med ${row.level.medium.closed} hard ${row.level.hard.closed} (holds m=${row.level.medium.holds})`);
  }
}
const f = arg("json", ""); if (f) writeFileSync(f, JSON.stringify(out, null, 1));

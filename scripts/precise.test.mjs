import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "prec-"));
execFileSync("npx", ["tsc", "src/precise/engine.ts", "src/listenerCore.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler", "--skipLibCheck"], { stdio: "ignore", timeout: 90000 });
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
const fix = (f, deps) => { const p = join(dir, f); let c = readFileSync(p, "utf8"); for (const d of deps) c = c.split(`"${d}"`).join(`"${d}.js"`); writeFileSync(p, c); };
fix("precise/pipeline.js", ["./vad"]); fix("precise/engine.js", ["./pipeline"]); fix("listenerCore.js", ["./asr"]); fix("asr.js", ["./tartil"]);
const { Pipeline, overlapLen } = await import(join(dir, "precise/pipeline.js"));
const { Vad } = await import(join(dir, "precise/vad.js"));
const { createPreciseEngine, pdiag } = await import(join(dir, "precise/engine.js"));
const { createCore } = await import(join(dir, "listenerCore.js"));
const SR = 16000;

/** a signal with "speech" (noisy 200 Hz tone) during the given [start,end) spans and quiet noise elsewhere */
function signal(total, spans, amp = 0.2) {
  const x = new Float32Array(Math.round(total * SR)); let seed = 1;
  for (let i = 0; i < x.length; i++) { seed = (seed * 1103515245 + 12345) >>> 0; const n = ((seed / 4294967296) - 0.5) * 0.002; const t = i / SR; const on = spans.some(([a, b]) => t >= a && t < b); x[i] = on ? amp * Math.sin(2 * Math.PI * 200 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 3 * t)) + n : n; }
  return x;
}
/** truth: [{w, s, e}] in stream seconds. The fake decoder "hears" the words that lie inside the window (a word cut by the window edge is mangled) */
function decoder(truth, { junkInSilence = false } = {}) {
  return (job) => {
    const out = [];
    for (const t of truth) {
      if (t.e <= job.start + 0.05 || t.s >= job.end - 0.05) continue;
      const cutL = t.s < job.start + 0.05, cutR = t.e > job.end - 0.05;
      out.push({ w: cutL || cutR ? t.w.slice(0, Math.max(1, t.w.length - 2)) + "ز" : t.w, s: Math.max(0, t.s - job.start), e: Math.max(0, Math.min(t.e, job.end) - job.start) });
    }
    if (junkInSilence) out.push({ w: "جنك", s: job.end - job.start - 0.5, e: job.end - job.start - 0.1 });
    return out;
  };
}
function runPipe(truth, total, dec, opts = {}, spansFromTruth = true, inferSec = 0.4) {
  const spans = truth.map((t) => [t.s, t.e]);
  const x = signal(total, spans), P = new Pipeline(opts);
  let now = 0, fed = 0, pend = null; const events = [];
  while (fed < x.length || pend) {
    if (fed < x.length) { P.push(x.subarray(fed, fed + 1600)); fed += 1600; }
    now += 0.1;
    if (pend && now >= pend.at) { const r = P.done(pend.job, pend.hyp, inferSec); if (r.words.length) events.push({ t: now, words: r.words }); pend = null; }
    if (!pend) { const job = P.poll(now * 1000); if (job) pend = { job, hyp: dec(job), at: now + inferSec }; }
    if (now > total + 20) break;
  }
  return { P, events };
}
const WORDS = "بسم الله الرحمن الرحيم الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين".split(" ");
const truth = WORDS.map((w, i) => ({ w, s: 0.5 + i * 0.7 + (i > 3 ? 0.6 : 0) + (i > 8 ? 0.6 : 0), e: 0.5 + i * 0.7 + 0.55 + (i > 3 ? 0.6 : 0) + (i > 8 ? 0.6 : 0) }));

test("VAD: speech, silence and pauses", () => {
  const v = new Vad(); v.push(signal(6, [[1, 2], [3.5, 5]]));
  assert.ok(v.speech(1, 2) > 0.8); assert.ok(v.speech(2.1, 3.4) < 0.1); assert.ok(v.silence() > 0.9);
  const p = v.pause(0, 3.4, 0.3); assert.ok(p > 2 && p < 3.4, "pause between the two phrases: " + p);
  assert.equal(v.pause(1.1, 1.9, 0.3), -1);
});
test("overlapLen: fuzzy overlap of the committed tail with the head of a hypothesis", () => {
  assert.equal(overlapLen(["الحمد", "لله", "رب"], ["لله", "رب", "العالمين"]), 2);
  assert.equal(overlapLen(["الحمد", "لله", "رب"], ["لِلَّهِ", "ربِّ", "العالمين"]), 2);
  assert.equal(overlapLen(["الحمد", "لله", "رب"], ["العالمين", "الرحمن"]), -1);
  assert.equal(overlapLen(["a"], []), -1);
  assert.equal(overlapLen(["الرحمن", "الرحيم"], ["الرحمن", "الرحيم", "ملك"]), 2);
});
test("pipeline stitches overlapping windows into the exact word sequence, no duplicates, bounded lag", () => {
  const { P, events } = runPipe(truth, 13, decoder(truth));
  assert.deepEqual(P.committed, WORDS);
  const last = events[events.length - 1].t; assert.ok(last < 13 + 2.5, "last word committed " + last);
  // each word's commit lag: stable words are committed within ~3 s of being spoken
  let k = 0; for (const ev of events) for (const _ of ev.words) { const tw = truth[k++]; assert.ok(ev.t - tw.e < 3.4, `word ${tw.w} lag ${(ev.t - tw.e).toFixed(2)}`); }
});
test("pipeline never decodes silence and never commits words invented in silence", () => {
  const { P } = runPipe([], 8, decoder([], { junkInSilence: true }));
  assert.equal(P.jobs, 0); assert.equal(P.committed.length, 0);
  const { P: P2 } = runPipe(truth, 13, decoder(truth, { junkInSilence: true }));
  assert.ok(!P2.committed.includes("جنك"), "junk in a silent stretch must be filtered: " + P2.committed.join(" "));
});
test("pipeline: expected-text constraint drops words that resemble nothing expected, keeps near-misses for the aligner to judge", () => {
  const P = new Pipeline({ margin: 1 }); P.setExpected(["الحمد", "لله", "رب"]);
  P.push(signal(3, [[0.2, 2.8]]));
  const job = P.poll(5000); assert.ok(job);
  const r = P.done(job, [{ w: "الحمد", s: 0.3, e: 0.9 }, { w: "xxjunk", s: 1.0, e: 1.5 }, { w: "لله", s: 1.6, e: 2.1 }], 0.3);
  assert.deepEqual(r.words, ["الحمد"]); // "xxjunk" resembles no expected word: dropped (the word it displaced stays unheard, so the aligner still sees a gap)
  assert.ok(!r.tentative.includes("xxjunk") && r.tentative.includes("لله"));
});
test("pipeline: leading و before the expected word is dropped, volume is normalised", () => {
  const P = new Pipeline({ margin: 0.5 }); P.setExpected(["اياك", "نعبد"]);
  P.push(signal(5, [[0.2, 4.7]], 0.03));
  const job = P.poll(5000); assert.ok(job); assert.ok(job.gain > 5, "quiet input is amplified: " + job.gain);
  let peak = 0; for (const v of job.samples) peak = Math.max(peak, Math.abs(v)); assert.ok(peak > 0.3);
  const r = P.done(job, [{ w: "وَإِيَّاكَ", s: 0.3, e: 1.0 }, { w: "نَعْبُدُ", s: 1.0, e: 1.6 }], 0.3);
  assert.equal(r.words.length >= 1, true); assert.ok(r.words[0].includes("ياك") && !r.words[0].startsWith("و"));
});
test("pipeline: adaptive hop follows decode time and stays within bounds", () => {
  const P = new Pipeline({}); const fake = { id: 1, start: 0, end: 3, samples: new Float32Array(10), endpoint: false, gain: 1 };
  P.push(signal(3, [[0, 3]])); const j = P.poll(0); assert.ok(j); P.done(j, [], 0.1); assert.ok(P.hop >= 0.8 && P.hop <= 1.0 + 1e-9);
  for (let i = 0; i < 6; i++) { P.push(signal(2, [[0, 2]])); const jj = P.poll((i + 1) * 100000); if (jj) P.done(jj, [], 4); }
  assert.equal(P.hop, 3); void fake;
});
test("pipeline: endpoint flush commits everything after the reciter stops", () => {
  const { P, events } = runPipe(truth.slice(0, 4), 6, decoder(truth), {});
  assert.deepEqual(P.committed, WORDS.slice(0, 4)); assert.ok(events[events.length - 1].t < 6 + 1.5);
});

// ---------- engine + lifecycle with a fake worker and a fake microphone
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
function world({ loadFail = false, never = false, onRun = null, runDelay = 0 } = {}) {
  const w = { workers: [], terminated: 0, mics: 0, micClosed: 0, results: [], errors: [], tick: null, nowV: 0, push: null, ran: 0 };
  const spawn = () => {
    const fw = { onmessage: null, onerror: null, dead: false, postMessage(m) {
      if (m.t === "load") { if (never) return; setTimeout(() => { if (fw.dead) return; fw.onmessage?.({ data: loadFail ? { t: "error", msg: "no model" } : { t: "ready", ms: 5, threads: 1, backend: "wasm" } }); }, 0); }
      if (m.t === "run") { w.ran++; const hyp = onRun ? onRun(m) : []; setTimeout(() => { if (fw.dead && !w.lateOk) return; fw.onmessage?.({ data: { t: "result", id: m.id, words: hyp, sec: 0.2 } }); }, runDelay); }
    }, terminate() { fw.dead = true; w.terminated++; } };
    w.workers.push(fw); return fw;
  };
  const openMic = async (cb) => { w.mics++; w.push = cb; return { close() { w.micClosed++; w.push = null; } }; };
  const every = (fn) => { w.tick = fn; return 1; };
  const clear = () => { w.tick = null; };
  const mk = () => createPreciseEngine({ spawn, openMic, every, clear, now: () => w.nowV, loadTimeoutMs: 200, jobTimeoutMs: 1000 });
  const core = createCore(mk, { async open() {}, close() {} }, { onResult: (a, f) => w.results.push([a[0][0].transcript, f]), onNewSession: () => {}, onError: (m) => w.errors.push(m), onEnd: () => {} });
  const feed = (sec, spans) => { const x = signal(sec, spans); for (let i = 0; i < x.length; i += 1600) w.push?.(x.slice(i, i + 1600)); };
  return { w, core, feed };
}
test("engine: audio -> windows -> committed words reach the handlers; stop terminates the worker and closes the mic", async () => {
  const { w, core, feed } = world({ onRun: () => [{ w: "الحمد", s: 0.2, e: 0.8 }, { w: "لله", s: 0.9, e: 1.4 }] });
  await core.start(); assert.equal(core.state, "listening"); assert.equal(w.mics, 1);
  feed(4, [[0.1, 3.9]]); w.nowV = 5000; w.tick(); await tick(5); w.nowV = 7000; w.tick(); await tick(5);
  assert.ok(w.ran >= 1); assert.ok(w.results.length >= 1); assert.match(w.results[0][0], /الحمد/);
  assert.ok(pdiag.windows >= 1 && pdiag.rtf > 0);
  await core.stop(); assert.equal(core.state, "idle"); assert.equal(w.terminated, 1); assert.equal(w.micClosed, 1); assert.equal(w.tick, null);
});
test("engine: results that arrive after stop are ignored and nothing keeps running", async () => {
  const { w, core, feed } = world({ runDelay: 30, onRun: () => [{ w: "الحمد", s: 0.2, e: 0.8 }, { w: "لله", s: 0.9, e: 3.0 }] });
  w.lateOk = true;
  await core.start(); feed(4, [[0.1, 3.9]]); w.nowV = 5000; w.tick();
  await core.stop(); await tick(80);
  assert.equal(w.results.length, 0); assert.equal(w.terminated, 1); assert.equal(w.micClosed, 1);
});
test("engine: rapid start/stop x30 leaves no worker, mic or timer behind", async () => {
  const { w, core } = world();
  for (let i = 0; i < 30; i++) { const p = core.start(); if (i % 3 === 0) await tick(1); await core.stop(); await p.catch(() => {}); }
  await core.stop(); await tick(20);
  assert.equal(core.state, "idle"); assert.equal(w.terminated, w.workers.length); assert.equal(w.micClosed, w.mics); assert.equal(w.tick, null);
});
test("engine: model load failure and load timeout are reported (fallback hook) and clean up", async () => {
  let a = world({ loadFail: true }); await a.core.start(); assert.equal(a.core.state, "idle"); assert.match(a.w.errors[0], /no model/); assert.equal(a.w.terminated, 1);
  a = world({ never: true }); await a.core.start(); assert.equal(a.core.state, "idle"); assert.match(a.w.errors[0], /timeout/); assert.equal(a.w.terminated, 1);
});
test("engine: a worker error while listening stops everything and reports", async () => {
  const { w, core } = world();
  await core.start(); w.workers[0].onerror({}); await tick(5);
  assert.equal(core.state, "idle"); assert.equal(w.errors.length, 1); assert.equal(w.terminated, 1); assert.equal(w.micClosed, 1);
});
test("engine: a decode that never returns times out instead of hanging", async () => {
  const { w, core, feed } = world({ runDelay: 100000 });
  await core.start(); feed(4, [[0.1, 3.9]]); w.nowV = 5000; w.tick(); assert.equal(w.ran, 1); w.nowV = 9000; w.tick(); await tick(5);
  assert.equal(core.state, "idle"); assert.match(w.errors[0], /timed out/); assert.equal(w.terminated, 1);
});

test("pipeline: a text-only model (no word times) still commits words, placed on the voiced parts", () => {
  const P = new Pipeline({ margin: 0.5 }); P.setExpected(["الحمد", "لله", "رب", "العالمين"]);
  P.push(signal(8, [[0.3, 2.3], [4.0, 6.0]]));
  const job = P.poll(5000); assert.ok(job);
  const r = P.done(job, ["الحمد", "لله", "رب", "العالمين"].map((w) => ({ w, s: -1, e: -1 })), 0.3);
  assert.deepEqual(r.words.slice(0, 2), ["الحمد", "لله"]); // the first words sit in the first run; none lands in the 2 s pause
  assert.ok(P.committedUntil > 0.3 && P.committedUntil < 4.0 + 2.1);
});

test("engine: a device that decodes slower than real time gives up (fallback hook) instead of lagging forever", async () => {
  const w = world({ onRun: () => [{ w: "الحمد", s: 0.2, e: 0.8 }] });
  // fake worker answers with a decode time of 6 s per 5 s window
  const orig = w.w.workers; void orig;
  const { core, feed, w: ww } = world({});
  const spawnOrig = ww.workers; void spawnOrig;
  await core.start();
  const fw = ww.workers[0]; const post = fw.postMessage.bind(fw);
  fw.postMessage = (m) => { if (m.t === "run") setTimeout(() => fw.onmessage?.({ data: { t: "result", id: m.id, words: [], sec: 6 } }), 0); else post(m); };
  for (let i = 0; i < 4 && core.state !== "idle"; i++) { feed(5.2, [[0.1, 5.1]]); ww.nowV += 10000; ww.tick?.(); await tick(5); }
  assert.equal(core.state, "idle"); assert.match(ww.errors[0], /too slow/); assert.equal(ww.terminated, 1);
});

test("pipeline: a look-alike wrong word is NOT snapped to the expected word (the aligner must still see it)", () => {
  const P = new Pipeline({ margin: 0.5 }); P.setExpected(["الحمد", "لله", "رب", "العالمين"]);
  P.push(signal(5, [[0.2, 4.7]]));
  const job = P.poll(5000); assert.ok(job);
  const r = P.done(job, [{ w: "الحمد", s: 0.3, e: 0.9 }, { w: "لغه", s: 1.0, e: 1.6 }, { w: "رب", s: 1.7, e: 2.2 }], 0.3);
  assert.ok(r.words.includes("لغه"), "wrong letter kept as heard: " + r.words.join(" "));
});

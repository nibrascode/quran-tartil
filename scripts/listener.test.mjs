import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "lc-"));
execFileSync("npx", ["tsc", "src/listenerCore.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler", "--skipLibCheck"], { stdio: "ignore", timeout: 60000 });
writeFileSync(join(dir, "package.json"), '{"type":"module"}');
writeFileSync(join(dir, "listenerCore.js"), readFileSync(join(dir, "listenerCore.js"), "utf8").replace('"./asr"', '"./asr.js"'));
execFileSync("npx", ["tsc", "src/asr.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler", "--skipLibCheck"], { stdio: "ignore", timeout: 60000 });
writeFileSync(join(dir, "asr.js"), readFileSync(join(dir, "asr.js"), "utf8").replace('"./tartil"', '"./tartil.js"'));
execFileSync("npx", ["tsc", "src/tartil.ts", "--outDir", dir, "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler", "--skipLibCheck"], { stdio: "ignore", timeout: 60000 });
const { createCore } = await import(join(dir, "listenerCore.js"));

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
/** fake recogniser world: counts live engines, mic streams, handlers */
function world({ startDelay = 0, openDelay = 0 } = {}) {
  const w = { live: 0, started: 0, aborted: 0, micOpen: 0, h: null, results: [], ends: 0, errors: [], newSessions: 0, states: [] };
  const mk = () => { let on = false; return {
    async start(h) { w.started++; if (startDelay) await tick(startDelay); on = true; w.live++; w.h = h; w.cur = h; },
    async abort() { if (on) { on = false; w.live--; } w.aborted++; },
  }; };
  const res = { async open() { if (openDelay) await tick(openDelay); w.micOpen++; }, close() { w.micOpen = 0; } };
  const core = createCore(mk, res, { onResult: (a, f) => w.results.push([a[0][0].transcript, f]), onNewSession: () => w.newSessions++, onError: (m) => w.errors.push(m), onEnd: () => w.ends++, onState: (s) => w.states.push(s) });
  return { w, core };
}
const A = (t) => [[{ transcript: t }]];

test("start -> listening, results flow; stop -> idle, engine aborted, mic closed", async () => {
  const { w, core } = world();
  await core.start(); assert.equal(core.state, "listening"); assert.equal(w.live, 1); assert.equal(w.micOpen, 1);
  w.h.result(A("a"), false); assert.equal(w.results.length, 1);
  await core.stop(); assert.equal(core.state, "idle"); assert.equal(w.live, 0); assert.equal(w.micOpen, 0);
});
test("late results and late end events after stop are ignored and never restart", async () => {
  const { w, core } = world();
  await core.start(); const h = w.h; await core.stop();
  h.result(A("late"), true); h.end(); await tick(50);
  assert.equal(w.results.length, 0); assert.equal(w.started, 1); assert.equal(w.live, 0); assert.equal(core.state, "idle");
});
test("auto-restart is gapless, creates exactly one engine at a time, and stop cancels a pending restart timer", async () => {
  const { w, core } = world();
  await core.start(); w.h.end(); // silence: engine ended by itself
  await tick(250); assert.equal(w.started, 2); assert.equal(w.newSessions, 1);
  const before = w.started; w.h.end(); await core.stop(); await tick(80);
  assert.equal(w.started, before); assert.equal(core.state, "idle");
});
test("stop while the engine is still starting: the engine is aborted as soon as it is up", async () => {
  const { w, core } = world({ startDelay: 40 });
  const p = core.start(); await tick(5); await core.stop(); await p; await tick(80);
  assert.equal(w.live, 0); assert.equal(core.state, "idle"); assert.equal(w.results.length, 0);
});
test("stop while mic permission/stream is still opening: nothing is left running, stream closed", async () => {
  const { w, core } = world({ openDelay: 40 });
  const p = core.start(); await tick(5); await core.stop(); await p; await tick(80);
  assert.equal(w.started, 0); assert.equal(w.micOpen, 0); assert.equal(core.state, "idle");
});
test("rapid start/stop/start/stop x50 ends idle with nothing live", async () => {
  const { w, core } = world({ startDelay: 2, openDelay: 1 });
  for (let i = 0; i < 50; i++) { const p = core.start(); if (i % 3) await tick(i % 4); const q = core.stop(); await Promise.all([p, q]); }
  await core.stop(); await tick(60);
  assert.equal(core.state, "idle"); assert.equal(w.live, 0); assert.equal(w.micOpen, 0);
});
test("start twice never creates two recognisers", async () => {
  const { w, core } = world({ startDelay: 10 });
  await Promise.all([core.start(), core.start(), core.start()]);
  assert.equal(w.started, 1); await core.stop(); assert.equal(w.live, 0);
});
test("start after stop works again (clean restart)", async () => {
  const { w, core } = world();
  await core.start(); await core.stop(); await core.start();
  assert.equal(core.state, "listening"); assert.equal(w.live, 1); w.h.result(A("x"), true); assert.equal(w.results.length, 1); await core.stop();
});
test("fatal error stops everything and reports once; endless instant failures give up (no infinite loop)", async () => {
  const a = world(); await a.core.start(); a.w.h.error("not-allowed", true); await tick(20);
  assert.deepEqual(a.w.errors, ["not-allowed"]); assert.equal(a.core.state, "idle"); assert.equal(a.w.micOpen, 0);
  const b = world(); await b.core.start();
  for (let i = 0; i < 30 && b.core.state !== "idle"; i++) { b.w.h.end(); await tick(150); }
  assert.equal(b.core.state, "idle"); assert.equal(b.w.ends, 1); assert.ok(b.w.started <= 8);
});
test("engine start failure is reported and leaves a clean idle state", async () => {
  const w = { errors: [], closed: 0 };
  const core = createCore(() => ({ async start() { throw new Error("boom"); }, async abort() {} }), { async open() {}, close() { w.closed++; } }, { onResult() {}, onNewSession() {}, onError: (m) => w.errors.push(m), onEnd() {} });
  await core.start(); assert.deepEqual(w.errors, ["boom"]); assert.equal(core.state, "idle"); assert.ok(w.closed >= 1);
});

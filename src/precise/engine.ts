import type { Engine, EngineHandlers } from "../listenerCore";
import { Pipeline, type Opts, type TWord } from "./pipeline";
import type { FromWorker, WorkerLike } from "./protocol";

/** Live numbers for the diagnostics panel. */
export type PDiag = { on: boolean; backend: string; threads: number; loadMs: number; windows: number; lastMs: number; avgMs: number; rtf: number; hopMs: number; lagMs: number; words: number; dropped: number; error: string; fellBack: boolean };
export const pdiag: PDiag = { on: false, backend: "–", threads: 0, loadMs: 0, windows: 0, lastMs: 0, avgMs: 0, rtf: 0, hopMs: 0, lagMs: 0, words: 0, dropped: 0, error: "", fellBack: false };
export const pdiagReset = () => Object.assign(pdiag, { on: false, windows: 0, lastMs: 0, avgMs: 0, rtf: 0, hopMs: 0, lagMs: 0, words: 0, dropped: 0, error: "", fellBack: false });

export type PreciseDeps = {
  spawn(): WorkerLike;
  openMic(onChunk: (x: Float32Array) => void): Promise<{ close(): void }>;
  ortBase?: string;
  appBase?: string;
  now?: () => number;
  every?: (fn: () => void, ms: number) => unknown;
  clear?: (t: unknown) => void;
  opts?: Partial<Opts>;
  expected?: () => string[];
  loadTimeoutMs?: number;
  jobTimeoutMs?: number;
};

/**
 * Near-live recogniser engine for listenerCore: microphone -> Pipeline (VAD, sliding windows, stitching) -> Whisper worker.
 * Emits the cumulative COMMITTED words (the stable prefix) like any other engine; the unchanged ReciteSession does the rest.
 * abort() is final: timers stop, the microphone closes and the worker is TERMINATED (no inference keeps running).
 */
export function createPreciseEngine(d: PreciseDeps): Engine {
  const now = d.now ?? (() => performance.now());
  const every = d.every ?? ((fn: () => void, ms: number) => setInterval(fn, ms));
  const clear = d.clear ?? ((t: unknown) => clearInterval(t as ReturnType<typeof setInterval>));
  let w: WorkerLike | null = null, mic: { close(): void } | null = null, timer: unknown = null, dead = false;
  let P: Pipeline | null = null, h: EngineHandlers | null = null;
  let inflight: { id: number; job: ReturnType<Pipeline["poll"]>; at: number } | null = null;
  let sumInfer = 0, sumAudio = 0;
  const kill = () => {
    dead = true; if (timer != null) clear(timer); timer = null;
    try { mic?.close(); } catch { /* ignore */ } mic = null;
    try { w?.terminate(); } catch { /* ignore */ } w = null; inflight = null; pdiag.on = false;
  };
  const fail = (msg: string) => { if (dead) return; pdiag.error = msg; const hh = h; kill(); hh?.error(msg, true); };

  const onResult = (m: Extract<FromWorker, { t: "result" }>) => {
    if (dead || !inflight || inflight.id !== m.id || !P) return;
    const job = inflight.job!; inflight = null;
    const r = P.done(job, m.words as TWord[], m.sec);
    const dur = job.end - job.start;
    sumInfer += m.sec; sumAudio += dur;
    pdiag.windows++; pdiag.lastMs = Math.round(m.sec * 1000); pdiag.avgMs = Math.round((pdiag.avgMs * (pdiag.windows - 1) + m.sec * 1000) / pdiag.windows);
    pdiag.rtf = +(sumInfer / Math.max(0.001, sumAudio)).toFixed(2); pdiag.hopMs = Math.round(P.hop * 1000); pdiag.dropped = P.dropped;
    if (r.words.length) {
      pdiag.words = P.committed.length;
      pdiag.lagMs = Math.max(0, Math.round((P.seconds - P.committedUntil) * 1000));
      h?.result([[{ transcript: P.text }]], job.endpoint);
    }
  };

  return {
    async start(handlers: EngineHandlers) {
      h = handlers; dead = false; pdiagReset(); P = new Pipeline(d.opts);
      const worker = d.spawn(); w = worker;
      const loaded = new Promise<void>((res, rej) => {
        const to = setTimeout(() => rej(new Error("model load timeout")), d.loadTimeoutMs ?? 90000);
        worker.onerror = () => { clearTimeout(to); rej(new Error("worker error")); };
        worker.onmessage = (e) => {
          const m = e.data;
          if (m.t === "ready") { clearTimeout(to); pdiag.backend = m.backend; pdiag.threads = m.threads; pdiag.loadMs = m.ms; res(); }
          else if (m.t === "error") { if (m.id != null) { fail(m.msg); } else { clearTimeout(to); rej(new Error(m.msg)); } }
          else if (m.t === "result") onResult(m);
        };
      });
      worker.postMessage({ t: "load", ort: d.ortBase ?? "", app: d.appBase ?? "" });
      try { await loaded; } catch (e) { kill(); throw e; }
      if (dead) return;
      worker.onerror = () => fail("worker error");
      try { mic = await d.openMic((x) => { if (!dead) P!.push(x); }); } catch (e) { kill(); throw e; }
      if (dead) { try { mic?.close(); } catch { /* ignore */ } return; }
      pdiag.on = true;
      timer = every(() => {
        if (dead || !P || !w) return;
        const t = now();
        if (inflight && t - inflight.at > (d.jobTimeoutMs ?? 30000)) { fail("recognition timed out"); return; }
        if (inflight) return;
        if (d.expected) P.setExpected(d.expected());
        const job = P.poll(t);
        if (job) { inflight = { id: job.id, job, at: t }; w.postMessage({ t: "run", id: job.id, audio: job.samples }, [job.samples.buffer]); }
      }, 100);
    },
    async abort() { kill(); },
  };
}

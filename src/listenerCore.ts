import { nextRestart, type Alt } from "./asr";

/**
 * Single source of truth for the microphone/recogniser lifecycle: idle -> starting -> listening -> stopping -> idle.
 * Every async continuation carries a generation number; stop() bumps it FIRST, so anything still in flight (engine start,
 * mic permission, restart timer, late results, late `end` events) is ignored and cleaned up. Pure (no DOM), see scripts/listener.test.mjs.
 */
export type ListenState = "idle" | "starting" | "listening" | "stopping";
export type EngineHandlers = { result(alts: Alt[][], final: boolean): void; end(): void; error(msg: string, fatal: boolean): void };
export type Engine = { start(h: EngineHandlers): Promise<void>; abort(): Promise<void> };
export type Resource = { open(): Promise<void>; close(): void };
export type CoreCbs = {
  onResult: (alts: Alt[][], final: boolean) => void; onNewSession: () => void; onError: (msg: string) => void; onEnd: () => void; onState?: (s: ListenState) => void;
};
export type CoreOpts = { maxFast?: number };
export type Clock = { now(): number; set(fn: () => void, ms: number): unknown; clear(t: unknown): void };
const realClock: Clock = { now: () => Date.now(), set: (f, ms) => setTimeout(f, ms), clear: (t) => clearTimeout(t as ReturnType<typeof setTimeout>) };

export function createCore(mk: () => Engine, res: Resource, cbs: CoreCbs, clock: Clock = realClock, opts: CoreOpts = {}) {
  let state: ListenState = "idle", gen = 0, eng: Engine | null = null, timer: unknown = null, fastFails = 0, startedAt = 0, stopping: Promise<void> | null = null;
  const set = (s: ListenState) => { state = s; cbs.onState?.(s); };
  const active = (g: number) => g === gen && (state === "starting" || state === "listening");

  async function launch(g: number) {
    const e = mk(); eng = e; startedAt = clock.now();
    const live = () => active(g) && eng === e;
    try {
      await e.start({
        result: (alts, fin) => { if (live()) cbs.onResult(alts, fin); },
        end: () => {
          if (!live()) return;
          const f = nextRestart(fastFails, clock.now() - startedAt, opts.maxFast ?? 6); fastFails = f.fastFails;
          eng = null;
          if (f.giveUp) { void halt().then(() => { cbs.onEnd(); cbs.onError("no-audio"); }); return; } // never stop silently: the user is told the recogniser keeps failing
          cbs.onNewSession();
          timer = clock.set(() => { timer = null; if (active(g)) void launch(g); }, fastFails ? Math.min(600, 120 * fastFails) : 0);
        },
        error: (msg, fatal) => { if (!live()) return; if (fatal) { void halt().then(() => cbs.onError(msg)); } },
      });
    } catch (err) {
      if (active(g)) { await halt(); cbs.onError(String((err as Error)?.message || err)); } else await e.abort().catch(() => {});
      return;
    }
    if (!active(g) || eng !== e) { await e.abort().catch(() => {}); return; } // stopped while the engine was starting
    if (state === "starting") set("listening");
  }

  async function halt(): Promise<void> {
    if (stopping) return stopping;
    gen++; // FIRST: invalidates every in-flight continuation, late result and restart timer
    if (state === "idle") { res.close(); return; }
    set("stopping");
    if (timer != null) { clock.clear(timer); timer = null; }
    const e = eng; eng = null;
    stopping = (async () => {
      try { await e?.abort(); } catch { /* ignore */ }
      res.close();
      set("idle");
    })().finally(() => { stopping = null; });
    return stopping;
  }

  return {
    get state() { return state; },
    async start() {
      if (stopping) await stopping;
      if (state !== "idle") return; // already starting/listening: never run two recognisers
      set("starting"); fastFails = 0;
      const g = ++gen;
      try { await res.open(); } catch { /* mic stream is optional */ }
      if (!active(g)) { res.close(); return; } // stop() came first
      await launch(g);
    },
    stop: halt,
  };
}

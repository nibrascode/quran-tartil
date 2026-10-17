import { Capacitor } from "@capacitor/core";
import { pickAlternative, diag, diagReset, diagResult, type Alt } from "./asr";
import { createCore, type Engine, type EngineHandlers } from "./listenerCore";
import { choosePrecise, spawnWorker } from "./precise/model";
import { createPreciseEngine, pdiag, pdiagReset } from "./precise/engine";
import { openMic } from "./precise/capture";

export type Listener = { start(): Promise<void>; stop(): Promise<void> };
type Cbs = { lang: string; expected?: () => string[]; onWords: (words: string[], isFinal?: boolean) => void; onNewSession: () => void; onError: (msg: string) => void; onEnd: () => void; onNotice?: (msg: string) => void };
type WebRec = { start(): void; stop(): void; abort(): void; onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null; lang: string; continuous: boolean; interimResults: boolean };
const webCtor = (): (new () => WebRec) | null => (typeof window === "undefined" ? null : ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null));
export const speechSupported = () => Capacitor.isNativePlatform() || !!webCtor() || choosePrecise();

/** Continuous listener: browsers use the Web Speech API (auto-restarts after silence), the Android app uses the Capacitor speech plugin.
 *  The lifecycle (start/stop/restart/late events) lives in listenerCore.ts; this file only provides the two engines and the mic stream. */
export function createListener(c: Cbs): Listener {
  const native = Capacitor.isNativePlatform();
  const pick = (alts: Alt[]) => { const r = pickAlternative(alts, c.expected?.() ?? []); return { ...r, swapped: r.index !== 0 }; };
  const split = (s: string) => s.split(/\s+/).filter(Boolean);
  let mic: MediaStream | null = null;

  const webEngine = (): Engine => {
    let r: WebRec | null = null;
    const silence = () => { if (r) { r.onresult = null; r.onerror = null; r.onend = null; } };
    return {
      async start(h: EngineHandlers) {
        const C = webCtor();
        if (!C) throw new Error("unsupported");
        r = new C();
        r.lang = c.lang; r.continuous = true; r.interimResults = true; (r as any).maxAlternatives = 5;
        r.onresult = (e: any) => {
          const segs: Alt[][] = [];
          for (let i = 0; i < e.results.length; i++) { const res = e.results[i], alts: Alt[] = []; for (let j = 0; j < res.length; j++) alts.push({ transcript: res[j].transcript, confidence: res[j].confidence }); segs.push(alts); }
          h.result(segs, !!e.results[e.results.length - 1]?.isFinal);
        };
        r.onerror = (e: any) => { if (e.error === "no-speech" || e.error === "aborted") return; diag.error = String(e.error || "error"); h.error(String(e.error || "error"), true); };
        r.onend = () => h.end();
        r.start();
      },
      async abort() { silence(); try { r?.abort(); } catch { /* ignore */ } r = null; },
    };
  };
  const nativeEngine = (): Engine => ({
    async start(h: EngineHandlers) {
      const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
      const av = await SpeechRecognition.available();
      if (!av.available) throw new Error("unsupported");
      const perm = await SpeechRecognition.requestPermissions();
      if (perm.speechRecognition !== "granted") throw new Error("permission");
      await SpeechRecognition.removeAllListeners();
      await SpeechRecognition.addListener("partialResults", (d: { matches?: string[] }) => { if (d.matches?.length) h.result([d.matches.map((m) => ({ transcript: m }))], false); });
      await SpeechRecognition.addListener("listeningState", (d: { status: string }) => { if (d.status === "stopped") h.end(); });
      try { await SpeechRecognition.start({ language: c.lang, partialResults: true, popup: false, maxResults: 5 }); }
      catch (e) { if (!/ongoing|already|busy/i.test(String((e as Error)?.message || e))) throw e; } // a stale 'stopped' of the previous session can race the restart: the recogniser is already running
    },
    async abort() {
      try { const { SpeechRecognition } = await import("@capacitor-community/speech-recognition"); await SpeechRecognition.removeAllListeners(); await SpeechRecognition.stop(); } catch { /* ignore */ }
    },
  });
  /** hold a processed mic stream (noise suppression, echo cancellation, auto gain) next to the recogniser (browser only) */
  const micRes = {
    async open() {
      if (native || !navigator.mediaDevices?.getUserMedia) return;
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }).catch(() => null);
    },
    close() { mic?.getTracks().forEach((t) => t.stop()); mic = null; },
  };
  const core = createCore(native ? nativeEngine : webEngine, micRes, {
    onResult: (segs, fin) => {
      let s = "", conf: number | undefined, swapped = false;
      segs.forEach((alts, i) => { const p = pick(alts); s += " " + p.alt.transcript; if (p.swapped) swapped = true; if (i === segs.length - 1) conf = p.alt.confidence; });
      diagResult(s.trim(), conf, fin, swapped);
      c.onWords(split(s), fin);
    },
    onNewSession: () => { diag.restarts++; c.onNewSession(); },
    onError: (m) => { diag.error = m; c.onError(m); },
    onEnd: c.onEnd,
  }, undefined, { maxFast: native ? 40 : 6 }); // the Android recogniser reports 'stopped' for every session end (even stale ones): never give up quickly, and never silently
  // ---- Precise engine (on-device Quran Whisper). Falls back to the platform recogniser on any failure.
  let userStopped = false, usingPlatform = false;
  const precise = choosePrecise() ? createCore(
    () => createPreciseEngine({ spawn: spawnWorker, openMic: (cb) => openMic(cb), ortBase: new URL("ort/", document.baseURI).href, appBase: document.baseURI, expected: () => c.expected?.() ?? [] }),
    { async open() { /* the engine owns its microphone */ }, close() { /* closed by the engine */ } },
    {
      onResult: (segs, fin) => { const s = segs.map((a) => a[0]?.transcript ?? "").join(" ").trim(); diagResult(s, undefined, fin, false); c.onWords(split(s), fin); },
      onNewSession: () => {},
      onError: (m) => {
        diag.error = m; pdiag.error = m; pdiag.fellBack = true;
        if (userStopped) return;
        usingPlatform = true; diag.engine = (native ? "Android SpeechRecognizer (plugin)" : "Web Speech API") + " (fallback)"; c.onNewSession(); c.onNotice?.("precise-fallback");
        void core.start().catch((e) => c.onError(String((e as Error)?.message || e)));
      },
      onEnd: c.onEnd,
    },
  ) : null;
  return {
    async start() {
      userStopped = false; usingPlatform = false;
      if (precise) {
        diagReset("Precise (Whisper base Quran, on-device)", "ar"); diag.supported = true; pdiagReset();
        await precise.start();
        return;
      }
      diagReset(native ? "Android SpeechRecognizer (plugin)" : "Web Speech API", c.lang);
      diag.supported = native || !!webCtor();
      await core.start();
    },
    async stop() {
      userStopped = true; // first: a failing engine must not start the fallback while we are stopping
      await Promise.all([precise?.stop(), usingPlatform || !precise ? core.stop() : core.stop()]);
    },
  };
}

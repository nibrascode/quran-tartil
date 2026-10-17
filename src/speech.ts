import { Capacitor } from "@capacitor/core";
import { pickAlternative, diag, diagReset, diagResult, type Alt } from "./asr";
import { createCore, type Engine, type EngineHandlers } from "./listenerCore";

export type Listener = { start(): Promise<void>; stop(): Promise<void> };
type Cbs = { lang: string; expected?: () => string[]; onWords: (words: string[], isFinal?: boolean) => void; onNewSession: () => void; onError: (msg: string) => void; onEnd: () => void };
type WebRec = { start(): void; stop(): void; abort(): void; onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null; lang: string; continuous: boolean; interimResults: boolean };
const webCtor = (): (new () => WebRec) | null => (typeof window === "undefined" ? null : ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null));
export const speechSupported = () => Capacitor.isNativePlatform() || !!webCtor();

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
      await SpeechRecognition.start({ language: c.lang, partialResults: true, popup: false, maxResults: 5 });
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
  });
  return {
    async start() {
      diagReset(native ? "Android SpeechRecognizer (plugin)" : "Web Speech API", c.lang);
      diag.supported = native || !!webCtor();
      await core.start();
    },
    stop: core.stop,
  };
}

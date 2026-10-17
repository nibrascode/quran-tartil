import { Capacitor } from "@capacitor/core";
import { pickAlternative, diag, diagReset, diagResult, nextRestart, type Alt } from "./asr";

export type Listener = { start(): Promise<void>; stop(): Promise<void> };
type Cbs = { lang: string; expected?: () => string[]; onWords: (words: string[], isFinal?: boolean) => void; onNewSession: () => void; onError: (msg: string) => void; onEnd: () => void };
type WebRec = { start(): void; stop(): void; abort(): void; onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null; lang: string; continuous: boolean; interimResults: boolean };
const webCtor = (): (new () => WebRec) | null => (typeof window === "undefined" ? null : ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null));
export const speechSupported = () => Capacitor.isNativePlatform() || !!webCtor();

/** Continuous listener: browsers use the Web Speech API (auto-restarts after silence), the Android app uses the Capacitor speech plugin. */
export function createListener(c: Cbs): Listener {
  let want = false, rec: WebRec | null = null, restarts = 0, fastFails = 0, startedAt = 0, mic: MediaStream | null = null;
  const pick = (alts: Alt[]) => { const r = pickAlternative(alts, c.expected?.() ?? []); return { ...r, swapped: r.index !== 0 }; };
  const split = (s: string) => s.split(/\s+/).filter(Boolean);

  /** hold a processed mic stream (noise suppression, echo cancellation, auto gain) next to the recogniser: warms up permission and the audio path */
  async function openMic() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    } catch { mic = null; }
  }
  async function startWeb() {
    const C = webCtor();
    if (!C) { c.onError("unsupported"); return; }
    const r = new C();
    r.lang = c.lang; r.continuous = true; r.interimResults = true; (r as any).maxAlternatives = 5;
    r.onresult = (e: any) => {
      let s = "", conf: number | undefined, swapped = false;
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i], alts: Alt[] = [];
        for (let j = 0; j < res.length; j++) alts.push({ transcript: res[j].transcript, confidence: res[j].confidence });
        const p = pick(alts); s += " " + p.alt.transcript; if (p.swapped) swapped = true;
        if (i === e.results.length - 1) conf = p.alt.confidence;
      }
      const fin = !!e.results[e.results.length - 1]?.isFinal;
      diagResult(s.trim(), conf, fin, swapped);
      c.onWords(split(s), fin);
    };
    r.onerror = (e: any) => { if (e.error === "no-speech" || e.error === "aborted") return; want = false; diag.error = String(e.error || "error"); c.onError(String(e.error || "error")); };
    r.onend = () => {
      const f = nextRestart(fastFails, Date.now() - startedAt); fastFails = f.fastFails;
      if (want && !f.giveUp) { restarts++; diag.restarts++; c.onNewSession(); setTimeout(() => { if (want) startWeb(); }, fastFails ? 120 : 0); } // gapless: restart immediately unless it keeps failing
      else { want = false; c.onEnd(); }
    };
    rec = r;
    startedAt = Date.now();
    r.start();
  }
  async function startNative() {
    const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
    const av = await SpeechRecognition.available();
    if (!av.available) { c.onError("unsupported"); return; }
    const perm = await SpeechRecognition.requestPermissions();
    if (perm.speechRecognition !== "granted") { c.onError("permission"); return; }
    await SpeechRecognition.removeAllListeners();
    await SpeechRecognition.addListener("partialResults", (d: { matches?: string[] }) => {
      if (!d.matches?.length) return;
      const p = pick(d.matches.map((m) => ({ transcript: m }))); diagResult(p.alt.transcript, undefined, false, p.swapped); c.onWords(split(p.alt.transcript));
    });
    await SpeechRecognition.addListener("listeningState", async (d: { status: string }) => {
      if (d.status === "stopped" && want) { c.onNewSession(); try { await SpeechRecognition.start({ language: c.lang, partialResults: true, popup: false, maxResults: 5 }); } catch { /* ignore */ } }
    });
    await SpeechRecognition.start({ language: c.lang, partialResults: true, popup: false, maxResults: 5 });
  }
  return {
    async start() {
      want = true; restarts = 0; fastFails = 0;
      diagReset(Capacitor.isNativePlatform() ? "Android SpeechRecognizer (plugin)" : "Web Speech API", c.lang);
      diag.supported = Capacitor.isNativePlatform() || !!webCtor();
      if (!Capacitor.isNativePlatform()) await openMic();
      try { if (Capacitor.isNativePlatform()) await startNative(); else await startWeb(); } catch (e) { want = false; c.onError(String((e as Error).message || e)); } },
    async stop() {
      want = false;
      try { rec?.abort(); } catch { /* ignore */ }
      rec = null;
      mic?.getTracks().forEach((t) => t.stop()); mic = null;
      if (Capacitor.isNativePlatform()) { try { const { SpeechRecognition } = await import("@capacitor-community/speech-recognition"); await SpeechRecognition.stop(); await SpeechRecognition.removeAllListeners(); } catch { /* ignore */ } }
    },
  };
}

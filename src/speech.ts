import { Capacitor } from "@capacitor/core";

export type Listener = { start(): Promise<void>; stop(): Promise<void> };
type Cbs = { lang: string; onWords: (words: string[]) => void; onNewSession: () => void; onError: (msg: string) => void; onEnd: () => void };
type WebRec = { start(): void; stop(): void; abort(): void; onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null; lang: string; continuous: boolean; interimResults: boolean };
const webCtor = (): (new () => WebRec) | null => (typeof window === "undefined" ? null : ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null));
export const speechSupported = () => Capacitor.isNativePlatform() || !!webCtor();

/** Continuous listener: browsers use the Web Speech API (auto-restarts after silence), the Android app uses the Capacitor speech plugin. */
export function createListener(c: Cbs): Listener {
  let want = false, rec: WebRec | null = null, restarts = 0;
  const split = (s: string) => s.split(/\s+/).filter(Boolean);

  async function startWeb() {
    const C = webCtor();
    if (!C) { c.onError("unsupported"); return; }
    const r = new C();
    r.lang = c.lang; r.continuous = true; r.interimResults = true;
    r.onresult = (e: any) => { let s = ""; for (let i = 0; i < e.results.length; i++) s += " " + e.results[i][0].transcript; c.onWords(split(s)); };
    r.onerror = (e: any) => { if (e.error === "no-speech" || e.error === "aborted") return; want = false; c.onError(String(e.error || "error")); };
    r.onend = () => {
      if (want && restarts < 200) { restarts++; c.onNewSession(); setTimeout(() => { if (want) startWeb(); }, 150); } else { want = false; c.onEnd(); }
    };
    rec = r;
    r.start();
  }
  async function startNative() {
    const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
    const av = await SpeechRecognition.available();
    if (!av.available) { c.onError("unsupported"); return; }
    const perm = await SpeechRecognition.requestPermissions();
    if (perm.speechRecognition !== "granted") { c.onError("permission"); return; }
    await SpeechRecognition.removeAllListeners();
    await SpeechRecognition.addListener("partialResults", (d: { matches?: string[] }) => { if (d.matches?.[0]) c.onWords(split(d.matches[0])); });
    await SpeechRecognition.addListener("listeningState", async (d: { status: string }) => {
      if (d.status === "stopped" && want) { c.onNewSession(); try { await SpeechRecognition.start({ language: c.lang, partialResults: true, popup: false, maxResults: 1 }); } catch { /* ignore */ } }
    });
    await SpeechRecognition.start({ language: c.lang, partialResults: true, popup: false, maxResults: 1 });
  }
  return {
    async start() { want = true; restarts = 0; try { if (Capacitor.isNativePlatform()) await startNative(); else await startWeb(); } catch (e) { want = false; c.onError(String((e as Error).message || e)); } },
    async stop() {
      want = false;
      try { rec?.abort(); } catch { /* ignore */ }
      rec = null;
      if (Capacitor.isNativePlatform()) { try { const { SpeechRecognition } = await import("@capacitor-community/speech-recognition"); await SpeechRecognition.stop(); await SpeechRecognition.removeAllListeners(); } catch { /* ignore */ } }
    },
  };
}

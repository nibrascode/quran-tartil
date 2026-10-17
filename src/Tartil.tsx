import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { T, type Lang } from "./i18n";
import { pageItems } from "./quran";
import { align, words, type WordState } from "./tartil";

type Rec = { start(): void; stop(): void; abort(): void; onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null; lang: string; continuous: boolean; interimResults: boolean };

const webCtor = (): (new () => Rec) | null => (typeof window === "undefined" ? null : ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null));
const native = () => Capacitor.isNativePlatform();

/** Experimental: listens to the microphone and marks every word of the chosen ayah as correct / different / skipped. */
export function Tartil({ lang, page }: { lang: Lang; page: number }) {
  const t = T[lang];
  const list = useMemo(() => pageItems(page).filter((x) => x.k === "ayah") as { k: "ayah"; s: number; a: number; text: string }[], [page]);
  const [sel, setSel] = useState(0);
  const [heard, setHeard] = useState<string[]>([]);
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");
  const rec = useRef<Rec | null>(null);
  const supported = native() || !!webCtor();

  useEffect(() => { setSel(0); setHeard([]); }, [page]);
  useEffect(() => () => { stopAll(); }, []);

  const ay = list[Math.min(sel, list.length - 1)];
  const shown = useMemo(() => {
    // show the page's text of the ayah (without the basmala prefix that Tanzil adds to 1st ayahs)
    const w = ay ? ay.text.split(/\s+/).filter(Boolean) : [];
    return w;
  }, [ay]);
  const result = useMemo(() => align(words(shown.join(" ")), heard), [shown, heard]);

  async function stopAll() {
    try { rec.current?.abort(); } catch { /* ignore */ }
    rec.current = null;
    if (native()) {
      try { const { SpeechRecognition } = await import("@capacitor-community/speech-recognition"); await SpeechRecognition.stop(); await SpeechRecognition.removeAllListeners(); } catch { /* ignore */ }
    }
    setOn(false);
  }

  async function start() {
    setErr(""); setHeard([]);
    try {
      if (native()) {
        const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
        const av = await SpeechRecognition.available();
        if (!av.available) { setErr(t.tartilUnsupported); return; }
        const perm = await SpeechRecognition.requestPermissions();
        if (perm.speechRecognition !== "granted") { setErr("microphone permission denied"); return; }
        await SpeechRecognition.addListener("partialResults", (d: { matches?: string[] }) => { if (d.matches?.[0]) setHeard(d.matches[0].split(/\s+/).filter(Boolean)); });
        await SpeechRecognition.start({ language: "ar-SA", partialResults: true, popup: false, maxResults: 1 });
        setOn(true);
        return;
      }
      const C = webCtor();
      if (!C) { setErr(t.tartilUnsupported); return; }
      const r = new C();
      r.lang = "ar-SA"; r.continuous = true; r.interimResults = true;
      r.onresult = (e: any) => {
        let s = "";
        for (let i = 0; i < e.results.length; i++) s += " " + e.results[i][0].transcript;
        setHeard(s.split(/\s+/).filter(Boolean));
      };
      r.onerror = (e: any) => { setErr(String(e.error || "error")); setOn(false); };
      r.onend = () => setOn(false);
      rec.current = r;
      r.start();
      setOn(true);
    } catch (e) { setErr(String((e as Error).message || e)); setOn(false); }
  }

  if (!ay) return <p>—</p>;
  const bad = result.states.filter((s) => s === "bad" || s === "missing").length;
  const cls = (s: WordState, i: number) => "word " + (s === "ok" ? "ok" : s === "bad" || s === "missing" ? "bad" : (i === result.states.findIndex((x) => x === "pending") && on ? "cur" : ""));
  return (
    <div className="tt">
      <p style={{ fontSize: 13, color: "var(--muted)" }}>{t.tartilNote}</p>
      <div className="seg" style={{ alignItems: "center" }}>
        <button className="ib" disabled={sel <= 0} onClick={() => { stopAll(); setSel(sel - 1); setHeard([]); }}>‹</button>
        <span>{t.surah} {ay.s}:{ay.a}</span>
        <button className="ib" disabled={sel >= list.length - 1} onClick={() => { stopAll(); setSel(sel + 1); setHeard([]); }}>›</button>
      </div>
      <div dir="rtl" lang="ar" style={{ fontFamily: "'Amiri Quran', serif", fontSize: 26, lineHeight: 2.2, textAlign: "center" }}>
        {shown.map((w, i) => <span key={i} className={cls(result.states[i], i)}>{w} </span>)}
      </div>
      {supported ? (
        <button className={"ib " + (on ? "" : "primary")} style={{ width: "100%", marginTop: 12 }} onClick={() => (on ? stopAll() : start())}>{on ? "■ " + t.stop + " · " + t.listening : "🎙 " + t.start}</button>
      ) : <p>{t.tartilUnsupported}</p>}
      {err && <p style={{ color: "#e5484d", fontSize: 13 }}>{err}</p>}
      {heard.length > 0 && (
        <p style={{ fontSize: 14 }}>
          {result.done ? "✓ " + t.correct : bad > 0 ? "⚠ " + t.mistakeWarn + ": " + shown.filter((_, i) => result.states[i] === "bad" || result.states[i] === "missing").join(" · ") : ""}
        </p>
      )}
    </div>
  );
}

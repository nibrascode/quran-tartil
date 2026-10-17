import { useEffect, useRef, useState } from "react";
import { T, type Lang } from "./i18n";
import { diag } from "./asr";
import { pdiag } from "./precise/engine";
import { createListener, speechSupported, type Listener } from "./speech";

/** Settings card body: what the speech engine is, which locale, confidence, restarts; plus a live microphone test. */
export function DiagPanel({ lang, locale }: { lang: Lang; locale: string }) {
  const t = T[lang];
  const [, setN] = useState(0);
  const [testing, setTesting] = useState(false);
  const lis = useRef<Listener | null>(null);
  useEffect(() => { const id = setInterval(() => setN((x) => x + 1), 400); return () => { clearInterval(id); lis.current?.stop(); }; }, []);
  const stop = async () => { await lis.current?.stop(); lis.current = null; setTesting(false); };
  const start = async () => {
    setTesting(true);
    lis.current = createListener({ lang: locale, onWords: () => {}, onNewSession: () => {}, onError: () => setTesting(false), onEnd: () => setTesting(false) });
    await lis.current.start();
    setTimeout(() => { if (lis.current) stop(); }, 12000);
  };
  const ok = speechSupported();
  const eng = pdiag.on || (diag.engine.startsWith("Precise") && pdiag.windows > 0);
  const conf = diag.avgConf == null ? t.hDiagNone : Math.round(diag.avgConf * 100) + "% (" + Math.round((diag.lastConf ?? 0) * 100) + "%)";
  const row = (k: string, v: string) => <div className="drow" key={k}><span>{k}</span><b dir="auto">{v}</b></div>;
  return (
    <div className="diag" id="diag-panel">
      <small className="desc">{ok ? t.hDiagD : t.hDiagNo}</small>
      {row(t.hDiagEngine, ok ? (diag.engine !== "–" ? diag.engine : (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.() ? "Android SpeechRecognizer (plugin)" : "Web Speech API")) : t.hDiagNone)}
      {row(t.hDiagLocale, diag.locale !== "–" ? diag.locale : locale)}
      {row(t.hDiagConf, conf)}
      {row(t.hDiagResults, `${diag.results} (${diag.finals})`)}
      {row(t.hDiagRestarts, String(diag.restarts))}
      {row(t.hDiagSwaps, String(diag.altSwaps))}
      {(pdiag.on || pdiag.windows > 0 || pdiag.fellBack) && <>
        {row(t.pdBackend, `${pdiag.backend} · ${pdiag.threads} thr · load ${pdiag.loadMs} ms`)}
        {row(t.pdWindows, String(pdiag.windows))}
        {row(t.pdMs, `${pdiag.lastMs} / ${pdiag.avgMs} ms`)}
        {row(t.pdRtf, String(pdiag.rtf))}
        {row(t.pdHop, `${pdiag.hopMs} ms`)}
        {row(t.pdLag, `${pdiag.lagMs} ms`)}
        {row(t.pdWords, String(pdiag.words))}
        {row(t.pdFell, pdiag.fellBack ? t.pdYes : t.pdNo)}
      </>}
      {row(t.hDiagMic, typeof navigator !== "undefined" && !!navigator.mediaDevices ? t.hDiagOn : t.hDiagOff)}
      {row(t.hDiagHeard, diag.lastText || t.hDiagNone)}
      {diag.error && <small className="desc" role="alert">⚠ {diag.error}</small>}
      {ok && <button className="ib" id="diag-test" onClick={testing ? stop : start}>{testing ? t.hDiagStop : t.hDiagTest}</button>}
    </div>
  );
}

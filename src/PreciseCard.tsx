import { useEffect, useRef, useState } from "react";
import { T, type Lang } from "./i18n";
import { MODEL, deleteModel, downloadModel, getEngineMode, modelMB, modelReady, preciseCapable, setEngineMode, type Download, type EngineMode } from "./precise/model";

/** Settings card body: engine choice (Auto / Platform / Precise) and the one-time model download (consent, progress, cancel, delete). */
export function PreciseCard({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [mode, setMode] = useState<EngineMode>(getEngineMode());
  const [ready, setReady] = useState(modelReady());
  const [pct, setPct] = useState<{ l: number; t: number } | null>(null);
  const [msg, setMsg] = useState("");
  const dl = useRef<Download | null>(null);
  const ok = preciseCapable();
  useEffect(() => () => { dl.current?.cancel(); }, []);
  const pick = (m: EngineMode) => { setEngineMode(m); setMode(m); };
  const start = async () => {
    setMsg(""); setPct({ l: 0, t: MODEL.bytes });
    const d = downloadModel((l, tt) => setPct({ l, t: tt })); dl.current = d;
    try { await d.done; setReady(true); setMsg(""); } catch (e) { const m = String((e as Error).message || e); setMsg(m === "cancelled" ? t.pCancelled : t.pFailed.replace("{e}", m)); }
    dl.current = null; setPct(null);
  };
  const del = async () => { await deleteModel(); setReady(false); };
  const mb = (n: number) => String(Math.round(n / 1e6));
  const opts: { v: EngineMode; l: string }[] = [{ v: "auto", l: t.pEngAuto }, { v: "platform", l: t.pEngPlat }, { v: "precise", l: t.pEngPrec }];
  return (
    <div className="pcard" id="precise-card">
      <div className="segc" role="radiogroup" aria-label={t.pEngT} style={{ ["--n" as string]: 3, ["--i" as string]: opts.findIndex((o) => o.v === mode) }}>
        <span className="thumb" aria-hidden="true" />
        {opts.map((o) => <button key={o.v} id={"eng-" + o.v} role="radio" aria-checked={mode === o.v} className="so" onClick={() => pick(o.v)}>{o.l}</button>)}
      </div>
      <small className="desc">{t.pEngD}</small>
      <b className="sub">{t.pModelT} · {ready ? t.pInstalled : t.pNotInstalled}</b>
      <small className="desc">{t.pModelD.replace("{mb}", String(modelMB()))}</small>
      {!ok && <small className="desc" role="alert">{t.pUnsupported}</small>}
      {pct && <div className="pbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((100 * pct.l) / pct.t)}><i style={{ width: Math.min(100, (100 * pct.l) / pct.t) + "%" }} /><small>{t.pProgress.replace("{done}", mb(pct.l)).replace("{total}", mb(pct.t))}</small></div>}
      {msg && <small className="desc" role="alert">⚠ {msg}</small>}
      <div className="stack">
        {!ready && !pct && ok && <button className="ib" id="precise-dl" onClick={start}>{t.pDownload.replace("{mb}", String(modelMB()))}</button>}
        {pct && <button className="ib" id="precise-cancel" onClick={() => dl.current?.cancel()}>{t.pCancel}</button>}
        {ready && !pct && <button className="ib" id="precise-del" onClick={del}>{t.pDelete}</button>}
      </div>
      <small className="desc">{t.pBattery}</small>
    </div>
  );
}

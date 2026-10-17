import { Ic } from "./Icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { createListener, speechSupported, type Listener } from "./speech";
import { T, type Lang } from "./i18n";
import type { Prefs } from "./store";
import { pageItems, pageOfAyah } from "./quran";
import { align, words, LEVELS, type WordState } from "./tartil";

/** Experimental: listens to the microphone and marks every word of the chosen ayah as correct / different / skipped. */
type Row = { score: number; wrong: string[] };
const session = new Map<string, Row>(); // survives tab switches while the app is open
export const recordSession = (key: string, row: Row) => { session.set(key, row); };

export function Tartil({ lang, page, focus, prefs }: { lang: Lang; page: number; focus?: { s: number; a: number } | null; prefs: Prefs }) {
  const t = T[lang];
  const list = useMemo(() => pageItems(page).filter((x) => x.k === "ayah") as { k: "ayah"; s: number; a: number; text: string }[], [page]);
  const [sel, setSel] = useState(0);
  const [heard, setHeard] = useState<string[]>([]);
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");
  const rec = useRef<Listener | null>(null);
  const supported = speechSupported();

  useEffect(() => {
    const k = focus ? list.findIndex((x) => x.s === focus.s && x.a === focus.a) : -1;
    setSel(k >= 0 ? k : 0); setHeard([]);
  }, [page, focus]);
  useEffect(() => () => { stopAll(); }, []);

  const ay = list[Math.min(sel, list.length - 1)];
  const shown = useMemo(() => {
    // show the page's text of the ayah (without the basmala prefix that Tanzil adds to 1st ayahs)
    const w = ay ? ay.text.split(/\s+/).filter(Boolean) : [];
    return w;
  }, [ay]);
  const result = useMemo(() => align(words(shown.join(" ")), heard, LEVELS[prefs.strict]), [shown, heard, prefs.strict]);

  useEffect(() => {
    if (ay && heard.length) session.set(ay.s + ":" + ay.a, { score: result.score, wrong: shown.filter((_, i) => result.states[i] === "bad" || result.states[i] === "missing") });
  }, [result]); // eslint-disable-line

  async function stopAll() {
    setOn(false);
    const l = rec.current; rec.current = null;
    try { await l?.stop(); } catch { /* ignore */ }
  }

  async function start() {
    setErr(""); setHeard([]);
    if (rec.current) await stopAll();
    const l = createListener({
      lang: prefs.recLang,
      expected: () => shown,
      onWords: (w) => setHeard(w),
      onNewSession: () => {},
      onError: (m) => { setErr(m === "unsupported" ? t.tartilUnsupported : m); setOn(false); rec.current = null; },
      onEnd: () => { setOn(false); rec.current = null; },
    });
    rec.current = l; setOn(true);
    await l.start();
  }

  if (!ay) return <p>—</p>;
  const rows = [...session.entries()];
  const weak = rows.flatMap(([, r]) => r.wrong);
  const bad = result.states.filter((s) => s === "bad" || s === "missing").length;
  const cls = (s: WordState, i: number) => "word " + (s === "ok" ? "ok" : s === "bad" || s === "missing" ? "bad" : (i === result.states.findIndex((x) => x === "pending") && on ? "cur" : ""));
  return (
    <div className="tt">
      <p style={{ fontSize: 13, color: "var(--muted)" }}>{t.tartilNote}</p>
      <div className="seg" style={{ alignItems: "center" }}>
        <button className="ib" disabled={sel <= 0} aria-label="‹" onClick={() => { stopAll(); setSel(sel - 1); setHeard([]); }}><span className="mirror"><Ic n="prev" size={18} /></span></button>
        <span>{t.surah} {ay.s}:{ay.a}</span>
        <button className="ib" disabled={sel >= list.length - 1} aria-label="›" onClick={() => { stopAll(); setSel(sel + 1); setHeard([]); }}><span className="mirror flip"><Ic n="prev" size={18} /></span></button>
      </div>
      <div dir="rtl" lang="ar" style={{ fontFamily: "'Amiri Quran', serif", fontSize: 26, lineHeight: 2.2, textAlign: "center" }}>
        {shown.map((w, i) => <span key={i} className={cls(result.states[i], i)}>{w} </span>)}
      </div>
      {supported ? (
        <button className={"ib " + (on ? "" : "primary")} style={{ width: "100%", marginTop: 12 }} onClick={() => (on ? stopAll() : start())}><span className="bi"><Ic n={on ? "stop" : "mic"} size={18} fill={on} />{on ? t.stop + " · " + t.listening : t.start}</span></button>
      ) : <p>{t.tartilUnsupported}</p>}
      {err && <p style={{ color: "#e5484d", fontSize: 13 }} role="alert">{err}</p>}
      {heard.length > 0 && <p style={{ fontSize: 15 }}><b>{t.score}: {result.score}%</b></p>}
      {heard.length > 0 && (
        <p style={{ fontSize: 14 }}>
          {result.done ? t.correct : bad > 0 ? t.mistakeWarn + ": " + shown.filter((_, i) => result.states[i] === "bad" || result.states[i] === "missing").join(" · ") : ""}
        </p>
      )}
      {rows.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>{t.summary}</h3>
          <small style={{ color: "var(--muted)" }}>{t.tapRetry}</small>
          <div className="list" style={{ marginTop: 6 }}>
            {rows.map(([k, r]) => {
              const [s, a] = k.split(":").map(Number);
              const pg = pageOfAyah(s, a);
              return (
                <div key={k} className="li" style={{ cursor: "default" }}>
                  <span className="n" style={{ width: "auto", padding: "0 8px", borderRadius: 12 }}>{k}</span>
                  <span className="nm" dir="rtl" lang="ar" style={{ fontFamily: "'Amiri Quran', serif", fontSize: 16 }}>{r.wrong.join(" · ") || "—"}</span>
                  <button className="score" aria-label={t.retry + " " + k} style={{ background: r.score >= 90 ? "#2faa6a" : r.score >= 60 ? "#d9822b" : "#e5484d" }}
                    onClick={() => { if (pg === page) { const i = list.findIndex((x) => x.s === s && x.a === a); if (i >= 0) { stopAll(); setSel(i); setHeard([]); setTimeout(start, 50); } } }}>{r.score}%</button>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 13 }}>{weak.length ? t.weakWords + ": " + [...new Set(weak)].slice(0, 12).join(" · ") : t.noMistakes}</p>
        </div>
      )}
    </div>
  );
}

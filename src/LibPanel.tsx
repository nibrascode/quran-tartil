import { useEffect, useState } from "react";
import { RESOURCES, download, entry, remove, status, stop, type Res } from "./library";

const L = {
  az: { dl: "Endir", del: "Sil", stop: "Dayandır", ready: "Endirilib", err: "Endirmə alınmadı. İnternetı yoxlayın.", tr: "Tərcümələr", tf: "Təfsirlər", src: "Mənbə", note: "Yalnız siz toxunanda endirilir və cihazda saxlanır.", sure: "Silinsin?" },
  en: { dl: "Download", del: "Delete", stop: "Stop", ready: "Downloaded", err: "Download failed. Check the connection.", tr: "Translations", tf: "Tafsirs", src: "Source", note: "Downloaded only when you tap, stored on this device.", sure: "Delete?" },
  ar: { dl: "تنزيل", del: "حذف", stop: "إيقاف", ready: "تم التنزيل", err: "تعذر التنزيل. تحقق من الاتصال.", tr: "الترجمات", tf: "التفاسير", src: "المصدر", note: "يُنزَّل عند الضغط فقط ويُحفظ على الجهاز.", sure: "حذف؟" },
};

function Row({ r, t }: { r: Res; t: (typeof L)["az"] }) {
  const [n, setN] = useState(0), [busy, setBusy] = useState(false), [err, setErr] = useState(false), [ask, setAsk] = useState(false);
  useEffect(() => { status(r.id).then(setN); }, [r.id]);
  const go = async () => { setBusy(true); setErr(false); try { await download(r, setN); } catch (e) { if ((e as Error).message !== "stopped") setErr(true); } setBusy(false); setN(await status(r.id)); };
  const done = n >= 114;
  return (
    <div className="lib-row" data-id={r.id}>
      <div className="lib-tx"><b dir="auto">{r.name}</b><small dir="auto">{r.by} · {r.size} · {t.src}: {r.src}</small>
        {(busy || (n > 0 && !done)) && <div className="lib-bar" role="progressbar" aria-valuemin={0} aria-valuemax={114} aria-valuenow={n}><i style={{ width: (n / 114) * 100 + "%" }} /></div>}
        {err && <small className="lib-err">{t.err}</small>}
      </div>
      {busy ? <button className="ib" onClick={() => stop(r.id)}>{t.stop} {Math.round((n / 114) * 100)}%</button>
        : done ? (ask ? <span className="lib-ask"><button className="ib danger" onClick={async () => { await remove(r.id); setN(0); setAsk(false); }}>{t.del}</button><button className="ib" onClick={() => setAsk(false)}>✕</button></span>
          : <span className="lib-ask"><small className="lib-ok">✓ {t.ready}</small><button className="ib" aria-label={t.del + " " + r.name} onClick={() => setAsk(true)}>{t.del}</button></span>)
        : <button className="ib" onClick={go}>{t.dl}{n > 0 ? " " + Math.round((n / 114) * 100) + "%" : ""}</button>}
    </div>
  );
}

export function LibSettings({ lang }: { lang: string }) {
  const t = L[(lang as "az") in L ? (lang as "az") : "en"];
  return (
    <div className="lib">
      <small className="desc">{t.note}</small>
      <b className="sub">{t.tr}</b>
      {RESOURCES.filter((r) => r.kind === "tr").map((r) => <Row key={r.id} r={r} t={t} />)}
      <b className="sub">{t.tf}</b>
      {RESOURCES.filter((r) => r.kind === "tf").map((r) => <Row key={r.id} r={r} t={t} />)}
    </div>
  );
}

/** reader sheet: translation or tafsir of the tapped ayah (reader UI is Azerbaijani) */
export function AyahLib({ kind, s, a, onClose, onSettings }: { kind: "tr" | "tf"; s: number; a: number; onClose: () => void; onSettings: () => void }) {
  const list = RESOURCES.filter((r) => r.kind === kind);
  const [have, setHave] = useState<Res[] | null>(null);
  const [pick, setPick] = useState(() => localStorage.getItem("qt.lib." + kind) || "");
  const [e, setE] = useState<{ text: string; from: number; to: number } | null | undefined>(undefined);
  useEffect(() => { Promise.all(list.map((r) => status(r.id))).then((ns) => setHave(list.filter((_, i) => ns[i] >= 114))); }, [kind]);
  const cur = have?.find((r) => r.id === pick) || have?.[0];
  useEffect(() => { if (!cur) return; setE(undefined); entry(cur.id, s, a).then(setE); }, [cur?.id, s, a]);
  const title = kind === "tr" ? "Tərcümə" : "Təfsir";
  return (
    <div className="lib-sheet" role="dialog" aria-label={title + " " + s + ":" + a}>
      <div className="ahead"><span className="ref">{s}:{a}</span><b>{title}</b><button className="x" aria-label="Bağla" onClick={onClose}>✕</button></div>
      {have && have.length === 0 && <div className="lib-none"><p>{kind === "tr" ? "Tərcümə hələ endirilməyib." : "Təfsir hələ endirilməyib."} Ayarlarda “Tərcümə və təfsir” bölməsindən endirin.</p><button className="ib" onClick={onSettings}>Ayarlara keç</button></div>}
      {have && have.length > 1 && <div className="lib-tabs" role="tablist">{have.map((r) => <button key={r.id} role="tab" aria-selected={r.id === cur?.id} className={r.id === cur?.id ? "on" : ""} onClick={() => { setPick(r.id); localStorage.setItem("qt.lib." + kind, r.id); }} dir="auto">{r.name}</button>)}</div>}
      {cur && <div className={"lib-body" + (cur.lang === "ar" ? " ar" : "")} dir={cur.lang === "ar" ? "rtl" : "ltr"} lang={cur.lang}>
        {e === undefined ? <p>…</p> : !e || !e.text ? <p>—</p> : <>
          {e.from !== e.to && <small className="lib-range">{cur.lang === "ar" ? `الآيات ${e.from}–${e.to}` : `Ayələr ${e.from}–${e.to}`}</small>}
          <p>{e.text}</p></>}
        <small className="lib-src" dir="ltr">{cur.by} · {cur.src}</small>
      </div>}
    </div>
  );
}

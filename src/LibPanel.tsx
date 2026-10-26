import { useEffect, useState } from "react";
import { RESOURCES, download, entry, remove, status, stop, type Res } from "./library";

const L = {
  az: { dl: "Endir", del: "Sil", stop: "Dayandır", ready: "Endirilib", err: "Endirmə alınmadı. İnternetı yoxlayın.", tr: "Tərcümələr", tf: "Təfsirlər", src: "Mənbə", note: "Yalnız siz toxunanda endirilir və cihazda saxlanır.", sure: "Silinsin?" },
  en: { dl: "Download", del: "Delete", stop: "Stop", ready: "Downloaded", err: "Download failed. Check the connection.", tr: "Translations", tf: "Tafsirs", src: "Source", note: "Downloaded only when you tap, stored on this device.", sure: "Delete?" },
  ar: { dl: "تنزيل", del: "حذف", stop: "إيقاف", ready: "تم التنزيل", err: "تعذر التنزيل. تحقق من الاتصال.", tr: "الترجمات", tf: "التفاسير", src: "المصدر", note: "يُنزَّل عند الضغط فقط ويُحفظ على الجهاز.", sure: "حذف؟" },
};

function Row({ r, t, onDone }: { r: Res; t: (typeof L)["az"]; onDone?: () => void }) {
  const [n, setN] = useState(0), [busy, setBusy] = useState(false), [err, setErr] = useState(false), [ask, setAsk] = useState(false);
  useEffect(() => { status(r.id).then(setN); }, [r.id]);
  const go = async () => { setBusy(true); setErr(false); try { await download(r, setN); } catch (e) { if ((e as Error).message !== "stopped") setErr(true); } setBusy(false); const k = await status(r.id); setN(k); if (k >= 114) onDone?.(); };
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
const SL = {
  az: { all_tr: "Tərcümələr", all_tf: "Təfsirlər", show: "Göstər", cur: "Seçilib", tr: "Tərcümə", tf: "Təfsir", close: "Bağla", noTr: "Tərcümə hələ endirilməyib.", noTf: "Təfsir hələ endirilməyib.", hint: "Ayarlarda “Tərcümə və təfsir” bölməsindən endirin.", here: "Birini buradan endirin:", go: "Ayarlara keç", ay: "Ayələr" },
  en: { all_tr: "Translations", all_tf: "Tafsirs", show: "Show", cur: "Selected", tr: "Translation", tf: "Tafsir", close: "Close", noTr: "No translation downloaded yet.", noTf: "No tafsir downloaded yet.", hint: "Download one in Settings › Translation & tafsir.", here: "Download one here:", go: "Open Settings", ay: "Ayahs" },
  ar: { all_tr: "الترجمات", all_tf: "التفاسير", show: "عرض", cur: "المختار", tr: "الترجمة", tf: "التفسير", close: "إغلاق", noTr: "لم تُنزَّل أي ترجمة بعد.", noTf: "لم يُنزَّل أي تفسير بعد.", hint: "نزّلها من الإعدادات › الترجمة والتفسير.", here: "نزّل واحدًا من هنا:", go: "فتح الإعدادات", ay: "الآيات" },
};
export function AyahLib({ kind, s, a, onClose, onSettings, lang = "az" }: { kind: "tr" | "tf"; s: number; a: number; onClose: () => void; onSettings: () => void; lang?: string }) {
  const u = SL[(lang as "az") in SL ? (lang as "az") : "en"];
  const list = RESOURCES.filter((r) => r.kind === kind);
  const [have, setHave] = useState<Res[] | null>(null);
  const [pick, setPick] = useState(() => localStorage.getItem("qt.lib." + kind) || "");
  const [e, setE] = useState<{ text: string; from: number; to: number } | null | undefined>(undefined);
  const [tick, setTick] = useState(0);
  const [all, setAll] = useState(false);
  const choose = (id: string) => { setPick(id); localStorage.setItem("qt.lib." + kind, id); setAll(false); };
  useEffect(() => { Promise.all(list.map((r) => status(r.id))).then((ns) => setHave(list.filter((_, i) => ns[i] >= 114))); }, [kind, tick]);
  const lt = L[(lang as "az") in L ? (lang as "az") : "en"];
  const cur = have?.find((r) => r.id === pick) || have?.[0];
  useEffect(() => { if (!cur) return; setE(undefined); entry(cur.id, s, a).then(setE); }, [cur?.id, s, a]);
  const title = kind === "tr" ? u.tr : u.tf;
  return (
    <div className="lib-sheet" dir={lang === "ar" ? "rtl" : "ltr"} role="dialog" aria-label={title + " " + s + ":" + a}>
      <div className="ahead"><span className="ref">{s}:{a}</span><b>{title}</b><button className="x" aria-label={u.close} onClick={onClose}>✕</button></div>
      <button className={"ib lib-allbtn" + (all ? " on" : "")} aria-expanded={all || have?.length === 0} onClick={() => setAll((v) => !v)}><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>{kind === "tr" ? u.all_tr : u.all_tf} ({list.length})</button>
      {have && (all || have.length === 0) && <div className="lib-none lib-all">{have.length === 0 && <p>{kind === "tr" ? u.noTr : u.noTf} {u.here}</p>}
        {list.map((r) => have.some((h) => h.id === r.id)
          ? <div className="lib-row" data-id={r.id} key={r.id}><div className="lib-tx"><b dir="auto">{r.name}</b><small dir="auto">{r.by} · {r.size}</small></div>
              {r.id === cur?.id ? <small className="lib-ok">✓ {u.cur}</small> : <button className="ib" onClick={() => choose(r.id)}>{u.show}</button>}</div>
          : <Row key={r.id} r={r} t={lt} onDone={() => { choose(r.id); setTick((x) => x + 1); }} />)}
        <button className="ib lib-go" onClick={onSettings}>{u.go}</button></div>}
      {have && have.length > 1 && <div className="lib-tabs" role="tablist">{have.map((r) => <button key={r.id} role="tab" aria-selected={r.id === cur?.id} className={r.id === cur?.id ? "on" : ""} onClick={() => { setPick(r.id); localStorage.setItem("qt.lib." + kind, r.id); }} dir="auto">{r.name}</button>)}</div>}
      {cur && !all && <div className={"lib-body" + (cur.lang === "ar" ? " ar" : "")} dir={cur.lang === "ar" ? "rtl" : "ltr"} lang={cur.lang}>
        {e === undefined ? <p>…</p> : !e || !e.text ? <p>—</p> : <>
          {e.from !== e.to && <small className="lib-range">{cur.lang === "ar" ? `الآيات ${e.from}–${e.to}` : `${u.ay} ${e.from}–${e.to}`}</small>}
          <p>{e.text}</p></>}
        <small className="lib-src" dir="ltr">{cur.by} · {cur.src}</small>
      </div>}
    </div>
  );
}

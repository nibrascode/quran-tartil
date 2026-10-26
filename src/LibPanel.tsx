import { Fragment, useEffect, useState } from "react";
import { suras } from "./quran";
import { RESOURCES, download, entry, note, remove, status, stop, type Res } from "./library";

const L = {
  az: { dl: "Endir", del: "Sil", stop: "Dayandır", ready: "Endirilib", err: "Endirmə alınmadı. İnternetı yoxlayın.", tr: "Tərcümələr", tf: "Təfsirlər", irab: "İ'rab", src: "Mənbə", note: "Yalnız siz toxunanda endirilir və cihazda saxlanır.", sure: "Silinsin?" },
  en: { dl: "Download", del: "Delete", stop: "Stop", ready: "Downloaded", err: "Download failed. Check the connection.", tr: "Translations", tf: "Tafsirs", irab: "I'rab (grammar)", src: "Source", note: "Downloaded only when you tap, stored on this device.", sure: "Delete?" },
  ar: { dl: "تنزيل", del: "حذف", stop: "إيقاف", ready: "تم التنزيل", err: "تعذر التنزيل. تحقق من الاتصال.", tr: "الترجمات", tf: "التفاسير", irab: "الإعراب", src: "المصدر", note: "يُنزَّل عند الضغط فقط ويُحفظ على الجهاز.", sure: "حذف؟" },
};

function Row({ r, t, onDone }: { r: Res; t: (typeof L)["az"]; onDone?: () => void }) {
  const [n, setN] = useState(0), [busy, setBusy] = useState(false), [err, setErr] = useState(false), [ask, setAsk] = useState(false);
  useEffect(() => { status(r.id).then(setN); }, [r.id]);
  const go = async () => { setBusy(true); setErr(false); try { await download(r, setN); } catch (e) { if ((e as Error).message !== "stopped") setErr(true); } setBusy(false); const k = await status(r.id); setN(k); if (k >= 114) onDone?.(); };
  const done = n >= 114;
  return (
    <div className="lib-row" data-id={r.id}>
      <div className="lib-tx"><b dir="auto">{r.name}</b><small dir="auto">{r.kind === "tr" ? "" : r.by + " · "}{r.size} · {t.src}: {r.src}</small>
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
      {RESOURCES.filter((r) => r.kind === "tr").map((r, i, l) => <Fragment key={r.id}>{r.lname !== l[i - 1]?.lname && <small className="lib-grp" dir="auto">{r.lname}</small>}<Row r={r} t={t} /></Fragment>)}
      <b className="sub">{t.tf}</b>
      {RESOURCES.filter((r) => r.kind === "tf" && r.grp !== "irab").map((r) => <Row key={r.id} r={r} t={t} />)}
      <b className="sub">{t.irab}</b>
      {RESOURCES.filter((r) => r.grp === "irab").map((r) => <Row key={r.id} r={r} t={t} />)}
    </div>
  );
}

/** reader sheet: translation(s) or tafsir(s) of the tapped ayah. The "Translations (2)" / "Tafsirs (3)" button toggles a dropdown
 * with a tick per item (plus "All"); items not on the device have a small download icon with progress and become tickable once downloaded.
 * The body shows every ticked text (stacked with its name when more than one). Ticks are remembered per kind. */
const SL = {
  az: { all_tr: "Tərcümələr", all_tf: "Təfsirlər", all: "Hamısı", tr: "Tərcümə", tf: "Təfsir", close: "Bağla", none: "Göstərmək üçün yuxarıdakı siyahıdan birini endirin və seçin.", pickOne: "Siyahıdan birini seçin.", dl: "Endir", stop: "Dayandır", err: "Endirmə alınmadı", ay: "Ayələr", find: "Axtar (dil, tərcüməçi)", notes: "Qeydlər", gTf: "Təfsirlər", gIrab: "İ'rab", prev: "Əvvəlki ayə", next: "Növbəti ayə" },
  en: { all_tr: "Translations", all_tf: "Tafsirs", all: "All", tr: "Translation", tf: "Tafsir", close: "Close", none: "Download and tick one in the list above to show it here.", pickOne: "Tick one in the list.", dl: "Download", stop: "Stop", err: "Download failed", ay: "Ayahs", find: "Search (language, translator)", notes: "Notes", gTf: "Tafsirs", gIrab: "I'rab (grammar)", prev: "Previous ayah", next: "Next ayah" },
  ar: { all_tr: "الترجمات", all_tf: "التفاسير", all: "الكل", tr: "الترجمة", tf: "التفسير", close: "إغلاق", none: "نزّل واحدًا من القائمة أعلاه وحدّده ليظهر هنا.", pickOne: "حدّد واحدًا من القائمة.", dl: "تنزيل", stop: "إيقاف", err: "تعذر التنزيل", ay: "الآيات", find: "بحث (اللغة، المترجم)", notes: "الحواشي", gTf: "التفاسير", gIrab: "الإعراب", prev: "الآية السابقة", next: "الآية التالية" },
};
type U = (typeof SL)["az"];
export const readTicks = (kind: string): string[] | null => {
  try { const v = localStorage.getItem("qt.lib." + kind + ".on"); if (v) return JSON.parse(v); } catch { /* */ }
  const old = localStorage.getItem("qt.lib." + kind); return old ? [old] : null;
};

function Opt({ r, n, on, u, onTick, onN }: { r: Res; n: number; on: boolean; u: U; onTick: (v: boolean) => void; onN: (n: number) => void }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState(false);
  const done = n >= 114;
  const go = async () => { setBusy(true); setErr(false); try { await download(r, onN); } catch (e) { if ((e as Error).message !== "stopped") setErr(true); } setBusy(false); const k = await status(r.id); onN(k); if (k >= 114) onTick(true); };
  const pct = Math.round((n / 114) * 100);
  return (
    <div className={"lib-opt" + (done ? "" : " off")} data-id={r.id}>
      <label><input type="checkbox" checked={done && on} disabled={!done} onChange={(e) => onTick(e.target.checked)} />
        <span className="lib-tx"><b dir="auto">{r.name}</b><small dir="auto">{r.kind === "tr" ? "" : r.by + " · "}{r.size}{r.ver ? " · v" + r.ver : ""}</small>
          {(busy || (n > 0 && !done)) && <span className="lib-bar" role="progressbar" aria-valuemin={0} aria-valuemax={114} aria-valuenow={n}><i style={{ width: pct + "%" }} /></span>}
          {err && <small className="lib-err">{u.err}</small>}</span></label>
      {!done && <button className={"lib-dl" + (busy ? " busy" : "")} aria-label={(busy ? u.stop : u.dl) + " " + r.name} onClick={() => (busy ? stop(r.id) : go())}>
        {busy || n > 0 ? <small>{pct}%</small> : null}
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">{busy ? <path d="M7 7h10v10H7z" fill="currentColor" /> : <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}</svg></button>}
    </div>
  );
}

function Text({ r, s, a, u, named, onRange }: { r: Res; s: number; a: number; u: U; named: boolean; onRange: (id: string, from: number, to: number) => void }) {
  const [e, setE] = useState<{ text: string; from: number; to: number } | null | undefined>(undefined);
  const [fn, setFn] = useState("");
  useEffect(() => { setE(undefined); setFn(""); entry(r.id, s, a).then((v) => { setE(v); onRange(r.id, v && v.text ? v.from : a, v && v.text ? v.to : a); }); if (r.per) note(r.id, s, a).then(setFn); }, [r.id, s, a]);
  return (
    <div className={"lib-body" + (r.lang === "ar" ? " ar" : "")} data-id={r.id} dir={r.dir || "ltr"} lang={r.lang}>
      {named && <b className="lib-name" dir="auto">{r.kind === "tr" ? r.lname + " · " + r.name : r.name}</b>}
      {e === undefined ? <p>…</p> : !e || !e.text ? <p>—</p> : <>
        {e.from !== e.to && <small className="lib-range">{r.lang === "ar" ? `الآيات ${e.from}–${e.to}` : `${u.ay} ${e.from}–${e.to}`}</small>}
        <p>{e.text}</p></>}
      {fn && <div className="lib-fn" aria-label={u.notes}>{fn}</div>}
      <small className="lib-src" dir="ltr">{r.kind === "tr" ? r.name : r.by} · {r.src}</small>
    </div>
  );
}

/** next / previous ayah across surah boundaries; null at 1:1 / 114:6 */
export const stepAyah = (s: number, a: number, d: 1 | -1): { s: number; a: number } | null => {
  if (d > 0) return a < suras[s - 1].ayas ? { s, a: a + 1 } : s < 114 ? { s: s + 1, a: 1 } : null;
  return a > 1 ? { s, a: a - 1 } : s > 1 ? { s: s - 1, a: suras[s - 2].ayas } : null;
};
export function AyahLib({ kind, s, a, onClose, onNav, lang = "az" }: { kind: "tr" | "tf"; s: number; a: number; onClose: () => void; onNav?: (s: number, a: number) => void; onSettings?: () => void; lang?: string }) {
  const u = SL[(lang as "az") in SL ? (lang as "az") : "en"];
  const list = RESOURCES.filter((r) => r.kind === kind);
  const [ns, setNs] = useState<Record<string, number> | null>(null);
  const [ticks, setTicks] = useState<string[] | null>(() => readTicks(kind));
  const [open, setOpen] = useState<boolean | null>(null);
  const [q, setQ] = useState("");
  const [rng, setRng] = useState<Record<string, [number, number, string]>>({});
  const onRange = (id: string, f: number, t: number) => setRng((m) => ({ ...m, [id]: [f, t, s + ":" + a] }));
  useEffect(() => { Promise.all(list.map((r) => status(r.id))).then((v) => setNs(Object.fromEntries(list.map((r, i) => [r.id, v[i]])))); }, [kind]);
  const have = ns ? list.filter((r) => ns[r.id] >= 114) : [];
  // never chosen yet: show the first downloaded one
  const on = ticks ?? (have[0] ? [have[0].id] : []);
  const save = (v: string[]) => { setTicks(v); localStorage.setItem("qt.lib." + kind + ".on", JSON.stringify(v)); };
  const tick = (id: string, v: boolean) => save(v ? [...new Set([...on, id])] : on.filter((x) => x !== id));
  const shown = have.filter((r) => on.includes(r.id));
  const isOpen = open ?? (ns !== null && have.length === 0); // nothing on the device yet: the list starts open
  useEffect(() => { if (ns && open === null) setOpen(have.length === 0); }, [ns !== null]);
  const allOn = have.length > 0 && have.every((r) => on.includes(r.id));
  const title = kind === "tr" ? u.tr : u.tf;
  // a tafsir entry may cover several ayahs: next jumps past the shown range, previous to the ayah before it
  const cur = shown.map((r) => rng[r.id]).filter((x) => x && x[2] === s + ":" + a);
  const to = cur.length ? Math.min(...cur.map((x) => x[1])) : a, from = cur.length ? Math.max(...cur.map((x) => x[0])) : a;
  const nx = stepAyah(s, Math.max(a, to), 1), pv = stepAyah(s, Math.min(a, from), -1);
  const rtl = lang === "ar";
  const arrow = (d: "l" | "r") => <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d={d === "l" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return (
    <div className="lib-sheet" dir={lang === "ar" ? "rtl" : "ltr"} role="dialog" aria-label={title + " " + s + ":" + a}>
      <div className="ahead"><span className="ref">{s}:{a}</span><b>{title}</b>
        {onNav && <span className="lib-nav">
          <button className="ib lib-prev" aria-label={u.prev} title={u.prev} disabled={!pv} onClick={() => pv && onNav(pv.s, pv.a)}>{arrow(rtl ? "r" : "l")}</button>
          <button className="ib lib-next" aria-label={u.next} title={u.next} disabled={!nx} onClick={() => nx && onNav(nx.s, nx.a)}>{arrow(rtl ? "l" : "r")}</button></span>}<button className="x" aria-label={u.close} onClick={onClose}>✕</button></div>
      <button className={"ib lib-allbtn" + (isOpen ? " on" : "")} aria-expanded={isOpen} onClick={() => setOpen(!isOpen)}>
        {kind === "tr" ? u.all_tr : u.all_tf} ({list.length})
        <svg className="chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d={isOpen ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      {isOpen && ns && <div className="lib-dd" role="group">
        <div className={"lib-opt all" + (have.length ? "" : " off")}><label><input type="checkbox" checked={allOn} disabled={!have.length} onChange={(e) => save(e.target.checked ? have.map((r) => r.id) : [])} /><span className="lib-tx"><b>{u.all}</b></span></label></div>
        {list.length > 6 && <input className="lib-find" type="search" value={q} placeholder={u.find} aria-label={u.find} onChange={(e) => setQ(e.target.value)} />}
        {list.filter((r) => !q.trim() || [r.name, r.lname, r.lang, r.id, r.src].join(" ").toLocaleLowerCase().includes(q.trim().toLocaleLowerCase())).map((r, i, l) => <Fragment key={r.id}>{kind === "tr" ? r.lname !== l[i - 1]?.lname && <div className="lib-grp" dir="auto">{r.lname}</div> : r.grp !== l[i - 1]?.grp && <div className="lib-grp" dir="auto">{r.grp === "irab" ? u.gIrab : u.gTf}</div>}<Opt r={r} n={ns[r.id] || 0} on={on.includes(r.id)} u={u} onTick={(v) => tick(r.id, v)} onN={(k) => setNs((m) => ({ ...(m || {}), [r.id]: k }))} /></Fragment>)}
      </div>}
      {ns && !shown.length && <p className="lib-hint">{have.length ? u.pickOne : u.none}</p>}
      {shown.map((r) => <Text key={r.id} r={r} s={s} a={a} u={u} named={shown.length > 1} onRange={onRange} />)}
    </div>
  );
}

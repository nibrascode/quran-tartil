import { RECITE } from "./features";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LANGS, T, type Lang } from "./i18n";
import type { Theme } from "./App";
import type { Prefs, Settings as St } from "./store";
import { canNotify } from "./notify";
import { Ic } from "./Icons";
import { haptic } from "./haptic";
import { exportBackup, mergeBackup, parseBackup } from "./backup";
import { DiagPanel } from "./Diag";
import { PreciseCard } from "./PreciseCard";
import { Capacitor } from "@capacitor/core";
import { LibSettings } from "./LibPanel";

type TT = (typeof T)["en"];

const Ico = ({ n, size = 20 }: { n: string; size?: number }) => <Ic n={n} size={size} />;

function Card({ id, icon, tone, title, value, open, toggle, children }: { id: string; icon: string; tone?: string; title: string; value?: string; open: boolean; toggle: (id: string) => void; children?: ReactNode }) {
  return (
    <section className={"scard" + (open ? " open" : "")}>
      <button className="scard-h" aria-expanded={open} aria-controls={"c-" + id} onClick={() => toggle(id)}>
        <span className={"ico t-" + (tone || "g")}><Ico n={icon} /></span>
        <span className="tx"><b>{title}</b>{value && <small>{value}</small>}</span>
        <span className="chev" aria-hidden="true"><Ic n="down" size={18} /></span>
      </button>
      <div className="scard-w" aria-hidden={!open}>
        <div className="scard-i"><div className="scard-b" id={"c-" + id}>{children}</div></div>
      </div>
    </section>
  );
}
/** segmented control with a sliding thumb */
function Seg<V extends string | number>({ value, options, onPick, label }: { value: V; options: { v: V; l: string }[]; onPick: (v: V) => void; label: string }) {
  const i = Math.max(0, options.findIndex((o) => o.v === value));
  return (
    <div className="segc" role="radiogroup" aria-label={label} style={{ ["--n" as string]: options.length, ["--i" as string]: i }}>
      <span className="thumb" aria-hidden="true" />
      {options.map((o) => (
        <button key={String(o.v)} role="radio" aria-checked={value === o.v} className="so" onClick={() => onPick(o.v)}>{o.l}</button>
      ))}
    </div>
  );
}
function Chips<V extends string>({ value, options, onPick, label }: { value: V; options: { v: V; l: string; sub?: string }[]; onPick: (v: V) => void; label: string }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={value === o.v} className="chip" onClick={() => onPick(o.v)}>
          <span>{o.l}</span>{o.sub && <small>{o.sub}</small>}
          {value === o.v && <i className="ck"><Ico n="check" size={14} /></i>}
        </button>
      ))}
    </div>
  );
}
function Switch({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <button className="swrow" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="tx"><b>{label}</b>{desc && <small>{desc}</small>}</span><span className="sw" aria-hidden="true"><i /></span>
    </button>
  );
}
function LangSheet({ lang, onPick, onClose, title }: { lang: Lang; onPick: (l: Lang) => void; onClose: () => void; title: string }) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", k, true);
    return () => document.removeEventListener("keydown", k, true);
  }, [onClose]);
  return createPortal(
    <div className="lsheet-bg" onClick={onClose}>
      <div className="lsheet" role="dialog" aria-modal="true" aria-label={title} dir={lang === "ar" ? "rtl" : "ltr"} onClick={(e) => e.stopPropagation()}>
        <div className="grab" aria-hidden="true" />
        <div className="lsheet-h"><b>{title}</b><button className="x" aria-label="×" onClick={onClose}><Ico n="close" size={18} /></button></div>
        <div className="llist" role="radiogroup" aria-label={title}>
          {LANGS.map((l) => (
            <button key={l.id} ref={l.id === lang ? first : undefined} role="radio" aria-checked={l.id === lang} className="lrow" onClick={() => onPick(l.id)}>
              <span className="code">{l.id.toUpperCase()}</span>
              <span className="tx"><b dir={l.id === "ar" ? "rtl" : "ltr"}>{l.label}</b></span>
              <span className="ck">{l.id === lang && <Ico n="check" size={18} />}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

type Props = {
  lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void; st: St; update: (f: (s: St) => St) => void;
  applyReminder: (on: boolean, h: number, m: number) => void; rmsg: string; onIntro: () => void; say: (m: string) => void; openView: (v: "about" | "privacy") => void;
};

export function SettingsView({ lang, setLang, theme, setTheme, st, update, applyReminder, rmsg, onIntro, say, openView }: Props) {
  const t: TT = T[lang];
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "progress" | "bookmarks" | "all">(null);
  const fileRef = useRef<HTMLInputElement>(null);
  async function doExport() {
    const json = JSON.stringify(exportBackup(st), null, 2);
    const name = `quran-tartil-backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      if (Capacitor.isNativePlatform()) { const { Share } = await import("@capacitor/share"); await Share.share({ title: name, text: json, dialogTitle: name }); }
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([json], { type: "application/json" })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
      say(t.exportDone);
    } catch { /* cancelled */ }
  }
  async function doImport(f: File | undefined) {
    if (!f) return;
    const b = f.size < 5_000_000 ? parseBackup(await f.text()) : null;
    if (!b) { say(t.importBad); return; }
    update((x) => mergeBackup(x, b));
    say(t.importDone.replace("{b}", String(b.bookmarks.length)).replace("{w}", String(b.weak.length)).replace("{h}", String(Object.keys(b.hifz).length)));
  }
  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));
  const pref = <K extends keyof Prefs>(k: K, v: Prefs[K]) => update((s) => ({ ...s, prefs: { ...s.prefs, [k]: v } }));
  const p = st.prefs;
  const langName = LANGS.find((l) => l.id === lang)!.label;
  const fsName = p.fontScale >= 1 ? t.fsFill : p.fontScale >= 0.9 ? t.fsComfort : t.fsCompact;
  const hhmm = `${String(st.reminder.h).padStart(2, "0")}:${String(st.reminder.m).padStart(2, "0")}`;
  const dialect = { "ar-SA": t.dSA, "ar-EG": t.dEG, "ar-AE": t.dAE, "ar-MA": t.dMA }[p.recLang];
  const strictName = { easy: t.lenient, medium: t.normal, hard: t.strictN }[p.strict];
  const strictDesc = { easy: t.easyD, medium: t.mediumD, hard: t.hardD }[p.strict];
  const themeName = { light: t.light, dark: t.dark, sepia: t.sepia }[theme];

  function doConfirm() {
    if (confirm === "progress") update((s) => ({ ...s, visited: [], khatms: 0, days: {}, dayPages: [] }));
    if (confirm === "bookmarks") update((s) => ({ ...s, bookmarks: [] }));
    if (confirm === "all") { localStorage.clear(); location.reload(); }
    setConfirm(null);
  }

  const [langOpen, setLangOpen] = useState(false);
  const sample = "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ";
  return (
    <div className="settings">
      <Group>{t.setReading}</Group>
      <button className="scard-h link lang" onClick={() => setLangOpen(true)} aria-haspopup="dialog">
        <span className="ico t-b"><Ico n="lang" /></span>
        <span className="tx"><b>{t.language}</b><small>{t.langPick}</small></span>
        <span className="pill">{langName}</span>
        <span className="chev" aria-hidden="true"><Ic n="right" size={18} /></span>
      </button>
      {langOpen && <LangSheet lang={lang} title={t.language} onClose={() => setLangOpen(false)} onPick={(l) => { setLang(l); setLangOpen(false); }} />}
      <Card id="theme" icon="theme" tone="p" title={t.theme} value={themeName} open={open === "theme"} toggle={toggle}>
        <div className="swatches" role="radiogroup" aria-label={t.theme}>
          {(["light", "dark", "sepia"] as Theme[]).map((x) => (
            <button key={x} role="radio" aria-checked={theme === x} className={"swatch s-" + x} onClick={() => setTheme(x)}>
              <span className="mock" aria-hidden="true"><i /><i /><i /><i /></span>
              <span className="pv" aria-hidden="true">ٱلْحَمْدُ</span><b>{t[x]}</b>
            </button>
          ))}
        </div>
        <small className="desc">{t.themeDesc}</small>
      </Card>
      <Card id="fs" icon="turn" tone="g" title={t.fontSize} value={fsName} open={open === "fs"} toggle={toggle}>
        <div className="fprev" dir="rtl" lang="ar"><span style={{ fontSize: 26 * p.fontScale }}>{sample}</span></div>
        <Seg label={t.fontSize} value={p.fontScale} options={[{ v: 1, l: t.fsFill }, { v: 0.9, l: t.fsComfort }, { v: 0.8, l: t.fsCompact }]} onPick={(v) => pref("fontScale", v)} />
        <small className="desc">{t.fsDesc}</small>
        <Switch on={!!p.tajweed} onChange={(v) => pref("tajweed", v)} label={({ az: "Təcvid rəngləri", ar: "تلوين التجويد", en: "Tajweed colours" } as Record<string, string>)[lang] || "Tajweed colours"} desc={({ az: "Təcvid qaydalarını yumşaq, gözü yormayan rənglərlə göstərir.", ar: "يعرض أحكام التجويد بألوان هادئة مريحة للعين.", en: "Shows tajweed rules in soft, eye-friendly colours." } as Record<string, string>)[lang] || "Shows tajweed rules in soft, eye-friendly colours."} />
        <Switch on={p.pageSound !== false} onChange={(v) => pref("pageSound", v)} label={({ az: "Səhifə çevirmə səsi", ar: "صوت تقليب الصفحة", en: "Page-turn sound" } as Record<string, string>)[lang] || "Page-turn sound"} desc={({ az: "Səhifə çevriləndə yumşaq kağız səsi (cihazın media səsi ilə).", ar: "صوت ورق خفيف عند تقليب الصفحة (بمستوى صوت الوسائط).", en: "A soft paper sound on each turn (follows media volume)." } as Record<string, string>)[lang] || "A soft paper sound on each turn."} />
      </Card>
      <Card id="turn" icon="turn" tone="o" title={t.pageTurn} value={p.flip === "flip" ? t.flipOn : t.flipOff} open={open === "turn"} toggle={toggle}>
        <Seg label={t.pageTurn} value={p.flip} options={[{ v: "flip", l: t.flipOn }, { v: "none", l: t.flipOff }]} onPick={(v) => pref("flip", v)} />
      </Card>
      <Card id="awake" icon="awake" tone="y" title={t.keepAwake} value={p.keepAwake ? "●" : "—"} open={open === "awake"} toggle={toggle}>
        <Switch on={p.keepAwake} onChange={(v) => pref("keepAwake", v)} label={t.keepAwake} desc={t.keepAwakeDesc} />
      </Card>

      <Card id="hap" icon="vibrate" tone="p" title={t.hapticsT} value={p.haptics ? "●" : "—"} open={open === "hap"} toggle={toggle}>
        <Switch on={p.haptics} onChange={(v) => { pref("haptics", v); if (v) haptic("ok"); }} label={t.hapticsT} desc={t.hapticsD} />
      </Card>

      <Card id="lib" icon="book" tone="b" title={({ az: "Tərcümə və təfsir", ar: "الترجمة والتفسير", en: "Translation & tafsir" } as Record<string, string>)[lang] || "Translation & tafsir"} open={open === "lib"} toggle={toggle}>
        {open === "lib" && <LibSettings lang={lang} />}
      </Card>

      <Group>{t.setApp}</Group>
      <Card id="rem" icon="bell" tone="r" title={t.reminder} value={st.reminder.on ? hhmm : "—"} open={open === "rem"} toggle={toggle}>
        <Switch on={st.reminder.on} onChange={(v) => applyReminder(v, st.reminder.h, st.reminder.m)} label={t.reminderOn} desc={t.reminderSub} />
        <label className="timef">{t.reminderTime}<input className="field" type="time" value={hhmm} onChange={(e) => { const [h, m] = e.target.value.split(":").map(Number); if (!Number.isNaN(h)) applyReminder(st.reminder.on, h, m || 0); }} /></label>
        {(!canNotify() || rmsg) && <small className="desc">{rmsg || t.reminderApp}</small>}
      </Card>
      {RECITE && <><Card id="tartil" icon="mic" tone="g" title={t.tartilOpts} value={`${strictName} · ${dialect}`} open={open === "tartil"} toggle={toggle}>
        <b className="sub">{t.recLang}</b>
        <Chips label={t.recLang} value={p.recLang} options={[{ v: "ar-SA", l: t.dSA, sub: "ar-SA" }, { v: "ar-EG", l: t.dEG, sub: "ar-EG" }, { v: "ar-AE", l: t.dAE, sub: "ar-AE" }, { v: "ar-MA", l: t.dMA, sub: "ar-MA" }]} onPick={(v) => pref("recLang", v)} />
        <b className="sub">{t.strict}</b>
        <Seg label={t.strict} value={p.strict} options={[{ v: "easy", l: t.lenient }, { v: "medium", l: t.normal }, { v: "hard", l: t.strictN }]} onPick={(v) => pref("strict", v)} />
        <p className="sdesc" key={p.strict}>{strictDesc}</p>
        <small className="desc">{t.tartilNote}</small>
      </Card>

      <Card id="engine" icon="mic" tone="p" title={t.pEngT} open={open === "engine"} toggle={toggle}>
        {open === "engine" && <PreciseCard lang={lang} />}
      </Card>
      <Card id="diag" icon="info" tone="b" title={t.hDiagT} open={open === "diag"} toggle={toggle}>
        {open === "diag" && <DiagPanel lang={lang} locale={p.recLang} />}
      </Card></>}

      <Group>{t.setData}</Group>
      <Card id="backup" icon="download" tone="b" title={t.dataT} open={open === "backup"} toggle={toggle}>
        <small className="desc">{t.dataD}</small>
        <div className="stack">
          <button className="ib" onClick={doExport}><Ic n="download" size={16} />{t.exportBtn}</button>
          <button className="ib" onClick={() => fileRef.current?.click()}><Ic n="upload" size={16} />{t.importBtn}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { doImport(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </Card>
      <Card id="reset" icon="trash" tone="d" title={t.resetData} open={open === "reset"} toggle={toggle}>
        {confirm ? (
          <div role="alertdialog" aria-label={t.confirmQ}>
            <p>{t.confirmQ}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ib" style={{ flex: 1 }} onClick={() => setConfirm(null)}>{t.cancel}</button>
              <button className="ib danger" style={{ flex: 1 }} onClick={doConfirm}>{t.yesDelete}</button>
            </div>
          </div>
        ) : (
          <div className="stack">
            <button className="ib" onClick={() => setConfirm("progress")}>{t.resetProgress}</button>
            <button className="ib" onClick={() => setConfirm("bookmarks")}>{t.clearBookmarks}</button>
            <button className="ib danger" onClick={() => setConfirm("all")}>{t.clearAll}</button>
          </div>
        )}
      </Card>

      <Group>{t.setLegal}</Group>
      <button className="scard-h link" onClick={() => openView("privacy")}><span className="ico t-b"><Ico n="lock" /></span><span className="tx"><b>{t.privacy}</b><small>{t.privacySub}</small></span><span className="chev" aria-hidden="true"><Ic n="right" size={18} /></span></button>
      <button className="scard-h link" onClick={() => openView("about")}><span className="ico t-g"><Ico n="info" /></span><span className="tx"><b>{t.about}</b><small>{t.aboutSub}</small></span><span className="chev" aria-hidden="true"><Ic n="right" size={18} /></span></button>
      <button className="scard-h link" onClick={onIntro}><span className="ico t-y"><Ico n="spark" /></span><span className="tx"><b>{t.intro}</b></span><span className="chev" aria-hidden="true"><Ic n="right" size={18} /></span></button>
    </div>
  );
}
const Group = ({ children }: { children: ReactNode }) => <h3 className="grp"><span>{children}</span></h3>;

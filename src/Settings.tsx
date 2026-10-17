import { useState, type ReactNode } from "react";
import { LANGS, T, type Lang } from "./i18n";
import type { Theme } from "./App";
import type { Prefs, Settings as St } from "./store";
import { canNotify } from "./notify";

type TT = (typeof T)["en"];

function Card({ id, icon, title, value, open, toggle, children }: { id: string; icon: string; title: string; value?: string; open: boolean; toggle: (id: string) => void; children?: ReactNode }) {
  return (
    <section className={"scard" + (open ? " open" : "")}>
      <button className="scard-h" aria-expanded={open} aria-controls={"c-" + id} onClick={() => toggle(id)}>
        <span className="ico" aria-hidden="true">{icon}</span>
        <span className="tx"><b>{title}</b>{value && <small>{value}</small>}</span>
        <span className="chev" aria-hidden="true">▾</span>
      </button>
      {open && <div className="scard-b" id={"c-" + id}>{children}</div>}
    </section>
  );
}
function Choice<V extends string | number>({ value, options, onPick, label }: { value: V; options: { v: V; l: string; sub?: string }[]; onPick: (v: V) => void; label: string }) {
  return (
    <div className="choice" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.v)} role="radio" aria-checked={value === o.v} className="opt" onClick={() => onPick(o.v)}>
          <span className="dot" aria-hidden="true" /><span className="tx">{o.l}{o.sub && <small>{o.sub}</small>}</span>
        </button>
      ))}
    </div>
  );
}
function Switch({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <button className="opt switch" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="tx">{label}{desc && <small>{desc}</small>}</span><span className="sw" aria-hidden="true"><i /></span>
    </button>
  );
}

type Props = {
  lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void; st: St; update: (f: (s: St) => St) => void;
  applyReminder: (on: boolean, h: number, m: number) => void; rmsg: string; onIntro: () => void; openView: (v: "about" | "privacy") => void;
};

export function SettingsView({ lang, setLang, theme, setTheme, st, update, applyReminder, rmsg, onIntro, openView }: Props) {
  const t: TT = T[lang];
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "progress" | "bookmarks" | "all">(null);
  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));
  const pref = <K extends keyof Prefs>(k: K, v: Prefs[K]) => update((s) => ({ ...s, prefs: { ...s.prefs, [k]: v } }));
  const p = st.prefs;
  const langName = LANGS.find((l) => l.id === lang)!.label;
  const fsName = p.fontScale >= 1 ? t.fsFill : p.fontScale >= 0.9 ? t.fsComfort : t.fsCompact;
  const hhmm = `${String(st.reminder.h).padStart(2, "0")}:${String(st.reminder.m).padStart(2, "0")}`;
  const dialect = { "ar-SA": t.dSA, "ar-EG": t.dEG, "ar-AE": t.dAE, "ar-MA": t.dMA }[p.recLang];
  const strictName = { easy: t.lenient, medium: t.normal, hard: t.strictN }[p.strict];
  const strictDesc = { easy: t.easyD, medium: t.mediumD, hard: t.hardD }[p.strict];
  void strictDesc;
  const themeName = { light: t.light, dark: t.dark, sepia: t.sepia }[theme];

  function doConfirm() {
    if (confirm === "progress") update((s) => ({ ...s, visited: [], khatms: 0, days: {}, dayPages: [] }));
    if (confirm === "bookmarks") update((s) => ({ ...s, bookmarks: [] }));
    if (confirm === "all") { localStorage.clear(); location.reload(); }
    setConfirm(null);
  }

  return (
    <div className="settings">
      <h3 className="grp">{t.setReading}</h3>
      <Card id="lang" icon="文" title={t.language} value={langName} open={open === "lang"} toggle={toggle}>
        <Choice label={t.langPick} value={lang} options={LANGS.map((l) => ({ v: l.id, l: l.label }))} onPick={(v) => { setLang(v); setOpen(null); }} />
      </Card>
      <Card id="theme" icon="◐" title={t.theme} value={themeName} open={open === "theme"} toggle={toggle}>
        <div className="swatches" role="radiogroup" aria-label={t.theme}>
          {(["light", "dark", "sepia"] as Theme[]).map((x) => (
            <button key={x} role="radio" aria-checked={theme === x} className={"swatch s-" + x} onClick={() => setTheme(x)}>
              <span className="pv" aria-hidden="true">ٱلْحَمْدُ</span><b>{t[x]}</b>
            </button>
          ))}
        </div>
      </Card>
      <Card id="fs" icon="Aa" title={t.fontSize} value={fsName} open={open === "fs"} toggle={toggle}>
        <Choice label={t.fontSize} value={p.fontScale} options={[{ v: 1, l: t.fsFill }, { v: 0.9, l: t.fsComfort }, { v: 0.8, l: t.fsCompact }]} onPick={(v) => pref("fontScale", v)} />
        <small className="desc">{t.fsDesc}</small>
      </Card>
      <Card id="turn" icon="❏" title={t.pageTurn} value={p.flip === "flip" ? t.flipOn : t.flipOff} open={open === "turn"} toggle={toggle}>
        <Choice label={t.pageTurn} value={p.flip} options={[{ v: "flip", l: t.flipOn }, { v: "none", l: t.flipOff }]} onPick={(v) => pref("flip", v)} />
      </Card>
      <Card id="awake" icon="☀" title={t.keepAwake} value={p.keepAwake ? "✓" : "—"} open={open === "awake"} toggle={toggle}>
        <Switch on={p.keepAwake} onChange={(v) => pref("keepAwake", v)} label={t.keepAwake} desc={t.keepAwakeDesc} />
      </Card>

      <h3 className="grp">{t.setApp}</h3>
      <Card id="rem" icon="🔔" title={t.reminder} value={st.reminder.on ? hhmm : "—"} open={open === "rem"} toggle={toggle}>
        <Switch on={st.reminder.on} onChange={(v) => applyReminder(v, st.reminder.h, st.reminder.m)} label={t.reminderOn} desc={t.reminderSub} />
        <label className="timef">{t.reminderTime}<input className="field" type="time" value={hhmm} onChange={(e) => { const [h, m] = e.target.value.split(":").map(Number); if (!Number.isNaN(h)) applyReminder(st.reminder.on, h, m || 0); }} /></label>
        {(!canNotify() || rmsg) && <small className="desc">{rmsg || t.reminderApp}</small>}
      </Card>
      <Card id="tartil" icon="🎙" title={t.tartilOpts} value={`${strictName} · ${dialect}`} open={open === "tartil"} toggle={toggle}>
        <b className="sub">{t.recLang}</b>
        <Choice label={t.recLang} value={p.recLang} options={[{ v: "ar-SA", l: t.dSA, sub: "ar-SA" }, { v: "ar-EG", l: t.dEG, sub: "ar-EG" }, { v: "ar-AE", l: t.dAE, sub: "ar-AE" }, { v: "ar-MA", l: t.dMA, sub: "ar-MA" }]} onPick={(v) => pref("recLang", v)} />
        <b className="sub">{t.strict}</b>
        <Choice label={t.strict} value={p.strict} options={[{ v: "easy", l: t.lenient, sub: t.easyD }, { v: "medium", l: t.normal, sub: t.mediumD }, { v: "hard", l: t.strictN, sub: t.hardD }]} onPick={(v) => pref("strict", v)} />
        <small className="desc">{t.tartilNote}</small>
      </Card>

      <h3 className="grp">{t.setData}</h3>
      <Card id="reset" icon="🗑" title={t.resetData} open={open === "reset"} toggle={toggle}>
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

      <h3 className="grp">{t.setLegal}</h3>
      <button className="scard-h link" onClick={() => openView("privacy")}><span className="ico" aria-hidden="true">🔒</span><span className="tx"><b>{t.privacy}</b><small>{t.privacySub}</small></span><span className="chev" aria-hidden="true">›</span></button>
      <button className="scard-h link" onClick={() => openView("about")}><span className="ico" aria-hidden="true">ⓘ</span><span className="tx"><b>{t.about}</b><small>{t.aboutSub}</small></span><span className="chev" aria-hidden="true">›</span></button>
      <button className="scard-h link" onClick={onIntro}><span className="ico" aria-hidden="true">✦</span><span className="tx"><b>{t.intro}</b></span><span className="chev" aria-hidden="true">›</span></button>
    </div>
  );
}

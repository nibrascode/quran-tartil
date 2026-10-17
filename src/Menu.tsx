import { Ic } from "./Icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { LANGS, T, type Lang } from "./i18n";
import { LICENSE_BLOCK, PAGES, ayahs, indexOf, pageOfAyah, pageOfJuz, suras, toArabicDigits, firstSuraOfPage } from "./quran";
import type { Theme, Sel } from "./App";
import { Tartil } from "./Tartil";
import { search } from "./search";
import { streak, toggleBookmark, type Settings } from "./store";
import { canNotify, setReminder } from "./notify";
import { SettingsView } from "./Settings";
import { PrivacyView } from "./Privacy";

export type Tab = "surah" | "juz" | "page" | "search" | "bookmarks" | "progress" | "tartil" | "settings" | "about" | "privacy";
type Props = {
  tab: Tab; setTab: (t: Tab) => void; lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void; page: number;
  st: Settings; update: (f: (s: Settings) => Settings) => void; focusAyah: Sel;
  onGo: (p: number, a?: { s: number; a: number }) => void; onClose: () => void; onIntro: () => void;
};

export function Menu({ tab, setTab, lang, setLang, theme, setTheme, page, st, update, focusAyah, onGo, onClose, onIntro }: Props) {
  const t = T[lang];
  const [q, setQ] = useState("");
  const [sq, setSq] = useState("");
  const [num, setNum] = useState(String(page));
  const [rmsg, setRmsg] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const tabs: Tab[] = ["surah", "juz", "page", "search", "bookmarks", "progress", "tartil", "settings"];
  const sub = tab === "about" || tab === "privacy";
  const label = (k: Tab) => ({ surah: t.surah, juz: t.juz, page: t.page, search: t.searchTab, bookmarks: t.bookmarks, progress: t.progress, tartil: t.tartil, settings: t.settings, about: t.about, privacy: t.privacy }[k]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return suras.filter((x) => !s || x.name.includes(s) || x.tname.toLowerCase().includes(s) || String(x.i) === s);
  }, [q]);
  const hits = useMemo(() => search(sq), [sq]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    root.current?.querySelector<HTMLElement>("[role=tab][aria-selected=true]")?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); prev?.focus?.(); };
  }, [onClose]);

  const read = st.visited.length;
  const todayN = st.dayPages.length;
  const goalPct = Math.min(100, Math.round((todayN / Math.max(1, st.goal)) * 100));
  const khatmPct = Math.round((read / PAGES) * 100);
  const hhmm = `${String(st.reminder.h).padStart(2, "0")}:${String(st.reminder.m).padStart(2, "0")}`;
  async function applyReminder(on: boolean, h: number, m: number) {
    update((s) => ({ ...s, reminder: { on, h, m } }));
    const r = await setReminder(on, h, m, t.reminderTitle, t.reminderBody);
    setRmsg(r === "denied" ? t.reminderDenied : r === "unsupported" && on ? t.reminderApp : "");
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" ref={root} role="dialog" aria-modal="true" aria-label={t.app} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h2>{t.app}</h2><button className="ib" onClick={onClose} aria-label={t.close}><Ic n="close" size={18} /></button></div>
        {sub ? (
          <div className="tabs"><button className="tab" onClick={() => setTab("settings")}>← {t.back}</button></div>
        ) : (
          <div className="tabs" role="tablist">
            {tabs.map((k) => <button key={k} role="tab" className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label(k)}</button>)}
          </div>
        )}
        <div className="sheet-body" role="tabpanel">
          {tab === "surah" && (
            <>
              <input className="field" placeholder={t.search} aria-label={t.search} value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="list">
                {filtered.map((s) => (
                  <button key={s.i} className="li" onClick={() => onGo(pageOfAyah(s.i, 1))}>
                    <span className="n">{s.i}</span>
                    <span className="nm"><span className="ar" dir="rtl">{s.name}</span><small>{s.tname} · {s.ayas} {t.ayahs}</small></span>
                    <small>{pageOfAyah(s.i, 1)}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          {tab === "juz" && (
            <div className="list">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                <button key={j} className="li" onClick={() => onGo(pageOfJuz(j))}>
                  <span className="n">{j}</span>
                  <span className="nm">{t.juz} {j}<small dir="rtl" lang="ar">{firstSuraOfPage(pageOfJuz(j)).name}</small></span>
                  <small>{pageOfJuz(j)}</small>
                </button>
              ))}
            </div>
          )}
          {tab === "page" && (
            <form onSubmit={(e) => { e.preventDefault(); const n = Math.round(Number(num)); if (n >= 1 && n <= PAGES) onGo(n); }}>
              <label htmlFor="pn">{t.goPage} (1–{PAGES})</label>
              <input id="pn" className="field" type="number" inputMode="numeric" min={1} max={PAGES} value={num} onChange={(e) => setNum(e.target.value)} style={{ marginTop: 8 }} />
              <button className="ib primary" type="submit" style={{ width: "100%" }}>{t.go} · {toArabicDigits(Number(num) || 1)}</button>
            </form>
          )}
          {tab === "search" && (
            <>
              <input className="field" dir="auto" placeholder={t.searchPh} aria-label={t.searchTab} value={sq} onChange={(e) => setSq(e.target.value)} autoFocus />
              {sq.trim().length >= 2 && hits.length === 0 && <p>{t.noResults}</p>}
              <div className="list">
                {hits.map((h) => (
                  <button key={h.s + ":" + h.a} className="li" onClick={() => onGo(h.page, { s: h.s, a: h.a })}>
                    <span className="n" style={{ width: "auto", padding: "0 8px", borderRadius: 12 }}>{h.s}:{h.a}</span>
                    <span className="nm ar" dir="rtl" lang="ar" style={{ fontSize: 18, lineHeight: 1.9 }}>{h.text}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {tab === "bookmarks" && (
            <div className="list">
              {st.bookmarks.length === 0 && <p>{t.noBookmarks}</p>}
              {st.bookmarks.map((b) => (
                <div key={b.s + ":" + b.a} style={{ display: "flex", gap: 6 }}>
                  <button className="li" style={{ flex: 1 }} onClick={() => onGo(b.page, { s: b.s, a: b.a })}>
                    <span className="n">{b.s}:{b.a}</span>
                    <span className="nm"><span className="ar" dir="rtl">{suras[b.s - 1].name}</span><small>{t.page} {b.page}</small>
                      <small dir="rtl" lang="ar" style={{ fontFamily: "'Amiri Quran', serif", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ayahs[indexOf(b.s, b.a)].t.split(" ").slice(b.a === 1 && b.s !== 1 && b.s !== 9 ? 4 : 0, 9).join(" ")}</small></span>
                  </button>
                  <button className="ib" aria-label={t.bookmarkRemove} onClick={() => update((s) => toggleBookmark(s, b))}><Ic n="close" size={16} /></button>
                </div>
              ))}
            </div>
          )}
          {tab === "progress" && (
            <>
              <div className="cards">
                <div className="card"><div className="ring" style={{ ["--p" as string]: goalPct }}><span>{todayN}/{st.goal}</span></div><div><b>{t.todayGoal}</b><small>{todayN} {t.pagesRead}</small><small>{t.streak}: {streak(st)} {t.days}</small></div></div>
                <div className="card"><div className="ring" style={{ ["--p" as string]: khatmPct }}><span>{khatmPct}%</span></div><div><b>{t.khatm}</b><small>{read}/{PAGES} {t.pagesRead}</small><small>{t.khatmsDone}: {st.khatms}</small></div></div>
                <div className="card wide" style={{ display: "block" }}>
                  <label htmlFor="goal">{t.goalPages}</label>
                  <div className="seg" id="goal" role="group" aria-label={t.goalPages}>{[1, 2, 4, 5, 10, 20].map((n) => <button key={n} className="tab" aria-selected={st.goal === n} onClick={() => update((s) => ({ ...s, goal: n }))}>{n}</button>)}</div>
                  <button className="ib primary" style={{ width: "100%" }} onClick={() => onGo(page)}>{t.continueFrom} {page}</button>
                </div>
                <div className="card wide" style={{ display: "block" }}>
                  <b>{t.reminder}</b>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                    <label style={{ flex: 1 }}><input type="checkbox" checked={st.reminder.on} onChange={(e) => applyReminder(e.target.checked, st.reminder.h, st.reminder.m)} /> {t.reminderOn}</label>
                    <input className="field" style={{ width: 120, margin: 0 }} type="time" aria-label={t.reminderTime} value={hhmm} onChange={(e) => { const [h, m] = e.target.value.split(":").map(Number); if (!Number.isNaN(h)) applyReminder(st.reminder.on, h, m || 0); }} />
                  </div>
                  {(!canNotify() || rmsg) && <small style={{ color: "var(--muted)" }}>{rmsg || t.reminderApp}</small>}
                </div>
              </div>
            </>
          )}
          {tab === "tartil" && <Tartil lang={lang} page={page} focus={focusAyah} prefs={st.prefs} />}
          {tab === "settings" && <SettingsView lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} st={st} update={update} applyReminder={applyReminder} rmsg={rmsg} onIntro={onIntro} openView={(v) => setTab(v)} />}
          {tab === "privacy" && <PrivacyView lang={lang} />}
          {tab === "about" && (
            <div className="about">
              <p>{t.aboutText}</p>
              <h3>{t.source}</h3>
              <p>{t.sourceBody}</p>
              <p><a href="https://tanzil.net" target="_blank" rel="noopener noreferrer">{t.openTanzil}</a> · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a></p>
              <h3>{t.terms}</h3>
              <pre>{LICENSE_BLOCK}</pre>
              <h3>{t.font}</h3>
              <p>{t.fontBody}</p>
              <h3>{t.layout}</h3>
              <p>{t.layoutBody}</p>
              <p><a href="./privacy.html" target="_blank" rel="noopener noreferrer">{t.privacy}</a></p>
              <p style={{ marginTop: 16 }}>{t.by}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

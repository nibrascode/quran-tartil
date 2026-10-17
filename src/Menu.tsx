import { useMemo, useState } from "react";
import { LANGS, T, type Lang } from "./i18n";
import { LICENSE_BLOCK, PAGES, pageOfAyah, pageOfJuz, suras, toArabicDigits, firstSuraOfPage } from "./quran";
import type { Theme } from "./App";
import { Tartil } from "./Tartil";

export type Tab = "surah" | "juz" | "page" | "tartil" | "settings" | "about";
type Props = { tab: Tab; setTab: (t: Tab) => void; lang: Lang; setLang: (l: Lang) => void; theme: Theme; setTheme: (t: Theme) => void; page: number; onGo: (p: number) => void; onClose: () => void };

export function Menu({ tab, setTab, lang, setLang, theme, setTheme, page, onGo, onClose }: Props) {
  const t = T[lang];
  const [q, setQ] = useState("");
  const [num, setNum] = useState(String(page));
  const tabs: Tab[] = ["surah", "juz", "page", "tartil", "settings", "about"];
  const label = (k: Tab) => (k === "surah" ? t.surah : k === "juz" ? t.juz : k === "page" ? t.page : k === "tartil" ? t.tartil : k === "settings" ? t.settings : t.about);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return suras.filter((x) => !s || x.name.includes(s) || x.tname.toLowerCase().includes(s) || String(x.i) === s);
  }, [q]);

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h2>{t.app}</h2><button className="ib" onClick={onClose} aria-label={t.close}>✕</button></div>
        <div className="tabs" role="tablist">
          {tabs.map((k) => <button key={k} role="tab" className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label(k)}</button>)}
        </div>
        <div className="sheet-body">
          {tab === "surah" && (
            <>
              <input className="field" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} />
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
              <label>{t.goPage} (1–{PAGES})</label>
              <input className="field" type="number" inputMode="numeric" min={1} max={PAGES} value={num} onChange={(e) => setNum(e.target.value)} style={{ marginTop: 8 }} />
              <button className="ib primary" type="submit" style={{ width: "100%" }}>{t.go} · {toArabicDigits(Number(num) || 1)}</button>
            </form>
          )}
          {tab === "tartil" && <Tartil lang={lang} page={page} />}
          {tab === "settings" && (
            <>
              <label>{t.language}</label>
              <div className="seg">{LANGS.map((l) => <button key={l.id} className="tab" aria-selected={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</button>)}</div>
              <label>{t.theme}</label>
              <div className="seg">{(["light", "dark", "sepia"] as Theme[]).map((x) => <button key={x} className="tab" aria-selected={theme === x} onClick={() => setTheme(x)}>{t[x]}</button>)}</div>
            </>
          )}
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
              <p style={{ marginTop: 16 }}>{t.by}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

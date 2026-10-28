import { useMemo, useState } from "react";
import { fold, SURAHS } from "@/lib/quran";
import { LANG_META, UI, arabicName, surahLabel, surahSearchBlob, useLocale } from "@/lib/i18n";

export function Home({ onOpen }: { onOpen: (page: number) => void }) {
  const { lang, setLang } = useLocale();
  const t = UI[lang];
  const [q, setQ] = useState("");
  const [settings, setSettings] = useState(false);
  const arUi = lang === "ar";

  const filtered = useMemo(() => {
    const needle = fold(q.trim());
    if (!needle) return SURAHS;
    return SURAHS.filter((s) => fold(surahSearchBlob(s)).includes(needle) || String(s.n) === needle);
  }, [q]);

  return (
    <div className="stage">
      <div className="book chrome">
        <header className="topbar">
          <span className="topbar-side" />
          <div className="topbar-title home-title" dir={arUi ? "rtl" : "ltr"}>
            <strong className={arUi ? "home-ar" : undefined}>{t.title}</strong>
            <span className={arUi ? "home-ar-sub" : undefined}>{t.sub}</span>
          </div>
          <button type="button" className="icon-btn" onClick={() => setSettings(true)} aria-label={t.settings}>
            <Gear />
          </button>
        </header>

        <label className="search">
          <span className="sr">{t.search}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.search}
            enterKeyHint="search"
            dir={arUi ? "rtl" : "ltr"}
          />
        </label>

        <ul className="index-list home-list">
          {filtered.map((s) => (
            <li key={s.n}>
              <button type="button" className="index-row" onClick={() => onOpen(s.page)}>
                <span className="idx">{s.n}</span>
                <span className="index-names" dir={arUi ? "rtl" : "ltr"}>
                  <span className={arUi ? "az quran-name" : "az"}>{surahLabel(s.n, lang)}</span>
                  <span className="ar" dir="rtl" lang="ar">
                    {arUi ? t.ayah(s.ayahs) : arabicName(s)}
                  </span>
                </span>
                <span className="pg">{s.page}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="empty">{t.empty}</li>}
        </ul>

        {settings && (
          <div className="settings-back" onClick={() => setSettings(false)}>
            <div
              className="settings-sheet"
              role="dialog"
              aria-label={t.langTitle}
              dir={arUi ? "rtl" : "ltr"}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="settings-head">
                <h2>{t.langTitle}</h2>
                <button type="button" className="sheet-close" onClick={() => setSettings(false)}>
                  {t.close}
                </button>
              </div>
              <ul className="lang-list">
                {LANG_META.map((item) => {
                  const on = item.id === lang;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={on ? "lang-row on" : "lang-row"}
                        aria-pressed={on}
                        onClick={() => {
                          setLang(item.id);
                          setQ("");
                          setSettings(false);
                        }}
                      >
                        <span className="lang-code">{item.id.toUpperCase()}</span>
                        <span className={item.id === "ar" ? "lang-native quran-name" : "lang-native"} dir={item.id === "ar" ? "rtl" : "ltr"}>
                          {item.native}
                        </span>
                        <span className="lang-mark" aria-hidden="true">
                          {on ? "●" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <a className="lang-row other-views" href="./classic.html" data-testid="other-views">
                <span className="lang-native">Digər görünüşlər (köhnə tətbiq)</span>
                <span className="lang-mark" aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Gear() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 3.1v2.2M12 18.7v2.2M4.9 6.1l1.6 1.4M17.5 16.5l1.6 1.4M3.1 12h2.2M18.7 12h2.2M4.9 17.9l1.6-1.4M17.5 7.5l1.6-1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

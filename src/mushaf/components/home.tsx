import { useMemo, useState } from "react";
import { fold, isMadani, JUZ_PAGES, SURAHS, type SurahMeta } from "@/lib/quran";
import { LANG_META, UI, surahLabel, surahSearchBlob, useLocale } from "@/lib/i18n";

export function Home({ onOpen }: { onOpen: (page: number) => void }) {
  const { lang, setLang } = useLocale();
  const t = UI[lang];
  const [q, setQ] = useState("");
  const [find, setFind] = useState(false);
  const [settings, setSettings] = useState(false);
  const arUi = lang === "ar";

  const filtered = useMemo(() => {
    const needle = fold(q.trim());
    if (!needle) return SURAHS;
    return SURAHS.filter((s) => fold(surahSearchBlob(s)).includes(needle) || String(s.n) === needle);
  }, [q]);
  const rows = useMemo(() => listRows(filtered, q.trim() !== ""), [filtered, q]);

  return (
    <div className="stage">
      <div className="book">
        <header className="topbar">
          <button
            type="button"
            className={find ? "icon-btn gold" : "icon-btn"}
            aria-pressed={find}
            aria-label={t.search}
            onClick={() => {
              setFind((on) => !on);
              if (find) setQ("");
            }}
          >
            <SearchIcon />
          </button>
          <div className="topbar-title home-title" dir={arUi ? "rtl" : "ltr"}>
            <strong className={arUi ? "home-ar" : undefined}>{t.title}</strong>
            <span className={arUi ? "home-ar-sub" : undefined}>{t.sub}</span>
          </div>
          <button type="button" className="icon-btn" onClick={() => setSettings(true)} aria-label={t.settings}>
            <Gear />
          </button>
        </header>

        {find && (
          <label className="search">
            <span className="sr">{t.search}</span>
            <input
              value={q}
              autoFocus
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.search}
              enterKeyHint="search"
              dir={arUi ? "rtl" : "ltr"}
            />
          </label>
        )}

        <ul className="index-list home-list">
          {rows.map((row) =>
            row.k === "juz" ? (
              <li key={`j${row.n}`}>
                <button type="button" className="juz-row" onClick={() => onOpen(row.page)}>
                  <span>{t.juz(row.n)}</span>
                  <span className="pg">{row.page}</span>
                </button>
              </li>
            ) : (
              <li key={row.s.n}>
                <button type="button" className="index-row" onClick={() => onOpen(row.s.page)}>
                  <span className="idx">{row.s.n}</span>
                  <span className="index-names" dir={arUi ? "rtl" : "ltr"}>
                    <span className={arUi ? "az quran-name" : "az"}>{surahLabel(row.s.n, lang)}</span>
                    <span className="place">
                      {isMadani(row.s.n) ? t.medinan : t.meccan}
                      {" — "}
                      {t.ayah(row.s.ayahs)}
                    </span>
                  </span>
                  <span className="pg">{row.s.page}</span>
                </button>
              </li>
            ),
          )}
          {rows.length === 0 && <li className="empty">{t.empty}</li>}
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
              <a className="other-views" href="./yazilar.html">
                Yazı formaları
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type Row =
  | { k: "juz"; n: number; page: number }
  | { k: "surah"; s: SurahMeta };

function listRows(surahs: SurahMeta[], searching: boolean): Row[] {
  if (searching) return surahs.map((s) => ({ k: "surah", s }));
  const rows: Row[] = [
    ...JUZ_PAGES.map((page, i) => ({ k: "juz" as const, n: i + 1, page })),
    ...surahs.map((s) => ({ k: "surah" as const, s })),
  ];
  rows.sort((a, b) => {
    const pa = a.k === "juz" ? a.page : a.s.page;
    const pb = b.k === "juz" ? b.page : b.s.page;
    if (pa !== pb) return pa - pb;
    return a.k === "juz" ? -1 : 1;
  });
  return rows;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M14.8 14.8 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
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

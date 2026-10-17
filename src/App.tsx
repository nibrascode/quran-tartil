import { useEffect, useMemo, useState } from "react";
import { Reader } from "./Reader";
import { Menu, type Tab } from "./Menu";
import { PAGES, firstSuraOfPage, juzOfPage, toArabicDigits } from "./quran";
import { T, detectLang, type Lang } from "./i18n";

export type Theme = "light" | "dark" | "sepia";
const THEME_COLOR: Record<Theme, string> = { light: "#f6efdc", dark: "#0f1412", sepia: "#e9d9b4" };

export function App() {
  const [lang, setLang] = useState<Lang>(detectLang);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "light");
  // First launch starts at page 1 (Al-Fatiha); afterwards the app resumes where you stopped.
  const [page, setPageState] = useState<number>(() => {
    const n = Number(localStorage.getItem("page"));
    return n >= 1 && n <= PAGES ? n : 1;
  });
  const [bars, setBars] = useState(false);
  const [menu, setMenu] = useState<Tab | null>(null);
  const [hint, setHint] = useState(() => !localStorage.getItem("hinted"));
  const t = T[lang];

  const setPage = (p: number) => { setPageState(p); localStorage.setItem("page", String(p)); if (hint) { setHint(false); localStorage.setItem("hinted", "1"); } };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("lang", lang);
  }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  }, [theme]);
  useEffect(() => { document.title = t.app; }, [t.app]);

  const sura = useMemo(() => firstSuraOfPage(page), [page]);

  return (
    <div className="app">
      <div className={"bar top" + (bars ? "" : " hidden")}>
        <button className="ib" aria-label={t.menu} onClick={() => setMenu("surah")}>☰</button>
        <div className="title"><b>{sura.name}</b> · {t.juz} {juzOfPage(page)} · {t.page} {page}</div>
        <button className="ib" aria-label={t.settings} onClick={() => setMenu("settings")}>⚙</button>
      </div>
      <Reader page={page} setPage={setPage} onCenterTap={() => setBars((b) => !b)} />
      <div className={"bar bottom" + (bars ? "" : " hidden")}>
        <input className="slider" type="range" min={1} max={PAGES} value={page} aria-label={t.page} onChange={(e) => setPage(Number(e.target.value))} />
        <div className="row"><span>{toArabicDigits(1)}</span><span>{t.page} {page} / {PAGES}</span><span>{toArabicDigits(PAGES)}</span></div>
      </div>
      {hint && <div className="hint">{t.hint}</div>}
      {menu && <Menu tab={menu} setTab={setMenu} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} page={page} onGo={(p) => { setPage(p); setMenu(null); setBars(false); }} onClose={() => setMenu(null)} />}
    </div>
  );
}

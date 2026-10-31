import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import "./styles.css";
import { Home } from "./Home";
import { Menu, type Tab } from "./Menu";
import { useSettings } from "./store";
import { type Lang } from "./i18n";
import { PAGES } from "./quran";

type Theme = "light" | "dark" | "sepia";
const THEME_COLOR: Record<Theme, string> = { light: "#f6efdc", dark: "#0f1412", sepia: "#e9d9b4" };

function go(p: number) {
  location.href = "./sehife.html?p=" + p;
}

function pickLang(): Lang {
  const saved = localStorage.getItem("lang") as Lang | null;
  if (saved === "az" || saved === "en" || saved === "tr" || saved === "ar" || saved === "ru") return saved;
  const n = (navigator.language || "az").slice(0, 2).toLowerCase();
  if (n === "az" || n === "tr" || n === "ar" || n === "ru") return n;
  return "az";
}

function Giris() {
  const [lang, setLang] = useState<Lang>(pickLang);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "dark");
  const [st, update] = useSettings();
  const [page] = useState(() => {
    const n = Number(localStorage.getItem("page"));
    return n >= 1 && n <= PAGES ? n : 1;
  });
  const [menu, setMenu] = useState<Tab | null>(null);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  }, [lang, theme]);
  return (
    <div className="app homing">
      <Home
        lang={lang}
        st={st}
        page={page}
        plain
        onResume={() => go(page)}
        onOpen={go}
        onMic={() => go(page)}
        onAyah={(p) => go(p)}
        onTab={setMenu}
      />
      {menu && (
        <Menu
          tab={menu}
          setTab={setMenu}
          lang="az"
          uiLang={lang}
          setLang={setLang}
          theme={theme}
          setTheme={setTheme}
          page={page}
          st={st}
          update={update}
          focusAyah={null}
          startQueue={() => {}}
          say={() => {}}
          onGo={(p) => go(p)}
          onClose={() => setMenu(null)}
          onIntro={() => setMenu(null)}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Giris />);

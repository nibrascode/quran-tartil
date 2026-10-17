import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Reader } from "./Reader";
import { Menu, type Tab } from "./Menu";
import { Onboarding } from "./Onboarding";
import { PAGES, ayahs, firstSuraOfPage, indexOf, juzOfPage, suras, toArabicDigits } from "./quran";
import { T, detectLang, type Lang } from "./i18n";
import { useRecite } from "./useRecite";
import { speechSupported } from "./speech";
import { markRead, toggleBookmark, useSettings } from "./store";

export type Theme = "light" | "dark" | "sepia";
const THEME_COLOR: Record<Theme, string> = { light: "#f6efdc", dark: "#0f1412", sepia: "#e9d9b4" };
export type Sel = { s: number; a: number } | null;

/** Arabic text only: ayah in ornate brackets + sura name and number (no translation). */
export function ayahShareText(s: number, a: number): string {
  const x = ayahs[indexOf(s, a)];
  const body = a === 1 && s !== 1 && s !== 9 ? x.t.split(" ").slice(4).join(" ") : x.t;
  return `﴿${body}﴾\n[سورة ${suras[s - 1].name}: ${toArabicDigits(a)}]\nQuran text: Tanzil Project (tanzil.net)`;
}

export function App() {
  const [lang, setLang] = useState<Lang>(detectLang);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("theme") as Theme) || "light");
  const [st, update] = useSettings();
  const [page, setPageState] = useState<number>(() => { const n = Number(localStorage.getItem("page")); return n >= 1 && n <= PAGES ? n : 1; });
  const [bars, setBars] = useState(false);
  const [menu, setMenu] = useState<Tab | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  const [toast, setToast] = useState("");
  const [focusAyah, setFocusAyah] = useState<Sel>(null);
  const t = T[lang];
  const rc = useRecite(page, (p) => setPage(p), st.prefs);

  const setPage = (p: number) => { setPageState(p); localStorage.setItem("page", String(p)); setSel(null); };
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1600); };

  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"; localStorage.setItem("lang", lang); }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme; localStorage.setItem("theme", theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  }, [theme]);
  useEffect(() => { document.title = t.app; }, [t.app]);

  // a page counts as read after a short dwell (khatm + daily goal)
  useEffect(() => {
    if (!st.onboarded) return;
    const id = setTimeout(() => update((s) => markRead(s, page)), 3500);
    return () => clearTimeout(id);
  }, [page, st.onboarded, update]);

  // selection / bookmark marks are applied on the DOM so the fitted text is not re-laid out
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".ayah").forEach((el) => {
      const s = Number(el.dataset.s), a = Number(el.dataset.a);
      el.classList.toggle("sel", !!sel && sel.s === s && sel.a === a);
      el.classList.toggle("bm", st.bookmarks.some((b) => b.s === s && b.a === a));
    });
  });

  // keep screen on (native plugin in the app, Screen Wake Lock in browsers)
  useEffect(() => {
    if (!st.prefs.keepAwake) return;
    let lock: { release(): Promise<void> } | null = null, dead = false;
    const acquire = async () => {
      try {
        if (Capacitor.isNativePlatform()) { const { KeepAwake } = await import("@capacitor-community/keep-awake"); await KeepAwake.keepAwake(); }
        else if ("wakeLock" in navigator) lock = await (navigator as any).wakeLock.request("screen");
      } catch { /* not supported */ }
    };
    acquire();
    const vis = () => { if (!dead && document.visibilityState === "visible" && !Capacitor.isNativePlatform()) acquire(); };
    document.addEventListener("visibilitychange", vis);
    return () => {
      dead = true; document.removeEventListener("visibilitychange", vis);
      lock?.release().catch(() => {});
      if (Capacitor.isNativePlatform()) import("@capacitor-community/keep-awake").then(({ KeepAwake }) => KeepAwake.allowSleep()).catch(() => {});
    };
  }, [st.prefs.keepAwake]);

  const sura = useMemo(() => firstSuraOfPage(page), [page]);
  const isBm = sel ? st.bookmarks.some((b) => b.s === sel.s && b.a === sel.a) : false;

  async function copy() {
    if (!sel) return;
    const text = ayahShareText(sel.s, sel.a);
    try { await navigator.clipboard.writeText(text); } catch {
      try { const { Clipboard } = await import("@capacitor/clipboard"); await Clipboard.write({ string: text }); } catch { /* ignore */ }
    }
    say(t.copied);
  }
  async function share() {
    if (!sel) return;
    const text = ayahShareText(sel.s, sel.a);
    try {
      if (Capacitor.isNativePlatform()) { const { Share } = await import("@capacitor/share"); await Share.share({ text }); }
      else if (navigator.share) await navigator.share({ text });
      else await copy();
    } catch { /* user cancelled */ }
  }

  return (
    <div className={"app" + (rc.mode === "on" || rc.mode === "paused" ? " reciting" : "")}>
      <div className={"bar top" + (bars ? "" : " hidden")} aria-hidden={!bars}>
        <button className="ib" aria-label={t.menu} onClick={() => setMenu("surah")}>☰</button>
        <div className="title"><b>{sura.name}</b> · {t.juz} {juzOfPage(page)} · {t.page} {page}</div>
        <button className="ib" aria-label={t.progress} onClick={() => setMenu("progress")}>◔</button>
        <button className="ib" aria-label={t.searchTab} onClick={() => setMenu("search")}>⌕</button>
        <button className="ib" aria-label={t.settings} onClick={() => setMenu("settings")}>⚙</button>
      </div>
      <Reader scale={st.prefs.fontScale} animate={st.prefs.flip === "flip"} page={page} setPage={setPage} onTap={(a) => { if (a) setSel(sel && sel.s === a.s && sel.a === a.a ? null : a); else { setSel(null); setBars((b) => !b); } }} />
      {rc.mode !== "off" ? (
        <div className="rstrip" role="region" aria-label={t.reciteMic}>
          <div className="rinfo" aria-live="polite">
            <b>{rc.mode === "on" ? "● " + t.recitingNow : rc.mode === "paused" ? "❚❚ " + t.pausedNow : t.reviewNow}</b>
            <small>{rc.closedAyahs}/{rc.totalAyahs} {t.reciteAyahs} · {t.score}: {rc.score}%</small>
          </div>
          {rc.mode === "on" && <button className="ib" onClick={rc.pause}>❚❚ {t.recitePause}</button>}
          {rc.mode === "paused" && <button className="ib primary" onClick={rc.resume}>▶ {t.reciteResume}</button>}
          {(rc.mode === "on" || rc.mode === "paused") && <button className="ib danger" onClick={rc.stop}>■ {t.reciteStop}</button>}
          {rc.mode === "review" && <button className="ib" onClick={rc.close}>✕ {t.reciteClose}</button>}
        </div>
      ) : speechSupported() ? null : null}
      <div className={"bar bottom" + (bars && rc.mode === "off" ? "" : " hidden")} aria-hidden={!bars || rc.mode !== "off"}>
        <div className="brow">
          <button className="ib primary mic" aria-label={t.reciteMic} onClick={rc.begin}>🎙 {t.reciteStart}</button>
          <input className="slider" type="range" min={1} max={PAGES} value={page} aria-label={t.page} aria-valuetext={t.pageOf.replace("{n}", String(page)).replace("{t}", String(PAGES))} onChange={(e) => setPage(Number(e.target.value))} />
        </div>
        <div className="row"><span>{toArabicDigits(1)}</span><span>{t.page} {page} / {PAGES}</span><span>{toArabicDigits(PAGES)}</span></div>
      </div>
      {rc.err && <div className="toast" role="alert" onClick={() => {}}>{t.reciteFail}: {rc.err}</div>}
      {sel && (
        <div className="actions" role="toolbar" aria-label={t.selectedAyah + " " + sel.s + ":" + sel.a}>
          <button className="ib" onClick={copy}>⧉ {t.copy}</button>
          <button className="ib" onClick={share}>⤴ {t.share}</button>
          <button className="ib" aria-pressed={isBm} onClick={() => update((s) => toggleBookmark(s, { s: sel.s, a: sel.a, page }))}>{isBm ? "★" : "☆"} {t.bookmarkAdd}</button>
          <button className="ib" onClick={() => { setFocusAyah(sel); setMenu("tartil"); }}>🎙</button>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
      {!st.onboarded && <Onboarding lang={lang} setLang={setLang} onDone={() => update((s) => ({ ...s, onboarded: true }))} />}
      {menu && (
        <Menu tab={menu} setTab={setMenu} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} page={page} st={st} update={update} focusAyah={focusAyah}
          onGo={(p, a) => { setPage(p); if (a) setSel(a); setMenu(null); setBars(false); }} onClose={() => setMenu(null)} onIntro={() => { setMenu(null); update((s) => ({ ...s, onboarded: false })); }} />
      )}
    </div>
  );
}

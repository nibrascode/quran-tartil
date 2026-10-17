import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Reader, useSpread } from "./Reader";
import { Menu, type Tab } from "./Menu";
import { Onboarding } from "./Onboarding";
import { PAGES, suraLabel, ayahs, firstSuraOfPage, indexOf, juzOfPage, suras, toArabicDigits } from "./quran";
import { T, detectLang, type Lang } from "./i18n";
import { useRecite } from "./useRecite";
import { drawBands } from "./band";
import { Ic } from "./Icons";
import { haptic, setHaptics } from "./haptic";
import { pageOfAyah } from "./quran";
import { markRead, toggleBookmark, useSettings, dayKey } from "./store";
import { mergeWeak, clearWeak, weakAyahs, addCards, review, dueKeys, PASS_SCORE } from "./practice";

export type Theme = "light" | "dark" | "sepia";
const THEME_COLOR: Record<Theme, string> = { light: "#f6efdc", dark: "#0f1412", sepia: "#e9d9b4" };
export type Sel = { s: number; a: number } | null;
export type Queue = { kind: "hifz" | "weak" | "loop"; keys: string[]; i: number; started: boolean };

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
  const [mist, setMist] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const shiftRef = useRef(0);
  const t = T[lang];
  const spread = useSpread();
  const [pq, setPq] = useState<Queue | null>(null);
  const cleared = useRef<Set<string>>(new Set());
  const pqRef = useRef<Queue | null>(null);
  pqRef.current = pq;
  const onDone = (key: string, scores: number[]) => {
    const q = pqRef.current; if (!q) return;
    const last = scores[scores.length - 1] ?? 0, today = dayKey();
    if (q.kind === "hifz") { update((x) => ({ ...x, hifz: review(x.hifz, key, last, today) })); say(last >= PASS_SCORE ? t.hifzPass : t.hifzFail); }
    if (last >= (q.kind === "hifz" ? PASS_SCORE : 90)) { cleared.current.add(key); update((x) => ({ ...x, weak: clearWeak(x.weak, key) })); }
    if (q.i + 1 < q.keys.length) setPq({ ...q, i: q.i + 1, started: false });
    else { setPq(null); if (q.kind === "hifz") setTimeout(() => say(t.hifzDone), 1700); }
  };
  const rc = useRecite(page, (p) => setPage(p), st.prefs, onDone);

  const setPage = (p: number) => { setPageState(p); localStorage.setItem("page", String(p)); setSel(null); };
  useEffect(() => { setHaptics(st.prefs.haptics); }, [st.prefs.haptics]);
  useEffect(() => {
    const f = (e: PointerEvent) => { if ((e.target as HTMLElement).closest?.("button:not(:disabled)")) haptic("light"); };
    document.addEventListener("pointerdown", f, true);
    return () => document.removeEventListener("pointerdown", f, true);
  }, []);
  const prevHeld = useRef(false), prevClosed = useRef(0);
  useEffect(() => {
    if (rc.held && !prevHeld.current) haptic("warn");
    prevHeld.current = rc.held;
    if (rc.closedAyahs > prevClosed.current) haptic("ok");
    prevClosed.current = rc.closedAyahs;
  }, [rc.held, rc.closedAyahs]);
  // practice queue: go to the ayah's page, then start reciting it (repeat count / hidden text for hifz)
  useEffect(() => {
    if (!pq || pq.started) return;
    const [ps, pa] = pq.keys[pq.i].split(":").map(Number);
    const target = pageOfAyah(ps, pa);
    if (rc.mode === "review") { rc.close(); return; }
    if (rc.mode !== "off") return;
    if (page !== target) { setPage(target); return; }
    setPq({ ...pq, started: true });
    rc.begin({ s: ps, a: pa }, { repeat: pq.kind === "hifz" ? 1 : pq.kind === "weak" ? 2 : st.prefs.repeat });
  }); // eslint-disable-line
  // leaving recite mode by hand ends the practice queue
  useEffect(() => { if (pq?.started && (rc.mode === "review" || rc.mode === "off")) setPq(null); }, [rc.mode]); // eslint-disable-line
  // remember mistakes as weak words
  const prevMode = useRef(rc.mode);
  useEffect(() => {
    const was = prevMode.current; prevMode.current = rc.mode;
    if ((was === "on" || was === "paused") && (rc.mode === "review" || rc.mode === "off")) {
      const ev = rc.mistakes.filter((m) => !cleared.current.has(m.key));
      cleared.current.clear();
      if (ev.length) update((x) => ({ ...x, weak: mergeWeak(x.weak, ev, dayKey()) }));
    }
  }, [rc.mode]); // eslint-disable-line
  const startQueue = (kind: Queue["kind"], keys: string[]) => { if (!keys.length) return; setMenu(null); setSel(null); setBars(false); setPq({ kind, keys, i: 0, started: false }); };
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
    const pair = spread ? (page % 2 ? page + 1 : page - 1) : 0;
    const id = setTimeout(() => update((s) => { const r = markRead(s, page); return pair >= 1 && pair <= PAGES ? markRead(r, pair) : r; }), 3500);
    return () => clearTimeout(id);
  }, [page, st.onboarded, update, spread]);

  // bookmark marks on the DOM (fitted text is not re-laid out)
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".ayah").forEach((el) => {
      const s = Number(el.dataset.s), a = Number(el.dataset.a);
      el.classList.toggle("bm", st.bookmarks.some((b) => b.s === s && b.a === a));
    });
  });

  // selected ayah: one continuous band per line; the page slides up so the sheet never covers the ayah
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const info = drawBands(page, sel, shiftRef.current);
      let d = 0;
      const sh = sheetRef.current;
      if (info && sh) {
        const limit = window.innerHeight - sh.offsetHeight - 14;
        const rd = document.querySelector(".reader")?.getBoundingClientRect();
        d = Math.max(0, info.bottom - limit);
        if (rd) d = Math.min(d, Math.max(0, info.top - rd.top - 10));
      }
      shiftRef.current = d;
      root.style.setProperty("--shift", -d + "px");
    };
    if (!sel) { drawBands(page, null); shiftRef.current = 0; root.style.setProperty("--shift", "0px"); return; }
    const ids = [requestAnimationFrame(() => requestAnimationFrame(apply))];
    const t1 = setTimeout(apply, 350);
    document.fonts?.ready.then(apply);
    window.addEventListener("resize", apply);
    return () => { ids.forEach(cancelAnimationFrame); clearTimeout(t1); window.removeEventListener("resize", apply); };
  }, [sel, page, mist, lang]);

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
    <div className={"app" + (rc.mode === "on" || rc.mode === "paused" ? " reciting" : "") + (st.prefs.hide || (pq?.kind === "hifz" && pq.started) ? " hide-ayahs" : "")}>
      <div className={"bar top" + (bars ? "" : " hidden")} aria-hidden={!bars}>
        <button className="ib" aria-label={t.menu} onClick={() => setMenu("surah")}><Ic n="menu" /></button>
        <div className="title"><b>{sura.name}</b> · {t.juz} {juzOfPage(page)} · {t.page} {page}</div>
        <button className="ib" aria-label={t.progress} onClick={() => setMenu("progress")}><Ic n="progress" /></button>
        <button className="ib" aria-label={t.searchTab} onClick={() => setMenu("search")}><Ic n="search" /></button>
        <button className="ib" aria-label={t.settings} onClick={() => setMenu("settings")}><Ic n="sliders" /></button>
      </div>
      <Reader scale={st.prefs.fontScale} animate={st.prefs.flip === "flip"} page={page} setPage={setPage} onTap={(a, pg) => { setMist(false); if (a && pg && pg !== page) { setPageState(pg); localStorage.setItem("page", String(pg)); setSel(a); return; } if (a) setSel(sel && sel.s === a.s && sel.a === a.a ? null : a); else { setSel(null); setBars((b) => !b); } }} />
      {rc.mode !== "off" && (
        <div className="rstrip" role="region" aria-label={t.reciteMic}>
          <div className="rinfo" aria-live="polite">
            <b className={"st " + (rc.mode === "on" ? (rc.held ? "warn" : "live") : rc.mode)}><Ic n={rc.mode === "on" ? (rc.held ? "warn" : "dot") : rc.mode === "paused" ? "pause" : "check"} size={16} fill={rc.mode === "on" && !rc.held} />{rc.mode === "on" ? (rc.held ? t.reciteHold : t.recitingNow) : rc.mode === "paused" ? t.pausedNow : t.reviewNow}</b>
            <small>{pq?.started ? <>{pq.kind === "loop" || pq.kind === "weak" ? t.repeatStep.replace("{i}", String(Math.min(rc.rep + 1, pq.kind === "weak" ? 2 : st.prefs.repeat))).replace("{n}", String(pq.kind === "weak" ? 2 : st.prefs.repeat)) + " · " : ""}{pq.keys.length > 1 ? t.practiceStep.replace("{i}", String(pq.i + 1)).replace("{n}", String(pq.keys.length)) + " · " : ""}{pq.keys[pq.i]}</> : <>{rc.closedAyahs}/{rc.totalAyahs} {t.reciteAyahs} · {t.score}: {rc.score}%</>}</small>
          </div>
          {(rc.mode === "on" || rc.mode === "paused") && <button className="ib danger" onClick={rc.stop}><Ic n="stop" size={16} fill />{t.reciteStop}</button>}
          {rc.mode === "review" && <button className="ib" onClick={rc.close}><Ic n="close" size={16} />{t.reciteClose}</button>}
        </div>
      )}
      <div className="dock" role="toolbar" aria-label={t.reciteMic}>
        <button className="dbtn pill" onClick={() => { setSel(null); setMist((m) => !m); }} aria-expanded={mist}>{t.dockMistakes}{rc.mistakes.length > 0 && <i className="badge">{rc.mistakes.reduce((n, m) => n + m.n, 0)}</i>}</button>
        <button className="dbtn" aria-label={t.dockSurah} onClick={() => setMenu("surah")}><Ic n="book" /></button>
        <button className={"dbtn" + (st.prefs.hide ? " on" : "")} aria-pressed={st.prefs.hide} aria-label={t.dockHide} onClick={() => { const v = !st.prefs.hide; update((x) => ({ ...x, prefs: { ...x.prefs, hide: v } })); say(v ? t.hideOnMsg : t.hideOffMsg); }}><Ic n={st.prefs.hide ? "eyeoff" : "eye"} /></button>
        <button className="dbtn mirror" aria-label={rc.mode === "on" || rc.mode === "paused" ? t.dockPrevAyah : t.dockPrev} onClick={() => (rc.mode === "on" || rc.mode === "paused" ? rc.back() : page > 1 && setPage(page - 1))}><Ic n="prev" /></button>
        <button className="dbtn mirror" aria-label={rc.mode === "on" || rc.mode === "paused" ? t.dockRestart : t.dockToSurah} onClick={() => (rc.mode === "on" || rc.mode === "paused" ? rc.restart() : setPage(suras[sura.i - 1] ? pageOfAyah(sura.i, 1) : page))}><Ic n="back2" /></button>
        <button className={"mic big" + (rc.mode === "on" ? " live" : "")} aria-label={rc.mode === "on" ? t.micPause : rc.mode === "paused" ? t.micResume : t.micStart}
          onClick={() => (rc.mode === "on" ? rc.pause() : rc.mode === "paused" ? rc.resume() : rc.begin())}><Ic n={rc.mode === "on" ? "pause" : "mic"} size={30} /></button>
      </div>
      {rc.err && <div className="toast" role="alert">{t.reciteFail}: {rc.err}</div>}
      {sel && !mist && (
        <div className="asheet" ref={sheetRef} role="region" aria-label={t.selectedAyah + " " + sel.s + ":" + sel.a}>
          <div className="ahead">
            <span className="ref">{sel.s}:{sel.a}</span>
            <b>{t.ayahTitle.replace("{n}", suraLabel(sel.s, lang === "ar")).replace("{a}", String(sel.a))}</b>
            <button className="x" aria-label={t.closeA} onClick={() => setSel(null)}><Ic n="close" size={20} /></button>
          </div>
          <button className="arow" aria-pressed={isBm} onClick={() => update((s) => toggleBookmark(s, { s: sel.s, a: sel.a, page }))}><Ic n="bookmark" fill={isBm} />{isBm ? t.bookmarkRemove : t.bookmarkAdd}</button>
          <button className="arow" onClick={copy}><Ic n="copy" />{t.copy}</button>
          <button className="arow" onClick={share}><Ic n="share" />{t.share}</button>
          <button className="arow" onClick={() => { const a = sel; setSel(null); rc.begin(a); }}><Ic n="mic" />{t.reciteThisAyah}</button>
          <button className="arow" onClick={() => startQueue("loop", [sel.s + ":" + sel.a])}><Ic n="repeat" />{t.repeatAyah.replace("{n}", String(st.prefs.repeat))}</button>
          <button className="arow" aria-pressed={!!st.hifz[sel.s + ":" + sel.a]} onClick={() => { const k = sel.s + ":" + sel.a; update((x) => ({ ...x, hifz: x.hifz[k] ? (({ [k]: _d, ...r }) => r)(x.hifz) : addCards(x.hifz, [k], dayKey()) })); }}><Ic n="layers" fill={!!st.hifz[sel.s + ":" + sel.a]} />{st.hifz[sel.s + ":" + sel.a] ? t.hifzIn : t.hifzAddAyah}</button>
        </div>
      )}
      {mist && (
        <div className="asheet" ref={sheetRef} role="region" aria-label={t.mistakesTitle}>
          <div className="ahead"><b>{t.mistakesTitle}</b><button className="x" aria-label={t.closeA} onClick={() => setMist(false)}><Ic n="close" size={20} /></button></div>
          <div className="mlist">
            {rc.mistakes.length === 0 && <p className="mnone">{t.mistakesNone}</p>}
            {rc.mistakes.map((m) => {
              const [ms, ma] = m.key.split(":").map(Number);
              return (
                <button key={m.key + m.word} className="arow mrow" onClick={() => { setMist(false); setPage(pageOfAyah(ms, ma)); setSel({ s: ms, a: ma }); }}>
                  <span className="ref">{m.key}</span><span className="mw" lang="ar" dir="rtl">{m.word}</span><small>{suraLabel(ms, lang === "ar")}</small>{m.n > 1 && <i className="badge">{t.mistakeTimes.replace("{n}", String(m.n))}</i>}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
      {!st.onboarded && <Onboarding lang={lang} setLang={setLang} onDone={() => update((s) => ({ ...s, onboarded: true }))} />}
      {menu && (
        <Menu startQueue={startQueue} say={say} tab={menu} setTab={setMenu} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} page={page} st={st} update={update} focusAyah={focusAyah}
          onGo={(p, a) => { setPage(p); if (a) setSel(a); setMenu(null); setBars(false); }} onClose={() => setMenu(null)} onIntro={() => { setMenu(null); update((s) => ({ ...s, onboarded: false })); }} />
      )}
    </div>
  );
}

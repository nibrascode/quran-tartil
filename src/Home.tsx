import { useMemo } from "react";
import { T, type Lang } from "./i18n";
import { Ic } from "./Icons";
import { ayahs, stripBasmala, PAGES, firstSuraOfPage, juzOfPage, suraLabel, pageOfAyah } from "./quran";
import { dueKeys } from "./practice";
import { dayKey, streak, type Settings } from "./store";
import { ayahOfDayIndex, partOfDay, pct } from "./home";
import type { Tab } from "./Menu";

type Props = {
  lang: Lang; st: Settings; page: number;
  onResume: () => void; onMic: () => void; onAyah: (p: number, a: { s: number; a: number }) => void; onTab: (t: Tab) => void;
};
const fmt = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

function Ring({ value, size = 92, children }: { value: number; size?: number; children?: React.ReactNode }) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r;
  return (
    <div className="hring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="trk" cx={size / 2} cy={size / 2} r={r} />
        <circle className="val" cx={size / 2} cy={size / 2} r={r} strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="hring-in">{children}</div>
    </div>
  );
}

function ayahOfDay(day: string) {
  const x = ayahs[ayahOfDayIndex(day, ayahs.length)];
  return { s: x.s, a: x.a, text: x.a === 1 ? stripBasmala(x.t) : x.t };
}

export function Home({ lang, st, page, onResume, onMic, onAyah, onTab }: Props) {
  const t = T[lang];
  const today = dayKey();
  const hour = new Date().getHours();
  const greet = { morning: t.hMorning, afternoon: t.hAfternoon, evening: t.hEvening }[partOfDay(hour)];
  const sura = firstSuraOfPage(page);
  const ad = useMemo(() => ayahOfDay(today), [today]);
  const donePages = st.today === today ? st.dayPages.length : 0;
  const goalPct = pct(donePages, st.goal);
  const sk = streak(st);
  const khatmPct = pct(st.visited.length, PAGES);
  const due = dueKeys(st.hifz, today).length;
  const weak = st.weak.length;
  const icon = import.meta.env.BASE_URL + "icon-192.png";
  const act = (k: string, ic: string, title: string, sub: string, on: () => void, id: string) => (
    <button key={k} id={id} className="hq" onClick={on}><span className="hq-i"><Ic n={ic} size={22} /></span><b>{title}</b><small>{sub}</small></button>
  );
  return (
    <main className="home" aria-label={t.hHome}>
      <div className="home-in">
        <header className="hhead" style={{ ["--i" as string]: 0 }}>
          <img src={icon} alt="" width={52} height={52} />
          <div><small lang="ar" dir="rtl">{t.hSalaam}</small><h1>{greet}</h1></div>
          <button className="hset" aria-label={t.settings} onClick={() => onTab("settings")}><Ic n="sliders" /></button>
        </header>

        <button className="hcont" id="h-continue" style={{ ["--i" as string]: 1 }} onClick={onResume}>
          <span className="hc-k">{t.hContinue}</span>
          <span className="hc-t" lang="ar" dir="rtl">{sura.name}</span>
          <span className="hc-s">{lang === "ar" ? "" : sura.tname + " · "}{t.juz} {juzOfPage(page)} · {fmt(t.hPageOf, { p: page, n: PAGES })}</span>
          <span className="hbar" role="progressbar" aria-valuenow={khatmPct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: khatmPct + "%" }} /></span>
          <span className="hc-f"><small>{fmt(t.hKhatmBar, { n: khatmPct })}</small><em>{t.hResume}<Ic n="chev" size={18} /></em></span>
        </button>

        <button className="hayah" id="h-ayah" style={{ ["--i" as string]: 2 }} onClick={() => onAyah(pageOfAyah(ad.s, ad.a), { s: ad.s, a: ad.a })} aria-label={t.hAyahDay + ": " + suraLabel(ad.s, true) + " " + ad.a}>
          <span className="ha-k"><Ic n="spark" size={16} />{t.hAyahDay}</span>
          <span className="ha-t" lang="ar" dir="rtl">﴿{ad.text}﴾</span>
          <span className="ha-f"><span lang="ar" dir="rtl">{suraLabel(ad.s, true)} : {ad.a}</span><em>{t.hTapOpen}</em></span>
        </button>

        <div className="hrow" style={{ ["--i" as string]: 3 }}>
          <button className="hcard" id="h-goal" onClick={() => onTab("progress")}>
            <Ring value={goalPct} size={84}><b>{donePages}<small>/{st.goal}</small></b></Ring>
            <span className="hc-l"><b>{t.hGoal}</b><small>{goalPct >= 100 ? t.hGoalDone : fmt(t.hGoalOf, { n: donePages, g: st.goal })}</small>
              <span className={"hstreak" + (sk ? " on" : "")}><Ic n="flame" size={16} fill={sk > 0} />{sk ? fmt(t.hStreak, { n: sk }) : t.hStreakNone}</span></span>
          </button>
          <button className="hcard hk" id="h-khatm" onClick={() => onTab("progress")}>
            <Ring value={khatmPct} size={84}><b>{khatmPct}<small>%</small></b></Ring>
            <span className="hc-l"><b>{t.hKhatm}</b><small>{fmt(t.hPagesLeft, { n: PAGES - st.visited.length })}</small><small>{fmt(t.hKhatmSub, { k: st.khatms })}</small></span>
          </button>
        </div>

        <h2 className="hsec" style={{ ["--i" as string]: 4 }}>{t.hQuick}</h2>
        <div className="hgrid" style={{ ["--i" as string]: 5 }}>
          <button className="hq hq-main" id="h-mic" onClick={onMic}><span className="hq-i"><Ic n="mic" size={26} /></span><span className="hq-tx"><b>{t.hStart}</b><small>{t.hStartSub}</small></span></button>
          {act("p", "layers", t.hPractice, due ? fmt(t.hDue, { n: due }) : t.hNoDue, () => onTab("practice"), "h-practice")}
          {act("sr", "book", t.surah, t.hJump, () => onTab("surah"), "h-surah")}
          {act("pg", "compass", t.page, t.hJump, () => onTab("page"), "h-page")}
          {act("jz", "flag", t.juz, t.hJump, () => onTab("juz"), "h-juz")}
          {act("bm", "bookmark", t.bookmarks, String(st.bookmarks.length), () => onTab("bookmarks"), "h-bookmarks")}
          {act("ms", "warn", t.hMistakes, weak ? fmt(t.hWeak, { n: weak }) : t.hNoWeak, () => onTab("practice"), "h-mistakes")}
          {act("se", "search", t.searchTab, "", () => onTab("search"), "h-search")}
          {act("st", "sliders", t.settings, t.theme + " · " + t.language, () => onTab("settings"), "h-settings")}
        </div>
        <p className="hfoot">{t.by}</p>
      </div>
    </main>
  );
}

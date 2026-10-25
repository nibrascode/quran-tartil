import { useMemo, useState } from "react";
import { suras } from "./quran";
import { AZ_NAMES } from "./pageChrome";
import meta from "./data/meta.json";
import { T, type Lang } from "./i18n";
import { Ic } from "./Icons";
import { indexOf, toArabicDigits, ayahs, stripBasmala, PAGES, firstSuraOfPage, juzOfPage, suraLabel, pageOfAyah } from "./quran";
import { dueKeys } from "./practice";
import { dayKey, streak, type Settings } from "./store";
import { ayahOfDayIndex, partOfDay, pct } from "./home";
import type { Tab } from "./Menu";

type Props = {
  lang: Lang; st: Settings; page: number;
  onResume: () => void; onOpen: (p: number) => void; onMic: () => void; onAyah: (p: number, a: { s: number; a: number }) => void; onTab: (t: Tab) => void;
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

export function Home({ lang, st, page, onResume, onOpen, onMic, onAyah, onTab }: Props) {
  const [more, setMore] = useState(() => localStorage.getItem("qt.hmore") === "1");
  const [tab, setTabS] = useState<HT>(() => (localStorage.getItem("qt.htab") as HT) || "s");
  const L = HL[lang] || HL.en;
  const ar = lang === "ar";
  const num = (n: number) => (ar ? toArabicDigits(n) : String(n));
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
  const setTab = (x: HT) => { setTabS(x); localStorage.setItem("qt.htab", x); };
  const toggleMore = () => { const v = !more; setMore(v); localStorage.setItem("qt.hmore", v ? "1" : "0"); };
  const nm = (i: number) => (lang === "az" ? AZ_NAMES[i - 1] : ar ? suras[i - 1].name : suras[i - 1].tname);
  return (
    <main className="home home2" aria-label={t.hHome} dir={ar ? "rtl" : "ltr"}>
      <header className="h2bar">
        <span className="h2logo" aria-hidden="true"><Star size={40} /><i>۞</i></span>
        <h1>{L.title}</h1>
        <button className="h2ib" aria-label={t.hContinue} onClick={onResume}><Ic n="book" /></button>
        <button className="h2ib" aria-label={t.searchTab} onClick={() => onTab("search")}><Ic n="search" /></button>
        <button className="h2ib" aria-label={t.settings} onClick={() => onTab("settings")}><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor" /><circle cx="12" cy="12" r="2" fill="currentColor" /><circle cx="12" cy="19" r="2" fill="currentColor" /></svg></button>
      </header>
      <div className="h2quick">
        <button className="h2cont" id="h-continue" onClick={onResume}><span className="h2c-k">{t.hContinue}</span><b>{nm(sura.i)}</b><small>{t.juz} {num(juzOfPage(page))} · {t.page} {num(page)}</small></button>
        <button className="h2mic" id="h-mic" aria-label={t.hStart} onClick={onMic}><Ic n="mic" size={24} /></button>
        <button className={"h2more" + (more ? " on" : "")} aria-expanded={more} onClick={toggleMore}>{L.more}<Ic n="chev" size={16} /></button>
      </div>
      {more && <div className="home-in h2dash">
        <button className="hcont" style={{ ["--i" as string]: 1 }} onClick={onResume}>
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
      </div>}
      <nav className="h2tabs" role="tablist">
        {(["s", "j", "p"] as HT[]).map((x) => <button key={x} role="tab" aria-selected={tab === x} className={"h2tab" + (tab === x ? " on" : "")} onClick={() => setTab(x)}>{L.tabs[x]}</button>)}
        <span className="h2ul" style={{ ["--x" as string]: ["s", "j", "p"].indexOf(tab) }} aria-hidden="true"><i /></span>
      </nav>
      <div className="h2list">
        {tab === "s" && JUZ.map((jz, k) => (
          <section key={k}>
            <JuzRow label={`${t.juz} ${num(k + 1)}`} page={num(jz.page)} onClick={() => onOpen(jz.page)} />
            {jz.suras.map((i) => (
              <button key={i} className="h2row" id={"h2s-" + i} onClick={() => onOpen(SPAGE[i - 1])}>
                <span className="h2num"><Star size={42} /><b>{num(i)}</b></span>
                <span className="h2tx"><b>{nm(i)}{!ar && <em lang="ar" dir="rtl">{suras[i - 1].name}</em>}</b>
                  <small><Mosque mecca={suras[i - 1].type === "Meccan"} />{suras[i - 1].type === "Meccan" ? L.mecca : L.medina} – {num(suras[i - 1].ayas)} {L.ayah}</small></span>
                <span className="h2pg">{num(SPAGE[i - 1])}</span><span className="h2chev"><Ic n="chev" size={18} /></span>
              </button>
            ))}
          </section>
        ))}
        {tab === "j" && JUZ.map((jz, k) => (
          <button key={k} className="h2row" onClick={() => onOpen(jz.page)}>
            <span className="h2num"><Star size={42} /><b>{num(k + 1)}</b></span>
            <span className="h2tx"><b>{t.juz} {num(k + 1)}</b><small>{nm(jz.s)} {num(jz.s)}:{num(jz.a)}</small></span>
            <span className="h2pg">{num(jz.page)}</span><span className="h2chev"><Ic n="chev" size={18} /></span>
          </button>
        ))}
        {tab === "p" && <div className="h2pages">{Array.from({ length: PAGES }, (_, k) => k + 1).map((n) => (
          <button key={n} className={"h2p" + (n === page ? " cur" : "")} onClick={() => onOpen(n)} aria-label={t.page + " " + n}><b>{num(n)}</b><small>{nm(firstSuraOfPage(n).i)}</small></button>
        ))}</div>}
      </div>
      <div className="h2arch" aria-hidden="true" />
    </main>
  );
}

type HT = "s" | "j" | "p";
const SPAGE = suras.map((x) => pageOfAyah(x.i, 1));
const JI = (meta.juz as [number, number][]).map(([s, a]) => indexOf(s, a));
const JUZ = (meta.juz as [number, number][]).map(([s, a], k) => ({
  s, a, page: pageOfAyah(s, a),
  suras: suras.filter((x) => { const i = indexOf(x.i, 1); return i >= JI[k] && (k === 29 || i < JI[k + 1]); }).map((x) => x.i),
}));
const Star = ({ size }: { size: number }) => (
  <svg className="h2star" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="8" y="8" width="24" height="24" /><rect x="8" y="8" width="24" height="24" transform="rotate(45 20 20)" /><circle cx="20" cy="20" r="10.5" strokeWidth=".7" /></g></svg>
);
const Mosque = ({ mecca }: { mecca: boolean }) => (
  <svg className="h2ic" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">{mecca
    ? <path d="M4 9l8-4 8 4v11H4zM4 9h16M9 14h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    : <path d="M12 3v2M7 20v-7a5 5 0 0 1 10 0v7M3 20h18M4 20v-6M20 20v-6M10 20v-3a2 2 0 0 1 4 0v3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}</svg>
);
function JuzRow({ label, page, onClick }: { label: string; page: string; onClick: () => void }) {
  return <button className="h2juz" onClick={onClick}><span className="h2jo" aria-hidden="true">✥</span><b>{label}</b><span className="h2jl" aria-hidden="true"><i /></span><span className="h2pg">{page}</span></button>;
}
const HL: Record<string, { title: string; more: string; tabs: Record<HT, string>; mecca: string; medina: string; ayah: string }> = {
  en: { title: "Quran", more: "Today", tabs: { s: "Surahs", j: "Juz", p: "Pages" }, mecca: "Meccan", medina: "Medinan", ayah: "ayahs" },
  az: { title: "Quran", more: "Bu gün", tabs: { s: "Surələr", j: "Cüz", p: "Səhifələr" }, mecca: "Məkki", medina: "Mədəni", ayah: "ayə" },
  tr: { title: "Kur'an", more: "Bugün", tabs: { s: "Sureler", j: "Cüz", p: "Sayfalar" }, mecca: "Mekki", medina: "Medeni", ayah: "ayet" },
  ar: { title: "القرآن الكريم", more: "اليوم", tabs: { s: "السور", j: "الأجزاء", p: "الصفحات" }, mecca: "مكية", medina: "مدنية", ayah: "آية" },
  ru: { title: "Коран", more: "Сегодня", tabs: { s: "Суры", j: "Джузы", p: "Страницы" }, mecca: "Мекканская", medina: "Мединская", ayah: "аятов" },
};

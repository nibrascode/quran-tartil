import { Ic } from "./Icons";
import { T, type Lang } from "./i18n";
import type { Settings } from "./store";
import { dayKey } from "./store";
import { addCards, dueKeys, hifzStats, removeCard, weakAyahs } from "./practice";
import { pageItems, pageOfAyah, suras } from "./quran";
import type { Queue } from "./App";

type Props = { lang: Lang; st: Settings; update: (f: (s: Settings) => Settings) => void; page: number; startQueue: (k: Queue["kind"], keys: string[]) => void; onGo: (p: number, a?: { s: number; a: number }) => void; say: (m: string) => void };

export function PracticeView({ lang, st, update, page, startQueue, onGo, say }: Props) {
  const t = T[lang];
  const today = dayKey();
  const stats = hifzStats(st.hifz, today);
  const due = dueKeys(st.hifz, today);
  const wk = weakAyahs(st.weak);
  const cards = Object.entries(st.hifz).sort((a, b) => (a[1].due < b[1].due ? -1 : 1)).slice(0, 40);
  const refName = (k: string) => { const [s, a] = k.split(":").map(Number); return `${suras[s - 1].name} ${a}`; };
  const go = (k: string) => { const [s, a] = k.split(":").map(Number); onGo(pageOfAyah(s, a), { s, a }); };
  return (
    <div className="practice">
      <section className="pcard">
        <h3><Ic n="repeat" size={18} /> {t.repeatT}</h3>
        <p>{t.repeatD}</p>
        <div className="stepper" role="group" aria-label={t.repeatT}>
          <button className="ib" aria-label="−" disabled={st.prefs.repeat <= 1} onClick={() => update((s) => ({ ...s, prefs: { ...s.prefs, repeat: Math.max(1, s.prefs.repeat - 1) } }))}>−</button>
          <b>×{st.prefs.repeat}</b>
          <button className="ib" aria-label="+" disabled={st.prefs.repeat >= 10} onClick={() => update((s) => ({ ...s, prefs: { ...s.prefs, repeat: Math.min(10, s.prefs.repeat + 1) } }))}>+</button>
        </div>
      </section>

      <section className="pcard">
        <h3><Ic n="layers" size={18} /> {t.hifzT}</h3>
        <p>{t.hifzD}</p>
        <p className="pstat">{t.hifzStats.replace("{total}", String(stats.total)).replace("{due}", String(stats.due)).replace("{learned}", String(stats.learned))}</p>
        <div className="prow">
          <button className="ib primary" disabled={!due.length} onClick={() => startQueue("hifz", due)}><Ic n="mic" size={16} />{t.hifzReview.replace("{n}", String(due.length))}</button>
          <button className="ib" onClick={() => { const keys = pageItems(page).filter((x) => x.k === "ayah").map((x) => (x as { s: number; a: number }).s + ":" + (x as { s: number; a: number }).a); update((s) => ({ ...s, hifz: addCards(s.hifz, keys, today) })); say(t.hifzAdded.replace("{n}", String(keys.length))); }}><Ic n="bookmark" size={16} />{t.hifzAddPage}</button>
        </div>
        {cards.length === 0 && <small className="pnone">{t.hifzNone}</small>}
        <ul className="plist">
          {cards.map(([k, c]) => (
            <li key={k}>
              <button className="pgo" onClick={() => go(k)}><span className="ref">{k}</span><span lang="ar" dir="rtl">{refName(k)}</span><small>{t.hifzNext.replace("{b}", String(c.box)).replace("{d}", c.due)}</small></button>
              <button className="ib" aria-label={t.hifzRemove} onClick={() => update((s) => ({ ...s, hifz: removeCard(s.hifz, k) }))}><Ic n="trash" size={16} /></button>
            </li>
          ))}
        </ul>
      </section>

      <section className="pcard">
        <h3><Ic n="warn" size={18} /> {t.weakT}</h3>
        <p>{t.weakD}</p>
        <div className="prow"><button className="ib primary" disabled={!wk.length} onClick={() => startQueue("weak", wk.slice(0, 20))}><Ic n="mic" size={16} />{t.weakDrill.replace("{n}", String(Math.min(20, wk.length)))}</button></div>
        {st.weak.length === 0 && <small className="pnone">{t.weakNone}</small>}
        <ul className="plist">
          {st.weak.slice(0, 40).map((w) => (
            <li key={w.key + w.word}>
              <button className="pgo" onClick={() => go(w.key)}><span className="ref">{w.key}</span><span className="mw" lang="ar" dir="rtl">{w.word}</span><small>×{w.n}</small></button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

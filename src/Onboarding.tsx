import { useState } from "react";
import { Ic } from "./Icons";
import { LANGS, T, type Lang } from "./i18n";

export function Onboarding({ lang, setLang, onDone }: { lang: Lang; setLang: (l: Lang) => void; onDone: () => void }) {
  const t = T[lang];
  const [i, setI] = useState(0);
  const steps = [
    { art: "book", h: t.ob1t, b: t.ob1b },
    { art: "bookmark", h: t.ob2t, b: t.ob2b },
    { art: "mic", h: t.ob3t, b: t.ob3b },
  ];
  const s = steps[i];
  return (
    <div className="ob" role="dialog" aria-modal="true" aria-label={t.app}>
      <div className="seg" style={{ justifyContent: "center", margin: 0 }}>
        {LANGS.map((l) => <button key={l.id} className="tab" aria-selected={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</button>)}
      </div>
      <div className="art" aria-hidden="true" key={i}><span className="medal"><Ic n={s.art} size={56} /></span></div>
      <h1 key={"h" + i}>{s.h}</h1>
      <p key={"p" + i}>{s.b}</p>
      <div className="dots" aria-hidden="true">{steps.map((_, k) => <i key={k} className={k === i ? "on" : ""} />)}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="ib" style={{ flex: 1 }} onClick={onDone}>{t.skip}</button>
        <button className="ib primary" style={{ flex: 2 }} autoFocus onClick={() => (i < steps.length - 1 ? setI(i + 1) : onDone())}>{i < steps.length - 1 ? t.next : t.begin}</button>
      </div>
    </div>
  );
}

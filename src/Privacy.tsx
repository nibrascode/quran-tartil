import { PRIVACY, PRIVACY_CONTACT, PRIVACY_UPDATED } from "./privacyText";
import type { Lang } from "./i18n";

export function PrivacyView({ lang }: { lang: Lang }) {
  const p = PRIVACY[lang] || PRIVACY.en;
  return (
    <div className="about" lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <h2 style={{ marginTop: 0 }}>{p.title}</h2>
      <small style={{ color: "var(--muted)" }}>{p.updatedLabel}: {PRIVACY_UPDATED}</small>
      {p.secs.map(([h, b], i) => (<section key={i}><h3>{h}</h3><p>{b}</p></section>))}
      <p><a href={"mailto:" + PRIVACY_CONTACT}>{PRIVACY_CONTACT}</a></p>
      <p><a href="./privacy.html" target="_blank" rel="noopener noreferrer">privacy.html</a></p>
    </div>
  );
}

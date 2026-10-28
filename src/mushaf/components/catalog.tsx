import { useMemo, useState } from "react";
import { fold, JUZ_PAGES, SURAHS, surah } from "@/lib/quran";

type Tab = "surah" | "juz" | "page";

export function Catalog({
  page,
  marks,
  onClose,
  onJump,
}: {
  page: number;
  marks: number[];
  onClose: () => void;
  onJump: (page: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("surah");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState(String(page));

  const filtered = useMemo(() => {
    const needle = fold(q.trim());
    if (!needle) return SURAHS;
    return SURAHS.filter((s) => {
      if (String(s.n) === needle) return true;
      return fold(s.az).includes(needle) || fold(s.ar).includes(needle);
    });
  }, [q]);

  const jump = () => {
    const n = Number(draft);
    if (n >= 1 && n <= 604) onJump(n);
  };

  return (
    <div className="catalog" role="dialog" aria-label="Mündəricat">
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Bağla">
          <Chevron />
        </button>
        <div className="topbar-title">
          <strong>Qurani-Kərim</strong>
          <span>Mədinə məshəfi</span>
        </div>
        <span className="topbar-side" />
      </header>

      <div className="tabs" role="tablist">
        {(
          [
            ["surah", "Surələr"],
            ["juz", "Cüzlər"],
            ["page", "Səhifə"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "tab on" : "tab"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "surah" && (
        <>
          <label className="search">
            <span className="sr">Surə axtar</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Surə adı və ya nömrəsi"
              enterKeyHint="search"
            />
          </label>
          <ul className="index-list">
            {filtered.map((s) => (
              <li key={s.n}>
                <button type="button" className="index-row" onClick={() => onJump(s.page)}>
                  <span className="idx">{s.n}</span>
                  <span className="index-names">
                    <span className="az">{s.az}</span>
                    <span className="ar" dir="rtl" lang="ar">
                      {s.ar.replace("سُورَةُ ", "")}
                    </span>
                  </span>
                  <span className="pg">{s.page}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="empty">Uyğun surə yoxdur</li>}
          </ul>
        </>
      )}

      {tab === "juz" && (
        <ul className="index-list">
          {JUZ_PAGES.map((p, i) => {
            const s = surah(metaSurahAt(p));
            return (
              <li key={i}>
                <button type="button" className="index-row" onClick={() => onJump(p)}>
                  <span className="idx">{i + 1}</span>
                  <span className="index-names">
                    <span className="az">Cüz {i + 1}</span>
                    <span className="ar" dir="rtl" lang="ar">
                      {s.az} surəsi
                    </span>
                  </span>
                  <span className="pg">{p}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "page" && (
        <div className="page-jump">
          <label className="jump-field">
            <span>Səhifə</span>
            <input
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onKeyDown={(e) => {
                if (e.key === "Enter") jump();
              }}
            />
          </label>
          <input
            className="slider"
            type="range"
            min={1}
            max={604}
            value={Number(draft) || 1}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Səhifə seç"
          />
          <button type="button" className="go" onClick={jump}>
            Bu səhifəyə keç
          </button>
          <h2>İşarələr</h2>
          {marks.length === 0 ? (
            <p className="hint">Sağ yuxarı nişanla səhifəni yadda saxlayın.</p>
          ) : (
            <ul className="index-list marks">
              {marks.map((n) => (
                <li key={n}>
                  <button type="button" className="index-row" onClick={() => onJump(n)}>
                    <span className="idx">{n}</span>
                    <span className="index-names">
                      <span className="az">{surah(metaSurahAt(n)).az} surəsi</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="credit">
        Mədinə məshəfi · 604 səhifə · Həfs rəvayəti. Hər səhifənin sətir düzülüşü
        Mədinə nəşri ilə eynidir.
      </p>
    </div>
  );
}

function metaSurahAt(page: number): number {
  let n = 1;
  for (const s of SURAHS) {
    if (s.page <= page) n = s.n;
  }
  return n;
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14.5 5.5 8 12l6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

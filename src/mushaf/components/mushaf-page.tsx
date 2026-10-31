import { useLayoutEffect, useRef } from "react";
import {
  isBasmala,
  isHead,
  isMark,
  surah,
  type Chunk,
  type PageData,
} from "@/lib/quran";
import { AyaMark, MiniGem, SideFlower } from "@/components/marks";

const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

export function MushafPage({ data }: { data: PageData }) {
  const linesRef = useRef<HTMLDivElement>(null);
  const name = surah(data.s).ar;
  const inlineBasmala = data.lines.some((line) => line.length === 1 && isBasmala(line[0]!));
  const hasOwnHead = data.lines.some((line) => line.length === 1 && isHead(line[0]!) && line[0].h === data.s);
  const startsAtTop = data.a === 1 && !hasOwnHead;
  const opening = data.s === 1 || (data.s === 2 && data.a === 1 && data.lines.length <= 8);
  const showBasmala = startsAtTop && !opening && data.s !== 9 && !inlineBasmala;

  useLayoutEffect(() => {
    const root = linesRef.current;
    if (!root) return;

    const fit = () => {
      const lines = [...root.querySelectorAll<HTMLElement>("[data-line]")];
      if (!lines.length || root.clientWidth < 8 || root.clientHeight < 8) return;
      root.style.width = "";
      root.style.marginInline = "";
      const isOpening = root.dataset.opening === "1";

      const clearMeasure = () => {
        for (const line of lines) {
          line.style.flex = "";
          line.style.width = "";
          line.style.height = "";
          line.style.justifyContent = "";
          line.style.transform = "";
        }
      };

      const measure = (size: number) => {
        root.style.fontSize = `${size}px`;
        let widest = 0;
        for (const line of lines) {
          line.style.flex = "0 0 auto";
          line.style.width = "max-content";
          line.style.height = "auto";
          line.style.justifyContent = "flex-start";
          widest = Math.max(widest, line.getBoundingClientRect().width);
        }
        return widest;
      };

      clearMeasure();
      const phoneLand = window.matchMedia("(orientation: landscape) and (max-height: 560px)").matches;
      const phone = window.matchMedia("(max-width: 520px)").matches;

      if (phone && !phoneLand) {
        const slot = root.clientHeight / 15;
        let size = (root.clientWidth - 4) / 19;
        size = Math.min(size, slot / 1.72);
        size = Math.max(13, Math.min(size, 34));
        measure(size);
        clearMeasure();
        root.style.fontSize = `${size}px`;
        if (isOpening) {
          root.dataset.pack = "opening";
          return;
        }
        const box = root.clientWidth - 2;
        for (const line of lines) {
          line.style.width = "max-content";
          const w = line.getBoundingClientRect().width;
          if (w > box) {
            line.style.transform = `scaleX(${(box - 2) / w})`;
            line.style.transformOrigin = "right center";
          } else {
            line.style.width = "";
          }
        }
        root.dataset.pack = lines.length < 12 ? "center" : "fill";
        return;
      }

      if (phoneLand) {
        root.dataset.pack = "scroll";
        const at40 = measure(40);
        const byW = at40 > 0 ? 40 * ((root.clientWidth - 8) / at40) : 32;
        let size = Math.max(26, Math.min(byW, 40));
        for (let i = 0; i < 6; i++) {
          const widest = measure(size);
          if (widest <= root.clientWidth - 2) break;
          size = Math.max(20, size * ((root.clientWidth - 8) / Math.max(widest, 1)));
        }
        const natural = measure(size);
        clearMeasure();
        root.style.fontSize = `${size}px`;
        if (natural > 0 && natural < root.clientWidth - 6) {
          root.style.width = `${Math.ceil(natural)}px`;
        }
        return;
      }

      if (isOpening) {
        root.dataset.pack = "opening";
        const slot = root.clientHeight / 15;
        const at40 = measure(40);
        const byW = at40 > 0 ? 40 * ((root.clientWidth - 4) / at40) : 40;
        const byH = slot / 1.72;
        let size = Math.max(12, Math.min(byW, byH, 36));
        for (let i = 0; i < 6; i++) {
          const widest = measure(size);
          if (widest <= root.clientWidth - 1) break;
          size = Math.max(11, size * ((root.clientWidth - 4) / Math.max(widest, 1)));
        }
        clearMeasure();
        root.style.fontSize = `${size}px`;
        return;
      }

      const few = lines.length < 12;
      root.dataset.pack = few ? "center" : "fill";
      const slot = root.clientHeight / lines.length;
      const at40 = measure(40);
      const byW = at40 > 0 ? 40 * ((root.clientWidth - 4) / at40) : 40;
      const byH = few ? 52 : slot / 1.72;
      let size = Math.max(13, Math.min(byW, byH, few ? 48 : 34));
      for (let i = 0; i < 6; i++) {
        const widest = measure(size);
        if (widest <= root.clientWidth - 1) break;
        size = Math.max(12, size * ((root.clientWidth - 4) / widest));
      }
      clearMeasure();
      root.style.fontSize = `${size}px`;
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    return () => ro.disconnect();
  }, [data]);

  return (
    <div className={opening ? (data.s === 1 ? "sheet opening fatiha" : "sheet opening") : "sheet"}>
      <div className="frame">
        {startsAtTop && <SurahBanner name={name} />}
        {showBasmala && (
          <div className="basmala" dir="rtl" lang="ar">
            <span className="rule" />
            <MiniGem />
            <span className="rule" />
            <span className="basmala-text">{BASMALA}</span>
            <span className="rule" />
            <MiniGem />
            <span className="rule" />
          </div>
        )}
        <div
          className="lines"
          ref={linesRef}
          data-opening={opening ? "1" : undefined}
          dir="rtl"
          lang="ar"
        >
          {opening && data.s === 2 && (
            <div className="line basmala-line" data-line data-kind="basmala">
              <span>{BASMALA}</span>
            </div>
          )}
          {data.lines.map((line, i) => (
            <Line key={i} line={line} />
          ))}
        </div>
        <span className="side-gem left" aria-hidden="true">
          <SideFlower />
        </span>
        <span className="side-gem right" aria-hidden="true">
          <SideFlower />
        </span>
      </div>
    </div>
  );
}

function bannerSize(name: string) {
  const plain = name.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "").replace(/\s/g, "");
  if (plain.length > 18) return "0.82rem";
  if (plain.length > 14) return "0.98rem";
  return "1.16rem";
}

function SurahBanner({ name }: { name: string }) {
  return (
    <div className="surah-banner">
      <svg className="surah-art" viewBox="0 0 440 96" aria-hidden="true">
        <Flourish />
        <g transform="translate(440 0) scale(-1 1)">
          <Flourish />
        </g>
        <path className="shield" d={SHIELD} />
        <path className="shield-line" d={SHIELD_IN} />
      </svg>
      <h1 dir="rtl" lang="ar" style={{ fontSize: bannerSize(name) }}>
        {name}
      </h1>
      <div className="rule-row" aria-hidden="true">
        <span />
        <MiniGem />
        <span />
      </div>
    </div>
  );
}

const SHIELD =
  "M220 5L232 14C262 9 312 10 344 20C370 28 384 38 388 48C384 58 370 68 344 76C312 86 262 87 232 82L220 91L208 82C178 87 128 86 96 76C70 68 56 58 52 48C56 38 70 28 96 20C128 10 178 9 208 14Z";
const SHIELD_IN =
  "M220 13L229 19C256 15 308 16 336 25C358 32 370 40 373 48C370 56 358 64 336 71C308 80 256 81 229 77L220 83L211 77C184 81 132 80 104 71C82 64 70 56 67 48C70 40 82 32 104 25C132 16 184 15 211 19Z";

function Flourish() {
  return (
    <g className="flourish">
      <g className="spray">
        <path d="M17 48H2.5" />
        <path d="M16 48C11 38 5 33 1 36C6 37 10 40 13 44" />
        <path d="M16 48C11 58 5 63 1 60C6 59 10 56 13 52" />
        <path d="M22 39C13 32 8 23 15 18C17 25 20 30 25 33" />
        <path d="M22 57C13 64 8 73 15 78C17 71 20 66 25 63" />
      </g>
      <path
        className="cap"
        d="M86 48C80 34 70 22 54 20C38 18 26 28 24 48C26 68 38 78 54 76C70 74 80 62 86 48Z"
      />
      <path
        className="cap-line"
        d="M76 48C72 39 64 31 54 30C44 29 36 36 35 48C36 60 44 67 54 66C64 65 72 57 76 48Z"
      />
      <g className="vine">
        <path d="M54 48C46 40 49 30 57 28C51 35 53 43 54 48" />
        <path d="M54 48C62 40 59 30 51 28C57 35 55 43 54 48" />
        <path d="M54 48C46 56 49 66 57 68C51 61 53 53 54 48" />
        <path d="M54 48C62 56 59 66 51 68C57 61 55 53 54 48" />
        <path d="M38 40C46 34 50 42 45 48" />
        <path d="M70 40C62 34 58 42 63 48" />
        <path d="M38 56C46 62 50 54 45 48" />
        <path d="M70 56C62 62 58 54 63 48" />
      </g>
      <path className="cap-gem" d="M54 44.2 57.4 48 54 51.8 50.6 48Z" />
    </g>
  );
}

function Line({ line }: { line: Chunk[] }) {
  if (line.length === 1 && isHead(line[0])) {
    return (
      <div className="line head" data-line data-kind="head">
        <span>{surah(line[0].h).ar}</span>
      </div>
    );
  }
  if (line.length === 1 && isBasmala(line[0])) {
    return (
      <div className="line basmala-line" data-line data-kind="basmala">
        <MiniGem />
        <span>{BASMALA}</span>
        <MiniGem />
      </div>
    );
  }
  const words = line.filter((c) => typeof c === "string").length;
  return (
    <div className={words <= 2 ? "line center" : "line"} data-line data-kind="text">
      {line.map((chunk, i) => {
        if (typeof chunk === "string") {
          return (
            <span className="word" key={i}>
              {chunk}
            </span>
          );
        }
        if (isMark(chunk)) return <AyaMark key={i} n={chunk.n} />;
        return null;
      })}
    </div>
  );
}

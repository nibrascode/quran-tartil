import { eastern } from "@/lib/quran";

export function AyaMark({ n }: { n: number }) {
  return (
    <span className={n >= 100 ? "aya aya-wide" : "aya"} aria-label={`ayə ${n}`}>
      {`\u06DD${eastern(n)}`}
    </span>
  );
}

export function Rosette({ filled }: { filled?: boolean }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={filled ? "on" : ""}>
      {petals.map((deg) => (
        <ellipse
          key={deg}
          cx="16"
          cy="8.2"
          rx="2.15"
          ry="4.7"
          transform={`rotate(${deg} 16 16)`}
          fill={filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.2"
        />
      ))}
      <circle cx="16" cy="16" r="2.15" fill={filled ? "var(--color-green)" : "none"} stroke="currentColor" strokeWidth="1.15" />
    </svg>
  );
}

export function MiniGem() {
  return (
    <svg className="mini-gem" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 1.1 16.4 9 9 16.9 1.6 9Z" fill="var(--color-green)" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M9 5.1 12.7 9 9 12.9 5.3 9Z" fill="none" stroke="var(--color-gold-soft)" strokeWidth="0.75" />
    </svg>
  );
}

export function SideFlower() {
  return (
    <svg className="side-flower" viewBox="0 0 28 40" aria-hidden="true">
      <path d="M14 1.2C17.4 6.2 17.6 11.2 14 15.2 10.4 11.2 10.6 6.2 14 1.2Z" fill="var(--color-paper)" stroke="currentColor" strokeWidth="1.15" />
      <path d="M14 38.8C17.4 33.8 17.6 28.8 14 24.8 10.4 28.8 10.6 33.8 14 38.8Z" fill="var(--color-paper)" stroke="currentColor" strokeWidth="1.15" />
      <path d="M1.2 20C6.4 16.4 11.2 16.6 15.2 20 11.2 23.4 6.4 23.6 1.2 20Z" fill="var(--color-green)" stroke="currentColor" strokeWidth="1.15" />
      <path d="M26.8 20C21.6 16.4 16.8 16.6 12.8 20 16.8 23.4 21.6 23.6 26.8 20Z" fill="var(--color-green)" stroke="currentColor" strokeWidth="1.15" />
      <path d="M14 16.6 17.1 20 14 23.4 10.9 20Z" fill="currentColor" />
    </svg>
  );
}

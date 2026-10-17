/** Deterministic "ayah of the day": same ayah all day for everyone, changes at local midnight. */
export function ayahOfDayIndex(day: string, total = 6236): number {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) { h ^= day.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13;
  return (h >>> 0) % total;
}
export type Part = "morning" | "afternoon" | "evening";
export const partOfDay = (h: number): Part => (h < 5 ? "evening" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening");
export const pct = (n: number, d: number) => (d > 0 ? Math.max(0, Math.min(100, Math.round((n / d) * 100))) : 0);

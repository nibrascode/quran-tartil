import type { Level } from "./tartil";

/** how long an interim word must stay unchanged before it is trusted (ms); a final result or a following word confirms it sooner */
export const CONFIRM_MS: Record<Level, number> = { hard: 300, medium: 400, easy: 500 };

/**
 * Speech engines send interim hypotheses that keep changing ("ملك" becomes "رب"). Colouring those would flash red then green.
 * The stabiliser only releases a word once it is stable: the result is final, or the word stayed the same for `ms`,
 * or it stayed the same across two updates and another word already follows it. Released words never change again (monotonic).
 */
export class Stabilizer {
  private frozen: string[] = [];
  private cand: { w: string; since: number; seen: number }[] = [];
  private last: string[] = [];
  private lastFinal = false;
  constructor(public ms: number) {}
  reset() { this.frozen = []; this.cand = []; this.last = []; this.lastFinal = false; }
  /** words still waiting for confirmation (so the caller knows to poll again later) */
  get waiting() { return this.cand.length > 0; }

  push(words: string[], final: boolean, now: number): string[] {
    this.last = words; this.lastFinal = final;
    const base = this.frozen.length;
    const next: Stabilizer["cand"] = [];
    for (let i = base; i < words.length; i++) {
      const c = this.cand[i - base];
      next.push(c && c.w === words[i] ? { w: c.w, since: c.since, seen: c.seen + 1 } : { w: words[i], since: now, seen: 1 });
    }
    this.cand = next;
    return this.promote(now);
  }
  /** re-check with the clock only (no new speech) */
  poll(now: number): string[] { return this.promote(now); }

  private promote(now: number): string[] {
    while (this.cand.length) {
      const c = this.cand[0];
      const ok = this.lastFinal || now - c.since >= this.ms || (this.cand.length > 1 && c.seen >= 2);
      if (!ok) break;
      this.frozen.push(c.w);
      this.cand.shift();
    }
    return this.frozen.slice();
  }
}

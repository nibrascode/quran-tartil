import { align, LEVELS, normalizeAr, type Level, type WordState } from "./tartil";

export type AyahTokens = { key: string; tokens: string[] }; // tokens: words exactly as displayed (stop-mark tokens included)
export type AyahRes = { states: WordState[]; score: number; closed: boolean }; // states are per displayed token

/**
 * Live recitation over the ayahs of one page. Feed the cumulative list of recognised words; ayahs are revealed
 * and closed one after another, leftover words flow into the next ayah. Pure logic (no DOM) so it can be tested.
 */
export class ReciteSession {
  cursor = 0;
  consumed = 0;
  res = new Map<string, AyahRes>();
  private idx: number[][];
  private norms: string[][];
  constructor(public ayahs: AyahTokens[], public level: Level) {
    this.idx = ayahs.map((a) => a.tokens.map((t, i) => (normalizeAr(t) ? i : -1)).filter((i) => i >= 0));
    this.norms = ayahs.map((a, k) => this.idx[k].map((i) => a.tokens[i]));
  }
  get finished() { return this.cursor >= this.ayahs.length; }
  /** a new recogniser session starts counting words from zero again */
  newRecogniser() { this.consumed = 0; }

  private expand(k: number, states: WordState[]): WordState[] {
    const full: WordState[] = this.ayahs[k].tokens.map(() => "skip");
    this.idx[k].forEach((ti, e) => { full[ti] = states[e]; });
    return full;
  }
  /** returns how many ayahs were closed by this call */
  feed(heard: string[]): number {
    let closed = 0;
    const done = () => { this.pendingHeard = heard.slice(this.consumed); return closed; };
    while (!this.finished) {
      const k = this.cursor, n = this.norms[k].length, rest = heard.slice(this.consumed);
      const o = LEVELS[this.level];
      const live = align(this.norms[k], rest, { ...o, final: false });
      this.res.set(this.ayahs[k].key, { states: this.expand(k, live.states), score: live.score, closed: false });
      if (n > 0 && live.reached === n) {
        const fin = align(this.norms[k], rest, { ...o, final: true });
        this.res.set(this.ayahs[k].key, { states: this.expand(k, fin.states), score: fin.score, closed: true });
        this.consumed += fin.used;
        this.cursor++;
        closed++;
        continue;
      }
      if (n === 0) { this.cursor++; closed++; continue; }
      break;
    }
    return done();
  }
  /** user pressed stop: show the current ayah as it stands */
  finish() {
    if (this.finished) return;
    const k = this.cursor, o = LEVELS[this.level];
    if (this.pendingHeard.length === 0) { this.res.delete(this.ayahs[k].key); return; } // nothing recited for this ayah
    const r = align(this.norms[k], this.pendingHeard, { ...o, final: true });
    this.res.set(this.ayahs[k].key, { states: this.expand(k, r.states), score: r.score, closed: true });
  }
  private pendingHeard: string[] = [];
  /** average score of closed ayahs (0 when nothing was recited) */
  get score() {
    const v = [...this.res.values()].filter((r) => r.closed);
    return v.length ? Math.round(v.reduce((a, r) => a + r.score, 0) / v.length) : 0;
  }
}

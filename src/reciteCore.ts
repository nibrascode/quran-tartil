import { align, LEVELS, normalizeAr, type Level, type WordState } from "./tartil";

export type AyahTokens = { key: string; tokens: string[] }; // tokens: words exactly as displayed (stop-mark tokens included)
export type AyahRes = { states: WordState[]; score: number; closed: boolean; held: boolean; mistakes: number }; // states are per displayed token

/**
 * Live recitation over the ayahs of one page. Feed the cumulative list of recognised words.
 *  - Text is revealed only while the recitation is correct. At the first wrong/skipped word the reveal STOPS: that word is red,
 *    everything after it stays hidden, and nothing advances until the reciter says that word (or restarts the ayah) correctly.
 *  - Words spoken after a mistake are discarded; only words heard after the hold count for the retry.
 *  - Strictness (easy/medium/hard) decides what is a mistake (see LEVELS) and how soon it is flagged.
 * Pure logic (no DOM), covered by scripts/recite.test.mjs.
 */
export class ReciteSession {
  cursor = 0;
  consumed = 0;
  res = new Map<string, AyahRes>();
  private idx: number[][];
  private norms: string[][];
  private base = 0; // expected word (within the current ayah) where the current attempt starts
  private okBefore: WordState[] = []; // confirmed states of words before `base`
  private heldIdx: number | null = null;
  private mistakes = 0;
  private lastErr = -1; // error index seen in the previous feed (needs a second sighting when it is the newest word)
  private lastRest: string[] = [];

  constructor(public ayahs: AyahTokens[], public level: Level) {
    this.idx = ayahs.map((a) => a.tokens.map((t, i) => (normalizeAr(t) ? i : -1)).filter((i) => i >= 0));
    this.norms = ayahs.map((a, k) => this.idx[k].map((i) => a.tokens[i]));
  }
  get finished() { return this.cursor >= this.ayahs.length; }
  get held() { return this.heldIdx !== null; }
  /** a new recogniser session starts counting words from zero again */
  newRecogniser() { this.consumed = 0; this.lastErr = -1; }

  private expand(k: number, states: WordState[]): WordState[] {
    const full: WordState[] = this.ayahs[k].tokens.map(() => "skip");
    this.idx[k].forEach((ti, e) => { full[ti] = states[e]; });
    return full;
  }
  private resetAyah() { this.base = 0; this.okBefore = []; this.heldIdx = null; this.mistakes = 0; this.lastErr = -1; }
  private ayahScore(n: number) { return n ? Math.round((Math.max(0, n - this.mistakes) / n) * 100) : 0; }
  private firstError(st: WordState[]) { return st.findIndex((x) => x === "bad" || x === "missing"); }

  private show(k: number, upTo: number, states: WordState[], closed: boolean) {
    // states of the attempt (from `base`) cut at the first error: later words are hidden
    const n = this.norms[k].length;
    const disp: WordState[] = [...this.okBefore];
    for (let i = 0; i < states.length; i++) disp.push(i <= upTo || upTo < 0 ? states[i] : "pending");
    while (disp.length < n) disp.push("pending");
    this.res.set(this.ayahs[k].key, { states: this.expand(k, disp), score: this.ayahScore(n), closed, held: this.heldIdx !== null, mistakes: this.mistakes });
  }

  /** @param final true when the recogniser marked this result as final (a mistake on the newest word is then trusted at once) */
  feed(heard: string[], final = false): number {
    let closed = 0;
    while (!this.finished) {
      const k = this.cursor, norms = this.norms[k], n = norms.length;
      if (n === 0) { this.cursor++; this.resetAyah(); closed++; continue; }
      const rest = heard.slice(this.consumed);
      this.lastRest = rest;
      const o = LEVELS[this.level];
      const run = (from: number, fin: boolean) => align(norms.slice(from), rest, { ...o, final: fin });

      let from = this.base;
      let r = run(from, false);
      if (this.heldIdx !== null) {
        // held: the retry must start with the wrong word (continue from there) or restart the ayah
        const cands = this.heldIdx > 0 ? [this.heldIdx, 0] : [0];
        let pick = -1, best = -1;
        for (const c of cands) { const rr = run(c, false); // restarting the ayah must be convincing (two words), a single look-alike word must not release the hold
          const good = rr.states[0] === "ok" && (c === this.heldIdx || rr.states[1] === "ok" || norms.length === 1);
          if (good && rr.matched > best) { best = rr.matched; pick = c; r = rr; } }
        if (pick < 0) {
          // still wrong / nothing usable yet: stay held on the red word, show nothing new
          this.okBefore = this.okBefore.slice(0, this.heldIdx);
          const disp: WordState[] = [...this.okBefore, this.lastHeldState];
          while (disp.length < n) disp.push("pending");
          this.res.set(this.ayahs[k].key, { states: this.expand(k, disp), score: this.ayahScore(n), closed: false, held: true, mistakes: this.mistakes });
          break;
        }
        from = pick;
        this.heldIdx = null;
        this.base = pick;
        this.okBefore = this.okBefore.slice(0, pick);
        this.lastErr = -1;
      }

      let e = this.firstError(r.states);
      let st = r.states;
      if (r.reached === norms.length - from) {
        const fin = run(from, true);
        const e2 = this.firstError(fin.states);
        if (e2 < 0) {
          // clean to the end of the ayah: close it, leftover words flow on
          this.show(k, -1, fin.states, true);
          this.res.get(this.ayahs[k].key)!.score = this.ayahScore(n);
          this.consumed += fin.used;
          this.cursor++;
          this.resetAyah();
          closed++;
          continue;
        }
        e = e2; st = fin.states;
      }
      if (e >= 0) {
        // mistake: reveal up to and including it; commit the hold once it is trustworthy
        const newest = e + 1 >= r.reached;
        const trusted = !newest || final || this.lastErr === e || r.reached === norms.length - from;
        this.lastErr = e;
        this.show(k, e, st, false);
        if (trusted) {
          this.lastHeldState = st[e] as WordState;
          this.heldIdx = from + e;
          this.okBefore = [...this.okBefore, ...st.slice(0, e)];
          this.mistakes++;
          this.consumed = heard.length;
          const cur = this.res.get(this.ayahs[k].key)!;
          cur.held = true; cur.mistakes = this.mistakes; cur.score = this.ayahScore(n);
        }
        break;
      }
      this.lastErr = -1;
      this.show(k, -1, st, false);
      break;
    }
    return closed;
  }
  private lastHeldState: WordState = "bad";

  /** user pressed stop: the current ayah stays as it stands (revealed part only) */
  finish() {
    if (this.finished) return;
    const k = this.cursor, r = this.res.get(this.ayahs[k].key);
    if (!r || (this.lastRest.length === 0 && this.heldIdx === null && !r.states.some((s) => s === "ok"))) { this.res.delete(this.ayahs[k].key); return; }
    r.closed = true;
  }
  /** average score of closed ayahs (0 when nothing was recited) */
  get score() {
    const v = [...this.res.values()].filter((r) => r.closed);
    return v.length ? Math.round(v.reduce((a, r) => a + r.score, 0) / v.length) : 0;
  }
}

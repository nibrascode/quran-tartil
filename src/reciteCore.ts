import { ignoredPrefix } from "./prefix";
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
  /** mistakes (one entry per wrong word, `n` = how many times it was held) */
  events: { key: string; word: string; n: number }[] = [];
  /** first ayah of the session (reciting from a chosen ayah) */
  start = 0;
  private base = 0; // expected word (within the current ayah) where the current attempt starts
  private okBefore: WordState[] = []; // confirmed states of words before `base`
  private heldIdx: number | null = null;
  private mistakes = 0;
  private lastErr = -1; // error index seen in the previous feed (needs a second sighting when it is the newest word)
  private lastRest: string[] = [];
  private prefixPending = true; // isti'adha / basmala spoken before reciting are skipped, never a mistake
  private prefixFrom = -1;
  private shown = 0; // words of the current ayah already painted green: never downgraded
  private lastDisp: WordState[] = []; // norm-level states last shown for the current ayah
  private overlap = false; // after a recogniser restart: the engine may repeat the last words, they are skipped

  constructor(public ayahs: AyahTokens[], public level: Level) {
    this.idx = ayahs.map((a) => a.tokens.map((t, i) => (normalizeAr(t) ? i : -1)).filter((i) => i >= 0));
    this.norms = ayahs.map((a, k) => this.idx[k].map((i) => a.tokens[i]));
  }
  get finished() { return this.cursor >= this.ayahs.length; }
  get held() { return this.heldIdx !== null; }
  /** jump back/forward to ayah k (re-recite): later results are dropped, only words heard from now on count */
  seek(k: number, heardLen: number) {
    k = Math.max(0, Math.min(this.ayahs.length - 1, k));
    for (let j = k; j < this.ayahs.length; j++) this.res.delete(this.ayahs[j].key);
    this.cursor = k; this.consumed = heardLen; this.resetAyah();
    this.prefixPending = true; this.prefixFrom = heardLen;
  }
  /** a new recogniser session starts counting words from zero again */
  newRecogniser() {
    this.consumed = 0; this.lastErr = -1; this.prefixFrom = 0;
    if (this.finished) return;
    if (this.heldIdx === null) {
      // resume from the next expected word of the current ayah (a pause or restart is never a skipped word)
      let pos = 0; while (pos < this.lastDisp.length && this.lastDisp[pos] === "ok") pos++;
      this.okBefore = this.lastDisp.slice(0, pos); this.base = pos; this.shown = pos;
      this.prefixPending = pos === 0;
      this.overlap = pos > 0;
    } else { this.prefixPending = false; this.overlap = false; }
  }

  private expand(k: number, states: WordState[]): WordState[] {
    const full: WordState[] = this.ayahs[k].tokens.map(() => "skip");
    this.idx[k].forEach((ti, e) => { full[ti] = states[e]; });
    return full;
  }
  private resetAyah() { this.shown = 0; this.lastDisp = []; this.overlap = false; this.base = 0; this.okBefore = []; this.heldIdx = null; this.mistakes = 0; this.lastErr = -1; }
  private ayahScore(n: number) { return n ? Math.round((Math.max(0, n - this.mistakes) / n) * 100) : 0; }
  private firstError(st: WordState[]) { return st.findIndex((x) => x === "bad" || x === "missing"); }

  private show(k: number, upTo: number, states: WordState[], closed: boolean) {
    // states of the attempt (from `base`) cut at the first error: later words are hidden
    const n = this.norms[k].length;
    const disp: WordState[] = [...this.okBefore];
    for (let i = 0; i < states.length; i++) disp.push(i <= upTo || upTo < 0 ? states[i] : "pending");
    while (disp.length < n) disp.push("pending");
    this.lastDisp = disp; { let c = 0; while (c < disp.length && disp[c] === "ok") c++; this.shown = Math.max(this.shown, c); }
    this.res.set(this.ayahs[k].key, { states: this.expand(k, disp), score: this.ayahScore(n), closed, held: this.heldIdx !== null, mistakes: this.mistakes });
  }

  /** @param final true when the recogniser marked this result as final (a mistake on the newest word is then trusted at once) */
  feed(heard: string[], final = false): number {
    let closed = 0;
    if (this.prefixPending && !this.finished) {
      if (this.prefixFrom < 0) this.prefixFrom = this.consumed;
      const w = heard.slice(this.prefixFrom), m = ignoredPrefix(w, this.norms[this.cursor]?.[0] ?? "");
      if (m > 0) this.consumed = Math.max(this.consumed, this.prefixFrom + m);
      if (w.length > m) this.prefixPending = false; // a real word arrived
    }
    while (!this.finished) {
      const k = this.cursor, norms = this.norms[k], n = norms.length;
      if (n === 0) { this.cursor++; this.resetAyah(); closed++; continue; }
      if (this.overlap && this.heldIdx === null) this.skipOverlap(heard, norms);
      const rest = heard.slice(this.consumed, this.consumed + n + 3); // a burst of words must not be matched against later words of the ayah
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

      const keep = (x: WordState[]) => x.map((v, i) => (from + i < this.shown && v !== "ok" ? "ok" : v) as WordState);
      let st = keep(r.states);
      let e = this.firstError(st);
      if (r.reached === norms.length - from) {
        const fin = run(from, true); fin.states = keep(fin.states);
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
        if (trusted) this.show(k, e, st, false);
        else this.show(k, -1, st.map((v, i) => (i >= e ? "pending" : v) as WordState), false); // unconfirmed: neutral, never red
        if (trusted) {
          this.lastHeldState = st[e] as WordState;
          this.heldIdx = from + e;
          this.okBefore = [...this.okBefore, ...st.slice(0, e)];
          this.mistakes++;
          const word = this.ayahs[k].tokens[this.idx[k][from + e]] ?? "";
          const ev = this.events.find((x) => x.key === this.ayahs[k].key && x.word === word);
          if (ev) ev.n++; else this.events.push({ key: this.ayahs[k].key, word, n: 1 });
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
  /** after a restart the recogniser may repeat the last 1-3 words already recited: skip them (a real next word is never skipped) */
  private skipOverlap(heard: string[], norms: string[]) {
    const pos = this.base, len = heard.length - this.consumed;
    if (len <= 0 || pos <= 0) return;
    const same = (a: string, b: string) => align([b], [a], { ...LEVELS[this.level], final: true }).states[0] === "ok";
    const h = heard.slice(this.consumed);
    if (same(h[0], norms[pos] ?? "")) { this.overlap = false; return; }
    let skip = 0;
    for (let d = Math.min(3, pos); d >= 1; d--) {
      const j = Math.min(d, h.length);
      let all = true; for (let i = 0; i < j; i++) if (!same(h[i], norms[pos - d + i])) { all = false; break; }
      if (all) { skip = j; break; }
    }
    if (skip) this.consumed += skip;
    if (h.length > skip) this.overlap = false;
  }

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

import { SR, Vad } from "./vad";

/** A word with its time span in stream seconds. */
export type TWord = { w: string; s: number; e: number };
export type Job = { id: number; start: number; end: number; samples: Float32Array; endpoint: boolean; gain: number };
export type Opts = { win: number; hop: number; minHop: number; maxHop: number; margin: number; maxBuf: number; endSilence: number; maxWait: number };
export const DEFAULTS: Opts = { win: 5, hop: 1, minHop: 0.8, maxHop: 3, margin: 1, maxBuf: 40, endSilence: 0.7, maxWait: 2.6 };

const strip = (s: string) => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");

/**
 * Sliding-window streaming around any chunk decoder (Whisper): keeps the last seconds of audio, decides WHEN to decode a window
 * (VAD gate, adaptive hop, never two jobs at once) and turns each window's timestamped words into a growing list of COMMITTED words:
 * a word is committed once its end lies `margin` seconds before the window end (the right edge of a window is unreliable) or the reciter
 * paused (endpoint). Words already committed (by time, and by 1-3 word text overlap) are never emitted twice. Pure and deterministic:
 * the same code runs in the browser engine and in scripts/precise-bench.mjs.
 */
export class Pipeline {
  o: Opts;
  vad = new Vad();
  committed: string[] = [];
  committedUntil = 0;
  tentative: string[] = [];
  private buf = new Float32Array(0);
  private bufStart = 0; // stream sample index of buf[0]
  private total = 0;
  private busy = false;
  private nextId = 1;
  private lastJobEnd = -1;
  private lastStartMs = -1e9;
  hop: number;
  private prev: TWord[] = []; // candidate words of the previous window (stream time)
  private exp: string[] = []; // expected words (normalised): used to settle disagreements, never to invent words
  ema = 0; // smoothed decode seconds
  jobs = 0; skipped = 0; dropped = 0;
  constructor(o: Partial<Opts> = {}) { this.o = { ...DEFAULTS, ...o }; this.hop = this.o.hop; }
  /** words the reciter is expected to say next (tie-break only) */
  setExpected(words: string[]) { const n = words.map(strip).filter(Boolean); if (n.join(" ") !== this.exp.join(" ")) this.ptr = 0; this.exp = n; }
  private ptr = 0; // index in `exp` of the word expected next (advances as words are committed)
  private near(x: string, from = this.ptr, n = 6) { let b = 0; for (let j = from; j < Math.min(this.exp.length, from + n); j++) b = Math.max(b, sim(x, this.exp[j])); return b; }
  private advance(x: string) { let bj = -1, bs = 0.6; for (let j = this.ptr; j < Math.min(this.exp.length, this.ptr + 6); j++) { const v = sim(x, this.exp[j]); if (v > bs) { bs = v; bj = j; } } if (bj >= 0) this.ptr = bj + 1; }
  private plausible(x: string) { return !this.exp.length || this.exp.some((e) => sim(x, e) >= 0.7); }
  private exact(x: string) { return this.exp.some((e) => sim(x, e) >= 0.9); }
  /** Whisper likes to prepend a و/ف to the first word after a pause: drop it when the word without it is the expected one */
  private unWaw(x: string): string { const b = strip(x); return b.length > 3 && /^[وف]/.test(b) && !this.exact(x) && this.exact(b.slice(1)) ? b.slice(1) : x; }
  get seconds() { return this.total / SR; }
  get isBusy() { return this.busy; }
  push(x: Float32Array) {
    this.vad.push(x);
    const keep = this.o.maxBuf * SR;
    const nb = new Float32Array(Math.min(keep, this.buf.length + x.length));
    const all = this.buf.length + x.length;
    if (all <= keep) { nb.set(this.buf); nb.set(x, this.buf.length); this.bufStart = this.total - this.buf.length; }
    else { const cut = all - keep; const joined = new Float32Array(all); joined.set(this.buf); joined.set(x, this.buf.length); nb.set(joined.subarray(cut)); this.bufStart = this.total - this.buf.length + cut; }
    this.buf = nb; this.total += x.length;
  }
  /** the next window to decode, or null (busy / too early / nothing new / only silence). `nowMs` is any monotonic clock. */
  poll(nowMs: number): Job | null {
    if (this.busy) return null;
    const end = this.seconds, o = this.o;
    const newAudio = end - Math.max(this.lastJobEnd, 0);
    const sil = this.vad.silence();
    const pausedNow = sil >= o.endSilence && sil !== Infinity;
    const due = nowMs - this.lastStartMs >= this.hop * 1000;
    const pending = this.vad.speech(this.committedUntil - 0.05, end) > 0.12; // speech not yet committed
    if (!pending) { this.skipped++; return null; }
    const endpoint = pausedNow && this.lastJobEnd < this.vad.lastSpeechT + 0.2; // decode once more after the pause: flush everything
    if (!endpoint && (!due || newAudio < 0.4)) return null;
    if (endpoint && newAudio < 0.05) return null;
    // a window starts inside a pause (Whisper garbles words that are cut in half), but never after uncommitted speech
    let start = Math.max(0, end - o.win);
    { const p = this.vad.pause(start, Math.min(end - 1.5, this.committedUntil + 0.3)); if (p >= 0) start = Math.max(start, p); }
    const s0 = Math.max(start, this.bufStart / SR);
    const view = this.buf.subarray(Math.round((s0 * SR) - this.bufStart), this.buf.length);
    // volume normalisation: quiet microphones are scaled up (never more than 12x), loud ones left alone
    let peak = 0; for (let i = 0; i < view.length; i++) { const a = Math.abs(view[i]); if (a > peak) peak = a; }
    const gain = peak > 1e-4 && peak < 0.3 ? Math.min(12, 0.5 / peak) : 1;
    const samples = new Float32Array(view.length); for (let i = 0; i < view.length; i++) samples[i] = view[i] * gain;
    this.busy = true; this.lastStartMs = nowMs; this.lastJobEnd = end; this.jobs++;
    return { id: this.nextId++, start: s0, end, samples, endpoint, gain };
  }
  /** a decode finished (hyp = words with times relative to the window start) → newly committed words */
  /** Timestamp-free models (text only): words get time spans proportional to their length, laid over the speech runs of the window (pauses get no words). */
  private spread(hyp: TWord[], job: Job): TWord[] {
    const runs = this.vad.spans(job.start, job.end); if (!runs.length) return hyp.map((x) => ({ ...x, s: 0, e: 0 }));
    const total = runs.reduce((t, r) => t + (r[1] - r[0]), 0), wt = hyp.map((x) => strip(x.w).length + 1), sum = wt.reduce((a, b) => a + b, 0);
    const at = (u: number) => { let acc = u * total; for (const r of runs) { const l = r[1] - r[0]; if (acc <= l + 1e-9) return r[0] + acc; acc -= l; } return runs[runs.length - 1][1]; };
    let c = 0;
    return hyp.map((x, i) => { const s = at(c / sum); c += wt[i]; return { w: x.w, s: s - job.start, e: at(c / sum) - job.start }; });
  }
  done(job: Job, hyp: TWord[], inferSec: number): { words: string[]; tentative: string[] } {
    this.busy = false;
    this.ema = this.ema ? this.ema * 0.6 + inferSec * 0.4 : inferSec;
    this.hop = Math.min(this.o.maxHop, Math.max(this.o.minHop, this.ema * 1.25)); // adaptive hop: never queue work faster than the device can do it
    const dur = job.end - job.start;
    if (hyp.length && hyp.every((x) => x.s < 0)) hyp = this.spread(hyp, job); // the model gave no word times: place the words on the voiced parts of the window
    let w = hyp.map((x) => ({ w: x.w.trim(), s: x.s + job.start, e: x.e + job.start })).filter((x) => strip(x.w));
    // hallucination guards: impossible speaking rate, or one word looping
    if (w.length > 6 * dur + 2) { this.dropped++; return { words: [], tentative: [] }; }
    { const out: typeof w = []; let run = 0; for (const x of w) { run = out.length && strip(out[out.length - 1].w) === strip(x.w) ? run + 1 : 0; if (run < 3) out.push(x); } w = out; }
    for (const x of w) { if (!(x.e > x.s)) x.e = Math.min(job.end, x.s + 0.35); if (x.s < job.start) x.s = job.start; }
    // words over silence are hallucinations (Whisper invents text for pauses and noise)
    w = w.filter((x) => this.vad.speech(x.s, x.e) >= Math.min(0.12, 0.4 * (x.e - x.s)) && this.vad.speech(x.s - 0.15, x.e + 0.15) >= 0.08);
    // stitching: the head of this window restates the tail of what is already committed. Find that overlap by text (fuzzy, so a
    // re-spelled or half-cut word still lines up); with no textual overlap fall back to the timestamps.
    const ov = overlapLen(this.committed.slice(-10), w.map((x) => x.w));
    if (ov >= 0) w = w.slice(ov); else w = w.filter((x) => (x.s + x.e) / 2 >= this.committedUntil - 0.1);
    // Voting: a word is committed when it is stable by time (clear of the window's right edge) AND (it fits the expected text, or the previous
    // window heard the same word at the same time). Words that fit nothing wait for a second sighting; after `maxWait` seconds, or at an
    // endpoint, the better of the two sightings (by the expected text) is taken so nothing waits forever.
    for (const x of w) x.w = this.unWaw(x.w);
    // junk suppression: a word that resembles NONE of the next expected words (similarity < 0.5) is Whisper noise, not a recitation of this text. It is dropped, not
    // passed: the expected word it replaced stays unheard, so a genuinely wrong word is still flagged by the aligner as missing (and look-alike wrong words (>= 0.5) are kept for it to judge).
    if (this.exp.length) w = w.filter((x) => this.near(x.w) >= 0.5);
    const prev = this.prev;
    this.prev = w.map((x) => ({ ...x }));
    const out: string[] = [];
    let i = 0;
    for (; i < w.length; i++) {
      const x = w[i];
      const stable = job.endpoint || x.e <= job.end - this.o.margin;
      if (!stable) break;
      // the last word of a window may be cut off by the window's right edge: only trust it when a pause follows it
      if (i === w.length - 1 && !job.endpoint && this.vad.pause(x.s + 0.3, job.end, 0.25) < 0) break;
      const p = prev.find((q) => Math.abs((q.s + q.e) / 2 - (x.s + x.e) / 2) <= 0.6 && sim(q.w, x.w) >= 0.75);
      if (!(p || this.plausible(x.w))) {
        if (job.endpoint) { i = w.length; break; } // junk after the last real word (Whisper invents text in the trailing silence)
        if (x.e > job.end - this.o.maxWait) break; // wait for the next window
        const q = prev.find((z) => Math.abs((z.s + z.e) / 2 - (x.s + x.e) / 2) <= 0.6);
        if (q && this.plausible(q.w) && !this.plausible(x.w)) x.w = q.w;
      }
      out.push(x.w); this.advance(x.w); this.committedUntil = Math.max(this.committedUntil, x.e);
    }
    this.committed.push(...out);
    this.tentative = w.slice(i).map((x) => x.w);
    return { words: out, tentative: this.tentative };
  }
  /** a decode failed or was abandoned: allow the next window */
  failed() { this.busy = false; }
  get text(): string { return this.committed.join(" "); }
}

const sim = (a: string, b: string): number => {
  a = strip(a); b = strip(b); if (!a || !b) return 0; if (a === b) return 1;
  const n = a.length, m = b.length; let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) { const cur = [i]; for (let j = 1; j <= m; j++) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))); prev = cur; }
  return 1 - prev[m] / Math.max(n, m);
};
/**
 * How many leading words of `hyp` restate the tail of `tail` (already committed)? Semi-global alignment: the committed words before the
 * overlap are skipped for free, the hypothesis must start inside the tail and may stop anywhere. Returns -1 when nothing lines up.
 * Exported for tests.
 */
export function overlapLen(tail: string[], hyp: string[]): number {
  const m = tail.length, n = hyp.length; if (!m || !n) return -1;
  const NEG = -1e9, S: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(NEG));
  for (let k = 0; k <= m; k++) S[k][0] = 0;
  const M = (x: number) => (x >= 0.7 ? 1 : x >= 0.5 ? 0.2 : -0.9);
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const best = Math.max(S[i - 1][j - 1] + M(sim(tail[i - 1], hyp[j - 1])), S[i - 1][j] - 0.5, S[i][j - 1] - 0.5);
    S[i][j] = best;
  }
  let bj = 0, bs = 0.9; // at least one real match
  for (let j = 1; j <= n; j++) if (S[m][j] > bs + 1e-9 || (S[m][j] >= bs - 1e-9 && S[m][j] > 0.9 && j > bj && S[m][j] === S[m][bj])) { if (S[m][j] > bs) { bs = S[m][j]; bj = j; } }
  return bj > 0 ? bj : -1;
}

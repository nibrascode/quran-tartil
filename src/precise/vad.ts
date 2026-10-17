/** Tiny energy VAD with an adaptive noise floor (20 ms frames). Pure, no DOM: used by the near-live "Precise" engine and its tests. */
export const SR = 16000;
export const FRAME = 320; // 20 ms
export class Vad {
  private flags: number[] = []; // 1 = speech frame, per 20 ms, since `base`
  private base = 0; // first frame index kept
  private carry = new Float32Array(0);
  private floor = 0.004;
  private sm = 0;
  frames = 0;
  push(x: Float32Array) {
    let buf = x;
    if (this.carry.length) { buf = new Float32Array(this.carry.length + x.length); buf.set(this.carry); buf.set(x, this.carry.length); }
    let i = 0;
    for (; i + FRAME <= buf.length; i += FRAME) {
      let s = 0; for (let j = 0; j < FRAME; j++) s += buf[i + j] * buf[i + j];
      const rms = Math.sqrt(s / FRAME);
      this.sm = this.sm * 0.6 + rms * 0.4;
      // the floor follows quiet frames quickly downwards and loud frames very slowly upwards (never above the speech level)
      this.floor = this.sm < this.floor ? this.floor * 0.9 + this.sm * 0.1 : this.floor * 1.0005 + 1e-7;
      this.floor = Math.min(Math.max(this.floor, 0.0008), 0.05);
      this.flags.push(this.sm > Math.max(0.006, this.floor * 3) ? 1 : 0);
      this.frames++;
    }
    this.carry = buf.slice(i);
    if (this.flags.length > 60 * 50) { const drop = this.flags.length - 40 * 50; this.flags.splice(0, drop); this.base += drop; }
  }
  /** seconds of speech inside [t0, t1) (stream time) */
  speech(t0: number, t1: number): number {
    const a = Math.max(this.base, Math.floor((t0 * SR) / FRAME)), b = Math.min(this.frames, Math.ceil((t1 * SR) / FRAME));
    let n = 0; for (let i = a; i < b; i++) n += this.flags[i - this.base];
    return (n * FRAME) / SR;
  }
  /** seconds since the last speech frame (Infinity when none yet) */
  silence(): number {
    for (let i = this.frames - 1; i >= this.base; i--) if (this.flags[i - this.base]) return ((this.frames - 1 - i) * FRAME) / SR;
    return Infinity;
  }
  get lastSpeechT(): number { const s = this.silence(); return s === Infinity ? -1 : (this.frames * FRAME) / SR - s; }
  /** middle of the latest pause (>= minLen seconds of silence) that lies inside [t0, t1], or -1 */
  pause(t0: number, t1: number, minLen = 0.2): number {
    const a = Math.max(this.base, Math.ceil((t0 * SR) / FRAME)), b = Math.min(this.frames, Math.floor((t1 * SR) / FRAME)), need = Math.ceil((minLen * SR) / FRAME);
    let run = 0;
    for (let i = b - 1; i >= a; i--) { if (!this.flags[i - this.base]) { run++; if (run >= need) { let j = i; while (j + run < b && !this.flags[j + run - this.base]) run++; return ((i + run / 2) * FRAME) / SR; } } else run = 0; }
    return -1;
  }
  /** speech runs [a, b] (stream seconds) inside [t0, t1), merging gaps shorter than `gap` seconds */
  spans(t0: number, t1: number, gap = 0.15): [number, number][] {
    const a = Math.max(this.base, Math.floor((t0 * SR) / FRAME)), b = Math.min(this.frames, Math.ceil((t1 * SR) / FRAME)), out: [number, number][] = [];
    let st = -1, last = -1;
    for (let i = a; i < b; i++) {
      if (this.flags[i - this.base]) { if (st < 0) st = i; else if ((i - last) * FRAME / SR > gap) { out.push([(st * FRAME) / SR, ((last + 1) * FRAME) / SR]); st = i; } last = i; }
    }
    if (st >= 0) out.push([(st * FRAME) / SR, ((last + 1) * FRAME) / SR]);
    return out;
  }
}

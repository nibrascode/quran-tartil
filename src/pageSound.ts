// Soft paper page-turn sound, synthesised locally with Web Audio (no network, no licensed asset).
// Plays on the media stream at low volume; muted when the device media volume is down.
let enabled = true;
let ctx: AudioContext | null = null;
let buf: AudioBuffer | null = null;
export const setPageSound = (on: boolean) => { enabled = on; };

function make(c: AudioContext): AudioBuffer {
  const sr = c.sampleRate, len = Math.floor(sr * 0.32), b = c.createBuffer(1, len, sr), d = b.getChannelData(0);
  let lp = 0, seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    // two rustle swells (lift, then lay down) with paper crackle
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, t / 0.55)), 2) * 0.7 + Math.exp(-Math.pow((t - 0.78) / 0.07, 2)) * 0.5;
    const n = rnd() * (1 + (rnd() > 0.985 ? 2.5 : 0));
    lp += (n - lp) * 0.35;
    d[i] = (n - lp) * env * 0.5 * (1 - t);
  }
  return b;
}

export function playPageTurn() {
  if (!enabled) return;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    ctx ||= new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    buf ||= make(ctx);
    const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf; s.playbackRate.value = 0.94 + Math.random() * 0.12;
    bp.type = "bandpass"; bp.frequency.value = 2600; bp.Q.value = 0.6;
    g.gain.value = 0.22;
    s.connect(bp).connect(g).connect(ctx.destination);
    s.start();
  } catch { /* audio is optional */ }
}

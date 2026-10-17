/** 16 kHz mono microphone capture through an AudioWorklet (100 ms chunks). Everything is closed by close(): tracks, graph, context. */
const WORKLET = `class Cap extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(1600);this.n=0;this.on=true;this.port.onmessage=(e)=>{if(e.data==='stop')this.on=false}}
process(i){if(!this.on)return false;const c=i[0]&&i[0][0];if(!c)return true;for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===1600){this.port.postMessage(this.b.slice(0));this.n=0}}return true}}registerProcessor('qt-cap',Cap)`;
export type Mic = { close(): void; rate: number };
export async function openMic(onChunk: (x: Float32Array) => void): Promise<Mic> {
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
  let ctx: AudioContext | null = null, url = "";
  const close = () => { try { stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ } try { void ctx?.close(); } catch { /* ignore */ } if (url) URL.revokeObjectURL(url); ctx = null; };
  try {
    ctx = new AC({ sampleRate: 16000, latencyHint: "interactive" }) as AudioContext; // the browser resamples the microphone to 16 kHz
    url = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
    await ctx.audioWorklet.addModule(url);
    const src = ctx.createMediaStreamSource(stream), node = new AudioWorkletNode(ctx, "qt-cap", { numberOfInputs: 1, numberOfOutputs: 0 });
    node.port.onmessage = (e) => onChunk(e.data as Float32Array);
    src.connect(node);
    if (ctx.state === "suspended") await ctx.resume();
    const rate = ctx.sampleRate;
    return { close() { try { node.port.postMessage("stop"); node.port.onmessage = null; src.disconnect(); } catch { /* ignore */ } close(); }, rate };
  } catch (e) { close(); throw e; }
}

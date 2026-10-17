/// <reference lib="webworker" />
import { pipeline, env } from "@huggingface/transformers";
import type { FromWorker, ToWorker } from "./protocol";
import { MODEL } from "./model";

/** Whisper runs here, off the UI thread. Only the model weights come from Hugging Face; the WASM runtime is bundled with the app (./ort/). */
const post = (m: FromWorker) => (self as unknown as Worker).postMessage(m);
let asr: any = null, threads = 1;
env.allowLocalModels = false; env.allowRemoteModels = true; env.useBrowserCache = true;
async function load(o: string, app: string) {
  const t0 = performance.now();
  threads = (self as any).crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1;
  const wasm = env.backends.onnx.wasm as any;
  wasm.wasmPaths = { mjs: o + "ort-wasm-simd-threaded.mjs", wasm: o + "ort-wasm-simd-threaded.wasm" };
  wasm.numThreads = threads; wasm.proxy = false;
  if (MODEL.genConfig) { // the exported model ships a stripped generation_config: serve the bundled one (same architecture), everything else comes from Hugging Face
    const gc = new URL(MODEL.genConfig, app).href, orig = env.fetch;
    env.fetch = async (u: any, init: any) => (String(u).includes("generation_config.json") ? orig(gc) : orig(u, init));
  }
  asr = await pipeline("automatic-speech-recognition", MODEL.id, {
    dtype: "q8", device: "wasm", revision: MODEL.rev,
    progress_callback: (p: any) => { if (p?.status === "progress" && p.file) post({ t: "progress", loaded: p.loaded ?? 0, total: p.total ?? 0, file: p.file }); },
  } as any);
  // warm-up: the first run compiles kernels
  await asr(new Float32Array(16000).fill(0), { language: "ar", task: "transcribe" }).catch(() => {});
  post({ t: "ready", ms: Math.round(performance.now() - t0), threads, backend: "wasm" });
}

self.onmessage = async (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  try {
    if (m.t === "load") await load(m.ort, m.app);
    else if (m.t === "run") {
      if (!asr) throw new Error("not loaded");
      const t = performance.now();
      let words: { w: string; s: number; e: number }[];
      if (MODEL.words) { const r: any = await asr(m.audio, { language: "ar", task: "transcribe", return_timestamps: "word" }); words = (r.chunks || []).map((c: any) => ({ w: String(c.text), s: c.timestamp?.[0] ?? 0, e: c.timestamp?.[1] ?? 0 })); }
      else { const r: any = await asr(m.audio, { language: "ar", task: "transcribe" }); words = String(r.text || "").split(/\s+/).filter(Boolean).map((w) => ({ w, s: -1, e: -1 })); }
      post({ t: "result", id: m.id, words, sec: (performance.now() - t) / 1000 });
    } else if (m.t === "dispose") { asr = null; self.close(); }
  } catch (err) { post({ t: "error", id: (m as any).id, msg: String((err as Error)?.message || err) }); }
};

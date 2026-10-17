import { Capacitor } from "@capacitor/core";
import type { FromWorker, WorkerLike } from "./protocol";

/** Quran-tuned Whisper tiny (tarteel-ai/whisper-tiny-ar-quran, Apache-2.0), ONNX q8 export for transformers.js. Pinned revision. */
export const MODEL = { id: "Sharjeelbaig/whisper-tiny-ar-quran-onnx", rev: "cd93bdec117adc2f84d6c4ab91c10164a2e9bee9", base: "tarteel-ai/whisper-tiny-ar-quran", license: "Apache-2.0", bytes: 46_000_000 };
export type EngineMode = "auto" | "platform" | "precise";
const K = { mode: "qt.engine", ready: "qt.precise.ready", rev: "qt.precise.rev" };
const ls = () => (typeof localStorage === "undefined" ? null : localStorage);
export const getEngineMode = (): EngineMode => { const v = ls()?.getItem(K.mode); return v === "platform" || v === "precise" ? v : "auto"; };
export const setEngineMode = (m: EngineMode) => { try { ls()?.setItem(K.mode, m); } catch { /* ignore */ } };
export const modelReady = () => ls()?.getItem(K.ready) === MODEL.rev;
const markReady = (on: boolean) => { try { if (on) ls()?.setItem(K.ready, MODEL.rev); else ls()?.removeItem(K.ready); } catch { /* ignore */ } };

/** can this runtime run the Precise engine at all? (Worker, WebAssembly, AudioWorklet, mic) */
export function preciseCapable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined" && !!(w.AudioContext || w.webkitAudioContext) && typeof (w.AudioWorkletNode) !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}
/** engine used for the next recitation. Precise (beta) is used only when the user picked it AND the model is installed AND the runtime can run it;
 *  Auto and Platform use the platform recogniser (measured accuracy of the tiny on-device model is not yet better, see README). */
export function choosePrecise(mode = getEngineMode()): boolean {
  return mode === "precise" && modelReady() && preciseCapable();
}
export const isNative = () => Capacitor.isNativePlatform();

/** tests (and e2e) can replace the worker */
export function spawnWorker(): WorkerLike {
  const f = (globalThis as any).__qtPreciseWorker as (() => WorkerLike) | undefined;
  if (f) return f();
  return new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike;
}

export type Download = { cancel(): void; done: Promise<void> };
/** Download the model once (the worker fetches it from Hugging Face into Cache Storage); consent is given by the user pressing the button. */
export function downloadModel(onProgress: (loaded: number, total: number) => void): Download {
  const w = spawnWorker(); let finished = false; let rej: (e: Error) => void = () => {};
  const files = new Map<string, { l: number; t: number }>();
  const done = new Promise<void>((res, r) => {
    rej = r;
    w.onmessage = (e) => {
      const m = e.data as FromWorker;
      if (m.t === "progress") { files.set(m.file, { l: m.loaded, t: m.total }); let l = 0, t = 0; files.forEach((v) => { l += v.l; t += v.t; }); onProgress(l, Math.max(t, MODEL.bytes * 0.9)); }
      else if (m.t === "ready") { finished = true; markReady(true); w.terminate(); res(); }
      else if (m.t === "error") { finished = true; w.terminate(); r(new Error(m.msg)); }
    };
    w.onerror = () => { if (!finished) { finished = true; w.terminate(); r(new Error("worker")); } };
    w.postMessage({ t: "load", ort: new URL("ort/", document.baseURI).href });
  });
  return { cancel() { if (!finished) { finished = true; w.terminate(); rej(new Error("cancelled")); } }, done };
}
/** remove the model (and the cached runtime) from Cache Storage */
export async function deleteModel(): Promise<void> {
  markReady(false);
  try { const ks = await caches.keys(); await Promise.all(ks.filter((k) => /transformers|qt-precise/i.test(k)).map((k) => caches.delete(k))); } catch { /* ignore */ }
}
/** approximate storage used by the model (MB) */
export const modelMB = () => Math.round(MODEL.bytes / 1e6);

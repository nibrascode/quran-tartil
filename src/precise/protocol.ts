import type { TWord } from "./pipeline";
/** messages between the app and the Whisper worker */
export type ToWorker = { t: "load"; ort: string; app: string } | { t: "run"; id: number; audio: Float32Array; prompt?: string } | { t: "dispose" };
export type FromWorker =
  | { t: "progress"; loaded: number; total: number; file: string }
  | { t: "ready"; ms: number; threads: number; backend: string }
  | { t: "result"; id: number; words: TWord[]; sec: number }
  | { t: "error"; id?: number; msg: string };
/** the part of a Worker the engine needs (a fake implements it in tests) */
export interface WorkerLike { postMessage(m: ToWorker, transfer?: Transferable[]): void; terminate(): void; onmessage: ((e: { data: FromWorker }) => void) | null; onerror: ((e: unknown) => void) | null }

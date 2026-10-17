// Copies the (CPU) WASM runtime of onnxruntime-web into public/ort so the app never loads code from a CDN.
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
const src = "node_modules/onnxruntime-web/dist/", dst = "public/ort/";
mkdirSync(dst, { recursive: true });
for (const f of ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) { if (!existsSync(src + f)) throw new Error("missing " + src + f); copyFileSync(src + f, dst + f); }

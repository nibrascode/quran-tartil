import { ayahs, indexOf, stripBasmala, suras, toArabicDigits } from "./quran";
import { RESOURCES, entry, status, type Res } from "./library";
import { readTicks } from "./LibPanel";

/** the first ticked translation on the device for an ayah (for sharing), or null */
export async function shareTranslation(s: number, a: number): Promise<{ r: Res; text: string } | null> {
  const list = RESOURCES.filter((r) => r.kind === "tr");
  const ns = await Promise.all(list.map((r) => status(r.id)));
  const have = list.filter((_, i) => ns[i] >= 114);
  const ticks = readTicks("tr") ?? (have[0] ? [have[0].id] : []);
  const r = have.find((x) => ticks.includes(x.id)); if (!r) return null;
  const e = await entry(r.id, s, a); return e && e.text ? { r, text: e.text } : null;
}
const arText = (s: number, a: number) => { const t = ayahs[indexOf(s, a)].t; return a === 1 && s !== 1 && s !== 9 ? stripBasmala(t) : t; };

function wrap(ctx: CanvasRenderingContext2D, text: string, w: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) { const t = line ? line + " " + word : word; if (ctx.measureText(t).width > w && line) { out.push(line); line = word; } else line = t; }
    out.push(line);
  }
  return out;
}
/** PNG card: Arabic ayah (unchanged text), optional translation, reference */
export async function ayahImage(s: number, a: number, tr: { r: Res; text: string } | null, dark = false): Promise<Blob> {
  await document.fonts?.load('48px "Amiri Quran"').catch(() => {});
  const W = 1080, P = 80, cv = document.createElement("canvas"), ctx = cv.getContext("2d")!;
  const arFont = '52px "Amiri Quran", "Amiri", serif', trFont = '34px system-ui, sans-serif';
  ctx.font = arFont; const arL = wrap(ctx, arText(s, a), W - 2 * P);
  ctx.font = trFont; const trL = tr ? wrap(ctx, tr.text.length > 900 ? tr.text.slice(0, 900) + "…" : tr.text, W - 2 * P) : [];
  const H = P + arL.length * 104 + (trL.length ? 40 + trL.length * 50 + 40 : 0) + 120 + P;
  cv.width = W; cv.height = H;
  ctx.fillStyle = dark ? "#0f1412" : "#f6efdc"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = dark ? "#3d6f5c" : "#1d5a45"; ctx.lineWidth = 6; ctx.strokeRect(24, 24, W - 48, H - 48);
  const fg = dark ? "#ece6d6" : "#14110b";
  let y = P + 70;
  ctx.fillStyle = fg; ctx.font = arFont; ctx.textAlign = "right"; ctx.direction = "rtl";
  for (const l of arL) { ctx.fillText(l, W - P, y); y += 104; }
  if (trL.length) {
    y += 10; ctx.font = trFont; ctx.direction = tr!.r.dir === "rtl" ? "rtl" : "ltr"; ctx.textAlign = tr!.r.dir === "rtl" ? "right" : "left";
    ctx.fillStyle = dark ? "#c8c1af" : "#3b352a";
    for (const l of trL) { ctx.fillText(l, tr!.r.dir === "rtl" ? W - P : P, y); y += 50; }
    y += 20;
  }
  ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.fillStyle = dark ? "#7fc0a5" : "#1d5a45"; ctx.font = '36px "Amiri Quran", serif';
  ctx.fillText(`﴿ سورة ${suras[s - 1].name} · ${toArabicDigits(a)} ﴾  ${s}:${a}`, W / 2, y + 40);
  ctx.font = "24px system-ui, sans-serif"; ctx.fillStyle = dark ? "#8f8a7e" : "#7a7262"; ctx.direction = "ltr";
  ctx.fillText("Quran Tartil" + (tr ? " · " + tr.r.name : ""), W / 2, y + 86);
  return new Promise((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error("canvas"))), "image/png"));
}

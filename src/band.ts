/**
 * Selected-ayah highlight as one continuous soft band per line (instead of a box around every word).
 * Bands live inside .page-body behind the text. Returns the vertical extent (viewport px, shift removed) so the page can be moved above the sheet.
 */
export type BandInfo = { top: number; bottom: number } | null;
export function drawBands(page: number, sel: { s: number; a: number } | null, shift = 0): BandInfo {
  document.querySelectorAll(".band").forEach((b) => b.remove());
  if (!sel) return null;
  const host = document.querySelector<HTMLElement>(`.page[data-page="${page}"] .page-body`);
  if (!host) return null;
  const hr = host.getBoundingClientRect();
  const lines = new Map<HTMLElement, DOMRect[]>();
  host.querySelectorAll<HTMLElement>(`.mtext .ayah[data-s="${sel.s}"][data-a="${sel.a}"]`).forEach((w) => {
    const ln = (w.closest(".ln, .line") as HTMLElement) || w;
    const arr = lines.get(ln) || [];
    arr.push(w.getBoundingClientRect());
    lines.set(ln, arr);
  });
  let top = Infinity, bottom = -Infinity;
  const rows = [...lines.entries()].sort((a, b) => a[0].getBoundingClientRect().top - b[0].getBoundingClientRect().top);
  rows.forEach(([ln, rects], i) => {
    const lr = ln.getBoundingClientRect();
    const l = Math.min(...rects.map((r) => r.left)) - 4, r = Math.max(...rects.map((x) => x.right)) + 4;
    const d = document.createElement("div");
    d.className = "band" + (i === 0 ? " first" : "") + (i === rows.length - 1 ? " last" : "");
    d.style.cssText = `left:${Math.max(0, l - hr.left)}px;width:${Math.min(hr.width, r - l)}px;top:${lr.top - hr.top}px;height:${lr.height}px`;
    host.prepend(d);
    top = Math.min(top, lr.top); bottom = Math.max(bottom, lr.bottom);
  });
  return rows.length ? { top: top - shift, bottom: bottom - shift } : null;
}

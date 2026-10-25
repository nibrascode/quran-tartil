// Landscape reading mode: only the ayah text, full screen. A tap on the page shows controls for 3 s.
const mq = window.matchMedia("(orientation: landscape) and (max-height: 600px)");
const root = document.documentElement;
let timer = 0;
function apply() {
  root.classList.toggle("land", mq.matches);
  if (!mq.matches) { root.classList.remove("land-ui"); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); }
}
mq.addEventListener?.("change", apply);
apply();
document.addEventListener("click", (e) => {
  if (!root.classList.contains("land")) return;
  const el = e.target as HTMLElement;
  if (el.closest("button,a,input,.dock,.sheet,[role=dialog]")) return;
  if (!el.closest(".page-body,.page")) return;
  // web: try real fullscreen on the first tap (needs a user gesture); ignored where unsupported
  if (!document.fullscreenElement && !(window as any).Capacitor?.isNativePlatform?.()) root.requestFullscreen?.().catch(() => {});
  root.classList.toggle("land-ui");
  clearTimeout(timer);
  if (root.classList.contains("land-ui")) timer = window.setTimeout(() => root.classList.remove("land-ui"), 3000);
}, true);

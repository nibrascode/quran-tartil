import "./landscape";
import { createRoot } from "react-dom/client";
import "@fontsource/amiri-quran/400.css";
import "./styles.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);

// new deploys reach open tabs quickly: the new service worker activates at once and the page reloads (autoUpdate)
if (typeof window !== "undefined" && "serviceWorker" in navigator && !(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true, onRegisteredSW(_u, r) {
      if (!r) return;
      const check = () => { if (navigator.onLine) r.update().catch(() => {}); };
      setInterval(check, 30 * 60 * 1000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
    } });
  }).catch(() => {});
}

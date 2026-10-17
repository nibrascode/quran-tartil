import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "apple-touch-icon.png", "favicon.ico", "favicon-32.png", "OFL-AmiriQuran.txt"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,svg,png,txt}"], globIgnores: ["**/worker-*.js", "ort/**"], maximumFileSizeToCacheInBytes: 6_000_000,
        // the Whisper worker and its WASM runtime are cached when the user installs the Precise model (not for every visitor)
        runtimeCaching: [{ urlPattern: /\/(ort\/|assets\/worker-)/, handler: "CacheFirst", options: { cacheName: "qt-precise-ort", expiration: { maxEntries: 8 } } }],
      },
      manifest: {
        name: "Quran Tartil",
        short_name: "Tartil",
        start_url: ".",
        display: "standalone",
        background_color: "#06193a",
        theme_color: "#06193a",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  build: { target: "es2022" },
  worker: { format: "es" },
});

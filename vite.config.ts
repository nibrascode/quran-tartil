import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-192.png", "OFL-AmiriQuran.txt"],
      workbox: { globPatterns: ["**/*.{js,css,html,woff2,svg,png,txt}"], maximumFileSizeToCacheInBytes: 6_000_000 },
      manifest: {
        name: "Quran Tartil",
        short_name: "Tartil",
        start_url: ".",
        display: "standalone",
        background_color: "#f6efdc",
        theme_color: "#f6efdc",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
  build: { target: "es2022" },
});

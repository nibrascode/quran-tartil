import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nibrascode.qurantartil",
  appName: "Quran Tartil",
  webDir: "dist",
  android: { allowMixedContent: false, adjustMarginsForEdgeToEdge: "force", backgroundColor: "#06193a" }, // Android 15 draws edge to edge: keep the web content between the system bars
  plugins: {},
};
export default config;

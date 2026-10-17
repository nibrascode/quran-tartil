import { Capacitor } from "@capacitor/core";

export type Haptic = "light" | "ok" | "warn";
let enabled = true;
export const setHaptics = (on: boolean) => { enabled = on; };

/** haptic feedback: native haptics in the app, short vibration on Android browsers, nothing elsewhere */
export async function haptic(kind: Haptic = "light") {
  if (!enabled) return;
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
      if (kind === "light") await Haptics.impact({ style: ImpactStyle.Light });
      else await Haptics.notification({ type: kind === "ok" ? NotificationType.Success : NotificationType.Warning });
    } else if ("vibrate" in navigator) navigator.vibrate(kind === "light" ? 8 : kind === "ok" ? [12, 40, 12] : [30, 40, 30]);
  } catch { /* unsupported */ }
}

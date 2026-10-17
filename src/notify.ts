import { Capacitor } from "@capacitor/core";

export const canNotify = () => Capacitor.isNativePlatform();
/** Daily local reminder (Android app only; browsers cannot schedule while closed). */
export async function setReminder(on: boolean, h: number, m: number, title: string, body: string): Promise<"ok" | "denied" | "unsupported"> {
  if (!canNotify()) return "unsupported";
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({ notifications: [{ id: 1 }] }).catch(() => {});
  if (!on) return "ok";
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return "denied";
  await LocalNotifications.schedule({ notifications: [{ id: 1, title, body, schedule: { on: { hour: h, minute: m }, allowWhileIdle: true } }] });
  return "ok";
}

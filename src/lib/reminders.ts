/**
 * Notification & Reminder utilities for Grain.
 * Supports Web Notifications API and Capacitor Local Notifications.
 */

import { Capacitor } from "@capacitor/core";

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const status = await LocalNotifications.requestPermissions();
      return status.display === "granted";
    } catch {
      return false;
    }
  }

  if ("Notification" in window) {
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  return false;
}

export async function scheduleDailyReminder(enabled: boolean): Promise<boolean> {
  if (!enabled) {
    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");
        await LocalNotifications.cancel({ notifications: [{ id: 1001 }] });
      } catch {}
    }
    return false;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      // Schedule daily reminder at 8:00 PM
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Grain · Maintain your streak",
            body: "Don't break the chain today! Check off your habits now.",
            id: 1001,
            schedule: {
              on: { hour: 20, minute: 0 },
              repeats: true,
            },
          },
        ],
      });
    } catch (e) {
      console.warn("Could not schedule native notification", e);
    }
  } else if ("Notification" in window && Notification.permission === "granted") {
    // Web notification confirmation
    new Notification("Grain · Reminders Activated", {
      body: "Daily reminders enabled for 8:00 PM to help keep your streak alive.",
      icon: "/icon.png",
    });
  }

  return true;
}

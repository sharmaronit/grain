/**
 * Notification & Reminder utilities for Grain.
 * Supports Web Notifications API and Capacitor Local Notifications with high-priority channels.
 */

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export const NOTIFICATION_CHANNEL_ID = "grain_reminders";

/**
 * Initializes Android notification channels with High Importance
 * so reminders pop up with sound, vibration, and heads-up banners.
 */
export async function initNotificationChannels(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: "Habit Reminders",
      description: "Daily habit check-ins and streak alerts",
      importance: 5, // IMPORTANCE_HIGH (heads-up banner + sound)
      visibility: 1, // VISIBILITY_PUBLIC
      vibration: true,
      lights: true,
      lightColor: "#22c55e",
    });
  } catch (e) {
    console.warn("Could not create notification channel:", e);
  }
}

/**
 * Requests notification permissions from the OS (Android 13+ runtime dialog or Web).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannels();
      const status = await LocalNotifications.requestPermissions();
      return status.display === "granted";
    } catch {
      return false;
    }
  }

  if ("Notification" in window) {
    try {
      const result = await Notification.requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Sends an immediate test notification (2-second delay) so the user can verify
 * notification permissions, channel priority, sound, and banner presentation on their device.
 */
export async function sendTestNotification(): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannels();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 9999,
            title: "⚡ Grain · Streak Protector Active",
            body: "Notifications are working! We'll remind you to check off your habits and protect your streak.",
            channelId: NOTIFICATION_CHANNEL_ID,
            schedule: {
              at: new Date(Date.now() + 2000), // Fire in 2 seconds
              allowWhileIdle: true,
            },
          },
        ],
      });
      return true;
    } catch (e) {
      console.warn("Test notification error:", e);
      return false;
    }
  }

  if ("Notification" in window && Notification.permission === "granted") {
    setTimeout(() => {
      new Notification("⚡ Grain · Streak Protector Active", {
        body: "Notifications are working! We'll remind you to check off your habits and protect your streak.",
        icon: "/icon.png",
      });
    }, 1500);
    return true;
  }

  return false;
}

export interface HabitReminderOptions {
  enabled: boolean;
  reminderTime?: string; // "HH:MM" e.g. "20:00"
  morningKickoff?: boolean;
  morningTime?: string; // "HH:MM" e.g. "08:00"
  uncompletedCount?: number;
  streak?: number;
  allDone?: boolean;
  habits?: { id: string; name: string; reminderTime: string; done: boolean }[];
}

/**
 * Schedules dynamic, intelligent multi-day notifications based on habit state.
 */
export async function scheduleHabitReminders(opts: HabitReminderOptions): Promise<boolean> {
  const {
    enabled,
    reminderTime = "20:00",
    morningKickoff = false,
    morningTime = "08:00",
    uncompletedCount = 0,
    streak = 0,
    allDone = false,
    habits = [],
  } = opts;

  if (!enabled) {
    if (Capacitor.isNativePlatform()) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }
      } catch {}
    }
    return false;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  if (Capacitor.isNativePlatform()) {
    try {
      await initNotificationChannels();

      // Clear previous pending reminders
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      const [eHourStr, eMinStr] = reminderTime.split(":");
      const eveningHour = parseInt(eHourStr || "20", 10);
      const eveningMin = parseInt(eMinStr || "0", 10);

      const [mHourStr, mMinStr] = morningTime.split(":");
      const morningHour = parseInt(mHourStr || "8", 10);
      const morningMin = parseInt(mMinStr || "0", 10);

      const now = new Date();
      const notificationsToSchedule = [];

      // Schedule for the next 7 days
      for (let i = 0; i < 7; i++) {
        // ── Evening Reminder (Streak Protection) ──
        const eveningDate = new Date(now);
        eveningDate.setDate(eveningDate.getDate() + i);
        eveningDate.setHours(eveningHour, eveningMin, 0, 0);

        // For today: only schedule if not already past time and not all habits done
        const skipEveningToday = i === 0 && (allDone || eveningDate.getTime() <= now.getTime());

        if (!skipEveningToday) {
          let eveningBody = "Don't break the chain today! Check off your habits now.";
          if (i === 0 && uncompletedCount > 0) {
            eveningBody = `You have ${uncompletedCount} habit${uncompletedCount > 1 ? "s" : ""} left today! Protect your ${
              streak > 0 ? `${streak}-day ` : ""
            }streak.`;
          } else if (streak > 0) {
            eveningBody = `Keep your ${streak}-day streak alive! Complete your habits before midnight.`;
          }

          notificationsToSchedule.push({
            id: 1000 + i,
            title: "Grain · Maintain your streak",
            body: eveningBody,
            channelId: NOTIFICATION_CHANNEL_ID,
            schedule: {
              at: eveningDate,
              allowWhileIdle: true,
            },
          });
        }

        // ── Morning Kickoff (if enabled) ──
        if (morningKickoff) {
          const morningDate = new Date(now);
          morningDate.setDate(morningDate.getDate() + i);
          morningDate.setHours(morningHour, morningMin, 0, 0);

          const skipMorningToday = i === 0 && morningDate.getTime() <= now.getTime();

          if (!skipMorningToday) {
            notificationsToSchedule.push({
              id: 2000 + i,
              title: "☀️ Grain · Morning Focus",
              body: "Start your day with one grain of effort. Check off your morning habits!",
              channelId: NOTIFICATION_CHANNEL_ID,
              schedule: {
                at: morningDate,
                allowWhileIdle: true,
              },
            });
          }
        }

        // ── Per-Habit Reminders ──
        habits.forEach((habit, hIdx) => {
          if (!habit.reminderTime) return;
          const [hHourStr, hMinStr] = habit.reminderTime.split(":");
          const hHour = parseInt(hHourStr || "12", 10);
          const hMin = parseInt(hMinStr || "0", 10);

          const habitDate = new Date(now);
          habitDate.setDate(habitDate.getDate() + i);
          habitDate.setHours(hHour, hMin, 0, 0);

          const skipHabitToday = i === 0 && (habit.done || habitDate.getTime() <= now.getTime());

          if (!skipHabitToday) {
            notificationsToSchedule.push({
              id: 3000 + i * 100 + hIdx,
              title: `Grain · ${habit.name}`,
              body: `Time for "${habit.name}". Just 1% better every day.`,
              channelId: NOTIFICATION_CHANNEL_ID,
              schedule: {
                at: habitDate,
                allowWhileIdle: true,
              },
            });
          }
        });
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
      }

      return true;
    } catch (e) {
      console.warn("Could not schedule native notifications:", e);
      return false;
    }
  } else if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Grain · Reminders Active", {
      body: `Daily reminders set for ${reminderTime}.`,
      icon: "/icon.png",
    });
    return true;
  }

  return false;
}

/**
 * Backward-compatible helper for simple toggle
 */
export async function scheduleDailyReminder(
  enabled: boolean,
  reminderTime: string = "20:00",
  morningKickoff: boolean = false
): Promise<boolean> {
  return scheduleHabitReminders({
    enabled,
    reminderTime,
    morningKickoff,
  });
}

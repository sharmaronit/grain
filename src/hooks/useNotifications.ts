import { useEffect, useCallback, useState } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export function useNotifications(remindersOn: boolean, reminderTime: string = '20:00') {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.checkPermissions().then((status) => {
        setHasPermission(status.display === 'granted');
      });
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.requestPermissions();
      const granted = status.display === 'granted';
      setHasPermission(granted);
      return granted;
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      const status = await Notification.requestPermission();
      const granted = status === 'granted';
      setHasPermission(granted);
      return granted;
    }
    return false;
  }, []);

  const scheduleReminders = useCallback(async (isTodayComplete: boolean, uncompletedCount: number) => {
    if (!Capacitor.isNativePlatform()) return;

    // Clear all existing notifications first
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    if (!remindersOn || !hasPermission) return;

    const [hourStr, minuteStr] = reminderTime.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const now = new Date();
    const notificationsToSchedule = [];

    // Schedule for the next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      date.setHours(hour, minute, 0, 0);

      // If it's today
      if (i === 0) {
        // Skip today if already completed, or if the time has already passed
        if (isTodayComplete || date.getTime() <= now.getTime()) {
          continue;
        }
      }

      let body = "Don't break the chain today! Check off your habits now.";
      if (i === 0 && uncompletedCount > 0) {
        body = `You have ${uncompletedCount} habit${uncompletedCount > 1 ? 's' : ''} left for today. Keep the streak alive!`;
      }

      notificationsToSchedule.push({
        id: i + 100, // IDs 100-106
        title: "Grain · Maintain your streak",
        body,
        schedule: { at: date },
      });
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    }
  }, [remindersOn, reminderTime, hasPermission]);

  return {
    hasPermission,
    requestPermission,
    scheduleReminders,
  };
}

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { subscribeLocalData } from "../lib/local-data";
import { HabitActions, syncExternalHabits } from "../lib/habit-actions-bridge";
import { useWidgetsEnabled } from "./useWidgetPreferences";

export function useExternalHabits(
  userId: string | null,
  theme: string,
  enabled: boolean,
  reminderTime: string,
  dailySummary: boolean,
  morningKickoff: boolean,
) {
  const widgetsEnabled = useWidgetsEnabled();
  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!disposed)
          void syncExternalHabits(userId, {
            theme,
            enabled,
            reminderTime,
            dailySummary,
            morningKickoff,
            widgetsEnabled,
          }).catch((error) => console.error("Habit action sync failed", error));
      }, 100);
    };
    const unsubscribe = userId ? subscribeLocalData(userId, refresh) : () => {};
    const actions = HabitActions.addListener("changed", refresh);
    const resume = App.addListener("appStateChange", (state) => {
      if (state.isActive) refresh();
    });
    const interval = setInterval(refresh, 60_000);
    refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearInterval(interval);
      unsubscribe();
      void actions.then((handle) => handle.remove());
      void resume.then((handle) => handle.remove());
    };
  }, [userId, theme, enabled, reminderTime, dailySummary, morningKickoff, widgetsEnabled]);
}

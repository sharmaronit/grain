import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { applyExternalHabitActions, readLocalData } from "./local-data";
import type { ExternalHabitAction } from "./external-actions";
import { formatDateKey } from "./dates";
import { getWidgetsEnabled } from "./widget-preferences";

interface HabitActionsPlugin {
  getPending(): Promise<{ actions: ExternalHabitAction[] }>;
  synchronize(options: { snapshot: unknown; ackIds: string[] }): Promise<void>;
  pinWidget(options: { compact?: boolean; kind?: "compact" | "checklist" | "heatmap" | "progress"; design?: "classic" | "paper" | "oled" | "botanical" | "dots" }): Promise<{ supported: boolean }>;
  testReminder(): Promise<{ shown: boolean }>;
  consumeCreateHabitRequest(): Promise<{ open: boolean; userId: string }>;
  addListener(event: "changed" | "createHabitRequested", listener: () => void): Promise<PluginListenerHandle>;
}
export const HabitActions = registerPlugin<HabitActionsPlugin>("HabitActions");
let queue: Promise<void> = Promise.resolve();
interface Options {
  widgetsEnabled?: boolean;
  theme: string;
  enabled: boolean;
  reminderTime: string;
  dailySummary: boolean;
  morningKickoff: boolean;
}
export function syncExternalHabits(userId: string | null, options: Options): Promise<void> {
  const run = async () => {
    const { actions } = await HabitActions.getPending();
    const relevant = actions.filter((action) => action.userId === userId);
    if (userId) applyExternalHabitActions(userId, relevant);
    const data = userId ? readLocalData(userId) : null;
    // Seven days of history covers late delivery without sending large photo preferences.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const completions = Object.fromEntries(
      Object.entries(data?.completions ?? {}).filter(([date]) => date >= formatDateKey(cutoff)),
    );
    await HabitActions.synchronize({
      snapshot: {
        userId,
        ...options,
        widgetsEnabled: options.widgetsEnabled ?? getWidgetsEnabled(),
        habits: data?.habits ?? [],
        completions,
        receipts: data?.prefs.externalActionReceipts ?? {},
      },
      ackIds: relevant.map((action) => action.id),
    });
  };
  queue = queue.catch(() => {}).then(run);
  return queue;
}

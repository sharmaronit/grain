import type { GrainLocalData } from "./local-data";
import type { CompletionEntry } from "./streaks";
import { isScheduledDay, parseDateKey, formatDateKey } from "./dates";

export interface ExternalHabitAction {
  id: string;
  userId: string;
  habitId: string;
  dateKey: string;
  operation: "complete" | "increment" | "undo";
  at: string;
  referenceId?: string;
}
interface Receipt {
  habitId: string;
  dateKey: string;
  before: CompletionEntry | null;
  after: CompletionEntry | null;
}
const emptyEntry = (): CompletionEntry => ({
  done: false,
  value: null,
  note: "",
  restDay: false,
  frozenStreak: false,
  completedAt: null,
});
const equal = (a: CompletionEntry | null, b: CompletionEntry | null) => {
  const stable = (entry: CompletionEntry | null) =>
    entry === null
      ? null
      : Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
};

/** Replay operations, never replace the app's store with a native snapshot. */
export function reduceExternalActions(
  data: GrainLocalData,
  userId: string,
  actions: ExternalHabitAction[],
): GrainLocalData {
  const receipts = {
    ...(data.prefs.externalActionReceipts as Record<string, Receipt> | undefined),
  };
  const completions = { ...data.completions };
  for (const action of actions) {
    if (action.userId !== userId || receipts[action.id]) continue;
    const habit = data.habits.find((h) => h.id === action.habitId);
    const date = parseDateKey(action.dateKey);
    if (
      !habit ||
      !Number.isFinite(new Date(action.at).getTime()) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(action.dateKey) ||
      formatDateKey(date) !== action.dateKey ||
      !isScheduledDay(habit.frequency, habit.customDays, date)
    )
      continue;
    const before = completions[action.dateKey]?.[habit.id] ?? null;
    let after: CompletionEntry | null = { ...emptyEntry(), ...before };
    if (action.operation === "undo") {
      const original = receipts[action.referenceId ?? ""];
      if (
        !original ||
        original.habitId !== habit.id ||
        original.dateKey !== action.dateKey ||
        !equal(before, original.after)
      ) {
        receipts[action.id] = { habitId: habit.id, dateKey: action.dateKey, before, after: before };
        continue;
      }
      after = original.before;
    } else if (!after.done && !after.restDay && !after.skipped && !after.frozenStreak) {
      if (habit.type === "numeric") {
        const target = Math.max(1, habit.target ?? 1);
        after.value = Math.min(target, Math.max(0, after.value ?? 0) + 1);
        after.done = after.value >= target;
      } else {
        after.done = true;
      }
      if (after.done) after.completedAt = new Date(action.at);
    }
    const day = { ...(completions[action.dateKey] ?? {}) };
    if (after) day[habit.id] = after;
    else delete day[habit.id];
    completions[action.dateKey] = day;
    receipts[action.id] = { habitId: habit.id, dateKey: action.dateKey, before, after };
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const keep = new Set(actions.flatMap((action) => [action.id, action.referenceId]));
  for (const [id, receipt] of Object.entries(receipts)) {
    if (receipt.dateKey < formatDateKey(cutoff) && !keep.has(id)) delete receipts[id];
  }
  // Keep all receipts in this batch until the native queue acknowledges them,
  // including old actions delivered after the app has been closed for weeks.
  return { ...data, completions, prefs: { ...data.prefs, externalActionReceipts: receipts } };
}

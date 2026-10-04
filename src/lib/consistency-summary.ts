import { formatDateKey, isScheduledDay } from "./dates";
import type { HabitDoc } from "./firestore";
import type { CompletionsMap } from "./streaks";

export function isTrackedDay(habit: HabitDoc, day: Date, today: Date): boolean {
  const key = formatDateKey(day);
  const created = new Date(habit.createdAt);
  return key <= formatDateKey(today) &&
    (!Number.isFinite(created.getTime()) || key >= formatDateKey(created)) &&
    isScheduledDay(habit.frequency, habit.customDays, day);
}

export function summarizeConsistency(habits: HabitDoc[], entries: CompletionsMap, category: string, date = new Date(), today = new Date()) {
  const filtered = habits.filter(h => category === "All habits" || h.category === category);
  const count = (day: Date) => {
    const scheduled = filtered.filter(h => isTrackedDay(h, day, today));
    const daily = entries[formatDateKey(day)] ?? {};
    return { total: scheduled.length, done: scheduled.filter(h => { const e = daily[h.id]; return e && (e.done || e.restDay || e.frozenStreak); }).length };
  };
  const selected = count(date);
  let running = 0, best = 0;
  const cursor = new Date(today); cursor.setHours(0, 0, 0, 0); cursor.setDate(cursor.getDate() - 363);
  for (let i = 0; i < 364; i++) {
    const day = count(cursor);
    if (day.total > 0) {
      if (day.done > 0) { running++; best = Math.max(best, running); }
      else if (formatDateKey(cursor) !== formatDateKey(today)) running = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { ...selected, rate: selected.total ? Math.round(selected.done / selected.total * 100) : 0, streak: running, best };
}

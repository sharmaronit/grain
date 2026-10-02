/**
 * Streak computation — pure functions, no Firebase dependency.
 */

import { formatDateKey, isScheduledDay, getWeekDates } from "./dates";

export interface CompletionEntry {
  done: boolean;
  value: number | null;
  note: string;
  restDay: boolean;
  frozenStreak: boolean;
  skipped?: boolean;
  completedAt: Date | null;
}

export type CompletionsMap = Record<
  string, // dateKey "YYYY-MM-DD"
  Record<string, CompletionEntry> // habitId → entry
>;

/**
 * Calculate the current streak for a habit by walking backwards from today
 * through the completions history.
 *
 * A day counts toward the streak if the habit was:
 *   - done (done === true)
 *   - a rest day (restDay === true)
 *   - streak was frozen (frozenStreak === true)
 *   - the habit was not scheduled for that day (frequency/customDays)
 *
 * A missed scheduled day pauses the streak. It does not add a day, but the
 * next qualifying check-in resumes from the existing total.
 */
export function calculateStreak(
  habitId: string,
  completionsMap: CompletionsMap,
  frequency: "daily" | "weekdays" | "custom",
  customDays: number[] | null | undefined,
  fromDate: Date = new Date(),
): number {
  let streak = 0;
  const cur = new Date(fromDate);
  cur.setHours(0, 0, 0, 0);

  // Walk backwards up to 1 year
  for (let i = 0; i < 366; i++) {
    const key = formatDateKey(cur);

    // If this day isn't scheduled for the habit, skip it (doesn't break streak)
    if (!isScheduledDay(frequency, customDays, cur)) {
      cur.setDate(cur.getDate() - 1);
      continue;
    }

    const entry = completionsMap[key]?.[habitId];

    if (entry && (entry.done || entry.restDay || entry.frozenStreak)) {
      streak++;
    } else if (i === 0) {
      // Today — if not done yet, don't break streak (day isn't over)
      // But don't count today toward streak either
      cur.setDate(cur.getDate() - 1);
      continue;
    } else {
      // Scheduled day with no completion → streak broken
      cur.setDate(cur.getDate() - 1);
      continue;
    }

    cur.setDate(cur.getDate() - 1);
  }

  return streak;
}

/**
 * Find the highest accumulated streak for a habit. Missed scheduled days
 * pause progress, matching calculateStreak, instead of resetting it.
 */
export function calculateBestStreak(
  habitId: string,
  completionsMap: CompletionsMap,
  frequency: "daily" | "weekdays" | "custom",
  customDays: number[] | null | undefined,
): number {
  // Gather all date keys that have entries for this habit, sorted ascending
  const dateKeys = Object.keys(completionsMap)
    .filter((k) => completionsMap[k]?.[habitId])
    .sort();

  if (dateKeys.length === 0) return 0;

  let bestStreak = 0;

  // Walk forward through all dates
  const startDate = new Date(dateKeys[0]);
  const endDate = new Date(dateKeys[dateKeys.length - 1]);
  const cur = new Date(startDate);

  while (cur <= endDate) {
    const key = formatDateKey(cur);

    if (!isScheduledDay(frequency, customDays, cur)) {
      // Not scheduled — skip without breaking
      cur.setDate(cur.getDate() + 1);
      continue;
    }

    const entry = completionsMap[key]?.[habitId];
    if (entry && (entry.done || entry.restDay || entry.frozenStreak)) {
      bestStreak++;
    }

    cur.setDate(cur.getDate() + 1);
  }

  return bestStreak;
}

/**
 * Count the number of days in the last 7 days where a streak-freeze was used.
 * Used to enforce a "max 1 freeze per week" limit.
 */
export function freezesUsedThisWeek(
  habitId: string,
  completionsMap: CompletionsMap,
  refDate: Date = new Date(),
): number {
  let count = 0;

  // Get all dates in the current calendar week (Mon-Sun)
  const weekDates = getWeekDates(refDate);

  for (const cur of weekDates) {
    if (cur > refDate) continue; // Only count up to the reference date
    const key = formatDateKey(cur);
    const entry = completionsMap[key]?.[habitId];
    if (entry?.frozenStreak) count++;
  }

  return count;
}

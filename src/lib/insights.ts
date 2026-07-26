import type { HabitDoc } from "./firestore";
import type { CompletionEntry } from "./streaks";
import { formatDateKey, isoDow } from "./dates";

export interface InsightsResult {
  weekdayRate: number;
  weekendRate: number;
  weekdayDiff: number;
  peakWindow: "Morning" | "Afternoon" | "Evening" | "Anytime";
  peakWindowRate: number;
  topHabit: { name: string; streak: number } | null;
  insightSummary: string;
}

export function computeWeeklyInsights(
  habits: HabitDoc[],
  completionsMap: Record<string, Record<string, CompletionEntry>>,
  habitStreaks: Record<string, { currentStreak: number; bestStreak: number }>,
): InsightsResult {
  if (habits.length === 0) {
    return {
      weekdayRate: 0,
      weekendRate: 0,
      weekdayDiff: 0,
      peakWindow: "Anytime",
      peakWindowRate: 0,
      topHabit: null,
      insightSummary: "Add your first habit to unlock personalized consistency insights.",
    };
  }

  let weekdayDone = 0;
  let weekdayScheduled = 0;
  let weekendDone = 0;
  let weekendScheduled = 0;

  const windowStats = {
    morning: { done: 0, total: 0 },
    afternoon: { done: 0, total: 0 },
    evening: { done: 0, total: 0 },
  };

  const today = new Date();
  const cur = new Date(today);
  cur.setHours(0, 0, 0, 0);

  // Walk back 28 days for statistically meaningful insights
  for (let i = 0; i < 28; i++) {
    const key = formatDateKey(cur);
    const dayEntries = completionsMap[key] ?? {};
    const dow = isoDow(cur); // 0=Mon ... 6=Sun
    const isWeekend = dow >= 5;

    for (const h of habits) {
      const entry = dayEntries[h.id];
      const isDone = Boolean(entry && (entry.done || entry.restDay || entry.frozenStreak));

      if (isWeekend) {
        weekendScheduled++;
        if (isDone) weekendDone++;
      } else {
        weekdayScheduled++;
        if (isDone) weekdayDone++;
      }

      if (h.time && h.time in windowStats) {
        windowStats[h.time as keyof typeof windowStats].total++;
        if (isDone) windowStats[h.time as keyof typeof windowStats].done++;
      }
    }

    cur.setDate(cur.getDate() - 1);
  }

  const weekdayRate = weekdayScheduled > 0 ? Math.round((weekdayDone / weekdayScheduled) * 100) : 0;
  const weekendRate = weekendScheduled > 0 ? Math.round((weekendDone / weekendScheduled) * 100) : 0;
  const weekdayDiff = weekdayRate - weekendRate;

  // Compute peak time window
  let peakWindow: "Morning" | "Afternoon" | "Evening" | "Anytime" = "Morning";
  let maxRate = -1;

  for (const win of ["morning", "afternoon", "evening"] as const) {
    const stats = windowStats[win];
    const rate = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
    if (rate > maxRate && stats.total >= 4) {
      maxRate = rate;
      peakWindow = win === "morning" ? "Morning" : win === "afternoon" ? "Afternoon" : "Evening";
    }
  }

  const peakWindowRate = maxRate > 0 ? Math.round(maxRate) : weekdayRate;

  // Find top performing habit
  let topHabit: { name: string; streak: number } | null = null;
  let maxStreak = -1;

  for (const h of habits) {
    const st = habitStreaks[h.id]?.currentStreak ?? 0;
    if (st > maxStreak) {
      maxStreak = st;
      topHabit = { name: h.name, streak: st };
    }
  }

  let insightSummary = "";
  if (weekdayDone + weekendDone === 0) {
    insightSummary = "Complete your daily habits to unlock personalized 28-day trends.";
  } else if (Math.abs(weekdayDiff) >= 10) {
    if (weekdayDiff > 0) {
      insightSummary = `You're ${weekdayDiff}% more consistent on weekdays than weekends.`;
    } else {
      insightSummary = `You're ${Math.abs(weekdayDiff)}% more consistent on weekends!`;
    }
  } else if (topHabit && topHabit.streak >= 3) {
    insightSummary = `"${topHabit.name}" is your strongest habit with a ${topHabit.streak}-day streak.`;
  } else {
    insightSummary = `Your highest completion rate is during ${peakWindow} (${peakWindowRate}%).`;
  }

  return {
    weekdayRate,
    weekendRate,
    weekdayDiff,
    peakWindow,
    peakWindowRate,
    topHabit,
    insightSummary,
  };
}

/**
 * useHeatmap — computes a 52-week × 7-day heatmap grid from Firestore
 * completion data. Supports category filtering.
 *
 * The grid values are intensity levels 0–3:
 *   0 = nothing done / not scheduled
 *   1 = 1–33% of scheduled habits completed
 *   2 = 34–66% completed
 *   3 = 67–100% completed
 */

import { useEffect, useMemo, useState } from "react";
import {
  formatDateKey,
  heatmapStartDate,
  isoDow,
  isScheduledDay,
  isSameDay,
} from "../lib/dates";
import { calculateStreak, calculateBestStreak, type CompletionEntry } from "../lib/streaks";
import type { HabitDoc } from "../lib/firestore";
import { usePageVisible } from "./usePageVisible";
import { readLocalData, subscribeLocalData } from "../lib/local-data";
import { isTrackedDay } from "../lib/consistency-summary";

export interface HeatmapStats {
  currentStreak: number; // consecutive days with >= 1 habit done
  bestStreak: number;
  totalCompletions: number;
  completionRate: number; // 0–100
  perfectDays: number;
  totalDaysTracked: number;
}

export interface UseHeatmapResult {
  /** 52 columns × 7 rows grid of intensity values (0–3). */
  grid: number[][];
  /** Column index of today in the grid. */
  todayCol: number;
  /** Row index of today (0=Mon … 6=Sun). */
  todayRow: number;
  /** Computed statistics. */
  stats: HeatmapStats;
  /** Per-habit streak stats keyed by habitId. */
  habitStreaks: Record<string, { currentStreak: number; bestStreak: number }>;
  /** Raw completions map by date key for historical detail views. */
  completionsMap: Record<string, Record<string, CompletionEntry>>;
  /** Loading flag for initial data fetch. */
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

export function useHeatmap(
  userId: string | null,
  habits: HabitDoc[],
  categoryFilter?: string,
): UseHeatmapResult {
  const pageVisible = usePageVisible();
  const [completionsMap, setCompletionsMap] = useState<
    Record<string, Record<string, CompletionEntry>>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // Reactive today state that updates automatically on midnight rollover or tab visibility change
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    if (!pageVisible) return;
    const checkDate = () => {
      const now = new Date();
      if (!isSameDay(now, today)) {
        setToday(now);
      }
    };
    const interval = setInterval(checkDate, 60000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkDate();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [today, pageVisible]);

  const { startDate, startKey, endKey } = useMemo(() => {
    const sd = heatmapStartDate(today);
    return {
      startDate: sd,
      startKey: formatDateKey(sd),
      endKey: formatDateKey(today),
    };
  }, [today]);

  // Subscribe to completions range
  useEffect(() => {
    if (!userId) {
      setCompletionsMap({});
      setLoading(false);
      setError(null);
      return;
    }
    if (!pageVisible) return;

    setLoading(true);
    setError(null);

    const refresh = () => {
      try {
      const all = readLocalData(userId).completions;
      const map = Object.fromEntries(Object.entries(all).filter(([key]) => key >= startKey && key <= endKey));
      setCompletionsMap(map);
      setError(null);
      } catch (error) {
        setError(error instanceof Error ? error : new Error("History could not be read"));
      }
      setLoading(false);
    };
    refresh();
    return subscribeLocalData(userId, refresh);
  }, [userId, startKey, endKey, pageVisible, retryNonce]);

  // Filter habits by category if specified
  const filteredHabits = useMemo(() => {
    if (!categoryFilter || categoryFilter === "All habits") return habits;
    return habits.filter((h) => h.category === categoryFilter);
  }, [habits, categoryFilter]);

  const filteredHabitIds = useMemo(
    () => new Set(filteredHabits.map((h) => h.id)),
    [filteredHabits],
  );

  // Compute the grid + stats
  return useMemo(() => {
    const grid: number[][] = [];
    let totalCompletions = 0;
    let scheduledDays = 0;
    let doneDays = 0;
    let perfectDays = 0;
    let totalScheduledHabits = 0;
    let totalDoneHabits = 0;

    // Streak tracking
    let currentStreak = 0;
    let bestStreak = 0;
    let streakBroken = false;

    // Walk through 364 days (52 weeks × 7)
    // Grid: column 0 = 52 weeks ago, column 51 = this week
    // Row within column: 0 = Mon, 6 = Sun
    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);

    let colDays: number[] = [];
    const dayEntries: {
      date: Date;
      intensity: number;
      done: number;
      scheduled: number;
    }[] = [];

    for (let dayIdx = 0; dayIdx < 364; dayIdx++) {
      const key = formatDateKey(cur);
      const dayEntries2 = completionsMap[key] ?? {};

      // Count scheduled + done for this day (only filtered habits)
      let scheduled = 0;
      let done = 0;

      for (const habit of filteredHabits) {
        if (!isTrackedDay(habit, cur, today)) continue;
        scheduled++;
        totalScheduledHabits++;

        const entry = dayEntries2[habit.id];
        if (entry && (entry.done || entry.restDay || entry.frozenStreak)) {
          done++;
          totalDoneHabits++;
          totalCompletions++;
        }
      }

      // Intensity level
      let intensity = 0;
      if (scheduled > 0) {
        scheduledDays++;
        const pct = done / scheduled;
        if (pct > 0) doneDays++;
        if (pct >= 1) perfectDays++;
        intensity = pct === 0 ? 0 : pct <= 0.33 ? 1 : pct <= 0.66 ? 2 : 3;
      }

      colDays.push(intensity);

      // Streak: walk backwards from today
      dayEntries.push({ date: new Date(cur), intensity, done, scheduled });

      // Every 7 days, flush to a column
      if (colDays.length === 7) {
        grid.push(colDays);
        colDays = [];
      }

      cur.setDate(cur.getDate() + 1);
    }

    // Flush remaining days
    if (colDays.length > 0) {
      while (colDays.length < 7) colDays.push(0);
      grid.push(colDays);
    }

    // Compute streak (walking backwards from today)
    for (let i = dayEntries.length - 1; i >= 0; i--) {
      const e = dayEntries[i];
      if (e.scheduled === 0) continue; // skip days with no scheduled habits

      if (e.done > 0) {
        if (!streakBroken) currentStreak++;
        // Tracking best streak forward-pass style
      } else {
        if (isSameDay(e.date, today)) continue; // today not over yet
        streakBroken = true;
      }
    }

    // Best streak (forward pass)
    let runningStreak = 0;
    for (const e of dayEntries) {
      if (e.scheduled === 0) continue;
      if (e.done > 0) {
        runningStreak++;
        bestStreak = Math.max(bestStreak, runningStreak);
      } else {
        runningStreak = 0;
      }
    }

    // Compute individual per-habit streaks (using all habits passed to hook)
    const habitStreaks: Record<string, { currentStreak: number; bestStreak: number }> = {};
    for (const habit of habits) {
      habitStreaks[habit.id] = {
        currentStreak: calculateStreak(habit.id, completionsMap, habit.frequency, habit.customDays, today),
        bestStreak: calculateBestStreak(habit.id, completionsMap, habit.frequency, habit.customDays)
      };
    }

    const completionRate =
      totalScheduledHabits > 0
        ? Math.round((totalDoneHabits / totalScheduledHabits) * 100)
        : scheduledDays > 0
          ? Math.round((doneDays / scheduledDays) * 100)
          : 0;

    // Today's position in the grid
    const todayDow = isoDow(today); // 0 = Mon
    const todayCol = grid.length - 1;
    const todayRow = todayDow;

    return {
      grid,
      todayCol,
      todayRow,
      stats: {
        currentStreak,
        bestStreak: Math.max(bestStreak, currentStreak),
        totalCompletions,
        completionRate,
        perfectDays,
        totalDaysTracked: scheduledDays,
      },
      habitStreaks,
      completionsMap,
      loading,
      error,
      retry: () => setRetryNonce((value) => value + 1),
    };
  }, [completionsMap, error, filteredHabits, habits, loading, startDate, today]);
}

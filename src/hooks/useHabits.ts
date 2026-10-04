/**
 * useHabits — real-time Firestore subscription for the user's habit list.
 *
 * Returns habits grouped by quadrant (matching the UI's expected shape),
 * plus CRUD operations that write directly to Firestore.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePageVisible } from "./usePageVisible";
import { readLocalData, subscribeLocalData } from "../lib/local-data";
import {
  addHabit as fbAddHabit,
  updateHabitDoc,
  deleteHabitDoc,
  deleteHabitDocs,
  restoreHabit,
  type HabitDoc,
  type Quadrant,
} from "../lib/firestore";

export interface UseHabitsResult {
  /** All habits, flat list ordered by `order`. */
  habits: HabitDoc[];
  /** Habits grouped by quadrant. */
  byQuadrant: Record<Quadrant, HabitDoc[]>;
  /** Whether the initial fetch is still loading. */
  loading: boolean;
  error: Error | null;
  retry: () => void;
  /** Add a new habit. Returns the Firestore document ID. */
  add: (habit: Omit<HabitDoc, "id" | "createdAt">) => Promise<string>;
  /** Update fields on an existing habit. */
  update: (
    habitId: string,
    patch: Partial<Omit<HabitDoc, "id" | "createdAt">>,
  ) => Promise<void>;
  /** Delete a single habit. Returns the deleted habit for undo. */
  remove: (habitId: string) => Promise<HabitDoc | undefined>;
  /** Delete multiple habits in an atomic batch. Returns deleted habits for undo. */
  removeMany: (habitIds: string[]) => Promise<HabitDoc[]>;
  /** Restore a previously deleted habit (for undo). */
  restore: (habit: HabitDoc) => Promise<void>;
}

export function useHabits(userId: string | null): UseHabitsResult {
  const pageVisible = usePageVisible();
  const [habits, setHabits] = useState<HabitDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setHabits([]);
      setLoading(false);
      setError(null);
      hasLoadedRef.current = false;
      return;
    }
    if (!pageVisible) return;

    // Visibility changes reattach the listener. Keep the last snapshot on
    // screen instead of replacing a populated list with a loading spinner.
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);

    const refresh = () => {
      try {
      const list = readLocalData(userId).habits.slice().sort((a, b) => a.order - b.order);
      setHabits(list);
      hasLoadedRef.current = true;
      setError(null);
      } catch (error) {
        setError(error instanceof Error ? error : new Error("Habits could not be read"));
      }
      setLoading(false);
    };
    refresh();
    return subscribeLocalData(userId, refresh);
  }, [userId, pageVisible, retryNonce]);

  const byQuadrant = useMemo(() => {
    const out: Record<Quadrant, HabitDoc[]> = {
      q1: [],
      q2: [],
      q3: [],
      q4: [],
    };
    for (const h of habits) {
      (out[h.quadrant] ??= []).push(h);
    }
    // Sort pinned to top within each quadrant
    for (const q of Object.keys(out) as Quadrant[]) {
      out[q].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return a.order - b.order;
      });
    }
    return out;
  }, [habits]);

  const add = async (
    habit: Omit<HabitDoc, "id" | "createdAt">,
  ): Promise<string> => {
    if (!userId) throw new Error("Not authenticated");
    try {
      return await fbAddHabit(userId, habit);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Habit could not be saved"));
      throw err;
    }
  };

  const update = async (
    habitId: string,
    patch: Partial<Omit<HabitDoc, "id" | "createdAt">>,
  ): Promise<void> => {
    if (!userId) return;
    try {
      await updateHabitDoc(userId, habitId, patch);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Habit could not be updated"));
      throw err;
    }
  };

  const remove = async (habitId: string): Promise<HabitDoc | undefined> => {
    if (!userId) return;
    const removed = habits.find((h) => h.id === habitId);
    // Optimistically remove from local state immediately
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    try {
      await deleteHabitDoc(userId, habitId);
    } catch (err) {
      console.error("[useHabits] Failed to delete habit from Firestore:", err);
      setError(err instanceof Error ? err : new Error("Habit could not be deleted"));
      // Revert if delete failed
      if (removed) {
        setHabits((prev) => [...prev, removed]);
      }
      throw err;
    }
    return removed;
  };

  const removeMany = async (habitIds: string[]): Promise<HabitDoc[]> => {
    if (!userId || habitIds.length === 0) return [];
    const removedList = habits.filter((h) => habitIds.includes(h.id));
    // Optimistically remove from local state immediately
    setHabits((prev) => prev.filter((h) => !habitIds.includes(h.id)));
    try {
      await deleteHabitDocs(userId, habitIds);
    } catch (err) {
      console.error("[useHabits] Failed to bulk delete habits from Firestore:", err);
      setError(err instanceof Error ? err : new Error("Habits could not be deleted"));
      // Revert if batch delete failed
      setHabits((prev) => [...prev, ...removedList]);
      throw err;
    }
    return removedList;
  };

  const restore = async (habit: HabitDoc): Promise<void> => {
    if (!userId) return;
    // Optimistically add back to local state
    setHabits((prev) => (prev.some((h) => h.id === habit.id) ? prev : [...prev, habit]));
    try {
      await restoreHabit(userId, habit);
    } catch (err) {
      console.error("[useHabits] Failed to restore habit:", err);
      setError(err instanceof Error ? err : new Error("Habit could not be restored"));
      setHabits((prev) => prev.filter((h) => h.id !== habit.id));
      throw err;
    }
  };

  return { habits, byQuadrant, loading, error, retry: () => setRetryNonce((value) => value + 1), add, update, remove, removeMany, restore };
}

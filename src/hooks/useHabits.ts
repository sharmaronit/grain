/**
 * useHabits — real-time Firestore subscription for the user's habit list.
 *
 * Returns habits grouped by quadrant (matching the UI's expected shape),
 * plus CRUD operations that write directly to Firestore.
 */

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  addHabit as fbAddHabit,
  updateHabitDoc,
  deleteHabitDoc,
  deleteHabitDocs,
  restoreHabit,
  type HabitDoc,
  type Quadrant,
} from "../lib/firestore";

function habitFromSnap(snap: QueryDocumentSnapshot<DocumentData>): HabitDoc {
  const d = snap.data();
  return {
    id: snap.id,
    name: d.name ?? "",
    category: d.category ?? "Mind",
    quadrant: (d.quadrant as Quadrant) ?? "q2",
    time: d.time ?? null,
    type: d.type ?? "binary",
    target: d.target ?? null,
    unit: d.unit ?? null,
    step: d.step ?? null,
    pinned: d.pinned ?? false,
    frequency: d.frequency ?? "daily",
    customDays: d.customDays ?? [],
    icon: d.icon ?? 0,
    shade: d.shade ?? 0,
    bestStreak: d.bestStreak ?? 0,
    order: d.order ?? 0,
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
  };
}

export interface UseHabitsResult {
  /** All habits, flat list ordered by `order`. */
  habits: HabitDoc[];
  /** Habits grouped by quadrant. */
  byQuadrant: Record<Quadrant, HabitDoc[]>;
  /** Whether the initial fetch is still loading. */
  loading: boolean;
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
  const [habits, setHabits] = useState<HabitDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setHabits([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db(), "users", userId, "habits"),
      orderBy("order", "asc"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(habitFromSnap);
        setHabits(list);
        setLoading(false);
      },
      (err) => {
        console.error("[useHabits] snapshot error:", err);
        setLoading(false);
      },
    );

    return unsub;
  }, [userId]);

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
    return fbAddHabit(userId, habit);
  };

  const update = async (
    habitId: string,
    patch: Partial<Omit<HabitDoc, "id" | "createdAt">>,
  ): Promise<void> => {
    if (!userId) return;
    await updateHabitDoc(userId, habitId, patch);
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
      setHabits((prev) => prev.filter((h) => h.id !== habit.id));
      throw err;
    }
  };

  return { habits, byQuadrant, loading, add, update, remove, removeMany, restore };
}

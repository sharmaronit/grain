/**
 * useCompletions — real-time Firestore subscription for a specific day's
 * habit completions. Provides toggle/adjust/rest/freeze/note operations.
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { setCompletionEntry } from "../lib/firestore";
import type { CompletionEntry } from "../lib/streaks";
import { formatDateKey } from "../lib/dates";

export interface UseCompletionsResult {
  /** Completion entries keyed by habit ID. */
  entries: Record<string, CompletionEntry>;
  /** Loading state for initial fetch. */
  loading: boolean;
  /** The date key this hook is tracking. */
  dateKey: string;
  /** Toggle a binary habit's done state. */
  toggleDone: (habitId: string) => Promise<void>;
  /** Adjust a numeric habit's value by a step. */
  adjustValue: (
    habitId: string,
    dir: 1 | -1,
    step: number,
    target: number,
  ) => Promise<void>;
  /** Set a numeric habit's value directly. */
  setValue: (habitId: string, val: number, target: number) => Promise<void>;
  /** Mark a habit as a rest day (preserves streak). */
  setRestDay: (habitId: string) => Promise<void>;
  /** Freeze a habit's streak for the day. */
  freezeStreak: (habitId: string) => Promise<void>;
  /** Save a daily note for a habit. */
  saveNote: (habitId: string, note: string) => Promise<void>;
}

const emptyEntry: CompletionEntry = {
  done: false,
  value: null,
  note: "",
  restDay: false,
  frozenStreak: false,
  completedAt: null,
};

export function useCompletions(
  userId: string | null,
  date?: Date,
): UseCompletionsResult {
  const dateKey = formatDateKey(date ?? new Date());
  const [entries, setEntries] = useState<Record<string, CompletionEntry>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setEntries({});
      setLoading(false);
      return;
    }

    const ref = doc(db(), "users", userId, "completions", dateKey);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setEntries(
            (data.entries as Record<string, CompletionEntry>) ?? {},
          );
        } else {
          setEntries({});
        }
        setLoading(false);
      },
      (err) => {
        console.error("[useCompletions] snapshot error:", err);
        setLoading(false);
      },
    );

    return unsub;
  }, [userId, dateKey]);

  const getEntry = (habitId: string): CompletionEntry =>
    entries[habitId] ?? { ...emptyEntry };

  const toggleDone = async (habitId: string) => {
    if (!userId) return;
    const current = getEntry(habitId);
    const nowDone = !current.done;
    await setCompletionEntry(userId, dateKey, habitId, {
      done: nowDone,
      completedAt: nowDone ? new Date() : null,
    });
  };

  const setValue = async (habitId: string, val: number, target: number) => {
    if (!userId) return;
    const newVal = Math.max(0, Math.min(target, val));
    const done = newVal >= target;
    await setCompletionEntry(userId, dateKey, habitId, {
      done,
      value: newVal,
      completedAt: done ? new Date() : null,
    });
  };

  const adjustValue = async (
    habitId: string,
    dir: 1 | -1,
    step: number,
    target: number,
  ) => {
    if (!userId) return;
    const current = getEntry(habitId);
    const currentVal = current.value ?? 0;
    const newVal = Math.max(0, Math.min(target, currentVal + dir * step));
    const done = newVal >= target;
    await setCompletionEntry(userId, dateKey, habitId, {
      value: newVal,
      done,
      completedAt: done ? new Date() : null,
    });
  };

  const setRestDay = async (habitId: string) => {
    if (!userId) return;
    await setCompletionEntry(userId, dateKey, habitId, {
      restDay: true,
      done: true, // counts as "done" in UI to grey it out
    });
  };

  const freezeStreak = async (habitId: string) => {
    if (!userId) return;
    await setCompletionEntry(userId, dateKey, habitId, {
      frozenStreak: true,
    });
  };

  const saveNote = async (habitId: string, note: string) => {
    if (!userId) return;
    await setCompletionEntry(userId, dateKey, habitId, { note });
  };

  return {
    entries,
    loading,
    dateKey,
    toggleDone,
    setValue,
    adjustValue,
    setRestDay,
    freezeStreak,
    saveNote,
  };
}

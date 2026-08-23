/**
 * Firestore CRUD helpers for the Grain habit tracker.
 *
 * All write operations (add, update, delete) update Firestore.
 * Thanks to offline persistence, writes succeed locally even without network
 * and sync automatically when the connection is restored.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  writeBatch,
  query,
  where,
  orderBy,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { CompletionEntry } from "./streaks";

// ── Types ────────────────────────────────────────────────

export type Quadrant = "q1" | "q2" | "q3" | "q4";

export interface HabitDoc {
  id: string;
  name: string;
  category: string;
  quadrant: Quadrant;
  time: "morning" | "afternoon" | "evening" | null;
  type: "binary" | "numeric";
  target: number | null;
  unit: string | null;
  step: number | null;
  pinned: boolean;
  frequency: "daily" | "weekdays" | "custom";
  customDays: number[];
  icon: number;
  shade: number;
  bestStreak: number;
  order: number;
  createdAt: Date;
}

export interface UserProfile {
  name: string;
  email: string;
  tagline: string;
  initials: string;
  theme: "dark" | "light";
  wallpaperTheme: string;
  gridColorTheme?: string;
  wallpaperHabitSet?: string;
  wallpaperGridStyle?: "weeks" | "year" | "month" | "goals";
  wallpaperScale?: number;
  wallpaperPhotoOverlay?: number;
  wallpaperCustomPhoto?: string | null;
  wallpaperOffset?: { x: number; y: number };
  wallpaperSync: boolean;
  remindersOn: boolean;
  reminderTime?: string;
  previewWeeks: number;
  activeGoalId?: string;
}

export interface CompletionDoc {
  date: string; // "YYYY-MM-DD"
  entries: Record<string, CompletionEntry>;
}

export interface GoalDoc {
  id: string;
  name: string;
  emoji: string;
  startDate: string; // "YYYY-MM-DD"
  targetDate: string; // "YYYY-MM-DD"
  color: string;
  createdAt: Date;
}

// ── User Profile ─────────────────────────────────────────

export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db(), "users", userId));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<UserProfile>,
): Promise<void> {
  await updateDoc(doc(db(), "users", userId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ── Habits ───────────────────────────────────────────────

function habitFromDoc(snap: QueryDocumentSnapshot<DocumentData>): HabitDoc {
  const d = snap.data();
  return {
    id: snap.id,
    name: d.name ?? "",
    category: d.category ?? "Mind",
    quadrant: d.quadrant ?? "q2",
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

/** Get all habits for a user, ordered by `order` field. */
export async function getHabits(userId: string): Promise<HabitDoc[]> {
  const q = query(
    collection(db(), "users", userId, "habits"),
    orderBy("order", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(habitFromDoc);
}

/** Add a new habit. Returns the auto-generated document ID. */
export async function addHabit(
  userId: string,
  habit: Omit<HabitDoc, "id" | "createdAt">,
): Promise<string> {
  const ref = doc(collection(db(), "users", userId, "habits"));
  setDoc(ref, {
    ...habit,
    createdAt: serverTimestamp(),
  }).catch(console.error);
  return ref.id;
}

/** Update specific fields on a habit document. */
export async function updateHabitDoc(
  userId: string,
  habitId: string,
  patch: Partial<Omit<HabitDoc, "id" | "createdAt">>,
): Promise<void> {
  const safePatch = { ...patch } as any;
  for (const key in safePatch) {
    if (safePatch[key] === undefined) {
      safePatch[key] = deleteField();
    }
  }
  await updateDoc(doc(db(), "users", userId, "habits", habitId), safePatch);
}

/** Delete a habit permanently. */
export async function deleteHabitDoc(
  userId: string,
  habitId: string,
): Promise<void> {
  await deleteDoc(doc(db(), "users", userId, "habits", habitId));
}

/** Delete multiple habits permanently in an atomic batch. */
export async function deleteHabitDocs(
  userId: string,
  habitIds: string[],
): Promise<void> {
  if (!userId || habitIds.length === 0) return;
  const batch = writeBatch(db());
  for (const habitId of habitIds) {
    batch.delete(doc(db(), "users", userId, "habits", habitId));
  }
  await batch.commit();
}

// ── Goals ────────────────────────────────────────────────

export function goalFromDoc(d: DocumentData, id: string): GoalDoc {
  return {
    id,
    name: d.name ?? "",
    emoji: d.emoji ?? "🎯",
    startDate: d.startDate ?? "",
    targetDate: d.targetDate ?? "",
    color: d.color ?? "#22c55e",
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function addGoal(
  userId: string,
  goal: Omit<GoalDoc, "id" | "createdAt">,
): Promise<string> {
  console.log("[addGoal] starting...", { userId, goal });
  const ref = doc(collection(db(), "users", userId, "goals"));
  try {
    const data = {
      ...goal,
      createdAt: new Date(),
    };
    console.log("[addGoal] triggering setDoc with:", data);
    // Fire and forget so we don't block the UI waiting for server acknowledgment
    setDoc(ref, data).then(() => {
      console.log("[addGoal] setDoc resolved asynchronously for:", ref.id);
    }).catch((e) => {
      console.error("[addGoal] Async setDoc failed:", e);
    });
    console.log("[addGoal] returning ref.id synchronously:", ref.id);
    return ref.id;
  } catch (e) {
    console.error("[addGoal] Sync setDoc failed:", e);
    throw e;
  }
}

export async function deleteGoal(
  userId: string,
  goalId: string,
): Promise<void> {
  await deleteDoc(doc(db(), "users", userId, "goals", goalId));
}

// ── Completions ──────────────────────────────────────────

/** Get the completions document for a specific date. */
export async function getCompletions(
  userId: string,
  dateKey: string,
): Promise<CompletionDoc | null> {
  const snap = await getDoc(
    doc(db(), "users", userId, "completions", dateKey),
  );
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    date: dateKey,
    entries: (data.entries as Record<string, CompletionEntry>) ?? {},
  };
}

/** Upsert (merge) a single habit's completion entry for a given date. */
export async function setCompletionEntry(
  userId: string,
  dateKey: string,
  habitId: string,
  entry: Partial<CompletionEntry>,
): Promise<void> {
  const cleanEntry = Object.fromEntries(
    Object.entries(entry).filter(([_, v]) => v !== undefined)
  );

  const ref = doc(db(), "users", userId, "completions", dateKey);
  await setDoc(
    ref,
    {
      date: dateKey,
      entries: { [habitId]: cleanEntry },
    },
    { merge: true },
  );
}

/**
 * Get completions for a date range (for heatmap computation).
 * Uses a Firestore range query — 1 read operation regardless of range size.
 */
export async function getCompletionsRange(
  userId: string,
  startKey: string,
  endKey: string,
): Promise<Record<string, Record<string, CompletionEntry>>> {
  const q = query(
    collection(db(), "users", userId, "completions"),
    where("date", ">=", startKey),
    where("date", "<=", endKey),
    orderBy("date", "asc"),
  );
  const snap = await getDocs(q);
  const map: Record<string, Record<string, CompletionEntry>> = {};
  for (const d of snap.docs) {
    const data = d.data();
    map[d.id] = (data.entries as Record<string, CompletionEntry>) ?? {};
  }
  return map;
}

/**
 * Re-create a previously deleted habit (for undo functionality).
 * Uses setDoc with the original ID to restore the exact document.
 */
export async function restoreHabit(
  userId: string,
  habit: HabitDoc,
): Promise<void> {
  const { id, createdAt, ...rest } = habit;
  await setDoc(doc(db(), "users", userId, "habits", id), {
    ...rest,
    createdAt: createdAt,
  });
}

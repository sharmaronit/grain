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
import { runTrackedWrite } from "./sync-status";
import {
  addLocalGoal,
  addLocalHabit,
  deleteLocalGoal,
  deleteLocalHabits,
  readLocalData,
  restoreLocalHabit,
  setLocalCompletion,
  updateLocalHabit,
  updateLocalProfile,
} from "./local-data";
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
  reminderTime?: string;
  createdAt: Date;
}

export interface UserProfile {
  name: string;
  email: string;
  tagline: string;
  initials: string;
  theme: "dark" | "amoled" | "light";
  wallpaperTheme: string;
  gridColorTheme?: string;
  wallpaperHabitSet?: string;
  wallpaperGridStyle?: "weeks" | "year" | "month" | "goals" | "widget";
  wallpaperScale?: number;
  wallpaperPhotoOverlay?: number;
  wallpaperCustomPhoto?: string | null;
  wallpaperOffset?: { x: number; y: number };
  wallpaperSync: boolean;
  remindersOn: boolean;
  reminderTime?: string;
  morningKickoff?: boolean;
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
  const profile = readLocalData(userId).profile;
  return Object.keys(profile).length > 0 ? profile as UserProfile : null;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<UserProfile>,
): Promise<void> {
  updateLocalProfile(userId, data);
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
  return readLocalData(userId).habits.slice().sort((a, b) => a.order - b.order);
}

/** Add a new habit. Returns the auto-generated document ID. */
export async function addHabit(
  userId: string,
  habit: Omit<HabitDoc, "id" | "createdAt">,
): Promise<string> {
  return addLocalHabit(userId, habit);
}

/** Update specific fields on a habit document. */
export async function updateHabitDoc(
  userId: string,
  habitId: string,
  patch: Partial<Omit<HabitDoc, "id" | "createdAt">>,
): Promise<void> {
  updateLocalHabit(userId, habitId, patch);
}

/** Delete a habit permanently. */
export async function deleteHabitDoc(
  userId: string,
  habitId: string,
): Promise<void> {
  deleteLocalHabits(userId, [habitId]);
}

/** Delete multiple habits permanently in an atomic batch. */
export async function deleteHabitDocs(
  userId: string,
  habitIds: string[],
): Promise<void> {
  if (!userId || habitIds.length === 0) return;
  deleteLocalHabits(userId, habitIds);
}

// ── Goals ────────────────────────────────────────────────

export function goalFromDoc(d: DocumentData, id: string): GoalDoc {
  return {
    id,
    name: d.name ?? "",
    emoji: d.emoji ?? "target",
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
  return addLocalGoal(userId, goal);
}

export async function deleteGoal(
  userId: string,
  goalId: string,
): Promise<void> {
  deleteLocalGoal(userId, goalId);
}

// ── Completions ──────────────────────────────────────────

/** Get the completions document for a specific date. */
export async function getCompletions(
  userId: string,
  dateKey: string,
): Promise<CompletionDoc | null> {
  const entries = readLocalData(userId).completions[dateKey];
  return entries ? { date: dateKey, entries } : null;
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

  setLocalCompletion(userId, dateKey, habitId, cleanEntry);
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
  return Object.fromEntries(
    Object.entries(readLocalData(userId).completions).filter(([key]) => key >= startKey && key <= endKey),
  );
}

/**
 * Re-create a previously deleted habit (for undo functionality).
 * Uses setDoc with the original ID to restore the exact document.
 */
export async function restoreHabit(
  userId: string,
  habit: HabitDoc,
): Promise<void> {
  restoreLocalHabit(userId, habit);
}

export interface FeedbackDoc {
  userId?: string;
  userEmail?: string;
  userName?: string;
  category: "feature" | "bug" | "praise" | "general";
  rating: number;
  message: string;
  createdAt: Date;
  deviceInfo?: string;
}

/**
 * Submit user feedback to Firestore
 */
export async function submitFeedback(
  feedback: Omit<FeedbackDoc, "createdAt">
): Promise<string> {
  const docRef = await addDoc(collection(db(), "feedback"), {
    ...feedback,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

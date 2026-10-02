import type { GoalDoc, HabitDoc, UserProfile } from "./firestore";
import type { CompletionEntry } from "./streaks";

export interface GrainLocalData {
  version: 1;
  habits: HabitDoc[];
  goals: GoalDoc[];
  completions: Record<string, Record<string, CompletionEntry>>;
  profile: Partial<UserProfile>;
  prefs: Record<string, unknown>;
  updatedAt: string;
}

const listeners = new Map<string, Set<() => void>>();
const emptyData = (): GrainLocalData => ({
  version: 1,
  habits: [],
  goals: [],
  completions: {},
  profile: {},
  prefs: {},
  updatedAt: new Date().toISOString(),
});

const keyFor = (userId: string) => `grain_local_data_${userId}`;

function hydrate(raw: GrainLocalData): GrainLocalData {
  return {
    ...emptyData(),
    ...raw,
    habits: (raw.habits ?? []).map((habit) => ({ ...habit, createdAt: new Date(habit.createdAt) })),
    goals: (raw.goals ?? []).map((goal) => ({ ...goal, createdAt: new Date(goal.createdAt) })),
    completions: raw.completions ?? {},
  };
}

export function readLocalData(userId: string): GrainLocalData {
  try {
    const value = localStorage.getItem(keyFor(userId));
    return value ? hydrate(JSON.parse(value) as GrainLocalData) : emptyData();
  } catch {
    return emptyData();
  }
}

function writeLocalData(userId: string, data: GrainLocalData): void {
  const next = { ...data, updatedAt: new Date().toISOString() };
  localStorage.setItem(keyFor(userId), JSON.stringify(next));
  listeners.get(userId)?.forEach((listener) => listener());
}

function updateLocalData(userId: string, updater: (data: GrainLocalData) => GrainLocalData): GrainLocalData {
  const next = updater(readLocalData(userId));
  writeLocalData(userId, next);
  return next;
}

export function subscribeLocalData(userId: string, listener: () => void): () => void {
  const userListeners = listeners.get(userId) ?? new Set<() => void>();
  userListeners.add(listener);
  listeners.set(userId, userListeners);
  const storageListener = (event: StorageEvent) => {
    if (event.key === keyFor(userId)) listener();
  };
  window.addEventListener("storage", storageListener);
  return () => {
    userListeners.delete(listener);
    window.removeEventListener("storage", storageListener);
  };
}

export function addLocalHabit(userId: string, habit: Omit<HabitDoc, "id" | "createdAt">): string {
  const id = crypto.randomUUID();
  updateLocalData(userId, (data) => ({ ...data, habits: [...data.habits, { ...habit, id, createdAt: new Date() }] }));
  return id;
}

export function updateLocalHabit(userId: string, habitId: string, patch: Partial<HabitDoc>): void {
  updateLocalData(userId, (data) => ({ ...data, habits: data.habits.map((habit) => habit.id === habitId ? { ...habit, ...patch } : habit) }));
}

export function deleteLocalHabits(userId: string, habitIds: string[]): void {
  const ids = new Set(habitIds);
  updateLocalData(userId, (data) => ({ ...data, habits: data.habits.filter((habit) => !ids.has(habit.id)) }));
}

export function restoreLocalHabit(userId: string, habit: HabitDoc): void {
  updateLocalData(userId, (data) => ({ ...data, habits: data.habits.some((item) => item.id === habit.id) ? data.habits : [...data.habits, habit] }));
}

export function addLocalGoal(userId: string, goal: Omit<GoalDoc, "id" | "createdAt">): string {
  const id = crypto.randomUUID();
  updateLocalData(userId, (data) => ({ ...data, goals: [...data.goals, { ...goal, id, createdAt: new Date() }] }));
  return id;
}

export function updateLocalGoal(userId: string, goalId: string, patch: Partial<GoalDoc>): void {
  updateLocalData(userId, (data) => ({ ...data, goals: data.goals.map((goal) => goal.id === goalId ? { ...goal, ...patch } : goal) }));
}

export function deleteLocalGoal(userId: string, goalId: string): void {
  updateLocalData(userId, (data) => ({ ...data, goals: data.goals.filter((goal) => goal.id !== goalId) }));
}

export function setLocalCompletion(userId: string, dateKey: string, habitId: string, entry: Partial<CompletionEntry>): void {
  updateLocalData(userId, (data) => ({
    ...data,
    completions: { ...data.completions, [dateKey]: { ...(data.completions[dateKey] ?? {}), [habitId]: entry as CompletionEntry } },
  }));
}

export function clearLocalCompletionDate(userId: string, dateKey: string): void {
  updateLocalData(userId, (data) => {
    const completions = { ...data.completions };
    delete completions[dateKey];
    return { ...data, completions };
  });
}

export function updateLocalProfile(userId: string, patch: Partial<UserProfile>): void {
  updateLocalData(userId, (data) => ({ ...data, profile: { ...data.profile, ...patch } }));
}

export function updateLocalPrefs(userId: string, patch: Record<string, unknown>): void {
  updateLocalData(userId, (data) => ({ ...data, prefs: { ...data.prefs, ...patch } }));
}

export function exportLocalBackup(userId: string): GrainLocalData {
  return readLocalData(userId);
}

export function importLocalBackup(userId: string, value: unknown): void {
  if (!value || typeof value !== "object") throw new Error("Invalid backup file");
  const candidate = value as Partial<GrainLocalData>;
  if (!Array.isArray(candidate.habits) || !Array.isArray(candidate.goals) || typeof candidate.completions !== "object") {
    throw new Error("This is not a valid Grain backup");
  }
  writeLocalData(userId, hydrate({ ...emptyData(), ...candidate } as GrainLocalData));
}

export async function migrateCloudDataToLocalOnce(userId: string): Promise<boolean> {
  const migrationKey = `grain_cloud_migrated_${userId}`;
  if (localStorage.getItem(migrationKey) === "true") return false;
  const existing = readLocalData(userId);
  if (existing.habits.length || existing.goals.length || Object.keys(existing.completions).length) {
    localStorage.setItem(migrationKey, "true");
    return false;
  }

  try {
    const [{ collection, doc, getDoc, getDocs }, { db }] = await Promise.all([
      import("firebase/firestore"),
      import("./firebase"),
    ]);
    const database = db();
    const [profileSnap, habitsSnap, goalsSnap, completionsSnap] = await Promise.all([
      getDoc(doc(database, "users", userId)),
      getDocs(collection(database, "users", userId, "habits")),
      getDocs(collection(database, "users", userId, "goals")),
      getDocs(collection(database, "users", userId, "completions")),
    ]);

    const habits = habitsSnap.docs.map((item) => ({
      ...item.data(), id: item.id, createdAt: item.data().createdAt?.toDate?.() ?? new Date(),
    })) as HabitDoc[];
    const goals = goalsSnap.docs.map((item) => ({
      ...item.data(), id: item.id, createdAt: item.data().createdAt?.toDate?.() ?? new Date(),
    })) as GoalDoc[];
    const completions = Object.fromEntries(completionsSnap.docs.map((item) => [item.id, item.data().entries ?? {}]));
    writeLocalData(userId, {
      ...existing,
      habits,
      goals,
      completions,
      profile: profileSnap.exists() ? profileSnap.data() as Partial<UserProfile> : existing.profile,
    });
    localStorage.setItem(migrationKey, "true");
    return habits.length > 0 || goals.length > 0 || Object.keys(completions).length > 0;
  } catch {
    return false;
  }
}

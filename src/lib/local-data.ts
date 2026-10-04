import type { GoalDoc, HabitDoc, UserProfile } from "./firestore";
import type { CompletionEntry } from "./streaks";
import { validateBackup } from "./backup-validation";
import { reduceExternalActions, type ExternalHabitAction } from "./external-actions";

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
const backupMetaKeyFor = (userId: string) => `grain_backup_meta_${userId}`;

interface BackupMeta {
  lastExportedAt?: string;
  reminderDismissedAt?: string;
}

export interface LocalBackupStatus {
  lastExportedAt: string | null;
  dataUpdatedAt: string;
  reminderDue: boolean;
}

function readBackupMeta(userId: string): BackupMeta {
  try {
    return JSON.parse(localStorage.getItem(backupMetaKeyFor(userId)) ?? "{}") as BackupMeta;
  } catch {
    return {};
  }
}

function writeBackupMeta(userId: string, meta: BackupMeta): void {
  localStorage.setItem(backupMetaKeyFor(userId), JSON.stringify(meta));
}

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
  let value: string | null = null;
  try {
    value = localStorage.getItem(keyFor(userId));
    return value ? hydrate(JSON.parse(value) as GrainLocalData) : emptyData();
  } catch (error) {
    // Preserve the original bytes before surfacing the problem. Returning an
    // empty store here would allow the next write to destroy recoverable data.
    if (value) {
      try {
        localStorage.setItem(`grain_local_recovery_${userId}_${Date.now()}`, value);
      } catch {}
    }
    throw new Error("Local data could not be read. Import your latest backup to recover it.", { cause: error });
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

/** Save all starter habits and the completion flag in one storage write. */
export function completeLocalOnboarding(userId: string, habits: Array<Omit<HabitDoc, "id" | "createdAt">>): void {
  if (habits.length === 0) throw new Error("Choose at least one starter habit.");
  const data = readLocalData(userId);
  if (data.prefs.onboardingCompleted === true) return;
  const firstOrder = Math.max(-1, ...data.habits.map(habit => Number.isFinite(habit.order) ? habit.order : -1)) + 1;
  const createdAt = new Date();
  const additions = habits.map((habit, index) => ({ ...habit, id: crypto.randomUUID(), createdAt, order: firstOrder + index }));
  writeLocalData(userId, {
    ...data,
    habits: [...data.habits, ...additions],
    prefs: { ...data.prefs, onboardingCompleted: true },
  });
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

export function applyExternalHabitActions(userId: string, actions: ExternalHabitAction[]): void {
  if (actions.length) updateLocalData(userId, data => reduceExternalActions(data, userId, actions));
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

export function markLocalBackupExported(userId: string): string {
  const exportedAt = new Date().toISOString();
  writeBackupMeta(userId, { lastExportedAt: exportedAt });
  return exportedAt;
}

export function dismissLocalBackupReminder(userId: string): void {
  writeBackupMeta(userId, { ...readBackupMeta(userId), reminderDismissedAt: new Date().toISOString() });
}

export function getLocalBackupStatus(userId: string): LocalBackupStatus {
  const data = readLocalData(userId);
  const meta = readBackupMeta(userId);
  const lastExportedAt = meta.lastExportedAt ?? null;
  const hasData = data.habits.length > 0 || data.goals.length > 0 || Object.keys(data.completions).length > 0;
  const exportedTime = lastExportedAt ? new Date(lastExportedAt).getTime() : 0;
  const dismissedTime = meta.reminderDismissedAt ? new Date(meta.reminderDismissedAt).getTime() : 0;
  const dataChangedSinceBackup = new Date(data.updatedAt).getTime() > exportedTime;
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  const backupIsOld = !exportedTime || Date.now() - exportedTime >= fourteenDays;
  const snoozeExpired = !dismissedTime || Date.now() - dismissedTime >= threeDays;

  return {
    lastExportedAt,
    dataUpdatedAt: data.updatedAt,
    reminderDue: hasData && dataChangedSinceBackup && backupIsOld && snoozeExpired,
  };
}

export function importLocalBackup(userId: string, value: unknown): void {
  validateBackup(value);
  if (!value || typeof value !== "object") throw new Error("Invalid backup file");
  const candidate = value as Partial<GrainLocalData>;
  if (!Array.isArray(candidate.habits) || !Array.isArray(candidate.goals) || typeof candidate.completions !== "object") {
    throw new Error("This is not a valid Grain backup");
  }
  try {
    const current = localStorage.getItem(keyFor(userId));
    if (current) localStorage.setItem(`grain_local_recovery_${userId}_${Date.now()}`, current);
  } catch {}
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

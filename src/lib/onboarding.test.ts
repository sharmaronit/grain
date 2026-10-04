import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completeLocalOnboarding, readLocalData, updateLocalPrefs } from "./local-data";
import { HABIT_PACKS } from "./templates";
import type { HabitDoc } from "./firestore";

const starters = HABIT_PACKS.slice(0, 2)
  .flatMap((pack) => pack.habits.slice(0, 2))
  .map((habit, order): Omit<HabitDoc, "id" | "createdAt"> => ({
    ...habit,
    target: habit.target ?? null,
    unit: habit.unit ?? null,
    step: habit.type === "numeric" ? 1 : null,
    pinned: true,
    customDays: [],
    icon: 0,
    shade: 0,
    bestStreak: 0,
    order,
  }));

describe("saving multiple starter habits", () => {
  let values: Map<string, string>;
  let setItem: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    values = new Map();
    setItem = vi.fn((key: string, value: string) => values.set(key, value));
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("saves every selected habit across packs, with unique IDs and ordered positions, in one write", () => {
    updateLocalPrefs("user1", { dateStyle: "underline" });
    setItem.mockClear();
    completeLocalOnboarding("user1", starters);
    const data = readLocalData("user1");
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(data.habits.map((habit) => habit.name)).toEqual(starters.map((habit) => habit.name));
    expect(new Set(data.habits.map((habit) => habit.id)).size).toBe(starters.length);
    expect(data.habits.map((habit) => habit.order)).toEqual([0, 1, 2, 3]);
    expect(data.prefs).toMatchObject({ dateStyle: "underline", onboardingCompleted: true });
  });

  it("leaves no partial habits or completion marker when storage fails, so retry saves exactly one batch", () => {
    setItem.mockImplementationOnce(() => {
      throw new Error("Storage full");
    });
    expect(() => completeLocalOnboarding("user1", starters)).toThrow("Storage full");
    expect(readLocalData("user1").habits).toEqual([]);
    expect(readLocalData("user1").prefs.onboardingCompleted).toBeUndefined();
    completeLocalOnboarding("user1", starters);
    expect(readLocalData("user1").habits).toHaveLength(starters.length);
  });

  it("does not duplicate starter habits when retried after a successful save or accept an empty selection", () => {
    expect(() => completeLocalOnboarding("user1", [])).toThrow("Choose at least one");
    completeLocalOnboarding("user1", starters);
    completeLocalOnboarding("user1", starters);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(readLocalData("user1").habits).toHaveLength(starters.length);
  });
});

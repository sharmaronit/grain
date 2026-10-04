import { describe, expect, it } from "vitest";
import { reduceExternalActions, type ExternalHabitAction } from "./external-actions";
import type { GrainLocalData } from "./local-data";
import type { HabitDoc } from "./firestore";

const habit = (patch: Partial<HabitDoc> = {}): HabitDoc => ({
  id: "h1",
  name: "Study",
  category: "Mind",
  quadrant: "q2",
  time: null,
  type: "binary",
  target: null,
  unit: null,
  step: null,
  pinned: false,
  frequency: "daily",
  customDays: [],
  icon: 0,
  shade: 0,
  bestStreak: 0,
  order: 0,
  createdAt: new Date("2026-01-01"),
  ...patch,
});
const store = (h = habit()): GrainLocalData => ({
  version: 1,
  habits: [h],
  goals: [],
  completions: {},
  profile: {},
  prefs: {},
  updatedAt: "",
});
const action = (patch: Partial<ExternalHabitAction> = {}): ExternalHabitAction => ({
  id: "a1",
  userId: "user1",
  habitId: "h1",
  dateKey: "2026-10-04",
  operation: "complete",
  at: "2026-10-04T12:00:00.000Z",
  ...patch,
});

describe("external habit actions", () => {
  it("increments once after a crash between saving and acknowledging the native queue", () => {
    const a = action({ operation: "increment" });
    const first = reduceExternalActions(store(habit({ type: "numeric", target: 3 })), "user1", [a]);
    const restarted = JSON.parse(JSON.stringify(first)) as GrainLocalData;
    const replayed = reduceExternalActions(restarted, "user1", [a]);
    expect(replayed.completions[a.dateKey].h1.value).toBe(1);
    expect(replayed.completions[a.dateKey].h1.done).toBe(false);
  });
  it("adds exactly one despite a larger configured step, caps at target and completes only at target", () => {
    const actions = [1, 2, 3, 4].map((n) => action({ id: `a${n}`, operation: "increment" }));
    const initial = store(habit({ type: "numeric", target: 3, step: 5 }));
    const partial = reduceExternalActions(initial, "user1", actions.slice(0, 2));
    expect(partial.completions[actions[0].dateKey].h1).toMatchObject({ value: 2, done: false });
    expect(
      reduceExternalActions(partial, "user1", actions.slice(2)).completions[actions[0].dateKey].h1,
    ).toMatchObject({ value: 3, done: true });
  });
  it("preserves unrelated habits, dates, notes, preferences and goals", () => {
    const data = store();
    data.completions["2026-10-03"] = {
      other: {
        done: true,
        value: null,
        note: "Yesterday",
        restDay: false,
        frozenStreak: false,
        completedAt: null,
      },
    };
    data.completions["2026-10-04"] = {
      h1: {
        done: false,
        value: null,
        note: "Read chapter 2",
        restDay: false,
        frozenStreak: false,
        completedAt: null,
      },
    };
    data.prefs.dateStyle = "underline";
    const result = reduceExternalActions(data, "user1", [action()]);
    expect(result.completions["2026-10-04"].h1.note).toBe("Read chapter 2");
    expect(result.completions["2026-10-03"]).toEqual(data.completions["2026-10-03"]);
    expect(result.prefs.dateStyle).toBe("underline");
    expect(result.goals).toBe(data.goals);
  });
  it("undoes after reopening but does not overwrite a subsequent edit inside the app", () => {
    const completed = JSON.parse(
      JSON.stringify(reduceExternalActions(store(), "user1", [action()])),
    ) as GrainLocalData;
    const undo = action({ id: "undo1", operation: "undo", referenceId: "a1" });
    expect(
      reduceExternalActions(completed, "user1", [undo]).completions[undo.dateKey].h1,
    ).toBeUndefined();
    completed.completions[undo.dateKey].h1.note = "Edited afterwards";
    expect(
      reduceExternalActions(completed, "user1", [undo]).completions[undo.dateKey].h1,
    ).toMatchObject({ done: true, note: "Edited afterwards" });
  });
  it("never applies another user's action, removed habit, invalid date or unscheduled weekday", () => {
    const data = store(habit({ frequency: "weekdays" }));
    const result = reduceExternalActions(data, "user1", [
      action(),
      action({ id: "a2", dateKey: "2026-10-05", userId: "user2" }),
      action({ id: "a3", dateKey: "2026-10-05", habitId: "deleted" }),
      action({ id: "a4", dateKey: "2026-99-99" }),
    ]);
    expect(result.completions).toEqual({});
  });
  it("uses the recorded date when a queued action is received after midnight", () => {
    const result = reduceExternalActions(store(), "user1", [action()]);
    expect(result.completions["2026-10-04"].h1.done).toBe(true);
    expect(result.completions["2026-10-05"]).toBeUndefined();
  });
  it("keeps rest days and skipped habits intact", () => {
    const data = store();
    data.completions["2026-10-04"] = {
      h1: {
        done: false,
        value: null,
        note: "Rest",
        restDay: true,
        frozenStreak: false,
        completedAt: null,
      },
    };
    expect(reduceExternalActions(data, "user1", [action()]).completions["2026-10-04"].h1).toEqual(
      data.completions["2026-10-04"].h1,
    );
  });
});

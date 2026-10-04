import { describe, expect, it } from "vitest";
import { isTrackedDay, summarizeConsistency } from "./consistency-summary";
import type { HabitDoc } from "./firestore";
import type { CompletionsMap } from "./streaks";
const today = new Date(2026, 9, 5); // Monday: later cells in this week are future dates.
const habit = { id: "h", category: "Mind", frequency: "daily", createdAt: new Date(2026, 9, 3) } as HabitDoc;
const entry = { done: true, value: null, note: "", restDay: false, frozenStreak: false, completedAt: today };
const entries: CompletionsMap = { "2026-10-03": { h: entry }, "2026-10-04": { h: entry }, "2026-10-05": { h: entry } };
describe("consistency summaries", () => {
  it("excludes future dates and dates before creation", () => { expect(isTrackedDay(habit, new Date(2026, 9, 6), today)).toBe(false); expect(isTrackedDay(habit, new Date(2026, 9, 2), today)).toBe(false); });
  it("keeps Monday's streak while later weekdays are empty", () => expect(summarizeConsistency([habit], entries, "All habits", today, today)).toMatchObject({ streak: 3, best: 3, done: 1, total: 1, rate: 100 }));
  it("filters the counts and streak together", () => expect(summarizeConsistency([habit], entries, "Health", today, today)).toMatchObject({ streak: 0, done: 0, total: 0, rate: 0 }));
  it("shows the historical best after a missed day", () => {
    const later = new Date(2026, 9, 7);
    expect(summarizeConsistency([habit], { ...entries, "2026-10-07": { h: entry } }, "All habits", later, later)).toMatchObject({ streak: 1, best: 3 });
  });
});

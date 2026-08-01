import { describe, it, expect } from "vitest";
import { calculateStreak, calculateBestStreak, type CompletionsMap } from "./streaks";
import { formatDateKey } from "./dates";

describe("streaks logic", () => {
  it("calculates current streak correctly for daily habit", () => {
    const today = new Date(2026, 6, 27); // 2026-07-27 Local
    const yest = new Date(2026, 6, 26);
    const twoDaysAgo = new Date(2026, 6, 25);
    
    const completions: CompletionsMap = {
      [formatDateKey(today)]: { "h1": { done: true, value: null, note: "", restDay: false, frozenStreak: false, completedAt: null } },
      [formatDateKey(yest)]: { "h1": { done: true, value: null, note: "", restDay: false, frozenStreak: false, completedAt: null } },
      [formatDateKey(twoDaysAgo)]: { "h1": { done: false, value: null, note: "", restDay: false, frozenStreak: false, completedAt: null } }
    };
    
    const streak = calculateStreak("h1", completions, "daily", [0,1,2,3,4,5,6], today);
    expect(streak).toBe(2);
  });
  
  it("skips unscheduled days for custom schedule", () => {
    // A habit scheduled on Monday only (0). 2026-07-27 is a Monday.
    const today = new Date(2026, 6, 27); // Mon
    const lastMon = new Date(2026, 6, 20); // Mon
    
    const completions: CompletionsMap = {
      [formatDateKey(today)]: { "h1": { done: true, value: null, note: "", restDay: false, frozenStreak: false, completedAt: null } },
      [formatDateKey(lastMon)]: { "h1": { done: true, value: null, note: "", restDay: false, frozenStreak: false, completedAt: null } }
    };
    
    // Only scheduled on Monday
    const streak = calculateStreak("h1", completions, "custom", [0], today);
    expect(streak).toBe(2); // Should skip the 6 days in between
  });

  it("calculates best streak across gaps", () => {
    const d1 = new Date(2026, 6, 1);
    const d2 = new Date(2026, 6, 2);
    const d3 = new Date(2026, 6, 3);
    const d5 = new Date(2026, 6, 5);
    
    const completions: CompletionsMap = {
      [formatDateKey(d1)]: { "h1": { done: true, value: null, note: "", restDay: false, frozenStreak: false, completedAt: null } },
      [formatDateKey(d2)]: { "h1": { done: true, value: null, note: "", restDay: false, frozenStreak: false, completedAt: null } },
      [formatDateKey(d3)]: { "h1": { done: true, value: null, note: "", restDay: false, frozenStreak: false, completedAt: null } },
      [formatDateKey(d5)]: { "h1": { done: true, value: null, note: "", restDay: false, frozenStreak: false, completedAt: null } } // gap on d4
    };
    
    const best = calculateBestStreak("h1", completions, "daily", [0,1,2,3,4,5,6]);
    expect(best).toBe(3); // 3 days in a row max
  });
});

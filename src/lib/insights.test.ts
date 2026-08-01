import { describe, it, expect } from "vitest";
import { computeWeeklyInsights } from "./insights";
import type { HabitDoc } from "./firestore";
import { formatDateKey } from "./dates";

describe("insights logic", () => {
  it("returns default insights when no habits exist", () => {
    const result = computeWeeklyInsights([], {}, {});
    expect(result.insightSummary).toBe("Add your first habit to unlock personalized consistency insights.");
    expect(result.weekdayRate).toBe(0);
    expect(result.weekendRate).toBe(0);
  });
  
  it("computes weekday and weekend rates correctly", () => {
    const h1: HabitDoc = {
      id: "h1", name: "H1", category: "Mind", quadrant: "q1", time: "morning",
      type: "binary", target: null, unit: null, step: null, pinned: false,
      frequency: "daily", customDays: [0, 1, 2, 3, 4, 5, 6], icon: 0, shade: 0,
      bestStreak: 0, order: 0, createdAt: new Date()
    };
    
    // Construct fake completions for past 28 days
    const completionsMap: Record<string, any> = {};
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 0; i < 28; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dow = (d.getDay() + 6) % 7; // 0=Mon, 6=Sun
      const isWeekend = dow >= 5;
      
      const key = formatDateKey(d);
      
      // Let's say we always do it on weekdays, but only 50% on weekends.
      // So weekday done = 20 (100%), weekend done = 4 (50%) out of 8.
      if (!isWeekend) {
        completionsMap[key] = { "h1": { done: true } };
      } else {
        // done on Sat (dow=5), but not Sun (dow=6)
        completionsMap[key] = { "h1": { done: dow === 5 } };
      }
    }
    
    const result = computeWeeklyInsights([h1], completionsMap, { "h1": { currentStreak: 5, bestStreak: 10 }});
    
    expect(result.weekdayRate).toBe(100);
    expect(result.weekendRate).toBe(50);
    expect(result.weekdayDiff).toBe(50);
    expect(result.peakWindow).toBe("Morning"); // h1 is morning
  });
});

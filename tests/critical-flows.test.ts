import { describe, expect, it } from "vitest";
import { formatDateKey, getWeekDates, heatmapStartDate, isScheduledDay } from "../src/lib/dates";
import { calculateBestStreak, calculateStreak, type CompletionsMap } from "../src/lib/streaks";
import { resolveThemeKey, wallpaperTokens } from "../src/lib/theme";

const done = { done: true, value: null, note: "", restDay: false, frozenStreak: false, completedAt: null };

describe("critical product flows", () => {
  it("keeps My Day anchored to the selected calendar week", () => {
    const week = getWeekDates(new Date(2026, 9, 3));
    expect(week).toHaveLength(7);
    expect(formatDateKey(week[0])).toBe("2026-09-28");
    expect(formatDateKey(week[6])).toBe("2026-10-04");
  });

  it("respects custom habit schedules when creating a routine", () => {
    expect(isScheduledDay("custom", [0, 2, 4], new Date(2026, 9, 2))).toBe(true);
    expect(isScheduledDay("custom", [0, 2, 4], new Date(2026, 9, 3))).toBe(false);
  });

  it("updates current and best consistency after completion", () => {
    const dates = [new Date(2026, 8, 30), new Date(2026, 9, 1), new Date(2026, 9, 2)];
    const map = Object.fromEntries(dates.map((date) => [formatDateKey(date), { habit: done }])) as CompletionsMap;
    expect(calculateStreak("habit", map, "daily", [], new Date(2026, 9, 2))).toBe(3);
    expect(calculateBestStreak("habit", map, "daily", [])).toBe(3);
  });

  it("starts the rolling heatmap on a complete Monday-aligned year", () => {
    const start = heatmapStartDate(new Date(2026, 9, 3));
    expect(start.getDay()).toBe(1);
    expect(formatDateKey(start)).toBe("2025-10-06");
  });

  it("resolves automatic wallpaper colors from the active app theme", () => {
    expect(resolveThemeKey("auto", "light")).toBe("mono");
    expect(resolveThemeKey("auto", "amoled")).toBe("amoled");
    expect(wallpaperTokens("auto", "emerald", "dark").accent).toBeTruthy();
  });
});

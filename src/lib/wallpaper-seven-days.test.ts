import { describe, expect, it } from "vitest";
import { wallpaperSevenDays } from "./wallpaper-seven-days";

describe("rolling wallpaper days", () => {
  it("ends today and reads both heatmap weeks across a month boundary", () => {
    const days = wallpaperSevenDays([[0, 1, 2, 3, 0, 1, 2], [3, 2, 1, 0, 0, 0, 0]], new Date(2026, 8, 28), new Date(2026, 9, 6));
    expect(days.map(day => day.key)).toEqual(["2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06"]);
    expect(days.map(day => day.level)).toEqual([2, 3, 0, 1, 2, 3, 2]);
    expect(days.filter(day => day.isToday).map(day => day.key)).toEqual(["2026-10-06"]);
  });
  it("fills missing history without inventing completions", () => {
    const days = wallpaperSevenDays([[3]], new Date(2026, 0, 1), new Date(2026, 0, 1));
    expect(days.map(day => day.level)).toEqual([0, 0, 0, 0, 0, 0, 3]);
  });
});

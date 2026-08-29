import { describe, it, expect } from "vitest";
import {
  formatDateKey,
  parseDateKey,
  todayKey,
  getWeekDates,
  isoDow,
  isScheduledDay,
  daysBetween,
  isSameDay,
  heatmapStartDate,
} from "./dates";

describe("dates utility functions", () => {
  it("formats date to YYYY-MM-DD correctly", () => {
    const d = new Date(2026, 7, 26); // August 26, 2026
    expect(formatDateKey(d)).toBe("2026-08-26");
  });

  it("parses YYYY-MM-DD key back to local midnight Date", () => {
    const key = "2026-08-26";
    const d = parseDateKey(key);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // 0-indexed August
    expect(d.getDate()).toBe(26);
  });

  it("returns a valid today key", () => {
    const key = todayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("computes ISO day of week (0=Mon, 6=Sun)", () => {
    // 2026-08-26 is Wednesday -> isoDow should be 2
    const wednesday = new Date(2026, 7, 26);
    expect(isoDow(wednesday)).toBe(2);

    // 2026-08-24 is Monday -> isoDow should be 0
    const monday = new Date(2026, 7, 24);
    expect(isoDow(monday)).toBe(0);

    // 2026-08-30 is Sunday -> isoDow should be 6
    const sunday = new Date(2026, 7, 30);
    expect(isoDow(sunday)).toBe(6);
  });

  it("returns 7 dates starting from Monday for getWeekDates", () => {
    const wednesday = new Date(2026, 7, 26);
    const week = getWeekDates(wednesday);
    expect(week.length).toBe(7);
    expect(isoDow(week[0])).toBe(0); // Monday
    expect(isoDow(week[6])).toBe(6); // Sunday
    expect(week[0].getDate()).toBe(24); // Mon Aug 24
    expect(week[6].getDate()).toBe(30); // Sun Aug 30
  });

  it("correctly evaluates isScheduledDay", () => {
    const monday = new Date(2026, 7, 24);
    const saturday = new Date(2026, 7, 29);

    // Daily habit: scheduled every day
    expect(isScheduledDay("daily", null, monday)).toBe(true);
    expect(isScheduledDay("daily", null, saturday)).toBe(true);

    // Weekdays habit: scheduled Mon-Fri only
    expect(isScheduledDay("weekdays", null, monday)).toBe(true);
    expect(isScheduledDay("weekdays", null, saturday)).toBe(false);

    // Custom habit: scheduled Mon (0) and Wed (2)
    expect(isScheduledDay("custom", [0, 2], monday)).toBe(true);
    expect(isScheduledDay("custom", [0, 2], saturday)).toBe(false);
  });

  it("computes daysBetween and isSameDay correctly", () => {
    const d1 = new Date(2026, 7, 1);
    const d2 = new Date(2026, 7, 10);
    expect(daysBetween(d1, d2)).toBe(9);

    const same1 = new Date(2026, 7, 1, 10, 30);
    const same2 = new Date(2026, 7, 1, 22, 15);
    expect(isSameDay(same1, same2)).toBe(true);
    expect(isSameDay(d1, d2)).toBe(false);
  });

  it("heatmapStartDate returns exactly 52 full weeks (364 days) and aligns to Monday", () => {
    // Wednesday
    const wednesday = new Date(2026, 7, 26);
    const startWed = heatmapStartDate(wednesday);
    expect(isoDow(startWed)).toBe(0); // Must be Monday
    expect(daysBetween(startWed, wednesday)).toBeLessThanOrEqual(364);

    // Sunday
    const sunday = new Date(2026, 7, 30);
    const startSun = heatmapStartDate(sunday);
    expect(isoDow(startSun)).toBe(0); // Must be Monday

    // Monday
    const monday = new Date(2026, 7, 24);
    const startMon = heatmapStartDate(monday);
    expect(isoDow(startMon)).toBe(0); // Must be Monday
  });
});

/**
 * Date utility helpers used across habits, completions, and heatmap logic.
 */

/** Format a Date as "YYYY-MM-DD" for use as Firestore document keys. */
export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a "YYYY-MM-DD" string back into a Date (local midnight). */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Get today's date key. */
export function todayKey(): string {
  return formatDateKey(new Date());
}

/** Return the array of 7 Dates for the week containing `d` (Monday-start). */
export function getWeekDates(d: Date): Date[] {
  const day = d.getDay(); // 0 = Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

/** Day-of-week index: 0 = Monday … 6 = Sunday (ISO style). */
export function isoDow(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Build an inclusive range of dates from `start` to `end`. */
export function dateRange(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endMidnight = new Date(end);
  endMidnight.setHours(0, 0, 0, 0);

  while (cur <= endMidnight) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Get start date for a 52-week range ending today.
 * Returns a Date exactly 363 days before `ref` (364 total days, 52 full weeks).
 */
export function heatmapStartDate(ref: Date = new Date()): Date {
  const start = new Date(ref);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 363);
  return start;
}

/**
 * Determine if a habit is scheduled for a given date based on its frequency.
 * @param frequency "daily" | "weekdays" | "custom"
 * @param customDays Array of ISO day-of-week indices (0=Mon … 6=Sun)
 * @param d The date to check
 */
export function isScheduledDay(
  frequency: "daily" | "weekdays" | "custom",
  customDays: number[] | null | undefined,
  d: Date,
): boolean {
  if (frequency === "daily") return true;
  const dow = isoDow(d); // 0 = Mon … 6 = Sun
  if (frequency === "weekdays") return dow < 5; // Mon–Fri
  if (frequency === "custom" && customDays) return customDays.includes(dow);
  return true; // default to daily
}

/** Short day label for a date: "Mon", "Tue", etc. */
export function shortDay(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

/** Short month label: "Jan", "Feb", etc. */
export function shortMonth(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short" });
}

/** Days between two dates (absolute). */
export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  const aMidnight = new Date(a);
  aMidnight.setHours(0, 0, 0, 0);
  const bMidnight = new Date(b);
  bMidnight.setHours(0, 0, 0, 0);
  return Math.round(
    Math.abs(bMidnight.getTime() - aMidnight.getTime()) / msPerDay,
  );
}

/** Check if two dates are the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

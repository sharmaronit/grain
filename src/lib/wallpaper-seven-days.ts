import { formatDateKey } from "./dates";

/** Calendar-day arithmetic keeps the rolling range correct across DST changes. */
export function wallpaperSevenDays(heatmap: number[][], start: Date, today = new Date()) {
  const epochDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 6 + index);
    const offset = epochDay(date) - epochDay(start);
    const level = offset < 0 ? 0 : heatmap[Math.floor(offset / 7)]?.[offset % 7] ?? 0;
    return { date, key: formatDateKey(date), level, isToday: index === 6 };
  });
}

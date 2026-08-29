import type { Quadrant, HabitDoc } from "../lib/firestore";

export type { Quadrant };

export interface Habit extends HabitDoc {
  streak: number;
  done?: boolean;
  skipped?: boolean;
  value?: number;
  best?: number;
  note?: string;
  isNumeric?: boolean;
}

export type AppTab = "today" | "consistency" | "myday" | "wallpaper" | "goal";
export type Theme = "dark" | "amoled" | "light";
export type WallpaperState = "idle" | "applying" | "applied";

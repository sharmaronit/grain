import type { Quadrant, HabitDoc } from "../lib/firestore";

export type { Quadrant };

export interface Habit extends HabitDoc {
  streak: number;
  done?: boolean;
  value?: number;
  best?: number;
}

export type AppTab = "today" | "consistency" | "matrix" | "wallpaper";
export type Theme = "dark" | "light";
export type WallpaperState = "idle" | "applying" | "applied";

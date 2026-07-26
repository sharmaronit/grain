import type { Quadrant } from "../lib/firestore";

export type { Quadrant };

export interface Habit {
  id: string;
  name: string;
  category: string;
  quadrant: Quadrant;
  streak: number;
  pinned: boolean;
  done?: boolean;
  best?: number;
  time?: "morning" | "afternoon" | "evening" | null;
  target?: number | null;
  value?: number;
  unit?: string | null;
  step?: number | null;
  frequency?: "daily" | "weekdays" | "custom";
  customDays?: number[];
  icon?: number;
  shade?: number;
}

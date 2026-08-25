import { Sunrise, Sun, Moon } from "lucide-react";

export const TIME_TABS = [
  { key: "all", label: "All", icon: null },
  { key: "morning", label: "Morning", icon: Sunrise },
  { key: "afternoon", label: "Afternoon", icon: Sun },
  { key: "evening", label: "Evening", icon: Moon },
] as const;

export const HABIT_SETS = [
  { key: "none", label: "None", habits: [] },
  { key: "health", label: "Health", habits: ["Workout", "Drink Water", "Sleep 8h", "Eat Veggies"] },
  { key: "focus", label: "Focus", habits: ["Deep Work", "Read 10 Pages", "Code", "Plan Day"] },
  { key: "zen", label: "Zen", habits: ["Meditate", "Journal", "Stretching", "Digital Detox"] },
  { key: "morning", label: "Morning", habits: ["Wake at 6AM", "Sunlight", "Cold Shower", "No Phone"] },
] as const;

export const GRID_SIZES = [8, 12, 16, 24, 32, 52];

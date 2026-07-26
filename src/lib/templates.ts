import type { HabitDoc } from "./firestore";

export interface HabitTemplate {
  name: string;
  category: string;
  quadrant: HabitDoc["quadrant"];
  time: HabitDoc["time"];
  type: HabitDoc["type"];
  target?: number;
  unit?: string;
  frequency: HabitDoc["frequency"];
}

export interface HabitPack {
  id: string;
  name: string;
  icon: string;
  description: string;
  habits: HabitTemplate[];
}

export const HABIT_PACKS: HabitPack[] = [
  {
    id: "mindfulness",
    name: "Mindful Morning",
    icon: "🧘",
    description: "Start every day grounded, focused, and calm.",
    habits: [
      {
        name: "5 min Meditation",
        category: "Mind",
        quadrant: "q2",
        time: "morning",
        type: "binary",
        frequency: "daily",
      },
      {
        name: "Morning Gratitude Journal",
        category: "Mind",
        quadrant: "q2",
        time: "morning",
        type: "binary",
        frequency: "daily",
      },
      {
        name: "Hydrate 500ml Water",
        category: "Health",
        quadrant: "q1",
        time: "morning",
        type: "numeric",
        target: 500,
        unit: "ml",
        frequency: "daily",
      },
    ],
  },
  {
    id: "deep_work",
    name: "High Performance & Focus",
    icon: "⚡",
    description: "Structure your day around high-impact priorities.",
    habits: [
      {
        name: "90 min Deep Work Block",
        category: "Focus",
        quadrant: "q1",
        time: "morning",
        type: "numeric",
        target: 90,
        unit: "min",
        frequency: "weekdays",
      },
      {
        name: "Clear Eisenhower Inbox",
        category: "Admin",
        quadrant: "q3",
        time: "afternoon",
        type: "binary",
        frequency: "daily",
      },
      {
        name: "Read 20 pages",
        category: "Growth",
        quadrant: "q2",
        time: "evening",
        type: "numeric",
        target: 20,
        unit: "pages",
        frequency: "daily",
      },
    ],
  },
  {
    id: "fitness",
    name: "Daily Physical Vitality",
    icon: "🔥",
    description: "Build consistent physical stamina and rest discipline.",
    habits: [
      {
        name: "30 min Workout or Walk",
        category: "Fitness",
        quadrant: "q1",
        time: "afternoon",
        type: "numeric",
        target: 30,
        unit: "min",
        frequency: "daily",
      },
      {
        name: "No screens 1hr before sleep",
        category: "Health",
        quadrant: "q2",
        time: "evening",
        type: "binary",
        frequency: "daily",
      },
    ],
  },
];

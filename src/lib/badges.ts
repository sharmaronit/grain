export interface MilestoneBadge {
  id: string;
  days: number;
  title: string;
  subtitle: string;
  icon: string;
  unlocked: boolean;
}

export function computeMilestones(currentStreak: number, bestStreak: number): MilestoneBadge[] {
  const maxStreak = Math.max(currentStreak, bestStreak);

  return [
    {
      id: "m7",
      days: 7,
      title: "7-Day Ignition",
      subtitle: "First full week completed!",
      icon: "🔥",
      unlocked: maxStreak >= 7,
    },
    {
      id: "m21",
      days: 21,
      title: "21-Day Habit Lock",
      subtitle: "Neuroplasticity in action.",
      icon: "⚡",
      unlocked: maxStreak >= 21,
    },
    {
      id: "m30",
      days: 30,
      title: "30-Day Master",
      subtitle: "A full month of discipline.",
      icon: "🛡️",
      unlocked: maxStreak >= 30,
    },
    {
      id: "m100",
      days: 100,
      title: "100-Day Legend",
      subtitle: "Top 1% consistency.",
      icon: "✨",
      unlocked: maxStreak >= 100,
    },
  ];
}

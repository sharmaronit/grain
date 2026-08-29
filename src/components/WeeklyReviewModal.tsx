import React from "react";
import { SheetShell } from "./SheetShell";
import { Trophy, TrendingUp, TrendingDown, Calendar, Flame, CheckCircle2, Award, Sparkles, Share2 } from "lucide-react";
import type { HabitDoc } from "../lib/firestore";
import type { CompletionEntry } from "../lib/streaks";
import { formatDateKey, isoDow } from "../lib/dates";

interface WeeklyReviewModalProps {
  onClose: () => void;
  habits: HabitDoc[];
  completionsMap?: Record<string, Record<string, CompletionEntry>>;
  habitStreaks?: Record<string, { currentStreak: number; bestStreak: number }>;
  onShowToast?: (msg: string) => void;
}

export function WeeklyReviewModal({
  onClose,
  habits,
  completionsMap = {},
  habitStreaks = {},
  onShowToast,
}: WeeklyReviewModalProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisWeekKeys: string[] = [];
  const dow = isoDow(today);
  for (let i = 0; i <= dow; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (dow - i));
    thisWeekKeys.push(formatDateKey(d));
  }

  let thisWeekCompletions = 0;
  for (const h of habits) {
    for (const dk of thisWeekKeys) {
      if (completionsMap[h.id]?.[dk]?.done) {
        thisWeekCompletions++;
      }
    }
  }

  return (
    <SheetShell
      onClose={onClose}
      title="Weekly Review"
      subtitle="Consistency insights and progress"
    >
      <div className="space-y-4 pt-2">
        <div className="rounded-2xl bg-canvas-soft p-4 flex items-center justify-between border border-[color:var(--hairline)]">
          <div>
            <p className="text-xs text-body font-medium">This Week's Completions</p>
            <p className="text-2xl font-bold font-display text-ink tabular-nums">{thisWeekCompletions}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 grid place-items-center">
            <Trophy className="h-5 w-5" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-body uppercase tracking-wider">Active Habits</p>
          <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
            {habits.map((h) => {
              const streak = habitStreaks[h.id]?.currentStreak ?? 0;
              return (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-[color:var(--hairline)]">
                  <span className="text-sm font-semibold text-ink">{h.name}</span>
                  <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5" />
                    {streak}d streak
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SheetShell>
  );
}

import React from "react";
import { Check, Flame } from "lucide-react";
import type { Quadrant, Habit } from "./types";

export interface TodayHeroProps {
  streak: number;
  rate: number;
  done: number;
  total: number;
  nextHabit: { q: Quadrant; i: number; habit: Habit } | null;
  onCompleteNext: (q: Quadrant, i: number) => void;
  /** Date selector nodes rendered inside the unified card */
  dateSelectorSlot?: React.ReactNode;
}

export function TodayHero({
  streak,
  done,
  total,
  nextHabit,
  onCompleteNext,
  dateSelectorSlot,
}: TodayHeroProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const R = 32;
  const C = 2 * Math.PI * R;
  const offset = C - (C * pct) / 100;

  return (
    <section className="relative px-6 pt-10 pb-4">
      {/* Structural typography: Massive Streak */}
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-mute mb-2">
          Current Streak
        </span>
        <div className="flex items-baseline gap-3">
          <span
            key={streak}
            className="font-display animate-pop-badge text-[120px] font-black leading-[0.8] tracking-tighter text-ink tabular-nums"
          >
            {streak}
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-body">
            {streak === 1 ? "DAY" : "DAYS"}
          </span>
        </div>
      </div>

      {/* Brutalist Data Point: Progress */}
      <div className="mt-8 mb-10 flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-mute mb-1">
            Progress
          </span>
          <span className="font-display text-4xl font-black tracking-tighter text-ink tabular-nums">
            {pct}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-mute mb-1">
            Completed
          </span>
          <span className="font-display text-4xl font-black tracking-tighter text-ink tabular-nums">
            {done}/{total}
          </span>
        </div>
      </div>

      {/* Inline date selector (raw structural) */}
      {dateSelectorSlot && (
        <div className="pt-4 pb-6">{dateSelectorSlot}</div>
      )}

      {/* Up-next action (stark block) */}
      {nextHabit && (
        <div className="mt-6 flex flex-col gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-mute">
            Up Next
          </span>
          <div className="flex items-center justify-between gap-4">
            <p className="font-display truncate text-3xl font-black tracking-tight text-ink">
              {nextHabit.habit.name}
            </p>
            <button
              type="button"
              onClick={() => onCompleteNext(nextHabit.q, nextHabit.i)}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--canvas)_40%,transparent)] backdrop-blur-2xl border border-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] shadow-[inset_0_1px_1px_color-mix(in_srgb,var(--accent)_25%,transparent),0_8px_32px_rgba(0,0,0,0.25)] text-ink transition hover:scale-105 active:scale-95"
            >
              <Check className="h-6 w-6" strokeWidth={3} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

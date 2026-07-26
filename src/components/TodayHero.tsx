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
    <section className="relative px-4 pt-4">
      <div className="card-soft relative overflow-hidden rounded-[24px] border border-[color:var(--hairline)] bg-canvas-soft text-ink shadow-lg">
        {/* Top row: Streak + Ring */}
        <div className="relative flex items-center justify-between p-4 pb-0">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-mute">
              <Flame className="h-3.5 w-3.5 text-accent" />
              <span>Current streak</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                key={streak}
                className="font-display animate-pop-badge text-[48px] font-bold leading-none tracking-tight text-accent tabular-nums"
              >
                {streak}
              </span>
              <span className="font-display text-base font-medium text-body">
                {streak === 1 ? "day" : "days"}
              </span>
            </div>
          </div>

          {/* Progress ring */}
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth="5"
                className="text-[color:var(--hairline)]"
              />
              <circle
                cx="40"
                cy="40"
                r={R}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
                style={{
                  transition:
                    "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-display text-sm font-bold text-ink tabular-nums">
                {pct}%
              </span>
            </div>
          </div>
        </div>

        {/* Inline date selector */}
        {dateSelectorSlot && (
          <div className="px-4 pt-3 pb-1">{dateSelectorSlot}</div>
        )}

        {/* Up-next action */}
        {nextHabit && (
          <>
            <div className="mx-4 mt-2 h-px bg-[color:var(--hairline)]" />
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-mute">
                  Up next
                </span>
                <p className="font-display truncate text-sm font-bold text-ink">
                  {nextHabit.habit.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onCompleteNext(nextHabit.q, nextHabit.i)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent text-[#000] shadow-md transition hover:scale-105 active:scale-95"
              >
                <Check className="h-5 w-5" />
              </button>
            </div>
          </>
        )}

        {/* Bottom padding when no next-habit */}
        {!nextHabit && <div className="h-3" />}
      </div>
    </section>
  );
}

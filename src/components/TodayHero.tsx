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
}

export function TodayHero({
  streak,
  done,
  total,
  nextHabit,
  onCompleteNext,
}: TodayHeroProps) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const R = 32;
  const C = 2 * Math.PI * R;
  const offset = C - (C * pct) / 100;

  return (
    <section className="relative px-5 pt-4">
      <div className="card-soft relative overflow-hidden rounded-[28px] border border-[color:var(--hairline)] bg-canvas-soft p-5 text-ink shadow-lg">
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-mute">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span>Current streak</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                key={streak}
                className="font-display animate-pop-badge text-[56px] font-bold leading-none tracking-tight text-ink tabular-nums"
              >
                {streak}
              </span>
              <span className="font-display text-lg font-medium text-body">
                {streak === 1 ? "day" : "days"}
              </span>
            </div>
          </div>

          {/* Progress ring */}
          <div className="relative h-20 w-20 shrink-0">
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
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={offset}
                className="text-ink"
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

        {nextHabit && (
          <>
            <div className="my-4 h-px bg-[color:var(--hairline)]" />

            {/* Next action row */}
            <div className="flex items-center justify-between gap-3">
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
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ink text-on-ink shadow-md transition hover:scale-105 active:scale-95"
              >
                <Check className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

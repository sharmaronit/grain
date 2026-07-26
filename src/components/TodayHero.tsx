import React from "react";
import { ArrowRight, Check } from "lucide-react";
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
      <div className="card-invert relative overflow-hidden rounded-[28px]">
        {/* Specular top edge already provided by card-invert::before */}
        <div className="relative flex items-start justify-between px-6 pt-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-50">
              Current streak
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                key={streak}
                className="font-display animate-pop-badge text-[64px] font-bold leading-none tracking-tight tabular-nums"
              >
                {streak}
              </span>
              <span className="font-display text-xl font-medium opacity-40">
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
                strokeWidth="6"
                className="opacity-10"
              />
              <circle
                cx="40"
                cy="40"
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
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
              <span className="font-display text-sm font-bold tabular-nums">
                {pct}%
              </span>
            </div>
          </div>
        </div>

        <div className="mx-6 mt-5 h-px bg-[color:var(--on-ink)]/10" />

        {/* Next action row */}
        <div className="flex items-center justify-between gap-3 px-6 py-4">
          {nextHabit ? (
            <>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-semibold uppercase tracking-widest opacity-40">
                  Up next
                </span>
                <p className="font-display truncate text-sm font-bold">
                  {nextHabit.habit.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onCompleteNext(nextHabit.q, nextHabit.i)}
                className="pill flex shrink-0 items-center gap-1.5 bg-[color:var(--on-ink)] px-4 py-2 text-[12px] font-semibold text-ink transition active:scale-95"
                data-lg-press
              >
                Done <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
            </>
          ) : (
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-medium opacity-60">
                {total > 0 && done === total
                  ? "🎉 All habits complete today!"
                  : "No pending habits"}
              </span>
              <span className="text-[11px] font-semibold opacity-40 tabular-nums">
                {done}/{total} done
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

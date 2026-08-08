import React, { useState, useMemo } from "react";
import { X, Check, ArrowLeft, Layers } from "lucide-react";
import type { Habit, Quadrant } from "./types";
import { SwipeCard } from "./SwipeCard";
import { Confetti } from "./Confetti";

const QUADRANT_ORDER: Quadrant[] = ["q1", "q2", "q3", "q4"];
const QUADRANT_LABELS: Record<Quadrant, string> = {
  q1: "Do first",
  q2: "Schedule",
  q3: "Delegate",
  q4: "Don't do",
};

interface SwipeModeViewProps {
  habits: Record<Quadrant, Habit[]>;
  onClose: () => void;
  onToggleDone: (habitId: string) => void;
  onMarkSkipped: (habitId: string) => void;
}

export function SwipeModeView({
  habits,
  onClose,
  onToggleDone,
  onMarkSkipped,
}: SwipeModeViewProps) {
  const [activeQuadrant, setActiveQuadrant] = useState<Quadrant>("q1");
  const [allDoneCelebrated, setAllDoneCelebrated] = useState(false);

  // Filter out habits that are numeric, already done, or already skipped
  const pendingHabits = useMemo(() => {
    return habits[activeQuadrant].filter(
      (h) => !h.isNumeric && !h.done && !h.skipped
    );
  }, [habits, activeQuadrant]);

  const totalPendingGlobal = useMemo(() => {
    return QUADRANT_ORDER.reduce(
      (sum, q) =>
        sum +
        habits[q].filter((h) => !h.isNumeric && !h.done && !h.skipped).length,
      0
    );
  }, [habits]);

  // When 0 everywhere
  const isAllDone = totalPendingGlobal === 0;

  if (isAllDone && !allDoneCelebrated) {
    setAllDoneCelebrated(true);
  }

  const topHabit = pendingHabits[0];
  const nextHabit = pendingHabits[1];

  const handleSwipeRight = () => {
    if (topHabit) {
      onToggleDone(topHabit.id);
    }
  };

  const handleSwipeLeft = () => {
    if (topHabit) {
      onMarkSkipped(topHabit.id);
    }
  };

  if (isAllDone) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-canvas p-6 animate-fade-in text-center">
        <Confetti count={80} />
        <div className="text-6xl mb-6 animate-bounce">🎉</div>
        <h1 className="text-3xl font-display font-bold text-ink mb-2">
          All caught up!
        </h1>
        <p className="text-mute mb-12">
          You've swept through all your habits for today.
        </p>
        <button
          onClick={onClose}
          className="rounded-full btn-primary-uber px-8 py-3.5 font-bold shadow-lg"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-canvas animate-fade-in safe-pt safe-pb">
      {/* Header */}
      <div className="flex items-center justify-between p-4 px-5">
        <button
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full card-soft text-ink hover:bg-[color:var(--surface-pressed)] transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-mute" />
          <span className="font-bold tracking-widest uppercase text-[10px] text-mute">
            Focus Mode
          </span>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Quadrant Tabs */}
      <div className="px-5 mb-4">
        <div className="flex bg-[color:var(--canvas-soft)] p-1 rounded-full w-full shadow-inner border border-[color:var(--hairline)] overflow-x-auto hide-scrollbar">
          {QUADRANT_ORDER.map((q) => {
            const isActive = activeQuadrant === q;
            const count = habits[q].filter((h) => !h.isNumeric && !h.done && !h.skipped).length;
            return (
              <button
                key={q}
                onClick={() => setActiveQuadrant(q)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 px-3 text-xs font-bold transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-ink text-on-ink shadow-sm"
                    : "text-mute hover:text-ink"
                }`}
              >
                {QUADRANT_LABELS[q]}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] leading-none ${isActive ? "bg-white/20" : "bg-[color:var(--hairline-mid)] text-ink"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards Area */}
      <div className="flex-1 relative mx-5 my-2">
        {pendingHabits.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <Check className="h-12 w-12 text-mute/30 mb-4" />
            <h3 className="text-xl font-display font-bold text-ink mb-1">
              Quadrant Clear
            </h3>
            <p className="text-sm text-mute">Select another tab to continue</p>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {/* Background card (next habit) */}
            {nextHabit && (
              <SwipeCard
                key={nextHabit.id}
                habit={nextHabit}
                isTop={false}
                onSwipeRight={() => {}}
                onSwipeLeft={() => {}}
                style={{
                  transform: "scale(0.95) translateY(16px)",
                  opacity: 0.8,
                  zIndex: 10,
                }}
              />
            )}
            {/* Foreground card (current habit) */}
            {topHabit && (
              <SwipeCard
                key={topHabit.id}
                habit={topHabit}
                isTop={true}
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                style={{ zIndex: 20 }}
              />
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 pb-12 flex justify-center items-center gap-6">
        <button
          onClick={handleSwipeLeft}
          disabled={!topHabit}
          className="grid h-16 w-16 place-items-center rounded-full border-2 border-[color:var(--hairline-mid)] text-rose-400 bg-canvas transition active:scale-95 disabled:opacity-30 disabled:active:scale-100 hover:bg-rose-400/10 hover:border-rose-400/50"
        >
          <X className="h-8 w-8" strokeWidth={2.5} />
        </button>

        <button
          onClick={handleSwipeRight}
          disabled={!topHabit}
          className="grid h-16 w-16 place-items-center rounded-full border-2 border-[color:var(--hairline-mid)] text-emerald-400 bg-canvas transition active:scale-95 disabled:opacity-30 disabled:active:scale-100 hover:bg-emerald-400/10 hover:border-emerald-400/50"
        >
          <Check className="h-8 w-8" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

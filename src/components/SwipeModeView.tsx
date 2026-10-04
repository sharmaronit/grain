import React, { useState, useMemo } from "react";
import { X, Check, ArrowLeft, Layers } from "lucide-react";
import type { Habit, Quadrant } from "./types";
import { SwipeCard } from "./SwipeCard";
import { GrainState } from "./ui/GrainState";

const QUADRANT_ORDER: Quadrant[] = ["q1", "q2", "q3", "q4"];
type DeckFilter = "all" | Quadrant;
const DECK_FILTERS: DeckFilter[] = ["all", ...QUADRANT_ORDER];
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
  const [activeQuadrant, setActiveQuadrant] = useState<DeckFilter>("all");

  // Filter out habits that are numeric, already done, or already skipped
  const pendingHabits = useMemo(() => {
    const selectedHabits = activeQuadrant === "all"
      ? QUADRANT_ORDER.flatMap((q) => habits[q])
      : habits[activeQuadrant];
    return selectedHabits.filter(
      (h) => h.type !== "numeric" && !h.done && !h.skipped
    );
  }, [habits, activeQuadrant]);

  const totalPendingGlobal = useMemo(() => {
    return QUADRANT_ORDER.reduce(
      (sum, q) =>
        sum +
        habits[q].filter((h) => h.type !== "numeric" && !h.done && !h.skipped).length,
      0
    );
  }, [habits]);

  // When 0 everywhere
  const isAllDone = totalPendingGlobal === 0;

  const hasCheckIns = QUADRANT_ORDER.some(q => habits[q].some(h => h.type !== "numeric"));
  const numericPending = QUADRANT_ORDER.some(q => habits[q].some(h => h.type === "numeric" && !h.done && !h.skipped));
  const nextQuadrant = QUADRANT_ORDER.find(q => habits[q].some(h => h.type !== "numeric" && !h.done && !h.skipped));

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

  return (
    <div className="deck-view absolute inset-0 z-50 flex flex-col animate-fade-in safe-pt safe-pb">
      {/* Header */}
      <div className="flex items-center justify-between p-4 px-4">
        <button
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full card-soft text-ink hover:bg-[color:var(--surface-pressed)] transition"
          aria-label="Close Deck"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-mute" />
          <span className="font-bold tracking-widest uppercase text-[10px] text-mute">
            Deck
          </span>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Quadrant Tabs */}
      <div className="px-4 mb-4">
        <div
          className="deck-quadrant-tabs"
          style={{ "--quadrant-index": DECK_FILTERS.indexOf(activeQuadrant) } as React.CSSProperties}
          aria-label="Filter Deck cards"
        >
          <span className="deck-quadrant-selection" aria-hidden="true" />
          {DECK_FILTERS.map((q) => {
            const isActive = activeQuadrant === q;
            const count = q === "all" ? totalPendingGlobal : habits[q].filter((h) => h.type !== "numeric" && !h.done && !h.skipped).length;
            return (
              <button
                key={q}
                aria-pressed={isActive}
                onClick={() => setActiveQuadrant(q)}
                className={`deck-quadrant-tab flex flex-col sm:flex-row items-center justify-center gap-1 rounded-full px-1 text-[10px] sm:text-[11px] font-bold whitespace-nowrap ${
                  isActive
                    ? "deck-quadrant-tab--active"
                    : "text-mute"
                }`}
              >
                {q === "all" ? "All cards" : QUADRANT_LABELS[q]}
                {count > 0 && (
                  <span className={`deck-quadrant-count ${isActive ? "deck-quadrant-count--active" : ""}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards Area */}
      <div className={`flex-1 relative mx-5 my-2 ${isAllDone ? "mb-8" : ""}`}>
        {isAllDone ? (
          <GrainState
            className="h-full"
            icon={hasCheckIns ? Check : Layers}
            eyebrow="Deck"
            title={hasCheckIns ? "All caught up." : "A little space to begin."}
            description={numericPending ? "Your Deck is clear. Numeric habits are ready to track in Today." : hasCheckIns ? "No check-ins left in your Deck. Take a breath. Come back when you're ready." : "Your daily check-in habits will appear here, one at a time."}
            action={{ label: "Back to Grain", onClick: onClose }}
          />
        ) : pendingHabits.length === 0 ? (
          <GrainState className="h-full" icon={Check} eyebrow={activeQuadrant === "all" ? "All cards" : QUADRANT_LABELS[activeQuadrant]} title="Nothing waiting here." description="This part of your day is clear. Keep going when you're ready." action={nextQuadrant ? { label: `Continue to ${QUADRANT_LABELS[nextQuadrant].toLowerCase()}`, onClick: () => setActiveQuadrant(nextQuadrant) } : undefined} />
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
                  transform: "scale(0.94) translateY(16px)",
                  opacity: 0.65,
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
      {!isAllDone && <div className="p-6 pb-12 flex justify-center items-center gap-6">
        <button
          onClick={handleSwipeLeft}
          aria-label="Skip habit"
          disabled={!topHabit}
          className="grid h-16 w-16 place-items-center rounded-full border-2 border-[color:var(--hairline-mid)] text-rose-400 bg-canvas transition active:scale-95 disabled:opacity-30 disabled:active:scale-100 hover:bg-rose-400/10 hover:border-rose-400/50"
        >
          <X className="h-8 w-8" strokeWidth={2.5} />
        </button>

        <button
          onClick={handleSwipeRight}
          aria-label="Complete habit"
          disabled={!topHabit}
          className="grid h-16 w-16 place-items-center rounded-full border-2 border-[color:var(--hairline-mid)] text-emerald-400 bg-canvas transition active:scale-95 disabled:opacity-30 disabled:active:scale-100 hover:bg-emerald-400/10 hover:border-emerald-400/50"
        >
          <Check className="h-8 w-8" strokeWidth={3} />
        </button>
      </div>}
    </div>
  );
}

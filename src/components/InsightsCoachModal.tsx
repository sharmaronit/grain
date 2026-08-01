import React, { useState } from "react";
import { SheetShell } from "./SheetShell";
import { Sparkles, Bot, Loader2, RefreshCw } from "lucide-react";
import type { InsightsResult } from "../lib/insights";

export function InsightsCoachModal({
  onClose,
  insights,
  currentStreak,
  doneCount,
  totalCount,
}: {
  onClose: () => void;
  insights: InsightsResult;
  currentStreak: number;
  doneCount: number;
  totalCount: number;
}) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string[] | null>(() => {
    // Generates smart data-driven habit advice instantly based on user patterns
    const tips = [];

    if (insights.weekdayDiff >= 15) {
      tips.push(
        "You lose momentum on weekends. Schedule lighter 5-minute versions of your habits on Saturday and Sunday."
      );
    } else {
      tips.push(
        "Great weekday/weekend balance! Keep your routine consistent to build automatic triggers."
      );
    }

    if (insights.topHabit) {
      tips.push(
        `Habit Stacking: Anchor new goals directly after "${insights.topHabit.name}" (your strongest ${insights.topHabit.streak}-day streak).`
      );
    } else {
      tips.push(
        "Focus on completing just ONE high-priority 'Do first' habit every morning before opening social media."
      );
    }

    tips.push(
      `Your peak productivity window is ${insights.peakWindow}. Move your most important goals into this time slot.`
    );

    return tips;
  });

  const refreshAdvice = () => {
    setLoading(true);
    setTimeout(() => {
      setAdvice((prev) => prev ? [...prev].sort(() => Math.random() - 0.5) : prev);
      setLoading(false);
    }, 600);
  };

  return (
    <SheetShell
      onClose={onClose}
      title="Insights & Coaching"
      subtitle="Data-driven recommendations based on your consistency patterns."
    >
      <div className="mt-4 space-y-4">
        <div className="liquid-glass specular flex items-center justify-between rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-on-ink">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-sm font-bold text-ink">
                Grain Insights
              </div>
              <div className="text-[11px] text-body">
                {currentStreak}-day streak · {doneCount}/{totalCount} today
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshAdvice}
            disabled={loading}
            className="grid h-8 w-8 place-items-center rounded-full bg-canvas-soft text-ink hover:bg-[color:var(--surface-pressed)] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-mute">
            Personalized Action Plan
          </h4>
          {advice?.map((tip, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-2xl border border-[color:var(--hairline)] bg-canvas-soft p-3.5 text-xs font-medium text-ink leading-relaxed"
            >
              <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink/10 text-[10px] font-bold text-ink">
                {idx + 1}
              </div>
              <p>{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </SheetShell>
  );
}

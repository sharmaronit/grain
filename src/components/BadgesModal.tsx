import React from "react";
import { SheetShell } from "./SheetShell";
import { computeMilestones } from "../lib/badges";

export function BadgesModal({
  onClose,
  currentStreak,
  bestStreak,
}: {
  onClose: () => void;
  currentStreak: number;
  bestStreak: number;
}) {
  const milestones = computeMilestones(currentStreak, bestStreak);

  return (
    <SheetShell
      onClose={onClose}
      title="Streak Milestones"
      subtitle="Unlock badges as your consistency grows."
    >
      <div className="mt-4 space-y-3">
        {milestones.map((m) => (
          <div
            key={m.id}
            className={`flex items-center gap-3.5 rounded-2xl border p-3.5 transition ${
              m.unlocked
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-[color:var(--hairline)] bg-canvas-soft opacity-60"
            }`}
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-canvas text-2xl">
              {m.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-sm font-bold text-ink">{m.title}</h4>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                    m.unlocked
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-canvas text-mute"
                  }`}
                >
                  {m.unlocked ? "Unlocked" : `${m.days}d goal`}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-body">{m.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </SheetShell>
  );
}

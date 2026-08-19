import React from "react";
import { Sparkles, TrendingUp, Sun, Flame } from "lucide-react";
import type { InsightsResult } from "../lib/insights";

export function InsightsCard({ insights }: { insights: InsightsResult }) {
  return (
    <div className="liquid-glass specular relative overflow-hidden rounded-[24px] border border-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] shadow-[inset_0_1px_1px_color-mix(in_srgb,var(--accent)_20%,transparent),0_8px_32px_rgba(0,0,0,0.3)] p-4 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-xl bg-[color:color-mix(in_srgb,var(--canvas)_40%,transparent)] border border-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] shadow-[inset_0_1px_1px_color-mix(in_srgb,var(--accent)_25%,transparent)] text-ink">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h3 className="font-display text-sm font-bold text-ink">Weekly Insights</h3>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-mute">
          28-day trends
        </span>
      </div>

      <p className="mt-2.5 text-[12px] font-medium leading-relaxed text-ink">
        {insights.insightSummary}
      </p>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[color:color-mix(in_srgb,var(--canvas)_40%,transparent)] backdrop-blur-xl border border-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] shadow-[inset_0_1px_1px_color-mix(in_srgb,var(--accent)_15%,transparent)] px-3 py-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-body">Weekdays</span>
          <div className="font-display text-base font-bold text-ink tabular-nums">
            {insights.weekdayRate}%
          </div>
        </div>

        <div className="rounded-xl bg-[color:color-mix(in_srgb,var(--canvas)_40%,transparent)] backdrop-blur-xl border border-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] shadow-[inset_0_1px_1px_color-mix(in_srgb,var(--accent)_15%,transparent)] px-3 py-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-body">Weekends</span>
          <div className="font-display text-base font-bold text-ink tabular-nums">
            {insights.weekendRate}%
          </div>
        </div>

        <div className="rounded-xl bg-[color:color-mix(in_srgb,var(--canvas)_40%,transparent)] backdrop-blur-xl border border-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] shadow-[inset_0_1px_1px_color-mix(in_srgb,var(--accent)_15%,transparent)] px-3 py-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-body">Peak</span>
          <div className="font-display truncate text-xs font-bold text-ink">
            {insights.peakWindow}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, memo } from "react";
import { ChevronDown, Check, Flag, LockKeyhole, Sprout, Wheat } from "lucide-react";
import type { InsightsResult } from "../../lib/insights";
import { InsightsCard } from "../InsightsCard";
import { DropdownMotion } from "../ui/DropdownMotion";

const CATEGORIES = ["All habits", "Mind", "Health", "Growth", "Focus", "Fitness", "Admin"];

function Stat({
  label,
  value,
  pulseKey,
}: {
  label: string;
  value: string;
  pulseKey?: number | string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div
        key={pulseKey ?? label}
        className="font-display text-3xl font-bold tabular-nums text-ink animate-pop-badge tracking-tight"
        style={{ textShadow: "0 0 16px var(--ink), 0 0 32px var(--ink)" }}
      >
        {value}
      </div>
      <div
        className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ink font-bold opacity-90"
        style={{ textShadow: "0 0 8px var(--ink)" }}
      >
        {label}
      </div>
    </div>
  );
}

interface ConsistencyTabProps {
  heatmap: number[][]; // Kept in interface to prevent parent errors, but unused
  selectedHabit: string;
  setSelectedHabit: (habit: string) => void;
  doneCount: number;
  totalCount: number;
  totalStreak: number;
  bestStreak: number;
  rate: number;
  weeklyInsights: InsightsResult;
  showToast: (msg: string) => void;
  onOpenWeeklyReview?: () => void;
  onOpenAiCoach?: () => void;
}

export const ConsistencyTab = memo(function ConsistencyTab({
  heatmap,
  selectedHabit,
  setSelectedHabit,
  doneCount,
  totalCount,
  totalStreak,
  bestStreak,
  rate,
  weeklyInsights,
}: ConsistencyTabProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const levels = [
    {
      days: 0,
      title: "Plant the Goal",
      desc: "Every personal journey begins with an intention.",
      icon: Flag,
    },
    {
      days: 1,
      title: "First Sprout",
      desc: "You completed your first meaningful action.",
      icon: Sprout,
    },
    { days: 3, title: "Rooted Routine", desc: "Your first rhythm is taking root.", icon: Sprout },
    { days: 7, title: "Growing Strong", desc: "A full week of steady progress.", icon: Sprout },
    {
      days: 14,
      title: "Harvest Ready",
      desc: "Two weeks of returning to what matters.",
      icon: Wheat,
    },
    {
      days: 30,
      title: "The Harvest",
      desc: "Your consistency has become part of who you are.",
      icon: Wheat,
    },
  ];

  const currentIndex = levels.reduce(
    (latestIndex, level, index) => (totalStreak >= level.days ? index : latestIndex),
    0,
  );

  // A gentle side-to-side trail, like a level map in an old adventure game.
  const trailOffsets = [18, -32, 28, -24, 22, -12];

  return (
    <div className="animate-tab-fade pt-16 pb-24 relative min-h-screen">
      <section className="px-4 relative z-10">
        {/* Header & Filter */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink tracking-tight">
              Your Journey
            </h2>
            <p className="text-[13px] text-body mt-0.5">Grow one action at a time</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className="liquid-control flex items-center gap-2 px-3 py-1.5 text-xs text-ink rounded-xl font-medium hover:bg-[color:color-mix(in_srgb,var(--canvas)_32%,transparent)] transition"
            >
              <span className="max-w-[100px] truncate">{selectedHabit}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${filterOpen ? "rotate-180" : ""}`}
              />
            </button>
            <DropdownMotion open={filterOpen} className="sheet-glass absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--ink)_30%,transparent)] text-ink">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setSelectedHabit(c);
                      setFilterOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                      c === selectedHabit
                        ? "bg-[color:color-mix(in_srgb,var(--accent)_15%,transparent)] text-ink font-bold"
                        : "text-body font-medium hover:bg-[color:color-mix(in_srgb,var(--canvas)_60%,transparent)] hover:text-ink"
                    }`}
                  >
                    {c}
                    {c === selectedHabit && <Check className="h-4 w-4 text-ink" />}
                  </button>
                ))}
            </DropdownMotion>
          </div>
        </div>

        {/* Minimalist Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-12">
          <Stat label="Today" value={`${doneCount}/${totalCount}`} pulseKey={doneCount} />
          <Stat label="Best" value={bestStreak > 0 ? `${bestStreak}d` : "—"} />
          <Stat label="Rate" value={`${rate}%`} pulseKey={rate} />
        </div>

        {/* Personal growth level map */}
        <div className="relative mb-8 flex flex-col items-center px-4 py-3">
          <div className="absolute left-1/2 top-5 bottom-5 w-px -translate-x-1/2 border-l-2 border-dashed border-[color:var(--hairline-mid)] opacity-70" />

          <div className="relative w-full max-w-sm space-y-11">
            {levels.map((level, index) => {
              const unlocked = totalStreak >= level.days;
              const isCurrent = index === currentIndex;
              const LevelIcon = level.icon;
              const remaining = Math.max(0, level.days - totalStreak);

              return (
                <div
                  key={level.days}
                  className={`relative z-10 flex flex-col items-center text-center animate-fade-in ${unlocked ? "opacity-100" : "opacity-55"}`}
                  style={{
                    animationDelay: `${index * 90}ms`,
                    transform: `translateX(${trailOffsets[index]}px)`,
                  }}
                >
                  {isCurrent && (
                    <span className="consistency-current-label mb-2 rounded-full bg-[color:var(--ink)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[color:var(--canvas)] shadow-lg">
                      You are here
                    </span>
                  )}

                  <div
                    className={`consistency-level-node relative flex h-12 w-12 items-center justify-center rounded-full border-2 bg-[color:var(--canvas)] transition-transform duration-300 ${isCurrent ? "scale-110 border-[color:var(--ink)] shadow-[0_0_22px_color-mix(in_srgb,var(--ink)_34%,transparent)]" : unlocked ? "border-[color:var(--ink)]" : "border-dashed border-[color:var(--hairline-mid)]"}`}
                  >
                    {unlocked ? (
                      <LevelIcon className="h-5 w-5 text-ink" strokeWidth={2.2} />
                    ) : (
                      <LockKeyhole className="h-4 w-4 text-mute" />
                    )}
                    {unlocked && !isCurrent && (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--ink)] text-[color:var(--canvas)]">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  <div className="mt-3 max-w-[230px] px-4 py-1">
                    <p className="hidden">
                      Level {levels.length - index} ·{" "}
                      {level.days === 0 ? "Start" : `${level.days} days`}
                    </p>
                    <h3 className="mt-0.5 font-display text-[16px] font-bold tracking-tight text-ink">
                      {level.title}
                    </h3>
                    <p className="mt-1 text-[12px] leading-snug text-body">
                      {unlocked
                        ? level.desc
                        : `${remaining} more check-in${remaining === 1 ? "" : "s"} to unlock`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Insights */}
        {totalStreak >= 3 && (
          <div className="mt-8">
            <InsightsCard insights={weeklyInsights} />
          </div>
        )}
      </section>
    </div>
  );
});

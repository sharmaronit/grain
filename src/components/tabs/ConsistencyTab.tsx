import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { InsightsCard } from "../InsightsCard";

const CATEGORIES = ["All habits", "Mind", "Health", "Growth", "Focus", "Fitness", "Admin"];
const TODAY_COL = 51;
const TODAY_ROW = 3;

function Stat({ label, value, pulseKey }: { label: string; value: string; pulseKey?: number | string }) {
  return (
    <div className="text-center">
      <div
        key={pulseKey ?? label}
        className="font-display text-lg font-bold tabular-nums text-ink animate-pop-badge"
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-body">{label}</div>
    </div>
  );
}

interface ConsistencyTabProps {
  heatmap: number[][];
  selectedHabit: string;
  setSelectedHabit: (habit: string) => void;
  doneCount: number;
  totalCount: number;
  totalStreak: number;
  rate: number;
  weeklyInsights: any;
  showToast: (msg: string) => void;
}

export function ConsistencyTab({
  heatmap,
  selectedHabit,
  setSelectedHabit,
  doneCount,
  totalCount,
  totalStreak,
  rate,
  weeklyInsights,
  showToast,
}: ConsistencyTabProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="animate-tab-fade pt-12">
      <section className="px-5">
        <div className="card-soft p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-ink">Consistency</h2>
              <p className="text-[11px] text-body">Last 52 weeks</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className="chip-uber flex items-center gap-1.5 px-3 py-1.5 text-xs"
              >
                <span className="max-w-[100px] truncate">{selectedHabit}</span>
                <ChevronDown className={`h-3 w-3 transition ${filterOpen ? "rotate-180" : ""}`} />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-xl border border-[color:var(--hairline)] bg-canvas shadow-xl animate-fade-in">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setSelectedHabit(c);
                        setFilterOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-canvas-soft ${
                        c === selectedHabit ? "text-ink font-semibold" : "text-body"
                      }`}
                    >
                      {c}
                      {c === selectedHabit && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="scrollbar-none overflow-x-auto">
            <div className="flex gap-[3px]">
              {heatmap.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-[3px]">
                  {col.map((v, ri) => {
                    const isToday = ci === TODAY_COL && ri === TODAY_ROW;
                    return (
                      <button
                        type="button"
                        key={isToday ? `today-${v}` : ri}
                        aria-label={`Day intensity ${v} of 3`}
                        onClick={() => {
                          try { navigator.vibrate?.(6 + v * 4); } catch {}
                          showToast(`Intensity: ${v} of 3`);
                        }}
                        className={`h-2 w-2 rounded-[2px] transition-transform hover:scale-125 active:scale-90 ${isToday ? "animate-cell-flash ring-1 ring-[color:var(--wp-accent)]" : ""}`}
                        style={{
                          background:
                            v === 0
                              ? "var(--wp-empty)"
                              : v === 1
                                ? "var(--wp-low)"
                                : v === 2
                                  ? "var(--wp-mid)"
                                  : "var(--wp-hi)",
                          transition: "background 500ms ease, transform 120ms ease",
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-body">
            <span>Less</span>
            {[0, 1, 2, 3].map((v) => (
              <div
                key={v}
                className="h-2 w-2 rounded-[2px]"
                style={{
                  background:
                    v === 0
                      ? "var(--wp-empty)"
                      : v === 1
                        ? "var(--wp-low)"
                        : v === 2
                          ? "var(--wp-mid)"
                          : "var(--wp-hi)",
                  transition: "background 500ms ease",
                }}
              />
            ))}
            <span>More</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[color:var(--hairline)] pt-3">
            <Stat label="Today" value={`${doneCount}/${totalCount}`} pulseKey={doneCount} />
            <Stat label="Best" value={totalStreak > 0 ? `${totalStreak}d` : "—"} />
            <Stat label="Rate" value={`${rate}%`} pulseKey={rate} />
          </div>
        </div>

        {totalStreak >= 3 && (
          <div className="mt-4">
            <InsightsCard insights={weeklyInsights} />
          </div>
        )}
      </section>
    </div>
  );
}

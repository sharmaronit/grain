import { useStore } from "../../store/useStore";
import { TodayHero } from "../TodayHero";
import { getWeekDates, isSameDay, shortDay } from "../../lib/dates";
import { Plus, Check, ArrowRight } from "lucide-react";
import type { Habit, Quadrant } from "../types";

const QUADRANTS: Record<Quadrant, { title: string; sub: string }> = {
  q1: { title: "Do first", sub: "Urgent · Important" },
  q2: { title: "Schedule", sub: "Important · Not urgent" },
  q3: { title: "Delegate", sub: "Urgent · Low impact" },
  q4: { title: "Don't do", sub: "Low · Not urgent" },
};
const QUADRANT_ORDER: Quadrant[] = ["q1", "q2", "q3", "q4"];

interface TodayTabProps {
  totalStreak: number;
  rate: number;
  doneCount: number;
  totalCount: number;
  habits: Record<Quadrant, (Habit & { done?: boolean; streak?: number })[]>;
  toggleDone: (q: Quadrant, i: number) => void;
  showToast: (msg: string) => void;
}

export function TodayTab({
  totalStreak,
  rate,
  doneCount,
  totalCount,
  habits,
  toggleDone,
  showToast,
}: TodayTabProps) {
  const selectedDate = useStore((s) => s.selectedDate);
  const setSelectedDate = useStore((s) => s.setSelectedDate);
  const setModalOpen = useStore((s) => s.setModalOpen);
  const setDetailTarget = useStore((s) => s.setDetailTarget);

  return (
    <div className="space-y-4 animate-tab-fade pt-12">
      <TodayHero
        streak={totalStreak}
        rate={rate}
        done={doneCount}
        total={totalCount}
        nextHabit={(() => {
          for (const q of QUADRANT_ORDER) {
            const idx = habits[q].findIndex((h) => !h.done);
            if (idx !== -1) return { q, i: idx, habit: habits[q][idx] };
          }
          return null;
        })()}
        onCompleteNext={(q: Quadrant, i: number) => toggleDone(q, i)}
        dateSelectorSlot={
          <div className="flex items-center justify-between gap-1.5">
            {getWeekDates(new Date()).map((date) => {
              const active = isSameDay(date, selectedDate);
              const isTodayDate = isSameDay(date, new Date());
              const isPast = date < new Date() && !isTodayDate;
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => {
                    setSelectedDate(date);
                    if (!isTodayDate) showToast(`Viewing ${shortDay(date)}, ${date.getDate()}`);
                  }}
                  className={`flex h-10 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl transition ${
                    active
                      ? "bg-ink text-on-ink shadow-sm"
                      : "bg-canvas-softer text-ink hover:bg-[color:var(--surface-pressed)]"
                  }`}
                >
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? "opacity-80" : "text-body"}`}>
                    {shortDay(date)}
                  </span>
                  <span className="font-display text-xs font-bold tabular-nums">{date.getDate()}</span>
                  {isPast && !active && <span className="h-1 w-1 rounded-full bg-ink/40" />}
                </button>
              );
            })}
          </div>
        }
      />

      <section className="px-4">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div
              className="animate-breathe w-full rounded-2xl border-2 border-dashed border-[color:var(--hairline-mid)] bg-canvas-soft p-4 flex items-center gap-3 cursor-pointer transition hover:bg-canvas-softer"
              onClick={() => setModalOpen(true)}
            >
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-dashed border-[color:var(--hairline-mid)]">
                <Plus className="h-4 w-4 text-ink" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Tap to add your first habit</p>
                <p className="text-[11px] text-body mt-0.5">Your streak starts with one check ✓</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {QUADRANT_ORDER.flatMap((q) =>
              habits[q].map((h, i) => (
                <div
                  key={`${q}-${i}-${h.name}`}
                  className="animate-fade-in-up card-soft flex items-center p-3 group cursor-pointer hover:border-[color:var(--hairline-mid)] transition"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => {
                    setDetailTarget({ q, i });
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDone(q, i);
                      }}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition ${
                        h.done
                          ? "bg-ink border-ink text-on-ink animate-check-pop"
                          : "border-[color:var(--hairline-mid)] text-transparent hover:border-ink"
                      }`}
                    >
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${h.done ? "line-through opacity-50 text-body" : "text-ink"}`}>
                        {h.name}
                      </p>
                      <p className="text-[10px] text-body">{QUADRANTS[q].title} · {h.streak}d streak</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-mute opacity-0 group-hover:opacity-100 transition shrink-0" />
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

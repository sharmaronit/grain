import { useRef, useEffect, useMemo } from "react";
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

  const scrollRef = useRef<HTMLDivElement>(null);
  
  const isMouseDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const dragDistance = useRef(0);
  
  // Generate 30 days before and 30 days after today
  const scrollableDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 61 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - 30 + i);
      return d;
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const idx = scrollableDates.findIndex(d => isSameDay(d, selectedDate));
      if (idx !== -1) {
        scrollRef.current.scrollTo({
          left: idx * 56, // 32px width + 24px gap
          behavior: 'smooth'
        });
      }
    }
  }, [selectedDate, scrollableDates]);

  return (
    <div className="space-y-4 animate-tab-fade pt-16">
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
          <div className="relative w-full border-y border-white/10 py-4 flex items-center before:absolute before:left-0 before:w-8 before:h-full before:bg-gradient-to-r before:from-[var(--canvas)] before:to-transparent before:pointer-events-none before:z-10 after:absolute after:right-0 after:w-8 after:h-full after:bg-gradient-to-l after:from-[var(--canvas)] after:to-transparent after:pointer-events-none after:z-10">
            <div 
              ref={scrollRef}
              className="flex w-full items-center overflow-x-auto hide-scrollbar snap-x snap-mandatory px-[calc(50vw-16px)] gap-6 cursor-grab active:cursor-grabbing select-none"
              onMouseDown={(e) => {
                isMouseDown.current = true;
                dragDistance.current = 0;
                startX.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
                scrollLeft.current = scrollRef.current?.scrollLeft || 0;
                if (scrollRef.current) {
                  scrollRef.current.style.scrollSnapType = 'none';
                  scrollRef.current.style.scrollBehavior = 'auto';
                }
              }}
              onMouseMove={(e) => {
                if (!isMouseDown.current || !scrollRef.current) return;
                e.preventDefault();
                const x = e.pageX - scrollRef.current.offsetLeft;
                const walk = (x - startX.current);
                dragDistance.current = Math.abs(walk);
                scrollRef.current.scrollLeft = scrollLeft.current - walk;
              }}
              onMouseUp={() => {
                isMouseDown.current = false;
                if (scrollRef.current) {
                  scrollRef.current.style.scrollSnapType = 'x mandatory';
                  scrollRef.current.style.scrollBehavior = 'smooth';
                }
              }}
              onMouseLeave={() => {
                isMouseDown.current = false;
                if (scrollRef.current) {
                  scrollRef.current.style.scrollSnapType = 'x mandatory';
                  scrollRef.current.style.scrollBehavior = 'smooth';
                }
              }}
            >
              {scrollableDates.map((date) => {
                const active = isSameDay(date, selectedDate);
                const isTodayDate = isSameDay(date, new Date());
                return (
                  <button
                    key={date.toISOString()}
                    onClick={(e) => {
                      if (dragDistance.current > 5) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }
                      setSelectedDate(date);
                      if (!isTodayDate) showToast(`Viewing ${shortDay(date)}, ${date.getDate()}`);
                    }}
                    className={`flex flex-col items-center justify-center shrink-0 snap-center w-8 transition ${active ? "text-ink" : "text-body hover:text-ink"
                      }`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-widest ${active ? "opacity-100" : "opacity-40"}`}>
                      {shortDay(date)}
                    </span>
                    <span className={`font-display text-lg font-black tabular-nums ${active ? "underline decoration-2 underline-offset-4" : ""}`}>
                      {date.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        }
      />

      <section className="px-6 pb-12">
        {totalCount === 0 ? (
          <div className="flex flex-col items-start gap-4 py-16">
            <div
              className="group flex flex-col items-start gap-4 cursor-pointer"
              onClick={() => setModalOpen(true)}
            >
              <h2 className="font-display text-5xl font-black leading-none tracking-tighter text-ink group-hover:opacity-60 transition">
                + ADD<br />FIRST<br />HABIT
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-mute mt-2">
                Start your streak today
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col border-t border-white/10">
            {QUADRANT_ORDER.flatMap((q) =>
              habits[q].map((h, i) => (
                <div
                  key={`${q}-${i}-${h.name}`}
                  className="animate-fade-in-up flex items-center py-5 group cursor-pointer hover:bg-white/5 backdrop-blur-[32px] border border-white/10 rounded-2xl mb-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] transition px-4 -mx-2"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => {
                    setDetailTarget({ q, i });
                  }}
                >
                  <div className="flex items-center gap-5 min-w-0 flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDone(q, i);
                      }}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-[3px] transition ${h.done
                          ? "bg-white/10 backdrop-blur-[40px] border border-white/20 text-on-ink animate-check-pop"
                          : "border-ink text-transparent hover:scale-105"
                        }`}
                    >
                      <Check className="h-5 w-5" strokeWidth={4} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`font-display text-2xl font-black tracking-tight truncate ${h.done ? "line-through opacity-40 text-body" : "text-ink"}`}>
                        {h.name}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-mute mt-1">
                        {QUADRANTS[q].title} // {h.streak}D STREAK
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-mute opacity-0 group-hover:opacity-100 transition shrink-0" />
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

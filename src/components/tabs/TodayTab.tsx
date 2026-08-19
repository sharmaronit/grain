import { useRef, useEffect, useMemo, memo } from "react";
import { useStore } from "../../store/useStore";
import { TodayHero } from "../TodayHero";
import { HabitCard } from "../HabitCard";
import { isSameDay, shortDay } from "../../lib/dates";
import type { Habit, Quadrant } from "../types";

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

export const TodayTab = memo(({
  totalStreak,
  rate,
  doneCount,
  totalCount,
  habits,
  toggleDone,
  showToast,
}: TodayTabProps) => {
  const selectedDate = useStore((s) => s.selectedDate);
  const setSelectedDate = useStore((s) => s.setSelectedDate);
  const setModalOpen = useStore((s) => s.setModalOpen);
  const setDetailTarget = useStore((s) => s.setDetailTarget);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  const isMouseDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const dragDistance = useRef(0);
  
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
        const targetScroll = (idx * 56) - (scrollRef.current.clientWidth / 2) + 28;
        scrollRef.current.scrollTo({ left: targetScroll, behavior: "smooth" });
      }
    }
  }, [selectedDate, scrollableDates]);

  return (
    <div className="flex flex-col gap-6 pt-16">
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
        onCompleteNext={(q, i) => toggleDone(q, i)}
        dateSelectorSlot={
          <div className="flex flex-col gap-2">
            <div 
              ref={scrollRef}
              onMouseDown={(e) => {
                isMouseDown.current = true;
                startX.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
                scrollLeft.current = scrollRef.current?.scrollLeft || 0;
                dragDistance.current = 0;
              }}
              onMouseLeave={() => {
                isMouseDown.current = false;
              }}
              onMouseUp={() => {
                isMouseDown.current = false;
              }}
              onMouseMove={(e) => {
                if (!isMouseDown.current || !scrollRef.current) return;
                e.preventDefault();
                const x = e.pageX - scrollRef.current.offsetLeft;
                const walk = (x - startX.current) * 1.5;
                dragDistance.current = Math.abs(x - startX.current);
                scrollRef.current.scrollLeft = scrollLeft.current - walk;
              }}
              className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none select-none cursor-grab active:cursor-grabbing"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {scrollableDates.map((date) => {
                const active = isSameDay(date, selectedDate);
                const isTodayDate = isSameDay(date, new Date());
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => {
                      if (dragDistance.current > 5) return;
                      setSelectedDate(date);
                      if (!isTodayDate) showToast(`Viewing ${shortDay(date)}, ${date.getDate()}`);
                    }}
                    style={{ scrollSnapAlign: "center" }}
                    className={`flex flex-col items-center justify-center h-16 w-12 shrink-0 transition ${
                      active
                        ? "bg-ink text-[color:var(--canvas)] scale-105 shadow-md rounded-xl"
                        : "text-mute hover:text-ink hover:bg-[color:var(--canvas-soft)] rounded-xl"
                    }`}
                  >
                    <span className={`text-[9px] font-black uppercase tracking-widest ${active ? "opacity-90" : "opacity-40"}`}>
                      {shortDay(date)}
                    </span>
                    <span className="font-display text-lg font-black tabular-nums mt-0.5">
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
          <div className="flex flex-col gap-2.5">
            {QUADRANT_ORDER.flatMap((q) =>
              habits[q].map((h, i) => (
                <HabitCard
                  key={`${q}-${i}-${(h as any).id || h.name}`}
                  habit={h}
                  quadrant={q}
                  index={i}
                  onToggle={toggleDone}
                  onOpenDetail={(quad, idx) => setDetailTarget({ q: quad, i: idx })}
                />
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
});

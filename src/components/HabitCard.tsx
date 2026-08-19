import { memo } from "react";
import { Check, ArrowRight } from "lucide-react";
import type { Habit, Quadrant } from "./types";

const QUADRANTS: Record<Quadrant, { title: string; sub: string }> = {
  q1: { title: "Do first", sub: "Urgent · Important" },
  q2: { title: "Schedule", sub: "Important · Not urgent" },
  q3: { title: "Delegate", sub: "Urgent · Low impact" },
  q4: { title: "Don't do", sub: "Low · Not urgent" },
};

interface HabitCardProps {
  habit: Habit & { done?: boolean; streak?: number };
  quadrant: Quadrant;
  index: number;
  onToggle: (q: Quadrant, i: number) => void;
  onOpenDetail: (q: Quadrant, i: number) => void;
}

export const HabitCard = memo(function HabitCard({
  habit,
  quadrant,
  index,
  onToggle,
  onOpenDetail,
}: HabitCardProps) {
  const isDone = habit.done ?? false;
  const streak = habit.streak ?? 0;

  return (
    <div
      className="animate-fade-in-up liquid-glass specular flex items-center p-3.5 rounded-2xl group cursor-pointer hover:border-[color:color-mix(in_srgb,var(--accent)_25%,transparent)] hover:shadow-[inset_0_1px_1px_color-mix(in_srgb,var(--accent)_30%,transparent),0_12px_28px_rgba(0,0,0,0.3)] transition-all duration-200 active:scale-[0.99]"
      style={{
        animationDelay: `${Math.min(index * 30, 240)}ms`,
        transform: "translateZ(0)",
      }}
      onClick={() => onOpenDetail(quadrant, index)}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(quadrant, index);
          }}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all duration-200 ${
            isDone
              ? "bg-ink border-ink text-on-ink shadow-[0_0_12px_color-mix(in_srgb,var(--ink)_40%,transparent)] animate-check-pop"
              : "border-[color:color-mix(in_srgb,var(--ink)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--canvas)_30%,transparent)] text-transparent hover:border-ink hover:scale-105 active:scale-95"
          }`}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold truncate ${
              isDone ? "line-through opacity-40 text-body" : "text-ink"
            }`}
          >
            {habit.name}
          </p>
          <p className="text-[10px] font-medium text-mute mt-0.5">
            {QUADRANTS[quadrant]?.title || quadrant} · {streak}d streak
          </p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-mute opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0" />
    </div>
  );
}, (prev, next) => {
  return (
    prev.habit.id === next.habit.id &&
    prev.habit.name === next.habit.name &&
    prev.habit.done === next.habit.done &&
    prev.habit.streak === next.habit.streak &&
    prev.quadrant === next.quadrant &&
    prev.index === next.index
  );
});

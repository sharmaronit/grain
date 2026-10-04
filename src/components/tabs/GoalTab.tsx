import { useState, memo } from "react";
import { Plus, Target, Trash2, CalendarDays, Star, PlayCircle, Pencil } from "lucide-react";
import type { GoalDoc } from "../../lib/firestore";
import { AddGoalSheet } from "../modals/AddGoalSheet";
import { useStore } from "../../store/useStore";
import { parseDateKey, todayKey } from "../../lib/dates";
import { DynamicIcon } from "../ui/DynamicIcon";
import { GrainState } from "../ui/GrainState";

interface GoalTabProps {
  goals: GoalDoc[];
  onDelete: (id: string) => void;
  onSetActiveGoal?: (id: string | null) => void;
}

export const GoalTab = memo(function GoalTab({ goals, onDelete, onSetActiveGoal }: GoalTabProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalDoc | null>(null);
  const activeGoalId = useStore((s) => s.activeGoalId);
  const setStoreActiveGoalId = useStore((s) => s.setActiveGoalId);

  const handleSetActiveGoal = (id: string | null) => {
    if (onSetActiveGoal) onSetActiveGoal(id);
    else setStoreActiveGoalId(id);
  };

  const activeGoal = goals.find((g) => g.id === activeGoalId);

  const calculateProgress = (g: GoalDoc) => {
    const start = parseDateKey(g.startDate).getTime();
    const target = parseDateKey(g.targetDate).getTime();
    const today = parseDateKey(todayKey()).getTime();

    if (target <= start) return { elapsed: 0, total: 1, percent: 0, daysLeft: 0 };

    const totalDays = Math.max(1, Math.round((target - start) / 86400000) + 1);
    let elapsedDays = Math.max(0, Math.round((today - start) / 86400000) + 1);

    // Clamp elapsed days
    if (elapsedDays < 0) elapsedDays = 0;
    if (elapsedDays > totalDays) elapsedDays = totalDays;

    const daysLeft = totalDays - elapsedDays;
    const percent = Math.round((elapsedDays / totalDays) * 100);

    return { elapsed: elapsedDays, total: totalDays, percent, daysLeft };
  };

  return (
    <>
      <div className="space-y-4 animate-tab-fade pt-16 pb-32 px-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-4xl font-black text-ink">Goals</h1>
        <p className="text-[12px] font-medium text-mute mt-1">Visualize your ultimate targets.</p>
      </div>

      {/* Active Goal Hero */}
      {activeGoal && (
        <div
          className="liquid-glass specular relative overflow-hidden rounded-[24px] p-6 mb-8"
          style={{ "--goal-color": activeGoal.color } as React.CSSProperties}
        >
          <div className="flex items-center justify-between mb-8">
            <DynamicIcon name={activeGoal.emoji} size={40} className="text-on-ink" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-mute">
                Active Goal
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-display text-xl font-bold text-ink truncate max-w-[150px]">
                  {activeGoal.name}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingGoal(activeGoal)}
                  className="settings-control inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-ink transition active:scale-95"
                  aria-label={`Edit ${activeGoal.name}`}
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
            </div>
          </div>

          {(() => {
            const { percent, daysLeft, total } = calculateProgress(activeGoal);
            return (
              <div className="flex flex-col items-center justify-center">
                <div className="liquid-glass relative mb-4 h-32 w-32 rounded-full p-1.5 shadow-lg">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-ink/10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="transparent"
                      stroke={activeGoal.color}
                      strokeWidth="8"
                      strokeDasharray={`${percent * 2.827} 282.7`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-3xl font-black tabular-nums">
                      {percent}%
                    </span>
                  </div>
                </div>

                <p className="font-display text-2xl font-black text-ink">{daysLeft} Days Left</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-mute mt-1">
                  Timeline elapsed · {total} total days
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {/* Goal List */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold text-ink">All Goals</h2>
      </div>

      <div className="flex flex-col gap-3">
        {goals.map((g) => {
          const { percent, daysLeft } = calculateProgress(g);
          const isActive = g.id === activeGoalId;

          return (
            <div
              key={g.id}
              className={`liquid-glass specular flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
                isActive
                  ? "bg-[color:color-mix(in_srgb,var(--canvas)_40%,transparent)]"
                  : "hover:bg-[color:color-mix(in_srgb,var(--canvas)_32%,transparent)]"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-4 pr-3">
                <div
                  className="h-12 w-12 shrink-0 rounded-full flex items-center justify-center shadow-inner text-ink"
                  style={{ backgroundColor: `${g.color}20` }} // 20 hex opacity
                >
                  <DynamicIcon name={g.emoji} size={20} className="opacity-90" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-lg font-bold text-ink">{g.name}</span>
                  <span className="text-[11px] font-semibold leading-4 text-mute">
                    {daysLeft} days left · {percent}% of timeline elapsed
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => handleSetActiveGoal(isActive ? null : g.id)}
                  aria-label={`${isActive ? "Deactivate" : "Activate"} ${g.name}`}
                  className={`grid w-10 h-10 place-items-center rounded-full border border-[color:color-mix(in_srgb,var(--accent)_15%,transparent)] shadow-[inset_0_1px_1px_color-mix(in_srgb,var(--accent)_18%,transparent),0_8px_24px_rgba(0,0,0,0.2)] transition ${
                    isActive
                      ? "bg-ink text-on-ink shadow-lg scale-105"
                      : "bg-[color:color-mix(in_srgb,var(--canvas)_40%,transparent)] text-mute hover:text-ink hover:bg-[color:color-mix(in_srgb,var(--canvas)_60%,transparent)]"
                  }`}
                >
                  <Star
                    className="w-4 h-4"
                    fill={isActive ? "currentColor" : "none"}
                    strokeWidth={isActive ? 2 : 2.5}
                  />
                </button>
                <button
                  aria-label={`Delete ${g.name}`}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Are you sure you want to delete this goal? This cannot be undone.",
                      )
                    ) {
                      onDelete(g.id);
                    }
                  }}
                  className="grid w-10 h-10 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--canvas)_40%,transparent)] border border-[color:color-mix(in_srgb,var(--accent)_12%,transparent)] shadow-[inset_0_1px_1px_color-mix(in_srgb,var(--accent)_15%,transparent),0_8px_24px_rgba(0,0,0,0.2)] text-mute hover:text-red-500 hover:bg-red-500/10 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <GrainState icon={Target} eyebrow="Goals" title="Give your days direction." description="Choose something worth showing up for. Build towards it one day at a time." action={{ label: "Create goal", onClick: () => setIsAdding(true) }} />
        )}
      </div>
      </div>

      <button
        onClick={() => setIsAdding(true)}
        className="liquid-fab floating-deck-aligned fixed bottom-[96px] z-30 mb-safe grid h-14 w-14 place-items-center rounded-full text-ink transition active:scale-95 hover:scale-105"
        aria-label="Add goal"
        title="Add goal"
      >
        <Plus className="h-6 w-6" strokeWidth={2.25} />
      </button>

      {isAdding && <AddGoalSheet onClose={() => setIsAdding(false)} />}
      {editingGoal && <AddGoalSheet goal={editingGoal} onClose={() => setEditingGoal(null)} />}
    </>
  );
});

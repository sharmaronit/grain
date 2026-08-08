import { useState, memo } from "react";
import { Plus, Target, Trash2, CalendarDays, Star, PlayCircle } from "lucide-react";
import type { GoalDoc } from "../../lib/firestore";
import { AddGoalSheet } from "../modals/AddGoalSheet";
import { useStore } from "../../store/useStore";
import { parseDateKey, todayKey } from "../../lib/dates";

interface GoalTabProps {
  goals: GoalDoc[];
  onDelete: (id: string) => void;
  onSetActiveGoal?: (id: string | null) => void;
}

export const GoalTab = memo(function GoalTab({ goals, onDelete, onSetActiveGoal }: GoalTabProps) {
  const [isAdding, setIsAdding] = useState(false);
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
    <div className="space-y-4 animate-tab-fade pt-16 pb-32 px-5 h-full overflow-y-auto">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-4xl font-black text-ink">Goals</h1>
        <p className="text-[12px] font-medium text-mute mt-1">Visualize your ultimate targets.</p>
      </div>

      {/* Active Goal Hero */}
      {activeGoal && (
        <div 
          className="relative overflow-hidden rounded-[24px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] p-6 mb-8"
          style={{ '--goal-color': activeGoal.color } as React.CSSProperties}
        >
          <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: activeGoal.color }} />
          
          <div className="flex items-center justify-between mb-8">
            <span className="text-4xl grayscale">{activeGoal.emoji}</span>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase tracking-widest text-mute">Active Goal</span>
              <span className="font-display text-xl font-bold text-ink truncate max-w-[200px]">{activeGoal.name}</span>
            </div>
          </div>
          
          {(() => {
            const { percent, daysLeft, total } = calculateProgress(activeGoal);
            return (
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="45" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-black/5" />
                    <circle 
                      cx="50" cy="50" r="45" fill="transparent" 
                      stroke={activeGoal.color} 
                      strokeWidth="8" 
                      strokeDasharray={`${percent * 2.827} 282.7`} 
                      strokeLinecap="round" 
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-3xl font-black tabular-nums">{percent}%</span>
                  </div>
                </div>
                
                <p className="font-display text-2xl font-black text-ink">{daysLeft} Days Left</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-mute mt-1">Out of {total} total days</p>
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
              className={`flex items-center justify-between p-4 rounded-2xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] transition-all ${
                isActive 
                  ? "bg-white/10 backdrop-blur-[32px]" 
                  : "bg-white/5 backdrop-blur-[16px] hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-inner grayscale"
                  style={{ backgroundColor: `${g.color}20` }} // 20 hex opacity
                >
                  {g.emoji}
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-lg font-bold text-ink">{g.name}</span>
                  <span className="text-[11px] font-semibold text-mute">
                    {daysLeft} days left · {percent}% done
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSetActiveGoal(isActive ? null : g.id)}
                  className={`grid w-10 h-10 place-items-center rounded-full border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] transition ${
                    isActive 
                      ? "bg-white/20 backdrop-blur-[40px] text-white" 
                      : "bg-white/5 backdrop-blur-[32px] text-mute hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Star className="w-4 h-4" fill={isActive ? "currentColor" : "none"} strokeWidth={isActive ? 2 : 2.5} />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this goal? This cannot be undone.")) {
                      onDelete(g.id);
                    }
                  }}
                  className="grid w-10 h-10 place-items-center rounded-full bg-white/5 backdrop-blur-[32px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] text-mute hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="text-center py-10 opacity-60">
            <Target className="w-10 h-10 mx-auto mb-3 text-mute" />
            <p className="text-[13px] font-medium text-ink">No goals yet.</p>
            <p className="text-[11px] font-semibold text-mute mt-1 max-w-[200px] mx-auto">Set a long term goal to see it visualized on your wallpaper.</p>
          </div>
        )}
      </div>

      <button
        onClick={() => setIsAdding(true)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 backdrop-blur-[32px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] py-4 text-[13px] font-bold text-ink border border-dashed border-[color:var(--hairline-strong)] hover:bg-[color:var(--surface-pressed)] transition"
      >
        <Plus className="h-5 w-5" /> Add Goal
      </button>

      {isAdding && <AddGoalSheet onClose={() => setIsAdding(false)} />}
    </div>
  );
});

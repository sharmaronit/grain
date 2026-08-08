import { useState, memo } from "react";
import { ChevronDown, Check } from "lucide-react";
import { InsightsCard } from "../InsightsCard";

const CATEGORIES = ["All habits", "Mind", "Health", "Growth", "Focus", "Fitness", "Admin"];

function Stat({ label, value, pulseKey }: { label: string; value: string; pulseKey?: number | string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div
        key={pulseKey ?? label}
        className="font-display text-3xl font-bold tabular-nums text-ink animate-pop-badge tracking-tight"
        style={{ textShadow: '0 0 16px var(--ink), 0 0 32px var(--ink)' }}
      >
        {value}
      </div>
      <div 
        className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ink font-bold opacity-90"
        style={{ textShadow: '0 0 8px var(--ink)' }}
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
  rate: number;
  weeklyInsights: any;
  showToast: (msg: string) => void;
}

export const ConsistencyTab = memo(function ConsistencyTab({
  selectedHabit,
  setSelectedHabit,
  doneCount,
  totalCount,
  totalStreak,
  rate,
  weeklyInsights,
}: ConsistencyTabProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  // Dynamic next milestone logic
  let nextMilestone = 3;
  if (totalStreak >= 3) nextMilestone = 7;
  if (totalStreak >= 7) nextMilestone = 14;
  if (totalStreak >= 14) nextMilestone = 30;
  if (totalStreak >= 30) nextMilestone = 100;
  if (totalStreak >= 100) nextMilestone = 365;
  if (totalStreak >= 365) nextMilestone = 1000;

  // The mountain climb journey is an array rendered from TOP (index 0) to BOTTOM
  const climb = [];

  // 1. The Summit (Future goal)
  climb.push({
      type: "summit",
      title: `${nextMilestone}-Day Peak`,
      desc: "The next summit on your journey.",
      isActive: false,
  });

  // 2. The Climber (Current state)
  climb.push({
      type: "climber",
      title: `Altitude: ${totalStreak} Days`,
      desc: totalStreak === 0 ? "You are at the base. Ready to climb?" : "You are here. Keep pushing upwards.",
      isActive: true,
  });

  // 3. Past Basecamps
  if (totalStreak >= 14) {
      climb.push({ type: "basecamp", title: "14-Day Ridge", desc: "A solid two weeks.", isActive: true });
  }
  if (totalStreak >= 7) {
      climb.push({ type: "basecamp", title: "7-Day Plateau", desc: "One week unbroken.", isActive: true });
  }
  if (totalStreak >= 3) {
      climb.push({ type: "basecamp", title: "3-Day Foothill", desc: "Momentum established.", isActive: true });
  }
  
  // 4. The Start
  climb.push({
      type: "start",
      title: "Basecamp",
      desc: "The journey begins.",
      isActive: true,
  });
  
  // Offsets for the rugged look (subtle footholds)
  const ruggedOffsets = [0, 16, -12, 20, -18, 8, -6];

  return (
    <div className="animate-tab-fade pt-16 pb-24 relative min-h-screen">
      <section className="px-5 relative z-10">
        
        {/* Header & Filter */}
        <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink tracking-tight">Ascent</h2>
              <p className="text-[13px] text-body mt-0.5">Your consistency journey</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white/5 backdrop-blur-[32px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_24px_rgba(0,0,0,0.3)] text-white rounded-lg font-medium hover:bg-white/10 transition"
              >
                <span className="max-w-[100px] truncate">{selectedHabit}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1A1A1A]/50 backdrop-blur-[40px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.3)] text-white animate-fade-in">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                         setSelectedHabit(c);
                         setFilterOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                        c === selectedHabit ? "bg-white/10 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] text-white font-bold" : "text-white/80 font-medium hover:bg-white/5"
                      }`}
                    >
                      {c}
                      {c === selectedHabit && <Check className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
        </div>

        {/* Minimalist Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-12">
            <Stat label="Today" value={`${doneCount}/${totalCount}`} pulseKey={doneCount} />
            <Stat label="Best" value={totalStreak > 0 ? `${totalStreak}d` : "—"} />
            <Stat label="Rate" value={`${rate}%`} pulseKey={rate} />
        </div>
        
        {/* The Mountain Climb UI */}
        <div className="relative py-4 mb-8 flex flex-col items-center">
            
            {/* Central Dotted Rope */}
            <div className="absolute left-1/2 top-8 bottom-8 w-px border-l-2 border-dotted border-[color:var(--hairline-mid)] opacity-60 -translate-x-1/2 z-0" />

            <div className="space-y-16 w-full max-w-sm">
                {climb.map((node, idx) => {
                    const isSummit = node.type === "summit";
                    const isClimber = node.type === "climber";
                    
                    // Calculate offsets based on rugged pattern
                    const xOffset = ruggedOffsets[idx % ruggedOffsets.length];
                    
                    return (
                        <div 
                          key={idx} 
                          className="relative z-10 flex flex-col items-center text-center animate-fade-in group"
                          style={{ 
                            animationDelay: `${idx * 150}ms`,
                            transform: `translateX(${xOffset}px)`,
                            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        >
                            
                            {/* Geometric Node */}
                            <div className="relative shrink-0 flex items-center justify-center h-8 w-8 transition-transform duration-700 group-hover:scale-125">
                                {/* Background mask to cut out the dotted rope */}
                                <div className="absolute inset-0 rounded-full bg-[color:var(--canvas)] scale-[0.7] -z-10" />
                                
                                {/* Shape */}
                                {isSummit && (
                                    <div className="h-[14px] w-[14px] rounded-full border-[1.5px] border-dashed border-[color:var(--hairline-mid)]" />
                                )}
                                {isClimber && (
                                    <div className="h-[14px] w-[14px] rounded-full bg-white/10 backdrop-blur-[40px] border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] shadow-[0_0_12px_var(--ink)]" />
                                )}
                                {!isSummit && !isClimber && (
                                    <div className="h-2 w-2 rounded-full bg-mute opacity-60" />
                                )}
                            </div>
                            
                            {/* Node Content */}
                            <div className={"mt-4 " + (isSummit ? 'opacity-50' : 'opacity-100')}>
                                <h3 className="font-display text-[17px] font-bold text-ink tracking-tight">{node.title}</h3>
                                <p className="text-[13px] text-body mt-1 max-w-[200px] leading-snug">{node.desc}</p>
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

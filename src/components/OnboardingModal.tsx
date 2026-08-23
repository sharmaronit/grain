import React, { useState } from "react";
import { Sparkles, Check, ArrowRight, ArrowLeft, Flame, Zap, Layers, Wallpaper, ShieldCheck, Compass, Target, Activity } from "lucide-react";
import { HABIT_PACKS, type HabitTemplate } from "../lib/templates";
import type { HabitDoc } from "../lib/firestore";

interface OnboardingModalProps {
  onClose: () => void;
  onAddHabits: (habits: Array<Omit<HabitDoc, "id" | "createdAt">>) => Promise<void>;
}

export function OnboardingModal({ onClose, onAddHabits }: OnboardingModalProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedPackId, setSelectedPackId] = useState<string>("mindfulness");
  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(() => {
    // Default select all habits from the first pack
    const firstPack = HABIT_PACKS[0];
    return new Set(firstPack.habits.map((h) => h.name));
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleHabit = (name: string) => {
    const next = new Set(selectedHabits);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedHabits(next);
  };

  const selectEntirePack = (packId: string) => {
    setSelectedPackId(packId);
    const pack = HABIT_PACKS.find((p) => p.id === packId);
    if (pack) {
      const next = new Set(selectedHabits);
      pack.habits.forEach((h) => next.add(h.name));
      setSelectedHabits(next);
    }
  };

  const handleFinish = async () => {
    try {
      setIsSubmitting(true);
      // Collect all selected habit definitions
      const allTemplates: HabitTemplate[] = [];
      HABIT_PACKS.forEach((pack) => {
        pack.habits.forEach((h) => {
          if (selectedHabits.has(h.name) && !allTemplates.some((t) => t.name === h.name)) {
            allTemplates.push(h);
          }
        });
      });

      const docsToCreate: Array<Omit<HabitDoc, "id" | "createdAt">> = allTemplates.map((t, idx) => ({
        name: t.name,
        category: t.category,
        quadrant: t.quadrant,
        time: t.time,
        type: t.type,
        target: t.target ?? null,
        unit: t.unit ?? null,
        step: t.type === "numeric" ? 1 : null,
        pinned: idx === 0,
        frequency: t.frequency,
        customDays: [],
        icon: 0,
        shade: 0,
        bestStreak: 0,
        order: idx,
      }));

      if (docsToCreate.length > 0) {
        await onAddHabits(docsToCreate);
      }

      localStorage.setItem("grain_onboarded", "true");
      onClose();
    } catch (e) {
      console.error("Failed to complete onboarding:", e);
      localStorage.setItem("grain_onboarded", "true");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in overflow-hidden">
      {/* Background Photographic Wallpaper */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src="/photo.jpg"
          alt=""
          className="w-full h-full object-cover opacity-40 grayscale scale-105"
          style={{
            objectPosition: "center top",
            filter: "grayscale(100%) contrast(1.1) brightness(0.75)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
      </div>

      <div className="liquid-glass specular relative z-10 w-full max-w-md overflow-hidden rounded-[32px] border border-[color:color-mix(in_srgb,var(--hairline)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--canvas)_88%,transparent)] p-6 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] font-black text-on-ink">
              {step + 1}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-mute">
              {step === 0 ? "Introduction" : step === 1 ? "Starter Habits" : "Navigation"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === i ? "w-6 bg-ink" : "w-2 bg-ink/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Slide Content */}
        <div className="flex-1 overflow-y-auto scrollbar-none pr-0.5">
          {step === 0 && (
            <div className="flex flex-col items-center text-center py-4 space-y-5 animate-fade-in-up">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[color:color-mix(in_srgb,var(--canvas-soft)_60%,transparent)] border border-[color:color-mix(in_srgb,var(--hairline)_60%,transparent)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.3)] text-ink">
                <Flame className="h-10 w-10" />
              </div>

              <div className="space-y-2">
                <h2 className="font-display text-2xl font-black text-ink tracking-tight">
                  Welcome to Grain
                </h2>
                <p className="text-xs text-body leading-relaxed max-w-xs mx-auto">
                  A minimal consistency engine designed to track your daily compounding habits without noise or distraction.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full text-left pt-2">
                <div className="p-3.5 rounded-2xl bg-[color:color-mix(in_srgb,var(--canvas-soft)_50%,transparent)] border border-[color:color-mix(in_srgb,var(--hairline)_50%,transparent)] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Zap className="h-3.5 w-3.5 text-ink" />
                    <span>Streak Heatmaps</span>
                  </div>
                  <p className="text-[10px] text-mute leading-normal">
                    52-week calendar tracking that keeps you accountable.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[color:color-mix(in_srgb,var(--canvas-soft)_50%,transparent)] border border-[color:color-mix(in_srgb,var(--hairline)_50%,transparent)] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Wallpaper className="h-3.5 w-3.5 text-ink" />
                    <span>Live Wallpaper</span>
                  </div>
                  <p className="text-[10px] text-mute leading-normal">
                    Sync your habit matrix directly to your lockscreen.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="space-y-1 text-center">
                <h3 className="font-display text-lg font-bold text-ink">
                  Select Starter Habits
                </h3>
                <p className="text-[11px] text-mute">
                  Pick curated routines to bootstrap your dashboard. Customize anytime.
                </p>
              </div>

              {/* Pack Selector Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {HABIT_PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => selectEntirePack(pack.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedPackId === pack.id
                        ? "bg-ink text-on-ink shadow-md scale-[1.02]"
                        : "bg-[color:color-mix(in_srgb,var(--canvas-soft)_60%,transparent)] border border-[color:color-mix(in_srgb,var(--hairline)_40%,transparent)] text-mute hover:text-ink"
                    }`}
                  >
                    <span>{pack.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>

              {/* Habit Checklist for selected pack */}
              <div className="space-y-2">
                {HABIT_PACKS.find((p) => p.id === selectedPackId)?.habits.map((h) => {
                  const isChecked = selectedHabits.has(h.name);
                  return (
                    <div
                      key={h.name}
                      onClick={() => toggleHabit(h.name)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-[color:color-mix(in_srgb,var(--canvas-softer)_70%,transparent)] border-[color:color-mix(in_srgb,var(--hairline)_80%,transparent)] shadow-sm"
                          : "bg-[color:color-mix(in_srgb,var(--canvas-soft)_30%,transparent)] border-[color:color-mix(in_srgb,var(--hairline)_30%,transparent)] opacity-60 hover:opacity-100"
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-ink truncate">{h.name}</p>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[color:color-mix(in_srgb,var(--ink)_10%,transparent)] text-mute">
                            {h.time ?? "anytime"}
                          </span>
                        </div>
                        <p className="text-[10px] text-mute mt-0.5">
                          {h.category} · {h.type === "numeric" ? `Target: ${h.target} ${h.unit}` : "Check-in"}
                        </p>
                      </div>

                      <div
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition-all ${
                          isChecked
                            ? "bg-ink text-on-ink border-transparent"
                            : "border-[color:var(--hairline)] bg-transparent"
                        }`}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center text-center py-4 space-y-5 animate-fade-in-up">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[color:color-mix(in_srgb,var(--canvas-soft)_60%,transparent)] border border-[color:color-mix(in_srgb,var(--hairline)_60%,transparent)] text-ink shadow-xl">
                <ShieldCheck className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold text-ink">
                  Ready to Begin
                </h3>
                <p className="text-xs text-body leading-relaxed max-w-xs mx-auto">
                  {selectedHabits.size} habits selected. Your dashboard is configured for fluid swipe navigation and daily tracking.
                </p>
              </div>

              <div className="w-full p-4 rounded-2xl bg-[color:color-mix(in_srgb,var(--canvas-soft)_50%,transparent)] border border-[color:color-mix(in_srgb,var(--hairline)_50%,transparent)] text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-ink">
                  <Layers className="h-4 w-4 text-ink" />
                  <span>Fluid Navigation</span>
                </div>
                <p className="text-[11px] text-mute leading-relaxed">
                  • <strong>Swipe horizontally</strong> anywhere on the screen to switch tabs.<br />
                  • Tap <strong>Focus Mode</strong> to enter distraction-free card review.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-[color:var(--hairline)] mt-4">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[color:var(--canvas-soft)] border border-[color:var(--hairline)] text-ink hover:bg-[color:var(--surface-pressed)] active:scale-95 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 0 | 1 | 2)}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-ink text-on-ink font-display text-xs font-bold uppercase tracking-wider shadow-lg active:scale-95 transition hover:opacity-90"
            >
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinish}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-ink text-on-ink font-display text-xs font-bold uppercase tracking-wider shadow-xl active:scale-95 transition hover:opacity-90 disabled:opacity-50"
            >
              <span>{isSubmitting ? "Setting Up..." : "Launch Dashboard"}</span>
              <Sparkles className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

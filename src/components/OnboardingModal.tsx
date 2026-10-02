import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Flame } from "lucide-react";
import { HABIT_PACKS, type HabitTemplate } from "../lib/templates";
import type { HabitDoc } from "../lib/firestore";

interface OnboardingModalProps {
  onClose: () => void;
  onAddHabits: (habits: Array<Omit<HabitDoc, "id" | "createdAt">>) => Promise<void>;
  storageKey: string;
}

export function OnboardingModal({ onClose, onAddHabits, storageKey }: OnboardingModalProps) {
  const firstPack = HABIT_PACKS[0];
  const [step, setStep] = useState<0 | 1>(0);
  const [selectedPackId, setSelectedPackId] = useState(firstPack.id);
  const [selectedHabit, setSelectedHabit] = useState<HabitTemplate>(firstPack.habits[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectPack = (packId: string) => {
    const pack = HABIT_PACKS.find((item) => item.id === packId);
    if (!pack) return;
    setSelectedPackId(packId);
    setSelectedHabit(pack.habits[0]);
  };

  const handleFinish = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onAddHabits([{
        name: selectedHabit.name,
        category: selectedHabit.category,
        quadrant: selectedHabit.quadrant,
        time: selectedHabit.time,
        type: selectedHabit.type,
        target: selectedHabit.target ?? null,
        unit: selectedHabit.unit ?? null,
        step: selectedHabit.type === "numeric" ? 1 : null,
        pinned: true,
        frequency: selectedHabit.frequency,
        customDays: [],
        icon: 0,
        shade: 0,
        bestStreak: 0,
        order: 0,
      }]);
      localStorage.setItem(storageKey, "true");
      onClose();
    } catch (reason) {
      console.error("Failed to complete onboarding:", reason);
      setError("Your first habit was not saved. Tap Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/60 p-4 backdrop-blur-2xl animate-fade-in">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="liquid-blob absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[color:color-mix(in_srgb,var(--ink)_20%,transparent)]" />
        <div className="liquid-blob absolute -bottom-24 -right-20 h-96 w-96 rounded-full bg-[color:color-mix(in_srgb,var(--ink)_14%,transparent)]" style={{ animationDelay: "-5s" }} />
      </div>

      <div className="liquid-glass sheet-glass specular relative z-10 flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-[32px] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-mute">First success</span>
          <div className="flex gap-1.5" aria-label={`Step ${step + 1} of 2`}>
            {[0, 1].map((item) => <span key={item} className={`h-1.5 rounded-full transition-all ${step === item ? "w-7 bg-ink" : "w-2 bg-ink/20"}`} />)}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none">
          {step === 0 ? (
            <div className="flex flex-col items-center py-5 text-center animate-fade-in-up">
              <div className="grid h-20 w-20 place-items-center rounded-[28px] border border-[color:var(--glass-border)] bg-[color:var(--glass-surface-strong)] text-ink shadow-xl">
                <Flame className="h-9 w-9" />
              </div>
              <h2 className="mt-6 font-display text-2xl font-black tracking-tight text-ink">Start with one habit</h2>
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-body">Choose one small action, complete it today, and watch your first consistency mark appear. More tools unlock after that first check-in.</p>
              <div className="mt-6 grid w-full grid-cols-3 gap-2 text-center">
                {["Choose one", "Complete it", "Build the pattern"].map((label, index) => (
                  <div key={label} className="rounded-2xl border border-[color:var(--hairline)] bg-[color:color-mix(in_srgb,var(--canvas-soft)_55%,transparent)] px-2 py-3">
                    <span className="mx-auto grid h-6 w-6 place-items-center rounded-full bg-ink text-[10px] font-bold text-on-ink">{index + 1}</span>
                    <p className="mt-2 text-[10px] font-semibold text-ink">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="animate-fade-in-up">
              <div className="text-center">
                <h2 className="font-display text-xl font-bold text-ink">Choose your first habit</h2>
                <p className="mt-1 text-[11px] text-mute">Keep it easy enough to finish today.</p>
              </div>
              <div className="mt-5 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {HABIT_PACKS.map((pack) => (
                  <button key={pack.id} type="button" onClick={() => selectPack(pack.id)} className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-bold transition ${selectedPackId === pack.id ? "bg-ink text-on-ink" : "border border-[color:var(--hairline)] bg-[color:var(--canvas-soft)] text-body"}`}>{pack.name.split(" ")[0]}</button>
                ))}
              </div>
              <div className="mt-2 space-y-2">
                {HABIT_PACKS.find((pack) => pack.id === selectedPackId)?.habits.map((habit) => {
                  const selected = selectedHabit.name === habit.name;
                  return (
                    <button key={habit.name} type="button" onClick={() => setSelectedHabit(habit)} className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition active:scale-[0.99] ${selected ? "border-[color:var(--glass-border)] bg-[color:var(--glass-surface-strong)]" : "border-[color:var(--hairline)] bg-[color:color-mix(in_srgb,var(--canvas-soft)_45%,transparent)]"}`}>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${selected ? "border-transparent bg-ink text-on-ink" : "border-[color:var(--hairline-mid)]"}`}>{selected && <Check className="h-3.5 w-3.5" />}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-ink">{habit.name}</span><span className="mt-0.5 block text-[10px] text-mute">{habit.category} · {habit.type === "numeric" ? `${habit.target} ${habit.unit}` : "Daily check-in"}</span></span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {error && <div role="alert" className="mt-3 rounded-xl border border-red-500/25 bg-red-500/8 px-3 py-2 text-center text-[11px] text-red-500">{error}</div>}
        <div className="mt-5 flex gap-3 border-t border-[color:var(--hairline)] pt-4">
          {step === 1 && <button type="button" onClick={() => setStep(0)} className="grid h-12 w-12 place-items-center rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--canvas-soft)] text-ink" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>}
          {step === 0 ? (
            <button type="button" onClick={() => setStep(1)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink text-xs font-bold uppercase tracking-wider text-on-ink"><span>Choose a habit</span><ArrowRight className="h-4 w-4" /></button>
          ) : (
            <button type="button" disabled={isSubmitting} onClick={handleFinish} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink text-xs font-bold uppercase tracking-wider text-on-ink disabled:opacity-50"><span>{isSubmitting ? "Saving…" : error ? "Try again" : "Add first habit"}</span><Check className="h-4 w-4" /></button>
          )}
        </div>
      </div>
    </div>
  );
}

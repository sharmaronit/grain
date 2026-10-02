import { useState } from "react";
import { SheetShell } from "../SheetShell";
import { Check } from "lucide-react";
import { useStore } from "../../store/useStore";
import { auth } from "../../lib/firebase";
import { addGoal, type GoalDoc } from "../../lib/firestore";
import { updateLocalGoal, updateLocalPrefs } from "../../lib/local-data";
import { todayKey } from "../../lib/dates";
import { CustomDatePicker } from "../CustomDatePicker";
import { DynamicIcon, ICONS } from "../ui/DynamicIcon";
const COLORS = [
  "#6FAF8A", // sage
  "#C77B86", // dusty rose
  "#D8A45D", // muted amber
  "#7396C8", // slate blue
  "#A58ACB", // lavender
];

export function AddGoalSheet({ onClose, goal }: { onClose: () => void; goal?: GoalDoc }) {
  const [name, setName] = useState(goal?.name ?? "");
  const [emoji, setEmoji] = useState(goal?.emoji ?? ICONS[0]);
  const [color, setColor] = useState(goal?.color ?? COLORS[0]);

  const [startDate, setStartDate] = useState(goal?.startDate ?? todayKey());
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const setActiveGoalId = useStore((s) => s.setActiveGoalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a goal name");
      return;
    }
    if (!targetDate) {
      setError("Please select a target date");
      return;
    }
    if (targetDate < startDate) {
      setError("Target date must be on or after the start date");
      return;
    }
    setError("");
    const user = auth().currentUser;
    const uid = user?.uid;
    if (!uid) {
      setError("User not authenticated");
      return;
    }

    setIsSubmitting(true);
    try {
      const goalValues = {
        name: name.trim(),
        emoji,
        color,
        startDate,
        targetDate,
      };
      if (goal) {
        updateLocalGoal(uid, goal.id, goalValues);
      } else {
        const id = await addGoal(uid, goalValues);
        setActiveGoalId(id);
        updateLocalPrefs(uid, { activeGoalId: id });
      }
      onClose();
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to create goal");
      setIsSubmitting(false);
    }
  };

  return (
    <SheetShell
      onClose={onClose}
      title={goal ? "Edit Goal" : "New Goal"}
      subtitle={
        goal
          ? "Refine the target you are growing toward"
          : "Set a target and visualize your progress"
      }
    >
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
        {/* Name Input */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-mute block mb-1.5">
            Goal Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            placeholder="e.g. Launch startup, Run marathon..."
            className="w-full rounded-2xl liquid-glass px-4 py-3 text-sm text-ink placeholder:text-mute outline-none focus:border-[color:var(--ink)]"
            autoFocus
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <CustomDatePicker label="Start Date" value={startDate} onChange={setStartDate} />
          <CustomDatePicker
            label="Target Date"
            value={targetDate}
            onChange={(val) => {
              setTargetDate(val);
              if (error) setError("");
            }}
          />
        </div>

        {/* Emoji Selection */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-mute mb-2 block">
            Icon
          </label>
          <div className="flex gap-3 overflow-x-auto px-1 py-2 scrollbar-none snap-x snap-mandatory">
            {ICONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`grid h-12 w-12 shrink-0 snap-center place-items-center rounded-2xl transition-all ${
                  emoji === e
                    ? "border border-[#86efac] bg-[#28513f] text-[#dcfce7] shadow-[0_0_18px_rgba(110,231,183,0.18)] scale-105"
                    : "liquid-glass text-ink hover:scale-105"
                }`}
              >
                <DynamicIcon
                  name={e}
                  size={20}
                  className={emoji === e ? "text-[#dcfce7]" : "text-ink opacity-70"}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Color Selection */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-mute mb-2 block">
            Grid Color
          </label>
          <div className="flex items-center gap-3">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className={`relative h-8 w-8 rounded-full border border-white/10 transition hover:scale-110 ${color === c ? "ring-2 ring-white/70 ring-offset-2 ring-offset-[color:var(--canvas)]" : ""}`}
                style={{ backgroundColor: c }}
              >
                {color === c && (
                  <Check
                    className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow"
                    strokeWidth={3}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-[12px] font-bold text-center mb-[-8px]">{error}</div>
        )}

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="liquid-glass mt-2 flex w-full items-center justify-center rounded-xl py-3 text-[14px] font-bold text-ink shadow-lg active:scale-[0.98] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : goal ? "Save Changes" : "Create Goal"}
        </button>
      </form>
    </SheetShell>
  );
}

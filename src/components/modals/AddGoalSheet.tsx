import { useState } from "react";
import { SheetShell } from "../SheetShell";
import { Check } from "lucide-react";
import { useStore } from "../../store/useStore";
import { db, auth } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { addGoal } from "../../lib/firestore";
import { todayKey } from "../../lib/dates";
import { CustomDatePicker } from "../CustomDatePicker";

const EMOJIS = ["🎯", "🚀", "💪", "📚", "✈️", "💰", "🏃", "🏆", "🧘", "🎨"];
const COLORS = [
  "#22c55e", // emerald
  "#dc2626", // crimson
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#8b5cf6", // purple
];

export function AddGoalSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0]);
  
  const [startDate, setStartDate] = useState(todayKey());
  const [targetDate, setTargetDate] = useState("");
  
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
    setError("");
    const user = auth().currentUser;
    const uid = user?.email ?? user?.uid;
    if (!uid) {
      setError("User not authenticated");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const id = await addGoal(uid, {
        name: name.trim(),
        emoji,
        color,
        startDate,
        targetDate,
      });
      setActiveGoalId(id);
      updateDoc(doc(db(), "users", uid), {
        "prefs.activeGoalId": id
      }).catch(e => console.error("Failed to sync active goal", e));
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to create goal");
      setIsSubmitting(false);
    }
  };

  return (
    <SheetShell onClose={onClose} title="New Goal" subtitle="Set a target and visualize your progress">
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
        
        {/* Name Input */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-mute block mb-1.5">Goal Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            placeholder="e.g. Launch startup, Run marathon..."
            className="w-full rounded-2xl liquid-input px-4 py-3 text-sm text-ink placeholder:text-mute outline-none focus:bg-[color:var(--canvas-softer)]"
            autoFocus
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <CustomDatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
          />
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
          <label className="text-[10px] font-bold uppercase tracking-widest text-mute mb-2 block">Icon</label>
          <div className="grid grid-cols-5 gap-2">
            {EMOJIS.map(e => (
              <button
                type="button"
                key={e}
                onClick={() => setEmoji(e)}
                className={`flex h-10 items-center justify-center rounded-xl text-xl transition grayscale ${
                  emoji === e ? "bg-ink ring-1 ring-ink" : "liquid-input opacity-60 hover:opacity-100 hover:bg-[color:var(--surface-pressed)]"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color Selection */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-mute mb-2 block">Grid Color</label>
          <div className="flex items-center gap-3">
            {COLORS.map(c => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className="relative h-8 w-8 rounded-full transition hover:scale-110"
                style={{ backgroundColor: c }}
              >
                {color === c && (
                  <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-[12px] font-bold text-center mb-[-8px]">
            {error}
          </div>
        )}

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex w-full items-center justify-center rounded-xl bg-ink/10 backdrop-blur-[40px] border border-ink/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] py-3 text-[14px] font-bold text-ink shadow-lg active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Create Goal"}
        </button>
      </form>
    </SheetShell>
  );
}

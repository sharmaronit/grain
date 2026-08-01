import { useState } from "react";
import { SheetShell } from "../SheetShell";
import type { Habit, Quadrant } from "../types";

const QUADRANTS: Record<Quadrant, { title: string; sub: string }> = {
  q1: { title: "Do first", sub: "Urgent · Important" },
  q2: { title: "Schedule", sub: "Important · Not urgent" },
  q3: { title: "Delegate", sub: "Urgent · Low impact" },
  q4: { title: "Don't do", sub: "Low · Not urgent" },
};
const QUADRANT_ORDER: Quadrant[] = ["q1", "q2", "q3", "q4"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-body">{label}</label>
      {children}
    </div>
  );
}

export function EditHabitSheet({
  habit,
  quadrant,
  onClose,
  onSave,
  onDelete,
}: {
  habit: Habit;
  quadrant: Quadrant;
  onClose: () => void;
  onSave: (patch: Partial<Habit>, newQ?: Quadrant) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(habit.name);
  const [category, setCategory] = useState(habit.category);
  const [q, setQ] = useState<Quadrant>(quadrant);
  const [time, setTime] = useState<Habit["time"] | undefined>(habit.time);
  const [isNumeric, setIsNumeric] = useState(habit.target !== undefined && habit.target !== null);
  const [target, setTarget] = useState<number>(habit.target ?? 1);
  const [unit, setUnit] = useState<string>(habit.unit ?? "");

  const CATS = ["Mind", "Health", "Growth", "Focus", "Fitness", "Admin"];
  const TIMES: Array<{ key: NonNullable<Habit["time"]> | "any"; label: string }> = [
    { key: "any", label: "Anytime" },
    { key: "morning", label: "Morning" },
    { key: "afternoon", label: "Afternoon" },
    { key: "evening", label: "Evening" },
  ];

  return (
    <SheetShell onClose={onClose} title="Edit habit" subtitle={habit.name}>
      <div className="space-y-4">
        <Field label="Habit name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
          />
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-1.5">
            {CATS.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`pill px-3 py-1.5 text-[11px] font-medium transition ${
                    active ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Priority quadrant">
          <div className="grid grid-cols-2 gap-2">
            {QUADRANT_ORDER.map((qq) => {
              const active = q === qq;
              return (
                <button
                  key={qq}
                  onClick={() => setQ(qq)}
                  className={`pill px-3 py-2.5 text-left text-xs font-medium transition ${
                    active ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                  }`}
                >
                  {QUADRANTS[qq].title}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Time of day">
          <div className="flex flex-wrap gap-1.5">
            {TIMES.map((t) => {
              const active = (time ?? "any") === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTime(t.key === "any" ? undefined : (t.key as NonNullable<Habit["time"]>))}
                  className={`pill px-3 py-1.5 text-[11px] font-medium transition ${
                    active ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Type">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsNumeric(false)}
              className={`pill px-3 py-2.5 text-xs font-medium transition ${!isNumeric ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"}`}
            >
              Binary
            </button>
            <button
              onClick={() => setIsNumeric(true)}
              className={`pill px-3 py-2.5 text-xs font-medium transition ${isNumeric ? "bg-ink text-on-ink" : "bg-canvas-soft text-ink"}`}
            >
              Numeric
            </button>
          </div>
        </Field>

        {isNumeric && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Target">
              <input
                type="number"
                value={target}
                min={0}
                step="0.25"
                onChange={(e) => setTarget(Number(e.target.value) || 0)}
                className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none focus:bg-[color:var(--canvas-softer)]"
              />
            </Field>
            <Field label="Unit">
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pages, min…"
                className="w-full rounded-2xl bg-canvas-soft px-4 py-3 text-sm text-ink outline-none placeholder:text-mute focus:bg-[color:var(--canvas-softer)]"
              />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            data-lg-press
            onClick={onDelete}
            className="pill w-full border border-red-500/30 bg-red-500/10 py-3 text-sm font-semibold text-red-500"
          >
            Delete
          </button>
          <button
            data-lg-press
            onClick={() => onSave({ name, category, time: time ?? null, target: isNumeric ? target : null, unit: isNumeric ? unit : null }, q)}
            className="btn-primary-uber w-full py-3 text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </SheetShell>
  );
}

import { z } from "zod";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
const timestamp = z.union([z.string(), z.date()]).refine((value) => Number.isFinite(new Date(value).getTime()));
const record = z.record(z.unknown());
const schema = z.object({
  version: z.literal(1),
  habits: z.array(z.object({
    id: z.string().min(1), name: z.string().trim().min(1),
    quadrant: z.enum(["q1", "q2", "q3", "q4"]),
    type: z.enum(["binary", "numeric"]), frequency: z.enum(["daily", "weekdays", "custom"]),
    customDays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
    target: z.number().finite().positive().nullable().optional(),
    step: z.number().finite().positive().nullable().optional(),
    createdAt: timestamp,
  }).passthrough().refine(h => h.type !== "numeric" || (h.target != null && h.target > 0))),
  goals: z.array(z.object({ id: z.string().min(1), name: z.string().trim().min(1), startDate: dateKey, targetDate: dateKey, createdAt: timestamp }).passthrough().refine(g => g.targetDate >= g.startDate)),
  completions: z.record(dateKey, z.record(z.object({
    done: z.boolean(), value: z.number().finite().nonnegative().nullable(),
    note: z.string(), restDay: z.boolean(), frozenStreak: z.boolean(),
    completedAt: timestamp.nullable(), skipped: z.boolean().optional(),
  }).passthrough())),
  profile: record.optional(), prefs: record.optional(), updatedAt: timestamp.optional(),
}).passthrough().refine(data => new Set(data.habits.map(h => h.id)).size === data.habits.length && new Set(data.goals.map(g => g.id)).size === data.goals.length);

export function validateBackup(value: unknown): void {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error("This backup is damaged or uses an unsupported format. Your current data has not changed.", { cause: result.error });
}

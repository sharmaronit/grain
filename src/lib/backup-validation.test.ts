import { describe, expect, it } from "vitest";
import { validateBackup } from "./backup-validation";

const backup = { version: 1, habits: [{ id: "h", name: "Study", quadrant: "q1", type: "binary", frequency: "daily", createdAt: "2026-10-04T00:00:00Z" }], goals: [], completions: {} };
describe("backup validation", () => {
  it("accepts a valid export", () => expect(() => validateBackup(backup)).not.toThrow());
  it.each([null, { ...backup, version: 2 }, { ...backup, habits: [null] }, { ...backup, completions: null }, { ...backup, habits: [...backup.habits, ...backup.habits] }, { ...backup, completions: { "2026-02-30": {} } }, { ...backup, habits: [{ ...backup.habits[0], type: "numeric", target: 0 }] }])("rejects malformed data before import", value => expect(() => validateBackup(value)).toThrow(/has not changed/));
});

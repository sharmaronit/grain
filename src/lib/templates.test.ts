import { describe, it, expect } from "vitest";
import { HABIT_PACKS } from "./templates";

describe("starter habit templates", () => {
  it("contains curated template packs", () => {
    expect(HABIT_PACKS.length).toBeGreaterThanOrEqual(3);
    const ids = HABIT_PACKS.map((p) => p.id);
    expect(ids).toContain("mindfulness");
    expect(ids).toContain("deep_work");
    expect(ids).toContain("fitness");
  });

  it("each pack contains valid habit definitions", () => {
    for (const pack of HABIT_PACKS) {
      expect(pack.name).toBeTruthy();
      expect(pack.habits.length).toBeGreaterThan(0);
      for (const h of pack.habits) {
        expect(h.name).toBeTruthy();
        expect(["Mind", "Health", "Growth", "Focus", "Fitness", "Admin"]).toContain(h.category);
        expect(["q1", "q2", "q3", "q4"]).toContain(h.quadrant);
        expect(["binary", "numeric"]).toContain(h.type);
        if (h.type === "numeric") {
          expect(h.target).toBeGreaterThan(0);
          expect(h.unit).toBeTruthy();
        }
      }
    }
  });
});

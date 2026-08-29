import { describe, it, expect } from "vitest";
import { computeMilestones } from "./badges";

describe("badges milestone computation", () => {
  it("returns all badges locked for 0 streak", () => {
    const badges = computeMilestones(0, 0);
    expect(badges.length).toBe(4);
    expect(badges.every((b) => !b.unlocked)).toBe(true);
  });

  it("unlocks 7-day milestone at streak 7", () => {
    const badges = computeMilestones(7, 0);
    const m7 = badges.find((b) => b.id === "m7");
    const m21 = badges.find((b) => b.id === "m21");
    expect(m7?.unlocked).toBe(true);
    expect(m21?.unlocked).toBe(false);
  });

  it("unlocks 21-day milestone at streak 21", () => {
    const badges = computeMilestones(21, 21);
    const m7 = badges.find((b) => b.id === "m7");
    const m21 = badges.find((b) => b.id === "m21");
    const m30 = badges.find((b) => b.id === "m30");
    expect(m7?.unlocked).toBe(true);
    expect(m21?.unlocked).toBe(true);
    expect(m30?.unlocked).toBe(false);
  });

  it("unlocks all milestones at streak 100+", () => {
    const badges = computeMilestones(100, 150);
    expect(badges.every((b) => b.unlocked)).toBe(true);
  });

  it("uses bestStreak if higher than currentStreak", () => {
    // Current streak broke to 1, but best streak was 35
    const badges = computeMilestones(1, 35);
    const m30 = badges.find((b) => b.id === "m30");
    const m100 = badges.find((b) => b.id === "m100");
    expect(m30?.unlocked).toBe(true);
    expect(m100?.unlocked).toBe(false);
  });
});

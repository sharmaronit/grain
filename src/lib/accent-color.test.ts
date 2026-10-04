import { describe, expect, it } from "vitest";
import { hexToHsv, hsvToHex, normalizeHex } from "./accent-color";

describe("custom accent colors", () => {
  it("preserves color through HSV editing, including neutral endpoints", () => {
    for (const color of ["#22c55e", "#dc2626", "#f59e0b", "#000000", "#ffffff", "#737373", "#8080ff"]) {
      expect(hsvToHex(hexToHsv(color))).toBe(color);
    }
  });
  it("accepts short hex codes and rejects incomplete or invalid colors", () => {
    expect(normalizeHex(" F0A ")).toBe("#ff00aa");
    expect(normalizeHex("#22C55E")).toBe("#22c55e");
    for (const value of ["#12", "#12345g", "transparent", ""]) expect(normalizeHex(value)).toBeNull();
  });
});

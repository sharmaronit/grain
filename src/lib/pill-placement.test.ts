import { describe, expect, it } from "vitest";
import {
  DEFAULT_PILL_PREFERENCES as prefs,
  normalizePillPreferences,
  resolvePillPlacement,
  type DisplayGeometry,
} from "./pill-placement";

const geometry = (cutouts: DisplayGeometry["cutouts"], width = 390): DisplayGeometry => ({
  available: true,
  width,
  height: 844,
  statusBarTop: 40,
  cutouts,
});
describe("Grain pill placement", () => {
  it("reserves a centered camera and keeps its copy below the cutout", () => {
    const result = resolvePillPlacement(
      390,
      844,
      0,
      geometry([{ left: 182, top: 10, right: 208, bottom: 36 }]),
      prefs,
    );
    expect(result.camera).not.toBeNull();
    expect(result.top + result.cameraBottom).toBe(36);
    expect(result.collapsedWidth).toBeGreaterThan(26);
    expect(result.expandedHeight).toBeGreaterThan(result.cameraBottom + 28);
  });
  it.each([
    [{ left: 10, top: 10, right: 36, bottom: 36 }],
    [{ left: 100, top: 0, right: 290, bottom: 42 }],
    [
      { left: 162, top: 10, right: 188, bottom: 36 },
      { left: 202, top: 10, right: 228, bottom: 36 },
    ],
  ])(
    "uses a safe centered fallback for corners, wide notches, and multiple cutouts",
    (...cutouts) => {
      const result = resolvePillPlacement(390, 844, 0, geometry(cutouts), prefs);
      expect(result.camera).toBeNull();
      expect(result.top).toBeGreaterThanOrEqual(48);
      expect(result.centerX).toBe(195);
    },
  );
  it("converts physical WebView pixels into CSS pixels", () => {
    const result = resolvePillPlacement(
      390,
      844,
      0,
      geometry([{ left: 546, top: 30, right: 624, bottom: 108 }], 1170),
      prefs,
    );
    expect(result.camera).toEqual({ left: 182, top: 10, right: 208, bottom: 36 });
  });
  it("handles a reported cutout that reaches the top edge", () => {
    const result = resolvePillPlacement(
      390,
      844,
      0,
      geometry([{ left: 182, top: 0, right: 208, bottom: 36 }]),
      prefs,
    );
    expect(result.camera).not.toBeNull();
    expect(result.top).toBe(0);
  });
  it("moves below the camera when manual calibration breaks camera clearance", () => {
    const result = resolvePillPlacement(
      390,
      844,
      0,
      geometry([{ left: 182, top: 10, right: 208, bottom: 36 }]),
      { ...prefs, manual: true, offsetY: 16 },
    );
    expect(result.camera).toBeNull();
    expect(result.top).toBeGreaterThanOrEqual(48);
  });
  it("keeps a manually positioned expanded pill on screen", () => {
    const result = resolvePillPlacement(320, 600, 24, null, {
      ...prefs,
      manual: true,
      offsetX: 120,
      offsetY: 120,
      scale: 1.25,
    });
    expect(result.centerX + result.maxWidth / 2).toBeLessThanOrEqual(304);
    expect(result.top + result.expandedHeight).toBeLessThan(600);
  });
  it("ignores manual offsets in automatic mode", () => {
    expect(
      resolvePillPlacement(390, 844, 0, null, {
        ...prefs,
        manual: false,
        offsetX: 120,
        offsetY: 120,
        scale: 1.25,
      }),
    ).toEqual(resolvePillPlacement(390, 844, 0, null, prefs));
  });
  it("does not surround a camera in landscape", () => {
    expect(
      resolvePillPlacement(
        844,
        390,
        0,
        geometry([{ left: 410, top: 10, right: 436, bottom: 36 }], 844),
        prefs,
      ).camera,
    ).toBeNull();
  });
  it("rejects corrupt stored preferences", () => {
    expect(normalizePillPreferences({ offsetX: NaN, offsetY: Infinity, scale: -4 })).toEqual({
      ...prefs,
      scale: 0.8,
    });
  });
  it("keeps existing installs enabled while preserving an explicit opt-out", () => {
    expect(normalizePillPreferences({ manual: true }).enabled).toBe(true);
    expect(normalizePillPreferences({ enabled: false, offsetX: 24 }).enabled).toBe(false);
  });
});

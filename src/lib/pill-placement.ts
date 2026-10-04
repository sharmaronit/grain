export interface CutoutBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface DisplayGeometry {
  available: boolean;
  width: number;
  height: number;
  statusBarTop: number;
  cutouts: CutoutBounds[];
}

export interface PillPreferences {
  enabled: boolean;
  manual: boolean;
  offsetX: number;
  offsetY: number;
  scale: number;
}

export const DEFAULT_PILL_PREFERENCES: PillPreferences = {
  enabled: true,
  manual: false,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function normalizePillPreferences(value: Partial<PillPreferences>): PillPreferences {
  const number = (candidate: unknown, fallback: number) =>
    typeof candidate === "number" && Number.isFinite(candidate) ? candidate : fallback;
  return {
    enabled: value.enabled !== false,
    manual: value.manual === true,
    offsetX: clamp(number(value.offsetX, 0), -120, 120),
    offsetY: clamp(number(value.offsetY, 0), -32, 120),
    scale: clamp(number(value.scale, 1), 0.8, 1.25),
  };
}

export function resolvePillPlacement(
  width: number,
  height: number,
  safeTop: number,
  geometry: DisplayGeometry | null,
  preferences: PillPreferences,
) {
  // The native coordinates are relative to the WebView, not the full display.
  const ratio = geometry?.available && geometry.width > 0 ? width / geometry.width : 1;
  const topCutouts = (geometry?.available ? geometry.cutouts : [])
    .map((rect) => ({
      left: rect.left * ratio,
      top: rect.top * ratio,
      right: rect.right * ratio,
      bottom: rect.bottom * ratio,
    }))
    .filter((rect) => rect.right > rect.left && rect.bottom > 0 && rect.top < 64);
  const statusTop = Math.max(safeTop, geometry?.available ? geometry.statusBarTop * ratio : 0);
  const camera =
    topCutouts.length === 1 &&
    width < height &&
    topCutouts[0].right - topCutouts[0].left <= 80 &&
    topCutouts[0].bottom - topCutouts[0].top <= 60 &&
    Math.abs((topCutouts[0].left + topCutouts[0].right) / 2 - width / 2) <= width * 0.15
      ? topCutouts[0]
      : null;
  const scale = preferences.manual ? preferences.scale : 1;
  // Leave room for the profile button, even at small screen widths.
  const maxWidth = Math.max(120, Math.min(340, width - 120));
  const cameraWidth = camera ? camera.right - camera.left : 0;
  const collapsedWidth = Math.min(maxWidth, (camera ? cameraWidth + 80 : 44) * scale);
  let top = camera
    ? Math.max(0, camera.top - 4)
    : Math.max(16, statusTop + 8, ...topCutouts.map((rect) => rect.bottom + 8));
  let centerX = camera ? (camera.left + camera.right) / 2 : width / 2;
  if (preferences.manual) {
    centerX += preferences.offsetX;
    top += preferences.offsetY;
  }
  centerX = clamp(centerX, maxWidth / 2 + 16, width - maxWidth / 2 - 16);
  top = clamp(top, camera ? 0 : 4, Math.max(4, height - 120));
  const collapsedHeight = Math.max(36 * scale, camera ? camera.bottom - top + 6 : 0);
  const surroundsCamera =
    camera &&
    top <= camera.top &&
    top + collapsedHeight >= camera.bottom &&
    camera.left >= centerX - collapsedWidth / 2 + 32 &&
    camera.right <= centerX + collapsedWidth / 2 - 6;
  const cameraBottom = surroundsCamera ? camera.bottom - top : 0;
  if (camera && !surroundsCamera) top = Math.max(top, statusTop + 8, camera.bottom + 8);
  return {
    centerX,
    top,
    maxWidth,
    scale,
    collapsedWidth: surroundsCamera ? collapsedWidth : Math.min(maxWidth, 44 * scale),
    collapsedHeight: surroundsCamera ? collapsedHeight : 36 * scale,
    camera: surroundsCamera ? camera : null,
    cameraBottom,
    expandedHeight: surroundsCamera ? cameraBottom + 48 * scale : 52 * scale,
    logoCameraOffset: surroundsCamera ? camera.left - centerX - 18 * scale : 0,
  };
}

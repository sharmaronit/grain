import { useEffect, useRef } from "react";
import { WallpaperNative } from "../lib/wallpaper-bridge";
import { Capacitor } from "@capacitor/core";
import equal from "fast-deep-equal";

export interface UseWallpaperSyncProps {
  heatmap: number[][];
  totalStreak: number;
  completionRate: number;
  wallpaperTheme: string;
  previewWeeks: number;
  wallpaperSync: boolean;
  isGoalActive?: boolean;
  accentColor?: string;
  gridStyle?: "weeks" | "year" | "month" | "goals" | "widget";
  customPhotoBase64?: string | null;
  photoOverlay?: number;
  statsAlignment?: "left" | "center" | "right";
  offsetY?: number;
  offsetX?: number;
  gridScale?: number;
  gridColorTheme?: string;
  photoOffsetX?: number;
  photoOffsetY?: number;
  photoScale?: number;
  heatmapStartMs: number;
  stackedGoals?: {
    id: string;
    title: string;
    heatmap: number[][];
    currentStreak: number;
    completionRate: number;
  }[];
  habitText?: string[];
}

/**
 * Auto-syncs heatmap data to the native Android wallpaper service whenever
 * habit data changes. Debounced at 500ms. Only runs on native platforms
 * and only when the user has enabled wallpaper sync.
 */
export function useWallpaperSync({
  heatmap,
  heatmapStartMs,
  totalStreak,
  completionRate,
  wallpaperTheme,
  previewWeeks,
  wallpaperSync,
  isGoalActive,
  accentColor,
  gridStyle,
  customPhotoBase64,
  photoOverlay,
  statsAlignment,
  offsetY,
  offsetX,
  gridScale,
  gridColorTheme,
  photoOffsetX,
  photoOffsetY,
  photoScale,
  stackedGoals,
  habitText,
}: UseWallpaperSyncProps) {
  const syncTimeout = useRef<number | null>(null);
  const lastPayload = useRef<any>(null);
  const lastSentPhoto = useRef<string | null>(null);

  useEffect(() => {
    // Only run on native Android and only if the user hasn't paused sync
    if (!Capacitor.isNativePlatform() || !wallpaperSync) return;

    const photoChanged = customPhotoBase64 !== lastSentPhoto.current;
    if (photoChanged && customPhotoBase64) {
      lastSentPhoto.current = customPhotoBase64;
    }

    const payload = {
      heatmap,
      heatmapStartMs,
      theme: wallpaperTheme,
      previewWeeks,
      currentStreak: totalStreak,
      completionRate,
      isGoalActive,
      accentColor,
      gridStyle,
      // Only transmit the heavy base64 payload when it has actually changed
      customPhotoBase64: photoChanged ? customPhotoBase64 : undefined,
      photoOverlay,
      statsAlignment,
      offsetY,
      offsetX,
      gridScale,
      gridColorTheme,
      photoOffsetX,
      photoOffsetY,
      photoScale,
      stackedGoals,
      habitText,
    };

    if (equal(payload, lastPayload.current)) {
      return;
    }
    lastPayload.current = payload;

    if (syncTimeout.current !== null) {
      window.clearTimeout(syncTimeout.current);
    }

    // Debounce to avoid flooding the bridge when multiple state updates happen
    syncTimeout.current = window.setTimeout(() => {
      WallpaperNative.syncWallpaperData(payload).catch((e) => console.warn("Live wallpaper sync error:", e));
    }, 500);

    return () => {
      if (syncTimeout.current !== null) {
        window.clearTimeout(syncTimeout.current);
      }
    };
  }, [
    heatmap,
    heatmapStartMs,
    totalStreak,
    completionRate,
    wallpaperTheme,
    previewWeeks,
    wallpaperSync,
    isGoalActive,
    gridStyle,
    customPhotoBase64,
    photoOverlay,
    statsAlignment,
    accentColor,
    offsetY,
    offsetX,
    gridScale,
    gridColorTheme,
    photoOffsetX,
    photoOffsetY,
    photoScale,
    stackedGoals,
    habitText,
  ]);
}


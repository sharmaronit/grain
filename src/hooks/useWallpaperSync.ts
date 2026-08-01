import { useEffect, useRef } from "react";
import { WallpaperNative } from "../lib/wallpaper-bridge";
import { Capacitor } from "@capacitor/core";

interface UseWallpaperSyncProps {
  heatmap: number[][];
  totalStreak: number;
  completionRate: number;
  wallpaperTheme: string;
  previewWeeks: number;
  wallpaperSync: boolean;
}

/**
 * Auto-syncs heatmap data to the native Android wallpaper service whenever
 * habit data changes. Debounced at 500ms. Only runs on native platforms
 * and only when the user has enabled wallpaper sync.
 */
export function useWallpaperSync({
  heatmap,
  totalStreak,
  completionRate,
  wallpaperTheme,
  previewWeeks,
  wallpaperSync,
}: UseWallpaperSyncProps) {
  const syncTimeout = useRef<number | null>(null);

  useEffect(() => {
    // Only run on native Android and only if the user hasn't paused sync
    if (!Capacitor.isNativePlatform() || !wallpaperSync) return;

    if (syncTimeout.current !== null) {
      window.clearTimeout(syncTimeout.current);
    }

    // Debounce to avoid flooding the bridge when multiple state updates happen
    syncTimeout.current = window.setTimeout(() => {
      WallpaperNative.syncWallpaperData({
        heatmap,
        theme: wallpaperTheme,
        previewWeeks,
        currentStreak: totalStreak,
        completionRate,
      }).catch((err: unknown) => {
        console.warn("Failed to sync wallpaper data", err);
      });
    }, 500);

    return () => {
      if (syncTimeout.current !== null) {
        window.clearTimeout(syncTimeout.current);
      }
    };
  }, [heatmap, totalStreak, completionRate, wallpaperTheme, previewWeeks, wallpaperSync]);
}

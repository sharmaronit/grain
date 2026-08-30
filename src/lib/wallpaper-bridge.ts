import { Capacitor, registerPlugin } from '@capacitor/core';

export interface WallpaperData {
  heatmap: number[][];
  heatmapStartMs?: number;
  theme: string;
  previewWeeks: number;
  currentStreak: number;
  completionRate: number;
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
  screenTarget?: string;
  stackedGoals?: {
    id: string;
    title: string;
    heatmap: number[][];
    boxes?: number[];
    currentStreak: number;
    completionRate: number;
  }[];
  habitText?: string[];
}

export interface WallpaperPluginDef {
  syncWallpaperData(opts: WallpaperData): Promise<{ success: boolean }>;
  setWallpaper(opts: WallpaperData): Promise<{ success: boolean }>;
  setStaticWallpaper(opts: WallpaperData): Promise<{ success: boolean }>;
  isLiveWallpaperSupported(): Promise<{ supported: boolean }>;
  updateWidget(): Promise<{ success: boolean }>;
}

// Bug 12 fix: Lazy-initialize the plugin to avoid crashing during SSR or
// Vite module graph analysis when Capacitor isn't available yet.
const webStub: WallpaperPluginDef = {
  syncWallpaperData: async () => ({ success: false }),
  setWallpaper: async () => ({ success: false }),
  setStaticWallpaper: async () => ({ success: false }),
  isLiveWallpaperSupported: async () => ({ supported: false }),
  updateWidget: async () => ({ success: false }),
};

let _instance: WallpaperPluginDef | null = null;

/**
 * Get the Wallpaper plugin instance. Uses lazy initialization so the
 * module can be safely imported during SSR without crashing.
 */
export function getWallpaperPlugin(): WallpaperPluginDef {
  if (_instance) return _instance;
  try {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      _instance = registerPlugin<WallpaperPluginDef>('Wallpaper');
    } else {
      _instance = webStub;
    }
  } catch {
    _instance = webStub;
  }
  return _instance;
}

// Also export a convenience alias that matches the old import pattern.
// Bug 9 fix: Named "WallpaperNative" to avoid collision with lucide-react's
// Wallpaper icon.
export const WallpaperNative = new Proxy({} as WallpaperPluginDef, {
  get(_target, prop) {
    return (getWallpaperPlugin() as any)[prop];
  },
});

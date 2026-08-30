import { Preferences } from '@capacitor/preferences';

export interface WidgetData {
  completed: number;
  total: number;
  streak: number;
  lastUpdated: number;
}

export const WidgetBridge = {
  async sync(data: Omit<WidgetData, "lastUpdated">) {
    if (typeof window === "undefined") return;

    try {
      const widgetData: WidgetData = {
        ...data,
        lastUpdated: Date.now(),
      };

      await Preferences.set({
        key: 'widget_data',
        value: JSON.stringify(widgetData),
      });

      try {
        if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform()) {
          const { WallpaperNative } = await import('./wallpaper-bridge');
          await WallpaperNative.updateWidget();
        }
      } catch (e) {
        console.warn("Failed to update widget UI:", e);
      }
    } catch (e) {
      console.warn("Failed to sync widget data:", e);
    }
  }
};

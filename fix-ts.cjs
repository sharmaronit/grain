const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix imports
content = content.replace(
  'import { Wallpaper } from "../lib/wallpaper-bridge";',
  'import { Wallpaper as WallpaperBridge } from "../lib/wallpaper-bridge";'
);

// 2. Move useWallpaperSync down
const hookBlock = `  // ── Sync to Live Wallpaper ────────────────────────────
  useWallpaperSync({
    heatmap,
    totalStreak,
    completionRate: rate,
    wallpaperTheme,
    previewWeeks,
    wallpaperSync,
  });\n\n`;

content = content.replace(hookBlock, '');

// Insert it before applyWallpaper
content = content.replace(
  '  const applyWallpaper = async () => {',
  hookBlock + '  const applyWallpaper = async () => {'
);

// 3. Fix applyWallpaper
const badApply = `      if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform()) {
        const { Wallpaper } = await import("@capacitor/core");
        const { supported } = await (Wallpaper as any).isLiveWallpaperSupported();
        if (supported) {
          await (Wallpaper as any).setWallpaper({
            heatmap,
            theme: wallpaperTheme,
            previewWeeks,
            currentStreak: totalStreak,
            completionRate: rate,
          });
          showToast("Live wallpaper applied!", undefined, 4000);
        } else {
          await (Wallpaper as any).setStaticWallpaper({
            heatmap,
            theme: wallpaperTheme,
            previewWeeks,
            currentStreak: totalStreak,
            completionRate: rate,
          });
          showToast("Static wallpaper applied!", undefined, 4000);
        }
      } else {`;

const goodApply = `      if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform()) {
        const { supported } = await WallpaperBridge.isLiveWallpaperSupported();
        if (supported) {
          await WallpaperBridge.setWallpaper({
            heatmap,
            theme: wallpaperTheme,
            previewWeeks,
            currentStreak: totalStreak,
            completionRate: rate,
          });
          showToast("Live wallpaper applied!", undefined, 4000);
        } else {
          await WallpaperBridge.setStaticWallpaper({
            heatmap,
            theme: wallpaperTheme,
            previewWeeks,
            currentStreak: totalStreak,
            completionRate: rate,
          });
          showToast("Static wallpaper applied!", undefined, 4000);
        }
      } else {`;

content = content.replace(badApply, goodApply);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed index.tsx typescript errors');

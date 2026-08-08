const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The fuzzy matcher produced this bad block:
const badBlock = `      if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform()) {
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
        }`;

const goodBlock = `      if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform()) {
        const { supported } = await Wallpaper.isLiveWallpaperSupported();
        if (supported) {
          await Wallpaper.setWallpaper({
            heatmap,
            theme: wallpaperTheme,
            previewWeeks,
            currentStreak: totalStreak,
            completionRate: rate,
          });
          showToast("Live wallpaper applied!", undefined, 4000);
        } else {
          // Native fallback to static wallpaper if live is not supported
          await Wallpaper.setStaticWallpaper({
            heatmap,
            theme: wallpaperTheme,
            previewWeeks,
            currentStreak: totalStreak,
            completionRate: rate,
          });
          showToast("Static wallpaper applied!", undefined, 4000);
        }`;

content = content.replace(badBlock, goodBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed applyWallpaper in index.tsx');

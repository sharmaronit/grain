const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /const \{ Wallpaper \} = await import\("@capacitor\/core"\);\s*const \{ supported \} = await \(Wallpaper as any\).isLiveWallpaperSupported\(\);\s*if \(supported\) \{\s*await \(Wallpaper as any\).setWallpaper\(\{\s*heatmap,\s*theme: wallpaperTheme,\s*previewWeeks,\s*currentStreak: totalStreak,\s*completionRate: rate,\s*\}\);\s*showToast\("Live wallpaper applied!", undefined, 4000\);\s*\} else \{\s*await \(Wallpaper as any\).setStaticWallpaper\(\{\s*heatmap,\s*theme: wallpaperTheme,\s*previewWeeks,\s*currentStreak: totalStreak,\s*completionRate: rate,\s*\}\);\s*showToast\("Static wallpaper applied!", undefined, 4000\);\s*\}/g;

const replacement = `const { supported } = await WallpaperBridge.isLiveWallpaperSupported();
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
        }`;

content = content.replace(regex, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed applyWallpaper dynamically.');

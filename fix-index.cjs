const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix the import
content = content.replace(
  'import { Wallpaper } from "../lib/wallpaper-bridge";',
  'import { WallpaperNative } from "../lib/wallpaper-bridge";'
);
content = content.replace(
  'import { Wallpaper as WallpaperBridge } from "../lib/wallpaper-bridge";',
  'import { WallpaperNative } from "../lib/wallpaper-bridge";'
);

// 2. Replace all Wallpaper references to WallpaperNative in applyWallpaper
content = content.replace(/WallpaperBridge\./g, 'WallpaperNative.');
content = content.replace(/await \(Wallpaper as any\)\./g, 'await WallpaperNative.');

// 3. Fix the toast message
content = content.replace(
  'showToast("Live wallpaper applied!", undefined, 4000);',
  'showToast("Wallpaper picker opened \u2014 confirm to apply", undefined, 4000);'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed index.tsx imports and usages');

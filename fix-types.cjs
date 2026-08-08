const fs = require('fs');

// Fix index.tsx
let indexCode = fs.readFileSync('d:/Grain/src/routes/index.tsx', 'utf8');
indexCode = indexCode.replace(
  /initialOffset: { x: number; y: number };\n    initialScale: number;/g,
  'initialOffset: { x: number; y: number };\n    initialScale: number;\n    initialPhotoOffset: { x: number; y: number };\n    initialPhotoScale: number;'
);
fs.writeFileSync('d:/Grain/src/routes/index.tsx', indexCode);

// Fix useWallpaperSync.ts
let syncCode = fs.readFileSync('d:/Grain/src/hooks/useWallpaperSync.ts', 'utf8');
syncCode = syncCode.replace(
  /gridColorTheme\?: string;/g,
  'gridColorTheme?: string;\n  photoOffsetX?: number;\n  photoOffsetY?: number;\n  photoScale?: number;'
);
fs.writeFileSync('d:/Grain/src/hooks/useWallpaperSync.ts', syncCode);

console.log('done');

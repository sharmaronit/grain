const fs = require('fs');
let code = fs.readFileSync('d:/Grain/src/routes/index.tsx', 'utf8');

code = code.replace(/const resolveThemeKey = \(key: string\) => \{/g, 'const resolveThemeKey = (key: string, appTheme: string = "dark") => {');
code = code.replace(/const hour = new Date\(\)\.getHours\(\);\n    return \(hour >= 6 && hour < 18\) \? "mono" : "amoled";/g, 'return appTheme === "light" ? "mono" : "amoled";');

code = code.replace(/const wallpaperThemeOf = \(key: string\) => \{/g, 'const wallpaperThemeOf = (key: string, appTheme: string = "dark") => {');
code = code.replace(/const resolved = resolveThemeKey\(key\);/g, 'const resolved = resolveThemeKey(key, appTheme);');

code = code.replace(/const wallpaperTokens = \(themeKey: string, gridKey: string = "emerald"\): WpTokens => \{/g, 'const wallpaperTokens = (themeKey: string, gridKey: string = "emerald", appTheme: string = "dark"): WpTokens => {');
code = code.replace(/const resolvedTheme = resolveThemeKey\(themeKey\);/g, 'const resolvedTheme = resolveThemeKey(themeKey, appTheme);');

code = code.replace(/const theme = wallpaperThemeOf\(wallpaperTheme\);/g, 'const wt = wallpaperThemeOf(wallpaperTheme, theme);');
code = code.replace(/Style\.Light : Style\.Dark\)\}\);/g, 'Style.Light : Style.Dark)}catch(e){}');
code = code.replace(/StatusBar\.setStyle\(\{ style: theme\.bg === "#f5f5f5"/g, 'StatusBar.setStyle({ style: wt.bg === "#f5f5f5"');

code = code.replace(/wallpaperThemeOf\(wallpaperTheme\)/g, 'wallpaperThemeOf(wallpaperTheme, theme)');
code = code.replace(/wallpaperTokens\(wallpaperTheme, gridColorTheme\)/g, 'wallpaperTokens(wallpaperTheme, gridColorTheme, theme)');

code = code.replace(/label: "Auto \(By Time\)"/g, 'label: "Auto"');
code = code.replace(/const \[wallpaperTheme, setWallpaperTheme\] = useState<string>\("amoled"\);/g, 'const [wallpaperTheme, setWallpaperTheme] = useState<string>("auto");');

code = code.replace(/setWallpaperTheme\(prefs\.wallpaperTheme \?\? "amoled"\);/g, 'setWallpaperTheme(prefs.wallpaperTheme ?? "auto");');

fs.writeFileSync('d:/Grain/src/routes/index.tsx', code);
console.log('done');

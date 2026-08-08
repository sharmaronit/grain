export const WALLPAPER_THEMES = [
  { key: "auto", label: "Auto", swatch: "linear-gradient(135deg, #f5f5f5 50%, #171717 50%)", bg: "#auto", fg: "#auto" },
  { key: "amoled", label: "AMOLED Black", swatch: "#000000", bg: "#000000", fg: "#ffffff" },
  { key: "charcoal", label: "Charcoal Dark", swatch: "#171717", bg: "#171717", fg: "#f5f5f5" },
  { key: "mono", label: "Minimal Light", swatch: "#f5f5f5", bg: "#f5f5f5", fg: "#171717" },
  { key: "custom", label: "Custom Photo", swatch: "transparent", bg: "#000000", fg: "#ffffff" },
] as const;

export const GRID_COLORS = [
  { key: "emerald", label: "Emerald", color: "#22c55e", empty: "#22c55e26", low: "#22c55e66", mid: "#166534", hi: "#22c55e", accent: "#22c55e", accentSoft: "#4ade80" },
  { key: "crimson", label: "Crimson", color: "#dc2626", empty: "#dc262626", low: "#dc262666", mid: "#991b1b", hi: "#dc2626", accent: "#dc2626", accentSoft: "#f87171" },
  { key: "amber", label: "Amber", color: "#f59e0b", empty: "#f59e0b26", low: "#f59e0b66", mid: "#b45309", hi: "#f59e0b", accent: "#f59e0b", accentSoft: "#fbbf24" },
  { key: "neutral", label: "Neutral", color: "#737373", empty: "#73737326", low: "#73737366", mid: "#525252", hi: "#737373", accent: "#737373", accentSoft: "#a3a3a3" },
  { key: "ink", label: "Ink", color: "#737373", empty: "#a3a3a326", low: "#a3a3a366", mid: "#525252", hi: "#a3a3a3", accent: "#a3a3a3", accentSoft: "#d4d4d4" },
] as const;

export const resolveThemeKey = (key: string, appTheme: string = "dark") => {
  if (key === "auto") {
    return appTheme === "light" ? "mono" : "amoled";
  }
  return key;
};

export const wallpaperThemeOf = (key: string, appTheme: string = "dark") => {
  const resolved = resolveThemeKey(key, appTheme);
  return WALLPAPER_THEMES.find((t) => t.key === resolved) ?? WALLPAPER_THEMES[1];
};

export const gridColorOf = (key: string) => {
  if (key.startsWith("#")) {
    return {
      key,
      label: "Custom",
      color: key,
      empty: `${key}26`,
      low: `${key}66`,
      mid: `${key}cc`,
      hi: key,
      accent: key,
      accentSoft: `${key}99`
    };
  }
  return GRID_COLORS.find((g) => g.key === key) ?? GRID_COLORS[0];
};

export type WpTokens = {
  bg: string; fg: string; fgSoft: string;
  empty: string; low: string; mid: string; hi: string;
  accent: string; accentSoft: string;
};

export const wallpaperTokens = (themeKey: string, gridKey: string = "emerald", appTheme: string = "dark"): WpTokens => {
  const resolvedTheme = resolveThemeKey(themeKey, appTheme);
  const grid = gridColorOf(gridKey);

  let bgProps;
  switch (resolvedTheme) {
    case "mono":
      bgProps = {
        bg: "#f5f5f5", fg: "#171717", fgSoft: "rgba(23,23,23,0.75)",
        empty: "#d4d4d8", low: "#a1a1aa"
      };
      break;
    case "charcoal":
      bgProps = {
        bg: "#171717", fg: "#f5f5f5", fgSoft: "rgba(245,245,245,0.75)",
        empty: "#262626", low: "#404040"
      };
      break;
    case "custom":
      bgProps = {
        bg: "transparent", fg: "#ffffff", fgSoft: "rgba(255,255,255,0.8)",
        empty: "rgba(255,255,255,0.15)", low: "rgba(255,255,255,0.3)"
      };
      break;
    case "amoled":
    default:
      bgProps = {
        bg: "#000000", fg: "#ffffff", fgSoft: "rgba(255,255,255,0.8)",
        empty: "#2a2a2a", low: "#3f3f46"
      };
      break;
  }

  return {
    ...bgProps,
    empty: grid.empty, low: grid.low,
    mid: grid.mid, hi: grid.hi,
    accent: grid.accent, accentSoft: grid.accentSoft,
  };
};

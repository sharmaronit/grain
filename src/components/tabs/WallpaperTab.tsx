import { useState } from "react";
import { Wallpaper, Check, RotateCcw, Minus, Plus, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";

const WALLPAPER_THEMES = [
  { key: "amoled", label: "AMOLED Black", swatch: "#000000", bg: "#000000", fg: "#ffffff" },
  { key: "slate", label: "Slate Dark", swatch: "#1f2937", bg: "#1f2937", fg: "#e5e7eb" },
  { key: "neon", label: "Neon Cyberpunk", swatch: "linear-gradient(135deg,#ec4899,#06b6d4)", bg: "linear-gradient(135deg,#ec4899 0%,#8b5cf6 50%,#06b6d4 100%)", fg: "#ffffff" },
  { key: "mono", label: "Minimal Mono", swatch: "#e9e9ea", bg: "#e9e9ea", fg: "#111111" },
] as const;

const wallpaperThemeOf = (key: string) =>
  WALLPAPER_THEMES.find((t) => t.key === key) ?? WALLPAPER_THEMES[0];

interface WallpaperTabProps {
  wallpaperSync: boolean;
  syncPulse: number;
  wallpaperTheme: string;
  setWallpaperTheme: (t: string) => void;
  displayedHeatmap: number[][];
  totalStreak: number;
  rate: number;
  wallpaperState: string;
  toggleWallpaperSync: () => void;
  previewWeeks: number;
  setPreviewWeeks: (w: number | ((prev: number) => number)) => void;
  showToast: (msg: string) => void;
  setWallpaperPreview: (v: boolean) => void;
  applyWallpaper: () => void;
}

const TODAY_COL = 51;
const TODAY_ROW = 3;

export function WallpaperTab({
  wallpaperSync,
  syncPulse,
  wallpaperTheme,
  setWallpaperTheme,
  displayedHeatmap,
  totalStreak,
  rate,
  wallpaperState,
  toggleWallpaperSync,
  previewWeeks,
  setPreviewWeeks,
  showToast,
  setWallpaperPreview,
  applyWallpaper,
}: WallpaperTabProps) {
  return (
    <div className="animate-tab-fade pt-12">
      <section className="px-5">
        <div className="card-invert overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-2">
              <Wallpaper className="h-4 w-4" />
              <h3 className="font-display text-sm font-bold">Live wallpaper</h3>
            </div>
            <span
              className={`flex items-center gap-1 text-[10px] font-medium ${wallpaperSync ? "opacity-80" : "opacity-50"}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${wallpaperSync ? "bg-emerald-400 animate-pulse" : "bg-[color:var(--on-ink)]/40"}`}
              />
              {wallpaperSync ? "Live" : "Paused"}
            </span>
          </div>

          <div
            key={syncPulse}
            className={`wp-scene relative mx-4 mt-3 overflow-hidden rounded-2xl p-3 ${syncPulse ? "animate-sync-pulse" : ""}`}
            style={{
              background: wallpaperThemeOf(wallpaperTheme).bg,
              ["--ink" as string]: wallpaperThemeOf(wallpaperTheme).key === "neon" ? "#4c1d95" : wallpaperThemeOf(wallpaperTheme).bg,
              ["--on-ink" as string]: wallpaperThemeOf(wallpaperTheme).fg,
              color: wallpaperThemeOf(wallpaperTheme).fg,
            }}
          >
            <div className="mb-2 flex items-center justify-between text-[8px] opacity-70">
              <span className="tabular-nums">9:41</span>
              <span>{wallpaperSync ? "SYNCED" : "SNAPSHOT"}</span>
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-6 z-[1] flex flex-col items-center">
              <span className="text-[8px] font-medium uppercase tracking-[0.24em] opacity-50">
                Wed · Oct 21
              </span>
              <span className="font-display text-[38px] font-light leading-none tracking-tight tabular-nums opacity-90">
                9:41
              </span>
            </div>

            <div className={`flex justify-center gap-[2px] py-4 ${wallpaperSync ? "" : "opacity-60"}`}>
              {displayedHeatmap.slice(-26).map((col, ci) => {
                const absCi = 26 + ci;
                return (
                  <div key={ci} className="flex flex-col gap-[2px]">
                    {col.map((v, ri) => {
                      const isToday = absCi === TODAY_COL && ri === TODAY_ROW;
                      return (
                        <div
                          key={isToday ? `t-${v}` : ri}
                          className={`h-1.5 w-1.5 rounded-[1px] ${isToday ? "animate-cell-flash ring-1 ring-[color:var(--wp-accent)]" : ""}`}
                          style={{
                            background:
                              v === 0
                                ? "var(--wp-empty)"
                                : v === 1
                                  ? "var(--wp-low)"
                                  : v === 2
                                    ? "var(--wp-mid)"
                                    : "var(--wp-hi)",
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-center text-[9px] font-semibold opacity-80">
              {totalStreak} day streak · {rate}%
            </div>
            <div className="mt-3 flex justify-center gap-2">
              {WALLPAPER_THEMES.map((t) => {
                const active = wallpaperTheme === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setWallpaperTheme(t.key);
                      showToast(`${t.label} theme`);
                    }}
                    aria-label={t.label}
                    title={t.label}
                    className={`h-5 w-5 rounded-md border transition ${
                      active
                        ? "border-[color:var(--on-ink)] ring-2 ring-[color:var(--on-ink)]/50"
                        : "border-[color:var(--on-ink)]/30"
                    }`}
                    style={{ background: t.swatch }}
                  />
                );
              })}
            </div>
            <div className="mt-1.5 text-center text-[8px] uppercase tracking-wider opacity-60">
              {WALLPAPER_THEMES.find((t) => t.key === wallpaperTheme)?.label}
            </div>

            {wallpaperState === "applied" && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[color:var(--ink)]/40 backdrop-blur-[2px] animate-fade-in">
                <div className="flex items-center gap-1.5 rounded-full bg-[color:var(--on-ink)] px-3 py-1.5 text-[11px] font-semibold text-ink">
                  <Check className="h-3 w-3" strokeWidth={3} /> Applied
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[color:var(--on-ink)]/10 px-4 py-3">
            <div>
              <p className="text-xs font-semibold">Sync grid to wallpaper</p>
              <p className="text-[10px] opacity-70">
                {wallpaperSync ? "Updates automatically" : "Showing last snapshot"}
              </p>
            </div>
            <button
              onClick={toggleWallpaperSync}
              className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
                wallpaperSync
                  ? "bg-[color:var(--on-ink)] border-[color:var(--on-ink)]"
                  : "bg-transparent border-[color:var(--on-ink)]/40"
              }`}
              aria-label="Toggle sync"
              aria-pressed={wallpaperSync}
            >
              <span
                className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full transition-all duration-200 ease-out ${
                  wallpaperSync
                    ? "left-[calc(100%-1.375rem)] bg-[color:var(--ink)] shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
                    : "left-1 bg-[color:var(--on-ink)]/70"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-[color:var(--on-ink)]/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-xs font-semibold">Grid size</p>
                <p className="text-[10px] opacity-70">Cells shown on lock screen · {previewWeeks} weeks</p>
              </div>
              <button
                onClick={() => { setPreviewWeeks(26); showToast("Grid size reset"); }}
                aria-label="Reset grid size"
                className="grid h-6 w-6 place-items-center rounded-full text-[color:var(--on-ink)]/70 hover:bg-[color:var(--on-ink)]/10 hover:text-[color:var(--on-ink)]"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[color:var(--on-ink)]/20 px-1 py-1">
              <button
                aria-label="Fewer weeks"
                onClick={() => setPreviewWeeks((w) => Math.max(12, typeof w === "number" ? w - 4 : w))}
                className="grid h-6 w-6 place-items-center rounded-full hover:bg-[color:var(--on-ink)]/10 disabled:opacity-40"
                disabled={previewWeeks <= 12}
              >
                <Minus className="h-3 w-3" />
              </button>
              <div
                role="slider"
                aria-label="Grid size"
                aria-valuemin={12}
                aria-valuemax={52}
                aria-valuenow={previewWeeks}
                className="flex h-5 w-28 cursor-ew-resize touch-none items-center rounded-full bg-[color:var(--on-ink)]/10 px-1"
              >
                <div
                  className="h-1 rounded-full bg-[color:var(--on-ink)]/70"
                  style={{ width: `${((previewWeeks - 12) / (52 - 12)) * 100}%` }}
                />
              </div>
              <button
                aria-label="More weeks"
                onClick={() => setPreviewWeeks((w) => Math.min(52, typeof w === "number" ? w + 4 : w))}
                className="grid h-6 w-6 place-items-center rounded-full hover:bg-[color:var(--on-ink)]/10 disabled:opacity-40"
                disabled={previewWeeks >= 52}
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={() => setWallpaperPreview(true)}
              className="flex flex-1 items-center justify-center gap-2 pill border border-[color:var(--on-ink)]/30 bg-transparent py-3 text-sm font-medium text-[color:var(--on-ink)] transition active:scale-[0.98] hover:bg-[color:var(--on-ink)]/10"
            >
              <Wallpaper className="h-4 w-4" />
              Preview
            </button>
            <button
              onClick={applyWallpaper}
              disabled={wallpaperState !== "idle"}
              className="flex flex-1 items-center justify-center gap-2 pill bg-[color:var(--on-ink)] py-3 text-sm font-medium text-ink transition active:scale-[0.98] disabled:opacity-80"
            >
              {wallpaperState === "applying" && <Loader2 className="h-4 w-4 animate-spin" />}
              {wallpaperState === "applied" && <Check className="h-4 w-4" strokeWidth={3} />}
              {wallpaperState === "idle"
                ? Capacitor.isNativePlatform() ? "Set as live wallpaper" : "Download wallpaper image"
                : wallpaperState === "applying"
                  ? "Applying…"
                  : "Wallpaper set"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

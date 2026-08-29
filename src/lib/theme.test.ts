import { describe, it, expect } from "vitest";
import {
  resolveThemeKey,
  wallpaperThemeOf,
  gridColorOf,
  wallpaperTokens,
} from "./theme";

describe("theme & wallpaper token resolver", () => {
  it("resolves auto theme to amoled in dark mode and mono in light mode", () => {
    expect(resolveThemeKey("auto", "dark")).toBe("amoled");
    expect(resolveThemeKey("auto", "light")).toBe("mono");
    expect(resolveThemeKey("charcoal", "dark")).toBe("charcoal");
  });

  it("retrieves wallpaper theme definition", () => {
    const amoled = wallpaperThemeOf("amoled", "dark");
    expect(amoled.key).toBe("amoled");
    expect(amoled.bg).toBe("#000000");
    expect(amoled.fg).toBe("#ffffff");
  });

  it("retrieves preset and custom grid colors", () => {
    const emerald = gridColorOf("emerald");
    expect(emerald.color).toBe("#22c55e");

    const custom = gridColorOf("#3b82f6");
    expect(custom.color).toBe("#3b82f6");
    expect(custom.key).toBe("#3b82f6");
  });

  it("generates full wallpaper tokens", () => {
    const tokens = wallpaperTokens("amoled", "emerald", "dark");
    expect(tokens.bg).toBe("#000000");
    expect(tokens.fg).toBe("#ffffff");
    expect(tokens.hi).toBe("#22c55e");
    expect(tokens.accent).toBe("#22c55e");
  });
});

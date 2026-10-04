import { beforeEach, describe, expect, it, vi } from "vitest";
const plugin = vi.hoisted(() => ({ export: vi.fn(), shareImage: vi.fn(), shareText: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true }, registerPlugin: () => plugin }));
import { downloadBackup, exportImage, shareNativeText } from "./backup-download";
describe("native exports", () => {
  beforeEach(() => vi.resetAllMocks());
  it("returns cancellation without reporting a saved backup", async () => { plugin.export.mockResolvedValue({ saved: false }); expect(await downloadBackup({ version: 1 })).toBe(false); });
  it("passes JSON and filename to Android", async () => { plugin.export.mockResolvedValue({ saved: true }); expect(await downloadBackup({ version: 1 })).toBe(true); expect(plugin.export).toHaveBeenCalledWith(expect.objectContaining({ content: '{\n  "version": 1\n}', mimeType: "application/json", filename: expect.stringMatching(/^grain-backup-.*\.json$/) })); });
  it("surfaces save errors", async () => { plugin.export.mockRejectedValue(new Error("Disk full")); await expect(downloadBackup({})).rejects.toThrow("Disk full"); });
  it("exports image bytes with the correct format", async () => { plugin.export.mockResolvedValue({ saved: true }); await exportImage("data:image/png;base64,YWJj", "grain.png"); expect(plugin.export).toHaveBeenCalledWith({ content: "YWJj", encoding: "base64", filename: "grain.png", mimeType: "image/png" }); });
  it("opens native text sharing with the public link", async () => { await shareNativeText("https://trygrain.vercel.app"); expect(plugin.shareText).toHaveBeenCalledWith({ text: "https://trygrain.vercel.app" }); });
});

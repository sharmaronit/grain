import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({ getPending: vi.fn(), cancel: vi.fn(), requestPermissions: vi.fn(), checkPermissions: vi.fn(), schedule: vi.fn(), createChannel: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" }, registerPlugin: () => ({}) }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: native }));
import { scheduleHabitReminders } from "./reminders";
describe("Android reminder ownership", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal("window", {}); native.getPending.mockResolvedValue({ notifications: [{ id: 12 }] }); native.requestPermissions.mockResolvedValue({ display: "granted" }); native.checkPermissions.mockResolvedValue({ display: "granted" }); });
  afterEach(() => vi.unstubAllGlobals());
  it("clears legacy schedules without scheduling duplicate reminders", async () => {
    expect(await scheduleHabitReminders({ enabled: true })).toBe(true);
    expect(native.cancel).toHaveBeenCalledWith({ notifications: [{ id: 12 }] });
    expect(native.schedule).not.toHaveBeenCalled();
  });
  it("does not request notification access when reminders are off", async () => {
    expect(await scheduleHabitReminders({ enabled: false })).toBe(false);
    expect(native.requestPermissions).not.toHaveBeenCalled();
    expect(native.schedule).not.toHaveBeenCalled();
  });
});

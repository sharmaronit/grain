import { useEffect, useSyncExternalStore } from "react";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import {
  DEFAULT_PILL_PREFERENCES,
  normalizePillPreferences,
  resolvePillPlacement,
  type DisplayGeometry,
  type PillPreferences,
} from "../lib/pill-placement";

const KEY = "grain_pill_placement";
function readPreferences(): PillPreferences {
  try {
    return normalizePillPreferences(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
  } catch {
    return { ...DEFAULT_PILL_PREFERENCES };
  }
}
let preferences = readPreferences();
let geometry: DisplayGeometry | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const notify = () => listeners.forEach((listener) => listener());
const NativeDisplay = registerPlugin<{
  getGeometry(): Promise<DisplayGeometry>;
  addListener(
    event: "geometryChanged",
    listener: (geometry: DisplayGeometry) => void,
  ): Promise<PluginListenerHandle>;
}>("GrainDisplay");

export function setPillPreferences(next: Partial<PillPreferences>) {
  preferences = normalizePillPreferences({ ...preferences, ...next });
  try {
    localStorage.setItem(KEY, JSON.stringify(preferences));
  } catch {
    /* Keep the adjustment for this session. */
  }
  notify();
}

export function usePillPreferences() {
  return useSyncExternalStore(
    subscribe,
    () => preferences,
    () => DEFAULT_PILL_PREFERENCES,
  );
}

export function usePillPlacement() {
  const prefs = usePillPreferences();
  const nativeGeometry = useSyncExternalStore(
    subscribe,
    () => geometry,
    () => null,
  );
  const viewport = useSyncExternalStore(
    subscribe,
    () => viewportSize,
    () => viewportSize,
  );
  useEffect(() => {
    let disposed = false;
    let handle: PluginListenerHandle | undefined;
    const refresh = () => {
      viewportSize = {
        width: window.innerWidth,
        height: window.innerHeight,
        safeTop: safeAreaTop(),
      };
      notify();
      if (Capacitor.isNativePlatform())
        void NativeDisplay.getGeometry()
          .then(update)
          .catch(() => {});
    };
    const update = (next: DisplayGeometry) => {
      if (!disposed) {
        geometry = next;
        notify();
      }
    };
    refresh();
    if (Capacitor.isNativePlatform())
      void NativeDisplay.addListener("geometryChanged", update)
        .then((listener) => {
          if (disposed) void listener.remove();
          else handle = listener;
        })
        .catch(() => {});
    window.addEventListener("resize", refresh);
    window.addEventListener("orientationchange", refresh);
    const retry = window.setTimeout(refresh, 500);
    return () => {
      disposed = true;
      window.clearTimeout(retry);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("orientationchange", refresh);
      void handle?.remove();
    };
  }, []);
  return resolvePillPlacement(
    viewport.width,
    viewport.height,
    viewport.safeTop,
    nativeGeometry,
    prefs,
  );
}

function safeAreaTop() {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding-top:max(var(--sa-top,0px),env(safe-area-inset-top,0px))";
  document.body.appendChild(probe);
  const top = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return top;
}
let viewportSize = {
  width: typeof window === "undefined" ? 390 : window.innerWidth,
  height: typeof window === "undefined" ? 844 : window.innerHeight,
  safeTop: 0,
};

const KEY = "grain_widgets_enabled";
function readEnabled() {
  try {
    return localStorage.getItem(KEY) !== "false";
  } catch {
    return true;
  }
}
let enabled = readEnabled();
const listeners = new Set<() => void>();
export const getWidgetsEnabled = () => enabled;
export const subscribeWidgetPreferences = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function setWidgetsEnabled(next: boolean) {
  enabled = next;
  try {
    localStorage.setItem(KEY, String(next));
  } catch {
    /* Keep the preference for this session. */
  }
  listeners.forEach((listener) => listener());
}

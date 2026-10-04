import { useSyncExternalStore } from "react";
import { getWidgetsEnabled, subscribeWidgetPreferences } from "../lib/widget-preferences";

export function useWidgetsEnabled() {
  return useSyncExternalStore(subscribeWidgetPreferences, getWidgetsEnabled, () => true);
}

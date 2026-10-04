import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { HabitActions } from "../../lib/habit-actions-bridge";
import { useWidgetsEnabled } from "../../hooks/useWidgetPreferences";
import { setWidgetsEnabled } from "../../lib/widget-preferences";
import { FeatureSettingsCard } from "./FeatureSettingsCard";

export function WidgetSettings({ onMessage }: { onMessage: (message: string) => void }) {
  const android = Capacitor.getPlatform() === "android";
  const available = android && Capacitor.isPluginAvailable("HabitActions");
  const [adding, setAdding] = useState<string | null>(null);
  const enabled = useWidgetsEnabled();

  const addWidget = async (compact: boolean, label: string) => {
    if (!enabled || !available || adding) return;
    setAdding(label);
    try {
      const result = await HabitActions.pinWidget({ compact });
      onMessage(
        result.supported
          ? "Confirm the widget on your home screen to add it."
          : "Long-press your home screen â†’ Widgets â†’ Grain to add a widget.",
      );
    } catch {
      onMessage("Long-press your home screen â†’ Widgets â†’ Grain to add a widget.");
    } finally {
      setAdding(null);
    }
  };

  return (
    <FeatureSettingsCard
      id="widget-settings"
      title="Home screen widgets"
      description={
        enabled
          ? "Check off habits from your home screen."
          : "Widgets paused. Your selections are saved."
      }
      enabled={enabled}
      onToggle={() => setWidgetsEnabled(!enabled)}
      setupLabel="Add a widget"
      summary="Set up"
    >
      <p className="text-xs text-mute leading-relaxed">
        Check off habits or add +1 from your home screen. Widgets follow your app theme. Tap Edit on
        a widget to choose its habits.
      </p>
      <div className="flex gap-2">
        {[
          { compact: true, label: "One habit" },
          { compact: false, label: "Today checklist" },
        ].map((widget) => (
          <button
            key={widget.label}
            type="button"
            disabled={!available || adding !== null}
            onClick={() => addWidget(widget.compact, widget.label)}
            className="btn-subtle-uber flex-1 py-2.5 text-xs font-medium"
          >
            {adding === widget.label ? "Addingâ€¦" : widget.label}
          </button>
        ))}
      </div>
      {!android && (
        <p className="text-[11px] leading-relaxed text-mute">
          Home screen widgets are available in the Grain Android app.
        </p>
      )}
      {android && !available && (
        <p className="text-[11px] leading-relaxed text-mute">
          Update Grain to the latest APK to add home screen widgets.
        </p>
      )}
      <p className="text-[11px] leading-relaxed text-mute">
        Turning this off pauses existing widgets. Long-press a widget on your home screen to remove
        it.
      </p>
    </FeatureSettingsCard>
  );
}

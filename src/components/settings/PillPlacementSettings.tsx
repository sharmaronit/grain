import { useState } from "react";
import { DEFAULT_PILL_PREFERENCES } from "../../lib/pill-placement";
import { setPillPreferences, usePillPreferences } from "../../hooks/usePillPlacement";
import { FeatureSettingsCard } from "./FeatureSettingsCard";

export function PillPlacementSettings({ onPreview }: { onPreview: () => void }) {
  const prefs = usePillPreferences();
  const [saved, setSaved] = useState(false);
  return (
    <FeatureSettingsCard
      id="grain-pill-settings"
      title="Grain pill"
      description="A little space for your progress."
      enabled={prefs.enabled}
      onToggle={() => {
        setPillPreferences({ enabled: !prefs.enabled });
        setSaved(false);
      }}
      setupLabel="Placement"
      summary={prefs.manual ? "Manual" : "Automatic"}
    >
      <div className="grid grid-cols-2 gap-2">
        {[
          { manual: false, label: "Automatic" },
          { manual: true, label: "Adjust manually" },
        ].map(({ manual, label }) => (
          <button
            key={label}
            type="button"
            aria-pressed={prefs.manual === manual}
            onClick={() => {
              setPillPreferences({ manual });
              setSaved(false);
            }}
            className="habit-category-option pill py-2.5 text-xs font-medium"
          >
            {label}
          </button>
        ))}
      </div>
      {prefs.manual && (
        <div className="space-y-3">
          {[
            {
              key: "offsetX" as const,
              label: "Horizontal position",
              min: -120,
              max: 120,
              step: 1,
              value: prefs.offsetX,
              display: `${prefs.offsetX}px`,
            },
            {
              key: "offsetY" as const,
              label: "Vertical position",
              min: -32,
              max: 120,
              step: 1,
              value: prefs.offsetY,
              display: `${prefs.offsetY}px`,
            },
            {
              key: "scale" as const,
              label: "Pill size",
              min: 0.8,
              max: 1.25,
              step: 0.01,
              value: prefs.scale,
              display: `${Math.round(prefs.scale * 100)}%`,
            },
          ].map((slider) => (
            <label key={slider.key} className="block text-xs text-body">
              <span className="flex justify-between">
                <span>{slider.label}</span>
                <span>{slider.display}</span>
              </span>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={slider.value}
                onChange={(event) => {
                  setPillPreferences({ [slider.key]: Number(event.target.value) });
                  setSaved(false);
                }}
                className="mt-2 w-full accent-[color:var(--ink)]"
              />
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn-glass flex-1 py-2.5 text-xs" onClick={onPreview}>
          Preview on home screen
        </button>
        <button
          type="button"
          className="btn-subtle-uber px-3 py-2.5 text-xs"
          onClick={() => {
            setPillPreferences({ ...DEFAULT_PILL_PREFERENCES, enabled: prefs.enabled });
            setSaved(true);
          }}
        >
          Reset
        </button>
      </div>
      <p className="text-[11px] text-mute" role="status">
        {saved ? "Automatic placement restored." : "Adjustments are saved on this device."}
      </p>
    </FeatureSettingsCard>
  );
}

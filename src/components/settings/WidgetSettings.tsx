import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Plus, Eye } from "lucide-react";
import { HabitActions } from "../../lib/habit-actions-bridge";
import { useWidgetsEnabled } from "../../hooks/useWidgetPreferences";
import { setWidgetsEnabled } from "../../lib/widget-preferences";
import { FeatureSettingsCard } from "./FeatureSettingsCard";
import { WidgetPreview, WIDGET_OPTIONS, WIDGET_DESIGNS, type WidgetKind, type WidgetDesign } from "./WidgetPreview";

export function WidgetSettings({ onMessage }: { onMessage: (message: string) => void }) {
  const android = Capacitor.getPlatform() === "android";
  const available = android && Capacitor.isPluginAvailable("HabitActions");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<WidgetKind>("compact");
  const [design, setDesign] = useState<WidgetDesign>("classic");
  const enabled = useWidgetsEnabled();
  const widget = WIDGET_OPTIONS.find(option => option.kind === selected)!;

  const addWidget = async () => {
    if (!enabled || !available || adding) return;
    setAdding(true);
    try {
      const result = await HabitActions.pinWidget({ kind: selected, design });
      onMessage(result.supported
        ? "Confirm the widget on your home screen to add it."
        : "Add Grain from your launcher's Widgets menu, then tap Edit on the widget to choose its design.");
    } catch {
      onMessage("Add Grain from your launcher's Widgets menu, then tap Edit on the widget to choose its design.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <FeatureSettingsCard id="widget-settings" title="Home screen widgets"
      description={enabled ? "A little Grain, right on your home screen." : "Widgets paused. Your selections are saved."}
      enabled={enabled} onToggle={() => setWidgetsEnabled(!enabled)} setupLabel="Add a widget" summary="Preview & choose">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Choose a widget to preview">
        {WIDGET_OPTIONS.map(option => (
          <button key={option.kind} type="button" disabled={adding} aria-pressed={selected === option.kind}
            onClick={() => setSelected(option.kind)}
            className={`rounded-2xl border px-3 py-3 text-left transition-colors duration-200 motion-reduce:transition-none disabled:opacity-50 ${selected === option.kind ? "border-[color:var(--ink)] bg-[color:var(--surface-pressed)] text-ink" : "border-[color:var(--hairline)] text-body"}`}>
            <span className="block text-xs font-semibold">{option.label}</span>
            <span className="mt-1 block text-[10px] text-mute">{option.size} cells</span>
          </button>
        ))}
      </div>
      <fieldset className="min-w-0">
        <legend className="mb-2 text-xs font-semibold text-body">Design</legend>
        <div className="flex flex-wrap gap-2">
          {WIDGET_DESIGNS.map(option => <button key={option.id} type="button" aria-pressed={design === option.id} disabled={adding}
            onClick={() => setDesign(option.id)} className={`flex min-h-10 items-center gap-2 rounded-full border px-3 text-[11px] font-medium transition-colors disabled:opacity-50 ${design === option.id ? "border-[color:var(--ink)] bg-[color:var(--surface-pressed)] text-ink" : "border-[color:var(--hairline)] text-body"}`}>
            <span className="h-3 w-3 rounded-full border border-black/15" style={{ background: option.color }} />{option.label}
          </button>)}
        </div>
        <p aria-live="polite" className="mt-2 text-[11px] leading-relaxed text-mute">{WIDGET_DESIGNS.find(option => option.id === design)?.description}</p>
      </fieldset>
      <div className="widget-preview-stage rounded-3xl border border-[color:var(--hairline)] p-4">
        <div className="mb-4 flex items-center justify-between text-[10px] font-medium text-mute"><span className="flex items-center gap-1.5"><Eye size={13} /> Preview</span><span>Sample data</span></div>
        <div key={`${selected}-${design}`} className="widget-preview-enter"><WidgetPreview kind={selected} design={design} /></div>
      </div>
      <div aria-live="polite"><p className="text-xs leading-relaxed text-body">{widget.description}</p></div>
      <p className="text-[11px] leading-relaxed text-mute">Each widget keeps its own design. Tap Edit on a widget to change it. Size may vary with your launcher.</p>
      <button type="button" onClick={addWidget} disabled={!enabled || !available || adding}
        className="btn-glass flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold disabled:opacity-40">
        <Plus size={16} />{adding ? "Opening widget picker..." : "Add to home screen"}
      </button>
      {!android && <p className="text-[11px] leading-relaxed text-mute">Explore the previews here. Adding home screen widgets requires the Grain Android app.</p>}
      {android && !available && <p className="text-[11px] leading-relaxed text-mute">Update Grain to the latest APK to add home screen widgets.</p>}
      <p className="text-[11px] leading-relaxed text-mute">Turning this off pauses existing widgets. Long-press a widget on your home screen to remove it.</p>
    </FeatureSettingsCard>
  );
}

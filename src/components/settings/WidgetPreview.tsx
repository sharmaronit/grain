import { Check, Plus } from "lucide-react";

export type WidgetKind = "compact" | "checklist" | "heatmap" | "progress";
export type WidgetDesign = "classic" | "paper" | "oled" | "botanical" | "dots";
export const WIDGET_DESIGNS: { id: WidgetDesign; label: string; color: string; description: string }[] = [
  { id: "classic", label: "App theme", color: "#71717a", description: "Follows Grain's light, dark, or AMOLED theme." },
  { id: "paper", label: "Paper", color: "#f5f0e6", description: "Warm cream, charcoal type, and a soft bronze accent." },
  { id: "oled", label: "OLED Minimal", color: "#c4b5fd", description: "Pure black with a quiet lavender accent." },
  { id: "botanical", label: "Botanical", color: "#39734b", description: "Sage and forest green. The daily progress sprout grows as you complete habits." },
  { id: "dots", label: "Dot Matrix", color: "#a8edbc", description: "Mint on deep green, with dots for daily and weekly progress." },
];
export const WIDGET_OPTIONS: { kind: WidgetKind; label: string; size: string; description: string }[] = [
  { kind: "compact", label: "One habit", size: "3 × 2", description: "Keep one small action close. Tap to complete a habit or add one unit." },
  { kind: "checklist", label: "Today checklist", size: "4 × 3", description: "Your pending habits, ready to check off without opening Grain." },
  { kind: "heatmap", label: "Weekly heatmap", size: "4 × 2", description: "Seven days of consistency. Stronger color means more habits completed." },
  { kind: "progress", label: "Daily progress", size: "3 × 3", description: "A quiet view of today's progress, one completed habit at a time." },
];

/** Representative sample content, never connected to habit completion actions. */
export function WidgetPreview({ kind, design = "classic" }: { kind: WidgetKind; design?: WidgetDesign }) {
  const summary = kind === "heatmap" || kind === "progress";
  const title = kind === "compact" ? "One small action" : kind === "checklist" ? "Today" : kind === "heatmap" ? "Weekly heatmap" : "Daily progress";
  return (
    <div data-widget-design={design} className={`widget-preview widget-preview--${kind}`} role="img" aria-label={`${WIDGET_DESIGNS.find(item => item.id === design)?.label} ${title} preview with sample habit data`}>
      <div className="widget-preview-heading"><span>{title}</span><span className="widget-preview-brand">GRAIN</span></div>
      {kind === "checklist" && <p className="widget-preview-muted mt-1 text-xs">2 / 5 complete</p>}
      {kind === "progress" && (
        <svg className="mx-auto my-3 w-full max-w-48" viewBox="0 0 320 320" aria-hidden="true">
          {design === "botanical" ? <>
            <ellipse cx="160" cy="188.5" rx="65" ry="10.5" fill="var(--widget-track)" />
            <circle cx="160" cy="181" r="8" fill="var(--widget-accent)" />
            <path d="M160 181V88" stroke="var(--widget-accent)" strokeWidth="7" strokeLinecap="round" />
            {[0, 1].map(leaf => { const y = 88 + leaf * 29; const direction = leaf % 2 === 0 ? -1 : 1; return <path key={leaf} d={`M160 ${y + 25} C${160 + direction * 45} ${y + 25},${160 + direction * 55} ${y - 20},160 ${y + 25}`} fill="var(--widget-accent)" />; })}
            <text x="160" y="255" textAnchor="middle" fill="var(--widget-ink)" fontSize="46" fontWeight="700">60%</text>
            <text x="160" y="287" textAnchor="middle" fill="var(--widget-muted)" fontSize="21">Growing with you</text>
          </> : design === "dots" ? <>
            {Array.from({ length: 25 }, (_, dot) => <circle key={dot} cx={88 + dot % 5 * 36} cy={35 + Math.floor(dot / 5) * 36} r="11" fill={dot < 15 ? "var(--widget-accent)" : "var(--widget-track)"} />)}
            <text x="160" y="255" textAnchor="middle" fill="var(--widget-ink)" fontFamily="monospace" fontSize="46" fontWeight="700">60%</text>
            <text x="160" y="287" textAnchor="middle" fill="var(--widget-muted)" fontSize="21">complete</text>
          </> : <>
          <circle cx="160" cy="160" r="124" fill="none" stroke="var(--widget-track)" strokeWidth="18" />
          <circle cx="160" cy="160" r="124" fill="none" stroke="var(--widget-accent)" strokeWidth="18" strokeLinecap="round" strokeDasharray="467.47 779.12" transform="rotate(-90 160 160)" />
          <text x="160" y="162" textAnchor="middle" fill="var(--widget-ink)" fontSize="58" fontWeight="700">60%</text>
          <text x="160" y="199" textAnchor="middle" fill="var(--widget-muted)" fontSize="23">complete</text>
          </>}
        </svg>
      )}
      {kind === "heatmap" && (
        <div className="my-5 grid grid-cols-7 gap-1.5" aria-hidden="true">
          {[3, 5, 2, 4, 5, 1, 3].map((done, index) => (
            <div key={index} className="text-center">
              {design === "dots" ? <div className="flex h-11 flex-col-reverse items-center justify-between">{Array.from({ length: 5 }, (_, dot) => <span key={dot} className="h-1.5 w-1.5 rounded-full" style={{ background: dot < done ? "var(--widget-accent)" : "var(--widget-track)" }} />)}</div> : <div className="widget-preview-cell"><span style={{ opacity: (65 + 190 * done / 5) / 255 }} /></div>}
              <div className="widget-preview-muted mt-2 text-[10px]">{["Tu", "We", "Th", "Fr", "Sa", "Su", "Mo"][index]}</div>
              <div className="widget-preview-muted mt-1 text-[9px]">{done}/5</div>
              <span className={`mx-auto mt-1 block h-1 w-1 rounded-full ${index === 6 ? "bg-[var(--widget-accent)]" : "bg-transparent"}`} />
            </div>
          ))}
        </div>
      )}
      {!summary && (
        <div className="my-3 space-y-1">
          {(kind === "compact" ? [{ name: "Read a little", status: "Ready when you are", numeric: false }] : [
            { name: "Read a little", status: "Ready when you are", numeric: false },
            { name: "Drink water", status: "3 / 8 glasses", numeric: true },
            { name: "Evening walk", status: "Ready when you are", numeric: false },
          ]).map(habit => (
            <div key={habit.name} className="flex min-h-16 items-center justify-between gap-3">
              <div className="min-w-0"><p className="text-sm font-medium">{habit.name}</p><p className="widget-preview-muted mt-1 text-[11px]">{habit.status}</p></div>
              <span className="widget-preview-check grid h-11 w-11 shrink-0 place-items-center rounded-full">{habit.numeric ? "+1" : <Check size={20} />}</span>
            </div>
          ))}
        </div>
      )}
      {summary ? <div className="widget-preview-muted flex items-center justify-between gap-3 text-[11px]"><p>{kind === "heatmap" ? "Last 7 days · 23 habits completed" : "3 / 5 habits complete today"}</p><span>Edit</span></div> : <div className="widget-preview-muted flex items-center justify-end gap-5 text-xs"><span>Edit</span><Plus size={21} /></div>}
    </div>
  );
}

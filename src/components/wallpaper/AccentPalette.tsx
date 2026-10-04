import { memo, useEffect, useRef, useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { GRID_COLORS, gridColorOf } from "../../lib/theme";
import { hexToHsv, hsvToHex, normalizeHex, type HsvColor } from "../../lib/accent-color";
import { CollapseMotion } from "../ui/CollapseMotion";

export const AccentPalette = memo(function AccentPalette({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [editing, setEditing] = useState(value.startsWith("#"));
  const [draft, setDraft] = useState(() => hexToHsv(gridColorOf(value).color));
  const draftRef = useRef(draft);
  const [hexInput, setHexInput] = useState(gridColorOf(value).color.toUpperCase());
  const [invalid, setInvalid] = useState(false);
  const dragging = useRef(false);
  const color = hsvToHex(draft);

  useEffect(() => {
    if (dragging.current) return;
    if (hsvToHex(draftRef.current) === gridColorOf(value).color) {
      setHexInput(gridColorOf(value).color.toUpperCase());
      setInvalid(false);
      return;
    }
    const next = hexToHsv(gridColorOf(value).color);
    draftRef.current = next;
    setDraft(next);
    setHexInput(gridColorOf(value).color.toUpperCase());
    setInvalid(false);
  }, [value]);

  const update = (next: HsvColor) => {
    draftRef.current = next;
    setDraft(next);
    setHexInput(hsvToHex(next).toUpperCase());
    setInvalid(false);
  };
  const commit = () => { dragging.current = false; onChange(hsvToHex(draftRef.current)); };
  const updatePad = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    update({ ...draftRef.current, s: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), v: 1 - Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) });
  };
  const commitHex = () => {
    const next = normalizeHex(hexInput);
    if (!next) { setInvalid(true); return; }
    update(hexToHsv(next));
    onChange(next);
  };

  return (
    <div className="w-full space-y-3 text-[color:var(--wp-fg)]">
      <div className="grid grid-cols-6 gap-1">
        {GRID_COLORS.map(preset => (
          <button key={preset.key} type="button" aria-label={`${preset.label} accent`} aria-pressed={value === preset.key} onClick={() => { setEditing(false); onChange(preset.key); }} className="flex min-h-14 flex-col items-center justify-center gap-2 rounded-xl transition active:scale-95">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-[color:var(--wp-fg)]/20" style={{ background: preset.color, outline: value === preset.key ? "2px solid var(--wp-fg)" : undefined, outlineOffset: 3 }}>
              {value === preset.key && <Check size={13} className="text-white" />}
            </span>
            <span className="text-[9px] font-medium opacity-70">{preset.label}</span>
          </button>
        ))}
        <button type="button" aria-label="Customize accent color" aria-expanded={editing} onClick={() => setEditing(open => !open)} className="flex min-h-14 flex-col items-center justify-center gap-2 rounded-xl transition active:scale-95">
          <span className="grid h-7 w-7 place-items-center rounded-full" style={{ background: "conic-gradient(#f87171, #fbbf24, #4ade80, #38bdf8, #a78bfa, #f87171)", outline: editing ? "2px solid var(--wp-fg)" : undefined, outlineOffset: 3 }}><SlidersHorizontal size={13} className="text-black" /></span>
          <span className="text-[9px] font-medium opacity-70">Custom</span>
        </button>
      </div>
      <CollapseMotion open={editing}>
        <div className="space-y-3 rounded-2xl border p-3" style={{ background: "color-mix(in srgb, var(--wp-bg) 80%, transparent)", borderColor: "color-mix(in srgb, var(--wp-fg) 12%, transparent)" }}>
          <div className="flex items-center justify-between"><span className="text-[10px] font-semibold tracking-wide">Make it yours</span><span className="text-[9px] opacity-60">Drag to choose a shade</span></div>
          <div role="slider" tabIndex={0} aria-label="Accent shade. Left and right adjust saturation; up and down adjust brightness." aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(draft.s * 100)} aria-valuetext={`${Math.round(draft.s * 100)}% saturation, ${Math.round(draft.v * 100)}% brightness`} className="relative h-24 cursor-crosshair overflow-hidden rounded-xl outline-offset-2" style={{ touchAction: "none", background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${draft.h} 100% 50%)` }}
            onPointerDown={event => { event.stopPropagation(); dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); updatePad(event); }}
            onPointerMove={event => { if (dragging.current && event.currentTarget.hasPointerCapture(event.pointerId)) updatePad(event); }}
            onPointerUp={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; updatePad(event); event.currentTarget.releasePointerCapture(event.pointerId); commit(); }}
            onPointerCancel={() => { dragging.current = false; update(hexToHsv(gridColorOf(value).color)); }}
            onKeyDown={event => {
              if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
              event.preventDefault();
              const next = { ...draftRef.current };
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") next.s = Math.max(0, Math.min(1, next.s + (event.key === "ArrowRight" ? 0.02 : -0.02)));
              else next.v = Math.max(0, Math.min(1, next.v + (event.key === "ArrowUp" ? 0.02 : -0.02)));
              update(next); commit();
            }}>
            <span className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md" style={{ left: `${draft.s * 100}%`, top: `${(1 - draft.v) * 100}%`, background: color }} />
          </div>
          <input type="range" min={0} max={359} value={Math.round(draft.h)} aria-label="Accent hue" className="grain-hue-slider h-3 w-full cursor-pointer appearance-none rounded-full" style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)", accentColor: color }} onPointerDown={() => { dragging.current = true; }} onChange={event => update({ ...draftRef.current, h: Number(event.target.value) })} onPointerUp={commit} onPointerCancel={commit} onKeyUp={commit} onBlur={commit} />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" aria-label="Progress color preview">{[0.15, 0.4, 0.8, 1].map(opacity => <span key={opacity} className="h-5 w-5 rounded-md" style={{ background: color, opacity }} />)}</div>
            <label className="flex items-center gap-2 text-[9px] font-semibold"><span className="opacity-60">HEX</span><input aria-label="Custom accent hex code" aria-invalid={invalid} value={hexInput} maxLength={7} spellCheck={false} onChange={event => { setHexInput(event.target.value); setInvalid(false); }} onBlur={commitHex} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); commitHex(); event.currentTarget.blur(); } }} className="w-20 rounded-lg border px-2 py-1.5 font-mono text-[11px] uppercase outline-offset-2" style={{ background: "color-mix(in srgb, var(--wp-fg) 5%, var(--wp-bg))", borderColor: "color-mix(in srgb, var(--wp-fg) 20%, transparent)" }} /></label>
          </div>
          {invalid && <p role="alert" className="text-[10px]">Enter a hex color such as #22C55E.</p>}
        </div>
      </CollapseMotion>
    </div>
  );
});

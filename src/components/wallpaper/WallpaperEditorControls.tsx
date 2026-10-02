import type { ReactNode } from "react";
import { Check, ChevronDown, Move } from "lucide-react";

interface WallpaperEditorControlsProps {
  editingPhoto: boolean;
  editingGrid: boolean;
  customPhoto: boolean;
  expanded: boolean;
  settings: ReactNode;
  onFinishEditing: () => void;
  onToggleExpanded: () => void;
  onAdjustCrop: () => void;
  onApplyLive: () => void;
  onSetStatic: () => void;
}

export function WallpaperEditorControls({
  editingPhoto,
  editingGrid,
  customPhoto,
  expanded,
  settings,
  onFinishEditing,
  onToggleExpanded,
  onAdjustCrop,
  onApplyLive,
  onSetStatic,
}: WallpaperEditorControlsProps) {
  const editing = editingPhoto || editingGrid;

  return (
    <div className="absolute bottom-6 left-0 right-0 z-50 flex flex-col items-center gap-3.5 px-4 pb-safe pointer-events-none animate-fade-in-up">
      {editing && (
        <button type="button" onClick={onFinishEditing} className="wallpaper-glass-action wallpaper-glass-action--primary pointer-events-auto flex h-12 min-w-32 items-center justify-center gap-2 rounded-full px-6 text-xs font-bold uppercase tracking-wider active:scale-95">
          <Check size={16} /> {editingPhoto ? "Done crop" : "Done"}
        </button>
      )}

      {!editing && (
        <>
          <div className="wallpaper-glass-panel w-full max-w-[420px] rounded-[28px] p-3.5 pointer-events-auto">
            <div className="mb-2 flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/45" aria-label="Wallpaper setup steps">
              <span className="text-white">1 Customize</span>
              <span>→</span>
              <span>2 Position</span>
              <span>→</span>
              <span>3 Apply</span>
            </div>
            <button type="button" onClick={onToggleExpanded} className="mb-1 flex h-7 w-full items-center justify-center gap-1 rounded-full text-[10px] font-bold uppercase tracking-[0.16em] text-white/65 hover:bg-white/10" aria-expanded={expanded}>
              <span>{expanded ? "Hide customization" : "Choose theme and layout"}</span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
            </button>
            <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${expanded ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"}`}>
              {settings}
            </div>
          </div>

          <div className={`grid w-full max-w-[420px] ${customPhoto ? "grid-cols-3" : "grid-cols-2"} gap-2 pointer-events-auto`}>
            {customPhoto && (
              <button type="button" onClick={onAdjustCrop} className="wallpaper-glass-action flex h-11 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-bold uppercase tracking-wider text-white active:scale-95">
                <Move size={14} /> Adjust crop
              </button>
            )}
            <button type="button" onClick={onApplyLive} className="wallpaper-glass-action wallpaper-glass-action--primary flex h-11 items-center justify-center gap-1.5 rounded-full px-2 text-[10px] font-bold uppercase tracking-wider active:scale-95">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Apply Live Wallpaper
            </button>
            <button type="button" onClick={onSetStatic} className="wallpaper-glass-action flex h-11 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-bold uppercase tracking-wider text-white active:scale-95">
              Set Static
            </button>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useSheetMotion } from "../hooks/useSheetMotion";

export function SheetShell({
  onClose,
  title,
  subtitle,
  children,
  priority = 60,
}: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  priority?: number;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const titleId = useId();
  const { surfaceRef, backdropRef, requestClose, dragging, dragHandlers } = useSheetMotion(
    onClose,
    portalTarget !== null,
    priority,
  );

  useLayoutEffect(() => {
    // Keep portals inside the app's theme scope, including light and AMOLED.
    setPortalTarget(anchor.current?.closest("[data-theme]") ?? document.body);
  }, []);

  const content = (
    <div className="grain-sheet-layer" style={{ zIndex: priority }}>
      <div
        ref={backdropRef}
        data-sheet-backdrop
        className="grain-sheet-backdrop"
        onClick={() => requestClose()}
        aria-hidden="true"
      />
      <div
        ref={surfaceRef}
        data-sheet-surface
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="grain-sheet-surface liquid-glass sheet-glass specular text-ink"
      >
        {/* Drag Handle & Header Drag Area */}
        <div
          {...dragHandlers}
          data-sheet-drag-area
          className="group grain-sheet-header cursor-grab active:cursor-grabbing touch-none pb-2"
        >
          <div
            className={`mx-auto mb-3 h-1.5 rounded-full transition-all duration-200 ${
              dragging
                ? "w-16 card-soft"
                : "w-12 bg-[color:var(--surface-pressed)] group-hover:bg-[color:var(--hairline-mid)]"
            }`}
          />
          <div className="flex items-center justify-between">
            <div>
              <h3 id={titleId} className="font-display text-xl font-bold text-ink">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-body">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={() => requestClose()}
              className="grid h-8 w-8 place-items-center rounded-full card-soft text-ink hover:bg-[color:var(--surface-pressed)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grain-sheet-content">{children}</div>
      </div>
    </div>
  );

  return (
    <>
      <span ref={anchor} hidden aria-hidden="true" />
      {portalTarget && createPortal(content, portalTarget)}
    </>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function SheetShell({
  onClose,
  title,
  subtitle,
  children,
}: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const hapticFired = useRef(false);

  const DISMISS_THRESHOLD = 90;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    setIsDragging(true);
    hapticFired.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    const deltaY = e.clientY - startY.current;
    if (deltaY > 0) {
      setDragY(deltaY);
      if (deltaY >= DISMISS_THRESHOLD && !hapticFired.current) {
        hapticFired.current = true;
        try {
          navigator.vibrate?.(18);
        } catch {}
      }
    } else {
      setDragY(deltaY * 0.2);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (dragY >= DISMISS_THRESHOLD) {
      onClose();
    }
    setDragY(0);
    setIsDragging(false);
    startY.current = null;
    hapticFired.current = false;
  };

  const backdropOpacity = Math.max(0.1, 1 - Math.min(0.75, dragY / 300));

  const content = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in transition-opacity"
      style={{ opacity: backdropOpacity }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate3d(0, ${Math.max(0, dragY)}px, 0)`,
          transition: isDragging
            ? "none"
            : "transform 250ms cubic-bezier(0.2, 0.9, 0.3, 1)",
        }}
        className="w-full max-h-[85vh] overflow-y-auto rounded-t-[24px] bg-white/5 backdrop-blur-[40px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.3)] text-white p-5 select-none animate-sheet-slide-up"
      >
        {/* Drag Handle & Header Drag Area */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="group cursor-grab active:cursor-grabbing touch-none pb-2"
        >
          <div
            className={`mx-auto mb-3 h-1.5 rounded-full transition-all duration-200 ${
              dragY >= DISMISS_THRESHOLD
                ? "w-20 bg-rose-500"
                : isDragging
                ? "w-16 bg-white/10 backdrop-blur-[40px] border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                : "w-12 bg-[color:var(--surface-pressed)] group-hover:bg-[color:var(--hairline-mid)]"
            }`}
          />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">{title}</h3>
              {subtitle && <p className="text-xs text-body">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/5 backdrop-blur-[32px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.2)] text-ink hover:bg-[color:var(--surface-pressed)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {children}
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  
  return content;
}

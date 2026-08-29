import React, { useRef, useState, useEffect } from "react";
import { Check, X as XIcon, Shield, Flame } from "lucide-react";
import type { Habit } from "./types";

interface SwipeCardProps {
  habit: Habit;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  isTop: boolean;
  style?: React.CSSProperties;
}

const COMMIT_THRESHOLD = 100;
const HAPTIC_AT = COMMIT_THRESHOLD;

export function SwipeCard({
  habit,
  onSwipeRight,
  onSwipeLeft,
  isTop,
  style,
}: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const dxRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const threshHit = useRef(false);

  useEffect(() => {
    // Reset if it becomes top again (e.g. if we implement undo)
    if (isTop && cardRef.current) {
      cardRef.current.style.transform = `scale(1) translate3d(0,0,0) rotate(0deg)`;
      cardRef.current.style.transition = "transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1)";
      if (overlayRef.current) {
        overlayRef.current.style.opacity = "0";
      }
    }
  }, [isTop]);

  const onDown = (e: React.PointerEvent) => {
    if (!isTop) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    setDragging(true);
    threshHit.current = false;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging || startX.current === null || startY.current === null) return;

    const dx = e.clientX - startX.current;
    dxRef.current = dx;

    // Apply transform
    if (cardRef.current) {
      const rotate = dx * 0.1; // ±15deg approx max
      cardRef.current.style.transform = `scale(1) translate3d(${dx}px, 0, 0) rotate(${rotate}deg)`;
    }

    // Apply overlay opacity and color
    if (overlayRef.current) {
      const progress = Math.min(1, Math.abs(dx) / COMMIT_THRESHOLD);
      overlayRef.current.style.opacity = (progress * 0.8).toString();
      
      if (dx > 0) {
        // Right - Done (Green)
        overlayRef.current.style.background = "color-mix(in oklab, oklch(0.72 0.15 155) 50%, transparent)";
      } else {
        // Left - Skip (Red/Orange)
        overlayRef.current.style.background = "color-mix(in oklab, oklch(0.65 0.18 25) 50%, transparent)";
      }
    }

    // Icon overlay
    if (iconRef.current) {
      if (dx > 0) {
        iconRef.current.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400"><polyline points="20 6 9 17 4 12"></polyline></svg><span class="text-emerald-400 font-bold text-xl mt-2 tracking-widest uppercase">Done</span>`;
      } else {
        iconRef.current.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-rose-400"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg><span class="text-rose-400 font-bold text-xl mt-2 tracking-widest uppercase">Skip</span>`;
      }
      const progress = Math.min(1, Math.abs(dx) / (COMMIT_THRESHOLD * 0.8));
      iconRef.current.style.opacity = progress > 0.5 ? "1" : "0";
      iconRef.current.style.transform = `scale(${0.5 + progress * 0.5})`;
    }

    // Haptics
    if (!threshHit.current && Math.abs(dx) >= HAPTIC_AT) {
      threshHit.current = true;
      try {
        navigator.vibrate?.(18);
      } catch {}
    }
    if (threshHit.current && Math.abs(dx) < HAPTIC_AT - 12) {
      threshHit.current = false;
    }
  };

  const onUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    setDragging(false);

    const finalDx = dxRef.current;
    
    if (Math.abs(finalDx) >= COMMIT_THRESHOLD) {
      // Fly off!
      if (cardRef.current) {
        cardRef.current.style.transition = "transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.4s ease";
        if (finalDx > 0) {
          cardRef.current.style.transform = `translate3d(150vw, 50px, 0) rotate(30deg)`;
          setTimeout(onSwipeRight, 300);
        } else {
          cardRef.current.style.transform = `translate3d(-150vw, 50px, 0) rotate(-30deg)`;
          setTimeout(onSwipeLeft, 300);
        }
        cardRef.current.style.opacity = "0";
      }
    } else {
      // Snap back
      if (cardRef.current) {
        cardRef.current.style.transition = "transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1)";
        cardRef.current.style.transform = `scale(1) translate3d(0, 0, 0) rotate(0deg)`;
      }
      if (overlayRef.current) {
        overlayRef.current.style.transition = "opacity 0.3s ease";
        overlayRef.current.style.opacity = "0";
      }
      if (iconRef.current) {
        iconRef.current.style.transition = "opacity 0.3s ease";
        iconRef.current.style.opacity = "0";
      }
    }

    dxRef.current = 0;
    startX.current = null;
    startY.current = null;
  };

  const catClass = (_c: string) => "bg-canvas-soft text-body border border-[color:var(--hairline)]";

  return (
    <div
      ref={cardRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{
        ...style,
        willChange: "transform",
        transition: dragging ? "none" : "transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1)",
        touchAction: "none", // Prevent scrolling while swiping
      }}
      className={`absolute inset-0 flex flex-col justify-center rounded-[32px] liquid-glass p-8 text-center shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing ${
        !isTop ? "pointer-events-none" : ""
      }`}
    >
      {/* Background Overlay for swiping color */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none mix-blend-overlay z-0 transition-opacity"
        style={{ opacity: 0 }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 pointer-events-none">
        <h2 className="text-4xl font-display font-bold text-ink leading-tight balance">
          {habit.name}
        </h2>
        
        <div className="flex flex-wrap justify-center items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-widest ${catClass(habit.category)}`}>
            {habit.category}
          </span>
          {habit.streak > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-[12px] font-bold text-on-ink">
              <Flame className="w-3.5 h-3.5" /> {habit.streak} Day{habit.streak !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {habit.note && (
          <p className="text-sm italic text-mute/70 mt-2 px-4 balance">
            "{habit.note}"
          </p>
        )}
      </div>

      {/* Center Icon Overlay during drag */}
      <div 
        ref={iconRef}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none opacity-0 transition-opacity duration-200"
      />
    </div>
  );
}

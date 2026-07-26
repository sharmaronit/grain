import React, { useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Droplets,
  Minus,
  MoreVertical,
  Pin,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Quadrant, Habit } from "./types";

const QUADRANTS: Record<Quadrant, { title: string; sub: string }> = {
  q1: { title: "Do first", sub: "Urgent · Important" },
  q2: { title: "Schedule", sub: "Important · Not urgent" },
  q3: { title: "Delegate", sub: "Urgent · Low impact" },
  q4: { title: "Don't do", sub: "Low · Not urgent" },
};

const catClass = (_c: string) =>
  "bg-canvas-soft text-body border border-[color:var(--hairline)]";

export function QuadrantCard({
  q,
  habits,
  timeFilter,
  onToggle,
  onRest,
  onPin,
  onDelete,
  onMove,
  onEdit,
  onAdjust,
  onOpenDetail,
}: {
  q: Quadrant;
  habits: Habit[];
  timeFilter: "all" | "morning" | "afternoon" | "evening";
  onToggle: (i: number) => void;
  onRest: (i: number) => void;
  onPin: (i: number) => void;
  onDelete: (i: number) => void;
  onMove: (i: number) => void;
  onEdit: (i: number) => void;
  onAdjust: (i: number, dir: 1 | -1) => void;
  onOpenDetail: (i: number) => void;
}) {
  const meta = QUADRANTS[q];
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [justDone, setJustDone] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const handleToggle = (i: number) => {
    const wasDone = habits[i].done;
    onToggle(i);
    if (!wasDone) {
      setJustDone(i);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setJustDone(null), 500);
    }
  };

  const visible = habits
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => timeFilter === "all" || h.time === timeFilter);

  const doneCount = visible.filter(({ h }) => h.done).length;

  return (
    <div className="card-soft relative flex w-full flex-col overflow-hidden border border-[color:var(--hairline)] transition-all">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-4 py-3 text-left transition hover:bg-[color:var(--canvas-softer)] active:scale-[0.995]"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          <h3 className="font-display text-sm font-bold text-ink">
            {meta.title}
          </h3>
          <span className="text-[10px] font-medium tracking-wider text-mute">
            · {meta.sub}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium tabular-nums text-mute">
            {doneCount}/{visible.length}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-mute transition-transform duration-200 ${
              collapsed ? "-rotate-90" : "rotate-0"
            }`}
          />
        </div>
      </button>

      {/* Content Area */}
      {!collapsed && (
        <div className="px-3 pb-3 pt-0 space-y-1.5">
          {visible.map(({ h, i }) => (
            <HabitRow
              key={`${h.name}-${i}`}
              habit={h}
              justDone={justDone === i}
              menuOpen={openMenu === i}
              onMenuToggle={() => setOpenMenu(openMenu === i ? null : i)}
              onMenuClose={() => setOpenMenu(null)}
              onToggle={() => handleToggle(i)}
              onRest={() => onRest(i)}
              onPin={() => onPin(i)}
              onDelete={() => onDelete(i)}
              onMove={() => onMove(i)}
              onEdit={() => onEdit(i)}
              onAdjust={(dir) => onAdjust(i, dir)}
              onOpenDetail={() => onOpenDetail(i)}
            />
          ))}
          {visible.length === 0 && (
            <div className="py-2.5 text-center text-[11px] font-medium text-mute">
              No habits scheduled
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HabitRow({
  habit: h,
  justDone,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onToggle,
  onRest,
  onPin,
  onDelete,
  onMove,
  onEdit,
  onAdjust,
  onOpenDetail,
}: {
  habit: Habit;
  justDone: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onToggle: () => void;
  onRest: () => void;
  onPin: () => void;
  onDelete: () => void;
  onMove: () => void;
  onEdit: () => void;
  onAdjust: (dir: 1 | -1) => void;
  onOpenDetail: () => void;
}) {
  const isNumeric = h.target !== undefined && h.target !== null;
  const pct = isNumeric
    ? Math.min(100, ((h.value ?? 0) / (h.target ?? 1)) * 100)
    : 0;

  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const axisLocked = useRef<"x" | "y" | null>(null);
  const threshHit = useRef(false);
  const COMMIT = 88;
  const HAPTIC_AT = 60;

  const rubberband = (v: number) => {
    const abs = Math.abs(v);
    if (abs <= COMMIT) return v;
    const over = abs - COMMIT;
    const damped = COMMIT + over * (1 - over / (over + 140));
    return v < 0 ? -damped : damped;
  };

  const onDown = (e: React.PointerEvent) => {
    if (isNumeric) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    axisLocked.current = null;
    threshHit.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMoveP = (e: React.PointerEvent) => {
    if (isNumeric || startX.current === null || startY.current === null)
      return;
    const rawX = e.clientX - startX.current;
    const rawY = e.clientY - startY.current;
    if (!axisLocked.current) {
      if (Math.abs(rawX) < 6 && Math.abs(rawY) < 6) return;
      axisLocked.current = Math.abs(rawX) > Math.abs(rawY) ? "x" : "y";
    }
    if (axisLocked.current !== "x") return;
    if (!dragging) setDragging(true);
    const val = rubberband(rawX);
    setDx(val);
    if (!threshHit.current && Math.abs(val) >= HAPTIC_AT) {
      threshHit.current = true;
      try {
        navigator.vibrate?.(18);
      } catch {}
    }
    if (threshHit.current && Math.abs(val) < HAPTIC_AT - 12) {
      threshHit.current = false;
    }
  };

  const onUp = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (isNumeric) return;
    const wasDrag = axisLocked.current === "x" && Math.abs(dx) > 6;
    if (dx >= COMMIT) {
      if (!h.done) onToggle();
    } else if (dx <= -COMMIT) {
      onRest();
    }
    setDx(0);
    setDragging(false);
    startX.current = null;
    startY.current = null;
    axisLocked.current = null;
    if (wasDrag) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const swipeProgress = Math.min(1, Math.abs(dx) / COMMIT);
  const rightRevealed = dx > 4;
  const leftRevealed = dx < -4;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl bg-canvas ${
        h.done ? "opacity-70" : ""
      } ${justDone ? "animate-sync-pulse" : ""}`}
    >
      {/* Swipe reveal backgrounds */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1 rounded-l-xl pl-2 pr-2 text-[10px] font-semibold text-emerald-300 transition-opacity"
        style={{
          background:
            "color-mix(in oklab, oklch(0.72 0.15 155) 22%, transparent)",
          opacity: rightRevealed ? 0.4 + swipeProgress * 0.6 : 0,
          width: Math.max(0, dx) + 8,
        }}
      >
        <Check
          className="h-3.5 w-3.5"
          strokeWidth={3}
          style={{ transform: `scale(${0.85 + swipeProgress * 0.4})` }}
        />
        <span>{swipeProgress >= 1 ? "Release" : "Done"}</span>
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center justify-end gap-1 rounded-r-xl pl-2 pr-2 text-[10px] font-semibold text-sky-300 transition-opacity"
        style={{
          background:
            "color-mix(in oklab, oklch(0.72 0.13 235) 22%, transparent)",
          opacity: leftRevealed ? 0.4 + swipeProgress * 0.6 : 0,
          width: Math.max(0, -dx) + 8,
        }}
      >
        <span>{swipeProgress >= 1 ? "Release" : "Rest"}</span>
        <Shield
          className="h-3.5 w-3.5"
          style={{ transform: `scale(${0.85 + swipeProgress * 0.4})` }}
        />
      </div>

      {/* Static hover hints when idle */}
      {!dragging && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden items-center gap-1 rounded-l-xl bg-emerald-500/15 pl-1.5 pr-2 text-[9px] font-semibold text-emerald-300 opacity-0 transition group-hover:flex group-hover:opacity-100">
            <Check className="h-3 w-3" strokeWidth={3} />
            <span>Swipe →</span>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center gap-1 rounded-r-xl bg-sky-500/15 pl-2 pr-1.5 text-[9px] font-semibold text-sky-300 opacity-0 transition group-hover:flex group-hover:opacity-100">
            <span>← Rest</span>
            <Shield className="h-3 w-3" />
          </div>
        </>
      )}

      <div
        onPointerDown={onDown}
        onPointerMove={onMoveP}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={(e) => {
          if (Math.abs(dx) > 6) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onOpenDetail();
        }}
        style={{
          transform: `translate3d(${dx}px,0,0)`,
          transition: dragging
            ? "none"
            : "transform 260ms cubic-bezier(.2,.9,.3,1.2)",
          touchAction: "pan-y",
        }}
        className="relative flex cursor-pointer items-center gap-2 bg-canvas p-2 transition-[background] hover:bg-[color:var(--canvas-softer)]"
      >
        {isNumeric ? (
          <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[color:var(--hairline-mid)] text-ink">
            <Droplets className="h-3 w-3" />
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
              h.done
                ? "border-ink bg-ink text-on-ink"
                : "border-[color:var(--hairline-mid)] hover:border-ink"
            }`}
            aria-label={h.done ? `Undo ${h.name}` : `Mark ${h.name} done`}
          >
            {h.done && (
              <Check className="h-3 w-3 animate-scale-in" strokeWidth={3} />
            )}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[11px] font-semibold leading-tight text-ink ${
              h.done && !isNumeric ? "line-through" : ""
            }`}
          >
            {h.name}
          </p>
          <div className="mt-0.5 flex items-center gap-1">
            <span
              className={`rounded-full px-1.5 py-px text-[8px] font-semibold ${catClass(
                h.category,
              )}`}
            >
              {h.category}
            </span>
            {h.streak > 0 && (
              <span
                key={h.streak}
                className="flex items-center gap-0.5 rounded-full bg-ink px-1.5 py-px text-[8px] font-semibold text-on-ink animate-pop-badge"
              >
                {h.streak}d
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className={`grid h-6 w-6 place-items-center rounded-md transition ${
              h.pinned ? "text-ink" : "text-mute hover:text-ink"
            }`}
            aria-label="Pin to wallpaper"
          >
            <Pin
              className="h-3 w-3"
              fill={h.pinned ? "currentColor" : "none"}
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle();
            }}
            className="grid h-6 w-6 place-items-center rounded-md text-mute hover:text-ink"
            aria-label="More"
          >
            <MoreVertical className="h-3 w-3" />
          </button>
        </div>
      </div>

      {isNumeric && (
        <div
          className="relative bg-canvas px-2 pb-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 flex items-center justify-between text-[9px] font-medium text-body">
            <span className="tabular-nums">
              <span className="text-ink font-semibold">
                {(h.value ?? 0).toFixed(1)}
              </span>
              {" / "}
              {(h.target ?? 0).toFixed(1)} {h.unit}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onAdjust(-1)}
                className="grid h-5 w-5 place-items-center rounded-full bg-canvas-soft text-ink hover:bg-[color:var(--surface-pressed)]"
                aria-label="Decrease"
              >
                <Minus className="h-2.5 w-2.5" strokeWidth={3} />
              </button>
              <button
                type="button"
                onClick={() => onAdjust(1)}
                className="grid h-5 w-5 place-items-center rounded-full bg-ink text-on-ink hover:opacity-90"
                aria-label="Increase"
              >
                <Plus className="h-2.5 w-2.5" strokeWidth={3} />
              </button>
            </div>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-canvas-soft">
            <div
              className="h-full rounded-full bg-emerald-400/80 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="absolute right-1 top-8 z-10 w-28 overflow-hidden rounded-lg border border-[color:var(--hairline)] bg-canvas shadow-xl animate-fade-in">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
              onMenuClose();
            }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[10px] text-ink hover:bg-canvas-soft"
          >
            <Settings className="h-3 w-3" /> Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRest();
              onMenuClose();
            }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[10px] text-ink hover:bg-canvas-soft"
          >
            <Shield className="h-3 w-3" /> Rest day
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMove();
              onMenuClose();
            }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[10px] text-ink hover:bg-canvas-soft"
          >
            <Sparkles className="h-3 w-3" /> Move
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              onMenuClose();
            }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-[10px] text-red-500 hover:bg-canvas-soft"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

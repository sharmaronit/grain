import { memo, useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { usePillMotion } from "../hooks/usePillMotion";
import { usePillPlacement } from "../hooks/usePillPlacement";
import type { AppTab } from "./types";

interface PillNotice {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  action?: { label: string; onClick: () => void };
}
interface Content {
  key: string;
  text: string;
  notice?: PillNotice;
}
const pageTitle = (tab: AppTab, streak: number) =>
  tab === "today"
    ? `Daily habits · ${streak}d streak`
    : tab === "consistency"
      ? `Consistency · ${streak}d streak`
      : tab === "myday"
        ? "My Day"
        : tab === "goal"
          ? "Your goals"
          : "Live wallpaper";

export const GrainPill = memo(function GrainPill({
  tab,
  streak,
  notice,
  onDismissNotice,
  onDetails,
}: {
  tab: AppTab;
  streak: number;
  notice?: PillNotice;
  onDismissNotice: (id: string) => void;
  onDetails: () => void;
}) {
  const placement = usePillPlacement();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<Content>({ key: tab, text: pageTitle(tab, streak) });
  const [previous, setPrevious] = useState<Content | null>(null);
  const contentRef = useRef(content);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const surface = useRef<HTMLButtonElement>(null);
  const copy = useRef<HTMLSpanElement>(null);
  const previousCopy = useRef<HTMLSpanElement>(null);
  const measure = useRef<HTMLSpanElement>(null);
  const dragSurface = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  const suppressClick = useRef(false);
  const gestureAnimation = useRef<Animation | null>(null);
  const seen = useRef<string[]>([]);
  const latestStreak = useRef(streak);
  latestStreak.current = streak;
  const [naturalWidth, setNaturalWidth] = useState(220);
  const show = useCallback((next: Content) => {
    if (timer.current) clearTimeout(timer.current);
    setPrevious(contentRef.current);
    contentRef.current = next;
    setContent(next);
    setExpanded(true);
    timer.current = setTimeout(() => setExpanded(false), 3000);
  }, []);
  useEffect(() => {
    show({ key: tab, text: pageTitle(tab, latestStreak.current) });
  }, [tab, show]);
  useEffect(() => {
    if (!notice || seen.current.includes(notice.id)) return;
    seen.current = [...seen.current.slice(-31), notice.id];
    show({ key: notice.id, text: notice.message, notice });
  }, [notice, show]);
  useEffect(() => {
    if (!measure.current) return;
    const observer = new ResizeObserver(() =>
      setNaturalWidth(measure.current?.getBoundingClientRect().width ?? 220),
    );
    observer.observe(measure.current);
    return () => observer.disconnect();
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      gestureAnimation.current?.cancel();
    },
    [],
  );
  const expandedWidth = Math.min(
    placement.maxWidth,
    Math.max(
      placement.collapsedWidth,
      (placement.camera ? 220 : 164) * placement.scale,
      naturalWidth + (placement.camera ? 28 : 56),
    ),
  );
  const width = expanded ? expandedWidth : placement.collapsedWidth;
  const height = expanded ? placement.expandedHeight : placement.collapsedHeight;
  usePillMotion(surface, copy, previousCopy, width, height, expanded, content.key);
  const dismiss = () => {
    if (timer.current) clearTimeout(timer.current);
    setExpanded(false);
    if (contentRef.current.notice) onDismissNotice(contentRef.current.notice.id);
  };
  const resetDrag = () => {
    const element = dragSurface.current;
    if (!element) return;
    const from = getComputedStyle(element).transform;
    gestureAnimation.current?.cancel();
    element.style.transform = "translate3d(0,0,0)";
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      gestureAnimation.current = element.animate(
        [{ transform: from }, { transform: "translate3d(0,0,0)" }],
        { duration: 450, easing: "cubic-bezier(0.22,1.12,0.36,1)" },
      );
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>, canceled: boolean) => {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* Already released. */
    }
    if (!canceled && (Math.abs(current.dx) > 72 || current.dy < -40)) dismiss();
    else if (expanded) timer.current = setTimeout(() => setExpanded(false), 3000);
    resetDrag();
  };
  const renderCopy = (item: Content) => (
    <>
      <span className="grain-island-message">{item.text}</span>
      {item.notice?.action && (
        <span className="grain-island-action">{item.notice.action.label}</span>
      )}
    </>
  );
  return (
    <div
      className="grain-island-position"
      style={{ left: placement.centerX, top: placement.top, width: placement.maxWidth }}
      data-camera-placement={placement.camera ? "camera" : "below"}
    >
      <div ref={dragSurface} className="grain-island-drag">
        <button
          ref={surface}
          type="button"
          className="grain-island-surface"
          data-expanded={expanded}
          data-kind={expanded ? content.notice?.type : "info"}
          aria-label={
            expanded
              ? `${content.text}${content.notice?.action ? `, ${content.notice.action.label}` : ""}`
              : "Expand Grain pill"
          }
          aria-expanded={expanded}
          title={expanded ? content.text : "Grain"}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            if (!expanded)
              show(
                notice
                  ? { key: notice.id, text: notice.message, notice }
                  : { key: tab, text: pageTitle(tab, streak) },
              );
            else if (content.notice) {
              content.notice.action?.onClick();
              dismiss();
            } else {
              dismiss();
              onDetails();
            }
          }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            suppressClick.current = false;
            const pose = new DOMMatrixReadOnly(
              dragSurface.current ? getComputedStyle(dragSurface.current).transform : "none",
            );
            drag.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              dx: 0,
              dy: 0,
              baseX: pose.m41,
              baseY: pose.m42,
            };
            if (timer.current) clearTimeout(timer.current);
            gestureAnimation.current?.cancel();
            if (dragSurface.current)
              dragSurface.current.style.transform = `translate3d(${pose.m41}px,${pose.m42}px,0)`;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const current = drag.current;
            if (!current || current.id !== event.pointerId) return;
            current.dx = event.clientX - current.x;
            current.dy = event.clientY - current.y;
            suppressClick.current = Math.max(Math.abs(current.dx), Math.abs(current.dy)) > 8;
            if (dragSurface.current)
              dragSurface.current.style.transform = `translate3d(${current.baseX + current.dx * 0.45}px,${current.baseY + current.dy * 0.45}px,0)`;
          }}
          onPointerUp={(event) => endDrag(event, false)}
          onPointerCancel={(event) => endDrag(event, true)}
          onLostPointerCapture={(event) => endDrag(event, true)}
        >
          <span
            className="grain-island-logo"
            style={
              placement.camera
                ? {
                    left: `calc(50% + ${placement.logoCameraOffset}px)`,
                    top: placement.collapsedHeight / 2,
                  }
                : { left: 22 * placement.scale, top: "50%" }
            }
          >
            <img
              src="/icon.png"
              alt=""
              draggable={false}
              className="grain-island-brand"
              style={{ width: 28 * placement.scale, height: 28 * placement.scale }}
            />
            {expanded && content.notice?.type !== "info" && content.notice && (
              <span className="grain-island-status" />
            )}
          </span>
          <span
            className="grain-island-copy-box"
            style={{
              left: placement.camera ? 14 : 44,
              top: placement.camera ? placement.cameraBottom + 8 : height / 2 - 14,
              width: expandedWidth - (placement.camera ? 28 : 56),
            }}
          >
            {previous && (
              <span
                ref={previousCopy}
                className="grain-island-copy grain-island-copy-previous"
                aria-hidden="true"
              >
                {renderCopy(previous)}
              </span>
            )}
            <span ref={copy} className="grain-island-copy" aria-hidden={!expanded}>
              {renderCopy(content)}
            </span>
          </span>
        </button>
        <span ref={measure} className="grain-island-measure" aria-hidden="true">
          {renderCopy(content)}
        </span>
        <span className="sr-only" role="status" aria-live="polite">
          {content.notice?.message}
        </span>
      </div>
    </div>
  );
});

import { useCallback, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { registerOverlayDismissal, requestOverlayClose } from "../lib/overlay-dismissal";

const DURATION = 300;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const SPRING = "cubic-bezier(0.22, 1.18, 0.36, 1)";
const transform = (y: number) => `translate3d(0, ${y}px, 0)`;

export function useSheetDismiss(onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  return useCallback(() => requestOverlayClose(closeRef.current), []);
}

export function useSheetMotion(onClose: () => void, ready: boolean, priority: number) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [dragging, setDragging] = useState(false);
  const phase = useRef<"idle" | "dragging" | "moving" | "closing">("idle");
  const animations = useRef<Animation[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef<number | null>(null);
  const mounted = useRef(false);
  const finished = useRef(false);
  const afterClose = useRef<(() => void) | undefined>(undefined);
  const y = useRef(0);
  const pointer = useRef<{
    id: number;
    start: number;
    base: number;
    previous: number;
    time: number;
    velocity: number;
    travel: number;
  } | null>(null);
  const hapticFired = useRef(false);
  const height = useCallback(() => surfaceRef.current?.offsetHeight || 1, []);
  const threshold = () => Math.min(180, Math.max(90, height() * 0.25));

  const paint = useCallback(
    (position: number) => {
      y.current = position;
      if (surfaceRef.current) surfaceRef.current.style.transform = transform(position);
      if (backdropRef.current)
        backdropRef.current.style.opacity = String(
          Math.max(0, 1 - Math.max(0, position) / height()),
        );
    },
    [height],
  );

  const stop = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const surface = surfaceRef.current;
    const actual = surface
      ? new DOMMatrixReadOnly(getComputedStyle(surface).transform).m42
      : y.current;
    const opacity = backdropRef.current ? getComputedStyle(backdropRef.current).opacity : "1";
    for (const animation of animations.current) {
      animation.onfinish = null;
      animation.cancel();
    }
    animations.current = [];
    if (surface) surface.style.transform = transform(actual);
    if (backdropRef.current) backdropRef.current.style.opacity = opacity;
    y.current = actual;
    return actual;
  }, []);

  const animateTo = useCallback(
    (position: number, spring: boolean, done?: () => void) => {
      const from = stop();
      const surface = surfaceRef.current,
        backdrop = backdropRef.current;
      if (!surface || !backdrop) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced || typeof surface.animate !== "function") {
        paint(position);
        if (phase.current !== "closing") phase.current = "idle";
        done?.();
        return;
      }
      const backdropFrom = Number(getComputedStyle(backdrop).opacity);
      const backdropTo = Math.max(0, 1 - Math.max(0, position) / height());
      const options: KeyframeAnimationOptions = {
        duration: DURATION,
        easing: spring ? SPRING : EASING,
        fill: "forwards",
      };
      const motion = surface.animate(
        [{ transform: transform(from) }, { transform: transform(position) }],
        options,
      );
      const fade = backdrop.animate([{ opacity: backdropFrom }, { opacity: backdropTo }], {
        ...options,
        easing: EASING,
      });
      animations.current = [motion, fade];
      let completed = false;
      const finish = () => {
        if (completed || !mounted.current) return;
        completed = true;
        paint(position);
        for (const animation of animations.current) {
          animation.onfinish = null;
          animation.cancel();
        }
        animations.current = [];
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = null;
        if (phase.current !== "closing") phase.current = "idle";
        done?.();
      };
      motion.onfinish = finish;
      timer.current = setTimeout(finish, DURATION + 80);
    },
    [height, paint, stop],
  );

  const requestClose = useCallback(
    (after?: () => void) => {
      const surface = surfaceRef.current;
      if (after && !finished.current && !afterClose.current) afterClose.current = after;
      if (!surface || phase.current === "closing" || finished.current) return;
      const currentY = stop();
      const restTop = surface.getBoundingClientRect().top - currentY;
      const offscreen = Math.max(surface.offsetHeight + 32, window.innerHeight - restTop + 32);
      phase.current = "closing";
      pointer.current = null;
      setDragging(false);
      surface.inert = true;
      surface.style.pointerEvents = "none";
      if (document.activeElement instanceof HTMLElement && surface.contains(document.activeElement))
        document.activeElement.blur();
      animateTo(offscreen, false, () => {
        if (finished.current) return;
        finished.current = true;
        closeRef.current();
        const complete = afterClose.current;
        afterClose.current = undefined;
        complete?.();
      });
    },
    [animateTo, stop],
  );

  useLayoutEffect(() => {
    if (!ready || !surfaceRef.current) return;
    mounted.current = true;
    finished.current = false;
    const unregister = registerOverlayDismissal({
      close: requestClose,
      owner: () => closeRef.current,
      priority,
    });
    phase.current = "moving";
    paint(height() + 32);
    animateTo(0, false);
    return () => {
      mounted.current = false;
      unregister();
      stop();
      pointer.current = null;
    };
  }, [ready, priority, requestClose, paint, animateTo, stop, height]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      phase.current === "closing" ||
      pointer.current ||
      !event.isPrimary ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest("button, a, input, select, textarea, [role=button]")
    )
      return;
    const base = stop();
    phase.current = "dragging";
    pointer.current = {
      id: event.pointerId,
      start: event.clientY,
      base,
      previous: event.clientY,
      time: event.timeStamp,
      velocity: 0,
      travel: 0,
    };
    hapticFired.current = false;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    const elapsed = event.timeStamp - drag.time;
    if (elapsed > 0) drag.velocity = (event.clientY - drag.previous) / elapsed;
    drag.previous = event.clientY;
    drag.time = event.timeStamp;
    drag.travel = event.clientY - drag.start;
    const position = drag.base + (drag.travel >= 0 ? drag.travel : drag.travel * 0.15);
    y.current = position;
    if (frame.current === null)
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        paint(y.current);
      });
    if (position >= threshold() && !hapticFired.current) {
      hapticFired.current = true;
      try {
        navigator.vibrate?.(12);
      } catch {
        /* Optional feedback. */
      }
    }
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    pointer.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    paint(y.current);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* Capture may already be released. */
    }
    setDragging(false);
    const recentVelocity = event.timeStamp - drag.time <= 100 ? drag.velocity : 0;
    if (
      !cancelled &&
      drag.travel >= 8 &&
      (y.current >= threshold() || (drag.travel >= 24 && recentVelocity > 0.65))
    )
      requestClose();
    else {
      phase.current = "moving";
      animateTo(0, true);
    }
  };

  return {
    surfaceRef,
    backdropRef,
    requestClose,
    dragging,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: PointerEvent<HTMLDivElement>) => endDrag(event, false),
      onPointerCancel: (event: PointerEvent<HTMLDivElement>) => endDrag(event, true),
      onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => endDrag(event, true),
    },
  };
}

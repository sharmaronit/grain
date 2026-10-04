import { useLayoutEffect, useRef, type RefObject } from "react";

const DURATION = 450;
const spring = (t: number) =>
  t === 1 ? 1 : 1 - Math.exp(-8 * t) * (Math.cos(8 * t) + Math.sin(8 * t));

export function usePillMotion(
  surface: RefObject<HTMLButtonElement | null>,
  copy: RefObject<HTMLSpanElement | null>,
  previousCopy: RefObject<HTMLSpanElement | null>,
  width: number,
  height: number,
  expanded: boolean,
  contentKey: string,
) {
  const animations = useRef<Animation[]>([]);
  const lastKey = useRef("");
  useLayoutEffect(() => {
    const element = surface.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const opacity = copy.current ? getComputedStyle(copy.current).opacity : "0";
    for (const animation of animations.current) animation.cancel();
    animations.current = [];
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
    const changed = lastKey.current !== contentKey;
    lastKey.current = contentKey;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      element.style.borderRadius = `${height / 2}px`;
      if (copy.current) {
        copy.current.style.opacity = expanded ? "1" : "0";
        copy.current.style.transform = "translateY(0)";
      }
      if (previousCopy.current) previousCopy.current.style.opacity = "0";
    };
    if (reduced || typeof element.animate !== "function") {
      finish();
      return;
    }
    const frames = Array.from({ length: 31 }, (_, index) => {
      const progress = spring(index / 30);
      const nextHeight = rect.height + (height - rect.height) * progress;
      return {
        width: `${rect.width + (width - rect.width) * progress}px`,
        height: `${nextHeight}px`,
        borderRadius: `${nextHeight / 2}px`,
        offset: index / 30,
      };
    });
    const options: KeyframeAnimationOptions = {
      duration: DURATION,
      fill: "forwards",
      easing: "linear",
    };
    const size = element.animate(frames, options);
    animations.current.push(size);
    if (copy.current)
      animations.current.push(
        copy.current.animate(
          expanded
            ? [
                { opacity: changed ? 0 : opacity, transform: "translateY(3px)", offset: 0 },
                { opacity: 1, transform: "translateY(0)", offset: 0.6 },
                { opacity: 1, transform: "translateY(0)", offset: 1 },
              ]
            : [
                { opacity, offset: 0 },
                { opacity: 0, offset: 0.28 },
                { opacity: 0, offset: 1 },
              ],
          options,
        ),
      );
    if (previousCopy.current)
      animations.current.push(
        previousCopy.current.animate(
          [
            { opacity: changed && expanded ? opacity : 0, transform: "translateY(0)", offset: 0 },
            { opacity: 0, transform: "translateY(-3px)", offset: 0.35 },
            { opacity: 0, offset: 1 },
          ],
          options,
        ),
      );
    size.onfinish = () => {
      finish();
      for (const animation of animations.current) animation.cancel();
      animations.current = [];
    };
    // Keep the current visual pose until the next effect samples it. Cleanup
    // stops callbacks; canceling here would snap interrupted springs to rest.
    return () => {
      size.onfinish = null;
    };
  }, [surface, copy, previousCopy, width, height, expanded, contentKey]);
  useLayoutEffect(
    () => () => {
      for (const animation of animations.current) animation.cancel();
    },
    [],
  );
}

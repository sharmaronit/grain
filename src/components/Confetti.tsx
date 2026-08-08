import React, { useMemo } from "react";

const COLORS = [
  "#FFC700", // yellow
  "#FF0055", // pink
  "#00E5FF", // cyan
  "#8A2BE2", // purple
  "#FF3D00", // orange
  "#00E676", // green
];

export function Confetti({ count = 50 }: { count?: number }) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const left = Math.random() * 100;
      const animationDelay = Math.random() * 2; // 0 to 2s
      const animationDuration = 2 + Math.random() * 2; // 2 to 4s
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const width = 8 + Math.random() * 8;
      const height = width * (0.6 + Math.random() * 0.8);
      const rotate = Math.random() * 360;

      return (
        <div
          key={i}
          className="absolute top-[-10%] rounded-sm opacity-0 animate-[confetti-fall_ease-in_forwards]"
          style={{
            left: `${left}%`,
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: color,
            animationDelay: `${animationDelay}s`,
            animationDuration: `${animationDuration}s`,
            transform: `rotate(${rotate}deg)`,
          }}
        />
      );
    });
  }, [count]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces}
    </div>
  );
}

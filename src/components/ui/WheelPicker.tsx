import React, { useRef, useEffect } from "react";

export const WheelPicker = <T extends string | number>({
  options,
  value,
  onChange,
  itemWidth = 48,
  fontSizeClass = "text-[18px]",
  heightClass = "h-8"
}: {
  options: { key: T; label: string | number }[];
  value: T;
  onChange: (v: T) => void;
  itemWidth?: number;
  fontSizeClass?: string;
  heightClass?: string;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      let idx = options.findIndex(o => o.key === value);
      if (idx === -1) idx = 0;
      scrollRef.current.scrollTo({
        left: idx * itemWidth,
        behavior: 'smooth'
      });
    }
  }, [value, options, itemWidth]);

  return (
    <div
      className={`relative w-full max-w-[240px] mx-auto ${heightClass} flex items-center`}
      style={{
        maskImage: "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
      }}
    >
      <div
        className={`absolute inset-0 m-auto ${heightClass} rounded-full border-[1.5px] border-current pointer-events-none z-10`}
        style={{ width: itemWidth }}
      />
      <div
        ref={scrollRef}
        className="flex items-center overflow-x-auto hide-scrollbar w-full snap-x snap-mandatory"
        onScroll={(e) => {
          const container = e.currentTarget;
          if ((container as any).scrollTimeout) clearTimeout((container as any).scrollTimeout);
          (container as any).scrollTimeout = setTimeout(() => {
            const index = Math.max(0, Math.min(options.length - 1, Math.round(container.scrollLeft / itemWidth)));
            const newValue = options[index].key;
            if (newValue !== value) {
              onChange(newValue);
            }
          }, 100);
        }}
      >
        <div style={{ width: `calc(50% - ${itemWidth / 2}px)` }} className="shrink-0" />
        {options.map((opt) => (
          <button
            key={String(opt.key)}
            onClick={() => onChange(opt.key)}
            style={{ width: itemWidth }}
            className={`snap-center shrink-0 ${heightClass} flex items-center justify-center ${fontSizeClass} tracking-tight font-bold transition-opacity duration-300 ${value === opt.key ? "text-current opacity-100" : "text-current opacity-40 hover:opacity-80"}`}
          >
            {opt.label}
          </button>
        ))}
        <div style={{ width: `calc(50% - ${itemWidth / 2}px)` }} className="shrink-0" />
      </div>
    </div>
  );
};

import { memo, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, Flame, Layers, Sun, Target } from "lucide-react";
import type { AppTab } from "./types";

interface BottomNavigationProps {
  activeTab: AppTab;
  onSwitchTab: (tab: AppTab) => void;
  onOpenDeck: () => void;
  advancedFeaturesUnlocked?: boolean;
}

const primaryTabs = [
  { id: "today", label: "Today", icon: Flame },
  { id: "consistency", label: "Consistency", icon: CalendarDays },
] as const;

const advancedTabs = [
  { id: "myday", label: "My Day", icon: Sun },
  { id: "goal", label: "Goals", icon: Target },
] as const;

export const BottomNavigation = memo(function BottomNavigation({
  activeTab,
  onSwitchTab,
  onOpenDeck,
  advancedFeaturesUnlocked = true,
}: BottomNavigationProps) {
  const tabs = advancedFeaturesUnlocked ? [...primaryTabs, ...advancedTabs] : [...primaryTabs];
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));
  const [pressedTab, setPressedTab] = useState<number | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [lens, setLens] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const nav = navRef.current;
    const activeButton = tabRefs.current[activeIndex];
    if (!nav || !activeButton) return;

    const measure = () => {
      const navBounds = nav.getBoundingClientRect();
      const buttonBounds = activeButton.getBoundingClientRect();
      setLens({
        left: buttonBounds.left - navBounds.left,
        width: buttonBounds.width,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [activeIndex]);

  return (
    <div
      className="fixed left-0 right-0 z-40 h-[64px] pointer-events-none"
      style={{ bottom: "calc(max(var(--sa-bottom, env(safe-area-inset-bottom, 0px)), 6px) + 12px)" }}
    >
      <div className="relative mx-auto h-[64px] w-[min(360px,calc(100vw-1.5rem))]">
        <div className={`absolute inset-y-0 left-0 ${advancedFeaturesUnlocked ? "right-[68px]" : "right-0"}`}>
            <nav
              ref={navRef}
              className="liquid-tabbar pointer-events-auto flex h-[60px] w-full items-center justify-center p-[5px]"
              aria-label="Main navigation"
              data-pressing={pressedTab === null ? undefined : "true"}
            >
              <span
                className="liquid-tabbar-selection"
                style={{ left: `${lens.left}px`, width: `${lens.width}px` }}
                aria-hidden="true"
              />
              {tabs.map((tab, index) => {
                const active = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    ref={(element) => { tabRefs.current[index] = element; }}
                    onPointerDown={() => setPressedTab(index)}
                    onPointerUp={() => setPressedTab(null)}
                    onPointerCancel={() => setPressedTab(null)}
                    onPointerLeave={() => setPressedTab(null)}
                    onClick={() => {
                      onSwitchTab(tab.id);
                      try { navigator.vibrate?.(10); } catch { }
                    }}
                    className={`${active ? "liquid-tabbar-item-active text-ink" : "liquid-tabbar-item text-body hover:text-ink active:scale-95"} flex h-12 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 text-[11px] font-medium transition-all duration-300`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 1.7} />
                    <span className="text-[11px] leading-none">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
        </div>

        {advancedFeaturesUnlocked && <div className="absolute right-0 top-0 h-[60px] w-[60px]">
            <button
              type="button"
              onClick={() => {
                onOpenDeck();
                try { navigator.vibrate?.(10); } catch { }
              }}
              className="liquid-deck-button pointer-events-auto grid h-[60px] w-[60px] place-items-center rounded-full text-ink transition active:scale-95"
              aria-label="Open Deck"
            >
              <Layers className="h-5 w-5" strokeWidth={2} />
            </button>
        </div>}
      </div>
    </div>
  );
});

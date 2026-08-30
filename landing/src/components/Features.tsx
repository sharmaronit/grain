import { LayoutGrid, Flame, Brain, Wallpaper } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";

const FEATURES = [
  {
    icon: LayoutGrid,
    title: "Eisenhower Matrix",
    description: "Prioritize what matters with the 4-quadrant system."
  },
  {
    icon: Flame,
    title: "Streak Engine",
    description: "Never break the chain. Build unshakeable momentum."
  },
  {
    icon: Brain,
    title: "AI Coach",
    description: "Get personalized insights and actionable advice."
  },
  {
    icon: Wallpaper,
    title: "Lock Screen Wallpaper",
    description: "Your habits, always visible on your lock screen."
  }
];

export function Features() {
  const ref = useScrollReveal();

  return (
    <section className="relative z-10" style={{ padding: '160px 0' }}>
      <div ref={ref} className="container reveal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className={`reveal delay-${(idx % 2 + 1) * 100} active flex flex-col items-center text-center p-8`}>
                <div className="grid h-16 w-16 place-items-center text-white mb-6 drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                  <Icon size={36} strokeWidth={1.5} />
                </div>
                <h3 className="font-display font-bold text-2xl text-white mb-4 leading-tight drop-shadow-md">{feat.title}</h3>
                <p className="text-white/70 text-base leading-[1.85] font-medium drop-shadow-sm max-w-[280px]">{feat.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

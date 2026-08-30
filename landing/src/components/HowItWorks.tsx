import { Plus, CheckCircle, TrendingUp } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";

const STEPS = [
  {
    icon: Plus,
    title: "Add Habits",
    description: "Create habits and assign them to your priority quadrants."
  },
  {
    icon: CheckCircle,
    title: "Track Daily",
    description: "Swipe to complete. Build streaks. Stay consistent."
  },
  {
    icon: TrendingUp,
    title: "See Progress",
    description: "Visualize your growth with heatmaps and streaks."
  }
];

export function HowItWorks() {
  const ref = useScrollReveal(0.2);

  return (
    <section className="relative z-10" style={{ padding: '160px 0' }}>
      <div ref={ref} className="container reveal">
        <div className="text-center mb-28">
          <h2 className="font-display text-4xl font-bold tracking-tight text-white drop-shadow-lg mb-6 leading-tight">How it works</h2>
          <p className="text-white/70 text-lg max-w-sm mx-auto drop-shadow-md font-medium leading-[1.8]">A simple, powerful loop to build unbreakable discipline.</p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-24 md:gap-8 max-w-4xl mx-auto">
          {/* Connecting line on desktop */}
          <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-px border-t border-dashed border-white/30 z-0" />

          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className={`relative z-10 flex flex-col items-center text-center reveal delay-${(idx + 1) * 100} active`}>
                <div className="grid h-16 w-16 place-items-center mb-8 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                  <Icon size={40} strokeWidth={1.5} />
                </div>
                <h3 className="font-display font-bold text-2xl text-white drop-shadow-md mb-5 leading-tight">{step.title}</h3>
                <p className="text-white/70 text-base leading-[1.9] drop-shadow-sm font-medium max-w-[220px]">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

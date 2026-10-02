import { useScrollReveal } from "../hooks/useScrollReveal";

export function About() {
  const ref = useScrollReveal();

  return (
    <section className="landing-section relative z-10">
      <div ref={ref} className="landing-copy landing-about reveal text-center">
        <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-white leading-[1.15] drop-shadow-lg mb-8">
          Grain is a habit tracker built around the{" "}
          <span className="text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.6)]">Eisenhower Matrix</span>.
        </h2>
        <p className="text-white/80 md:text-xl leading-[1.9] max-w-xl mx-auto drop-shadow-md font-medium">
          Prioritize what matters, track your streaks, and stay accountable — all in a minimalist, distraction-free interface designed specifically for high performers.
        </p>
      </div>
    </section>
  );
}

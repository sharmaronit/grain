import { useScrollReveal } from "../hooks/useScrollReveal";

const MOCKUPS = [
  { title: "Today View", src: "/screenshots/today_v4.png" },
  { title: "Wallpaper", src: "/screenshots/consistency_v4.png" },
  { title: "Deck", src: "/screenshots/deck_v4.png" }
];

export function Screenshots() {
  const ref = useScrollReveal();

  return (
    <section className="py-32 relative z-10 overflow-hidden">
      <div ref={ref} className="container reveal">
        <div className="flex overflow-x-auto snap-x snap-mandatory pb-12 pt-4 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-3 gap-8 scrollbar-none">
          {MOCKUPS.map((mockup, idx) => (
            <div key={idx} className="flex-none w-[280px] md:w-auto snap-center flex flex-col items-center">
              {/* Phone Frame */}
              <div className="relative w-full aspect-[9/19] rounded-[40px] border-8 border-zinc-900 bg-black shadow-2xl overflow-hidden mb-6 flex items-center justify-center">
                
                {/* Real screenshot */}
                <img src={mockup.src} alt={mockup.title} className="absolute inset-0 w-full h-full object-cover opacity-90" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[32px] pointer-events-none" />
              </div>
              <h4 className="font-display font-semibold text-ink">{mockup.title}</h4>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

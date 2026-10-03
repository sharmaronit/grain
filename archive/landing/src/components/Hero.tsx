import { ChevronDown } from "lucide-react";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useState, useEffect } from "react";
import { LATEST_APK_URL } from "../lib/downloads";

export function Hero() {
  const ref = useScrollReveal();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section 
      className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-10"
      style={{
        transform: `translateY(${scrollY * 0.2}px)`, // Parallax effect
        opacity: Math.max(1 - scrollY / 600, 0)
      }}
    >
      <div ref={ref} className="landing-copy landing-hero-content reveal flex flex-col items-center text-center z-10">
        <h1 className="font-cursive liquid-text text-[90px] md:text-[160px] font-bold leading-none tracking-tighter mb-6 pb-2" style={{ textShadow: '0 4px 32px rgba(255,255,255,0.2)' }}>
          Grain
        </h1>
        <p className="text-body text-lg md:text-2xl font-medium max-w-lg" style={{ marginBottom: '4rem' }}>
          Build 1% better habits. <br className="hidden md:block"/>
          Every single day.
        </p>
        
        <a href={LATEST_APK_URL} className="text-white/90 hover:text-white font-medium text-xl tracking-wide transition-colors underline decoration-2 underline-offset-4" download>
          Download APK
        </a>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-mute opacity-60 animate-bounce z-10">
        <span className="text-xs font-bold uppercase tracking-widest">Scroll</span>
        <ChevronDown size={16} />
      </div>
    </section>
  );
}

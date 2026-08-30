import { useScrollReveal } from "../hooks/useScrollReveal";

export function DownloadCTA() {
  const ref = useScrollReveal();

  return (
    <section className="relative z-10 text-center" style={{ padding: '160px 0' }}>
      <div ref={ref} className="container reveal flex flex-col items-center">
        <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg leading-tight" style={{ marginBottom: '2.5rem' }}>
          Ready to build<br />better habits?
        </h2>
        <p className="text-white/70 text-lg md:text-xl max-w-sm mx-auto leading-[1.9] font-medium" style={{ marginBottom: '4rem' }}>
          Free. No ads. No tracking.
        </p>
        <a href="/grain-tracker-debug.apk" className="text-white/90 hover:text-white font-medium text-xl tracking-wide transition-colors underline decoration-2 underline-offset-4" download>
          Download APK
        </a>
      </div>
    </section>
  );
}

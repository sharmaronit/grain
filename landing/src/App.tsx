import { Hero } from "./components/Hero";
import { About } from "./components/About";
import { HowItWorks } from "./components/HowItWorks";
import { Screenshots } from "./components/Screenshots";
import { Features } from "./components/Features";
import { DownloadCTA } from "./components/DownloadCTA";
import { Footer } from "./components/Footer";

export function App() {
  return (
    <main className="min-h-screen selection:bg-white/20">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="h-full w-full grain-background" />
        <div className="absolute inset-0 bg-black/55" />
      </div>
      
      <Hero />
      <About />
      <HowItWorks />
      <Screenshots />
      <Features />
      <DownloadCTA />
      <Footer />
    </main>
  );
}

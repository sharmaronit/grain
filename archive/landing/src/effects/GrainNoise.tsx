import { useEffect, useRef } from "react";

export function GrainNoise() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    let animationId: number;

    const noiseData = () => {
      const idata = ctx.createImageData(w, h);
      const buffer32 = new Uint32Array(idata.data.buffer);
      const len = buffer32.length;
      for (let i = 0; i < len; i++) {
        if (Math.random() < 0.5) {
          buffer32[i] = 0xffffffff; // white pixel
        } else {
          buffer32[i] = 0x00000000; // transparent
        }
      }
      return idata;
    };

    let noise = noiseData();
    let lastTime = 0;

    const loop = (t: number) => {
      animationId = requestAnimationFrame(loop);
      
      // Update noise every 100ms for cinematic flicker (10fps)
      if (t - lastTime > 100) {
        ctx.putImageData(noise, 0, 0);
        
        // Randomly offset the canvas or generate new noise
        // To be performant, we just translate existing noise
        // But putImageData ignores context transform. 
        // Simplest: just generate smaller chunks or leave static.
        // Actually, static noise with mix-blend-mode looks fine.
        lastTime = t;
      }
    };

    // A static grain is better for performance. 
    ctx.putImageData(noise, 0, 0);

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      noise = noiseData();
      ctx.putImageData(noise, 0, 0);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] mix-blend-overlay"
    />
  );
}

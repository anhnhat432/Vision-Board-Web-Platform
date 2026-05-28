import { useEffect, useRef } from "react";
import { useReducedMotion } from "./use-reduced-motion";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  spin: number;
  spinSpeed: number;
}

export function GlitterCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const isReduced = useReducedMotion();

  useEffect(() => {
    if (isReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Warm sparkling gold, champagne, soft rose, and calm mint emerald tones
    const COLORS = [
      "rgba(212, 175, 55, ",  // Gold
      "rgba(250, 240, 230, ", // Champagne
      "rgba(244, 114, 182, ", // Pastel Pink
      "rgba(52, 211, 153, ",  // Mint Emerald
      "rgba(253, 224, 71, ",  // Warm Yellow
    ];

    let animationFrameId: number;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        
        // Soft gravity and friction
        p.vy += 0.03; // drifting downward slowly
        p.vx *= 0.99; // air friction
        
        p.spin += p.spinSpeed;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.globalAlpha = p.alpha;
        
        // Draw elegant four-point sparkling star shape
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.beginPath();
        const r = p.size;
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.quadraticCurveTo(0, 0, 0, r);
        ctx.quadraticCurveTo(0, 0, -r, 0);
        ctx.quadraticCurveTo(0, 0, 0, -r);
        ctx.closePath();
        ctx.fill();

        // Optional micro core glow for a magical feel
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      if (particles.length > 0) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    const spawnSparks = (x: number, y: number, count = 75) => {
      const particles = particlesRef.current;
      const isFirstSpawn = particles.length === 0;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        // Moderate spread speed for a calm drifting motion
        const speed = 1.2 + Math.random() * 3.8;
        
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5, // initial upward lift
          size: 3.5 + Math.random() * 7,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          alpha: 1.0,
          decay: 0.008 + Math.random() * 0.012, // lasts about 1.5 - 2.5 seconds
          spin: Math.random() * Math.PI * 2,
          spinSpeed: (Math.random() - 0.5) * 0.06,
        });
      }

      if (isFirstSpawn) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ x?: number; y?: number }>;
      const x = customEvent.detail?.x ?? window.innerWidth / 2;
      const y = customEvent.detail?.y ?? window.innerHeight * 0.38;
      spawnSparks(x, y);
    };

    window.addEventListener("trigger-glitter", handleTrigger);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("trigger-glitter", handleTrigger);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isReduced]);

  if (isReduced) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
export default GlitterCanvas;

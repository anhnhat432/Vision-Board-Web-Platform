import { useEffect, useRef } from "react";

export function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    const colors = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#f87171"];
    const particles = Array.from({ length: 65 }).map(() => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 20,
      vx: (Math.random() - 0.5) * 3,
      vy: 2.5 + Math.random() * 3.5,
      size: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)] ?? "#fbbf24",
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
    }));

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height + 20) {
          active = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }

      if (active) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none w-full h-full"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
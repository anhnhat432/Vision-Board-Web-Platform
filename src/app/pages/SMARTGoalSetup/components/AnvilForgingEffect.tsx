import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface AnvilForgingEffectProps {
  onComplete: () => void;
  goalStatement?: string;
}

/* ------------------------------------------------------------------ */
/*  Goal Crystallization Effect                                        */
/*  Replaces the old anvil forge with a refined light-particle effect  */
/* ------------------------------------------------------------------ */

export function AnvilForgingEffect({ onComplete, goalStatement }: AnvilForgingEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shouldReduceMotion =
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [phase, setPhase] = useState<"gathering" | "crystallized">("gathering");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const playChime = useCallback(() => {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: webkitAudioContext fallback
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtxClass();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;

      // Soft bell tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(528, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 2);

      // Harmonic shimmer
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(792, now + 0.15);
      gain2.gain.setValueAtTime(0.06, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 2.4);

      // High sparkle
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(1320, now + 0.3);
      gain3.gain.setValueAtTime(0.03, now + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.3);
      osc3.stop(now + 1.8);
    } catch (_e) {
      /* audio not critical */
    }
  }, []);

  /* ---------- Canvas particle animation ---------- */
  useEffect(() => {
    if (shouldReduceMotion) {
      setPhase("crystallized");
      playChime();
      const timer = setTimeout(onComplete, 1200);
      return () => clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onComplete();
      return;
    }

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    /* --- particle types --- */
    interface LightParticle {
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
      phase: number; // individual oscillation phase
      speed: number; // convergence speed
      converging: boolean;
    }

    interface RingParticle {
      angle: number;
      radius: number;
      size: number;
      alpha: number;
      speed: number;
      color: string;
    }

    const lights: LightParticle[] = [];
    const rings: RingParticle[] = [];

    // Forest Green brand palette (Execution context — không dùng warm/terracotta).
    // Thay drift indigo/violet/lavender bằng các sắc độ xanh rừng để giữ bản sắc.
    const LIGHT_COLORS = [
      "rgba(16, 185, 129, 0.9)", // emerald
      "rgba(52, 211, 153, 0.85)", // emerald lighter
      "rgba(58, 114, 97, 0.8)", // forest (green-600)
      "rgba(42, 84, 71, 0.7)", // deep forest (green-700)
      "rgba(255, 255, 255, 0.9)", // white
      "rgba(91, 165, 144, 0.6)", // mint (accent light)
      "rgba(45, 212, 191, 0.75)", // teal
    ];

    // Spawn initial particles scattered around
    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 180 + Math.random() * Math.max(W, H) * 0.4;
      lights.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        targetX: cx + (Math.random() - 0.5) * 60,
        targetY: cy + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        size: 1.5 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.7,
        color: LIGHT_COLORS[Math.floor(Math.random() * LIGHT_COLORS.length)] ?? LIGHT_COLORS[0],
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.015,
        converging: true,
      });
    }

    // Create orbital ring particles
    for (let i = 0; i < 36; i++) {
      rings.push({
        angle: (i / 36) * Math.PI * 2,
        radius: 100 + Math.random() * 40,
        size: 1 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.5,
        speed: 0.003 + Math.random() * 0.004,
        color: LIGHT_COLORS[Math.floor(Math.random() * LIGHT_COLORS.length)] ?? LIGHT_COLORS[0],
      });
    }

    let animId: number;
    const startTime = Date.now();
    const GATHER_DURATION = 1800;
    const TOTAL_DURATION = 3200;
    let chimePlayed = false;

    const render = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / GATHER_DURATION, 1);
      // Ease-out cubic for smooth convergence
      const eased = 1 - (1 - progress) ** 3;

      // Soft trail effect
      ctx.fillStyle = `rgba(8, 8, 24, ${0.12 + eased * 0.06})`;
      ctx.fillRect(0, 0, W, H);

      // --- Central glow ---
      const glowAlpha = eased * 0.35;
      const glowRadius = 80 + eased * 120;
      const centralGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      centralGlow.addColorStop(0, `rgba(16, 185, 129, ${glowAlpha})`);
      centralGlow.addColorStop(0.3, `rgba(58, 114, 97, ${glowAlpha * 0.5})`);
      centralGlow.addColorStop(0.6, `rgba(42, 84, 71, ${glowAlpha * 0.2})`);
      centralGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = centralGlow;
      ctx.fillRect(0, 0, W, H);

      // --- Converging light particles ---
      for (const p of lights) {
        p.phase += 0.02;

        if (p.converging) {
          // Move towards center with easing
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          p.x += dx * p.speed * (1 + eased * 3);
          p.y += dy * p.speed * (1 + eased * 3);

          // Gentle oscillation
          p.x += Math.sin(p.phase) * (1 - eased) * 1.5;
          p.y += Math.cos(p.phase * 0.7) * (1 - eased) * 1.5;
        }

        // After crystallize, particles drift upward softly
        if (phaseRef.current === "crystallized" && p.converging) {
          p.converging = false;
          p.vx = (Math.random() - 0.5) * 2;
          p.vy = -1 - Math.random() * 2.5;
        }

        if (!p.converging) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy -= 0.01; // Float upward
          p.alpha -= 0.004;
        }

        if (p.alpha <= 0) continue;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);

        // Glowing particle
        const particleGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        particleGlow.addColorStop(0, p.color);
        particleGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = particleGlow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // --- Orbital rings ---
      for (const r of rings) {
        r.angle += r.speed;
        const orbAlpha =
          r.alpha * (phaseRef.current === "crystallized" ? Math.max(0, 1 - (elapsed - GATHER_DURATION) / 1200) : eased);
        if (orbAlpha <= 0) continue;

        const rx = cx + Math.cos(r.angle) * r.radius * (1 - eased * 0.3);
        const ry = cy + Math.sin(r.angle) * r.radius * 0.35 * (1 - eased * 0.3);

        ctx.save();
        ctx.globalAlpha = orbAlpha;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(rx, ry, r.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // --- Crystallize moment ---
      if (elapsed >= GATHER_DURATION && !chimePlayed) {
        chimePlayed = true;
        setPhase("crystallized");
        playChime();

        // Burst: spawn extra sparkle particles
        for (let i = 0; i < 40; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 4;
          lights.push({
            x: cx,
            y: cy,
            targetX: cx,
            targetY: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            size: 1 + Math.random() * 2.5,
            alpha: 0.8 + Math.random() * 0.2,
            color: LIGHT_COLORS[Math.floor(Math.random() * LIGHT_COLORS.length)] ?? LIGHT_COLORS[0],
            phase: 0,
            speed: 0,
            converging: false,
          });
        }
      }

      // --- Flash on crystallize ---
      if (elapsed >= GATHER_DURATION && elapsed < GATHER_DURATION + 400) {
        const flashProgress = (elapsed - GATHER_DURATION) / 400;
        const flashAlpha = (1 - flashProgress) * 0.35;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (elapsed < TOTAL_DURATION) {
        animId = requestAnimationFrame(render);
      } else {
        onComplete();
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [onComplete, playChime, shouldReduceMotion]);

  /* ---------- Goal text ---------- */
  const displayGoal = goalStatement && goalStatement.length > 60 ? `${goalStatement.slice(0, 57)}...` : goalStatement;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-app-bg/90 backdrop-blur-xl" />

      {/* Canvas */}
      {!shouldReduceMotion && <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />}

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center pointer-events-none">
        {/* Badge */}
        <span
          className={`
            inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide
            border shadow-app-lg transition-all duration-500
            ${
              phase === "crystallized"
                ? "border-app-accent/40 bg-app-accent/15 text-app-accent shadow-app-accent/20"
                : "border-app-accent/25 bg-app-accent/8 text-app-accent-hover shadow-app-accent/10"
            }
          `}
        >
          <Sparkles
            className={`h-3.5 w-3.5 transition-colors duration-500 ${
              phase === "crystallized" ? "text-app-accent" : "text-app-accent-hover"
            }`}
          />
          {phase === "gathering" ? "KẾT TINH MỤC TIÊU" : "MỤC TIÊU ĐÃ THÀNH HÌNH"}
        </span>

        {/* Title */}
        <h3
          className={`
            font-serif text-2xl sm:text-3xl font-bold tracking-wide
            transition-all duration-500
            ${
              phase === "crystallized"
                ? "text-app-accent drop-shadow-[0_0_20px_var(--color-app-accent)]"
                : "text-app-ink drop-shadow-[0_0_10px_rgba(12,94,58,0.2)]"
            }
          `}
        >
          {phase === "gathering" ? "Đang kết tinh ý chí..." : "Sẵn sàng hành động!"}
        </h3>

        {/* Goal statement reveal */}
        <div
          className={`
            max-w-sm transition-all duration-500 ease-out
            ${phase === "crystallized" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          `}
        >
          {displayGoal && (
            <p className="font-serif text-base italic leading-relaxed text-app-ink-soft/90">&ldquo;{displayGoal}&rdquo;</p>
          )}
        </div>

        {/* Subtitle */}
        <p
          className={`
            text-xs uppercase tracking-[0.2em] font-semibold transition-all duration-500
            ${phase === "crystallized" ? "text-app-accent/80" : "text-app-accent/60"}
          `}
        >
          {phase === "gathering" ? "Thu thập năng lượng từ mục tiêu của bạn" : "Chuyển sang đánh giá tính khả thi"}
        </p>

        {/* Progress bar */}
        <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-app-surface/60 border border-app-line/40">
          <div
            className={`
              h-full rounded-full transition-all duration-500
              ${
                phase === "crystallized"
                  ? "bg-gradient-to-r from-app-accent via-app-accent-hover to-app-accent shadow-app-sm"
                  : "bg-gradient-to-r from-app-accent-hover via-app-accent to-app-accent-hover shadow-[0_0_8px_rgba(12,94,58,0.3)]"
              }
            `}
            style={{
              width: phase === "gathering" ? "60%" : "100%",
            }}
          />
        </div>
      </div>
    </div>
  );
}

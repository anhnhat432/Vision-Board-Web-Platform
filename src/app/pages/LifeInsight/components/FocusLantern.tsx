import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";

interface FocusLanternProps {
  // biome-ignore lint/suspicious/noExplicitAny: compatibility with custom illustrations and Lucide icons
  Icon: ComponentType<any>;
  label: string;
}

interface FocusLanternColor {
  accentBg: string; // bg class cho lồng đèn khi bình thường
  glowBg: string; // background cho hiệu ứng pulse sau lưng
  activeBg: string; // bg class khi thắp sáng (triggerGlow)
  activeRing: string; // ring class khi triggerGlow
  shadowGlow: string; // shadow class cho lồng đèn
  particleColor: string; // mã HEX cho canvas draw
}

const getLanternColorConfig = (areaName: string): FocusLanternColor => {
  switch (areaName) {
    case "Career":
      return {
        accentBg: "bg-blue-600 text-white",
        glowBg: "bg-blue-400/40",
        activeBg: "bg-blue-500",
        activeRing: "ring-blue-400/30",
        shadowGlow: "shadow-blue-500/30",
        particleColor: "#3b82f6", // Blue
      };
    case "Finance":
      return {
        accentBg: "bg-amber-600 text-white",
        glowBg: "bg-amber-400/40",
        activeBg: "bg-amber-500",
        activeRing: "ring-amber-400/30",
        shadowGlow: "shadow-amber-500/30",
        particleColor: "#f59e0b", // Amber
      };
    case "Health":
      return {
        accentBg: "bg-emerald-600 text-white",
        glowBg: "bg-emerald-400/40",
        activeBg: "bg-emerald-500",
        activeRing: "ring-emerald-400/30",
        shadowGlow: "shadow-emerald-500/30",
        particleColor: "#10b981", // Emerald
      };
    case "Education":
      return {
        accentBg: "bg-indigo-600 text-white",
        glowBg: "bg-indigo-400/40",
        activeBg: "bg-indigo-500",
        activeRing: "ring-indigo-400/30",
        shadowGlow: "shadow-indigo-500/30",
        particleColor: "#6366f1", // Indigo
      };
    case "Relationships":
      return {
        accentBg: "bg-rose-600 text-white",
        glowBg: "bg-rose-400/40",
        activeBg: "bg-rose-500",
        activeRing: "ring-rose-400/30",
        shadowGlow: "shadow-rose-500/30",
        particleColor: "#f43f5e", // Rose
      };
    case "Family":
      return {
        accentBg: "bg-teal-600 text-white",
        glowBg: "bg-teal-400/40",
        activeBg: "bg-teal-500",
        activeRing: "ring-teal-400/30",
        shadowGlow: "shadow-teal-500/30",
        particleColor: "#14b8a6", // Teal
      };
    case "Personal Growth":
      return {
        accentBg: "bg-orange-600 text-white",
        glowBg: "bg-orange-400/40",
        activeBg: "bg-orange-500",
        activeRing: "ring-orange-400/30",
        shadowGlow: "shadow-orange-500/30",
        particleColor: "#f97316", // Orange
      };
    case "Leisure":
      return {
        accentBg: "bg-sky-600 text-white",
        glowBg: "bg-sky-400/40",
        activeBg: "bg-sky-500",
        activeRing: "ring-sky-400/30",
        shadowGlow: "shadow-sky-500/30",
        particleColor: "#0ea5e9", // Sky
      };
    default:
      return {
        accentBg: "bg-app-accent text-white",
        glowBg: "bg-app-accent/20",
        activeBg: "bg-app-accent",
        activeRing: "ring-app-accent/30",
        shadowGlow: "shadow-app-accent/20",
        particleColor: "#8b5cf6", // Default
      };
  }
};

export function FocusLantern({ Icon, label }: FocusLanternProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [triggerGlow, setTriggerGlow] = useState(false);
  const config = getLanternColorConfig(label);

  // Kích hoạt hiệu ứng bừng sáng thắp nến mỗi khi đổi lĩnh vực trọng tâm
  // biome-ignore lint/correctness/useExhaustiveDependencies: restart animation when focus area label changes
  useEffect(() => {
    setTriggerGlow(true);
    const timer = setTimeout(() => setTriggerGlow(false), 1000);
    return () => clearTimeout(timer);
  }, [label]);

  // Tạo hiệu ứng hạt bay lơ lửng bên trong và xung quanh ngọn đèn
  // biome-ignore lint/correctness/useExhaustiveDependencies: restart particle flow when focus area changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Thiết lập kích thước canvas rộng rãi để hạt có không gian bay cao lên phía trên hộp Icon
    canvas.width = 96;
    canvas.height = 140;

    interface SparkleParticle {
      x: number;
      y: number;
      size: number;
      baseSize: number;
      vx: number;
      vy: number;
      alpha: number;
      decay: number;
      wiggleSpeed: number;
      wiggleRange: number;
      phase: number;
    }

    const particles: SparkleParticle[] = [];
    const particleCount = 12; // Tăng nhẹ số lượng hạt

    // Khởi tạo các đốm hạt tập trung ở vùng hộp Icon (nằm ở đáy canvas: x từ 24-72, y từ 92-140)
    for (let i = 0; i < particleCount; i++) {
      const baseSize = 1.0 + Math.random() * 1.8; // Hạt to rõ nét hơn
      particles.push({
        x: 32 + Math.random() * 32,
        y: 100 + Math.random() * 36,
        size: baseSize,
        baseSize,
        vx: 0,
        vy: -0.4 - Math.random() * 0.5, // Bay lên nhanh hơn chút để thấy chuyển động rõ rệt
        alpha: 0.1 + Math.random() * 0.8,
        decay: 0.003 + Math.random() * 0.006, // Bay cao hơn mới tan biến
        wiggleSpeed: 0.03 + Math.random() * 0.05,
        wiggleRange: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, 96, 140);

      for (const p of particles) {
        // Cập nhật vị trí
        p.y += p.vy;
        p.phase += p.wiggleSpeed;
        p.x += Math.sin(p.phase) * p.wiggleRange;

        // Tạo hiệu ứng nhấp nháy lấp lánh (twinkle) cho kích thước hạt
        p.size = p.baseSize * (0.7 + Math.sin(p.phase * 2) * 0.3);

        // Giảm dần độ mờ dựa trên độ cao bay lên (càng lên cao càng mờ)
        const heightRatio = Math.max(0, Math.min(1, p.y / 140));
        p.alpha = heightRatio * 0.9;

        // Giảm dần alpha theo thời gian sống
        p.alpha -= p.decay;

        // Nếu hạt bay quá cao, ra ngoài biên hoặc mờ hẳn, reset về đáy hộp Icon
        if (p.y < 4 || p.alpha <= 0 || p.x < 4 || p.x > 92) {
          p.x = 32 + Math.random() * 32;
          p.y = 120 + Math.random() * 16;
          p.alpha = 0.6 + Math.random() * 0.4;
          p.phase = Math.random() * Math.PI * 2;
        }

        // Vẽ đốm hạt sáng màu sắc theo lĩnh vực
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);

        // Tạo hiệu ứng tỏa sáng mờ cho hạt (shadow glow)
        ctx.shadowBlur = 4;
        ctx.shadowColor = config.particleColor;
        ctx.fillStyle = config.particleColor;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [label, config.particleColor]);

  return (
    <div className="relative select-none shrink-0">
      {/* Canvas vẽ hạt ánh sáng lơ lửng (đặt bao trùm rộng ra phía trên hộp Icon) */}
      <canvas
        ref={canvasRef}
        style={{ width: "96px", height: "140px" }}
        className="absolute -top-[92px] -left-6 pointer-events-none z-30"
      />

      {/* Vòng tròn hào quang phát sáng chậm đệm phía sau */}
      <div
        className={`absolute rounded-xl transition-all duration-1000 pointer-events-none ${
          triggerGlow
            ? `-inset-3.5 opacity-100 scale-125 ${config.glowBg.replace("/40", "/75")} shadow-lg ${config.shadowGlow}`
            : `-inset-1.5 opacity-50 scale-100 animate-[pulse_3s_infinite] ${config.glowBg}`
        }`}
      />

      {/* Khối chứa Icon thắp sáng */}
      <div
        className={`relative z-20 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-500 shadow-md ${
          triggerGlow
            ? `${config.activeBg} text-white scale-110 ${config.shadowGlow} ring-4 ${config.activeRing}`
            : `${config.accentBg} hover:scale-105`
        }`}
      >
        <Icon
          className={`h-5 w-5 transition-transform duration-500 ${triggerGlow ? "rotate-[15deg] scale-110" : ""}`}
        />
      </div>
    </div>
  );
}

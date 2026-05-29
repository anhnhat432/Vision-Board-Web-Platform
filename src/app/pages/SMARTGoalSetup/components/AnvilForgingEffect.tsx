import { useEffect, useRef } from "react";

interface AnvilForgingEffectProps {
  onComplete: () => void;
}

// Bộ tổng hợp tiếng búa rèn đập đe sắt Stoic trầm hùng bằng Web Audio API
const playAnvilClang = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // 1. Tiếng Clang kim loại cao
    const oscClang = ctx.createOscillator();
    const gainClang = ctx.createGain();
    oscClang.type = "sine";
    oscClang.frequency.setValueAtTime(330, ctx.currentTime); // E4 mộc mạc
    oscClang.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);

    // 2. Tiếng hài âm kim loại vang rền (Harmonics)
    const oscHarmonic = ctx.createOscillator();
    const gainHarmonic = ctx.createGain();
    oscHarmonic.type = "triangle";
    oscHarmonic.frequency.setValueAtTime(165, ctx.currentTime); // E3

    // 3. Tiếng Thump nện mạnh ban đầu (Impact)
    const oscThump = ctx.createOscillator();
    const gainThump = ctx.createGain();
    oscThump.type = "sawtooth";
    oscThump.frequency.setValueAtTime(90, ctx.currentTime);
    oscThump.frequency.exponentialRampToValueAtTime(15, ctx.currentTime + 0.3);

    // Cấu hình âm lượng tắt dần theo thời gian (decay)
    gainClang.gain.setValueAtTime(0.25, ctx.currentTime);
    gainClang.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

    gainHarmonic.gain.setValueAtTime(0.15, ctx.currentTime);
    gainHarmonic.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    gainThump.gain.setValueAtTime(0.35, ctx.currentTime);
    gainThump.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    // Kết nối
    oscClang.connect(gainClang);
    oscHarmonic.connect(gainHarmonic);
    oscThump.connect(gainThump);

    gainClang.connect(ctx.destination);
    gainHarmonic.connect(ctx.destination);
    gainThump.connect(ctx.destination);

    // Bắt đầu
    oscClang.start();
    oscHarmonic.start();
    oscThump.start();

    // Dừng
    oscClang.stop(ctx.currentTime + 1.5);
    oscHarmonic.stop(ctx.currentTime + 1.5);
    oscThump.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn("Web Audio API not supported", e);
  }
};

export function AnvilForgingEffect({ onComplete }: AnvilForgingEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      // Gọi onComplete ngay lập tức nếu không hỗ trợ Canvas (ví dụ môi trường test JSDOM) để tránh kẹt trang
      onComplete();
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    interface SparkParticle {
      x: number;
      y: number;
      lastX: number;
      lastY: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
      gravity: number;
      friction: number;
    }

    const particles: SparkParticle[] = [];
    const particleCount = 45; // 45 tia lửa rực rỡ
    const colors = ["#ef4444", "#f97316", "#f59e0b", "#fcd34d", "#ffffff"];

    const centerX = width / 2;
    const centerY = height / 2;

    // Khởi tạo các tia lửa bắn ra từ tâm màn hình
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 16;
      particles.push({
        x: centerX,
        y: centerY,
        lastX: centerX,
        lastY: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3, // Bắn hơi vút lên trên
        size: 1.5 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.8 + Math.random() * 0.2,
        decay: 0.015 + Math.random() * 0.02,
        gravity: 0.35, // Trọng lực kéo tia lửa rơi xuống
        friction: 0.97, // Ma sát không khí làm chậm lại
      });
    }

    // Phát âm thanh rèn sắt rầm rì ngay lập tức
    playAnvilClang();

    let animId: number;
    const startTime = Date.now();

    const render = () => {
      // Làm mờ background nhẹ để lại vệt sáng đuôi (motion blur)
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, width, height);

      let activeParticles = 0;

      for (const p of particles) {
        if (p.alpha <= 0) continue;

        activeParticles++;

        // Lưu lại vị trí cũ
        p.lastX = p.x;
        p.lastY = p.y;

        // Cập nhật vị trí bằng vận tốc vật lý
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;

        // Giảm dần alpha
        p.alpha -= p.decay;

        // Vẽ vệt sáng tia lửa (Streak line)
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = "round";

        // Tỏa sáng neon cho tia lửa Stoic
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        ctx.moveTo(p.lastX, p.lastY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.restore();
      }

      const elapsed = Date.now() - startTime;

      // Hiệu ứng chạy tối đa 1.4 giây hoặc khi tan hết hạt
      if (activeParticles > 0 && elapsed < 1400) {
        animId = requestAnimationFrame(render);
      } else {
        onComplete();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-xs pointer-events-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {/* Thông báo tôi luyện chánh niệm ở tâm */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-white pointer-events-none z-10 transition-all select-none animate-[ping_1.5s_infinite_alternate]">
        <h3 className="font-serif text-3xl font-bold tracking-widest text-amber-400 drop-shadow-lg">
          KỶ LUẬT SẮT
        </h3>
        <p className="mt-2 text-xs uppercase tracking-widest text-amber-200/80 drop-shadow-md">
          Mục tiêu đã được tôi luyện
        </p>
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";

interface AnvilForgingEffectProps {
  onComplete: () => void;
}

// Bộ tổng hợp tiếng chuông thiền ngân vang trong trẻo 528Hz nhẹ nhàng
const playMindfulBell = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    // Tần số Solfeggio 528Hz phục hồi và chánh niệm ngân vang trong trẻo
    osc.frequency.setValueAtTime(528, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime); // Âm lượng siêu nhẹ nhàng, dịu dàng
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5); // Ngân vang nhẹ trong 2.5s

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 2.5);
  } catch (_e) {
    // Thầm lặng bỏ qua nếu trình duyệt chưa sẵn sàng
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
    const particleCount = 35; // Số hạt lấp lánh vừa phải, tinh tế
    const colors = ["#10b981", "#34d399", "#6ee7b7", "#fbbf24", "#ffffff"]; // Tông xanh lá chánh niệm và bụi vàng lấp lánh

    const centerX = width / 2;
    const centerY = height / 2;

    // Khởi tạo bụi sáng lấp lánh bay nhẹ nhàng hướng lên trên
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      particles.push({
        x: centerX,
        y: centerY,
        lastX: centerX,
        lastY: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5, // Chuyển động nhẹ lên trên
        size: 1.0 + Math.random() * 2.0,
        color: colors[Math.floor(Math.random() * colors.length)] ?? "#10b981",
        alpha: 0.7 + Math.random() * 0.3,
        decay: 0.01 + Math.random() * 0.015,
        gravity: -0.04, // Bay lên giống bong bóng hoặc hạt phấn chánh niệm
        friction: 0.98,
      });
    }

    // Phát âm thanh chuông ngân dịu dàng thay vì búa tạ
    playMindfulBell();

    let animId: number;
    const startTime = Date.now();

    const render = () => {
      // Làm mờ background rất nhẹ để tạo hiệu ứng vệt sáng đuôi dịu dàng
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
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

        // Vẽ các đốm sáng lấp lánh
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
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
    <div className="fixed inset-0 z-50 bg-emerald-950/15 backdrop-blur-[2px] pointer-events-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {/* Thông báo gieo hạt mầm chánh niệm ở tâm */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-10 transition-all select-none animate-[ping_1.8s_infinite_alternate]">
        <h3 className="font-serif text-3xl font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 drop-shadow-md">
          GIEO HẠT MẦM
        </h3>
        <p className="mt-2 text-xs uppercase tracking-widest text-emerald-700/80 dark:text-emerald-300/80">
          Mục tiêu của bạn đã sẵn sàng phát triển
        </p>
      </div>
    </div>
  );
}

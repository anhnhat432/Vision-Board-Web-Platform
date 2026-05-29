import { useEffect, useRef } from "react";

// Bộ tổng hợp tiếng giọt nước rơi thanh lọc tâm hồn Stoic bằng Web Audio API
const playWaterDroplet = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    // Tần số quét nhanh từ 580Hz lên 1100Hz tạo tiếng bọt nước "tóc"
    osc.frequency.setValueAtTime(580, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.07);

    // Âm lượng cực kỳ mỏng nhẹ chánh niệm để không làm mất tập trung
    gainNode.gain.setValueAtTime(0.03, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (_e) {
    // Thầm lặng bỏ qua nếu trình duyệt chưa sẵn sàng
  }
};

export function WaterReflectionPool() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastSoundTime = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    interface Ripple {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      alpha: number;
      color: string;
      speed: number;
    }

    const ripples: Ripple[] = [];
    
    // Hàm kích hoạt tiếng giọt nước có throttling tối thiểu 350ms để không bị ồn khi gõ nhanh
    const triggerWaterDroplet = () => {
      const now = Date.now();
      if (now - lastSoundTime.current > 350) {
        playWaterDroplet();
        lastSoundTime.current = now;
      }
    };

    // Lắng nghe sự kiện gõ phím trong bất kỳ textarea viết nhật ký nào trên trang
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (!activeElement || activeElement.tagName !== "TEXTAREA") return;

      // Sinh toạ độ ngẫu nhiên xung quanh khu vực viết (tâm màn hình)
      const rippleX = (width * 0.25) + Math.random() * (width * 0.5);
      const rippleY = (height * 0.3) + Math.random() * (height * 0.4);

      // Thêm gợn sóng chánh niệm
      ripples.push({
        x: rippleX,
        y: rippleY,
        radius: 5,
        maxRadius: 60 + Math.random() * 80,
        alpha: 0.15,
        // Sử dụng tông màu emerald lục nhạt hoặc hổ phách nhạt
        color: Math.random() > 0.5 ? "16, 185, 129" : "245, 158, 11",
        speed: 1.0 + Math.random() * 0.8,
      });

      // Phát âm thanh giọt nước chánh niệm khi gõ Space, Enter hoặc gõ chậm
      if (event.key === " " || event.key === "Enter" || Math.random() > 0.7) {
        triggerWaterDroplet();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        
        // Lan tỏa sóng ra ngoài
        r.radius += r.speed;
        
        // Giảm dần alpha theo bán kính
        const lifeRatio = 1 - r.radius / r.maxRadius;
        r.alpha = lifeRatio * 0.15;

        // Vẽ 2 vòng tròn gợn sóng đồng tâm tạo cảm giác chân thực
        if (r.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = r.alpha;
          
          // Vòng sóng ngoài
          ctx.strokeStyle = `rgba(${r.color}, 0.8)`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.stroke();

          // Vòng sóng trong mờ hơn
          ctx.strokeStyle = `rgba(${r.color}, 0.4)`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
        } else {
          // Xóa gợn sóng đã tan biến
          ripples.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    // Resize canvas khi đổi kích thước màn hình
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-70"
    />
  );
}

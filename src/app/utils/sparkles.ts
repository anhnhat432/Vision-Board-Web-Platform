// Helper tạo hiệu ứng hạt lấp lánh (Sparkles Canvas Particles) khi hoàn thành công việc
export function triggerSparkles(clientX: number, clientY: number) {
  // Nếu người dùng bật chế độ giảm chuyển động, không chạy hiệu ứng hạt để bảo vệ mắt
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    
    // Tọa độ tương đối trên trang (bao gồm cả khoảng scroll)
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    
    canvas.style.position = "absolute";
    canvas.style.left = `${clientX + scrollX - 80}px`;
    canvas.style.top = `${clientY + scrollY - 80}px`;
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      return;
    }

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
    }

    const particles: Particle[] = [];
    const colors = [
      "#fbbf24", // Vàng lấp lánh (amber-400)
      "#f59e0b", // Vàng đậm (amber-500)
      "#d97706", // Hổ phách (amber-600)
      "#10b981", // Emerald chánh niệm
      "#34d399", // Emerald nhạt
    ];

    // Tạo 15-20 hạt lấp lánh bay ra từ tâm (80, 80)
    const count = 16 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.8;
      particles.push({
        x: 80,
        y: 80,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5, // Hơi bay lên trên nhẹ
        size: 1.5 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.02 + Math.random() * 0.03, // Thời gian tồn tại của hạt
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, 160, 160);

      let alive = false;
      for (const p of particles) {
        if (p.alpha > 0) {
          alive = true;
          
          // Cập nhật vị trí
          p.x += p.vx;
          p.y += p.vy;
          
          // Thêm lực cản gió nhẹ và trọng lực rất nhỏ
          p.vx *= 0.95;
          p.vy = (p.vy + 0.05) * 0.95; 
          
          // Giảm độ mờ
          p.alpha -= p.decay;
          
          if (p.alpha > 0) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            
            // Vẽ hạt dạng hình thoi lấp lánh (Sparkle shape) thay vì hình tròn đơn giản
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - p.size);
            ctx.lineTo(p.x + p.size * 0.7, p.y);
            ctx.lineTo(p.x, p.y + p.size);
            ctx.lineTo(p.x - p.size * 0.7, p.y);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
      }

      if (alive) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    };

    animate();
  } catch (e) {
    console.warn("Lỗi khi chạy hiệu ứng hạt lấp lánh: ", e);
  }
}

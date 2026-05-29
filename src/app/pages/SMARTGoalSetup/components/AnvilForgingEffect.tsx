import { useEffect, useRef, useState } from "react";
import { Hammer } from "lucide-react";

interface AnvilForgingEffectProps {
  onComplete: () => void;
}

export function AnvilForgingEffect({ onComplete }: AnvilForgingEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [forgeState, setForgeState] = useState<"forging" | "completed">("forging");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onComplete();
      return;
    }

    // Set kích thước canvas toàn màn hình
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2 + 50; // Đặt đe hơi dịch xuống dưới một chút

    interface SparkParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
      gravity: number;
      friction: number;
    }

    const sparks: SparkParticle[] = [];
    let isHeating = false;
    let shakeIntensity = 0;
    let heatIntensity = 0; // Độ rực đỏ của đe & card

    // Hệ thống hạt tia lửa phát ra từ đe
    const createSparks = (x: number, y: number, count: number) => {
      const colors = ["#ff5722", "#ff9800", "#ffeb3b", "#ffffff", "#e0f2fe"];
      for (let i = 0; i < count; i++) {
        const angle = Math.PI + (Math.random() - 0.5) * (Math.PI * 0.85); // Hướng toả rộng lên trên
        const speed = 4 + Math.random() * 12;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: 1.5 + Math.random() * 3,
          color: colors[Math.floor(Math.random() * colors.length)] ?? "#ff9800",
          alpha: 1,
          decay: 0.015 + Math.random() * 0.02,
          gravity: 0.28, // Trọng lực kéo các tia lửa rơi xuống
          friction: 0.96,
        });
      }
    };

    // Khởi tạo AudioContext an toàn
    const getAudioContext = () => {
      if (!audioCtxRef.current) {
        const AudioCtxClass = window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext;
        if (AudioCtxClass) {
          audioCtxRef.current = new AudioCtxClass();
        }
      }
      return audioCtxRef.current;
    };

    // Hàm phát tiếng đập đe sắt kết hợp tiếng chuông ngân 528Hz chánh niệm
    const playForgeSound = (strikeNum: number) => {
      try {
        const ctxAudio = getAudioContext();
        if (!ctxAudio) return;

        if (ctxAudio.state === "suspended") {
          ctxAudio.resume();
        }

        const now = ctxAudio.currentTime;

        // 1. Tiếng búa va chạm đe sắt (Metal strike)
        const oscStrike = ctxAudio.createOscillator();
        const gainStrike = ctxAudio.createGain();

        // Cao độ tăng nhẹ sau mỗi lần gõ biểu thị thép cứng dần
        const strikeFreq = 900 + strikeNum * 150 + Math.random() * 50;
        oscStrike.type = "sine";
        oscStrike.frequency.setValueAtTime(strikeFreq, now);

        gainStrike.gain.setValueAtTime(0.15, now);
        gainStrike.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        oscStrike.connect(gainStrike);
        gainStrike.connect(ctxAudio.destination);
        oscStrike.start(now);
        oscStrike.stop(now + 0.15);

        // Tiếng ồn lực đập (Thump)
        const oscThump = ctxAudio.createOscillator();
        const gainThump = ctxAudio.createGain();
        oscThump.type = "triangle";
        oscThump.frequency.setValueAtTime(120, now);
        gainThump.gain.setValueAtTime(0.18, now);
        gainThump.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        oscThump.connect(gainThump);
        gainThump.connect(ctxAudio.destination);
        oscThump.start(now);
        oscThump.stop(now + 0.12);

        // 2. Tiếng chuông 528Hz chánh niệm ngân vang (Bell ring)
        const bellOsc = ctxAudio.createOscillator();
        const bellGain = ctxAudio.createGain();

        bellOsc.type = "sine";
        bellOsc.frequency.setValueAtTime(528, now);

        bellGain.gain.setValueAtTime(0.06, now);
        bellGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0); // Ngân vang dịu dàng trong 2s

        bellOsc.connect(bellGain);
        bellGain.connect(ctxAudio.destination);
        bellOsc.start(now);
        bellOsc.stop(now + 2.2);
      } catch (_e) {
        // Thầm lặng bỏ qua nếu trình duyệt chặn phát
      }
    };

    // Vẽ chiếc đe sắt bằng Canvas 2D cách điệu
    const drawAnvil = (c: CanvasRenderingContext2D, ax: number, ay: number, heat: number) => {
      c.save();
      
      // Màu kim loại titan khi nguội, đỏ cam khi bị rèn
      const baseColor = `rgba(${47 + Math.round(heat * 180)}, ${55 + Math.round(heat * 50)}, ${69 - Math.round(heat * 40)}, 1)`;
      const strokeColor = `rgba(${71 + Math.round(heat * 184)}, ${85 + Math.round(heat * 100)}, ${105 - Math.round(heat * 80)}, 1)`;
      
      c.fillStyle = baseColor;
      c.strokeStyle = strokeColor;
      c.lineWidth = 3;
      c.shadowColor = `rgba(249, 115, 22, ${heat})`;
      c.shadowBlur = heat * 25;

      c.beginPath();
      // Bắt đầu từ góc trái sừng đe
      c.moveTo(ax - 90, ay - 10);
      // Sừng đe nhọn uốn cong bên trái
      c.quadraticCurveTo(ax - 40, ay - 10, ax - 40, ay - 25);
      // Mặt đe phẳng chịu lực
      c.lineTo(ax + 60, ay - 25);
      // Đuôi đe vuông góc bên phải
      c.lineTo(ax + 60, ay - 10);
      // Eo đe uốn cong nghệ thuật
      c.quadraticCurveTo(ax + 30, ay + 15, ax + 50, ay + 35);
      // Chân đe rộng vững chãi
      c.lineTo(ax - 50, ay + 35);
      c.quadraticCurveTo(ax - 30, ay + 15, ax - 90, ay - 10);
      c.closePath();
      c.fill();
      c.stroke();
      
      // Vẽ thớ thép phản quang nhẹ trên mặt đe
      c.fillStyle = "rgba(255,255,255,0.06)";
      c.fillRect(ax - 30, ay - 22, 80, 4);
      
      c.restore();
    };

    // Vẽ tấm thẻ bài mục tiêu (Destiny Goal Card) lơ lửng
    const drawCard = (c: CanvasRenderingContext2D, cx: number, cy: number, tiltY: number, heat: number) => {
      c.save();
      
      // Di chuyển gốc vẽ về tâm card để xoay
      c.translate(cx, cy);
      c.rotate(tiltY);

      const cardW = 190;
      const cardH = 110;

      // Glow viền phát sáng
      c.shadowColor = `rgba(16, 185, 129, ${0.4 + heat * 0.4})`;
      c.shadowBlur = 15 + heat * 15;

      // Nền kính mờ
      const gradient = c.createLinearGradient(-cardW / 2, -cardH / 2, cardW / 2, cardH / 2);
      gradient.addColorStop(0, `rgba(${255 - Math.round(heat * 100)}, ${255 - Math.round(heat * 150)}, ${255 - Math.round(heat * 150)}, 0.15)`);
      gradient.addColorStop(1, `rgba(${16 + Math.round(heat * 100)}, ${185 - Math.round(heat * 100)}, ${129 - Math.round(heat * 50)}, 0.12)`);
      c.fillStyle = gradient;

      // Vẽ bo góc card
      c.beginPath();
      c.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
      c.fill();

      // Viền card
      c.strokeStyle = `rgba(255, 255, 255, ${0.35 + heat * 0.45})`;
      c.lineWidth = 1.5;
      c.stroke();

      // Vẽ thớ trang trí góc thẻ bài ma thuật
      c.strokeStyle = `rgba(16, 185, 129, ${0.5 + heat * 0.5})`;
      c.lineWidth = 1;
      c.strokeRect(-cardW / 2 + 5, -cardH / 2 + 5, cardW - 10, cardH - 10);

      // Chữ "MỤC TIÊU SMART"
      c.fillStyle = `rgba(16, 185, 129, ${0.85 + heat * 0.15})`;
      c.font = "bold 9px system-ui";
      c.textAlign = "center";
      c.fillText("🎯 THẺ BÀI MỤC TIÊU", 0, -cardH / 2 + 25);

      // Trạng thái đúc rèn
      c.fillStyle = isHeating ? "#f59e0b" : "#ffffff";
      c.font = "bold italic 13px system-ui";
      c.fillText("ĐANG RÈN ĐÚC...", 0, 8);

      // Icon lấp lánh chòm sao ở góc card
      c.fillStyle = "rgba(255,255,255,0.4)";
      c.beginPath();
      c.arc(-cardW / 2 + 15, -cardH / 2 + 15, 2, 0, Math.PI * 2);
      c.arc(cardW / 2 - 15, -cardH / 2 + 15, 2, 0, Math.PI * 2);
      c.arc(-cardW / 2 + 15, cardH / 2 - 15, 2, 0, Math.PI * 2);
      c.arc(cardW / 2 - 15, cardH / 2 - 15, 2, 0, Math.PI * 2);
      c.fill();

      c.restore();
    };

    let animId: number;
    const startTime = Date.now();
    const hitTimes = [300, 750, 1200]; // Nhịp gõ búa: 300ms, 750ms, 1200ms
    const hitProcessed = [false, false, false];

    const render = () => {
      // Background đen mờ ảo
      ctx.fillStyle = "rgba(10, 15, 30, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const elapsed = Date.now() - startTime;

      // Cập nhật rung màn hình (decay)
      if (shakeIntensity > 0) {
        shakeIntensity *= 0.88;
      }
      // Nguội dần lò rèn (decay)
      if (heatIntensity > 0) {
        heatIntensity *= 0.94;
      }

      ctx.save();
      // Áp dụng rung màn hình bằng cách dịch chuyển gốc tọa độ
      if (shakeIntensity > 0.5) {
        const dx = (Math.random() - 0.5) * shakeIntensity;
        const dy = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(dx, dy);
      }

      // Xử lý các nhịp gõ búa
      hitTimes.forEach((hitTime, idx) => {
        if (elapsed >= hitTime && !hitProcessed[idx]) {
          hitProcessed[idx] = true;
          isHeating = true;
          shakeIntensity = 18; // Lực rung mạnh
          heatIntensity = 1.0;  // Nhiệt lượng đạt đỉnh
          createSparks(cx, cy - 25, 75); // Bắn tia lửa
          playForgeSound(idx + 1); // Phát âm thanh
        }
      });

      // Tắt rực nóng sau khi va chạm qua đi
      if (isHeating && heatIntensity < 0.25) {
        isHeating = false;
      }

      // Cập nhật & Vẽ tia lửa
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        if (p.alpha <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Vẽ chiếc đe sắt
      drawAnvil(ctx, cx, cy, heatIntensity);

      // Tính toán tọa độ lơ lửng của card
      let cardY = cy - 80;
      let cardTilt = Math.sin(elapsed / 180) * 0.03; // Dao động xoay nhẹ

      if (elapsed < hitTimes[0]) {
        // Card bay từ trên trời rơi xuống đe
        const ratio = elapsed / (hitTimes[0] ?? 300);
        cardY = -100 + (cy - 80 + 100) * ratio;
      } else if (elapsed < hitTimes[1]) {
        // Nảy nhẹ lên sau nhịp 1
        const t = (elapsed - (hitTimes[0] ?? 300)) / ((hitTimes[1] ?? 750) - (hitTimes[0] ?? 300));
        cardY = cy - 25 - Math.sin(t * Math.PI) * 45;
        cardTilt += (1 - t) * 0.15; // Xoay mạnh khi nảy
      } else if (elapsed < hitTimes[2]) {
        // Nảy nhẹ lên sau nhịp 2
        const t = (elapsed - (hitTimes[1] ?? 750)) / ((hitTimes[2] ?? 1200) - (hitTimes[1] ?? 750));
        cardY = cy - 25 - Math.sin(t * Math.PI) * 35;
        cardTilt -= (1 - t) * 0.12;
      } else if (elapsed < 1650) {
        // Nảy nhẹ lần cuối sau nhịp 3
        const t = (elapsed - (hitTimes[2] ?? 1200)) / (1650 - (hitTimes[2] ?? 1200));
        cardY = cy - 25 - Math.sin(t * Math.PI) * 15;
      } else {
        // Rèn xong: Card lơ lửng phát sáng và chuyển trạng thái
        cardY = cy - 100 - Math.sin((elapsed - 1650) / 200) * 8;
        if (forgeState !== "completed") {
          setForgeState("completed");
        }
      }

      // Vẽ tấm card mục tiêu
      drawCard(ctx, cx, cardY, cardTilt, heatIntensity);

      ctx.restore();

      // Hiệu ứng kéo dài tối đa 2.2 giây hoặc kết thúc
      if (elapsed < 2350) {
        animId = requestAnimationFrame(render);
      } else {
        onComplete();
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [onComplete, forgeState]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-between items-center py-12 px-6 select-none"
    >
      {/* Canvas vẽ các tia lửa và đúc đe */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Tiêu đề trên cùng */}
      <div className="text-center z-10 pointer-events-none transition-all duration-500 animate-[pulse_3s_infinite]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
          <Hammer className="h-3.5 w-3.5 animate-bounce" />
          LÒ RÈN MỤC TIÊU
        </span>
        <h3 className="mt-3 font-serif text-3xl font-bold tracking-widest text-slate-100 drop-shadow-md">
          {forgeState === "forging" ? "ĐANG ĐÚC THÉP..." : "RÈN ĐÚC THÀNH CÔNG!"}
        </h3>
      </div>

      {/* Thông tin trạng thái dưới cùng */}
      <div className="text-center z-10 pointer-events-none max-w-xs transition-opacity duration-300">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80 font-bold">
          {forgeState === "forging"
            ? "Đang kiên cố hoá ý chí của bạn"
            : "Mục tiêu đã sẵn sàng chuyển hoá thành hành động"}
        </p>
        <div className="mt-3.5 h-1 w-32 mx-auto bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            style={{
              width: forgeState === "forging" ? "65%" : "100%",
            }}
          />
        </div>
      </div>
    </div>
  );
}

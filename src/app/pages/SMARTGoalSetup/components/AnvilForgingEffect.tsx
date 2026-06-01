import { Hammer } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AnvilForgingEffectProps {
  onComplete: () => void;
  goalStatement?: string;
}

export function AnvilForgingEffect({ onComplete, goalStatement }: AnvilForgingEffectProps) {
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

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2 + 50;

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

    interface Shockwave {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      alpha: number;
      color: string;
    }

    interface SmokeParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
      growth: number;
    }

    const sparks: SparkParticle[] = [];
    const shockwaves: Shockwave[] = [];
    const smokes: SmokeParticle[] = [];

    let isHeating = false;
    let shakeIntensity = 0;
    let heatIntensity = 0;

    const createSparks = (x: number, y: number, count: number) => {
      const colors = ["#ff3d00", "#ff9100", "#ffea00", "#ffffff", "#00e5ff"];
      for (let i = 0; i < count; i++) {
        const angle = Math.PI + (Math.random() - 0.5) * (Math.PI * 0.85);
        const speed = 5 + Math.random() * 15;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          size: 1.5 + Math.random() * 3.5,
          color: colors[Math.floor(Math.random() * colors.length)] ?? "#ff9800",
          alpha: 1,
          decay: 0.012 + Math.random() * 0.018,
          gravity: 0.32,
          friction: 0.97,
        });
      }
    };

    const getAudioContext = () => {
      if (!audioCtxRef.current) {
        // biome-ignore lint/suspicious/noExplicitAny: webkitAudioContext fallback for older browsers
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          audioCtxRef.current = new AudioCtxClass();
        }
      }
      return audioCtxRef.current;
    };

    const playForgeSound = (strikeNum: number) => {
      try {
        const ctxAudio = getAudioContext();
        if (!ctxAudio) return;
        if (ctxAudio.state === "suspended") ctxAudio.resume();
        const now = ctxAudio.currentTime;

        const oscStrike = ctxAudio.createOscillator();
        const gainStrike = ctxAudio.createGain();
        const strikeFreq = 850 + strikeNum * 160 + Math.random() * 40;
        oscStrike.type = "sine";
        oscStrike.frequency.setValueAtTime(strikeFreq, now);
        gainStrike.gain.setValueAtTime(0.18, now);
        gainStrike.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        oscStrike.connect(gainStrike);
        gainStrike.connect(ctxAudio.destination);
        oscStrike.start(now);
        oscStrike.stop(now + 0.18);

        const oscThump = ctxAudio.createOscillator();
        const gainThump = ctxAudio.createGain();
        oscThump.type = "triangle";
        oscThump.frequency.setValueAtTime(110, now);
        gainThump.gain.setValueAtTime(0.22, now);
        gainThump.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        oscThump.connect(gainThump);
        gainThump.connect(ctxAudio.destination);
        oscThump.start(now);
        oscThump.stop(now + 0.15);

        const bellOsc = ctxAudio.createOscillator();
        const bellGain = ctxAudio.createGain();
        bellOsc.type = "sine";
        bellOsc.frequency.setValueAtTime(528, now);
        bellGain.gain.setValueAtTime(0.08, now);
        bellGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
        bellOsc.connect(bellGain);
        bellGain.connect(ctxAudio.destination);
        bellOsc.start(now);
        bellOsc.stop(now + 2.4);
      } catch (_e) {}
    };

    const drawAnvil = (c: CanvasRenderingContext2D, ax: number, ay: number, heat: number) => {
      c.save();
      c.fillStyle = "rgba(0, 0, 0, 0.45)";
      c.beginPath();
      c.ellipse(ax, ay + 45, 85, 15, 0, 0, Math.PI * 2);
      c.fill();
      c.shadowColor = `rgba(249, 115, 22, ${heat * 0.85})`;
      c.shadowBlur = heat * 30;
      const baseGrad = c.createLinearGradient(ax - 60, ay + 20, ax + 60, ay + 40);
      baseGrad.addColorStop(0, "#1e293b");
      baseGrad.addColorStop(0.5, "#334155");
      baseGrad.addColorStop(1, "#0f172a");
      c.fillStyle = baseGrad;
      c.beginPath();
      c.moveTo(ax - 65, ay + 40);
      c.lineTo(ax + 65, ay + 40);
      c.lineTo(ax + 50, ay + 20);
      c.lineTo(ax - 50, ay + 20);
      c.closePath();
      c.fill();
      const bodyGrad = c.createLinearGradient(ax - 30, ay - 10, ax + 35, ay + 20);
      bodyGrad.addColorStop(
        0,
        `rgba(${30 + Math.round(heat * 90)}, ${41 + Math.round(heat * 20)}, ${59 - Math.round(heat * 15)}, 1)`,
      );
      bodyGrad.addColorStop(
        0.5,
        `rgba(${51 + Math.round(heat * 140)}, ${65 + Math.round(heat * 40)}, ${85 - Math.round(heat * 30)}, 1)`,
      );
      bodyGrad.addColorStop(
        1,
        `rgba(${15 + Math.round(heat * 40)}, ${23 + Math.round(heat * 10)}, ${42 - Math.round(heat * 10)}, 1)`,
      );
      c.fillStyle = bodyGrad;
      c.beginPath();
      c.moveTo(ax - 45, ay + 20);
      c.lineTo(ax + 45, ay + 20);
      c.quadraticCurveTo(ax + 20, ay + 5, ax + 30, ay - 10);
      c.lineTo(ax - 30, ay - 10);
      c.quadraticCurveTo(ax - 20, ay + 5, ax - 45, ay + 20);
      c.closePath();
      c.fill();
      const headGrad = c.createLinearGradient(ax - 90, ay - 25, ax + 60, ay - 10);
      headGrad.addColorStop(
        0,
        `rgba(${47 + Math.round(heat * 150)}, ${55 + Math.round(heat * 30)}, ${69 - Math.round(heat * 30)}, 1)`,
      );
      headGrad.addColorStop(
        0.4,
        `rgba(${71 + Math.round(heat * 184)}, ${85 + Math.round(heat * 135)}, ${105 - Math.round(heat * 60)}, 1)`,
      );
      headGrad.addColorStop(
        0.8,
        `rgba(${30 + Math.round(heat * 110)}, ${41 + Math.round(heat * 25)}, ${59 - Math.round(heat * 20)}, 1)`,
      );
      headGrad.addColorStop(1, "#0f172a");
      c.fillStyle = headGrad;
      c.beginPath();
      c.moveTo(ax - 95, ay - 10);
      c.quadraticCurveTo(ax - 45, ay - 10, ax - 40, ay - 26);
      c.lineTo(ax + 65, ay - 26);
      c.lineTo(ax + 65, ay - 10);
      c.lineTo(ax - 40, ay - 10);
      c.quadraticCurveTo(ax - 45, ay - 5, ax - 95, ay - 10);
      c.closePath();
      c.fill();
      const plateGrad = c.createLinearGradient(ax - 38, ay - 26, ax + 65, ay - 26);
      plateGrad.addColorStop(
        0,
        `rgba(255, ${160 + Math.round((1 - heat) * 95)}, ${100 + Math.round((1 - heat) * 155)}, ${0.1 + heat * 0.9})`,
      );
      plateGrad.addColorStop(
        0.5,
        `rgba(255, ${220 + Math.round((1 - heat) * 35)}, ${180 + Math.round((1 - heat) * 75)}, ${0.2 + heat * 0.8})`,
      );
      plateGrad.addColorStop(1, "rgba(255,255,255,0.08)");
      c.fillStyle = plateGrad;
      c.beginPath();
      c.roundRect(ax - 38, ay - 26, 103, 3, 1.5);
      c.fill();
      c.restore();
    };

    const drawHammer = (c: CanvasRenderingContext2D, hx: number, hy: number, angle: number, alpha: number) => {
      c.save();
      c.globalAlpha = alpha;
      c.translate(hx, hy);
      c.rotate(angle);
      c.fillStyle = "#8d4f30";
      c.fillRect(-5, -80, 10, 80);
      c.fillStyle = "#475569";
      c.fillRect(-6, -85, 12, 5);
      const grad = c.createLinearGradient(-25, -110, 25, -80);
      grad.addColorStop(0, "#64748b");
      grad.addColorStop(0.5, "#334155");
      grad.addColorStop(1, "#1e293b");
      c.fillStyle = grad;
      c.strokeStyle = "#475569";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-25, -110);
      c.lineTo(25, -110);
      c.lineTo(20, -80);
      c.lineTo(-20, -80);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = "rgba(255,255,255,0.15)";
      c.beginPath();
      c.moveTo(-25, -110);
      c.lineTo(25, -110);
      c.lineTo(20, -103);
      c.lineTo(-20, -103);
      c.closePath();
      c.fill();
      c.restore();
    };

    const drawCard = (c: CanvasRenderingContext2D, cx: number, cy: number, tiltY: number, heat: number) => {
      c.save();
      c.translate(cx, cy);
      c.rotate(tiltY);
      const cardW = 220;
      const cardH = 120;
      const isDone = forgeState === "completed";
      const glowColor = isDone ? "16, 185, 129" : `249, 115, 22`;
      c.shadowColor = `rgba(${glowColor}, ${0.5 + heat * 0.5})`;
      c.shadowBlur = 18 + heat * 18;
      const gradient = c.createLinearGradient(-cardW / 2, -cardH / 2, cardW / 2, cardH / 2);
      if (isDone) {
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.18)");
        gradient.addColorStop(1, "rgba(99, 102, 241, 0.08)");
      } else {
        gradient.addColorStop(
          0,
          `rgba(${255 - Math.round(heat * 50)}, ${145 - Math.round(heat * 145)}, ${50 - Math.round(heat * 50)}, 0.16)`,
        );
        gradient.addColorStop(1, "rgba(16, 185, 129, 0.08)");
      }
      c.fillStyle = gradient;
      c.beginPath();
      c.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 16);
      c.fill();
      c.strokeStyle = isDone ? "rgba(52, 211, 153, 0.6)" : `rgba(255, 255, 255, ${0.35 + heat * 0.45})`;
      c.lineWidth = 1.8;
      c.stroke();
      c.strokeStyle = isDone ? "rgba(16, 185, 129, 0.4)" : `rgba(249, 115, 22, ${0.4 + heat * 0.4})`;
      c.lineWidth = 1;
      c.strokeRect(-cardW / 2 + 6, -cardH / 2 + 6, cardW - 12, cardH - 12);
      c.fillStyle = isDone ? "#34d399" : "#fb923c";
      c.font = "900 9px system-ui";
      c.textAlign = "center";
      c.fillText("🎯 THẺ BÀI MỤC TIÊU", 0, -cardH / 2 + 25);
      if (isDone && goalStatement) {
        c.fillStyle = "#f8fafc";
        c.font = "italic 12px serif";
        const maxLen = 42;
        const cleanGoal = goalStatement.length > maxLen ? goalStatement.slice(0, maxLen - 3) + "..." : goalStatement;
        c.fillText(`“${cleanGoal}”`, 0, 8);
        c.fillStyle = "rgba(52, 211, 153, 0.9)";
        c.font = "700 9px system-ui";
        c.fillText("KẾT CẤU BỀN VỮNG", 0, cardH / 2 - 22);
      } else {
        c.fillStyle = isHeating ? "#f59e0b" : "#ffffff";
        c.font = "italic 700 13px system-ui";
        c.fillText("ĐANG RÈN ĐÚC...", 0, 8);
      }
      c.fillStyle = "rgba(255,255,255,0.45)";
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
    const hitTimes = [300, 750, 1200];
    const hitProcessed = [false, false, false];
    const hammerStrikes = hitTimes.map((hitTime) => ({ start: hitTime - 180, hit: hitTime, end: hitTime + 120 }));

    const render = () => {
      ctx.fillStyle = "rgba(8, 10, 20, 0.18)";
      ctx.fillRect(0, 0, width, height);
      const elapsed = Date.now() - startTime;
      if (shakeIntensity > 0) shakeIntensity *= 0.88;
      if (heatIntensity > 0) heatIntensity *= 0.94;
      if (Math.random() < 0.25) {
        sparks.push({
          x: Math.random() * width,
          y: height + 20,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1.8 - Math.random() * 3.0,
          size: 1 + Math.random() * 2.5,
          color: "#f97316",
          alpha: 0.8,
          decay: 0.003 + Math.random() * 0.005,
          gravity: -0.015,
          friction: 0.99,
        });
      }
      ctx.save();
      if (shakeIntensity > 0.5)
        ctx.translate((Math.random() - 0.5) * shakeIntensity, (Math.random() - 0.5) * shakeIntensity);
      if (heatIntensity > 0) {
        const radialGrad = ctx.createRadialGradient(cx, cy - 25, 10, cx, cy - 25, 280);
        radialGrad.addColorStop(0, `rgba(249, 115, 22, ${heatIntensity * 0.22})`);
        radialGrad.addColorStop(0.5, `rgba(251, 146, 60, ${heatIntensity * 0.08})`);
        radialGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = radialGrad;
        ctx.fillRect(0, 0, width, height);
      }
      hitTimes.forEach((hitTime, idx) => {
        if (elapsed >= hitTime && !hitProcessed[idx]) {
          hitProcessed[idx] = true;
          isHeating = true;
          shakeIntensity = 22;
          heatIntensity = 1.0;
          createSparks(cx, cy - 25, 80);
          shockwaves.push({
            x: cx,
            y: cy - 25,
            radius: 5,
            maxRadius: 220,
            alpha: 1.0,
            color: idx === 2 ? "rgba(52, 211, 153, 0.75)" : "rgba(251, 146, 60, 0.8)",
          });
          for (let i = 0; i < 18; i++) {
            smokes.push({
              x: cx + (Math.random() - 0.5) * 50,
              y: cy - 25,
              vx: (Math.random() - 0.5) * 3.0,
              vy: -1.8 - Math.random() * 2.5,
              size: 12 + Math.random() * 16,
              alpha: 0.55,
              color: "rgba(148, 163, 184, 0.18)",
              growth: 0.3 + Math.random() * 0.3,
            });
          }
          playForgeSound(idx + 1);
        }
      });
      if (isHeating && heatIntensity < 0.25) isHeating = false;
      for (let i = smokes.length - 1; i >= 0; i--) {
        const sm = smokes[i];
        if (sm.alpha <= 0) {
          smokes.splice(i, 1);
          continue;
        }
        sm.x += sm.vx;
        sm.y += sm.vy;
        sm.size += sm.growth;
        sm.alpha -= 0.015;
        ctx.save();
        ctx.globalAlpha = Math.max(0, sm.alpha);
        ctx.fillStyle = sm.color;
        ctx.beginPath();
        ctx.arc(sm.x, sm.y, sm.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
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
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        if (sw.alpha <= 0) {
          shockwaves.splice(i, 1);
          continue;
        }
        sw.radius += 6.5;
        sw.alpha = 1 - sw.radius / sw.maxRadius;
        ctx.save();
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 3.5 - (sw.radius / sw.maxRadius) * 2.5;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      drawAnvil(ctx, cx, cy, heatIntensity);
      let cardY = cy - 80;
      let cardTilt = Math.sin(elapsed / 180) * 0.03;
      if (elapsed < hitTimes[0]) {
        cardY = -100 + (cy - 80 + 100) * (elapsed / hitTimes[0]);
      } else if (elapsed < hitTimes[1]) {
        const t = (elapsed - hitTimes[0]) / (hitTimes[1] - hitTimes[0]);
        cardY = cy - 26 - Math.sin(t * Math.PI) * 45;
        cardTilt += (1 - t) * 0.15;
      } else if (elapsed < hitTimes[2]) {
        const t = (elapsed - hitTimes[1]) / (hitTimes[2] - hitTimes[1]);
        cardY = cy - 26 - Math.sin(t * Math.PI) * 35;
        cardTilt -= (1 - t) * 0.12;
      } else if (elapsed < 1650) {
        const t = (elapsed - hitTimes[2]) / (1650 - hitTimes[2]);
        cardY = cy - 26 - Math.sin(t * Math.PI) * 15;
      } else {
        cardY = cy - 110 - Math.sin((elapsed - 1650) / 200) * 8;
        if (forgeState !== "completed") setForgeState("completed");
      }
      drawCard(ctx, cx, cardY, cardTilt, heatIntensity);
      let drawHammerActive = false;
      let hx = 0,
        hy = 0,
        hAngle = 0,
        hAlpha = 0;
      for (const strike of hammerStrikes) {
        if (elapsed >= strike.start && elapsed <= strike.end) {
          drawHammerActive = true;
          if (elapsed < strike.hit) {
            const ratio = (elapsed - strike.start) / (strike.hit - strike.start);
            const ease = ratio * ratio * ratio;
            hx = cx + 150 + (cx - (cx + 150)) * ease;
            hy = cy - 230 + (cy - 28 - (cy - 230)) * ease;
            hAngle = -Math.PI / 4 + (0 - -Math.PI / 4) * ease;
            hAlpha = ratio;
          } else {
            const ratio = (elapsed - strike.hit) / (strike.end - strike.hit);
            const ease = 1 - (1 - ratio) ** 2;
            hx = cx + (cx - 70 - cx) * ease;
            hy = cy - 28 + (cy - 130 - (cy - 28)) * ease;
            hAngle = 0 + (Math.PI / 10 - 0) * ease;
            hAlpha = 1 - ratio;
          }
          break;
        }
      }
      if (drawHammerActive) drawHammer(ctx, hx, hy, hAngle, hAlpha);
      if (forgeState === "completed") {
        const beamGrad = ctx.createLinearGradient(cx - 70, 0, cx + 70, 0);
        beamGrad.addColorStop(0, "rgba(16, 185, 129, 0)");
        beamGrad.addColorStop(0.5, "rgba(16, 185, 129, 0.15)");
        beamGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
        ctx.fillStyle = beamGrad;
        ctx.fillRect(cx - 70, 0, 140, height);
        const coreBeam = ctx.createLinearGradient(cx - 15, 0, cx + 15, 0);
        coreBeam.addColorStop(0, "rgba(255, 255, 255, 0)");
        coreBeam.addColorStop(0.5, "rgba(255, 255, 255, 0.35)");
        coreBeam.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = coreBeam;
        ctx.fillRect(cx - 15, 0, 30, height);
        if (Math.random() < 0.4) {
          sparks.push({
            x: cx + (Math.random() - 0.5) * 85,
            y: cy - 90,
            vx: (Math.random() - 0.5) * 1.6,
            vy: -4.5 - Math.random() * 4.5,
            size: 1.8 + Math.random() * 2.2,
            color: "#10b981",
            alpha: 1.0,
            decay: 0.008 + Math.random() * 0.012,
            gravity: -0.06,
            friction: 0.98,
          });
        }
      }
      ctx.restore();
      if (elapsed < 2350) animId = requestAnimationFrame(render);
      else onComplete();
    };
    render();
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [onComplete, forgeState, goalStatement]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-between items-center py-12 px-6 select-none"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="text-center z-10 pointer-events-none transition-all duration-500 animate-[pulse_3s_infinite] select-none">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-4 py-1.5 text-xs font-extrabold text-emerald-400 border border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <Hammer className="h-4 w-4 text-emerald-400 animate-[spin_3s_linear_infinite]" />
          LÒ RÈN MỤC TIÊU
        </span>
        <h3 className="mt-3 font-serif text-3xl font-extrabold tracking-widest text-slate-100 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
          {forgeState === "forging" ? "ĐANG ĐÚC THÉP..." : "RÈN ĐÚC THÀNH CÔNG!"}
        </h3>
      </div>
      <div className="text-center z-10 pointer-events-none max-w-xs transition-opacity duration-300 select-none">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-extrabold drop-shadow-[0_1px_5px_rgba(16,185,129,0.2)] animate-pulse">
          {forgeState === "forging"
            ? "Đang kiên cố hoá ý chí của bạn"
            : "Mục tiêu đã sẵn sàng chuyển hoá thành hành động"}
        </p>
        <div className="mt-4 h-1.5 w-36 mx-auto bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
            style={{
              width: forgeState === "forging" ? "65%" : "100%",
            }}
          />
        </div>
      </div>
    </div>
  );
}

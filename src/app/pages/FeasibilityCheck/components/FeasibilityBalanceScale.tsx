import { useMemo, useState, useEffect, useRef } from "react";
import { Gauge, ShieldAlert, BadgeCheck, Sparkles, Zap, TrendingUp, Activity } from "lucide-react";
import { QUESTIONS } from "../constants";

interface FeasibilityBalanceScaleProps {
  answers: Record<number, string>;
}

/* ── Animated counter hook ─────────────────────────────────────────── */
function useAnimatedValue(target: number, duration = 800) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const start = currentRef.current;
    const diff = target - start;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - (1 - progress) ** 3;
      const value = start + diff * eased;
      currentRef.current = value;
      setDisplay(value);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

export function FeasibilityBalanceScale({ answers }: FeasibilityBalanceScaleProps) {
  // ── Tính điểm trung bình khả thi hiện tại ──
  const balanceData = useMemo(() => {
    let totalScore = 0;
    let answeredCount = 0;

    for (const q of QUESTIONS) {
      const answerVal = answers[q.id];
      if (answerVal) {
        const option = q.options.find((opt) => opt.value === answerVal);
        if (option) {
          totalScore += option.score;
          answeredCount++;
        }
      }
    }

    const average = answeredCount > 0 ? totalScore / answeredCount : 2.5;

    // Đưa điểm trung bình (1.0 đến 4.0) về góc xoay kim chỉ hướng (-90 đến +90 độ)
    const normalized = (average - 2.5) / 1.5;
    const needleAngle = normalized * 90;

    return {
      needleAngle,
      average,
      answeredCount,
      totalScore,
      isHeavyLeft: average < 2.3,
      isHeavyRight: average > 2.7,
      isBalanced: average >= 2.3 && average <= 2.7,
    };
  }, [answers]);

  const { needleAngle, average, answeredCount, isHeavyLeft, isHeavyRight, totalScore } = balanceData;

  // ── Animated score ──
  const animatedAverage = useAnimatedValue(answeredCount > 0 ? average : 0, 900);
  const animatedPercent = useAnimatedValue(answeredCount > 0 ? (average / 4) * 100 : 0, 900);

  // ── Axis scores for mini radar ──
  const axisScores = useMemo(() => {
    return QUESTIONS.map((q) => {
      const answerVal = answers[q.id];
      const option = answerVal ? q.options.find((opt) => opt.value === answerVal) : null;
      return {
        axis: q.axis,
        label: q.axisLabel,
        score: option?.score ?? 0,
        answered: Boolean(answerVal),
      };
    });
  }, [answers]);

  // ── Hiệu ứng 3D Mouse-Tilt ──
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTiltStyle({
      transform: `perspective(1200px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) scale3d(1.01, 1.01, 1.01)`,
      transition: "transform 0.08s ease-out",
    });
  };
  const handleMouseLeave = () => {
    setTiltStyle({
      transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
    });
  };

  // ── Emotion sticker ──
  const emotionData = useMemo(() => {
    if (answeredCount === 0) {
      return {
        emoji: "🔮",
        label: "Chờ hiệu chuẩn",
        color: "from-slate-400 to-slate-500",
        bgStyle: "bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 border-slate-200/60 dark:border-slate-700/50",
        glowColor: "rgba(148, 163, 184, 0.15)",
      };
    }
    if (isHeavyLeft) {
      return {
        emoji: "🤯",
        label: "Quá tải · Rào cản lớn",
        color: "from-rose-500 to-red-600",
        bgStyle: "bg-gradient-to-r from-rose-500/10 via-red-500/8 to-orange-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
        glowColor: "rgba(244, 63, 94, 0.2)",
      };
    }
    if (isHeavyRight) {
      return {
        emoji: "🚀",
        label: "Sẵn sàng · Khả thi cao",
        color: "from-emerald-500 to-teal-600",
        bgStyle: "bg-gradient-to-r from-emerald-500/10 via-teal-500/8 to-cyan-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
        glowColor: "rgba(16, 185, 129, 0.2)",
      };
    }
    return {
      emoji: "⚖️",
      label: "Cân bằng · Lý tưởng",
      color: "from-amber-500 to-yellow-600",
      bgStyle: "bg-gradient-to-r from-amber-500/10 via-yellow-500/8 to-emerald-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
      glowColor: "rgba(245, 158, 11, 0.2)",
    };
  }, [answeredCount, isHeavyLeft, isHeavyRight]);

  const statusLabel = () => {
    if (answeredCount === 0) return "Cán cân đang thăng bằng";
    if (isHeavyLeft) return "Rào cản khá nặng nề — Nên tinh gọn bớt việc";
    if (isHeavyRight) return "Mức độ khả thi rất tốt — Sẵn sàng lập kế hoạch";
    return "Cân bằng lý tưởng — Hãy duy trì kỷ luật";
  };

  // ── SVG gauge calculations ──
  const gaugeRadius = 85;
  const gaugeCenterX = 150;
  const gaugeCenterY = 145;

  // Tạo radial ticks tinh tế
  const radialTicks = useMemo(() => {
    const ticks = [];
    for (let angle = 0; angle <= 180; angle += 9) {
      const rad = (angle * Math.PI) / 180;
      const isMajor = angle % 45 === 0;
      const isMid = angle % 18 === 0;
      const r1 = isMajor ? 86 : isMid ? 88 : 90;
      const r2 = 96;
      const x1 = gaugeCenterX - r1 * Math.cos(rad);
      const y1 = gaugeCenterY - r1 * Math.sin(rad);
      const x2 = gaugeCenterX - r2 * Math.cos(rad);
      const y2 = gaugeCenterY - r2 * Math.sin(rad);

      // Color gradient from rose through amber to emerald
      let color = "#f43f5e"; // rose
      if (angle > 45 && angle <= 75) color = "#f97316"; // orange
      else if (angle > 75 && angle <= 105) color = "#f59e0b"; // amber
      else if (angle > 105 && angle <= 135) color = "#84cc16"; // lime
      else if (angle > 135) color = "#10b981"; // emerald

      ticks.push({ x1, y1, x2, y2, color, isMajor, isMid, angle });
    }
    return ticks;
  }, []);

  // Score zone labels along the arc
  const zoneLabels = useMemo(() => {
    const zones = [
      { angle: 15, label: "1.0", size: 9 },
      { angle: 45, label: "1.5", size: 8 },
      { angle: 90, label: "2.5", size: 9 },
      { angle: 135, label: "3.5", size: 8 },
      { angle: 165, label: "4.0", size: 9 },
    ];
    return zones.map((z) => {
      const rad = (z.angle * Math.PI) / 180;
      const r = 106;
      return {
        ...z,
        x: gaugeCenterX - r * Math.cos(rad),
        y: gaugeCenterY - r * Math.sin(rad),
      };
    });
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Mouse events are for decorative 3D tilt effect only
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      className="relative overflow-hidden rounded-2xl border border-white/30 dark:border-slate-700/40 bg-gradient-to-br from-white/80 via-white/60 to-slate-50/80 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-950/80 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.05)] p-0 transition-all duration-300 group"
    >
      {/* ═══ Ambient background effects ═══ */}
      <div
        className="absolute inset-0 opacity-30 dark:opacity-20 pointer-events-none transition-opacity duration-700"
        style={{
          background: `
            radial-gradient(ellipse 50% 50% at 20% 20%, rgba(99, 102, 241, 0.08), transparent),
            radial-gradient(ellipse 50% 50% at 80% 80%, ${emotionData.glowColor}, transparent)
          `,
        }}
      />

      {/* Animated scan line */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-full h-[1px] opacity-[0.07]"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.6), transparent)",
            animation: "feasibility-scan 4s ease-in-out infinite",
          }}
        />
      </div>

      {/* ═══ Header ═══ */}
      <div className="relative z-10 px-5 pt-5 pb-4 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 border border-indigo-500/10">
              <Gauge className="h-4.5 w-4.5 text-indigo-500" />
            </div>
            {/* Live pulse indicator */}
            {answeredCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-indigo-500/70 dark:text-indigo-400/70">
              Đồng hồ khả thi
            </p>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 -mt-0.5">
              12-Week Readiness Gauge
            </p>
          </div>
        </div>

        {/* Score pill */}
        <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
          {answeredCount > 0 && isHeavyRight && (
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Score</span>
          <span className="text-lg font-black tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 leading-none">
            {answeredCount > 0 ? animatedAverage.toFixed(1) : "—"}
          </span>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">/4.0</span>
        </div>
      </div>

      {/* ═══ Main SVG Gauge ═══ */}
      <div className="relative w-full px-5 pt-4 pb-2 flex items-center justify-center select-none">
        <div className="relative w-full max-w-[300px] h-[170px]">
          <svg
            viewBox="0 0 300 180"
            className="w-full h-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              {/* Main arc gradient */}
              <linearGradient id="fbs-arc-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="25%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="75%" stopColor="#84cc16" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>

              {/* Active arc glow gradient */}
              <linearGradient id="fbs-arc-glow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
              </linearGradient>

              {/* Needle glow */}
              <linearGradient id="fbs-needle-grad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#6366f1" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="1" />
              </linearGradient>

              {/* Neon glow filter */}
              <filter id="fbs-neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Soft shadow for hub */}
              <filter id="fbs-hub-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#6366f1" floodOpacity="0.3" />
              </filter>

              {/* Outer glow for arc */}
              <filter id="fbs-arc-outer-glow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outer decorative ring */}
            <path
              d={`M ${gaugeCenterX - 98} ${gaugeCenterY} A 98 98 0 0 1 ${gaugeCenterX + 98} ${gaugeCenterY}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-slate-200/50 dark:text-slate-800/50"
            />

            {/* Radial ticks with color gradient */}
            {radialTicks.map((tick) => (
              <line
                key={tick.angle}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke={tick.color}
                strokeWidth={tick.isMajor ? "2" : tick.isMid ? "1.2" : "0.6"}
                strokeLinecap="round"
                opacity={tick.isMajor ? 0.7 : tick.isMid ? 0.5 : 0.25}
                className="transition-all duration-300"
              />
            ))}

            {/* Score zone number labels */}
            {zoneLabels.map((z) => (
              <text
                key={z.label}
                x={z.x}
                y={z.y - 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={z.size}
                fontWeight="700"
                className="fill-slate-300 dark:fill-slate-600 select-none"
                style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
              >
                {z.label}
              </text>
            ))}

            {/* Background track arc - muted */}
            <path
              d={`M ${gaugeCenterX - gaugeRadius} ${gaugeCenterY} A ${gaugeRadius} ${gaugeRadius} 0 0 1 ${gaugeCenterX + gaugeRadius} ${gaugeCenterY}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className="text-slate-100 dark:text-slate-800/60"
            />

            {/* Active gradient arc with glow */}
            <path
              d={`M ${gaugeCenterX - gaugeRadius} ${gaugeCenterY} A ${gaugeRadius} ${gaugeRadius} 0 0 1 ${gaugeCenterX + gaugeRadius} ${gaugeCenterY}`}
              fill="none"
              stroke="url(#fbs-arc-glow)"
              strokeWidth="14"
              strokeLinecap="round"
              filter="url(#fbs-arc-outer-glow)"
              className="opacity-40"
            />

            {/* Main gradient arc */}
            <path
              d={`M ${gaugeCenterX - gaugeRadius} ${gaugeCenterY} A ${gaugeRadius} ${gaugeRadius} 0 0 1 ${gaugeCenterX + gaugeRadius} ${gaugeCenterY}`}
              fill="none"
              stroke="url(#fbs-arc-gradient)"
              strokeWidth="6"
              strokeLinecap="round"
              className="transition-all duration-500"
            />

            {/* ── Needle assembly ── */}
            <g
              style={{
                transform: `rotate(${needleAngle}deg)`,
                transformOrigin: `${gaugeCenterX}px ${gaugeCenterY}px`,
                transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {/* Needle glow aura */}
              <line
                x1={gaugeCenterX}
                y1={gaugeCenterY}
                x2={gaugeCenterX}
                y2={gaugeCenterY - 70}
                stroke="url(#fbs-needle-grad)"
                strokeWidth="8"
                strokeLinecap="round"
                filter="url(#fbs-neon-glow)"
                className="opacity-60"
              />

              {/* Needle body - tapered */}
              <line
                x1={gaugeCenterX}
                y1={gaugeCenterY + 6}
                x2={gaugeCenterX}
                y2={gaugeCenterY - 68}
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Needle tip arrowhead */}
              <polygon
                points={`${gaugeCenterX - 3.5},${gaugeCenterY - 63} ${gaugeCenterX},${gaugeCenterY - 75} ${gaugeCenterX + 3.5},${gaugeCenterY - 63}`}
                fill="#4f46e5"
                className="drop-shadow-[0_0_4px_rgba(99,102,241,0.8)]"
              />

              {/* Hub multi-layer center */}
              <circle
                cx={gaugeCenterX}
                cy={gaugeCenterY}
                r="12"
                fill="white"
                className="dark:fill-slate-900"
                filter="url(#fbs-hub-shadow)"
              />
              <circle
                cx={gaugeCenterX}
                cy={gaugeCenterY}
                r="10"
                fill="none"
                stroke="#e0e7ff"
                strokeWidth="1"
                className="dark:stroke-slate-700"
              />
              <circle
                cx={gaugeCenterX}
                cy={gaugeCenterY}
                r="6"
                fill="#6366f1"
              />
              <circle
                cx={gaugeCenterX}
                cy={gaugeCenterY}
                r="3"
                fill="white"
                opacity="0.9"
              />
              {/* Tiny specular highlight on hub */}
              <circle
                cx={gaugeCenterX - 1.5}
                cy={gaugeCenterY - 1.5}
                r="1.2"
                fill="white"
                opacity="0.7"
              />
            </g>
          </svg>

          {/* Text nhãn Rào cản / Khả thi */}
          <div className="absolute left-0 bottom-0 flex items-center gap-1.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-rose-200/40 dark:border-rose-800/30 shadow-sm">
            <ShieldAlert className="h-3 w-3 text-rose-500" />
            <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-widest">
              Rào cản
            </span>
          </div>
          <div className="absolute right-0 bottom-0 flex items-center gap-1.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-emerald-200/40 dark:border-emerald-800/30 shadow-sm">
            <BadgeCheck className="h-3 w-3 text-emerald-500" />
            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Khả thi
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Axis Progress Strip ═══ */}
      <div className="relative z-10 px-5 pb-3">
        <div className="flex items-center gap-1">
          {axisScores.map((ax) => {
            const fillHeight = ax.answered ? (ax.score / 4) * 100 : 0;
            const barColor = !ax.answered
              ? "bg-slate-200 dark:bg-slate-800"
              : ax.score >= 3
                ? "bg-gradient-to-t from-emerald-500 to-teal-400"
                : ax.score === 2
                  ? "bg-gradient-to-t from-amber-500 to-yellow-400"
                  : "bg-gradient-to-t from-rose-500 to-red-400";
            const pillBg = !ax.answered
              ? "bg-slate-100 dark:bg-slate-800/60"
              : "bg-slate-100/80 dark:bg-slate-800/40";

            return (
              <div key={ax.axis} className="flex-1 group/axis">
                <div
                  className={`relative h-8 rounded-full overflow-hidden ${pillBg} border border-slate-200/40 dark:border-slate-700/30 transition-all duration-300`}
                  title={`${ax.label}: ${ax.answered ? `${ax.score}/4` : "Chưa trả lời"}`}
                >
                  <div
                    className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-700 ease-out ${barColor}`}
                    style={{ height: `${fillHeight}%` }}
                  />
                  {/* Shimmer effect on filled bars */}
                  {ax.answered && (
                    <div
                      className="absolute inset-0 opacity-0 group-hover/axis:opacity-100 transition-opacity duration-300"
                      style={{
                        background: "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%)",
                      }}
                    />
                  )}
                </div>
                <p className="text-[7px] font-bold text-center text-slate-400 dark:text-slate-500 mt-1 leading-none truncate">
                  {ax.label.split(" ")[0]}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Emotion Badge + Stats Strip ═══ */}
      <div className="relative z-10 px-5 pb-4 space-y-3">
        {/* Emotion badge */}
        <div className="flex items-center justify-center">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.97] shadow-sm ${emotionData.bgStyle}`}
          >
            <span className="text-base" style={{ animation: answeredCount > 0 ? "feasibility-bounce 2s ease-in-out infinite" : undefined }}>
              {emotionData.emoji}
            </span>
            <span className="tracking-wide">{emotionData.label}</span>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center px-2 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-700/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="h-3 w-3 text-indigo-400" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tiến độ</span>
            </div>
            <p className="text-sm font-black tabular-nums text-indigo-600 dark:text-indigo-400">
              {answeredCount}/{QUESTIONS.length}
            </p>
          </div>
          <div className="text-center px-2 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-700/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-violet-400" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Mức sẵn sàng</span>
            </div>
            <p className="text-sm font-black tabular-nums text-violet-600 dark:text-violet-400">
              {answeredCount > 0 ? `${Math.round(animatedPercent)}%` : "—"}
            </p>
          </div>
          <div className="text-center px-2 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-700/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="h-3 w-3 text-amber-400" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tổng điểm</span>
            </div>
            <p className="text-sm font-black tabular-nums text-amber-600 dark:text-amber-400">
              {answeredCount > 0 ? totalScore : "—"}
              <span className="text-[9px] font-bold text-slate-400">/{QUESTIONS.length * 4}</span>
            </p>
          </div>
        </div>

        {/* Status message */}
        <div className="text-center px-4 py-3 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-slate-200/30 dark:border-slate-800/30">
          <p className="text-sm font-bold leading-relaxed text-app-ink">
            {statusLabel()}
          </p>
          <p className="text-xs text-app-ink-muted mt-1 font-medium">
            {answeredCount === 0
              ? "Bắt đầu trả lời các câu hỏi bên dưới để hiệu chuẩn đồng hồ khả thi"
              : `Đã đánh giá ${answeredCount} / ${QUESTIONS.length} khía cạnh khả thi`}
          </p>
        </div>
      </div>

      {/* ═══ Keyframe animations ═══ */}
      <style>{`
        @keyframes feasibility-scan {
          0% { top: -2px; }
          50% { top: 100%; }
          100% { top: -2px; }
        }
        @keyframes feasibility-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}

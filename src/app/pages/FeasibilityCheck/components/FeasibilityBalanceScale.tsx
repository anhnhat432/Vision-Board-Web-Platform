import { useMemo, useState, useEffect, useRef } from "react";
import { Scale, ShieldAlert, BadgeCheck, Sparkles } from "lucide-react";
import { QUESTIONS } from "../constants";

interface FeasibilityBalanceScaleProps {
  answers: Record<number, string>;
}

/* ── Animated counter ──────────────────────────────────────────────── */
function useAnimatedValue(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const start = currentRef.current;
    const diff = target - start;
    if (Math.abs(diff) < 0.001) return;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
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

/* ── Constants ─────────────────────────────────────────────────────── */
const CX = 150;
const CY = 140;
const R = 82;

export function FeasibilityBalanceScale({ answers }: FeasibilityBalanceScaleProps) {
  // ── Score calculations ──
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
    const normalized = (average - 2.5) / 1.5;
    const needleAngle = normalized * 90;

    return {
      needleAngle,
      average,
      answeredCount,
      isHeavyLeft: average < 2.3,
      isHeavyRight: average > 2.7,
    };
  }, [answers]);

  const { needleAngle, average, answeredCount, isHeavyLeft, isHeavyRight } = balanceData;
  const animatedAverage = useAnimatedValue(answeredCount > 0 ? average : 0);

  // ── Per-axis scores ──
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

  // ── 3D Tilt ──
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTiltStyle({
      transform: `perspective(1200px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg) scale3d(1.01, 1.01, 1.01)`,
      transition: "transform 0.1s ease-out",
    });
  };
  const handleMouseLeave = () => {
    setTiltStyle({
      transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
    });
  };

  // ── Status label + color ──
  const statusInfo = useMemo(() => {
    if (answeredCount === 0) {
      return { label: "Cán cân đang thăng bằng", sub: "Trả lời các câu hỏi bên dưới để hiệu chuẩn cán cân khả thi", emoji: "🔮", color: "#94a3b8", badgeClass: "bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-slate-200/60 dark:border-slate-700/50" };
    }
    if (isHeavyLeft) {
      return { label: "Rào cản khá nặng nề — Nên tinh gọn bớt việc", sub: `Đã đánh giá ${answeredCount}/${QUESTIONS.length} khía cạnh`, emoji: "🤯", color: "#f43f5e", badgeClass: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40" };
    }
    if (isHeavyRight) {
      return { label: "Mức độ khả thi rất tốt — Sẵn sàng lập kế hoạch", sub: `Đã đánh giá ${answeredCount}/${QUESTIONS.length} khía cạnh`, emoji: "🚀", color: "#10b981", badgeClass: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40" };
    }
    return { label: "Cân bằng lý tưởng — Hãy duy trì kỷ luật", sub: `Đã đánh giá ${answeredCount}/${QUESTIONS.length} khía cạnh`, emoji: "⚖️", color: "#f59e0b", badgeClass: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40" };
  }, [answeredCount, isHeavyLeft, isHeavyRight]);

  // ── SVG Tick marks ──
  const radialTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i <= 36; i++) {
      const angle = (i / 36) * 180;
      const rad = (angle * Math.PI) / 180;
      const isMajor = i % 9 === 0;
      const isMid = i % 3 === 0;

      const r1 = isMajor ? R + 4 : isMid ? R + 6 : R + 8;
      const r2 = R + 14;
      const x1 = CX - r1 * Math.cos(rad);
      const y1 = CY - r1 * Math.sin(rad);
      const x2 = CX - r2 * Math.cos(rad);
      const y2 = CY - r2 * Math.sin(rad);

      // Smooth color interpolation
      const t = i / 36;
      let cr: number, cg: number, cb: number;
      if (t < 0.33) {
        const p = t / 0.33;
        cr = 244 + (245 - 244) * p; cg = 63 + (158 - 63) * p; cb = 94 + (11 - 94) * p;
      } else if (t < 0.66) {
        const p = (t - 0.33) / 0.33;
        cr = 245 + (16 - 245) * p; cg = 158 + (185 - 158) * p; cb = 11 + (129 - 11) * p;
      } else {
        const p = (t - 0.66) / 0.34;
        cr = 16; cg = 185 + (200 - 185) * p; cb = 129 + (150 - 129) * p;
      }

      ticks.push({
        x1, y1, x2, y2, isMajor, isMid, angle,
        color: `rgb(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)})`,
      });
    }
    return ticks;
  }, []);

  // Arc half-circle path
  const arcD = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Decorative 3D tilt effect only
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/60 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)] p-5 flex flex-col items-center gap-4 transition-all duration-300 group"
    >
      {/* ═══ Header ═══ */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
            <Scale className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Đồng hồ khả thi 12 tuần
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-800/60">
          {answeredCount > 0 && isHeavyRight && (
            <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
          )}
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Điểm</span>
          <span className="text-sm font-extrabold tabular-nums text-indigo-600 dark:text-indigo-400" style={{ fontFeatureSettings: "'tnum'" }}>
            {answeredCount > 0 ? animatedAverage.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">/4.0</span>
        </div>
      </div>

      {/* ═══ SVG Gauge ═══ */}
      <div className="relative w-full max-w-[280px] h-[150px] flex items-center justify-center select-none">
        <svg viewBox="0 0 300 170" className="w-full h-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="fbs-arc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="65%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            <linearGradient id="fbs-needle" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.85" />
            </linearGradient>

            <filter id="fbs-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="fbs-hub" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#6366f1" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* ── Tick marks ── */}
          {radialTicks.map((t) => (
            <line
              key={t.angle}
              x1={t.x1} y1={t.y1}
              x2={t.x2} y2={t.y2}
              stroke={t.color}
              strokeWidth={t.isMajor ? "2" : t.isMid ? "1" : "0.5"}
              strokeLinecap="round"
              opacity={t.isMajor ? 0.55 : t.isMid ? 0.3 : 0.12}
            />
          ))}

          {/* ── Track (background arc) ── */}
          <path
            d={arcD}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            className="text-slate-100 dark:text-slate-800/50"
          />

          {/* ── Gradient arc ── */}
          <path
            d={arcD}
            fill="none"
            stroke="url(#fbs-arc)"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* ── Gradient arc glow ── */}
          <path
            d={arcD}
            fill="none"
            stroke="url(#fbs-arc)"
            strokeWidth="16"
            strokeLinecap="round"
            filter="url(#fbs-glow)"
            opacity="0.15"
          />

          {/* ── Needle assembly ── */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: `${CX}px ${CY}px`,
              transition: "transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Needle glow */}
            <line
              x1={CX} y1={CY}
              x2={CX} y2={CY - 72}
              stroke="url(#fbs-needle)"
              strokeWidth="6"
              strokeLinecap="round"
              filter="url(#fbs-glow)"
              opacity="0.5"
            />

            {/* Needle body */}
            <line
              x1={CX} y1={CY + 4}
              x2={CX} y2={CY - 70}
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Needle tip */}
            <polygon
              points={`${CX - 2.5},${CY - 65} ${CX},${CY - 76} ${CX + 2.5},${CY - 65}`}
              fill="#4f46e5"
              opacity="0.9"
            />

            {/* Hub — multi-layer */}
            <circle cx={CX} cy={CY} r="10" className="fill-white dark:fill-slate-900" filter="url(#fbs-hub)" />
            <circle cx={CX} cy={CY} r="8" fill="none" stroke="#e2e8f0" strokeWidth="0.5" className="dark:stroke-slate-700" />
            <circle cx={CX} cy={CY} r="4.5" fill="#6366f1" />
            <circle cx={CX} cy={CY} r="1.8" fill="white" opacity="0.85" />
          </g>
        </svg>

        {/* ── Edge labels ── */}
        <div className="absolute left-0 bottom-0 flex items-center gap-1">
          <ShieldAlert className="h-3 w-3 text-rose-400" />
          <span className="text-[9px] font-bold text-rose-500/70 dark:text-rose-400/60 uppercase tracking-wider">
            Rào cản
          </span>
        </div>
        <div className="absolute right-0 bottom-0 flex items-center gap-1">
          <BadgeCheck className="h-3 w-3 text-emerald-400" />
          <span className="text-[9px] font-bold text-emerald-500/70 dark:text-emerald-400/60 uppercase tracking-wider">
            Khả thi
          </span>
        </div>
      </div>

      {/* ═══ Axis breakdown — subtle inline bars ═══ */}
      <div className="w-full space-y-1">
        {axisScores.map((ax) => {
          const pct = ax.answered ? (ax.score / 4) * 100 : 0;
          const barColor = !ax.answered
            ? "bg-slate-100 dark:bg-slate-800"
            : ax.score >= 3
              ? "bg-emerald-500"
              : ax.score === 2
                ? "bg-amber-500"
                : "bg-rose-500";

          return (
            <div key={ax.axis} className="flex items-center gap-2.5">
              <span className={`text-[11px] w-[88px] shrink-0 truncate font-medium transition-colors ${ax.answered ? "text-slate-600 dark:text-slate-300" : "text-slate-300 dark:text-slate-700"}`}>
                {ax.label}
              </span>
              <div className="flex-1 h-[5px] rounded-full bg-slate-100 dark:bg-slate-800/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span
                className={`text-[11px] font-semibold tabular-nums w-5 text-right transition-colors ${ax.answered ? (ax.score >= 3 ? "text-emerald-600 dark:text-emerald-400" : ax.score === 2 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400") : "text-slate-300 dark:text-slate-700"}`}
                style={{ fontFeatureSettings: "'tnum'" }}
              >
                {ax.answered ? ax.score : "·"}
              </span>
            </div>
          );
        })}
      </div>

      {/* ═══ Status badge ═══ */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all duration-300 ${statusInfo.badgeClass}`}>
        <span className="text-sm">{statusInfo.emoji}</span>
        <span>{statusInfo.label}</span>
      </div>

      {/* ═══ Description ═══ */}
      <div className="w-full text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          {statusInfo.sub}
        </p>
      </div>
    </div>
  );
}

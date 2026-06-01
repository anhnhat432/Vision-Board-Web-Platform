import { Scale, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
    const normalized = answeredCount > 0 ? (average - 2.5) / 1.5 : 0;
    const tiltAngle = normalized * 18; // từ -18 độ đến +18 độ

    return {
      tiltAngle,
      average,
      answeredCount,
      isHeavyLeft: average < 2.3,
      isHeavyRight: average > 2.7,
    };
  }, [answers]);

  const { tiltAngle, average, answeredCount, isHeavyLeft, isHeavyRight } = balanceData;
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
      return {
        label: "Cán cân đang thăng bằng",
        sub: "Trả lời các câu hỏi bên dưới để hiệu chuẩn cán cân khả thi",
        emoji: "🔮",
        color: "#94a3b8",
        badgeClass: "bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-slate-200/60 dark:border-slate-700/50",
      };
    }
    if (isHeavyLeft) {
      return {
        label: "Cán cân nghiêng về rào cản — Nên tinh gọn bớt việc",
        sub: `Đã đánh giá ${answeredCount}/${QUESTIONS.length} khía cạnh`,
        emoji: "⚖️",
        color: "#f43f5e",
        badgeClass:
          "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40",
      };
    }
    if (isHeavyRight) {
      return {
        label: "Cán cân thăng bằng rất tốt — Sẵn sàng lập kế hoạch",
        sub: `Đã đánh giá ${answeredCount}/${QUESTIONS.length} khía cạnh`,
        emoji: "✨",
        color: "#10b981",
        badgeClass:
          "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40",
      };
    }
    return {
      label: "Thăng bằng lý tưởng — Hãy duy trì kỷ luật",
      sub: `Đã đánh giá ${answeredCount}/${QUESTIONS.length} khía cạnh`,
      emoji: "⚖️",
      color: "#f59e0b",
      badgeClass:
        "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40",
    };
  }, [answeredCount, isHeavyLeft, isHeavyRight]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Decorative 3D tilt effect only
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/60 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_12px_24px_rgba(0,0,0,0.03)] p-6 flex flex-col items-center gap-5 transition-all duration-300 group"
    >
      {/* ═══ Header ═══ */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
            <Scale className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Cán cân thăng bằng 12 tuần
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-800/60">
          {answeredCount > 0 && isHeavyRight && <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />}
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Mức khả thi</span>
          <span
            className="text-sm font-extrabold tabular-nums text-indigo-600 dark:text-indigo-400"
            style={{ fontFeatureSettings: "'tnum'" }}
          >
            {answeredCount > 0 ? (animatedAverage * 2.5 * 10).toFixed(0) : "—"}%
          </span>
        </div>
      </div>

      {/* ═══ SVG Cán Cân Thăng Bằng Dreamy ═══ */}
      <div className="relative w-full max-w-[280px] h-[160px] flex flex-col items-center justify-center select-none">
        <svg viewBox="0 0 300 170" className="w-full h-full overflow-visible" aria-hidden="true">
          <defs>
            <filter id="fbs-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* 1. Trụ đỡ trung tâm (cột chống) */}
          {/* Chân đế dẹt */}
          <rect x="110" y="145" width="80" height="8" rx="4" className="fill-slate-200 dark:fill-slate-800/80" />
          <path d="M 120 145 L 180 145 L 170 135 L 130 135 Z" className="fill-slate-200/60 dark:fill-slate-800/40" />
          {/* Thân trụ */}
          <rect x="147" y="60" width="6" height="80" rx="1.5" className="fill-slate-300 dark:fill-slate-700/60" />
          {/* Khớp trục quay */}
          <circle cx="150" cy="60" r="5" className="fill-slate-400 dark:fill-slate-600" />
          <circle cx="150" cy="60" r="2.2" className="fill-white dark:fill-slate-900" />

          {/* 2. Thanh ngang beam (Xoay theo tiltAngle quanh 150, 60) */}
          <g
            style={{
              transform: `rotate(${tiltAngle}deg)`,
              transformOrigin: "150px 60px",
              transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Thanh đòn ngang chính */}
            <line
              x1="60"
              y1="60"
              x2="240"
              y2="60"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="text-slate-400 dark:text-slate-500"
            />

            {/* Móc treo 2 đầu */}
            <circle
              cx="60"
              cy="60"
              r="2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-slate-500 dark:text-slate-400"
            />
            <circle
              cx="240"
              cy="60"
              r="2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-slate-500 dark:text-slate-400"
            />

            {/* 3. Nhóm Treo đĩa cân bên trái (Ambition/Rào cản - triệt tiêu góc nghiêng để luôn thẳng đứng) */}
            <g
              style={{
                transform: `rotate(${-tiltAngle}deg)`,
                transformOrigin: "60px 60px",
                transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {/* Dây treo đĩa trái (tam giác ngược nối xuống đĩa) */}
              <line
                x1="60"
                y1="60"
                x2="42"
                y2="112"
                stroke="currentColor"
                strokeWidth="1.2"
                className="text-slate-300 dark:text-slate-700"
              />
              <line
                x1="60"
                y1="60"
                x2="78"
                y2="112"
                stroke="currentColor"
                strokeWidth="1.2"
                className="text-slate-300 dark:text-slate-700"
              />

              {/* Đĩa cân trái */}
              <path
                d="M 38 112 C 38 123, 82 123, 82 112"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="text-rose-400/80 dark:text-rose-600/70"
              />

              {/* Vật phẩm trên đĩa cân trái: Đám mây rào cản ☁️ và mục tiêu 🎯 */}
              <circle
                cx="60"
                cy="103"
                r="14"
                className="fill-rose-50/90 dark:fill-rose-950/30 stroke-rose-200/40 dark:stroke-rose-800/30"
                strokeWidth="1"
              />
              <g style={{ transform: "translate(49px, 94px)" }}>
                <text className="text-[19px] select-none">☁️</text>
              </g>
              {answeredCount > 0 && isHeavyLeft && (
                <g style={{ transform: "translate(60px, 86px)" }} className="animate-bounce">
                  <text className="text-[11px] select-none">📦</text>
                </g>
              )}
            </g>

            {/* 4. Nhóm Treo đĩa cân bên phải (Capacity/Sức chứa - triệt tiêu góc nghiêng) */}
            <g
              style={{
                transform: `rotate(${-tiltAngle}deg)`,
                transformOrigin: "240px 60px",
                transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {/* Dây treo đĩa phải */}
              <line
                x1="240"
                y1="60"
                x2="222"
                y2="112"
                stroke="currentColor"
                strokeWidth="1.2"
                className="text-slate-300 dark:text-slate-700"
              />
              <line
                x1="240"
                y1="60"
                x2="258"
                y2="112"
                stroke="currentColor"
                strokeWidth="1.2"
                className="text-slate-300 dark:text-slate-700"
              />

              {/* Đĩa cân phải */}
              <path
                d="M 218 112 C 218 123, 262 123, 262 112"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="text-emerald-400/80 dark:text-emerald-600/70"
              />

              {/* Vật phẩm trên đĩa cân phải: Cát giờ ⏳ và điện ⚡ */}
              <circle
                cx="240"
                cy="103"
                r="14"
                className="fill-emerald-50/90 dark:fill-emerald-950/30 stroke-emerald-200/40 dark:stroke-emerald-800/30"
                strokeWidth="1"
              />
              <g style={{ transform: "translate(229px, 94px)" }}>
                <text className="text-[19px] select-none">⚡</text>
              </g>
              {answeredCount > 0 && isHeavyRight && (
                <g style={{ transform: "translate(240px, 86px)" }} className="animate-pulse">
                  <text className="text-[11px] select-none">✨</text>
                </g>
              )}
            </g>
          </g>
        </svg>

        {/* Nhãn 2 đĩa dưới SVG */}
        <div className="absolute w-full bottom-0 flex justify-between px-2 text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
          <span className="w-24 text-left">Tham vọng & Trở ngại</span>
          <span className="w-24 text-right">Thời gian & Sức chứa</span>
        </div>
      </div>

      {/* ═══ Axis breakdown — subtle inline bars ═══ */}
      <div className="w-full space-y-1.5 mt-2">
        {axisScores.map((ax) => {
          const pct = ax.answered ? (ax.score / 4) * 100 : 0;
          const barColor = !ax.answered
            ? "bg-slate-100 dark:bg-slate-800/50"
            : ax.score >= 3
              ? "bg-emerald-500"
              : ax.score === 2
                ? "bg-amber-500"
                : "bg-rose-500";

          return (
            <div key={ax.axis} className="flex items-center gap-3">
              <span
                className={`text-xs w-[90px] shrink-0 truncate font-semibold transition-colors ${ax.answered ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-600"}`}
              >
                {ax.label}
              </span>
              <div
                className="flex-1 h-2 rounded-full bg-slate-200/50 dark:bg-slate-800/40 overflow-hidden relative shadow-inner"
                role="progressbar"
                aria-valuenow={ax.score}
                aria-valuemin={0}
                aria-valuemax={4}
                aria-label={`Điểm khía cạnh ${ax.label}`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span
                className={`text-xs font-bold tabular-nums w-5 text-right transition-colors ${ax.answered ? (ax.score >= 3 ? "text-emerald-600 dark:text-emerald-400" : ax.score === 2 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400") : "text-slate-400 dark:text-slate-600"}`}
                style={{ fontFeatureSettings: "'tnum'" }}
              >
                {ax.answered ? ax.score : "·"}
              </span>
            </div>
          );
        })}
      </div>

      {/* ═══ Status badge ═══ */}
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all duration-300 shadow-sm ${statusInfo.badgeClass}`}
      >
        <span className="text-sm">{statusInfo.emoji}</span>
        <span>{statusInfo.label}</span>
      </div>

      {/* ═══ Description ═══ */}
      <div className="w-full text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
          {statusInfo.sub}
        </p>
      </div>
    </div>
  );
}

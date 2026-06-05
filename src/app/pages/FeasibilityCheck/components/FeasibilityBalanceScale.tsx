import { Scale, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QUESTIONS } from "../constants";
import { FeasibilityScaleSVG } from "./FeasibilityScaleSVG";

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
    const tiltAngle = normalized * 12; // từ -12 độ đến +12 độ (giảm biên độ nghiêng để tránh đĩa cân đè lên nhãn chữ bên dưới)

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
        badgeClass: "bg-app-bg-subtle text-app-ink-soft border-app-line",
      };
    }
    if (isHeavyLeft) {
      return {
        label: "Cán cân nghiêng về rào cản — Nên tinh gọn bớt việc",
        sub: `Đã đánh giá ${answeredCount}/${QUESTIONS.length} khía cạnh`,
        emoji: "⚖️",
        badgeClass: "bg-app-status-error/10 text-app-status-error border-app-status-error/20",
      };
    }
    if (isHeavyRight) {
      return {
        label: "Cán cân thăng bằng rất tốt — Sẵn sàng lập kế hoạch",
        sub: `Đã đánh giá ${answeredCount}/${QUESTIONS.length} khía cạnh`,
        emoji: "✨",
        badgeClass: "bg-app-status-success/10 text-app-status-success border-app-status-success/20",
      };
    }
    return {
      label: "Thăng bằng lý tưởng — Hãy duy trì kỷ luật",
      sub: `Đã đánh giá ${answeredCount}/${QUESTIONS.length} khía cạnh`,
      emoji: "⚖️",
      badgeClass: "bg-app-status-warning/10 text-app-status-warning border-app-status-warning/20",
    };
  }, [answeredCount, isHeavyLeft, isHeavyRight]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Decorative 3D tilt effect only
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      className="relative overflow-hidden rounded-card bg-app-surface/70 dark:bg-app-surface/60 backdrop-blur-md border border-app-line shadow-app-sm p-6 flex flex-col items-center gap-5 transition-all duration-300 group"
    >
      {/* ═══ Header ═══ */}
      <div className="w-full flex flex-wrap items-center justify-between pb-3 border-b border-app-line gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-control bg-app-accent-soft text-app-accent shrink-0">
            <Scale className="h-4 w-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-app-ink-muted whitespace-nowrap">
            Cán cân 12 tuần
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-app-bg-subtle px-3 py-1.5 rounded-pill border border-app-line shrink-0 whitespace-nowrap">
          {answeredCount > 0 && isHeavyRight && <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />}
          <span className="text-xs font-semibold text-app-ink-muted">Mức khả thi</span>
          <span
            className="text-sm font-extrabold tabular-nums text-app-accent"
            style={{ fontFeatureSettings: "'tnum'" }}
          >
            {answeredCount > 0 ? (animatedAverage * 2.5 * 10).toFixed(0) : "—"}%
          </span>
        </div>
      </div>

      {/* ═══ SVG Cán Cân Thăng Bằng Dreamy ═══ */}
      <div className="relative w-full max-w-[280px] h-[140px] flex flex-col items-center justify-center select-none">
        <FeasibilityScaleSVG
          tiltAngle={tiltAngle}
          isHeavyLeft={isHeavyLeft}
          isHeavyRight={isHeavyRight}
          showDetails={answeredCount > 0}
          answers={answers}
        />
      </div>

      {/* Nhãn 2 đĩa dưới SVG (Tăng margin-top để tạo khoảng cách an toàn tránh đè chữ khi đĩa cân nghiêng xuống tối đa) */}
      <div className="w-full max-w-[280px] flex justify-between px-2 text-[10px] sm:text-[11px] font-bold text-app-ink-muted uppercase tracking-wider mt-3">
        <span className="w-28 text-left leading-tight">Tham vọng & Trở ngại</span>
        <span className="w-28 text-right leading-tight">Thời gian & Sức chứa</span>
      </div>

      {/* ═══ Status badge ═══ */}
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-card border text-xs font-bold transition-all duration-300 shadow-app-sm ${statusInfo.badgeClass}`}
      >
        <span className="text-sm">{statusInfo.emoji}</span>
        <span>{statusInfo.label}</span>
      </div>

      {/* ═══ Description ═══ */}
      <div className="w-full text-center">
        <p className="text-xs text-app-ink-muted font-semibold uppercase tracking-wider">{statusInfo.sub}</p>
      </div>
    </div>
  );
}

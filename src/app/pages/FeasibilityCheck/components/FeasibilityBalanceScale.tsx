import { CheckCircle2, Scale } from "lucide-react";
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
      className="relative flex min-w-0 flex-col items-center gap-5 overflow-hidden rounded-card border border-app-line bg-app-surface/70 p-4 shadow-app-sm backdrop-blur-md transition-all duration-300 group motion-reduce:transition-none dark:bg-app-surface/60 sm:p-6"
    >
      {/* ═══ Header ═══ */}
      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 border-b border-app-line pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="p-1.5 rounded-control bg-app-accent-soft text-app-accent shrink-0">
            <Scale className="h-4 w-4" />
          </div>
          <span className="min-w-0 break-words text-xs font-semibold uppercase tracking-[0.05em] text-app-ink-muted">
            Cán cân 12 tuần
          </span>
        </div>

        <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-1.5 rounded-pill border border-app-line bg-app-bg-subtle px-3 py-1.5 leading-tight">
          {answeredCount > 0 && isHeavyRight && (
            <CheckCircle2 className="h-3 w-3 shrink-0 text-app-accent" />
          )}
          <span className="break-words text-xs font-semibold text-app-ink-muted">Mức khả thi</span>
          <span
            className="text-sm font-extrabold tabular-nums text-app-accent"
            style={{ fontFeatureSettings: "'tnum'" }}
          >
            {answeredCount > 0 ? (animatedAverage * 2.5 * 10).toFixed(0) : "—"}%
          </span>
        </div>
      </div>

      {/* ═══ SVG Cán Cân Thăng Bằng Dreamy ═══ */}
      <div className="relative flex h-[140px] w-full max-w-[280px] select-none flex-col items-center justify-center">
        <FeasibilityScaleSVG
          tiltAngle={tiltAngle}
          isHeavyLeft={isHeavyLeft}
          isHeavyRight={isHeavyRight}
          showDetails={answeredCount > 0}
          answers={answers}
        />
      </div>

      {/* Nhãn 2 đĩa dưới SVG (Tăng margin-top để tạo khoảng cách an toàn tránh đè chữ khi đĩa cân nghiêng xuống tối đa) */}
      <div className="mt-3 flex w-full max-w-[280px] justify-between gap-3 px-2 text-[10px] font-bold uppercase tracking-wider text-app-ink-muted sm:text-[11px]">
        <span className="w-28 break-words text-left leading-tight">Tham vọng & Trở ngại</span>
        <span className="w-28 break-words text-right leading-tight">Thời gian & Sức chứa</span>
      </div>

      {/* ═══ Status badge ═══ */}
      <div
        className={`flex min-w-0 items-start gap-2 rounded-card border px-4 py-2.5 text-xs font-bold leading-tight shadow-app-sm transition-all duration-300 motion-reduce:transition-none ${statusInfo.badgeClass}`}
      >
        <span className="text-sm">{statusInfo.emoji}</span>
        <span className="min-w-0 break-words">{statusInfo.label}</span>
      </div>

      {/* ═══ Description ═══ */}
      <div className="w-full text-center">
        <p className="break-words text-xs font-semibold uppercase tracking-wider text-app-ink-muted">
          {statusInfo.sub}
        </p>
      </div>
    </div>
  );
}

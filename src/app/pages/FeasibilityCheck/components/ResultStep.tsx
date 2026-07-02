import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Compass,
  Flame,
  HelpCircle,
  Info,
  Key,
  type LucideIcon,
  ShieldCheck,
  Target,
  Wrench,
} from "lucide-react";
import { motion } from "motion/react";
import type { PendingSMARTGoal } from "@/lib/smart-goal";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../../components/ui/collapsible";
import { cn } from "../../../components/ui/utils";
import { getLifeAreaLabel } from "../../../utils/storage";
import type { FeasibilityBottleneck, PlanLoadRecommendation, ResultData, WeeklyCapacity } from "../types";
import { FeasibilityScaleSVG } from "./FeasibilityScaleSVG";

function getPrePlanAction(bottleneck: FeasibilityBottleneck): string {
  switch (bottleneck.axis) {
    case "time":
      return "khóa ít nhất 2 khung giờ cố định trong tuần cho mục tiêu này";
    case "energy":
      return "chọn thời điểm trong ngày bạn còn năng lượng nhất để làm việc chính";
    case "resources":
      return "xác định 1-2 nguồn lực hoặc kỹ năng cần bổ sung ngay tuần đầu";
    case "clarity":
      return "thu hẹp mục tiêu về một kết quả chính duy nhất có thể đo được trong 12 tuần";
    case "obstacle":
      return "viết ra trở ngại chính và quyết định cách xử lý trước khi bắt đầu";
    case "routine":
      return "khóa lịch cố định cho mục tiêu trước khi thêm bất kỳ việc mới nào";
    case "confidence":
      return "chọn một bước nhỏ nhất bạn chắc chắn hoàn thành được trong tuần đầu";
    case "wheel":
      return "cân nhắc củng cố nền tảng lĩnh vực này song song với mục tiêu";
    default:
      return "tinh chỉnh kế hoạch hành động thích ứng";
  }
}

interface ResultStepProps {
  result: ResultData;
  focusArea: string;
  pendingGoal: PendingSMARTGoal;
  onContinue: () => void;
  onAdjustGoal: () => void;
  answers?: Record<number, string>;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getScoreLabel(percent: number): string {
  if (percent >= 75) return "Cao";
  if (percent >= 50) return "Trung bình";
  return "Thấp";
}

function getAxisBarClass(percent: number): string {
  if (percent >= 75) return "bg-app-accent";
  if (percent >= 50) return "bg-app-ink-soft";
  return "bg-app-status-error";
}

const PLAN_LOAD_LABEL: Record<PlanLoadRecommendation, string> = {
  lighter: "Nhẹ hơn",
  balanced: "Cân bằng",
  push: "Đẩy nhẹ",
};

const CAPACITY_LABEL: Record<WeeklyCapacity, string> = {
  low: "Ít thời gian",
  medium: "Vừa đủ",
  high: "Khá rộng",
};

function getBottleneckIcon(axis: string): LucideIcon {
  switch (axis) {
    case "time":
      return Calendar;
    case "energy":
      return Flame;
    case "resources":
      return Wrench;
    case "clarity":
      return Target;
    case "obstacle":
      return AlertCircle;
    case "routine":
      return Activity;
    case "confidence":
      return ShieldCheck;
    default:
      return HelpCircle;
  }
}

export function ResultStep({
  result,
  focusArea,
  pendingGoal,
  onContinue,
  onAdjustGoal,
  answers = {},
}: ResultStepProps) {
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const isDesktop = windowWidth >= 768;
  const rawActionText =
    result.bottleneck.axis === "wheel"
      ? "cân nhắc củng cố nền tảng lĩnh vực này song song với mục tiêu"
      : getPrePlanAction(result.bottleneck);
  const capitalizedAction = `${rawActionText.charAt(0).toUpperCase() + rawActionText.slice(1)}.`;
  const scorePercent = clampPercent(Math.round((result.adjustedScore / 20) * 100));
  const readinessPercent = clampPercent(Math.round((result.readinessScore / 20) * 100));
  const bottleneckPercent =
    result.bottleneck.axis === "wheel"
      ? clampPercent(result.wheelScore * 10)
      : clampPercent(Math.round((result.bottleneck.score / 4) * 100));
  const statusLabel = getScoreLabel(scorePercent);
  const showRiskWarning = result.type !== "realistic" || Boolean(result.smartGoalQualityNote);

  // Tính điểm trung bình và góc nghiêng cán cân tĩnh
  const totalAxisScore = result.axisScores.reduce((sum, ax) => sum + ax.score, 0);
  const averageScore = result.axisScores.length > 0 ? totalAxisScore / result.axisScores.length : 2.5;
  const normalized = (averageScore - 2.5) / 1.5;
  const tiltAngle = normalized * 12; // từ -12 độ đến +12 độ

  // Lọc thế mạnh
  const sortedAxes = [...result.axisScores].sort((a, b) => b.score - a.score);
  const strongAxes = sortedAxes.filter((a) => a.score >= 3).slice(0, 2);

  const scoreCards = [
    {
      label: "Mức sẵn sàng tổng",
      value: readinessPercent >= 75 ? "Sẵn sàng" : readinessPercent >= 50 ? "Khá ổn" : "Cần lưu ý",
      note: `Đạt ${result.readinessScore}/20 chỉ số tự đánh giá.`,
      progress: readinessPercent,
    },
    {
      label: "Phần cần chú ý nhất",
      value: result.bottleneck.label,
      note: result.bottleneck.action,
      progress: bottleneckPercent,
    },
    {
      label: "Mức tải gợi ý",
      value: PLAN_LOAD_LABEL[result.planLoad],
      note: `Quỹ thời gian: ${CAPACITY_LABEL[result.weeklyCapacity]}.`,
      progress: scorePercent,
    },
  ];

  // Custom visual feedback for each feasibility result type
  const resultHeaderCopy = {
    realistic: {
      answer: "Mục tiêu rất thực tế",
      desc: "Nền tảng vững vàng — sẵn sàng chuyển thành hành động.",
      cardBg:
        "from-app-status-success/10 via-app-status-success/5 to-app-status-success/10 border-app-status-success/30 dark:from-app-status-success/20 dark:via-app-status-success/10 dark:to-app-status-success/20",
      textClass: "text-app-status-success",
      icon: CheckCircle2,
    },
    challenging: {
      answer: "Khả thi nếu đi đúng hướng",
      desc: "Tinh chỉnh nhẹ nhịp độ và quỹ thời gian để đi đường dài lâu.",
      cardBg:
        "from-app-status-warning/10 via-app-status-warning/5 to-app-status-warning/10 border-app-status-warning/30 dark:from-app-status-warning/20 dark:via-app-status-warning/10 dark:to-app-status-warning/20",
      textClass: "text-app-status-warning",
      icon: Compass,
    },
    too_ambitious: {
      answer: "Nên điều chỉnh một chút để chắc thắng",
      desc: "Thu nhỏ chặng 12 tuần để tích lũy chiến thắng đầu tiên vững chắc.",
      cardBg:
        "from-app-status-error/10 via-app-status-error/5 to-app-status-error/10 border-app-status-error/30 dark:from-app-status-error/20 dark:via-app-status-error/10 dark:to-app-status-error/20",
      textClass: "text-app-status-error",
      icon: AlertCircle,
    },
  }[result.type];

  const ActionIcon = resultHeaderCopy.icon;
  const BlockerIcon = getBottleneckIcon(result.bottleneck.axis);

  return (
    <section
      className="group relative mt-4 overflow-hidden rounded-card border border-app-line bg-app-surface/70 p-4 shadow-app-md backdrop-blur-xl dark:bg-app-surface/40 sm:mt-6 sm:p-6 md:p-8"
      aria-labelledby="feasibility-result-title"
    >
      {/* Premium Background Glow effects */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-40 w-40 rounded-full bg-app-accent/5 blur-3xl transition-all duration-500 group-hover:bg-app-accent/10" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-40 w-40 rounded-full bg-app-status-success/5 blur-3xl transition-all duration-500 dark:bg-app-status-success/10 group-hover:bg-app-status-success/10" />

      {/* ── KHU VỰC 1: Mục tiêu có thực tế không? ── */}
      <div className="relative z-10 space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-app-accent">Kết quả đánh giá khả thi</p>
          <span className="w-fit rounded-pill bg-app-accent-soft px-3.5 py-1.5 text-xs font-bold text-app-accent border border-app-line shadow-app-sm">
            {getLifeAreaLabel(focusArea)}
          </span>
        </div>

        {/* Hero Banner Khẳng định tính thực tế */}
        <div
          className={cn(
            "flex items-start gap-3 rounded-card border bg-gradient-to-br p-4 shadow-app-sm transition-all duration-300 sm:gap-4 sm:p-5",
            resultHeaderCopy.cardBg,
          )}
        >
          <div className="shrink-0 rounded-control bg-app-surface p-2.5 shadow-app-sm sm:p-3">
            <ActionIcon className={cn("h-5 w-5 sm:h-6 sm:w-6", resultHeaderCopy.textClass)} aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <h1
              id="feasibility-result-title"
              className={cn(
                "break-words font-serif text-[22px] font-bold leading-tight tracking-tight sm:text-3xl",
                resultHeaderCopy.textClass,
              )}
            >
              {resultHeaderCopy.answer}
            </h1>
            <p className="max-w-[68ch] text-[13px] font-normal leading-relaxed text-app-ink-soft sm:text-sm">
              {resultHeaderCopy.desc}
            </p>
          </div>
        </div>

        {/* Thang đo khả thi trực quan (Visual static scale block) - Loại bỏ border, tăng tương phản nền */}
        <div className="rounded-card bg-app-bg-subtle/50 p-4 backdrop-blur-[2px] sm:p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-6">
            <div className="relative flex shrink-0 flex-col items-center justify-center gap-3 text-center sm:w-48 sm:gap-4">
              {/* Cán cân thăng bằng tĩnh sau hiệu chuẩn */}
              <div className="flex h-[112px] w-full max-w-[180px] items-center justify-center rounded-card border border-app-line bg-app-surface/40 p-2 shadow-inner select-none sm:h-[130px] sm:max-w-[200px]">
                <FeasibilityScaleSVG
                  tiltAngle={tiltAngle}
                  isHeavyLeft={averageScore < 2.3}
                  isHeavyRight={averageScore > 2.7}
                  showDetails={true}
                  answers={answers}
                />
              </div>

              <div>
                <p className={cn("text-base font-extrabold", resultHeaderCopy.textClass)}>{statusLabel}</p>
                <p className="mt-0.5 text-xs text-app-ink-muted font-bold uppercase tracking-wider">
                  Cán cân khả thi: {(averageScore * 2.5 * 10).toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-5">
              <div className="max-w-[72ch] break-words rounded-card bg-app-accent-soft/70 p-3.5 text-[13px] font-normal leading-relaxed text-app-accent shadow-app-sm sm:p-4 sm:text-sm">
                {result.summary}
              </div>

              <div className="space-y-3">
                {/* Premium Multi-Color Gradient Progress Track */}
                <div
                  className="relative h-3.5 w-full overflow-hidden rounded-pill bg-app-line/20 shadow-inner border border-app-line/10"
                  role="progressbar"
                  aria-valuenow={scorePercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Mức khả thi tổng thể"
                >
                  <div
                    className="h-full rounded-pill bg-gradient-to-r from-app-status-error via-app-status-warning to-app-status-success transition-all duration-500 ease-out relative"
                    style={{ width: `${(averageScore / 4) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                  </div>
                  <span className="absolute left-[25%] top-0 h-full w-px bg-app-line/10" />
                  <span className="absolute left-[50%] top-0 h-full w-px bg-app-line/10" />
                  <span className="absolute left-[75%] top-0 h-full w-px bg-app-line/10" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-app-ink-muted sm:text-xs sm:tracking-widest">
                  <span className="min-w-0 break-words text-left">Khuyên điều chỉnh (1-2)</span>
                  <span className="min-w-0 break-words text-center">Cân bằng (2.3-2.7)</span>
                  <span className="min-w-0 break-words text-right">Vững vàng (2.8-4)</span>
                </div>
              </div>
              <p className="max-w-[72ch] break-words text-[13px] font-normal leading-relaxed text-app-ink-soft sm:text-sm">
                {result.recommendation}
              </p>
            </div>
          </div>
        </div>

        {/* ── ROADMAP TINH CHỈNH & GIA CỐ (Adjustment Roadmap) ── */}
        <div className="space-y-4 sm:space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-app-ink-muted">
            Lộ trình điều chỉnh để mục tiêu chắc thắng
          </h2>

          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            {/* Cột trái: Phân tích Thế mạnh & Điểm nghẽn - Loại bỏ card border */}
            <div className="space-y-4">
              {/* Thẻ Thế mạnh (Điểm tựa vững chắc) */}
              {strongAxes.length > 0 && (
                <div className="space-y-2 rounded-card bg-app-status-success/5 p-4 sm:p-5">
                  <h3 className="text-sm font-semibold text-app-status-success flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Điểm tựa vững vàng
                  </h3>

                  <ul className="space-y-1 text-xs text-app-ink font-bold">
                    {strongAxes.map((ax) => (
                      <li key={ax.axis} className="flex min-w-0 items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-app-status-success" aria-hidden="true" />
                        <span className="min-w-0 break-words">
                          {ax.label} ({ax.score}/4)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Thẻ Điểm nghẽn (Trở ngại chính) */}
              <div
                className={cn(
                  "relative space-y-2 overflow-hidden rounded-card p-4 sm:p-5",
                  result.type === "too_ambitious"
                    ? "bg-app-status-error/10 text-app-status-error border border-app-status-error/20"
                    : result.type === "challenging"
                      ? "bg-app-status-warning/10 text-app-status-warning border border-app-status-warning/20"
                      : "bg-app-accent-soft text-app-accent border border-app-accent/20",
                )}
              >
                <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                  <BlockerIcon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">Điểm lưu ý chính: {result.bottleneck.label}</span>
                </h3>
                <p className="break-words text-xs leading-relaxed font-semibold text-app-ink">
                  Khuyên điều chỉnh: {result.bottleneck.action}
                </p>
              </div>
            </div>

            {/* Cột phải: 3 Bước hành động cụ thể - Bỏ border */}
            <div className="space-y-4">
              {/* Bước 1: Trước khi lập kế hoạch */}
              <div className="flex items-start gap-3.5 rounded-card border border-app-line/70 bg-app-surface/60 p-3.5 sm:p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-app-accent-soft text-app-accent font-bold shadow-app-sm">
                  <Key className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-1">
                  <h4 className="text-sm font-semibold text-app-accent">1. Chuẩn bị bệ đỡ</h4>
                  <p className="break-words text-left text-xs font-normal leading-relaxed text-app-ink-soft">
                    {capitalizedAction}
                  </p>
                </div>
              </div>

              {/* Bước 2: Tuần khởi động */}
              <div className="flex items-start gap-3.5 rounded-card border border-app-line/70 bg-app-surface/60 p-3.5 sm:p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-app-accent-soft text-app-accent font-bold shadow-app-sm">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-1">
                  <h4 className="text-sm font-semibold text-app-accent">2. Tuần khởi động (Tuần 1)</h4>
                  <p className="break-words text-left text-xs font-normal leading-relaxed text-app-ink-soft">
                    {result.firstWeekGuidance}
                  </p>
                </div>
              </div>

              {/* Bước 3: Điều chỉnh quy mô mục tiêu */}
              {result.scopeRecommendation && (
                <div className="flex items-start gap-3.5 rounded-card border border-app-line/70 bg-app-surface/60 p-3.5 sm:p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-app-accent-soft text-app-accent font-bold shadow-app-sm">
                    <Compass className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h4 className="text-sm font-semibold text-app-accent">3. Tinh chỉnh quy mô mục tiêu</h4>
                    <p className="break-words text-left text-xs font-normal leading-relaxed text-app-ink-soft">
                      {result.scopeRecommendation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showRiskWarning && result.smartGoalQualityNote ? (
          <div className="rounded-card border-none bg-app-status-warning/5 p-3.5 text-app-ink sm:p-4">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-app-status-warning" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-app-status-warning">Lời khuyên tinh chỉnh SMART Goal</p>
                <p className="break-words text-xs font-normal leading-relaxed text-app-ink-soft sm:text-sm">
                  {result.smartGoalQualityNote}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Collapsible phân tích chi tiết phụ trợ */}
        <Collapsible
          key={isDesktop ? "feasibility-details-desktop" : "feasibility-details-mobile"}
          defaultOpen={false}
          className="mt-5 border-t border-app-line pt-4 sm:mt-6 sm:pt-5"
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-control border border-app-line bg-app-surface/70 px-4 py-3 text-left text-sm font-bold text-app-ink shadow-app-sm transition-all duration-150 hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] sm:px-5"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Info className="h-4.5 w-4.5 shrink-0 text-app-accent" aria-hidden="true" />
                <span className="min-w-0 break-words">Xem phân tích chi tiết & 7 khía cạnh</span>
              </span>
              <ChevronDown className="h-5 w-5 text-app-ink-muted transition-transform duration-200" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-5 space-y-6 data-[state=closed]:hidden">
            {/* Grid hiển thị 3 ScoreCards chính */}
            <div className="grid gap-4 md:grid-cols-3">
              {scoreCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-card bg-app-surface/40 p-5 transition-all duration-300 hover:bg-app-surface/60 hover:shadow-app-md border-none"
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-app-ink-muted">{card.label}</p>
                  <p className="mt-2 break-words text-lg font-extrabold leading-snug text-app-ink tracking-tight sm:text-xl">
                    {card.value}
                  </p>
                  <div
                    className="mt-4 h-2 overflow-hidden rounded-pill bg-app-line/20 shadow-inner"
                    role="progressbar"
                    aria-valuenow={card.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={card.label}
                  >
                    <div
                      className="h-full rounded-pill bg-gradient-to-r from-app-accent/60 to-app-accent transition-all duration-500"
                      style={{ width: `${card.progress}%` }}
                    />
                  </div>
                  <p className="mt-3 break-words text-xs leading-relaxed text-app-ink-muted font-normal">{card.note}</p>
                </div>
              ))}
            </div>

            {/* PHẦN 1: Chi tiết 7 góc nhìn (Hiển thị phẳng trực quan) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-app-ink-muted">
                Chi tiết 7 khía cạnh chẩn đoán
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {result.axisScores.map((axis) => (
                  <div key={axis.axis} className="rounded-card bg-app-surface/50 p-4 border-none">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 break-words text-sm font-bold text-app-ink">{axis.label}</p>
                      <span className="text-xs font-bold text-app-ink-muted bg-app-bg-subtle px-2 py-0.5 rounded-control">
                        {axis.score}/{axis.maxScore}
                      </span>
                    </div>
                    <div
                      className="mt-3 h-2 overflow-hidden rounded-pill bg-app-line/20 shadow-inner"
                      role="progressbar"
                      aria-valuenow={axis.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Chi tiết khía cạnh ${axis.label}`}
                    >
                      <div
                        className={`h-full rounded-pill transition-all duration-500 ${getAxisBarClass(axis.percent)}`}
                        style={{ width: `${axis.percent}%` }}
                      />
                    </div>
                    <p className="mt-3 break-words text-xs leading-relaxed text-app-ink-soft font-normal">
                      {axis.diagnostic}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* PHẦN 2: Mục tiêu đã viết (Hiển thị phẳng) */}
            <div className="space-y-3 pt-2 border-t border-app-line">
              <h4 className="text-xs font-bold uppercase tracking-wider text-app-ink-muted">Mục tiêu SMART của bạn</h4>
              <div className="rounded-card bg-app-surface/40 p-5 space-y-4 border-none">
                <p className="break-words rounded-card border-none bg-app-bg-subtle p-4 text-sm font-bold leading-relaxed text-app-ink shadow-app-sm">
                  {pendingGoal.specific}
                </p>
                <div className="grid gap-4 sm:grid-cols-3 text-sm leading-relaxed text-app-ink-soft">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-app-ink-muted mb-1">Thời hạn</p>
                    <p className="break-words font-semibold text-app-ink">{pendingGoal.timeBound}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-app-ink-muted mb-1">
                      Dấu hiệu hoàn thành
                    </p>
                    <p className="break-words font-semibold text-app-ink">{pendingGoal.measurable}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-app-ink-muted mb-1">
                      Lý do theo đuổi
                    </p>
                    <p className="break-words font-semibold text-app-ink">{pendingGoal.relevant}</p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ── KHU VỰC 4: Bật đèn xanh & CTA Tiếp tục ── */}
        <div className="relative z-10 mt-7 flex flex-col gap-4 border-t border-app-line pt-5 sm:mt-8 sm:pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-app-ink">Đã sẵn sàng hành động?</h4>
            <p className="text-xs text-app-ink-soft font-normal">
              Bất kể mức độ khả thi, hãy biến mục tiêu của bạn thành kế hoạch 12 tuần thích nghi.
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col-reverse gap-3 sm:flex-row lg:w-auto">
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-control border border-app-line bg-app-surface px-5 py-3 text-sm font-bold text-app-ink-soft shadow-app-sm transition-all duration-200 hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 lg:w-auto font-sans"
              onClick={onAdjustGoal}
            >
              <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
              Tinh chỉnh mục tiêu ✏️
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="button"
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-control bg-app-accent px-5 py-3 text-sm font-bold text-white shadow-app-md transition-all duration-200 hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 lg:w-auto font-sans"
              onClick={onContinue}
            >
              Bắt đầu lập Kế hoạch 12 tuần ngay
              <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}

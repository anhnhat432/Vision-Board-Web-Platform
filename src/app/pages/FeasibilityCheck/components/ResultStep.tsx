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
  Sparkles,
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
      value: readinessPercent >= 75 ? "Sẵn sàng ✨" : readinessPercent >= 50 ? "Khá ổn 🌱" : "Cần lưu ý 🌊",
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
      answer: "Mục tiêu rất thực tế! 🎉",
      desc: "Nền tảng vững vàng — sẵn sàng chuyển thành hành động.",
      cardBg:
        "from-app-status-success/10 via-app-status-success/5 to-app-status-success/10 border-app-status-success/30 dark:from-app-status-success/20 dark:via-app-status-success/10 dark:to-app-status-success/20",
      textClass: "text-app-status-success",
      icon: CheckCircle2,
    },
    challenging: {
      answer: "Khả thi nếu đi đúng hướng! 🌱",
      desc: "Tinh chỉnh nhẹ nhịp độ và quỹ thời gian để đi đường dài lâu.",
      cardBg:
        "from-app-status-warning/10 via-app-status-warning/5 to-app-status-warning/10 border-app-status-warning/30 dark:from-app-status-warning/20 dark:via-app-status-warning/10 dark:to-app-status-warning/20",
      textClass: "text-app-status-warning",
      icon: Compass,
    },
    too_ambitious: {
      answer: "Nên điều chỉnh một chút để chắc thắng! 🧗",
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
      className="mt-8 relative overflow-hidden rounded-card border border-app-line bg-app-surface/60 dark:bg-app-surface/40 backdrop-blur-xl shadow-app-lg p-6 sm:p-8 md:p-10 group"
      aria-labelledby="feasibility-result-title"
    >
      {/* Premium Background Glow effects */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-app-accent/10 rounded-full blur-3xl pointer-events-none transition-all duration-500 group-hover:bg-app-accent/20" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-app-status-success/10 dark:bg-app-status-success/15 rounded-full blur-3xl pointer-events-none transition-all duration-500 group-hover:bg-app-status-success/20" />

      {/* ── KHU VỰC 1: Mục tiêu có thực tế không? ── */}
      <div className="relative z-10 space-y-6">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-app-accent">Kết quả đánh giá khả thi</p>
          <span className="w-fit rounded-pill bg-app-accent-soft px-3.5 py-1.5 text-xs font-bold text-app-accent border border-app-line shadow-app-sm">
            {getLifeAreaLabel(focusArea)}
          </span>
        </div>

        {/* Hero Banner Khẳng định tính thực tế */}
        <div
          className={cn(
            "rounded-card border p-6 bg-gradient-to-br shadow-app-md flex gap-4 items-start transition-all duration-300 hover:shadow-app-lg",
            resultHeaderCopy.cardBg,
          )}
        >
          <div className="p-3 rounded-control bg-app-surface shadow-app-sm shrink-0">
            <ActionIcon className={cn("h-6 w-6", resultHeaderCopy.textClass)} aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h1
              id="feasibility-result-title"
              className={cn("font-serif text-2xl sm:text-3xl font-bold tracking-tight", resultHeaderCopy.textClass)}
            >
              {resultHeaderCopy.answer}
            </h1>
            <p className="text-sm leading-relaxed text-app-ink-soft font-normal">{resultHeaderCopy.desc}</p>
          </div>
        </div>

        {/* Thang đo khả thi trực quan (Visual static scale block) - Loại bỏ border, tăng tương phản nền */}
        <div className="rounded-card bg-app-bg-subtle/50 p-6 backdrop-blur-[2px]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative flex shrink-0 flex-col items-center justify-center text-center sm:w-48 gap-4">
              {/* Cán cân thăng bằng tĩnh sau hiệu chuẩn */}
              <div className="w-full max-w-[200px] h-[130px] flex items-center justify-center select-none bg-app-surface/40 rounded-card border border-app-line p-2 shadow-inner">
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
              <div className="rounded-card bg-app-accent-soft/70 p-4 shadow-app-sm text-sm font-normal leading-relaxed text-app-accent">
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
                    {/* Floating Indicator Bubble */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)] motion-safe:animate-ping" />
                  </div>
                  <span className="absolute left-[25%] top-0 h-full w-px bg-app-line/10" />
                  <span className="absolute left-[50%] top-0 h-full w-px bg-app-line/10" />
                  <span className="absolute left-[75%] top-0 h-full w-px bg-app-line/10" />
                </div>
                <div className="flex justify-between text-xs font-bold text-app-ink-muted uppercase tracking-widest">
                  <span>Khuyên điều chỉnh (1-2)</span>
                  <span>Cân bằng (2.3-2.7)</span>
                  <span>Vững vàng (2.8-4)</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-app-ink-soft font-normal">{result.recommendation}</p>
            </div>
          </div>
        </div>

        {/* ── ROADMAP TINH CHỈNH & GIA CỐ (Adjustment Roadmap) ── */}
        <div className="space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-app-ink-muted">
            Lộ trình điều chỉnh để mục tiêu chắc thắng
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Cột trái: Phân tích Thế mạnh & Điểm nghẽn - Loại bỏ card border */}
            <div className="space-y-4">
              {/* Thẻ Thế mạnh (Điểm tựa vững chắc) */}
              {strongAxes.length > 0 && (
                <div className="rounded-card bg-app-status-success/5 p-5 space-y-2">
                  <h3 className="text-sm font-semibold text-app-status-success flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" /> Điểm tựa vững vàng
                  </h3>

                  <ul className="space-y-1 text-xs text-app-ink font-bold">
                    {strongAxes.map((ax) => (
                      <li key={ax.axis} className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-app-status-success" />
                        {ax.label} ({ax.score}/4)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Thẻ Điểm nghẽn (Trở ngại chính) */}
              <div
                className={cn(
                  "rounded-card p-5 space-y-2 relative overflow-hidden",
                  result.type === "too_ambitious"
                    ? "bg-app-status-error/10 text-app-status-error border border-app-status-error/20"
                    : result.type === "challenging"
                      ? "bg-app-status-warning/10 text-app-status-warning border border-app-status-warning/20"
                      : "bg-app-accent-soft text-app-accent border border-app-accent/20",
                )}
              >
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <BlockerIcon className="h-4.5 w-4.5" /> Điểm lưu ý chính: {result.bottleneck.label}
                </h3>
                <p className="text-xs leading-relaxed font-semibold text-app-ink">
                  Khuyên điều chỉnh: {result.bottleneck.action}
                </p>
              </div>
            </div>

            {/* Cột phải: 3 Bước hành động cụ thể - Bỏ border */}
            <div className="space-y-4">
              {/* Bước 1: Trước khi lập kế hoạch */}
              <div className="rounded-card bg-app-surface/30 p-4 flex gap-3.5 items-start hover:scale-[1.01] transition-transform border-none">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-app-accent-soft text-app-accent font-bold shadow-app-sm">
                  <Key className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-app-accent">1. Chuẩn bị bệ đỡ</h4>
                  <p className="text-xs leading-relaxed text-app-ink-soft font-normal text-left">{capitalizedAction}</p>
                </div>
              </div>

              {/* Bước 2: Tuần khởi động */}
              <div className="rounded-card bg-app-surface/30 p-4 flex gap-3.5 items-start hover:scale-[1.01] transition-transform border-none">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-app-accent-soft text-app-accent font-bold shadow-app-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-app-accent">2. Tuần khởi động (Tuần 1)</h4>
                  <p className="text-xs leading-relaxed text-app-ink-soft font-normal text-left">
                    {result.firstWeekGuidance}
                  </p>
                </div>
              </div>

              {/* Bước 3: Điều chỉnh quy mô mục tiêu */}
              {result.scopeRecommendation && (
                <div className="rounded-card bg-app-surface/30 p-4 flex gap-3.5 items-start hover:scale-[1.01] transition-transform border-none">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-app-accent-soft text-app-accent font-bold shadow-app-sm">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-app-accent">3. Tinh chỉnh quy mô mục tiêu</h4>
                    <p className="text-xs leading-relaxed text-app-ink-soft font-normal text-left">
                      {result.scopeRecommendation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showRiskWarning && result.smartGoalQualityNote ? (
          <div className="rounded-card bg-app-status-warning/5 p-4 text-app-ink border-none">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-app-status-warning" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-app-status-warning">Lời khuyên tinh chỉnh SMART Goal</p>
                <p className="text-xs sm:text-sm leading-relaxed text-app-ink-soft font-normal">
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
          className="mt-6 border-t border-app-line pt-5"
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex w-full items-center justify-between rounded-control border border-app-line bg-app-surface/70 px-5 py-3 text-sm font-bold text-app-ink hover:bg-app-bg-subtle transition-all duration-150 shadow-app-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]"
            >
              <span className="flex items-center gap-2">
                <Info className="h-4.5 w-4.5 text-app-accent" />
                Xem phân tích chi tiết & 7 khía cạnh
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
                  <p className="mt-2 text-xl font-extrabold leading-normal text-app-ink tracking-tight">{card.value}</p>
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
                  <p className="mt-3 text-xs leading-relaxed text-app-ink-muted font-normal">{card.note}</p>
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
                      <p className="text-sm font-bold text-app-ink">{axis.label}</p>
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
                    <p className="mt-3 text-xs leading-relaxed text-app-ink-soft font-normal">{axis.diagnostic}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* PHẦN 2: Mục tiêu đã viết (Hiển thị phẳng) */}
            <div className="space-y-3 pt-2 border-t border-app-line">
              <h4 className="text-xs font-bold uppercase tracking-wider text-app-ink-muted">Mục tiêu SMART của bạn</h4>
              <div className="rounded-card bg-app-surface/40 p-5 space-y-4 border-none">
                <p className="text-sm font-bold leading-relaxed text-app-ink p-4 rounded-card bg-app-bg-subtle shadow-app-sm border-none">
                  {pendingGoal.specific}
                </p>
                <div className="grid gap-4 sm:grid-cols-3 text-sm leading-relaxed text-app-ink-soft">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-app-ink-muted mb-1">Thời hạn</p>
                    <p className="font-semibold text-app-ink">{pendingGoal.timeBound}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-app-ink-muted mb-1">
                      Dấu hiệu hoàn thành
                    </p>
                    <p className="font-semibold text-app-ink">{pendingGoal.measurable}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-app-ink-muted mb-1">
                      Lý do theo đuổi
                    </p>
                    <p className="font-semibold text-app-ink">{pendingGoal.relevant}</p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ── KHU VỰC 4: Bật đèn xanh & CTA Tiếp tục ── */}
        <div className="mt-10 pt-8 border-t border-app-line flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-app-ink">Đã sẵn sàng hành động?</h4>
            <p className="text-xs text-app-ink-soft font-normal">
              Bất kể mức độ khả thi, hãy biến mục tiêu của bạn thành kế hoạch 12 tuần thích nghi.
            </p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-control border border-app-line bg-app-surface px-6 py-3.5 text-sm font-bold text-app-ink-soft transition-all duration-200 hover:bg-app-bg-subtle shadow-app-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 lg:w-auto font-sans"
              onClick={onAdjustGoal}
            >
              <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
              Tinh chỉnh mục tiêu ✏️
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="button"
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-control bg-app-accent px-7 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:bg-app-accent-hover shadow-app-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 lg:w-auto font-sans"
              onClick={onContinue}
            >
              Bắt đầu lập Kế hoạch 12 tuần ngay 🚀
              <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}

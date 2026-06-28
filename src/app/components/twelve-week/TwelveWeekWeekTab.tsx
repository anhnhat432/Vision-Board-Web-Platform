import { ChevronDown, Lightbulb, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ExecutionInsight, NextWeekRecommendation, RescueModeStatus } from "@/features/plan12week/logic";
import { calculateLagScore, interpretWeeklyExecutionScore } from "@/features/plan12week/logic";
import { formatCalendarDate, getReviewDayLabel } from "../../utils/storage";
import type {
  LeadIndicator,
  PricingPlanCode,
  TwelveWeekSystem,
  UniversalWeeklyReview,
} from "../../utils/storage-types";
import type { SuggestedNextWeekPlan, WeeklyReviewPremiumInsight } from "../../utils/twelve-week-premium";
import { getWorkloadDecisionLabel } from "../../utils/twelve-week-system-ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Textarea } from "../ui/textarea";
import { cn } from "../ui/utils";
import { NextWeekCommitmentsEditor } from "./NextWeekCommitmentsEditor";
import { TwelveWeekEmotionFlow } from "./TwelveWeekEmotionFlow";
import { TwelveWeekInsightsCard } from "./TwelveWeekInsightsCard";
import { TwelveWeekPremiumInsightSection } from "./TwelveWeekPremiumInsightSection";
import { TwelveWeekRescueNudge } from "./TwelveWeekRescueNudge";

import "./TwelveWeekWeekTab.css";

interface WeekRange {
  start: string;
  end: string;
}

interface WeekCompletionSummary {
  completed: number;
  total: number;
  percent: number;
  isEmpty?: boolean;
}

export interface TwelveWeekWeeklyReviewForm {
  lagProgressValue: string;
  biggestOutputThisWeek: string;
  mainObstacle: string;
  keepTactic: string;
  reduceTactic: string;
  nextWeekPriority: string;
  commitmentStatuses: Record<string, WeeklyCommitmentStatus>;
  insights: string;
  nextWeekCommitments: string[];
  workloadDecision: "keep same" | "reduce slightly" | "increase slightly" | "";
}

type WeeklyCommitmentStatus = "kept" | "missed" | "not_set" | "unanswered";

interface TwelveWeekWeekTabProps {
  system: TwelveWeekSystem;
  currentWeekNumber?: number;
  currentWeekRange: WeekRange | null;
  currentPlanFocus: string;
  currentPlanMilestone: string;
  reviewDueToday: boolean;
  reviewStatusLabel: string;
  currentScoreValue: number;
  weekCompletion: WeekCompletionSummary;
  currentLagMetricValue: string;
  coreIndicators: LeadIndicator[];
  optionalIndicators: LeadIndicator[];
  currentPlanCode: PricingPlanCode;
  hasPremiumInsights: boolean;
  premiumInsight: WeeklyReviewPremiumInsight | null;
  suggestedNextWeekPlan: SuggestedNextWeekPlan | null;
  weeklyForm: TwelveWeekWeeklyReviewForm;
  currentReview?: UniversalWeeklyReview | null;
  onWeeklyFormChange: <K extends keyof TwelveWeekWeeklyReviewForm>(
    field: K,
    value: TwelveWeekWeeklyReviewForm[K],
  ) => void;
  onApplySuggestedPlan: () => void;
  onOpenPremiumInsights: () => void;
  onSaveWeeklyReview: () => void;
  onOpenTodayTab?: () => void;
  rescueStatus?: RescueModeStatus | null;
  onPickTinyTask?: () => void;
  onReducePlan?: () => void;
  nextWeekRecommendation?: NextWeekRecommendation | null;
  onAcceptNextWeekRecommendation?: () => void;
  weeklyReflectionInsights?: ReadonlyArray<ExecutionInsight>;
}

function getLeadScoreTone(level: ReturnType<typeof interpretWeeklyExecutionScore>["level"]): {
  marker: string;
  panel: string;
  text: string;
} {
  switch (level) {
    case "strong":
      return {
        marker: "bg-app-status-success",
        panel: "border-app-status-success/20 bg-app-status-success/5",
        text: "text-app-status-success",
      };
    case "okay":
      return {
        marker: "bg-app-status-warning",
        panel: "border-app-status-warning/20 bg-app-status-warning/5",
        text: "text-app-status-warning",
      };
    default:
      return {
        marker: "bg-app-status-error",
        panel: "border-app-status-error/20 bg-app-status-error/5",
        text: "text-app-status-error",
      };
  }
}

function normalizeCommitmentList(values: readonly string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => value.trim()).filter(Boolean);
}

function getReviewNextWeekCommitments(review: UniversalWeeklyReview | null | undefined): string[] {
  const commitments = normalizeCommitmentList(review?.nextWeekCommitments);
  if (commitments.length > 0) return commitments;

  const legacyPriority = review?.nextWeekPriority?.trim();
  return legacyPriority ? [legacyPriority] : [];
}

function truncateCommitmentQuote(value: string, maxLength = 80): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function getCommitmentQuoteForPreviousCommitment(system: TwelveWeekSystem, commitment: string): string | null {
  const normalizedCommitment = commitment.trim().toLocaleLowerCase("vi-VN");
  if (!normalizedCommitment) return null;

  const indicator = system.leadIndicators.find((leadIndicator) => {
    const indicatorName = leadIndicator.name.trim().toLocaleLowerCase("vi-VN");
    return (
      indicatorName === normalizedCommitment ||
      normalizedCommitment.includes(indicatorName) ||
      indicatorName.includes(normalizedCommitment)
    );
  });
  const want = indicator?.commitment?.want?.trim();

  return want ? `“${truncateCommitmentQuote(want)}”` : null;
}

function isCommitmentAnswered(status: WeeklyCommitmentStatus | undefined): boolean {
  return status === "kept" || status === "missed" || status === "not_set";
}

function getCommitmentButtonClass(status: WeeklyCommitmentStatus, currentStatus: WeeklyCommitmentStatus): string {
  const isActive = status === currentStatus;
  if (!isActive) {
    return "w-full border-app-line bg-app-surface px-3 py-2 text-xs min-h-11 sm:px-3 sm:py-2 sm:min-h-11 flex items-center justify-center rounded-lg text-center leading-tight text-app-ink-soft transition-all duration-200 hover:bg-app-bg-subtle weekly-btn-press";
  }

  switch (status) {
    case "kept":
      return "w-full border-app-status-success/30 bg-app-status-success/10 px-3 py-2 text-xs min-h-11 sm:px-3 sm:py-2 sm:min-h-11 flex items-center justify-center rounded-lg text-center font-semibold leading-tight text-app-status-success shadow-2xs ring-1 ring-app-status-success/15 transition-all duration-200 hover:bg-app-status-success/20 weekly-btn-press";
    case "missed":
      return "w-full border-app-status-error/30 bg-app-status-error/10 px-3 py-2 text-xs min-h-11 sm:px-3 sm:py-2 sm:min-h-11 flex items-center justify-center rounded-lg text-center font-semibold leading-tight text-app-status-error shadow-2xs ring-1 ring-app-status-error/15 transition-all duration-200 hover:bg-app-status-error/20 weekly-btn-press";
    case "not_set":
      return "w-full border-app-line-strong bg-app-bg-subtle px-3 py-2 text-xs min-h-11 sm:px-3 sm:py-2 sm:min-h-11 flex items-center justify-center rounded-lg text-center font-semibold leading-tight text-app-ink-soft shadow-2xs transition-all duration-200 hover:bg-app-line-strong/20 weekly-btn-press";
    default:
      return "w-full border-app-ink bg-app-ink px-3 py-2 text-xs min-h-11 sm:px-3 sm:py-2 sm:min-h-11 flex items-center justify-center rounded-lg text-center font-semibold leading-tight text-white shadow-2xs transition-all duration-200 weekly-btn-press";
  }
}

// Decorative elements for Dreamy Planner aesthetic (preserved)
const WashiTape = ({ className = "" }: { className?: string }) => (
  <div
    className={`absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-app-warm-soft/40 backdrop-blur-[0.5px] rotate-[-1.5deg] border border-dashed border-app-warm-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.01)] pointer-events-none select-none z-20 ${className}`}
  />
);

const PaperPin = ({ className = "" }: { className?: string }) => (
  <div
    className={`absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none select-none z-20 ${className}`}
  >
    <div className="w-3.5 h-3.5 bg-app-warm rounded-full shadow-[inset_0_-1px_2px_rgba(0,0,0,0.2),0_1.5px_3px_rgba(0,0,0,0.15)] border border-white/20 flex items-center justify-center">
      <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
    </div>
  </div>
);

export function TwelveWeekWeekTab({
  system,
  currentWeekNumber,
  currentWeekRange,
  currentPlanFocus,
  currentPlanMilestone,
  reviewDueToday,
  weekCompletion,
  currentLagMetricValue,
  coreIndicators,
  optionalIndicators,
  currentPlanCode,
  hasPremiumInsights,
  premiumInsight,
  suggestedNextWeekPlan,
  weeklyForm,
  currentReview,
  onWeeklyFormChange,
  onApplySuggestedPlan,
  onOpenPremiumInsights,
  onSaveWeeklyReview,
  onOpenTodayTab,
  rescueStatus,
  onPickTinyTask,
  onReducePlan,
  nextWeekRecommendation,
  onAcceptNextWeekRecommendation,
  weeklyReflectionInsights,
}: TwelveWeekWeekTabProps) {
  const reviewWeekNumber = system.currentWeek;
  const currentWeekLimit = Math.min(
    Math.max(currentWeekNumber ?? system.currentWeek, 1),
    Math.max(system.totalWeeks, 1),
  );
  const isFutureReviewWeek = reviewWeekNumber > currentWeekLimit;
  const shouldConfirmEarlyReview = reviewWeekNumber === currentWeekLimit && !reviewDueToday;
  const leadScoreValue = currentReview?.leadCompletionPercent ?? weekCompletion.percent;
  const scoreInterpretation = interpretWeeklyExecutionScore(leadScoreValue);
  const scoreTone = getLeadScoreTone(scoreInterpretation.level);
  const lagMetricValue = currentLagMetricValue || system.lagMetric.currentValue;
  const lagScoreValue =
    system.lagMetric.target.trim().length > 0
      ? calculateLagScore(
          {
            target: system.lagMetric.target,
            currentValue: lagMetricValue,
          },
          system.currentWeek,
          system.totalWeeks,
        )
      : null;
  const previousReview = system.weeklyReviews.find((review) => review.weekNumber === reviewWeekNumber - 1);
  const previousCommitments = getReviewNextWeekCommitments(previousReview);
  const allPreviousCommitmentsAnswered =
    previousCommitments.length === 0 ||
    previousCommitments.every((commitment) => isCommitmentAnswered(weeklyForm.commitmentStatuses[commitment]));
  const nextWeekCommitments = normalizeCommitmentList(weeklyForm.nextWeekCommitments).slice(0, 5);
  const hasNextWeekCommitment = nextWeekCommitments.length > 0;
  const reviewIsCompleted = Boolean(currentReview?.reviewCompleted);
  const summaryReview = reviewIsCompleted ? (currentReview ?? null) : null;
  const summaryCommitmentsKept = normalizeCommitmentList(summaryReview?.commitmentsKept);
  const summaryCommitmentsMissed = normalizeCommitmentList(summaryReview?.commitmentsMissed);
  const summaryCommitmentTotal = summaryCommitmentsKept.length + summaryCommitmentsMissed.length;
  const summaryInsights =
    summaryReview?.insights?.trim() ||
    summaryReview?.reflection?.trim() ||
    summaryReview?.biggestOutputThisWeek?.trim();
  const summaryNextWeekCommitments = getReviewNextWeekCommitments(summaryReview);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [showEarlyReviewConfirm, setShowEarlyReviewConfirm] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [isStartingEarly, setIsStartingEarly] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  const canShowFormReview = reviewDueToday || isStartingEarly || isEditingReview;
  const showForm = !reviewIsCompleted || isEditingReview;

  const reviewReadinessItems = [
    { key: "score", label: "Điểm tuần", done: true },
    { key: "commitments", label: "Cam kết cũ", done: allPreviousCommitmentsAnswered },
    { key: "insights", label: "Bài học", done: weeklyForm.insights.trim().length > 0 },
    { key: "next", label: "Tuần sau", done: hasNextWeekCommitment },
  ];
  const reviewReadyCount = reviewReadinessItems.filter((item) => item.done).length;
  const reviewPendingItems = reviewReadinessItems.filter((item) => !item.done);
  const canSubmitWeeklyReview = allPreviousCommitmentsAnswered && hasNextWeekCommitment && !isFutureReviewWeek;
  const reviewStatusTitle = isFutureReviewWeek
    ? "Không thể chốt tuần tương lai."
    : shouldConfirmEarlyReview
      ? "Bạn đang chốt review sớm."
      : canSubmitWeeklyReview
        ? "Đã đủ 4 bước để lưu review."
        : `Còn ${reviewPendingItems.length} mục cần hoàn tất.`;
  const reviewStatusHint = isFutureReviewWeek
    ? "Quay lại tuần hiện tại để chốt review này."
    : canSubmitWeeklyReview
      ? "Bạn có thể lưu ngay hoặc rà soát lại câu trả lời trước khi chốt."
      : `Thiếu: ${reviewPendingItems.map((item) => item.label).join(", ")}.`;
  const reviewStickyStatus = canSubmitWeeklyReview
    ? "Sẵn sàng chốt"
    : reviewPendingItems.length === 1
      ? `Thiếu ${reviewPendingItems[0]?.label}`
      : `Thiếu ${reviewPendingItems.length} mục`;

  const saveWeeklyReview = async () => {
    setIsSavingReview(true);
    try {
      await Promise.resolve(onSaveWeeklyReview());
      setIsStartingEarly(false);
      setIsEditingReview(false);
    } finally {
      setIsSavingReview(false);
      setShowEarlyReviewConfirm(false);
    }
  };

  const handleSaveReviewClick = async () => {
    if (isSavingReview || !canSubmitWeeklyReview) return;
    if (isFutureReviewWeek) return;
    if (shouldConfirmEarlyReview) {
      setShowEarlyReviewConfirm(true);
      return;
    }
    await saveWeeklyReview();
  };

  // Helper to calculate tactic progress for the current week view
  const getTacticProgress = (indicator: LeadIndicator) => {
    const tasks = system.taskInstances.filter(
      (t) =>
        t.weekNumber === currentWeekLimit && (t.tacticId === indicator.id || t.leadIndicatorName === indicator.name),
    );
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    let status: "Not started" | "In Progress" | "Done" | "Behind" = "Not started";
    const todayStr = new Date().toISOString().split("T")[0];
    const hasBehindTask = tasks.some((t) => !t.completed && t.scheduledDate && t.scheduledDate < todayStr);

    if (total === 0) {
      status = "Not started";
    } else if (completed === total) {
      status = "Done";
    } else if (hasBehindTask) {
      status = "Behind";
    } else if (completed > 0) {
      status = "In Progress";
    } else {
      status = "Not started";
    }

    return { total, completed, percent, status };
  };

  const mergedIndicators = [
    ...coreIndicators.map((ind) => ({ ...ind, isCore: true })),
    ...optionalIndicators.map((ind) => ({ ...ind, isCore: false })),
  ];

  // Staggered animation index tracker
  const staggerRef = useRef(0);
  const nextStaggerIndex = () => {
    staggerRef.current += 1;
    return staggerRef.current - 1;
  };
  // Reset stagger counter on mount
  useEffect(() => {
    staggerRef.current = 0;
  }, []);

  // ---- Reusable Section wrapper with stagger animation ----
  const StaggerSection = ({
    children,
    className,
    style,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <div
      className={cn("weekly-stagger-item", className)}
      style={{ "--stagger-index": nextStaggerIndex(), ...style } as React.CSSProperties}
    >
      {children}
    </div>
  );

  // ---- Tactic status: color mapping ----
  const tacticStatusStyle = (status: string) => {
    switch (status) {
      case "Done":
        return {
          dot: "bg-app-status-success",
          badge: "border-app-status-success/30 bg-app-status-success/10 text-app-status-success",
          label: "Hoàn thành",
        };
      case "Behind":
        return {
          dot: "bg-app-status-error",
          badge: "border-app-status-error/30 bg-app-status-error/10 text-app-status-error",
          label: "Trễ hạn",
        };
      case "In Progress":
        return {
          dot: "bg-app-status-warning",
          badge: "border-app-status-warning/30 bg-app-status-warning/10 text-app-status-warning",
          label: "Đang tiến hành",
        };
      default:
        return {
          dot: "bg-app-ink-muted",
          badge: "border-app-line/40 bg-app-bg-subtle text-app-ink-muted",
          label: "Chưa bắt đầu",
        };
    }
  };

  return (
    <div
      data-testid="weekly-review-shell"
      className={`flex flex-col gap-4 pt-1 sm:gap-5 sm:pt-2 ${showForm && canShowFormReview ? "pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:pb-0" : "pb-24 md:pb-0"}`}
    >
      <AlertDialog open={showEarlyReviewConfirm} onOpenChange={setShowEarlyReviewConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lưu review trước khi tuần kết thúc?</AlertDialogTitle>
            <AlertDialogDescription>
              Tuần hiện tại chưa tới ngày review. Nếu lưu sớm, hệ thống sẽ ghi nhận kết quả tuần này ngay bây giờ và
              dùng dữ liệu đó để gợi ý bước tiếp theo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingReview}>Quay lại chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSavingReview}
              onClick={(event) => {
                event.preventDefault();
                void saveWeeklyReview();
              }}
            >
              {isSavingReview ? "Đang lưu…" : "Vẫn lưu sớm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {rescueStatus && rescueStatus.severity !== "none" && (
        <TwelveWeekRescueNudge
          status={rescueStatus}
          variant="week"
          onPickTinyTask={onPickTinyTask ?? onOpenTodayTab}
          onOpenWeekTab={onOpenTodayTab}
          onReducePlan={onReducePlan}
          onReviewPlan={onApplySuggestedPlan}
        />
      )}

      {/* ========================================================================= */}
      {/* STATE 1: BEFORE REVIEW IS DUE                                             */}
      {/* ========================================================================= */}
      {!reviewIsCompleted && !canShowFormReview && (
        <>
          {/* ── Hero Score Card ──────────────────────────────────────────────── */}
          <StaggerSection>
            <div className="weekly-grain-overlay relative overflow-hidden rounded-card border border-app-line/45 bg-gradient-to-br from-app-surface via-app-bg-subtle to-app-accent-soft/15 p-5 pt-9 shadow-xs weekly-card-lift sm:p-8 sm:pt-10">
              <PaperPin />
              <WashiTape className="opacity-75 rotate-[-1deg] -top-3.5" />
              {/* Large score focal glow */}
              <div className="weekly-score-hero rounded-card-lg" />

              {/* Header metadata row */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-app-ink-muted">
                <span className="font-serif text-sm font-bold tracking-normal normal-case text-app-ink bg-app-bg/85 px-2.5 py-0.5 rounded-md border border-app-line/20">
                  Tuần {currentWeekLimit} / {system.totalWeeks}
                </span>
                <span className="min-w-0 bg-app-bg/85 px-2.5 py-0.5 rounded-md border border-app-line/20 font-mono text-[11px]">
                  {currentWeekRange
                    ? `${formatCalendarDate(currentWeekRange.start)} – ${formatCalendarDate(currentWeekRange.end)}`
                    : "Chu kỳ hiện tại"}
                </span>
              </div>

              {/* Plan focus title */}
              {currentPlanFocus && (
                <h2 className="relative z-10 mt-4 max-w-[18ch] text-balance font-serif text-2xl font-bold leading-tight tracking-tight text-app-ink sm:text-3xl sm:leading-snug">
                  {currentPlanFocus}
                </h2>
              )}
              {currentPlanMilestone && (
                <p className="relative z-10 mt-1.5 max-w-[65ch] text-xs leading-relaxed text-app-ink-soft">
                  Cột mốc:{" "}
                  <span className="font-semibold text-app-ink bg-app-bg/60 px-2 py-0.5 rounded-md border border-app-line/10 font-sans">
                    {currentPlanMilestone}
                  </span>
                </p>
              )}

              {/* Score focal area — asymmetric split */}
              <div className="pt-6 mt-4 border-t border-app-line/30 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-end gap-6">
                  {/* Left: Big score number */}
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-app-ink-soft uppercase tracking-[0.16em] block mb-2">
                      Điểm thực thi
                    </span>
                    {weekCompletion.isEmpty ? (
                      <span
                        data-testid="weekly-lead-score"
                        className="text-sm font-semibold text-app-ink-soft font-sans"
                      >
                        Chưa có việc
                      </span>
                    ) : (
                      <span
                        data-testid="weekly-lead-score"
                        className="weekly-score-animate font-serif text-6xl sm:text-7xl font-extrabold text-app-accent leading-[0.95] tracking-tighter"
                      >
                        {leadScoreValue}%
                      </span>
                    )}
                  </div>
                  {/* Right: Interpretation & progress */}
                  {!weekCompletion.isEmpty && (
                    <div className="flex-1 flex flex-col gap-2.5 sm:pt-2">
                      <Progress
                        value={leadScoreValue}
                        className="h-2.5 bg-app-bg/60 rounded-full weekly-progress-bar"
                      />
                      <p className="text-xs text-app-ink-soft leading-relaxed font-sans">
                        <span className="font-bold text-app-ink block text-sm mb-0.5">
                          {scoreInterpretation.headline}
                        </span>
                        {scoreInterpretation.advice}
                      </p>
                      <p className="text-[10px] text-app-ink-muted font-medium">
                        {weekCompletion.completed}/{weekCompletion.total} việc đã hoàn thành
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-card-lg border border-app-line/35 bg-app-bg/55 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                      Tổng quan tuần này
                    </p>
                    <p className="mt-1.5 text-sm font-semibold leading-snug text-app-ink">
                      {weekCompletion.isEmpty
                        ? "Chưa có việc nào được lên lịch."
                        : `Đã hoàn thành ${weekCompletion.completed}/${weekCompletion.total} việc.`}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">
                      {weekCompletion.isEmpty
                        ? "Khi bạn thêm việc trong Hôm nay, tiến độ tuần sẽ hiển thị ở đây."
                        : "Dùng review tuần để nhìn xem nhịp thực thi có đủ ổn định không."}
                    </p>
                  </div>

                  <div className="rounded-card-lg border border-app-line/35 bg-app-bg/55 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                      {lagScoreValue !== null ? "Chỉ số kết quả" : "Nhắc review"}
                    </p>
                    {lagScoreValue !== null ? (
                      <>
                        <div className="mt-1.5 flex items-end justify-between gap-3">
                          <p className="font-serif text-2xl font-bold leading-none text-app-ink">{lagScoreValue}%</p>
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[10px] font-bold",
                              scoreTone.panel,
                              scoreTone.text,
                            )}
                          >
                            {scoreInterpretation.headline}
                          </span>
                        </div>
                        <p className="mt-1 break-words text-xs leading-relaxed text-app-ink-soft">
                          {system.lagMetric.name}: <span className="font-semibold text-app-ink">{lagMetricValue}</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-1.5 text-sm font-semibold leading-snug text-app-ink">
                          Review chính thức mở vào {getReviewDayLabel(system.reviewDay)}.
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">
                          Bạn có thể bắt đầu sớm nếu muốn chốt nhận xét trước khi tuần kết thúc.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </StaggerSection>

          {/* ── Tactic Indicator Grid ────────────────────────────────────────── */}
          <StaggerSection>
            <div className="rounded-card border border-app-line/45 bg-app-surface p-6 sm:p-8 shadow-xs space-y-5 relative pt-10 weekly-card-lift">
              <WashiTape className="opacity-60 rotate-[1deg] -top-3.5" />
              <div className="flex items-center justify-between border-b border-app-line/30 pb-3.5 pt-1">
                <h3 className="text-lg font-bold text-app-ink font-serif">Hành động cam kết</h3>
                <span className="text-xs text-app-ink-soft font-bold bg-app-bg px-2.5 py-0.5 rounded-lg border border-app-line/10">
                  {mergedIndicators.length} việc
                </span>
              </div>

              {mergedIndicators.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-app-bg-subtle flex items-center justify-center">
                    <span className="text-app-ink-muted text-lg font-serif">?</span>
                  </div>
                  <p className="text-xs text-app-ink-muted max-w-xs mx-auto leading-relaxed">
                    Chưa có hành động cam kết nào cho tuần này. Khi các hành động lặp lại được lên lịch ở Hôm nay, chúng
                    sẽ hiển thị ở đây.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mergedIndicators.map((indicator, idx) => {
                    const { total, completed, percent, status } = getTacticProgress(indicator);
                    const st = tacticStatusStyle(status);
                    return (
                      <div
                        key={indicator.id || indicator.name}
                        className="weekly-stagger-item weekly-card-lift group flex flex-col gap-2.5 p-4 rounded-card-lg border border-app-line/40 bg-app-bg-subtle/70 hover:bg-app-accent-subtle/25 transition-all duration-300 shadow-3xs"
                        style={{ "--stagger-index": idx + 1 } as React.CSSProperties}
                      >
                        {/* Top row: name + core/optional badge */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            data-tactic-status={status}
                            className={`weekly-status-dot h-2.5 w-2.5 rounded-full shrink-0 ${st.dot}`}
                          />
                          <span className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug text-app-ink">
                            {indicator.name}
                          </span>
                          <Badge
                            variant={indicator.isCore ? "success" : "warning"}
                            className="shadow-none rounded-md text-[9px] px-1.5 py-0 font-bold shrink-0"
                          >
                            {indicator.isCore ? "Cốt lõi" : "Tùy chọn"}
                          </Badge>
                        </div>

                        {/* Bottom row: progress + status */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs text-app-ink-soft font-medium">
                            <span>
                              {completed}/{total || indicator.target || 1} {indicator.unit || "lần"}
                            </span>
                            {!weekCompletion.isEmpty && (
                              <span className="font-mono font-bold text-app-accent bg-app-accent-soft/50 px-2 py-0.5 rounded-md text-[11px]">
                                {percent}%
                              </span>
                            )}
                          </div>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", st.badge)}>
                            {st.label}
                          </span>
                        </div>

                        {/* Mini progress bar */}
                        {!weekCompletion.isEmpty && total > 0 && (
                          <div className="w-full h-1 bg-app-bg/50 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", st.dot)}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </StaggerSection>

          {/* ── Review reminder ──────────────────────────────────────────────── */}
          <StaggerSection>
            <div className="flex flex-col gap-4 rounded-card-lg border border-app-line/40 bg-app-bg/20 p-4 weekly-card-lift sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">Chuẩn bị review</p>
                <p className="text-sm font-semibold leading-snug text-app-ink">Nhìn lại và đánh giá tuần</p>
                <p className="max-w-[65ch] text-xs leading-relaxed text-app-ink-soft">
                  Review chính thức sẽ mở vào {getReviewDayLabel(system.reviewDay)}.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full rounded-card border-app-line bg-app-surface px-4.5 py-2.5 text-xs font-semibold text-app-ink shadow-2xs transition-all hover:bg-app-bg weekly-btn-press sm:w-auto sm:shrink-0"
                onClick={() => setIsStartingEarly(true)}
              >
                Bắt đầu review sớm
              </Button>
            </div>
          </StaggerSection>
        </>
      )}

      {/* ========================================================================= */}
      {/* STATE 2: WHEN REVIEW IS DUE / ACTIVE FORM                                 */}
      {/* ========================================================================= */}
      {!reviewIsCompleted && canShowFormReview && (
        <StaggerSection>
          <div className="rounded-card border border-app-line/45 bg-gradient-to-br from-app-surface via-app-surface to-app-accent-soft/10 p-4 shadow-xs space-y-3 weekly-card-lift sm:p-8 sm:space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest text-app-ink-muted">
              <span className="font-serif text-sm font-semibold tracking-normal normal-case text-app-ink bg-app-bg/85 px-2.5 py-0.5 rounded-md border border-app-line/20">
                Tuần {currentWeekLimit} / {system.totalWeeks}
              </span>
              <span className="min-w-0 bg-app-bg/85 px-2.5 py-0.5 rounded-md border border-app-line/20 font-mono text-[11px]">
                {currentWeekRange
                  ? `${formatCalendarDate(currentWeekRange.start)} – ${formatCalendarDate(currentWeekRange.end)}`
                  : "Chu kỳ hiện tại"}
              </span>
            </div>
            {currentPlanFocus && (
              <p className="mt-2 max-w-[65ch] text-xs leading-relaxed text-app-ink-soft sm:text-sm">
                Tiêu điểm:{" "}
                <span className="font-semibold text-app-ink bg-app-bg/40 px-2 py-0.5 rounded-md border border-app-line/10">
                  {currentPlanFocus}
                </span>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                  scoreTone.panel,
                  scoreTone.text,
                )}
              >
                {scoreInterpretation.headline}
              </span>
              <span className="inline-flex items-center rounded-full border border-app-line/40 bg-app-bg/55 px-2.5 py-1 text-[10px] font-semibold text-app-ink-soft">
                Tiến độ {reviewReadyCount}/4
              </span>
            </div>

            <div className="flex flex-col gap-3 border-t border-app-line/30 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:pt-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-baseline justify-between text-xs font-semibold text-app-ink-soft">
                  <span className="font-serif">Điểm thực thi</span>
                  {weekCompletion.isEmpty ? (
                    <span data-testid="weekly-lead-score" className="font-bold">
                      Chưa có việc
                    </span>
                  ) : (
                    <span data-testid="weekly-lead-score" className="font-bold text-app-accent">
                      {leadScoreValue}%
                    </span>
                  )}
                </div>
                {!weekCompletion.isEmpty && (
                  <Progress value={leadScoreValue} className="h-1.5 bg-app-bg rounded-full" />
                )}
              </div>

              {lagScoreValue !== null && (
                <div className="flex flex-1 flex-col justify-between space-y-1 border-t border-app-line/30 pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                  <div className="flex items-baseline justify-between text-xs font-semibold text-app-ink-soft">
                    <span className="font-serif">Chỉ số kết quả</span>
                    <span data-testid="weekly-lag-score" className="font-bold text-app-ink">
                      {lagScoreValue}%
                    </span>
                  </div>
                  <span className="min-w-0 break-words text-xs font-medium leading-snug text-app-ink-muted">
                    {system.lagMetric.name}: {lagMetricValue}
                  </span>
                </div>
              )}
            </div>
          </div>
        </StaggerSection>
      )}

      {/* Review Form (when showForm AND canShowFormReview) */}
      {showForm && (
        <div
          className={cn(
            "relative space-y-5 rounded-card border border-app-line/45 bg-app-surface p-4 pt-8 shadow-xs weekly-card-lift sm:space-y-6 sm:p-8 sm:pt-10",
            !canShowFormReview && "hidden",
          )}
        >
          <WashiTape className="opacity-60 rotate-[-1deg] -top-3.5" />
          <div className="space-y-1 pt-1">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-app-ink">Đánh giá và cam kết tuần</h3>
            <p className="max-w-[65ch] text-xs leading-relaxed text-app-ink-soft sm:text-sm">
              Ghi chép lại bài học tuần cũ và thiết lập ưu tiên tuần mới để giữ nhịp thực thi ổn định.
            </p>
          </div>

          <TwelveWeekEmotionFlow system={system} currentWeekRange={currentWeekRange} currentWeek={reviewWeekNumber} />

          <div id="weekly-review-flow" data-testid="weekly-review-flow" className="space-y-5 sm:space-y-6">
            {/* Step 1: Execution Score */}
            <div data-testid="wam-section-score" className="space-y-2">
              <div
                data-testid="weekly-review-step-score"
                data-done="true"
                className="space-y-3 border-b border-app-line/25 bg-transparent pb-5 sm:space-y-4 sm:pb-6"
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-app-accent-soft text-[10px] font-bold text-app-accent">
                    1
                  </span>
                  <span>Điểm thực thi</span>
                </div>

                <div className="flex items-start gap-3 pt-1 sm:items-center sm:gap-3.5">
                  {weekCompletion.isEmpty ? (
                    <span data-testid="weekly-lead-score" className="text-xs font-semibold text-app-ink-soft">
                      Chưa có việc trong tuần này
                    </span>
                  ) : (
                    <span className="text-3xl font-serif font-bold text-app-accent leading-[0.95]">
                      {leadScoreValue}%
                    </span>
                  )}
                  {!weekCompletion.isEmpty && (
                    <div className="text-xs text-app-ink-soft leading-snug">
                      <span className="font-bold text-app-ink block">{scoreInterpretation.headline}</span>
                      <span className="text-xs block mt-0.5 text-app-ink-soft">{scoreInterpretation.advice}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <TwelveWeekPremiumInsightSection
              currentPlanCode={currentPlanCode}
              hasPremiumInsights={hasPremiumInsights}
              premiumInsight={premiumInsight}
              suggestedNextWeekPlan={suggestedNextWeekPlan}
              onApplySuggestedPlan={onApplySuggestedPlan}
              onOpenPremiumInsights={onOpenPremiumInsights}
            />

            {/* Step 2: Commitment Check */}
            <div data-testid="wam-section-commitments" className="space-y-2">
              <div
                data-testid="weekly-review-step-commitments"
                data-done={allPreviousCommitmentsAnswered ? "true" : "false"}
                className="space-y-3 border-b border-app-line/25 bg-transparent pb-5 sm:space-y-4 sm:pb-6"
              >
                <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-app-warm-soft text-[10px] font-bold text-app-warm-strong">
                    2
                  </span>
                  <span>Đánh giá cam kết cũ</span>
                </Label>
                <p className="text-xs text-app-ink-muted">Chọn trạng thái cho các cam kết tuần trước.</p>

                {previousCommitments.length === 0 ? (
                  <div className="rounded-card border border-dashed border-app-line bg-app-surface px-4 py-3.5 text-xs leading-relaxed text-app-ink-soft">
                    Tuần đầu chưa có cam kết tuần trước. Hãy đặt ưu tiên tuần sau tại mục 4 bên dưới.
                  </div>
                ) : (
                  <div className="space-y-3 mt-2.5">
                    {previousCommitments.map((commitment) => {
                      const currentStatus = weeklyForm.commitmentStatuses[commitment] ?? "unanswered";
                      const commitmentQuote = getCommitmentQuoteForPreviousCommitment(system, commitment);
                      const setStatus = (status: WeeklyCommitmentStatus) =>
                        onWeeklyFormChange("commitmentStatuses", {
                          ...weeklyForm.commitmentStatuses,
                          [commitment]: status,
                        });

                      return (
                        <div
                          key={commitment}
                          className="space-y-2.5 rounded-card border border-app-line/40 bg-app-surface p-3 transition-colors duration-200 hover:border-app-line/60 sm:p-3.5"
                        >
                          <p className="text-xs sm:text-sm font-semibold text-app-ink leading-snug">{commitment}</p>
                          {commitmentQuote && (
                            <p className="text-xs italic text-app-ink-muted leading-relaxed pl-2.5 border-l-2 border-app-line/30">
                              {commitmentQuote}
                            </p>
                          )}
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={getCommitmentButtonClass("kept", currentStatus)}
                              aria-pressed={currentStatus === "kept"}
                              onClick={() => setStatus("kept")}
                            >
                              Đã giữ
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={getCommitmentButtonClass(
                                "kept",
                                currentStatus === "missed" ? "missed" : "unanswered",
                              )}
                              style={{ display: "none" }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={getCommitmentButtonClass("missed", currentStatus)}
                              aria-pressed={currentStatus === "missed"}
                              onClick={() => setStatus("missed")}
                            >
                              Bỏ lỡ
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={getCommitmentButtonClass("not_set", currentStatus)}
                              aria-pressed={currentStatus === "not_set"}
                              onClick={() => setStatus("not_set")}
                            >
                              Không đặt
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Breakdown / Lesson */}
            <div data-testid="wam-section-insights" className="space-y-2">
              <div
                data-testid="weekly-review-step-insights"
                data-done={weeklyForm.insights.trim().length > 0 ? "true" : "false"}
                className="space-y-3 border-b border-app-line/25 bg-transparent pb-5 sm:space-y-4 sm:pb-6"
              >
                <Label
                  htmlFor="weekly-insights"
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-app-accent-soft text-[10px] font-bold text-app-accent">
                    3
                  </span>
                  <span>Góc nhìn/điều học được</span>
                </Label>
                <p className="text-xs text-app-ink-muted">Ghi nhận bài học kinh nghiệm rút ra trong tuần.</p>
                <Textarea
                  id="weekly-insights"
                  rows={3}
                  className="mt-2 text-xs sm:text-sm bg-app-surface border-app-line/60 rounded-card placeholder:text-app-ink-muted/50 p-3 focus:ring-1 focus:ring-app-accent/20 transition-shadow duration-200"
                  value={weeklyForm.insights}
                  placeholder="Ví dụ: Tuần qua mình nhận ra học sâu 90 phút buổi sáng hiệu quả hơn học lắt nhắt buổi tối. Tuần sau sẽ dời khung giờ..."
                  onChange={(event) => onWeeklyFormChange("insights", event.target.value)}
                />
              </div>
            </div>

            {/* Step 4: Next Week Commitments */}
            <div data-testid="wam-section-next-commitments" className="space-y-2">
              <div
                data-testid="weekly-review-step-next"
                data-done={hasNextWeekCommitment ? "true" : "false"}
                className="space-y-3 bg-transparent pb-2 sm:space-y-4"
              >
                <Label
                  htmlFor="weekly-next-commitments"
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-app-warm-soft text-[10px] font-bold text-app-warm-strong">
                    4
                  </span>
                  <span>Cam kết của tuần tới</span>
                </Label>
                <p className="text-xs text-app-ink-muted">Chọn tối đa 5 hành động quan trọng nhất cho tuần mới.</p>
                <NextWeekCommitmentsEditor
                  value={nextWeekCommitments}
                  onChange={(next) => onWeeklyFormChange("nextWeekCommitments", next)}
                />
              </div>
            </div>
          </div>

          {/* Review readiness indicator */}
          <div
            data-testid="weekly-review-readiness"
            className="space-y-3 rounded-card-lg border border-app-line/40 bg-app-bg/30 px-4 py-4 text-xs text-app-ink-soft"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                  Checklist trước khi lưu
                </p>
                <p className="text-sm font-semibold text-app-ink">{reviewStatusTitle}</p>
                <p className="max-w-[65ch] text-xs leading-relaxed text-app-ink-soft">{reviewStatusHint}</p>
              </div>
              <div className="shrink-0 rounded-card border border-app-line/40 bg-app-surface px-3 py-2 sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-app-ink-muted">Tiến độ review</p>
                <p className="text-base font-semibold text-app-ink">{reviewReadyCount}/4</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {reviewReadinessItems.map((item) => (
                <div
                  key={item.key}
                  data-testid={`weekly-review-check-${item.key}`}
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-card border px-3 py-2.5 text-xs font-medium transition-colors",
                    item.done
                      ? "border-app-accent/20 bg-app-accent-soft/35 text-app-ink"
                      : "border-app-line/40 bg-app-surface text-app-ink-soft",
                  )}
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      item.done ? "bg-app-accent shadow-[0_0_6px_rgba(42,84,71,0.35)]" : "bg-app-line/80",
                    )}
                  />
                  <span className="min-w-0 break-words leading-snug">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden gap-2 pt-1 md:flex md:flex-row md:items-center md:justify-end">
            {(isEditingReview || isStartingEarly) && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 rounded-card border-app-line bg-app-surface px-4 py-2 text-xs font-semibold text-app-ink-soft transition-all hover:bg-app-bg weekly-btn-press"
                onClick={() => {
                  setIsEditingReview(false);
                  setIsStartingEarly(false);
                }}
              >
                Quay lại hôm nay
              </Button>
            )}
            <Button
              size="sm"
              className="min-h-11 rounded-card bg-app-warm px-4.5 py-2.5 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-app-warm-hover active:shadow-app-sm weekly-btn-press"
              onClick={handleSaveReviewClick}
              disabled={isSavingReview || !canSubmitWeeklyReview}
              aria-busy={isSavingReview}
            >
              {isSavingReview ? "Đang lưu..." : "Chốt review tuần này"}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATE 3: AFTER REVIEW IS COMPLETED                                        */}
      {/* ========================================================================= */}
      {!showForm && summaryReview && (
        <div className="space-y-5 sm:space-y-6">
          {/* ── Summary Hero Card ──────────────────────────────────────────── */}
          <StaggerSection>
            <div
              data-testid="weekly-review-summary"
              className="weekly-grain-overlay space-y-5 rounded-card border border-app-line/45 bg-app-surface p-4 shadow-xs weekly-card-lift sm:space-y-6 sm:p-8"
            >
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-app-line/30 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted block">
                    Kết quả tuần này
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-app-ink leading-tight">
                    Tuần {currentWeekLimit}
                  </h3>
                  {currentWeekRange && (
                    <span className="text-xs text-app-ink-soft block mt-0.5">
                      {formatCalendarDate(currentWeekRange.start)} – {formatCalendarDate(currentWeekRange.end)}
                    </span>
                  )}
                </div>
                <Badge className="bg-app-warm-soft text-app-warm border-app-warm-border/10 font-bold px-3 py-1 rounded-card text-xs shadow-2xs">
                  Đã chốt
                </Badge>
              </div>

              {system.week12Outcome && (
                <p className="text-xs sm:text-sm text-app-ink-soft leading-relaxed">
                  <span className="font-bold text-app-ink">Mục tiêu chu kỳ:</span> {system.week12Outcome}
                </p>
              )}

              {/* Focal score area — dual column with glow */}
              <div className="relative flex flex-col items-stretch justify-between gap-4 overflow-hidden rounded-card-lg border border-app-line/40 bg-app-bg/10 p-4 sm:flex-row sm:gap-6 sm:p-5">
                <div className="weekly-score-hero" />
                <div className="flex-1 flex flex-col justify-between space-y-2 relative z-10">
                  <span className="text-xs font-bold uppercase tracking-wider text-app-ink-muted block">
                    Điểm thực thi
                  </span>
                  <p
                    data-testid="weekly-lead-score"
                    className="weekly-score-animate font-serif text-5xl font-extrabold leading-none text-app-accent sm:text-7xl"
                  >
                    {summaryReview.leadCompletionPercent}%
                  </p>
                  <p className="text-xs text-app-ink-soft font-semibold mt-1">
                    Đã hoàn thành {weekCompletion.completed}/{weekCompletion.total} việc.
                  </p>
                </div>

                {lagScoreValue !== null && (
                  <div className="relative z-10 flex flex-1 flex-col justify-between space-y-2 border-t border-app-line/30 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-app-ink-muted block">
                      Chỉ số kết quả
                    </span>
                    <p
                      data-testid="weekly-lag-score"
                      className="font-serif text-3xl font-extrabold leading-[0.95] text-app-ink sm:text-5xl"
                    >
                      {lagScoreValue}%
                    </p>
                    <p className="mt-1 break-words text-xs font-semibold leading-snug text-app-ink-soft">
                      {system.lagMetric.name}: {lagMetricValue}
                    </p>
                  </div>
                )}
              </div>

              {/* Score interpretation */}
              <div data-testid="weekly-score-interpretation" className="space-y-1.5 pt-1">
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${scoreTone.panel} ${scoreTone.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${scoreTone.marker}`} />
                  {scoreInterpretation.headline}
                </span>
                <p className="text-xs text-app-ink-soft leading-relaxed">{scoreInterpretation.advice}</p>
              </div>

              {/* Tactic indicators compact grid */}
              {mergedIndicators.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <span className="text-xs uppercase tracking-wider text-app-ink-muted block font-semibold">
                    Hành động đã cam kết
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mergedIndicators.map((indicator) => {
                      const { total, completed, percent } = getTacticProgress(indicator);
                      return (
                        <div
                          key={indicator.id || indicator.name}
                          className="flex items-center justify-between text-xs sm:text-sm text-app-ink bg-app-bg/5 p-3 rounded-card border border-app-line/10 hover:bg-app-accent-subtle/15 transition-colors duration-200"
                        >
                          <span className="min-w-0 max-w-[70%] break-words font-medium leading-snug">
                            · {indicator.name}
                          </span>
                          <span className="font-mono text-xs text-app-ink-soft font-bold shrink-0 bg-app-surface px-2 py-0.5 rounded-md border border-app-line/25">
                            {completed}/{total} ({percent}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <div className="rounded-card-lg border border-app-line/35 bg-app-bg/20 p-4">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-app-ink-muted">
                    Cam kết tuần cũ
                  </span>
                  <p className="mt-1.5 text-sm font-semibold leading-relaxed text-app-ink">
                    Đã giữ {summaryCommitmentsKept.length}/{summaryCommitmentTotal} cam kết
                  </p>

                  <div className="mt-3 space-y-2 text-xs text-app-ink-soft">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-app-ink">Giữ được</p>
                      {summaryCommitmentsKept.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {summaryCommitmentsKept.map((commitment) => (
                            <span
                              key={`kept-${commitment}`}
                              className="rounded-full border border-app-status-success/20 bg-app-status-success/10 px-2.5 py-1 text-[11px] font-semibold text-app-status-success"
                            >
                              {commitment}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p>Chưa có cam kết nào được đánh dấu giữ được.</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-semibold text-app-ink">Bỏ lỡ</p>
                      {summaryCommitmentsMissed.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {summaryCommitmentsMissed.map((commitment) => (
                            <span
                              key={`missed-${commitment}`}
                              className="rounded-full border border-app-status-error/20 bg-app-status-error/10 px-2.5 py-1 text-[11px] font-semibold text-app-status-error"
                            >
                              {commitment}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p>Không có cam kết nào bị bỏ lỡ.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-card-lg border border-app-line/35 bg-app-bg/20 p-4">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-app-ink-muted">
                    Tuần sau
                  </span>
                  <p className="mt-1.5 text-sm font-semibold leading-relaxed text-app-ink">
                    Một danh sách nhỏ, rõ và giữ được sẽ giúp bạn vào tuần mới gọn hơn.
                  </p>
                  {summaryNextWeekCommitments.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {summaryNextWeekCommitments.map((commitment) => (
                        <span
                          key={commitment}
                          className="rounded-full border border-app-warm-border/20 bg-app-warm-soft/70 px-3 py-1.5 text-xs font-semibold text-app-warm-strong shadow-3xs transition-colors duration-200 hover:bg-app-warm-soft"
                        >
                          {commitment}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs leading-relaxed text-app-ink-soft">
                      Chưa có cam kết mới được lưu cho tuần sau.
                    </p>
                  )}

                  {summaryReview.workloadDecision && (
                    <div className="mt-3 text-xs leading-relaxed text-app-ink-soft">
                      Quyết định tải việc:{" "}
                      <span className="font-semibold text-app-ink">
                        {getWorkloadDecisionLabel(summaryReview.workloadDecision)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lesson blockquote */}
              {summaryInsights && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs uppercase tracking-wider text-app-ink-muted block font-semibold">
                    Bài học rút ra
                  </span>
                  <blockquote className="relative rounded-card-lg border border-app-accent/15 bg-gradient-to-r from-app-accent-soft/40 to-app-accent-soft/10 p-4 font-serif italic leading-relaxed text-app-ink sm:p-4.5">
                    <span className="absolute top-2 left-3 text-app-accent/20 text-3xl font-serif leading-none select-none">
                      “
                    </span>
                    <span className="relative z-10 pl-4 block">{summaryInsights}</span>
                  </blockquote>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-app-line/10 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 rounded-card border border-app-line bg-app-surface px-4 py-2.5 text-xs font-semibold text-app-ink-soft transition-all hover:bg-app-bg weekly-btn-press sm:px-4.5"
                  onClick={() => setIsEditingReview(true)}
                >
                  Chỉnh sửa đánh giá
                </Button>
              </div>
            </div>
          </StaggerSection>

          {/* ── Next Week Action Card ─────────────────────────────────────── */}
          {nextWeekRecommendation && (
            <StaggerSection>
              <div className="space-y-3 rounded-card-lg border border-app-warm-border/10 bg-app-warm-soft/20 p-4 shadow-xs weekly-card-lift sm:space-y-4 sm:p-5">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-app-warm block">
                    Chuẩn bị tuần sau
                  </span>
                  <h4 className="text-sm font-semibold text-app-ink leading-snug">{nextWeekRecommendation.headline}</h4>
                </div>
                <p className="text-xs sm:text-sm text-app-ink-soft leading-relaxed">{nextWeekRecommendation.body}</p>

                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    className="min-h-11 rounded-card bg-app-warm px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-app-warm-hover weekly-btn-press"
                    onClick={onAcceptNextWeekRecommendation}
                  >
                    Áp dụng gợi ý tuần sau
                  </Button>
                  {onOpenTodayTab && (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 rounded-card border-app-line bg-app-surface px-4 py-2 text-xs font-semibold text-app-ink-soft hover:bg-app-bg weekly-btn-press"
                      onClick={onOpenTodayTab}
                    >
                      Quay lại hôm nay
                    </Button>
                  )}
                </div>
              </div>
            </StaggerSection>
          )}

          {/* ── Optional Insights ─────────────────────────────────────────── */}
          {weeklyReflectionInsights && weeklyReflectionInsights.length > 0 && (
            <StaggerSection>
              <Collapsible
                open={isInsightsOpen}
                onOpenChange={setIsInsightsOpen}
                className="overflow-hidden shadow-none border-0 bg-transparent"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left py-2 hover:opacity-85 transition-opacity"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium text-app-ink-soft hover:text-app-ink transition-colors">
                      <Lightbulb className="h-4 w-4 text-app-warm shrink-0" />
                      <span>Xem phân tích & góc nhìn bổ sung</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-app-ink-muted transition-transform duration-200",
                        isInsightsOpen && "rotate-180",
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 bg-transparent">
                  <TwelveWeekInsightsCard
                    variant="reflection"
                    insights={weeklyReflectionInsights}
                    title="Đáng giữ và đáng điều chỉnh tuần sau"
                    onOpenToday={onOpenTodayTab}
                    onOpenWeekReview={undefined}
                    onReduceLoad={onApplySuggestedPlan}
                    onTightenScope={onApplySuggestedPlan}
                    onResetFocus={onOpenTodayTab}
                    onCelebrate={onOpenTodayTab}
                  />
                </CollapsibleContent>
              </Collapsible>
            </StaggerSection>
          )}
        </div>
      )}

      {/* Sticky Mobile Review CTA */}
      {showForm && canShowFormReview && (
        <div
          data-testid="weekly-review-mobile-sticky-cta"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 border-t border-app-line/80 bg-app-surface px-4 pb-4 pt-3 shadow-[0_-18px_40px_-30px_rgba(23,21,15,0.45)] md:hidden"
        >
          <div className="mx-auto flex w-full max-w-[42rem] flex-col gap-2.5 md:max-w-none">
            <div className="flex items-start justify-between gap-3 text-[11px] font-semibold text-app-ink-muted">
              <span className="min-w-0 break-words leading-snug">Tiến độ review {reviewReadyCount}/4</span>
              <span className={canSubmitWeeklyReview ? "text-app-warm-strong" : "text-app-ink-muted"}>
                {reviewStickyStatus}
              </span>
            </div>
            <Button
              size="lg"
              className="min-h-12 w-full rounded-xl bg-app-warm px-4 py-3 text-sm font-bold text-white shadow-app-sm transition-all duration-150 hover:bg-app-warm-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-app-ink-muted disabled:opacity-70 weekly-btn-press"
              onClick={handleSaveReviewClick}
              disabled={isSavingReview || !canSubmitWeeklyReview}
              aria-busy={isSavingReview}
            >
              {isSavingReview ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                  Đang lưu...
                </>
              ) : (
                "Chốt review tuần này"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

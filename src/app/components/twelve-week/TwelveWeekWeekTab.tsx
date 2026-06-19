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
    return "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg-subtle text-xs px-3 py-2 sm:px-2.5 sm:py-1.5 min-h-[36px] sm:min-h-0 flex items-center justify-center rounded-lg transition-all duration-200 weekly-btn-press";
  }

  switch (status) {
    case "kept":
      return "border-app-status-success/30 bg-app-status-success/10 text-app-status-success hover:bg-app-status-success/20 font-semibold text-xs px-3 py-2 sm:px-2.5 sm:py-1.5 min-h-[36px] sm:min-h-0 flex items-center justify-center rounded-lg shadow-2xs ring-1 ring-app-status-success/15 weekly-btn-press";
    case "missed":
      return "border-app-status-error/30 bg-app-status-error/10 text-app-status-error hover:bg-app-status-error/20 font-semibold text-xs px-3 py-2 sm:px-2.5 sm:py-1.5 min-h-[36px] sm:min-h-0 flex items-center justify-center rounded-lg shadow-2xs ring-1 ring-app-status-error/15 weekly-btn-press";
    case "not_set":
      return "border-app-line-strong bg-app-bg-subtle text-app-ink-soft hover:bg-app-line-strong/20 font-semibold text-xs px-3 py-2 sm:px-2.5 sm:py-1.5 min-h-[36px] sm:min-h-0 flex items-center justify-center rounded-lg shadow-2xs weekly-btn-press";
    default:
      return "border-app-ink bg-app-ink text-white font-semibold text-xs px-3 py-2 sm:px-2.5 sm:py-1.5 min-h-[36px] sm:min-h-0 flex items-center justify-center rounded-lg shadow-2xs weekly-btn-press";
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
    { key: "score", label: "Điểm", done: true },
    { key: "commitments", label: "Cam kết", done: allPreviousCommitmentsAnswered },
    { key: "insights", label: "Góc nhìn", done: weeklyForm.insights.trim().length > 0 },
    { key: "next", label: "Tuần tới", done: hasNextWeekCommitment },
  ];
  const reviewReadyCount = reviewReadinessItems.filter((item) => item.done).length;
  const canSubmitWeeklyReview = allPreviousCommitmentsAnswered && hasNextWeekCommitment && !isFutureReviewWeek;

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
    <div className="flex flex-col gap-5 pt-2 pb-24 md:pb-0">
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
            <div className="weekly-grain-overlay rounded-3xl border border-app-line/45 bg-gradient-to-br from-app-surface via-app-bg-subtle to-app-accent-soft/15 shadow-xs relative overflow-hidden p-6 sm:p-8 pt-10 weekly-card-lift">
              <PaperPin />
              <WashiTape className="opacity-75 rotate-[-1deg] -top-3.5" />
              {/* Large score focal glow */}
              <div className="weekly-score-hero rounded-2xl" />

              {/* Header metadata row */}
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-app-ink-muted relative z-10">
                <span className="font-serif text-sm font-bold tracking-normal normal-case text-app-ink bg-app-bg/85 px-2.5 py-0.5 rounded-md border border-app-line/20">
                  Tuần {currentWeekLimit} / {system.totalWeeks}
                </span>
                <span className="bg-app-bg/85 px-2.5 py-0.5 rounded-md border border-app-line/20 font-sans">
                  {currentWeekRange
                    ? `${formatCalendarDate(currentWeekRange.start)} – ${formatCalendarDate(currentWeekRange.end)}`
                    : "Chu kỳ hiện tại"}
                </span>
              </div>

              {/* Plan focus title */}
              {currentPlanFocus && (
                <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight leading-tight sm:leading-snug text-app-ink mt-4 relative z-10">
                  {currentPlanFocus}
                </h2>
              )}
              {currentPlanMilestone && (
                <p className="text-xs text-app-ink-soft mt-1.5 relative z-10">
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
                      <span data-testid="weekly-lead-score" className="text-sm font-semibold text-app-ink-soft font-sans">
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
              </div>
            </div>
          </StaggerSection>

          {/* ── Tactic Indicator Grid ────────────────────────────────────────── */}
          <StaggerSection>
            <div className="rounded-3xl border border-app-line/45 bg-app-surface p-6 sm:p-8 shadow-xs space-y-5 relative pt-10 weekly-card-lift">
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
                    Chưa có hành động cam kết nào cho tuần này. Khi các hành động lặp lại được lên lịch ở Hôm nay, chúng sẽ hiển thị ở đây.
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
                        className="weekly-stagger-item weekly-card-lift group flex flex-col gap-2.5 p-4 rounded-2xl border border-app-line/40 bg-app-bg-subtle/70 hover:bg-app-accent-subtle/25 transition-all duration-300 shadow-3xs"
                        style={{ "--stagger-index": idx + 1 } as React.CSSProperties}
                      >
                        {/* Top row: name + core/optional badge */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            data-tactic-status={status}
                            className={`weekly-status-dot h-2.5 w-2.5 rounded-full shrink-0 ${st.dot}`}
                          />
                          <span className="text-sm font-semibold text-app-ink truncate flex-1">{indicator.name}</span>
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
                              <span className="font-bold text-app-accent bg-app-accent-soft/50 px-2 py-0.5 rounded-md text-[11px]">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl border border-app-line/40 bg-app-bg/20 weekly-card-lift">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-app-ink">Nhìn lại & Đánh giá tuần</p>
                <p className="text-xs text-app-ink-soft">
                  Review chính thức sẽ mở vào {getReviewDayLabel(system.reviewDay)}.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="text-xs font-semibold px-4.5 py-2.5 h-10 rounded-xl border-app-line bg-app-surface text-app-ink hover:bg-app-bg transition-all shrink-0 shadow-2xs weekly-btn-press"
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
          <div className="rounded-3xl border border-app-line/45 bg-gradient-to-br from-app-surface via-app-surface to-app-accent-soft/10 p-6 sm:p-8 shadow-xs space-y-4 weekly-card-lift">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-app-ink-muted">
              <span className="font-serif text-sm font-semibold tracking-normal normal-case text-app-ink bg-app-bg/85 px-2.5 py-0.5 rounded-md border border-app-line/20">
                Tuần {currentWeekLimit} / {system.totalWeeks}
              </span>
              <span className="bg-app-bg/85 px-2.5 py-0.5 rounded-md border border-app-line/20">
                {currentWeekRange
                  ? `${formatCalendarDate(currentWeekRange.start)} – ${formatCalendarDate(currentWeekRange.end)}`
                  : "Chu kỳ hiện tại"}
              </span>
            </div>
            {currentPlanFocus && (
              <p className="text-xs sm:text-sm text-app-ink-soft leading-relaxed mt-2">
                Tiêu điểm:{" "}
                <span className="font-semibold text-app-ink bg-app-bg/40 px-2 py-0.5 rounded-md border border-app-line/10">
                  {currentPlanFocus}
                </span>
              </p>
            )}

            <div className="pt-4 border-t border-app-line/30 flex items-center justify-between gap-6">
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
                {!weekCompletion.isEmpty && <Progress value={leadScoreValue} className="h-1.5 bg-app-bg rounded-full" />}
              </div>

              {lagScoreValue !== null && (
                <div className="flex-1 pl-6 border-l border-app-line/30 flex flex-col justify-between space-y-1">
                  <div className="flex items-baseline justify-between text-xs font-semibold text-app-ink-soft">
                    <span className="font-serif">Chỉ số kết quả</span>
                    <span data-testid="weekly-lag-score" className="font-bold text-app-ink">
                      {lagScoreValue}%
                    </span>
                  </div>
                  <span className="text-xs text-app-ink-muted truncate font-medium">
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
            "rounded-3xl border border-app-line/45 bg-app-surface p-5 sm:p-8 shadow-xs space-y-6 relative pt-10 weekly-card-lift",
            !canShowFormReview && "hidden",
          )}
        >
          <WashiTape className="opacity-60 rotate-[-1deg] -top-3.5" />
          <div className="space-y-1 pt-1">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-app-ink">
              Đánh giá và cam kết tuần
            </h3>
            <p className="text-xs sm:text-sm text-app-ink-soft">
              Ghi chép lại bài học tuần cũ và thiết lập ưu tiên tuần mới để giữ nhịp thực thi ổn định.
            </p>
          </div>

          <TwelveWeekEmotionFlow system={system} currentWeekRange={currentWeekRange} currentWeek={reviewWeekNumber} />

          <div id="weekly-review-flow" data-testid="weekly-review-flow" className="space-y-6">
            {/* Step 1: Execution Score */}
            <div data-testid="wam-section-score" className="space-y-2">
              <div
                data-testid="weekly-review-step-score"
                data-done="true"
                className="pb-6 border-b border-app-line/25 bg-transparent space-y-4"
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-app-accent-soft text-[10px] font-bold text-app-accent">
                    1
                  </span>
                  <span>Điểm thực thi</span>
                </div>

                <div className="flex items-center gap-3.5 pt-1">
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
                className="pb-6 border-b border-app-line/25 bg-transparent space-y-4"
              >
                <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-app-warm-soft text-[10px] font-bold text-app-warm-strong">
                    2
                  </span>
                  <span>Đánh giá cam kết cũ</span>
                </Label>
                <p className="text-xs text-app-ink-muted">Chọn trạng thái cho các cam kết tuần trước.</p>

                {previousCommitments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-app-line bg-app-surface px-4 py-3.5 text-xs leading-relaxed text-app-ink-soft">
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
                          className="p-3.5 rounded-xl border border-app-line/40 bg-app-surface space-y-2.5 hover:border-app-line/60 transition-colors duration-200"
                        >
                          <p className="text-xs sm:text-sm font-semibold text-app-ink leading-snug">{commitment}</p>
                          {commitmentQuote && (
                            <p className="text-xs italic text-app-ink-muted leading-relaxed pl-2.5 border-l-2 border-app-line/30">
                              {commitmentQuote}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={getCommitmentButtonClass("kept", currentStatus)}
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
                              onClick={() => setStatus("missed")}
                            >
                              Bỏ lỡ
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={getCommitmentButtonClass("not_set", currentStatus)}
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
                className="pb-6 border-b border-app-line/25 bg-transparent space-y-4"
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
                  className="mt-2 text-xs sm:text-sm bg-app-surface border-app-line/60 rounded-xl placeholder:text-app-ink-muted/50 p-3 focus:ring-1 focus:ring-app-accent/20 transition-shadow duration-200"
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
                className="pb-2 bg-transparent space-y-4"
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
            className="rounded-xl border border-app-line/40 bg-app-bg/30 px-4 py-3 text-xs text-app-ink-soft flex items-center justify-between gap-3"
          >
            <p className="font-semibold text-app-ink shrink">
              {isFutureReviewWeek
                ? "Không thể chốt tuần tương lai."
                : shouldConfirmEarlyReview
                  ? "Xác nhận chốt review sớm."
                  : "Chốt đủ WAM 4 câu trước khi lưu."}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {[1, 2, 3, 4].map((step) => (
                <span
                  key={step}
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                    step <= reviewReadyCount
                      ? "bg-app-accent shadow-[0_0_6px_rgba(42,84,71,0.35)]"
                      : "bg-app-line/80"
                  }`}
                />
              ))}
              <span className="ml-1 text-[11px] font-semibold text-app-ink-soft">
                Tiến độ review ({reviewReadyCount}/4)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end pt-1">
            {(isEditingReview || isStartingEarly) && (
              <Button
                type="button"
                variant="outline"
                className="text-xs font-semibold px-4 py-2 rounded-xl border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg h-9.5 transition-all weekly-btn-press"
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
              className="bg-app-warm hover:bg-app-warm-hover text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl shadow-2xs h-9.5 transition-all weekly-btn-press active:shadow-sm"
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
        <div className="space-y-6">
          {/* ── Summary Hero Card ──────────────────────────────────────────── */}
          <StaggerSection>
            <div
              data-testid="weekly-review-summary"
              className="weekly-grain-overlay rounded-3xl border border-app-line/45 bg-app-surface p-6 sm:p-8 shadow-xs space-y-6 weekly-card-lift"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-app-line/30 pb-4">
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
                <Badge className="bg-app-warm-soft text-app-warm border-app-warm-border/10 font-bold px-3 py-1 rounded-xl text-xs shadow-2xs">
                  Đã chốt
                </Badge>
              </div>

              {system.week12Outcome && (
                <p className="text-xs sm:text-sm text-app-ink-soft leading-relaxed">
                  <span className="font-bold text-app-ink">Mục tiêu chu kỳ:</span> {system.week12Outcome}
                </p>
              )}

              {/* Focal score area — dual column with glow */}
              <div className="flex flex-col sm:flex-row gap-6 p-5 rounded-2xl border border-app-line/40 bg-app-bg/10 justify-between items-stretch relative overflow-hidden">
                <div className="weekly-score-hero" />
                <div className="flex-1 flex flex-col justify-between space-y-2 relative z-10">
                  <span className="text-xs font-bold uppercase tracking-wider text-app-ink-muted block">
                    Điểm thực thi
                  </span>
                  <p
                    data-testid="weekly-lead-score"
                    className="weekly-score-animate font-serif text-6xl sm:text-7xl font-extrabold text-app-accent leading-none"
                  >
                    {summaryReview.leadCompletionPercent}%
                  </p>
                  <p className="text-xs text-app-ink-soft font-semibold mt-1">
                    Đã hoàn thành {weekCompletion.completed}/{weekCompletion.total} việc.
                  </p>
                </div>

                {lagScoreValue !== null && (
                  <div className="flex-1 flex flex-col justify-between space-y-2 sm:border-l sm:border-app-line/30 sm:pl-6 relative z-10">
                    <span className="text-xs font-bold uppercase tracking-wider text-app-ink-muted block">
                      Chỉ số kết quả
                    </span>
                    <p
                      data-testid="weekly-lag-score"
                      className="font-serif text-4xl sm:text-5xl font-extrabold text-app-ink leading-[0.95]"
                    >
                      {lagScoreValue}%
                    </p>
                    <p className="text-xs text-app-ink-soft font-semibold mt-1 truncate">
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
                          className="flex items-center justify-between text-xs sm:text-sm text-app-ink bg-app-bg/5 p-3 rounded-xl border border-app-line/10 hover:bg-app-accent-subtle/15 transition-colors duration-200"
                        >
                          <span className="truncate max-w-[70%] font-medium">· {indicator.name}</span>
                          <span className="text-xs text-app-ink-soft font-bold shrink-0 bg-app-surface px-2 py-0.5 rounded-md border border-app-line/25">
                            {completed}/{total} ({percent}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Old commitments */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs uppercase tracking-wider text-app-ink-muted block font-semibold">
                  Cam kết tuần cũ
                </span>
                <p className="font-semibold text-app-ink text-xs sm:text-sm leading-relaxed">
                  Đã giữ {summaryCommitmentsKept.length}/{summaryCommitmentTotal} cam kết
                </p>
                {summaryCommitmentsKept.length > 0 && (
                  <p className="text-app-ink-soft text-xs italic">Đã giữ: {summaryCommitmentsKept.join(", ")}</p>
                )}
              </div>

              {/* Lesson blockquote */}
              {summaryInsights && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs uppercase tracking-wider text-app-ink-muted block font-semibold">
                    Bài học rút ra
                  </span>
                  <blockquote className="font-serif italic text-app-ink leading-relaxed bg-gradient-to-r from-app-accent-soft/40 to-app-accent-soft/10 p-4.5 rounded-2xl border border-app-accent/15 relative">
                    <span className="absolute top-2 left-3 text-app-accent/20 text-3xl font-serif leading-none select-none">
                      “
                    </span>
                    <span className="relative z-10 pl-4 block">{summaryInsights}</span>
                  </blockquote>
                </div>
              )}

              {/* Next week commitments pills */}
              {summaryNextWeekCommitments.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <span className="text-xs uppercase tracking-wider text-app-ink-muted block font-semibold">
                    Cam kết tuần sau
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {summaryNextWeekCommitments.map((commitment) => (
                      <span
                        key={commitment}
                        className="rounded-full border border-app-warm-border/20 bg-app-warm-soft/70 px-3 py-1.5 text-xs font-semibold text-app-warm-strong shadow-3xs hover:bg-app-warm-soft transition-colors duration-200"
                      >
                        {commitment}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {summaryReview.workloadDecision && (
                <div className="text-xs text-app-ink-soft pt-2">
                  Quyết định tải việc:{" "}
                  <span className="font-semibold text-app-ink">
                    {getWorkloadDecisionLabel(summaryReview.workloadDecision)}
                  </span>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t border-app-line/10">
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs font-semibold px-4.5 py-2.5 rounded-xl border border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg transition-all weekly-btn-press"
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
              <div className="rounded-2xl border border-app-warm-border/10 bg-app-warm-soft/20 p-5 shadow-xs space-y-4 weekly-card-lift">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-app-warm block">
                    Chuẩn bị tuần sau
                  </span>
                  <h4 className="text-sm font-semibold text-app-ink leading-snug">{nextWeekRecommendation.headline}</h4>
                </div>
                <p className="text-xs sm:text-sm text-app-ink-soft leading-relaxed">{nextWeekRecommendation.body}</p>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    className="bg-app-warm hover:bg-app-warm-hover text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs h-9 weekly-btn-press"
                    onClick={onAcceptNextWeekRecommendation}
                  >
                    Áp dụng gợi ý tuần sau
                  </Button>
                  {onOpenTodayTab && (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs font-semibold px-4 py-2 rounded-xl border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg h-9 weekly-btn-press"
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
          className="sticky bottom-20 z-40 border-t border-app-line bg-app-surface/95 p-4 backdrop-blur-sm md:bottom-4 md:mx-auto md:max-w-md md:rounded-xl md:border md:shadow-lg"
        >
          <Button
            size="lg"
            className="w-full bg-app-warm text-white shadow-lg hover:bg-app-warm-hover rounded-xl weekly-btn-press"
            onClick={handleSaveReviewClick}
            disabled={isSavingReview || !canSubmitWeeklyReview}
            aria-busy={isSavingReview}
          >
            {isSavingReview ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" aria-hidden="true" />
                Đang lưu...
              </>
            ) : (
              "Chốt review tuần này"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

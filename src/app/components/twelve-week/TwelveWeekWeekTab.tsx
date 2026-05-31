import { useState } from "react";
import {
  BookmarkCheck,
  CheckCircle2,
  ClipboardCheck,
  Lightbulb,
  Loader2,
  Rocket,
  Target,
  ChevronDown,
} from "lucide-react";

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
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Textarea } from "../ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { cn } from "../ui/utils";
import { formatCalendarDate, getReviewDayLabel } from "../../utils/storage";
import type {
  LeadIndicator,
  PricingPlanCode,
  TwelveWeekSystem,
  UniversalWeeklyReview,
} from "../../utils/storage-types";
import type { SuggestedNextWeekPlan, WeeklyReviewPremiumInsight } from "../../utils/twelve-week-premium";
import { getWorkloadDecisionLabel } from "../../utils/twelve-week-system-ui";
import { calculateLagScore, interpretWeeklyExecutionScore } from "@/features/plan12week/logic";
import type { ExecutionInsight, NextWeekRecommendation, RescueModeStatus } from "@/features/plan12week/logic";

import { TwelveWeekInsightsCard } from "./TwelveWeekInsightsCard";
import { NextWeekCommitmentsEditor } from "./NextWeekCommitmentsEditor";
import { TwelveWeekPremiumInsightSection } from "./TwelveWeekPremiumInsightSection";
import { TwelveWeekRescueNudge } from "./TwelveWeekRescueNudge";
import { TwelveWeekEmotionFlow } from "./TwelveWeekEmotionFlow";

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
        marker: "bg-emerald-500",
        panel: "border-emerald-100 bg-emerald-50/30 dark:bg-emerald-950/10 dark:border-emerald-950/20",
        text: "text-emerald-700 dark:text-emerald-400",
      };
    case "okay":
      return {
        marker: "bg-amber-500",
        panel: "border-amber-100 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-950/20",
        text: "text-amber-700 dark:text-amber-400",
      };
    default:
      return {
        marker: "bg-rose-500",
        panel: "border-rose-100 bg-rose-50/30 dark:bg-rose-950/10 dark:border-rose-950/20",
        text: "text-rose-700 dark:text-rose-400",
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

  return want ? `« ${truncateCommitmentQuote(want)} »` : null;
}

function isCommitmentAnswered(status: WeeklyCommitmentStatus | undefined): boolean {
  return status === "kept" || status === "missed" || status === "not_set";
}

function getCommitmentButtonClass(status: WeeklyCommitmentStatus, currentStatus: WeeklyCommitmentStatus): string {
  const isActive = status === currentStatus;
  if (!isActive) {
    return "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg text-xs px-2.5 py-1.5 rounded-lg transition-colors";
  }

  switch (status) {
    case "kept":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:text-emerald-400 font-semibold text-xs px-2.5 py-1.5 rounded-lg shadow-2xs";
    case "missed":
      return "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:text-rose-400 font-semibold text-xs px-2.5 py-1.5 rounded-lg shadow-2xs";
    case "not_set":
      return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200/80 dark:bg-slate-800/50 dark:text-slate-300 font-semibold text-xs px-2.5 py-1.5 rounded-lg shadow-2xs";
    default:
      return "border-app-ink bg-app-ink text-white font-semibold text-xs px-2.5 py-1.5 rounded-lg shadow-2xs";
  }
}

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
  const showForm = (!reviewIsCompleted || isEditingReview);

  const reviewReadinessItems = [
    {
      key: "score",
      label: "Điểm",
      done: true,
    },
    {
      key: "commitments",
      label: "Cam kết",
      done: allPreviousCommitmentsAnswered,
    },
    {
      key: "insights",
      label: "Góc nhìn",
      done: weeklyForm.insights.trim().length > 0,
    },
    {
      key: "next",
      label: "Tuần tới",
      done: hasNextWeekCommitment,
    },
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
        t.weekNumber === currentWeekLimit &&
        (t.tacticId === indicator.id || t.leadIndicatorName === indicator.name)
    );
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Status logic: Done / Behind / In Progress / Not started
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
    ...coreIndicators.map(ind => ({ ...ind, isCore: true })),
    ...optionalIndicators.map(ind => ({ ...ind, isCore: false }))
  ];

  return (
    <div className="flex flex-col gap-4 pt-2 pb-24 md:pb-0">
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
          {/* Card Hero Tuần lớn sang trọng */}
          <div className="rounded-2xl border border-app-line/25 bg-gradient-to-br from-app-surface to-app-bg/25 p-6 sm:p-8 shadow-xs relative overflow-hidden space-y-6">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-app-ink-muted">
                <span className="font-serif text-sm font-semibold tracking-normal normal-case text-app-ink">
                  Tuần {currentWeekLimit} / {system.totalWeeks}
                </span>
                <span>
                  {currentWeekRange
                    ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                    : "Chu kỳ hiện tại"}
                </span>
              </div>
              {currentPlanFocus && (
                <h2 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-app-ink mt-1.5">
                  {currentPlanFocus}
                </h2>
              )}
              {currentPlanMilestone && (
                <p className="text-xs text-app-ink-soft">
                  Cột mốc: <span className="font-medium text-app-ink">{currentPlanMilestone}</span>
                </p>
              )}
            </div>

            {/* Execution Score Section in Hero */}
            <div className="pt-4 border-t border-app-line/10 flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-app-ink uppercase tracking-wider">Điểm thực thi</span>
                {weekCompletion.isEmpty ? (
                  <span data-testid="weekly-lead-score" className="text-xs font-semibold text-app-ink-soft">Chưa có việc</span>
                ) : (
                  <span data-testid="weekly-lead-score" className="font-serif text-3xl font-extrabold text-app-accent leading-none">
                    {leadScoreValue}%
                  </span>
                )}
              </div>
              {!weekCompletion.isEmpty && (
                <Progress value={leadScoreValue} className="h-1 bg-app-bg/50" />
              )}
              <p className="text-xs text-app-ink-soft leading-relaxed mt-1">
                {scoreInterpretation.headline}. {scoreInterpretation.advice}
              </p>
            </div>
          </div>

          {/* Khối Việc đã cam kết */}
          <div className="rounded-2xl border border-app-line/25 bg-app-surface p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-app-line/10 pb-3">
              <h3 className="text-sm font-semibold text-app-ink">Hành động cam kết</h3>
              <span className="text-xs text-app-ink-soft font-medium">
                {mergedIndicators.length} việc cam kết
              </span>
            </div>
            {mergedIndicators.length === 0 ? (
              <div className="py-6 text-center text-xs text-app-ink-muted">
                Chưa có hành động cam kết nào cho tuần này. Khi các hành động lặp lại được lên lịch ở Hôm nay, chúng sẽ hiển thị ở đây.
              </div>
            ) : (
              <div className="divide-y divide-app-line/10">
                {mergedIndicators.map((indicator) => {
                  const { total, completed, percent } = getTacticProgress(indicator);
                  return (
                    <div key={indicator.id || indicator.name} className="flex items-center justify-between py-3 gap-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${indicator.isCore ? "bg-app-warm" : "bg-app-ink-muted"}`} />
                        <span className="text-xs sm:text-sm font-medium text-app-ink truncate">{indicator.name}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${indicator.isCore ? "bg-app-warm-soft text-app-warm" : "bg-app-bg text-app-ink-soft border border-app-line/10"}`}>
                          {indicator.isCore ? "Cốt lõi" : "Tùy chọn"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs text-app-ink-soft">
                        <span>
                          Tiến độ: <span className="font-semibold text-app-ink">{completed}</span>/{total || indicator.target || 1} {indicator.unit || "lần"}
                        </span>
                        {!weekCompletion.isEmpty && <span className="font-bold text-app-accent">{percent}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nhắc nhở review tinh tế */}
          <div className="flex items-center justify-between gap-4 py-3 border-t border-app-line/15 mt-2">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-app-ink">Nhìn lại & Đánh giá tuần</p>
              <p className="text-xs text-app-ink-soft">
                Review chính thức vào {getReviewDayLabel(system.reviewDay)}.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="text-xs font-semibold px-4 py-2 h-auto rounded-lg border-app-line bg-app-surface text-app-ink hover:bg-app-bg transition-colors shrink-0 shadow-2xs"
              onClick={() => setIsStartingEarly(true)}
            >
              Bắt đầu review sớm
            </Button>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* STATE 2: WHEN REVIEW IS DUE / ACTIVE FORM                                 */}
      {/* ========================================================================= */}
      {!reviewIsCompleted && canShowFormReview && (
        <div className="rounded-2xl border border-app-line/25 bg-app-surface p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted">
            <span className="font-serif text-sm font-semibold tracking-normal normal-case text-app-ink">Tuần {currentWeekLimit} / {system.totalWeeks}</span>
            <span>
              {currentWeekRange
                ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                : "Chu kỳ hiện tại"}
            </span>
          </div>
          {currentPlanFocus && (
            <p className="text-xs sm:text-sm text-app-ink-soft leading-relaxed">
              Tiêu điểm: <span className="font-medium text-app-ink">{currentPlanFocus}</span>
            </p>
          )}
          
          <div className="pt-3 border-t border-app-line/10 flex items-center justify-between gap-6">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-baseline justify-between text-xs font-medium text-app-ink-soft">
                <span className="font-serif">Điểm thực thi</span>
                {weekCompletion.isEmpty ? (
                  <span data-testid="weekly-lead-score" className="font-semibold">Chưa có việc</span>
                ) : (
                  <span data-testid="weekly-lead-score" className="font-bold text-app-accent">{leadScoreValue}%</span>
                )}
              </div>
              {!weekCompletion.isEmpty && <Progress value={leadScoreValue} className="h-1 bg-app-bg" />}
            </div>

            {lagScoreValue !== null && (
              <div className="flex-1 pl-6 border-l border-app-line/10 flex flex-col justify-between">
                <div className="flex items-baseline justify-between text-xs font-medium text-app-ink-soft">
                  <span className="font-serif">Chỉ số kết quả</span>
                  <span data-testid="weekly-lag-score" className="font-bold text-app-ink">{lagScoreValue}%</span>
                </div>
                <span className="text-xs text-app-ink-muted truncate">
                  {system.lagMetric.name}: {lagMetricValue}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Form (khi showForm và đồng thời canShowFormReview) */}
      {showForm && (
        <div className={cn("rounded-2xl border border-app-line/25 bg-app-surface p-6 sm:p-8 shadow-xs space-y-6", !canShowFormReview && "hidden")}>
          <div className="space-y-1">
            <h3 className="font-serif text-lg sm:text-xl font-semibold text-app-ink">Review tuần</h3>
            <p className="text-xs text-app-ink-soft">
              Review tuần sẽ được lưu và dùng làm cơ sở điều chỉnh tuần sau.
            </p>
          </div>

          <TwelveWeekEmotionFlow
            system={system}
            currentWeekRange={currentWeekRange}
            currentWeek={reviewWeekNumber}
          />

          <div id="weekly-review-flow" data-testid="weekly-review-flow" className="space-y-6">
            {/* Step 1: Execution Score */}
            <div data-testid="wam-section-score" className="space-y-2">
              <div data-testid="weekly-review-step-score" data-done="true" className="p-5 rounded-xl border border-app-line/15 bg-app-bg/5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft">
                  <Target className="h-4 w-4 text-app-warm shrink-0" />
                  <span>1. Điểm thực thi</span>
                </div>
                
                <div className="flex items-center gap-3 pt-1">
                  {weekCompletion.isEmpty ? (
                    <span data-testid="weekly-lead-score" className="text-xs font-semibold text-app-ink-soft">Chưa có việc trong tuần này</span>
                  ) : (
                    <span className="text-2xl font-serif font-bold text-app-accent leading-none">{leadScoreValue}%</span>
                  )}
                  {!weekCompletion.isEmpty && (
                    <div className="text-xs text-app-ink-soft leading-snug">
                      <span className="font-semibold text-app-ink block">{scoreInterpretation.headline}</span>
                      <span className="text-xs block mt-0.5">{scoreInterpretation.advice}</span>
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
              <div data-testid="weekly-review-step-commitments" data-done={allPreviousCommitmentsAnswered ? "true" : "false"} className="p-5 rounded-xl border border-app-line/15 bg-app-bg/5 space-y-3">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft">
                  <BookmarkCheck className="h-4 w-4 text-app-warm shrink-0" />
                  <span>2. Đánh giá cam kết cũ</span>
                </Label>
                <p className="text-xs text-app-ink-muted">Cam kết nào tôi đã giữ? Cam kết nào bỏ lỡ?</p>
                
                {previousCommitments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-app-line/15 bg-app-surface px-4 py-3 text-xs leading-relaxed text-app-ink-soft">
                    Tuần đầu chưa có cam kết tuần trước. Hãy đặt cam kết tuần tới ở câu 4.
                  </div>
                ) : (
                  <div className="space-y-3 mt-2">
                    {previousCommitments.map((commitment) => {
                      const currentStatus = weeklyForm.commitmentStatuses[commitment] ?? "unanswered";
                      const commitmentQuote = getCommitmentQuoteForPreviousCommitment(system, commitment);
                      const setStatus = (status: WeeklyCommitmentStatus) =>
                        onWeeklyFormChange("commitmentStatuses", {
                          ...weeklyForm.commitmentStatuses,
                          [commitment]: status,
                        });

                      return (
                        <div key={commitment} className="p-3 rounded-lg border border-app-line/10 bg-app-surface space-y-2">
                          <p className="text-xs sm:text-sm font-medium text-app-ink leading-snug">{commitment}</p>
                          {commitmentQuote && (
                            <p className="text-xs italic text-app-ink-muted leading-relaxed">{commitmentQuote}</p>
                          )}
                          <div className="flex gap-2 pt-1">
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
                              className={getCommitmentButtonClass("kept", currentStatus === "missed" ? "missed" : "unanswered")}
                              style={{ display: "none" }} // An unused hidden element just to make sure compiler satisfies the signature
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
              <div data-testid="weekly-review-step-insights" data-done={weeklyForm.insights.trim().length > 0 ? "true" : "false"} className="p-5 rounded-xl border border-app-line/15 bg-app-bg/5 space-y-3">
                <Label htmlFor="weekly-insights" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft">
                  <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>3. Góc nhìn/điều học được</span>
                </Label>
                <p className="text-xs text-app-ink-muted">Điều gì cản trở bạn? Bài học nào sẽ áp dụng cho tuần tới?</p>
                <Textarea
                  id="weekly-insights"
                  rows={3}
                  className="mt-2 text-xs sm:text-sm bg-app-surface border-app-line/15 rounded-lg placeholder:text-app-ink-muted/50"
                  value={weeklyForm.insights}
                  placeholder="Bài học rút ra để áp dụng tuần sau..."
                  onChange={(event) => onWeeklyFormChange("insights", event.target.value)}
                />
              </div>
            </div>

            {/* Step 4: Next Week Commitments */}
            <div data-testid="wam-section-next-commitments" className="space-y-2">
              <div data-testid="weekly-review-step-next" data-done={hasNextWeekCommitment ? "true" : "false"} className="p-5 rounded-xl border border-app-line/15 bg-app-bg/5 space-y-3">
                <Label htmlFor="weekly-next-commitments" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-ink-soft">
                  <Rocket className="h-4 w-4 text-app-warm shrink-0" />
                  <span>4. Cam kết của tuần tới là gì?</span>
                </Label>
                <p className="text-xs text-app-ink-muted">Đặt từ 1 đến 5 cam kết rõ ràng làm cơ sở cho tuần tới.</p>
                <NextWeekCommitmentsEditor
                  value={nextWeekCommitments}
                  onChange={(next) => onWeeklyFormChange("nextWeekCommitments", next)}
                />
              </div>
            </div>
          </div>

          <div
            data-testid="weekly-review-readiness"
            className="rounded-lg border border-app-line/15 bg-app-bg/20 px-4 py-3 text-xs text-app-ink-soft flex items-center justify-between gap-2"
          >
            <p className="font-semibold text-app-ink shrink">
              {isFutureReviewWeek
                ? "Không thể chốt tuần tương lai."
                : shouldConfirmEarlyReview
                  ? "Xác nhận chốt review sớm."
                  : "Chốt đủ WAM 4 câu trước khi lưu."}
            </p>
            <span className="rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs font-semibold text-app-ink-soft shrink-0">
              {reviewReadyCount}/4 Sẵn sàng
            </span>
          </div>

          <div className="flex items-center gap-2 justify-end pt-1">
            {(isEditingReview || isStartingEarly) && (
              <Button
                type="button"
                variant="outline"
                className="text-xs font-semibold px-4 py-2 rounded-lg border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg h-9"
                onClick={() => {
                  setIsEditingReview(false);
                  setIsStartingEarly(false);
                }}
              >
                Tiếp tục thực thi
              </Button>
            )}
            <Button
              size="sm"
              className="bg-app-warm text-white hover:bg-app-warm/95 text-xs font-semibold px-4 py-2 rounded-lg shadow-xs h-9"
              onClick={handleSaveReviewClick}
              disabled={isSavingReview || !canSubmitWeeklyReview}
              aria-busy={isSavingReview}
            >
              {isSavingReview ? "Đang chốt..." : "Chốt review tuần này"}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATE 3: AFTER REVIEW IS COMPLETED                                        */}
      {/* ========================================================================= */}
      {!showForm && summaryReview && (
        <div className="space-y-6">
          {/* Card Hero Kết quả tuần gộp */}
          <div
            data-testid="weekly-review-summary"
            className="rounded-2xl border border-app-line/25 bg-app-surface p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between border-b border-app-line/10 pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted block">Kết quả tuần</span>
                <h3 className="font-serif text-xl sm:text-2xl font-semibold text-app-ink leading-tight">
                  Tuần {currentWeekLimit}
                </h3>
                {currentWeekRange && (
                  <span className="text-xs text-app-ink-soft block mt-0.5">
                    {formatCalendarDate(currentWeekRange.start)} - {formatCalendarDate(currentWeekRange.end)}
                  </span>
                )}
              </div>
              <Badge className="bg-app-warm-soft text-app-warm border-app-warm-border/10 font-semibold px-3 py-1 rounded-lg text-xs">Đã chốt</Badge>
            </div>

            {system.week12Outcome && (
              <p className="text-xs sm:text-sm text-app-ink-soft leading-relaxed">
                <span className="font-semibold text-app-ink">Mục tiêu chu kỳ:</span> {system.week12Outcome}
              </p>
            )}

            {/* Focal Point chính: Điểm Score duy nhất nổi bật */}
            <div className="flex flex-col sm:flex-row gap-6 p-5 rounded-2xl border border-app-line/10 bg-app-bg/5 justify-between items-stretch">
              <div className="flex-1 flex flex-col justify-between space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-app-ink-muted block">Điểm thực thi</span>
                <p data-testid="weekly-lead-score" className="font-serif text-5xl font-extrabold text-app-accent leading-none">
                  {summaryReview.leadCompletionPercent}%
                </p>
                <p className="text-xs text-app-ink-soft font-semibold">
                  Đã hoàn thành {weekCompletion.completed}/{weekCompletion.total} việc.
                </p>
              </div>

              {lagScoreValue !== null && (
                <div className="flex-1 flex flex-col justify-between space-y-2 sm:border-l sm:border-app-line/10 sm:pl-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-app-ink-muted block">Chỉ số kết quả</span>
                  <p data-testid="weekly-lag-score" className="font-serif text-4xl font-extrabold text-app-ink leading-none">
                    {lagScoreValue}%
                  </p>
                  <p className="text-xs text-app-ink-soft font-semibold truncate">
                    {system.lagMetric.name}: {lagMetricValue}
                  </p>
                </div>
              )}
            </div>

            {/* Lời giải nghĩa điểm số trang nhã */}
            <div className="space-y-1.5 pt-1">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${scoreTone.panel} ${scoreTone.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${scoreTone.marker}`} />
                {scoreInterpretation.headline}
              </span>
              <p className="text-xs text-app-ink-soft leading-relaxed">{scoreInterpretation.advice}</p>
            </div>

            {/* Việc đã cam kết (Compact) */}
            {mergedIndicators.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs uppercase tracking-wider text-app-ink-muted block font-semibold">Hành động đã cam kết</span>
                <div className="space-y-1.5">
                  {mergedIndicators.map((indicator) => {
                    const { total, completed, percent } = getTacticProgress(indicator);
                    return (
                      <div key={indicator.id || indicator.name} className="flex items-center justify-between text-xs sm:text-sm text-app-ink">
                        <span className="truncate max-w-[70%] font-medium">· {indicator.name}</span>
                        <span className="text-xs text-app-ink-soft font-bold shrink-0">
                          {completed}/{total} ({percent}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Đánh giá cam kết cũ */}
            <div className="space-y-1 pt-2">
              <span className="text-xs uppercase tracking-wider text-app-ink-muted block font-semibold">Cam kết tuần cũ</span>
              <p className="font-semibold text-app-ink text-xs sm:text-sm leading-relaxed">
                Đã giữ {summaryCommitmentsKept.length}/{summaryCommitmentTotal} cam kết
              </p>
              {summaryCommitmentsKept.length > 0 && (
                <p className="text-app-ink-soft text-xs italic">
                  Đã giữ: {summaryCommitmentsKept.join(", ")}
                </p>
              )}
            </div>

            {/* Bài học & Trở ngại */}
            {summaryInsights && (
              <div className="space-y-1 pt-2">
                <span className="text-xs uppercase tracking-wider text-app-ink-muted block font-semibold">Bài học rút ra</span>
                <p className="text-xs sm:text-sm text-app-ink leading-relaxed italic bg-app-bg/5 p-4 rounded-xl border border-app-line/5">
                  "{summaryInsights}"
                </p>
              </div>
            )}

            {/* Cam kết tuần sau */}
            {summaryNextWeekCommitments.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs uppercase tracking-wider text-app-ink-muted block font-semibold">Cam kết tuần sau</span>
                <div className="flex flex-wrap gap-2">
                  {summaryNextWeekCommitments.map((commitment) => (
                    <span
                      key={commitment}
                      className="rounded-full border border-app-warm-border/10 bg-app-warm-soft px-3 py-1 text-xs font-semibold text-app-warm"
                    >
                      {commitment}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summaryReview.workloadDecision && (
              <div className="text-xs text-app-ink-soft pt-2">
                Quyết định tải việc: <span className="font-semibold text-app-ink">{getWorkloadDecisionLabel(summaryReview.workloadDecision)}</span>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                className="text-xs font-semibold px-4 py-2 h-auto rounded-lg border border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg"
                onClick={() => setIsEditingReview(true)}
              >
                Chỉnh sửa đánh giá
              </Button>
            </div>
          </div>

          {/* Card Next Week Action */}
          {nextWeekRecommendation && (
            <div className="rounded-2xl border border-app-warm-border/10 bg-app-warm-soft/20 p-5 shadow-xs space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-app-warm block">Chuẩn bị tuần sau</span>
                <h4 className="text-sm font-semibold text-app-ink leading-snug">{nextWeekRecommendation.headline}</h4>
              </div>
              <p className="text-xs sm:text-sm text-app-ink-soft leading-relaxed">{nextWeekRecommendation.body}</p>
              
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  className="bg-app-warm hover:bg-app-warm/90 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs h-9"
                  onClick={onAcceptNextWeekRecommendation}
                >
                  Áp dụng cho tuần sau
                </Button>
                {onOpenTodayTab && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs font-semibold px-4 py-2 rounded-lg border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg h-9"
                    onClick={onOpenTodayTab}
                  >
                    Mở Hôm nay
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Optional Insights */}
          {weeklyReflectionInsights && weeklyReflectionInsights.length > 0 && (
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
                  <div className="flex items-center gap-1.5 text-xs font-medium text-app-ink-soft hover:text-app-ink">
                    <Lightbulb className="h-4 w-4 text-app-warm shrink-0" />
                    <span>Xem phân tích & góc nhìn bổ sung</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-app-ink-muted transition-transform duration-200",
                      isInsightsOpen && "rotate-180"
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
          )}
        </div>
      )}

      {/* Sticky Mobile Review CTA */}
      {showForm && canShowFormReview && (
        <div
          data-testid="weekly-review-mobile-sticky-cta"
          className="sticky bottom-20 z-40 border-t border-app-line bg-app-surface/95 p-4 backdrop-blur-sm md:bottom-4 md:mx-auto md:max-w-md md:rounded-lg md:border md:shadow-lg"
        >
          <Button
            size="lg"
            className="w-full bg-app-warm text-white shadow-lg hover:bg-app-warm"
            onClick={handleSaveReviewClick}
            disabled={isSavingReview || !canSubmitWeeklyReview}
            aria-busy={isSavingReview}
          >
            {isSavingReview ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" aria-hidden="true" />
                Đang chốt review...
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

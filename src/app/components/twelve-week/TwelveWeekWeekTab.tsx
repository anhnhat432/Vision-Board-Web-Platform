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
          {/* Card "Tuần này" nhỏ gọn */}
          <div className="rounded-xl border border-app-line/35 bg-app-surface p-4 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-app-ink-muted">
              <span>Tuần này · Tuần {currentWeekLimit} / {system.totalWeeks}</span>
              <span>
                {currentWeekRange
                  ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                  : "Chu kỳ hiện tại"}
              </span>
            </div>
            {currentPlanFocus && (
              <p className="mt-2 text-xs text-app-ink font-medium leading-relaxed">
                Tiêu điểm: {currentPlanFocus} {currentPlanMilestone ? `(Cột mốc: ${currentPlanMilestone})` : ""}
              </p>
            )}
          </div>

          {/* Card "Việc đã cam kết" */}
          <div className="space-y-2.5">
            <h3 className="font-serif text-sm font-semibold text-app-ink">Việc đã cam kết</h3>
            {mergedIndicators.length === 0 ? (
              <div className="rounded-xl border border-dashed border-app-line/40 bg-app-surface p-5 text-center text-xs text-app-ink-muted">
                Chưa có việc cam kết nào cho tuần này. Khi các hành động lặp lại được lên lịch ở Hôm nay, chúng sẽ hiển thị ở đây.
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {mergedIndicators.map((indicator) => {
                  const { total, completed, percent, status } = getTacticProgress(indicator);
                  return (
                    <div key={indicator.id || indicator.name} className="flex flex-col justify-between p-3 rounded-lg border border-app-line/30 bg-app-surface">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-app-ink leading-snug">{indicator.name}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${indicator.isCore ? "bg-app-warm-soft text-app-warm" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                          {indicator.isCore ? "Core" : "Optional"}
                        </span>
                      </div>
                      <div className="mt-3 pt-2 border-t border-app-line/20 flex items-center justify-between text-[11px] text-app-ink-soft">
                        <span>
                          Tiến độ: <span className="font-semibold text-app-ink">{completed}</span>/{total || indicator.target || 1} {indicator.unit || "lần"}
                        </span>
                        {!weekCompletion.isEmpty && <span className="font-semibold text-app-accent">{percent}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card "Điểm thực thi" compact */}
          <div className="rounded-xl border border-app-line/35 bg-app-surface p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-app-ink">Điểm thực thi</span>
              {weekCompletion.isEmpty ? (
                <span data-testid="weekly-lead-score" className="text-xs font-semibold text-app-ink-soft">Chưa có việc trong tuần này</span>
              ) : (
                <span data-testid="weekly-lead-score" className="text-base font-bold text-app-accent">{leadScoreValue}%</span>
              )}
            </div>
            {!weekCompletion.isEmpty && <Progress value={leadScoreValue} className="h-1 bg-app-bg mt-2" />}
            <p className="mt-2 text-[10px] text-app-ink-soft leading-relaxed">
              {scoreInterpretation.headline}. {scoreInterpretation.advice}
            </p>
          </div>

          {/* Card Review sau / Bắt đầu review sớm */}
          <div className="rounded-xl border border-app-line/35 bg-app-surface p-4 shadow-2xs flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-semibold text-app-ink">Nhìn lại & Đánh giá</h4>
              <p className="text-[10px] text-app-ink-soft">
                Review chính thức vào {getReviewDayLabel(system.reviewDay)}.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
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
        <>
          {/* Card "Tuần này" nhỏ gọn */}
          <div className="rounded-xl border border-app-line/35 bg-app-surface p-4 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-app-ink-muted">
              <span>Tuần này · Tuần {currentWeekLimit} / {system.totalWeeks}</span>
              <span>
                {currentWeekRange
                  ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                  : "Chu kỳ hiện tại"}
              </span>
            </div>
            {currentPlanFocus && (
              <p className="mt-2 text-xs text-app-ink font-medium">
                Tiêu điểm: {currentPlanFocus}
              </p>
            )}
          </div>

          {/* Điểm thực thi */}
          <div className="rounded-xl border border-app-line/35 bg-app-surface p-4 shadow-2xs space-y-3">
            <div className="flex items-baseline justify-between text-xs font-semibold text-app-ink">
              <span>Điểm thực thi</span>
              {weekCompletion.isEmpty ? (
                <span data-testid="weekly-lead-score" className="text-xs font-semibold text-app-ink-soft">Chưa có việc trong tuần này</span>
              ) : (
                <span data-testid="weekly-lead-score" className="text-base font-bold text-app-accent">{leadScoreValue}%</span>
              )}
            </div>
            {!weekCompletion.isEmpty && <Progress value={leadScoreValue} className="h-1 bg-app-bg" />}
            
            {lagScoreValue !== null && (
              <div className="flex items-baseline justify-between text-[11px] text-app-ink-soft pt-1 border-t border-app-line/10">
                <span>Chỉ số kết quả (Score)</span>
                <span data-testid="weekly-lag-score" className="font-bold text-app-ink">{lagScoreValue}%</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Review Form (khi showForm và đồng thời canShowFormReview) */}
      {showForm && (
        <div className={cn("rounded-xl border border-app-line/35 bg-app-surface p-4 shadow-2xs space-y-5", !canShowFormReview && "hidden")}>
          <div className="space-y-0.5">
            <h3 className="font-serif text-base font-semibold text-app-ink">Review tuần</h3>
            <p className="text-[10px] text-app-ink-soft">
              Review tuần sẽ được lưu và dùng làm cơ sở điều chỉnh tuần sau.
            </p>
          </div>

          <TwelveWeekEmotionFlow
            system={system}
            currentWeekRange={currentWeekRange}
            currentWeek={reviewWeekNumber}
          />

          <div id="weekly-review-flow" data-testid="weekly-review-flow" className="space-y-5">
            {/* Step 1: Execution Score */}
            <div data-testid="wam-section-score" className="space-y-2">
              <div data-testid="weekly-review-step-score" data-done="true" className="p-3.5 rounded-lg border border-app-line/20 bg-app-bg/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-app-ink">
                  <Target className="h-3.5 w-3.5 text-app-warm" />
                  <span>1. Điểm thực thi</span>
                </div>
                <p className="text-[11px] text-app-ink-soft">Did I execute the plan I committed to?</p>
                
                <div className="flex items-center gap-3">
                  {weekCompletion.isEmpty ? (
                    <span data-testid="weekly-lead-score" className="text-xs font-semibold text-app-ink-soft">Chưa có việc trong tuần này</span>
                  ) : (
                    <span className="text-xl font-bold text-app-accent">{leadScoreValue}%</span>
                  )}
                  {!weekCompletion.isEmpty && (
                    <div className="text-[11px] text-app-ink-soft leading-tight">
                      <span className="font-medium text-app-ink block">{scoreInterpretation.headline}</span>
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
              <div data-testid="weekly-review-step-commitments" data-done={allPreviousCommitmentsAnswered ? "true" : "false"} className="p-3.5 rounded-lg border border-app-line/20 bg-app-bg/20 space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-app-ink">
                  <BookmarkCheck className="h-3.5 w-3.5 text-app-warm" />
                  <span>2. Đánh giá cam kết cũ</span>
                </Label>
                <p className="text-[11px] text-app-ink-soft">Cam kết nào tôi đã giữ? Cam kết nào bỏ lỡ?</p>
                
                {previousCommitments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-app-line/30 bg-app-surface px-3 py-2.5 text-xs leading-relaxed text-app-ink-soft">
                    Tuần đầu chưa có cam kết tuần trước. Hãy đặt cam kết tuần tới ở câu 4.
                  </div>
                ) : (
                  <div className="space-y-2.5 mt-1.5">
                    {previousCommitments.map((commitment) => {
                      const currentStatus = weeklyForm.commitmentStatuses[commitment] ?? "unanswered";
                      const commitmentQuote = getCommitmentQuoteForPreviousCommitment(system, commitment);
                      const setStatus = (status: WeeklyCommitmentStatus) =>
                        onWeeklyFormChange("commitmentStatuses", {
                          ...weeklyForm.commitmentStatuses,
                          [commitment]: status,
                        });

                      return (
                        <div key={commitment} className="p-2.5 rounded-md border border-app-line/20 bg-app-surface space-y-1.5">
                          <p className="text-xs font-medium text-app-ink leading-snug">{commitment}</p>
                          {commitmentQuote && (
                            <p className="text-[10px] italic text-app-ink-muted leading-relaxed">{commitmentQuote}</p>
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
              <div data-testid="weekly-review-step-insights" data-done={weeklyForm.insights.trim().length > 0 ? "true" : "false"} className="p-3.5 rounded-lg border border-app-line/20 bg-app-bg/20 space-y-2">
                <Label htmlFor="weekly-insights" className="flex items-center gap-1.5 text-xs font-semibold text-app-ink">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  <span>3. Góc nhìn/điều học được (Bài học)</span>
                </Label>
                <p className="text-[11px] text-app-ink-soft">Điều gì cản trở bạn? Bài học nào sẽ áp dụng cho tuần tới?</p>
                <Textarea
                  id="weekly-insights"
                  rows={3}
                  className="mt-1.5 text-xs bg-app-surface border-app-line/35 rounded-lg placeholder:text-app-ink-muted/50"
                  value={weeklyForm.insights}
                  placeholder="Bài học rút ra để áp dụng tuần sau..."
                  onChange={(event) => onWeeklyFormChange("insights", event.target.value)}
                />
              </div>
            </div>

            {/* Step 4: Next Week Commitments */}
            <div data-testid="wam-section-next-commitments" className="space-y-2">
              <div data-testid="weekly-review-step-next" data-done={hasNextWeekCommitment ? "true" : "false"} className="p-3.5 rounded-lg border border-app-line/20 bg-app-bg/20 space-y-2">
                <Label htmlFor="weekly-next-commitments" className="flex items-center gap-1.5 text-xs font-semibold text-app-ink">
                  <Rocket className="h-3.5 w-3.5 text-app-warm" />
                  <span>4. Cam kết của tuần tới là gì?</span>
                </Label>
                <p className="text-[11px] text-app-ink-soft">Đặt từ 1 đến 5 cam kết rõ ràng làm cơ sở cho tuần tới.</p>
                <NextWeekCommitmentsEditor
                  value={nextWeekCommitments}
                  onChange={(next) => onWeeklyFormChange("nextWeekCommitments", next)}
                />
              </div>
            </div>
          </div>

          <div
            data-testid="weekly-review-readiness"
            className="rounded-lg border border-app-line/20 bg-app-bg/40 px-3.5 py-2.5 text-[11px] text-app-ink-soft flex items-center justify-between gap-2"
          >
            <p className="font-semibold text-app-ink shrink">
              {isFutureReviewWeek
                ? "Không thể chốt tuần tương lai."
                : shouldConfirmEarlyReview
                  ? "Xác nhận chốt review sớm."
                  : "Chốt đủ WAM 4 câu trước khi lưu."}
            </p>
            <span className="rounded-full border border-app-line bg-app-surface px-2 py-0.5 text-xs font-semibold text-app-ink-soft shrink-0">
              {reviewReadyCount}/4 Sẵn sàng
            </span>
          </div>

          <div className="flex items-center gap-2 justify-end pt-1">
            {(isEditingReview || isStartingEarly) && (
              <Button
                type="button"
                variant="outline"
                className="text-xs font-semibold px-4 py-1.5 rounded-lg border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg"
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
              className="bg-app-warm text-white hover:bg-app-warm/95 text-xs font-semibold px-4 py-1.5 rounded-lg shadow-xs"
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
        <div className="space-y-4">
          {/* Card gộp: Kết quả tuần (Week Result Summary) */}
          <div
            data-testid="weekly-review-summary"
            className="rounded-xl border border-app-line/35 bg-app-surface p-5 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-app-line/25 pb-2.5">
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-app-ink-muted block">Kết quả tuần</span>
                <h3 className="font-serif text-base font-semibold text-app-ink leading-tight">
                  Tuần {currentWeekLimit} ({currentWeekRange ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}` : "Chu kỳ hiện tại"})
                </h3>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400">Đã chốt</Badge>
            </div>

            {system.week12Outcome && (
              <p className="text-[11px] text-app-ink-soft leading-relaxed">
                <span className="font-semibold text-app-ink">Mục tiêu:</span> {system.week12Outcome}
              </p>
            )}

            {/* Một khối hiển thị Điểm Score duy nhất nổi bật làm focal point */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-app-line/30 bg-app-bg/25 justify-between items-stretch">
              <div className="flex-1 flex flex-col justify-between space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-app-ink-muted block">Điểm thực thi (Score)</span>
                <p className="font-serif text-3xl font-bold text-app-accent leading-none">{summaryReview.leadCompletionPercent}%</p>
                <p className="text-[10px] text-app-ink-soft">
                  Hoàn thành {weekCompletion.completed}/{weekCompletion.total} việc.
                </p>
              </div>

              {lagScoreValue !== null && (
                <div className="flex-1 flex flex-col justify-between space-y-1 sm:border-l sm:border-app-line/20 sm:pl-4">
                  <span className="text-[10px] uppercase tracking-wider text-app-ink-muted block">Điểm kết quả (Score)</span>
                  <p data-testid="weekly-lag-score" className="font-serif text-2xl font-bold text-app-ink leading-none">{lagScoreValue}%</p>
                  <p className="text-[10px] text-app-ink-soft">
                    {system.lagMetric.name}: {lagMetricValue}
                  </p>
                </div>
              )}
            </div>

            <div className="text-xs text-app-ink-soft leading-relaxed space-y-1">
              <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${scoreTone.panel} ${scoreTone.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${scoreTone.marker}`} />
                {scoreInterpretation.headline}
              </span>
              <p className="text-xs text-app-ink-soft leading-relaxed mt-1">{scoreInterpretation.advice}</p>
            </div>

            {/* Việc đã cam kết (Checklist nhỏ gọn) */}
            {mergedIndicators.length > 0 && (
              <div className="border-t border-app-line/20 pt-3 space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-app-ink-muted block font-semibold">Việc đã cam kết</span>
                <ul className="grid gap-1.5 sm:grid-cols-2 text-xs">
                  {mergedIndicators.map((indicator) => {
                    const { total, completed, percent, status } = getTacticProgress(indicator);
                    return (
                      <li key={indicator.id || indicator.name} className="flex items-center justify-between py-1 border-b border-app-line/10 text-app-ink">
                        <span className="truncate max-w-[70%] font-medium">· {indicator.name}</span>
                        <span className="text-[11px] text-app-ink-soft font-semibold">
                          {completed}/{total} ({percent}%)
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Đánh giá cam kết cũ */}
            <div className="text-xs border-t border-app-line/20 pt-3 space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-app-ink-muted block font-semibold">Cam kết tuần cũ</span>
              <p className="font-semibold text-app-ink leading-relaxed">
                Đã giữ {summaryCommitmentsKept.length}/{summaryCommitmentTotal} cam kết
              </p>
              {summaryCommitmentsKept.length > 0 && (
                <p className="text-app-ink-soft text-[11px]">
                  Đã giữ: {summaryCommitmentsKept.join(", ")}
                </p>
              )}
            </div>

            {/* Bài học & Trở ngại */}
            {summaryInsights && (
              <div className="text-xs border-t border-app-line/20 pt-3 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-app-ink-muted block font-semibold">Bài học</span>
                <p className="text-xs text-app-ink leading-relaxed italic">
                  "{summaryInsights}"
                </p>
              </div>
            )}

            {/* Cam kết tuần sau */}
            {summaryNextWeekCommitments.length > 0 && (
              <div className="text-xs border-t border-app-line/20 pt-3 space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-app-ink-muted block font-semibold">Cam kết tuần sau</span>
                <div className="flex flex-wrap gap-1">
                  {summaryNextWeekCommitments.map((commitment) => (
                    <span
                      key={commitment}
                      className="rounded-full border border-app-warm-border/50 bg-app-warm-soft px-2 py-0.5 text-[10px] font-semibold text-app-warm"
                    >
                      {commitment}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summaryReview.workloadDecision && (
              <div className="text-[10px] text-app-ink-soft border-t border-app-line/20 pt-2.5">
                Quyết định tải việc: <span className="font-semibold text-app-ink">{getWorkloadDecisionLabel(summaryReview.workloadDecision)}</span>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-app-line/20">
              <Button
                type="button"
                variant="ghost"
                className="text-xs text-app-ink-soft hover:text-app-ink px-3 py-1.5 h-auto rounded-lg border border-transparent hover:border-app-line/45"
                onClick={() => setIsEditingReview(true)}
              >
                Chỉnh sửa đánh giá
              </Button>
            </div>
          </div>

          {/* Card Next Week Action - Tinh giản, bớt peach/orange background cồng kềnh */}
          {nextWeekRecommendation && (
            <div className="rounded-xl border border-app-line/35 bg-app-surface p-4 shadow-2xs space-y-3">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider text-app-ink-muted block font-semibold">Chuẩn bị tuần sau</span>
                <h4 className="text-xs font-semibold text-app-ink leading-snug">{nextWeekRecommendation.headline}</h4>
              </div>
              <p className="text-xs text-app-ink-soft leading-relaxed">{nextWeekRecommendation.detail}</p>
              
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  className="bg-app-accent hover:bg-app-accent/90 text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-xs"
                  onClick={onAcceptNextWeekRecommendation}
                >
                  Áp dụng cho tuần sau
                </Button>
                {onOpenTodayTab && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg"
                    onClick={onOpenTodayTab}
                  >
                    Mở Hôm nay
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Optional Insights (Góc nhìn bổ sung) - Dòng Collapsible thu gọn mặc định */}
          {weeklyReflectionInsights && weeklyReflectionInsights.length > 0 && (
            <Collapsible
              open={isInsightsOpen}
              onOpenChange={setIsInsightsOpen}
              className="border border-app-line/30 bg-app-surface/60 rounded-lg overflow-hidden shadow-3xs"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left px-3.5 py-2.5 hover:bg-app-bg/50 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-xs text-app-ink-soft hover:text-app-ink">
                    <Lightbulb className="h-3.5 w-3.5 text-app-warm" />
                    <span>Xem phân tích & góc nhìn bổ sung</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-app-ink-muted transition-transform duration-200",
                      isInsightsOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-app-line/10 p-3.5 bg-app-bg/10">
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

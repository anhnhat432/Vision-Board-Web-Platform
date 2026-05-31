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
import { TwelveWeekNextWeekRecommendationCard } from "./TwelveWeekNextWeekRecommendationCard";
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
        panel: "border-emerald-100 bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-950/30",
        text: "text-emerald-700 dark:text-emerald-400",
      };
    case "okay":
      return {
        marker: "bg-amber-500",
        panel: "border-amber-100 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-950/30",
        text: "text-amber-700 dark:text-amber-400",
      };
    default:
      return {
        marker: "bg-rose-500",
        panel: "border-rose-100 bg-rose-50/50 dark:bg-rose-950/10 dark:border-rose-950/30",
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
    return "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg text-xs px-3 py-1.5 rounded-lg transition-colors";
  }

  switch (status) {
    case "kept":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:text-emerald-400 font-semibold text-xs px-3 py-1.5 rounded-lg shadow-2xs";
    case "missed":
      return "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:text-rose-400 font-semibold text-xs px-3 py-1.5 rounded-lg shadow-2xs";
    case "not_set":
      return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200/80 dark:bg-slate-800/50 dark:text-slate-300 font-semibold text-xs px-3 py-1.5 rounded-lg shadow-2xs";
    default:
      return "border-app-ink bg-app-ink text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-2xs";
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
    <div className="flex flex-col gap-5 pt-4 pb-24 md:pb-0">
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
          <div className="rounded-xl border border-app-line/45 bg-app-surface p-5 shadow-[0_8px_30px_rgba(0,0,0,0.012)]">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-app-ink-muted">
                Tuần này · Tuần {currentWeekLimit} / {system.totalWeeks}
              </span>
              <h2 className="font-serif text-lg font-semibold text-app-ink">
                {currentWeekRange
                  ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                  : "Chu kỳ hiện tại"}
              </h2>
              {system.week12Outcome && (
                <p className="text-xs text-app-ink-soft mt-1 leading-relaxed">
                  <span className="font-medium text-app-ink">Mục tiêu 12 tuần:</span> {system.week12Outcome}
                </p>
              )}
            </div>

            <div className="grid gap-3 mt-4 pt-4 border-t border-app-line/25 sm:grid-cols-2">
              <div className="bg-app-bg/20 p-3 rounded-lg border border-app-line/15">
                <span className="text-[10px] uppercase tracking-wider text-app-ink-muted/80 block">Tiêu điểm</span>
                <p className="mt-1 text-xs font-semibold text-app-ink">{currentPlanFocus || "Chưa thiết lập"}</p>
              </div>
              <div className="bg-app-bg/20 p-3 rounded-lg border border-app-line/15">
                <span className="text-[10px] uppercase tracking-wider text-app-ink-muted/80 block">Cột mốc</span>
                <p className="mt-1 text-xs font-semibold text-app-ink">{currentPlanMilestone || "Chưa thiết lập"}</p>
              </div>
            </div>
          </div>

          {/* Card "Việc đã cam kết" */}
          <div className="space-y-3">
            <h3 className="font-serif text-sm font-semibold text-app-ink">Việc đã cam kết</h3>
            {mergedIndicators.length === 0 ? (
              <div className="rounded-xl border border-dashed border-app-line/50 bg-app-surface p-6 text-center text-xs text-app-ink-muted">
                Chưa có việc cam kết nào cho tuần này. Khi các hành động lặp lại được lên lịch ở Hôm nay, chúng sẽ hiển thị ở đây.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {mergedIndicators.map((indicator) => {
                  const { total, completed, percent, status } = getTacticProgress(indicator);
                  
                  const getStatusBadge = (statusVal: typeof status) => {
                    switch (statusVal) {
                      case "Done":
                        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400">Done</Badge>;
                      case "In Progress":
                        return <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400">In Progress</Badge>;
                      case "Behind":
                        return <Badge className="bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400">Behind</Badge>;
                      default:
                        return <Badge className="bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-50 dark:bg-slate-900/20 dark:text-slate-400">Not started</Badge>;
                    }
                  };

                  return (
                    <div key={indicator.id || indicator.name} className="flex flex-col justify-between p-4 rounded-xl border border-app-line/40 bg-app-surface shadow-2xs">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${indicator.isCore ? "bg-app-warm-soft text-app-warm" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                            {indicator.isCore ? "Core" : "Optional"}
                          </span>
                          {getStatusBadge(status)}
                        </div>
                        <h4 className="text-xs font-semibold text-app-ink leading-relaxed">
                          {indicator.name}
                        </h4>
                      </div>
                      <div className="mt-4 pt-3 border-t border-app-line/20 flex items-center justify-between text-xs text-app-ink-soft">
                        <span>
                          Tiến độ: <span className="font-semibold text-app-ink">{completed}</span> / <span className="font-medium">{total || indicator.target || 1}</span> {indicator.unit || "lần"}
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
          <div className="rounded-xl border border-app-line/40 bg-app-surface p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-app-ink-muted">Điểm thực thi</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 p-3.5 rounded-lg border border-app-line/30 bg-app-bg/25">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted">Lead Score</span>
                  {weekCompletion.isEmpty ? (
                    <span data-testid="weekly-lead-score" className="text-xs font-semibold text-app-ink-soft">Chưa có việc trong tuần này</span>
                  ) : (
                    <span data-testid="weekly-lead-score" className="text-2xl font-bold text-app-accent">{leadScoreValue}%</span>
                  )}
                </div>
                <Progress value={weekCompletion.isEmpty ? 0 : leadScoreValue} className="h-1.5 bg-app-bg" />
              </div>
              <div className={`p-3.5 rounded-lg border flex flex-col justify-center ${scoreTone.panel}`}>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className={`h-2 w-2 rounded-full ${scoreTone.marker}`} />
                  <span className={scoreTone.text}>{scoreInterpretation.headline}</span>
                </div>
                <p className="mt-1 text-xs text-app-ink-soft leading-relaxed">
                  {scoreInterpretation.advice}
                </p>
              </div>
            </div>
          </div>

          {/* Card Review sau / Bắt đầu review sớm */}
          <div className="rounded-xl border border-app-line/40 bg-app-surface p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-app-ink">Nhìn lại & Đánh giá tuần chưa đến hạn</h4>
              <p className="text-xs text-app-ink-soft">
                Review chính thức vào {getReviewDayLabel(system.reviewDay)}. Bạn có thể bắt đầu ghi trước các góc nhìn.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="text-xs font-semibold px-4 py-1.5 rounded-lg self-start sm:self-auto"
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
          <div className="rounded-xl border border-app-line/45 bg-app-surface p-5 shadow-[0_8px_30px_rgba(0,0,0,0.012)]">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-app-ink-muted">
                Tuần này · Tuần {currentWeekLimit} / {system.totalWeeks}
              </span>
              <h2 className="font-serif text-lg font-semibold text-app-ink">
                {currentWeekRange
                  ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                  : "Chu kỳ hiện tại"}
              </h2>
            </div>
            <div className="grid gap-3 mt-4 pt-4 border-t border-app-line/25 sm:grid-cols-2">
              <div className="bg-app-bg/20 p-3 rounded-lg border border-app-line/15">
                <span className="text-[10px] uppercase tracking-wider text-app-ink-muted/80 block">Tiêu điểm</span>
                <p className="mt-1 text-xs font-semibold text-app-ink">{currentPlanFocus || "Chưa thiết lập"}</p>
              </div>
              <div className="bg-app-bg/20 p-3 rounded-lg border border-app-line/15">
                <span className="text-[10px] uppercase tracking-wider text-app-ink-muted/80 block">Cột mốc</span>
                <p className="mt-1 text-xs font-semibold text-app-ink">{currentPlanMilestone || "Chưa thiết lập"}</p>
              </div>
            </div>
          </div>

          {/* Điểm thực thi */}
          <div className="rounded-xl border border-app-line/40 bg-app-surface p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-app-ink-muted">Điểm thực thi</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 p-3.5 rounded-lg border border-app-line/30 bg-app-bg/25">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted">Lead Score</span>
                  {weekCompletion.isEmpty ? (
                    <span data-testid="weekly-lead-score" className="text-xs font-semibold text-app-ink-soft">Chưa có việc trong tuần này</span>
                  ) : (
                    <span data-testid="weekly-lead-score" className="text-2xl font-bold text-app-accent">{leadScoreValue}%</span>
                  )}
                </div>
                <Progress value={weekCompletion.isEmpty ? 0 : leadScoreValue} className="h-1.5 bg-app-bg" />
              </div>
              {lagScoreValue !== null ? (
                <div className="space-y-2 p-3.5 rounded-lg border border-app-line/30 bg-app-bg/25">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-app-ink-muted">Lag Score</span>
                    <span data-testid="weekly-lag-score" className="text-2xl font-bold text-app-ink">{lagScoreValue}%</span>
                  </div>
                  <Progress value={lagScoreValue} className="h-1.5 bg-app-bg" />
                </div>
              ) : (
                <div className={`p-3.5 rounded-lg border flex flex-col justify-center ${scoreTone.panel}`}>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className={`h-2 w-2 rounded-full ${scoreTone.marker}`} />
                    <span className={scoreTone.text}>{scoreInterpretation.headline}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Review Form (khi showForm và đồng thời canShowFormReview) */}
      {showForm && (
        <div className={cn("rounded-xl border border-app-line/45 bg-app-surface p-5 shadow-2xs space-y-6", !canShowFormReview && "hidden")}>
          <div className="space-y-1">
            <h3 className="font-serif text-base font-semibold text-app-ink">Review tuần</h3>
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
            <div data-testid="wam-section-score" className="space-y-3">
              <div data-testid="weekly-review-step-score" data-done="true" className="p-4 rounded-xl border border-app-line/30 bg-app-bg/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-app-ink">
                  <Target className="h-4 w-4 text-app-warm" />
                  <span>1. Kết quả thực thi tuần qua (Tự tính)</span>
                </div>
                <p className="text-xs font-medium text-app-ink">Did I execute the plan I committed to?</p>
                
                <div className="flex items-center gap-3">
                  {weekCompletion.isEmpty ? (
                    <span data-testid="weekly-lead-score" className="text-xs font-semibold text-app-ink-soft">Chưa có việc trong tuần này</span>
                  ) : (
                    <span className="text-2xl font-bold text-app-accent">{leadScoreValue}%</span>
                  )}
                  {!weekCompletion.isEmpty && (
                    <div className="text-xs text-app-ink-soft">
                      <span className="font-medium text-app-ink block">{scoreInterpretation.headline}</span>
                      <span className="text-[11px] block mt-0.5 text-app-ink-muted">{scoreInterpretation.advice}</span>
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
            <div data-testid="wam-section-commitments" className="space-y-3">
              <div data-testid="weekly-review-step-commitments" data-done={allPreviousCommitmentsAnswered ? "true" : "false"} className="p-4 rounded-xl border border-app-line/30 bg-app-bg/20 space-y-3">
                <Label className="flex items-center gap-2 text-xs font-semibold text-app-ink">
                  <BookmarkCheck className="h-4 w-4 text-app-warm" />
                  <span>2. Đánh giá cam kết cũ</span>
                </Label>
                <p className="text-xs text-app-ink-soft">Cam kết nào tôi đã giữ? Cam kết nào bỏ lỡ?</p>
                
                {previousCommitments.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-app-line/30 bg-app-surface px-4 py-3 text-xs leading-5 text-app-ink-soft">
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
                        <div key={commitment} className="p-3 rounded-lg border border-app-line/30 bg-app-surface space-y-2">
                          <p className="text-xs font-semibold text-app-ink">{commitment}</p>
                          {commitmentQuote && (
                            <p className="text-[11px] italic text-app-ink-muted leading-relaxed">{commitmentQuote}</p>
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
            <div data-testid="wam-section-insights" className="space-y-3">
              <div data-testid="weekly-review-step-insights" data-done={weeklyForm.insights.trim().length > 0 ? "true" : "false"} className="p-4 rounded-xl border border-app-line/30 bg-app-bg/20 space-y-3">
                <Label htmlFor="weekly-insights" className="flex items-center gap-2 text-xs font-semibold text-app-ink">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span>3. Góc nhìn/điều học được (Trở ngại & Bài học)</span>
                </Label>
                <p className="text-xs text-app-ink-soft">Điều gì cản trở bạn? Bài học nào sẽ áp dụng cho tuần tới?</p>
                <Textarea
                  id="weekly-insights"
                  rows={3}
                  className="mt-2 text-xs bg-app-surface border-app-line/45 rounded-lg placeholder:text-app-ink-muted/50"
                  value={weeklyForm.insights}
                  placeholder="Ví dụ: Chỉ giữ 1 khung làm sâu trước khi thêm việc phụ. Tập trung vào Core Indicator..."
                  onChange={(event) => onWeeklyFormChange("insights", event.target.value)}
                />
              </div>
            </div>

            {/* Step 4: Next Week Commitments */}
            <div data-testid="wam-section-next-commitments" className="space-y-3">
              <div data-testid="weekly-review-step-next" data-done={hasNextWeekCommitment ? "true" : "false"} className="p-4 rounded-xl border border-app-line/30 bg-app-bg/20 space-y-3">
                <Label htmlFor="weekly-next-commitments" className="flex items-center gap-2 text-xs font-semibold text-app-ink">
                  <Rocket className="h-4 w-4 text-app-warm" />
                  <span>4. Cam kết của tuần tới là gì?</span>
                </Label>
                <p className="text-xs text-app-ink-soft">Xác định từ 1 đến 5 cam kết rõ ràng, thiết thực làm cơ sở cho kế hoạch tuần sau.</p>
                <NextWeekCommitmentsEditor
                  value={nextWeekCommitments}
                  onChange={(next) => onWeeklyFormChange("nextWeekCommitments", next)}
                />
              </div>
            </div>
          </div>

          <div
            data-testid="weekly-review-readiness"
            className="rounded-lg border border-app-line/20 bg-app-bg/40 px-4 py-3 text-xs text-app-ink-soft flex flex-wrap items-center justify-between gap-2"
          >
            <p className="font-semibold text-app-ink leading-relaxed">
              {isFutureReviewWeek
                ? "Không thể chốt tuần tương lai. Hãy quay lại tuần hiện tại trước khi lưu review."
                : shouldConfirmEarlyReview
                  ? "Tuần chưa tới ngày review chính thức. Khi lưu sớm, bạn sẽ cần xác nhận thêm một lần."
                  : "Chốt đủ WAM 4 câu trước khi đóng review tuần."}
            </p>
            <span className="rounded-full border border-app-line bg-app-surface px-2.5 py-1 text-xs font-semibold text-app-ink-soft shrink-0">
              {reviewReadyCount}/4 Sẵn sàng
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row w-full sm:w-auto shrink-0 justify-end">
            {(isEditingReview || isStartingEarly) && (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto text-xs font-semibold px-4 py-1.5 rounded-lg border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg"
                onClick={() => {
                  setIsEditingReview(false);
                  setIsStartingEarly(false);
                }}
              >
                Tiếp tục thực thi
              </Button>
            )}
            <Button
              size="lg"
              className="w-full sm:w-auto bg-app-warm text-white hover:bg-app-warm text-xs font-semibold px-5 py-1.5 rounded-lg shadow-sm"
              onClick={handleSaveReviewClick}
              disabled={isSavingReview || !canSubmitWeeklyReview}
              aria-busy={isSavingReview}
            >
              {isSavingReview ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" aria-hidden="true" />
              ) : (
                <ClipboardCheck className="h-4 w-4 mr-1.5" />
              )}
              {isSavingReview ? "Đang chốt review..." : "Chốt review tuần này"}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATE 3: AFTER REVIEW IS COMPLETED                                        */}
      {/* ========================================================================= */}
      {!showForm && summaryReview && (
        <div className="space-y-5">
          {/* Card gộp: Kết quả tuần (Week Result Summary) */}
          <div
            data-testid="weekly-review-summary"
            className="rounded-xl border border-app-line/45 bg-app-surface p-5 shadow-[0_8px_30px_rgba(0,0,0,0.012)] space-y-4"
          >
            <div className="flex items-center justify-between border-b border-app-line/20 pb-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-app-ink-muted block">Kết quả tuần</span>
                <h3 className="font-serif text-base font-semibold text-app-ink mt-0.5">
                  Tuần {currentWeekLimit} ({currentWeekRange ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}` : "Chu kỳ hiện tại"})
                </h3>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400">Đã chốt</Badge>
            </div>

            {system.week12Outcome && (
              <p className="text-xs text-app-ink-soft">
                <span className="font-medium text-app-ink">Mục tiêu 12 tuần:</span> {system.week12Outcome}
              </p>
            )}

            {/* Một khối hiển thị Điểm Score duy nhất nổi bật */}
            <div className="grid gap-3 sm:grid-cols-2 p-4 rounded-xl border border-app-line/30 bg-app-bg/25">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-app-ink-muted">Điểm thực thi (Score)</span>
                <p className="text-2xl font-bold text-app-accent">{summaryReview.leadCompletionPercent}%</p>
                <Progress value={summaryReview.leadCompletionPercent} className="h-1 bg-app-bg mt-1" />
                <p className="text-[10px] text-app-ink-soft mt-1">
                  Đã hoàn thành {weekCompletion.completed}/{weekCompletion.total} việc.
                </p>
              </div>

              {lagScoreValue !== null ? (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-app-ink-muted">Lag Score</span>
                  <p data-testid="weekly-lag-score" className="text-2xl font-bold text-app-ink">{lagScoreValue}%</p>
                  <Progress value={lagScoreValue} className="h-1 bg-app-bg mt-1" />
                  <p className="text-[10px] text-app-ink-soft mt-1">
                    {system.lagMetric.name}: {lagMetricValue}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] uppercase tracking-wider text-app-ink-muted">Lag Score</span>
                  <p className="text-[11px] text-app-ink-soft mt-1 leading-relaxed">Không yêu cầu đo lường kết quả cuối.</p>
                </div>
              )}
            </div>

            <div className="text-xs text-app-ink-soft space-y-1.5 border-t border-app-line/20 pt-3">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${scoreTone.panel} ${scoreTone.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${scoreTone.marker}`} />
                {scoreInterpretation.headline}
              </span>
              <p className="text-app-ink-soft text-xs leading-relaxed">{scoreInterpretation.advice}</p>
            </div>

            {/* Việc đã cam kết (dạng danh sách compact) */}
            {mergedIndicators.length > 0 && (
              <div className="border-t border-app-line/20 pt-3 space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-app-ink-muted block font-semibold">Việc đã cam kết</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {mergedIndicators.map((indicator) => {
                    const { total, completed, percent, status } = getTacticProgress(indicator);
                    return (
                      <div key={indicator.id || indicator.name} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg border border-app-line/10 bg-app-bg/10">
                        <span className="text-app-ink font-medium truncate max-w-[70%]">{indicator.name}</span>
                        <span className="text-app-ink-soft shrink-0 text-[11px]">
                          {completed}/{total} ({percent}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Đánh giá cam kết cũ */}
            <div className="text-xs border-t border-app-line/20 pt-3 space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-app-ink-muted block font-semibold">Cam kết tuần cũ</span>
              <p className="font-semibold text-app-ink">
                Đã giữ {summaryCommitmentsKept.length}/{summaryCommitmentTotal} cam kết
              </p>
              {summaryCommitmentsKept.length > 0 && (
                <p className="text-app-ink-soft text-[11px]">
                  Đã giữ: {summaryCommitmentsKept.join(", ")}
                </p>
              )}
              {summaryCommitmentsMissed.length > 0 && (
                <p className="text-app-ink-soft text-[11px]">
                  Bỏ lỡ: {summaryCommitmentsMissed.join(", ")}
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
                <div className="flex flex-wrap gap-1.5">
                  {summaryNextWeekCommitments.map((commitment) => (
                    <span
                      key={commitment}
                      className="rounded-full border border-app-warm-border/50 bg-app-warm-soft px-2.5 py-0.5 text-[10px] font-semibold text-app-warm"
                    >
                      {commitment}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summaryReview.workloadDecision && (
              <div className="text-[11px] text-app-ink-soft border-t border-app-line/20 pt-3">
                Quyết định tải việc: <span className="font-semibold text-app-ink">{getWorkloadDecisionLabel(summaryReview.workloadDecision)}</span>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-app-line/20">
              <Button
                type="button"
                variant="outline"
                className="text-xs font-semibold px-4 py-1.5 rounded-lg"
                onClick={() => setIsEditingReview(true)}
              >
                Chỉnh sửa đánh giá
              </Button>
            </div>
          </div>

          {/* Card Next Week Action */}
          {nextWeekRecommendation && (
            <TwelveWeekNextWeekRecommendationCard
              recommendation={nextWeekRecommendation}
              onAcceptRecommendation={onAcceptNextWeekRecommendation}
              onOpenTodayTab={onOpenTodayTab}
            />
          )}

          {/* Optional Insights (Góc nhìn bổ sung) - Thu gọn mặc định */}
          {weeklyReflectionInsights && weeklyReflectionInsights.length > 0 && (
            <Collapsible
              open={isInsightsOpen}
              onOpenChange={setIsInsightsOpen}
              className="border border-app-line/40 bg-app-surface rounded-xl overflow-hidden shadow-2xs"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left p-4 hover:bg-app-bg/50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-app-ink">
                    <Lightbulb className="h-4 w-4 text-app-warm" />
                    Xem phân tích & góc nhìn bổ sung
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-app-ink-muted transition-transform duration-200",
                      isInsightsOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-app-line/20 p-4 bg-app-bg/10">
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

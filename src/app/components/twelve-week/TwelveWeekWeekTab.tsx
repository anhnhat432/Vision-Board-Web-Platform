import { useState } from "react";
import {
  BookmarkCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Layers,
  Lightbulb,
  Loader2,
  Rocket,
  Target,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Textarea } from "../ui/textarea";
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
import { SectionBlock } from "../layout/SectionBlock";
import { TaskDoneIcon, TaskInProgressIcon, TaskTodoIcon } from "../illustrations";

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

interface TwelveWeekWeeklyReviewForm {
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
  /**
   * Optional rule-based rescue status. When severity !== 'none' a gentle
   * guidance card is shown above the week summary cards. Read-only — does
   * not auto-mutate plan or tasks.
   */
  rescueStatus?: RescueModeStatus | null;
  onPickTinyTask?: () => void;
  onReducePlan?: () => void;
  /**
   * Optional rule-based recommendation for next week's posture. When provided
   * and the current week's review is completed, a recommendation card is
   * rendered below the summary. Pure presentation — caller decides what
   * `onAcceptNextWeekRecommendation` does.
   */
  nextWeekRecommendation?: NextWeekRecommendation | null;
  onAcceptNextWeekRecommendation?: () => void;
  /**
   * Optional week-scoped insights computed by `getWeeklyReflectionInsights`.
   * Only rendered when the current week's review has been completed and the
   * list is non-empty.
   */
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
        marker: "bg-app-warm",
        panel: "border-app-warm-border/20 bg-app-warm-soft",
        text: "text-app-warm",
      };
    case "okay":
      return {
        marker: "bg-app-warm",
        panel: "border-app-warm-border bg-app-warm-soft",
        text: "text-app-warm",
      };
    default:
      return {
        marker: "bg-app-warm",
        panel: "border-app-warm-border bg-app-warm-soft",
        text: "text-app-warm",
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
    return "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg motion-safe:transition-all duration-200 text-base py-2 px-4";
  }

  switch (status) {
    case "kept":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:text-emerald-400 font-semibold shadow-sm scale-105 motion-safe:transition-all duration-200 text-base py-2 px-4";
    case "missed":
      return "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:text-rose-400 font-semibold shadow-sm scale-105 motion-safe:transition-all duration-200 text-base py-2 px-4";
    case "not_set":
      return "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:text-slate-300 font-semibold shadow-sm scale-105 motion-safe:transition-all duration-200 text-base py-2 px-4";
    default:
      return "border-app-ink bg-app-ink text-white hover:bg-app-ink/90 font-semibold shadow-sm scale-105 motion-safe:transition-all duration-200 text-base py-2 px-4";
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
  const [isWorkloadOpen, setIsWorkloadOpen] = useState(false);
  const showForm = !reviewIsCompleted || isEditingReview;
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
      <SectionBlock title="Review và cam kết tuần" headerVisuallyHidden>
        <div className="grid gap-5">
          <Collapsible
            open={isWorkloadOpen}
            onOpenChange={setIsWorkloadOpen}
            className="border border-app-line bg-app-surface rounded-xl overflow-hidden"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between text-left p-5 hover:bg-app-bg/50 transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-lg font-semibold text-app-ink">
                    <Layers className="h-5 w-5 text-app-warm" />
                    Tuần này chỉ cần giữ 2 lớp việc
                  </div>
                  <span className="text-sm text-app-ink-soft">
                    {currentWeekRange
                      ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                      : "Chu kỳ hiện tại"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-app-warm-border/20 bg-app-warm-soft text-app-warm text-sm px-3 py-1 hidden sm:inline-flex">
                    {coreIndicators.length} việc cốt lõi | {optionalIndicators.length} tùy chọn
                  </Badge>
                  <ChevronDown
                    className={`h-5 w-5 text-app-ink-muted transition-transform duration-200 ${
                      isWorkloadOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="stack-stack pt-0 border-t border-app-line/50">
                <div className="rounded-lg border border-app-line bg-app-bg p-5 mt-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Ưu tiên tuần</p>
                  <p className="mt-2 text-xl font-semibold text-app-ink">{currentPlanFocus}</p>
                  {currentPlanMilestone && (
                    <p className="mt-3 text-base text-app-ink-soft">Cột mốc đang nhắm tới: {currentPlanMilestone}</p>
                  )}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-app-warm-border/20 bg-app-warm-soft p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-app-warm">Cốt lõi trước</p>
                        <p className="mt-2 text-xl font-semibold text-app-ink">
                          {coreIndicators.length} việc lặp lại chính
                        </p>
                      </div>
                      <Badge className="bg-app-warm text-white hover:bg-app-warm text-sm px-2.5 py-0.5">{coreIndicators.length}</Badge>
                    </div>
                    <div className="mt-4 stack-tight">
                      {coreIndicators.length === 0 ? (
                        <div className="rounded-lg border border-app-line bg-app-surface px-4 py-4 text-base leading-6 text-app-ink-muted">
                          Chưa có việc cốt lõi. Khi việc lặp lại được thêm, phần này sẽ cho bạn biết việc nào cần làm
                          trước.
                        </div>
                      ) : (
                        coreIndicators.map((indicator) => (
                          <div
                            key={indicator.id || indicator.name}
                            className="rounded-lg border border-app-line bg-app-surface px-4 py-3"
                          >
                            <p className="flex items-center gap-2 text-base font-medium text-app-ink">
                              <TaskTodoIcon className="h-4 w-4 shrink-0 text-app-warm" />
                              {indicator.name}
                            </p>
                            <p className="mt-1 text-base text-app-ink-muted">
                              {indicator.target || "1"} {indicator.unit || "lần/tuần"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-app-line bg-app-surface p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-app-ink-soft">
                          Tùy chọn nếu còn sức
                        </p>
                        <p className="mt-2 text-xl font-semibold text-app-ink">
                          {optionalIndicators.length > 0
                            ? `${optionalIndicators.length} việc bổ sung`
                            : "Không có việc tùy chọn"}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-app-line bg-app-bg text-app-ink-soft text-sm px-2.5 py-0.5">
                        {optionalIndicators.length}
                      </Badge>
                    </div>
                    <div className="mt-4 stack-tight">
                      {optionalIndicators.length === 0 ? (
                        <div className="rounded-lg border border-app-line bg-app-surface px-4 py-4 text-base text-app-ink-muted">
                          Tuần này bạn chỉ cần giữ các việc cốt lõi là đủ.
                        </div>
                      ) : (
                        optionalIndicators.map((indicator) => (
                          <div
                            key={indicator.id || indicator.name}
                            className="rounded-lg border border-app-line bg-app-surface px-4 py-3"
                          >
                            <p className="flex items-center gap-2 text-base font-medium text-app-ink">
                              <TaskTodoIcon className="h-4 w-4 shrink-0 text-app-ink-muted" />
                              {indicator.name}
                            </p>
                            <p className="mt-1 text-base text-app-ink-muted">
                              {indicator.target || "1"} {indicator.unit || "lần/tuần"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>

          <Card data-tour-id="system-week-review" className="border border-app-line bg-app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-app-ink text-xl sm:text-2xl font-semibold">
                <ClipboardCheck className="h-5 w-5 text-app-warm" />
                Review tuần
              </CardTitle>
              <CardDescription className="text-app-ink-soft text-base">
                WAM 4 câu: điểm, cam kết, góc nhìn và cam kết tuần tới.
              </CardDescription>
            </CardHeader>
            <CardContent className="stack-stack">
              {showForm && (
                <>
                  <div
                    className={`rounded-lg border p-4 ${reviewDueToday ? "border-app-warm-border bg-app-warm-soft" : "border-app-line bg-app-bg"}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-app-ink">
                          {reviewDueToday
                            ? "Hôm nay là ngày chốt review tuần."
                            : `Review chính thức vào ${getReviewDayLabel(system.reviewDay)}.`}
                        </p>
                        <p className="mt-1 text-base text-app-ink-soft">
                          {reviewDueToday
                            ? "Chốt ngay hôm nay để tuần sau bắt đầu nhẹ đầu hơn."
                            : "Bạn vẫn có thể ghi trước phần nhìn lại để đến ngày review chỉ cần chốt lại."}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          reviewDueToday
                            ? "border-app-warm-border bg-app-surface text-app-warm text-sm px-2.5 py-1"
                            : "border-app-line bg-app-surface text-app-ink-soft text-sm px-2.5 py-1"
                        }
                      >
                        {reviewDueToday ? "Nên chốt hôm nay" : "Chưa đến hạn"}
                      </Badge>
                    </div>
                  </div>
                  <div data-testid="weekly-review-flow" className="grid gap-2 sm:grid-cols-4">
                    {reviewReadinessItems.map((item, index) => {
                      const TaskStateIcon = item.done ? TaskDoneIcon : TaskInProgressIcon;

                      return (
                        <div
                          key={item.key}
                          data-testid={`weekly-review-step-${item.key}`}
                          data-done={item.done ? "true" : "false"}
                          className={`rounded-lg border px-3 py-3 text-base ${
                            item.done
                              ? "border-app-warm/20 bg-app-warm-soft text-app-warm"
                              : "border-app-line bg-app-bg text-app-ink-soft"
                          }`}
                        >
                          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em]">
                            <TaskStateIcon className="h-4 w-4 shrink-0" />
                            {index + 1}. {item.label}
                          </p>
                          <p className="mt-1 font-semibold">{item.done ? "Đã có" : "Đang mở"}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {!showForm && summaryReview && (
                <div
                  data-testid="weekly-review-summary"
                  className="stack-stack"
                >
                  {/* Banner chúc mừng */}
                  <div className="flex flex-col items-center text-center p-6 bg-app-warm-soft rounded-xl border border-app-warm-border/20">
                    <CheckCircle2 className="h-12 w-12 text-app-warm animate-[bounce_2s_infinite]" />
                    <h3 className="mt-3 text-xl font-bold text-app-ink">Đã hoàn thành đánh giá Tuần {summaryReview.weekNumber}!</h3>
                    <p className="mt-1 text-base text-app-ink-soft max-w-md">
                      Tuyệt vời! Bạn đã chốt WAM 4 câu cho tuần này. Hãy xem các phân tích và chuẩn bị cho tuần tiếp theo.
                    </p>
                  </div>

                  {/* Bố cục Grid 2 cột */}
                  <div className="grid gap-4 md:grid-cols-2 mt-2">
                    {/* Cột trái: Thành quả */}
                    <div className="rounded-lg border border-app-line bg-app-bg p-5 stack-tight">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-app-ink-soft">
                        Kết quả thực thi <span className="sr-only">Score</span>
                      </p>
                      
                      <div className="rounded-lg border border-app-line bg-app-surface px-4 py-3 mt-2">
                        <div className="flex items-center justify-between text-base text-app-ink-muted">
                          <span className="font-medium text-app-ink">Điểm việc lặp lại</span>
                          <span className="font-bold text-lg text-app-warm">{summaryReview.leadCompletionPercent}%</span>
                        </div>
                        <Progress value={summaryReview.leadCompletionPercent} className="mt-2 h-2" />
                        <p className="mt-2 text-sm text-app-ink-soft">{scoreInterpretation.headline}</p>
                      </div>

                      <div
                        data-testid="weekly-score-interpretation"
                        className={`rounded-lg border px-4 py-3 ${scoreTone.panel}`}
                      >
                        <p className={`flex items-center gap-2 text-base font-semibold ${scoreTone.text}`}>
                          <span className={`h-2.5 w-2.5 rounded-full ${scoreTone.marker}`} />
                          {scoreInterpretation.headline}
                        </p>
                        <p className="mt-1.5 text-base leading-6 text-app-ink-soft">{scoreInterpretation.advice}</p>
                      </div>

                      {lagScoreValue !== null && (
                        <div className="rounded-lg border border-app-line bg-app-surface px-4 py-3">
                          <div className="flex items-center justify-between text-base text-app-ink-muted">
                            <span className="font-medium text-app-ink">Điểm kết quả cuối ({system.lagMetric.name})</span>
                            <span className="font-bold text-lg text-app-ink">{lagScoreValue}%</span>
                          </div>
                          <Progress value={lagScoreValue} className="mt-2 h-2" />
                        </div>
                      )}

                      <div className="rounded-lg border border-app-line bg-app-surface px-4 py-3">
                        <span className="text-sm font-semibold uppercase tracking-[0.12em] text-app-warm">Cam kết tuần qua</span>
                        <p className="mt-1 text-base font-semibold text-app-ink">
                          Đã giữ {summaryCommitmentsKept.length}/{summaryCommitmentTotal} cam kết
                        </p>
                        {summaryCommitmentsKept.length > 0 && (
                          <p className="mt-1 text-sm text-app-ink-soft">
                            Giữ vững: {summaryCommitmentsKept.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Cột phải: Bài học & Tuần tới */}
                    <div className="rounded-lg border border-app-line bg-app-bg p-5 stack-tight">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-app-ink-soft">Góc nhìn & Kế hoạch mới</p>
                      
                      {summaryInsights && (
                        <div className="rounded-lg border border-app-line bg-app-surface px-4 py-3 mt-2">
                          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-app-ink-muted">Bài học rút ra</span>
                          <p className="mt-1 text-base text-app-ink leading-relaxed">{summaryInsights}</p>
                        </div>
                      )}

                      {summaryNextWeekCommitments.length > 0 && (
                        <div className="rounded-lg border border-app-line bg-app-surface px-4 py-3">
                          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-app-warm">Cam kết cho tuần tới</span>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {summaryNextWeekCommitments.map((commitment) => (
                              <span
                                key={commitment}
                                className="rounded-full border border-app-warm-border/60 bg-app-warm-soft px-3 py-1 text-sm font-medium text-app-warm"
                              >
                                {commitment}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="rounded-lg border border-app-line bg-app-surface px-4 py-3">
                        <span className="text-sm font-semibold uppercase tracking-[0.12em] text-app-ink-muted">Quyết định tải việc</span>
                        <p className="mt-1 text-base font-semibold text-app-ink">
                          {getWorkloadDecisionLabel(summaryReview.workloadDecision)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Nút hành động */}
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    {onOpenTodayTab && (
                      <Button
                        type="button"
                        className="bg-app-warm hover:bg-app-warm/90 text-white text-base py-2.5 px-4 font-medium"
                        onClick={onOpenTodayTab}
                      >
                        Bắt đầu tuần mới ngay ở Hôm nay
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg text-base py-2.5 px-4"
                      onClick={() => setIsEditingReview(true)}
                    >
                      Chỉnh sửa đánh giá
                    </Button>
                  </div>
                </div>
              )}
              {!showForm && summaryReview && nextWeekRecommendation && (
                <TwelveWeekNextWeekRecommendationCard
                  recommendation={nextWeekRecommendation}
                  onAcceptRecommendation={onAcceptNextWeekRecommendation}
                  onOpenTodayTab={onOpenTodayTab}
                />
              )}
              {!showForm && summaryReview && weeklyReflectionInsights && weeklyReflectionInsights.length > 0 && (
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
              )}
              {showForm && (
                <>
                  <div
                    data-testid="wam-section-score"
                    className="rounded-lg border border-app-line bg-app-bg p-5"
                  >
                    <div className="flex items-center gap-2 text-base font-semibold text-app-ink">
                      <Target className="h-5 w-5 text-app-warm" />
                      1. Kết quả thực thi tuần qua (Hệ thống tự tính)
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2 mt-4">
                      <div className="rounded-lg border border-app-line bg-app-surface px-4 py-4">
                        <div className="flex items-center justify-between text-base text-app-ink-muted">
                          <span className="font-medium text-app-ink">Điểm việc lặp lại</span>
                          <span className={`h-2.5 w-2.5 rounded-full ${scoreTone.marker}`} />
                        </div>
                        {weekCompletion.isEmpty ? (
                          <p className="mt-2 text-base font-semibold text-app-ink-soft">Chưa có việc trong tuần này</p>
                        ) : (
                          <p data-testid="weekly-lead-score" className="mt-2 text-4xl font-bold text-app-ink">
                            {leadScoreValue}%
                          </p>
                        )}
                        <Progress value={weekCompletion.isEmpty ? 0 : leadScoreValue} className="mt-3 h-2.5" />
                        <p className="mt-2 text-sm text-app-ink-soft">
                          {weekCompletion.isEmpty
                            ? "Điểm sẽ tự tính khi tuần có việc lặp lại được cam kết."
                            : `Tự tính: ${weekCompletion.completed}/${weekCompletion.total} việc hoàn thành.`}
                        </p>
                      </div>
                      
                      {lagScoreValue !== null ? (
                        <div className="rounded-lg border border-app-line bg-app-surface px-4 py-4">
                          <div className="flex items-center justify-between text-base text-app-ink-muted">
                            <span className="font-medium text-app-ink">Điểm kết quả cuối ({system.lagMetric.name})</span>
                            <span data-testid="weekly-lag-score" className="font-bold text-3xl text-app-ink">{lagScoreValue}%</span>
                          </div>
                          <Progress value={lagScoreValue} className="mt-3 h-2.5" />
                          <p className="mt-2 text-sm text-app-ink-soft">
                            Chỉ số chính: {lagMetricValue || "Chưa cập nhật"}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-app-line bg-app-surface px-4 py-4 flex flex-col justify-between">
                          <div>
                            <span className="text-sm font-semibold uppercase tracking-[0.12em] text-app-ink-muted">Kết quả cuối (Lag Metric)</span>
                            <p className="mt-2 text-base text-app-ink-soft">Không yêu cầu đo lường kết quả cuối trong chu kỳ này.</p>
                          </div>
                          <p className="text-sm text-app-ink-muted">Chỉ số chính: {lagMetricValue || "Chưa cập nhật"}</p>
                        </div>
                      )}
                    </div>
                    
                    <div
                      data-testid="weekly-score-interpretation"
                      className={`mt-4 rounded-lg border px-4 py-3 ${scoreTone.panel}`}
                    >
                      <p className={`flex items-center gap-2 text-base font-semibold ${scoreTone.text}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${scoreTone.marker}`} />
                        {scoreInterpretation.headline}
                      </p>
                      <p className="mt-1.5 text-base leading-6 text-app-ink-soft">{scoreInterpretation.advice}</p>
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
                  
                  <div
                    data-testid="wam-section-commitments"
                    className="rounded-lg border border-app-line bg-app-surface p-5"
                  >
                    <Label className="flex items-center gap-2 text-base font-semibold text-app-ink">
                      <BookmarkCheck className="h-5 w-5 text-app-warm" />
                      2. Cam kết nào tôi đã giữ? Cam kết nào bỏ lỡ?
                    </Label>
                    {previousCommitments.length === 0 ? (
                      <div className="mt-3 rounded-lg border border-dashed border-app-line bg-app-bg px-4 py-3 text-base leading-6 text-app-ink-soft">
                        Tuần đầu chưa có cam kết tuần trước. Hãy đặt cam kết tuần tới ở câu 4.
                      </div>
                    ) : (
                      <div className="mt-3 stack-tight">
                        {previousCommitments.map((commitment) => {
                          const currentStatus = weeklyForm.commitmentStatuses[commitment] ?? "unanswered";
                          const commitmentQuote = getCommitmentQuoteForPreviousCommitment(system, commitment);
                          const setStatus = (status: WeeklyCommitmentStatus) =>
                            onWeeklyFormChange("commitmentStatuses", {
                              ...weeklyForm.commitmentStatuses,
                              [commitment]: status,
                            });

                          return (
                            <div key={commitment} className="rounded-lg border border-app-line bg-app-bg px-3 py-3">
                              <p className="text-base font-medium text-app-ink">{commitment}</p>
                              {commitmentQuote ? (
                                <p className="mt-1 text-sm italic leading-5 text-app-ink-muted">{commitmentQuote}</p>
                              ) : null}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={getCommitmentButtonClass("kept", currentStatus)}
                                  onClick={() => setStatus("kept")}
                                >
                                  Đã giữ
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={getCommitmentButtonClass("missed", currentStatus)}
                                  onClick={() => setStatus("missed")}
                                >
                                  Bỏ lỡ
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
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

                  <div className="grid gap-5 lg:grid-cols-2 mt-2">
                    <div
                      data-testid="wam-section-insights"
                      className="rounded-lg border border-app-line bg-app-surface p-5"
                    >
                      <Label htmlFor="weekly-insights" className="flex items-center gap-2 text-base font-semibold text-app-ink">
                        <Lightbulb className="h-5 w-5 text-yellow-500 animate-[pulse_3s_infinite]" />
                        3. Góc nhìn/điều học được nào cần áp dụng tuần sau?
                      </Label>
                      <Textarea
                        id="weekly-insights"
                        rows={3}
                        className="mt-2 text-base"
                        value={weeklyForm.insights}
                        placeholder="Ví dụ: chỉ giữ 1 khung làm sâu trước khi thêm việc phụ."
                        onChange={(event) => onWeeklyFormChange("insights", event.target.value)}
                      />
                    </div>

                    <div
                      data-testid="wam-section-next-commitments"
                      className="rounded-lg border border-app-warm-border bg-app-warm-soft/30 p-5"
                    >
                      <Label htmlFor="weekly-next-commitments" className="flex items-center gap-2 text-base font-semibold text-app-ink">
                        <Rocket className="h-5 w-5 text-app-warm animate-[bounce_3s_infinite]" />
                        4. Cam kết của tuần tới là gì?
                      </Label>
                      <NextWeekCommitmentsEditor
                        value={nextWeekCommitments}
                        onChange={(next) => onWeeklyFormChange("nextWeekCommitments", next)}
                      />
                      {hasPremiumInsights && nextWeekCommitments.length === 0 && (
                        <p className="mt-2 text-sm leading-5 text-app-ink-muted">
                          Gợi ý Plus: {suggestedNextWeekPlan?.focus ?? ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Review CTA */}
                  <div
                    data-testid="weekly-review-readiness"
                    className="rounded-lg border border-app-line bg-app-bg px-4 py-3 text-base text-app-ink-soft"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-app-ink">Mức sẵn sàng review</p>
                      <span className="rounded-full border border-app-line bg-app-surface px-2.5 py-1 text-sm font-semibold text-app-ink-soft">
                        {reviewReadyCount}/4
                      </span>
                    </div>
                    <p className="mt-1 leading-6">
                      {isFutureReviewWeek
                        ? "Không thể chốt tuần tương lai. Hãy quay lại tuần hiện tại trước khi lưu review."
                        : shouldConfirmEarlyReview
                          ? "Tuần chưa tới ngày review chính thức. Khi lưu sớm, bạn sẽ cần xác nhận thêm một lần."
                          : "Chốt đủ WAM 4 câu trước khi đóng review tuần."}
                    </p>
                  </div>
                  <div
                    className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      reviewDueToday ? "border-app-warm-border bg-app-warm-soft" : "border-app-line bg-app-bg"
                    }`}
                  >
                    <p className="text-base leading-6 text-app-ink-soft">
                      {reviewDueToday
                        ? "Sẵn sàng chốt review tuần này. Tuần sẽ được khóa và tạo gợi ý cho tuần sau."
                        : "Có thể chốt sớm — bạn vẫn được phép sửa đến ngày review chính thức."}
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row w-full sm:w-auto shrink-0">
                      {isEditingReview && (
                        <Button
                          type="button"
                          variant="outline"
                          className="border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg text-base py-2.5 px-4"
                          onClick={() => setIsEditingReview(false)}
                        >
                          Hủy chỉnh sửa
                        </Button>
                      )}
                      <Button
                        size="lg"
                        className="w-full sm:w-auto bg-app-warm text-white hover:bg-app-warm text-base py-3 sm:py-4"
                        onClick={handleSaveReviewClick}
                        disabled={isSavingReview || !canSubmitWeeklyReview}
                        aria-busy={isSavingReview}
                      >
                        {isSavingReview ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <ClipboardCheck className="h-4 w-4" />
                        )}
                        {isSavingReview ? "Đang chốt review..." : "Chốt review tuần này"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </SectionBlock>
      {/* Sticky review CTA is shared by mobile and desktop; keep the test id stable for existing coverage. */}
      {showForm && (
        <div
          data-testid="weekly-review-mobile-sticky-cta"
          className="sticky bottom-20 z-40 border-t border-app-line bg-app-surface/95 p-4 backdrop-blur-sm md:bottom-4 md:mx-auto md:max-w-md md:rounded-lg md:border md:shadow-lg"
        >
          <Button
            size="lg"
            className="w-full bg-app-warm text-white shadow-lg hover:bg-app-warm text-base py-3 sm:py-4"
            onClick={handleSaveReviewClick}
            disabled={isSavingReview || !canSubmitWeeklyReview}
            aria-busy={isSavingReview}
          >
            {isSavingReview ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
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

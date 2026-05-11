import { useState } from "react";
import { CalendarCheck, CheckCircle2, ClipboardCheck, Crown, Flag, Layers, Loader2, TrendingUp } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
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
import {
  getPlanLabel,
  type SuggestedNextWeekPlan,
  type WeeklyReviewPremiumInsight,
} from "../../utils/twelve-week-premium";
import { getWorkloadDecisionLabel } from "../../utils/twelve-week-system-ui";
import { calculateLagScore, interpretWeeklyExecutionScore } from "@/features/plan12week/logic";
import type {
  ExecutionInsight,
  NextWeekRecommendation,
  RescueModeStatus,
} from "@/features/plan12week/logic";

import { TwelveWeekInsightsCard } from "./TwelveWeekInsightsCard";
import { NextWeekCommitmentsEditor } from "./NextWeekCommitmentsEditor";
import { TwelveWeekNextWeekRecommendationCard } from "./TwelveWeekNextWeekRecommendationCard";
import { TwelveWeekRescueNudge } from "./TwelveWeekRescueNudge";
import { SectionBlock } from "../layout/SectionBlock";
import { WeeklyReviewIllustration } from "../illustrations";

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
  premiumInsight: WeeklyReviewPremiumInsight;
  suggestedNextWeekPlan: SuggestedNextWeekPlan;
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
        marker: "bg-emerald-500",
        panel: "border-emerald-200 bg-emerald-50",
        text: "text-emerald-800",
      };
    case "okay":
      return {
        marker: "bg-amber-400",
        panel: "border-amber-200 bg-amber-50",
        text: "text-amber-800",
      };
    default:
      return {
        marker: "bg-rose-500",
        panel: "border-rose-200 bg-rose-50",
        text: "text-rose-800",
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

function getCommitmentButtonClass(isActive: boolean): string {
  return isActive
    ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-900"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
}

export function TwelveWeekWeekTab({
  system,
  currentWeekNumber,
  currentWeekRange,
  currentPlanFocus,
  currentPlanMilestone,
  reviewDueToday,
  reviewStatusLabel,
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
  const summaryReview = reviewIsCompleted ? currentReview ?? null : null;
  const summaryCommitmentsKept = normalizeCommitmentList(summaryReview?.commitmentsKept);
  const summaryCommitmentsMissed = normalizeCommitmentList(summaryReview?.commitmentsMissed);
  const summaryCommitmentTotal = summaryCommitmentsKept.length + summaryCommitmentsMissed.length;
  const summaryInsights =
    summaryReview?.insights?.trim() || summaryReview?.reflection?.trim() || summaryReview?.biggestOutputThisWeek?.trim();
  const summaryNextWeekCommitments = getReviewNextWeekCommitments(summaryReview);
  const [isSavingReview, setIsSavingReview] = useState(false);
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

  const handleSaveReviewClick = async () => {
    if (isSavingReview || !canSubmitWeeklyReview) return;
    if (isFutureReviewWeek) return;
    if (shouldConfirmEarlyReview && !window.confirm("Tuần chưa hết, vẫn lưu sớm?")) return;
    setIsSavingReview(true);
    try {
      await Promise.resolve(onSaveWeeklyReview());
    } finally {
      setIsSavingReview(false);
    }
  };

  return (
    <div className="stack-section pt-4 pb-24 md:pb-0">
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
      <SectionBlock title="Tóm tắt tuần hiện tại" headerVisuallyHidden>
        <div className="grid gap-[var(--space-stack)] md:grid-cols-3">
        <Card className="border border-slate-200/80 bg-white/92 shadow-sm ring-1 ring-slate-200">
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Flag className="h-3.5 w-3.5" />
              Một câu để nhớ
            </p>
            <p className="mt-[var(--space-inline)] text-lg font-semibold leading-8 text-slate-950">{currentPlanFocus}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-white/92 shadow-sm ring-1 ring-slate-200">
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              <TrendingUp className="h-3.5 w-3.5" />
              Lead tuần này
            </p>
            <p
              data-testid="weekly-lead-score"
              className={`mt-[var(--space-inline)] font-bold text-slate-950 ${
                weekCompletion.isEmpty ? "text-lg leading-7" : "text-3xl"
              }`}
            >
              {weekCompletion.isEmpty ? "Chưa có việc trong tuần này" : `${leadScoreValue}%`}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {weekCompletion.isEmpty
                ? "Khi có việc lặp lại, điểm việc lặp lại sẽ bắt đầu tính."
                : `${weekCompletion.completed}/${weekCompletion.total} việc đã chốt`}
            </p>
            {!weekCompletion.isEmpty && (
              <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className={`h-2.5 w-2.5 rounded-[var(--r-pill)] ${scoreTone.marker}`} />
                Chuẩn tuần: 85%
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-white/92 shadow-sm ring-1 ring-slate-200">
          <CardContent className="p-5">
            <p
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                reviewDueToday ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              Review tuần
            </p>
            <p className="mt-[var(--space-inline)] text-3xl font-bold text-slate-950">
              {reviewDueToday ? "Hôm nay" : getReviewDayLabel(system.reviewDay)}
            </p>
            <p className="mt-1 text-sm text-slate-600">{reviewStatusLabel}</p>
          </CardContent>
        </Card>
        </div>
      </SectionBlock>

      <SectionBlock title="Review và cam kết tuần" headerVisuallyHidden>
        <div className="grid gap-[var(--space-section)] lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="h-full border border-slate-200/80 bg-white/92 shadow-sm ring-1 ring-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-950">
              <Layers className="h-5 w-5 text-indigo-600" />
              Tuần này chỉ cần giữ 2 lớp việc
            </CardTitle>
            <CardDescription className="text-slate-700">
              {currentWeekRange
                ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                : "Chu kỳ hiện tại"}
            </CardDescription>
          </CardHeader>
          <CardContent className="stack-stack">
            <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ưu tiên tuần</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{currentPlanFocus}</p>
              {currentPlanMilestone && (
                <p className="mt-[var(--space-inline)] text-sm text-slate-600">Cột mốc đang nhắm tới: {currentPlanMilestone}</p>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[var(--r-control)] border border-emerald-200 bg-emerald-50/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Cốt lõi trước</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {coreIndicators.length} việc lặp lại chính
                    </p>
                  </div>
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{coreIndicators.length}</Badge>
                </div>
                <div className="mt-4 stack-tight">
                  {coreIndicators.length === 0 ? (
                    <div className="rounded-[var(--r-control)] border border-emerald-100 bg-white px-4 py-4 text-sm leading-6 text-slate-500">
                      Chưa có việc cốt lõi. Khi việc lặp lại được thêm, phần này sẽ cho bạn biết việc nào cần làm trước.
                    </div>
                  ) : (
                    coreIndicators.map((indicator) => (
                      <div
                        key={indicator.id || indicator.name}
                        className="rounded-[var(--r-control)] border border-emerald-100 bg-white px-4 py-3"
                      >
                        <p className="font-medium text-slate-900">{indicator.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {indicator.target || "1"} {indicator.unit || "lần/tuần"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[var(--r-control)] border border-amber-200 bg-amber-50/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                      Tùy chọn nếu còn sức
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {optionalIndicators.length > 0
                        ? `${optionalIndicators.length} việc bổ sung`
                        : "Không có việc tùy chọn"}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-200 bg-white text-amber-800">
                    {optionalIndicators.length}
                  </Badge>
                </div>
                <div className="mt-4 stack-tight">
                  {optionalIndicators.length === 0 ? (
                    <div className="rounded-[var(--r-control)] border border-amber-100 bg-white px-4 py-4 text-sm text-slate-500">
                      Tuần này bạn chỉ cần giữ các việc cốt lõi là đủ.
                    </div>
                  ) : (
                    optionalIndicators.map((indicator) => (
                      <div
                        key={indicator.id || indicator.name}
                        className="rounded-[var(--r-control)] border border-amber-100 bg-white px-4 py-3"
                      >
                        <p className="font-medium text-slate-900">{indicator.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {indicator.target || "1"} {indicator.unit || "lần/tuần"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          data-tour-id="system-week-review"
          className="h-full border border-slate-200/80 bg-white/92 shadow-sm ring-1 ring-slate-200"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-950">
              <ClipboardCheck className="h-5 w-5 text-violet-600" />
              Review tuần
            </CardTitle>
            <CardDescription className="text-slate-700">
              WAM 4 câu: điểm, cam kết, góc nhìn và cam kết tuần tới.
            </CardDescription>
          </CardHeader>
          <CardContent className="stack-stack">
            <WeeklyReviewIllustration className="mx-auto w-32 text-violet-500 opacity-75 sm:w-36" />
            <div
              className={`rounded-[var(--r-control)] border p-4 ${reviewDueToday ? "border-amber-200 bg-amber-50/80" : "border-slate-200 bg-slate-50"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">
                    {reviewDueToday
                      ? "Hôm nay là ngày chốt review tuần."
                      : `Review chính thức vào ${getReviewDayLabel(system.reviewDay)}.`}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {reviewDueToday
                      ? "Chốt ngay hôm nay để tuần sau bắt đầu nhẹ đầu hơn."
                      : "Bạn vẫn có thể ghi trước phần nhìn lại để đến ngày review chỉ cần chốt lại."}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    reviewDueToday
                      ? "border-amber-200 bg-white text-amber-800"
                      : "border-slate-300 bg-white text-slate-700"
                  }
                >
                  {reviewDueToday ? "Nên chốt hôm nay" : "Chưa đến hạn"}
                </Badge>
              </div>
            </div>
            <div data-testid="weekly-review-flow" className="grid gap-2 sm:grid-cols-4">
              {reviewReadinessItems.map((item, index) => (
                <div
                  key={item.key}
                  data-testid={`weekly-review-step-${item.key}`}
                  data-done={item.done ? "true" : "false"}
                  className={`rounded-[var(--r-control)] border px-3 py-3 text-sm ${
                    item.done
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                    {index + 1}. {item.label}
                  </p>
                  <p className="mt-1 font-medium">{item.done ? "Đã có" : "Đang mở"}</p>
                </div>
              ))}
            </div>
            {summaryReview && (
              <div
                data-testid="weekly-review-summary"
                className={`rounded-[var(--r-control)] border p-4 shadow-sm ${
                  scoreInterpretation.level === "strong"
                    ? "border-emerald-200 bg-emerald-50/82"
                    : scoreInterpretation.level === "okay"
                      ? "border-sky-200 bg-sky-50/82"
                      : "border-amber-200 bg-amber-50/82"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Tuần {summaryReview.weekNumber} đã chốt
                    </p>
                    <p className="mt-2 text-base font-semibold text-slate-950">{scoreInterpretation.headline}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{scoreInterpretation.advice}</p>
                  </div>
                  <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                    {getWorkloadDecisionLabel(summaryReview.workloadDecision)}
                  </Badge>
                </div>
                <div className="mt-[var(--space-inline)] grid gap-2 md:grid-cols-2">
                  <div className="rounded-[var(--r-control)] border border-white/82 bg-white/82 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Điểm</p>
                    <p className="mt-1 text-sm leading-5 text-slate-700">
                      {summaryReview.leadCompletionPercent}% điểm việc lặp lại
                    </p>
                  </div>
                  <div className="rounded-[var(--r-control)] border border-white/82 bg-white/82 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Cam kết tuần qua</p>
                    <p className="mt-1 text-sm leading-5 text-slate-700">
                      Đã giữ {summaryCommitmentsKept.length}/{summaryCommitmentTotal} cam kết
                    </p>
                  </div>
                  {summaryInsights && (
                    <div className="rounded-[var(--r-control)] border border-white/82 bg-white/82 px-3 py-2 md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Góc nhìn tuần sau</p>
                      <p className="mt-1 text-sm leading-5 text-slate-700">{summaryInsights}</p>
                    </div>
                  )}
                  {summaryNextWeekCommitments.length > 0 && (
                    <div className="rounded-[var(--r-control)] border border-violet-200/70 bg-white/82 px-3 py-2 md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
                        Cam kết tuần tới
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {summaryNextWeekCommitments.map((commitment) => (
                          <span
                            key={commitment}
                            className="rounded-[var(--r-pill)] border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800"
                          >
                            {commitment}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {onOpenTodayTab && (
                  <Button
                    variant="outline"
                    className="mt-4 w-full bg-white sm:w-auto"
                    onClick={onOpenTodayTab}
                  >
                    Mở Hôm nay để bắt đầu tuần sau
                  </Button>
                )}
              </div>
            )}
            {summaryReview && nextWeekRecommendation && (
              <TwelveWeekNextWeekRecommendationCard
                recommendation={nextWeekRecommendation}
                onAcceptRecommendation={onAcceptNextWeekRecommendation}
                onOpenTodayTab={onOpenTodayTab}
              />
            )}
            {summaryReview && weeklyReflectionInsights && weeklyReflectionInsights.length > 0 && (
              <TwelveWeekInsightsCard
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
            <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--r-control)] border border-white/80 bg-white px-3 py-3">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Điểm việc lặp lại</span>
                    <span className={`h-2.5 w-2.5 rounded-[var(--r-pill)] ${scoreTone.marker}`} />
                  </div>
                  {weekCompletion.isEmpty ? (
                    <p className="mt-2 text-sm font-semibold text-slate-700">Chưa có dữ liệu lead</p>
                  ) : (
                    <p data-testid="weekly-lead-score-detail" className="mt-2 text-2xl font-bold text-slate-950">
                      {leadScoreValue}%
                    </p>
                  )}
                  <Progress value={weekCompletion.isEmpty ? 0 : leadScoreValue} className="mt-[var(--space-inline)] h-2.5" />
                </div>
                {lagScoreValue !== null && (
                  <div className="rounded-[var(--r-control)] border border-white/80 bg-white px-3 py-3">
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>Điểm kết quả cuối</span>
                      <span>{system.lagMetric.name}</span>
                    </div>
                    <p data-testid="weekly-lag-score" className="mt-2 text-2xl font-bold text-slate-950">
                      {lagScoreValue}%
                    </p>
                    <Progress value={lagScoreValue} className="mt-[var(--space-inline)] h-2.5" />
                  </div>
                )}
              </div>
              <div
                data-testid="weekly-score-interpretation"
                className={`mt-[var(--space-inline)] rounded-[var(--r-control)] border px-3 py-2 ${scoreTone.panel}`}
              >
                <p className={`flex items-center gap-2 text-sm font-semibold ${scoreTone.text}`}>
                  <span className={`h-2.5 w-2.5 rounded-[var(--r-pill)] ${scoreTone.marker}`} />
                  {scoreInterpretation.headline}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{scoreInterpretation.advice}</p>
              </div>
              <p className="mt-[var(--space-inline)] text-sm text-slate-500">Chỉ số chính: {lagMetricValue || "Chưa cập nhật"}</p>
            </div>
            <div
              className={`rounded-[var(--r-control)] border p-4 shadow-sm ${
                hasPremiumInsights ? "border-sky-200 bg-sky-50" : "border-violet-200 bg-violet-50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Phân tích ôn lại Plus
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{premiumInsight.headline}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{premiumInsight.summary}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      hasPremiumInsights
                        ? "border-sky-200 bg-white/90 text-sky-800"
                        : "border-violet-200 bg-white/90 text-violet-800"
                    }
                  >
                    {premiumInsight.badgeLabel}
                  </Badge>
                  <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                    {getPlanLabel(currentPlanCode)}
                  </Badge>
                </div>
              </div>

              {hasPremiumInsights ? (
                <div className="mt-4 stack-tight">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[var(--r-control)] border border-sky-100 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Gợi ý chỉnh tải
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-800">{premiumInsight.recommendedAdjustment}</p>
                    </div>
                    <div className="rounded-[var(--r-control)] border border-sky-100 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Gợi ý ngắn</p>
                      <p className="mt-2 text-sm leading-7 text-slate-800">{premiumInsight.coachNote}</p>
                    </div>
                  </div>
                  <div className="rounded-[var(--r-control)] border border-sky-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Kế hoạch gợi ý cho tuần sau
                        </p>
                        <p className="mt-2 text-base font-semibold leading-7 text-slate-950">
                          {suggestedNextWeekPlan.focus}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{suggestedNextWeekPlan.rationale}</p>
                      </div>
                      <Badge className="bg-sky-700 text-white hover:bg-sky-700">
                        {getWorkloadDecisionLabel(suggestedNextWeekPlan.workloadDecision)}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Giữ chắc</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {suggestedNextWeekPlan.protectTactics.map((item) => (
                            <Badge key={item} variant="outline" className="border-slate-200 bg-white text-slate-700">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {suggestedNextWeekPlan.secondaryTrackLabel}
                        </p>
                        <div className="mt-2 stack-tight">
                          {suggestedNextWeekPlan.secondaryTrackItems.map((item) => (
                            <p key={item} className="text-sm leading-6 text-slate-700">
                              {item}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      Bước đầu tuần nên làm: {suggestedNextWeekPlan.firstMove}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button className="w-full sm:w-auto" onClick={onApplySuggestedPlan}>
                        Dùng gợi ý này cho tuần sau
                      </Button>
                      <p className="text-sm text-slate-500">Bạn vẫn có thể sửa lại trước khi chốt review.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 stack-tight">
                  {/* Status indicator — always computed, shown as teaser */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-control)] border border-violet-100 bg-white px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-[var(--r-pill)] ${
                          premiumInsight.status === "strong"
                            ? "bg-emerald-500"
                            : premiumInsight.status === "at_risk"
                              ? "bg-amber-400"
                              : "bg-amber-400"
                        }`}
                      />
                      <span className="text-sm font-semibold text-slate-800">Đã đọc được nhịp tuần này</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        premiumInsight.status === "strong"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : premiumInsight.status === "at_risk"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                      }
                    >
                      {premiumInsight.badgeLabel}
                    </Badge>
                  </div>
                  {/* Blurred content preview */}
                  <div className="relative overflow-hidden rounded-[var(--r-control)] border border-violet-200 bg-white p-4">
                    <div className="pointer-events-none select-none blur-[3px] opacity-60">
                      <p className="text-sm font-semibold text-slate-900">{premiumInsight.headline}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-2">{premiumInsight.summary}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Gợi ý chỉnh tải: {premiumInsight.recommendedAdjustment}
                      </p>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[var(--r-control)] bg-white/50">
                      <Crown className="h-5 w-5 text-violet-500" />
                      <p className="mt-1 text-xs font-semibold text-violet-700">Chỉ dành cho Plus</p>
                    </div>
                  </div>
                  <div className="rounded-[var(--r-control)] border border-violet-200/70 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-950">
                      Mở Plus để đọc phân tích đầy đủ và ra ngay kế hoạch tuần sau đủ gọn để làm.
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Plus chốt luôn ưu tiên tuần sau, mức tải nên giữ và phần nào nên buông bớt — không chỉ là phân
                      tích để đọc.
                    </p>
                    <Button className="mt-4 w-full sm:w-auto" onClick={onOpenPremiumInsights}>
                      Mở ôn lại Plus ngay
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div
              data-testid="wam-section-score"
              className="rounded-[var(--r-control)] border border-sky-200 bg-sky-50/70 px-4 py-4"
            >
              <Label className="text-sm font-semibold text-slate-950">1. Điểm tuần qua bao nhiêu %?</Label>
              <p className="mt-2 text-3xl font-bold text-slate-950">
                {weekCompletion.isEmpty ? "Chưa có việc trong tuần này" : `${leadScoreValue}%`}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {weekCompletion.isEmpty
                  ? "Điểm sẽ tự tính khi tuần có việc lặp lại được cam kết."
                  : `Tự tính từ việc lặp lại: ${weekCompletion.completed}/${weekCompletion.total} việc đã hoàn thành.`}
              </p>
            </div>

            <div
              data-testid="wam-section-commitments"
              className="rounded-[var(--r-control)] border border-slate-200 bg-white px-4 py-4"
            >
              <Label className="text-sm font-semibold text-slate-950">
                2. Cam kết nào tôi đã giữ? Cam kết nào bỏ lỡ?
              </Label>
              {previousCommitments.length === 0 ? (
                <div className="mt-[var(--space-inline)] rounded-[var(--r-control)] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  Tuần đầu chưa có cam kết tuần trước. Hãy đặt cam kết tuần tới ở câu 4.
                </div>
              ) : (
                <div className="mt-[var(--space-inline)] stack-tight">
                  {previousCommitments.map((commitment) => {
                    const currentStatus = weeklyForm.commitmentStatuses[commitment] ?? "unanswered";
                    const commitmentQuote = getCommitmentQuoteForPreviousCommitment(system, commitment);
                    const setStatus = (status: WeeklyCommitmentStatus) =>
                      onWeeklyFormChange("commitmentStatuses", {
                        ...weeklyForm.commitmentStatuses,
                        [commitment]: status,
                      });

                    return (
                      <div key={commitment} className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="text-sm font-medium text-slate-900">{commitment}</p>
                        {commitmentQuote ? (
                          <p className="mt-1 text-xs italic leading-5 text-slate-500">{commitmentQuote}</p>
                        ) : null}
                        <div className="mt-[var(--space-inline)] flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={getCommitmentButtonClass(currentStatus === "kept")}
                            onClick={() => setStatus("kept")}
                          >
                            Đã giữ
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={getCommitmentButtonClass(currentStatus === "missed")}
                            onClick={() => setStatus("missed")}
                          >
                            Bỏ lỡ
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={getCommitmentButtonClass(currentStatus === "not_set")}
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

            <div
              data-testid="wam-section-insights"
              className="rounded-[var(--r-control)] border border-slate-200 bg-white px-4 py-4"
            >
              <Label htmlFor="weekly-insights">3. Góc nhìn/điều học được nào cần áp dụng tuần sau?</Label>
              <Textarea
                id="weekly-insights"
                rows={3}
                className="mt-2"
                value={weeklyForm.insights}
                placeholder="Ví dụ: chỉ giữ 1 khung làm sâu trước khi thêm việc phụ."
                onChange={(event) => onWeeklyFormChange("insights", event.target.value)}
              />
            </div>

            <div
              data-testid="wam-section-next-commitments"
              className="rounded-[var(--r-control)] border border-violet-200 bg-violet-50/50 px-4 py-4"
            >
              <Label htmlFor="weekly-next-commitments">4. Cam kết của tuần tới là gì?</Label>
              <NextWeekCommitmentsEditor
                value={nextWeekCommitments}
                onChange={(next) => onWeeklyFormChange("nextWeekCommitments", next)}
              />
              {hasPremiumInsights && nextWeekCommitments.length === 0 && (
                <p className="mt-2 text-xs leading-5 text-slate-600">Gợi ý Plus: {suggestedNextWeekPlan.focus}</p>
              )}
            </div>

            {/* Review CTA */}
            <div
              data-testid="weekly-review-readiness"
              className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950">Mức sẵn sàng review</p>
                <span className="rounded-[var(--r-pill)] border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
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
              className={`flex flex-col gap-3 rounded-[var(--r-control)] border p-4 sm:flex-row sm:items-center sm:justify-between ${
                reviewDueToday
                  ? "border-amber-300 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="text-sm leading-6 text-slate-700">
                {reviewDueToday
                  ? "Sẵn sàng chốt review tuần này. Tuần sẽ được khóa và tạo gợi ý cho tuần sau."
                  : "Có thể chốt sớm — bạn vẫn được phép sửa đến ngày review chính thức."}
              </p>
              <Button
                size="lg"
                className="w-full shrink-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-blue-600 text-white hover:opacity-90 sm:w-auto"
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
          </CardContent>
        </Card>
        </div>
      </SectionBlock>
      {/* Sticky review CTA for mobile */}
      <div
        data-testid="weekly-review-mobile-sticky-cta"
        className="md:hidden sticky bottom-20 z-40 border-t bg-white/95 p-4 backdrop-blur-sm"
      >
        <Button
          size="lg"
          className="w-full gradient-brand text-white shadow-lg"
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
    </div>
  );
}

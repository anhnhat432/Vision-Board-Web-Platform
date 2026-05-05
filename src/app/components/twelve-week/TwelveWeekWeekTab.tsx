import { useState } from "react";
import { Crown } from "lucide-react";

import { CalendarCheck, CheckCircle2, ClipboardCheck, Flag, Layers, Loader2, TrendingUp } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
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
import { WORKLOAD_OPTIONS, getWorkloadDecisionLabel } from "../../utils/twelve-week-system-ui";
import { interpretWeeklyExecutionScore } from "@/features/plan12week/logic";
import type {
  ExecutionInsight,
  NextWeekRecommendation,
  RescueModeStatus,
} from "@/features/plan12week/logic";

import { TwelveWeekInsightsCard } from "./TwelveWeekInsightsCard";
import { TwelveWeekNextWeekRecommendationCard } from "./TwelveWeekNextWeekRecommendationCard";
import { TwelveWeekRescueNudge } from "./TwelveWeekRescueNudge";

interface WeekRange {
  start: string;
  end: string;
}

interface WeekCompletionSummary {
  completed: number;
  total: number;
  percent: number;
}

interface TwelveWeekWeeklyReviewForm {
  lagProgressValue: string;
  biggestOutputThisWeek: string;
  mainObstacle: string;
  keepTactic: string;
  reduceTactic: string;
  nextWeekPriority: string;
  workloadDecision: "keep same" | "reduce slightly" | "increase slightly" | "";
}

interface TwelveWeekWeekTabProps {
  system: TwelveWeekSystem;
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
  onWeeklyFormChange: (field: keyof TwelveWeekWeeklyReviewForm, value: string) => void;
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

function getWorkloadIntensityHint(value: TwelveWeekWeeklyReviewForm["workloadDecision"]): string {
  if (value === "reduce slightly") return "Nhẹ hơn — giảm tải để khôi phục nhịp.";
  if (value === "increase slightly") return "Đẩy nhanh — tăng nhẹ một việc quan trọng.";
  if (value === "keep same") return "Giữ nguyên — chạy như tuần này.";
  return "";
}
export function TwelveWeekWeekTab({
  system,
  currentWeekRange,
  currentPlanFocus,
  currentPlanMilestone,
  reviewDueToday,
  reviewStatusLabel,
  currentScoreValue,
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
  const scoreInterpretation = interpretWeeklyExecutionScore(currentScoreValue);
  const reviewIsCompleted = Boolean(currentReview?.reviewCompleted);
  const summaryReview = reviewIsCompleted ? currentReview ?? null : null;
  const intensityHint = getWorkloadIntensityHint(weeklyForm.workloadDecision);
  const [isSavingReview, setIsSavingReview] = useState(false);

  const handleSaveReviewClick = async () => {
    if (isSavingReview) return;
    setIsSavingReview(true);
    try {
      await Promise.resolve(onSaveWeeklyReview());
    } finally {
      setIsSavingReview(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          interactive={false}
          className="border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.32)]"
        >
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Flag className="h-3.5 w-3.5" />
              Một câu để nhớ
            </p>
            <p className="mt-3 text-lg font-semibold leading-8 text-slate-950">{currentPlanFocus}</p>
          </CardContent>
        </Card>
        <Card
          interactive={false}
          className="border border-sky-200/80 bg-sky-50/70 shadow-[0_18px_44px_-36px_rgba(37,99,235,0.28)]"
        >
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              <TrendingUp className="h-3.5 w-3.5" />
              Tiến độ tuần
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{weekCompletion.percent}%</p>
            <p className="mt-1 text-sm text-slate-600">
              {weekCompletion.completed}/{weekCompletion.total} việc đã chốt
            </p>
          </CardContent>
        </Card>
        <Card
          interactive={false}
          className={
            reviewDueToday
              ? "border border-amber-200/80 bg-amber-50/80 shadow-[0_18px_44px_-36px_rgba(217,119,6,0.28)]"
              : "border border-emerald-200/80 bg-emerald-50/70 shadow-[0_18px_44px_-36px_rgba(5,150,105,0.24)]"
          }
        >
          <CardContent className="p-5">
            <p
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                reviewDueToday ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              Review tuần
            </p>
            <p className="mt-3 text-2xl font-bold text-slate-950">
              {reviewDueToday ? "Hôm nay" : getReviewDayLabel(system.reviewDay)}
            </p>
            <p className="mt-1 text-sm text-slate-600">{reviewStatusLabel}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="h-full border border-slate-200/80 bg-white/92 shadow-[0_22px_54px_-40px_rgba(99,102,241,0.22)]">
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
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ưu tiên tuần</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{currentPlanFocus}</p>
              {currentPlanMilestone && (
                <p className="mt-3 text-sm text-slate-600">Cột mốc đang nhắm tới: {currentPlanMilestone}</p>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Cốt lõi trước</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {coreIndicators.length} việc lặp lại chính
                    </p>
                  </div>
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{coreIndicators.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {coreIndicators.length === 0 ? (
                    <div className="rounded-lg border border-emerald-100 bg-white px-4 py-4 text-sm leading-6 text-slate-500">
                      Chưa có việc cốt lõi. Khi việc lặp lại được thêm, phần này sẽ cho bạn biết việc nào cần làm trước.
                    </div>
                  ) : (
                    coreIndicators.map((indicator) => (
                      <div
                        key={indicator.id || indicator.name}
                        className="rounded-lg border border-emerald-100 bg-white px-4 py-3"
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

              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-5">
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
                <div className="mt-4 space-y-3">
                  {optionalIndicators.length === 0 ? (
                    <div className="rounded-lg border border-amber-100 bg-white px-4 py-4 text-sm text-slate-500">
                      Tuần này bạn chỉ cần giữ các việc cốt lõi là đủ.
                    </div>
                  ) : (
                    optionalIndicators.map((indicator) => (
                      <div
                        key={indicator.id || indicator.name}
                        className="rounded-lg border border-amber-100 bg-white px-4 py-3"
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
          className="h-full border border-slate-200/80 bg-white/92 shadow-[0_22px_54px_-40px_rgba(168,85,247,0.18)]"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-950">
              <ClipboardCheck className="h-5 w-5 text-violet-600" />
              Review tuần
            </CardTitle>
            <CardDescription className="text-slate-700">
              Chỉ 3 câu phản tư và 1 quyết định cho tuần sau.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`rounded-lg border p-4 ${reviewDueToday ? "border-amber-200 bg-amber-50/80" : "border-slate-200 bg-slate-50"}`}
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
                      : "Bạn vẫn có thể ghi trước phần phản tư để đến ngày review chỉ cần chốt lại."}
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
            {summaryReview && (
              <div
                data-testid="weekly-review-summary"
                className={`rounded-lg border p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)] ${
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
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {summaryReview.biggestOutputThisWeek && (
                    <div className="rounded-lg border border-white/82 bg-white/82 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Kết quả chính</p>
                      <p className="mt-1 text-sm leading-5 text-slate-700">{summaryReview.biggestOutputThisWeek}</p>
                    </div>
                  )}
                  {summaryReview.mainObstacle && (
                    <div className="rounded-lg border border-white/82 bg-white/82 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Cản trở</p>
                      <p className="mt-1 text-sm leading-5 text-slate-700">{summaryReview.mainObstacle}</p>
                    </div>
                  )}
                  {summaryReview.keepTactic && (
                    <div className="rounded-lg border border-emerald-200/70 bg-white/82 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Giữ</p>
                      <p className="mt-1 text-sm leading-5 text-slate-700">{summaryReview.keepTactic}</p>
                    </div>
                  )}
                  {summaryReview.reduceTactic && (
                    <div className="rounded-lg border border-amber-200/70 bg-white/82 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Giảm / bỏ</p>
                      <p className="mt-1 text-sm leading-5 text-slate-700">{summaryReview.reduceTactic}</p>
                    </div>
                  )}
                  {summaryReview.nextWeekPriority && (
                    <div className="rounded-lg border border-violet-200/70 bg-white/82 px-3 py-2 md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">Ưu tiên tuần sau</p>
                      <p className="mt-1 text-sm leading-5 text-slate-700">{summaryReview.nextWeekPriority}</p>
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Điểm tự động</span>
                <span className="font-semibold text-slate-700">{currentScoreValue}</span>
              </div>
              <Progress value={currentScoreValue} className="mt-3 h-2.5" />
              <div
                data-testid="weekly-score-interpretation"
                className={`mt-3 rounded-lg border px-3 py-2 ${
                  scoreInterpretation.level === "strong"
                    ? "border-emerald-200 bg-emerald-50"
                    : scoreInterpretation.level === "okay"
                      ? "border-sky-200 bg-sky-50"
                      : "border-amber-200 bg-amber-50"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    scoreInterpretation.level === "strong"
                      ? "text-emerald-800"
                      : scoreInterpretation.level === "okay"
                        ? "text-sky-800"
                        : "text-amber-800"
                  }`}
                >
                  {scoreInterpretation.headline}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{scoreInterpretation.advice}</p>
              </div>
              <p className="mt-3 text-sm text-slate-500">Chỉ số chính: {currentLagMetricValue || "Chưa cập nhật"}</p>
            </div>
            <div
              className={`rounded-lg border p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)] ${
                hasPremiumInsights ? "border-sky-200 bg-sky-50" : "border-violet-200 bg-violet-50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Phân tích review Plus
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
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-sky-100 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Gợi ý chỉnh tải
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-800">{premiumInsight.recommendedAdjustment}</p>
                    </div>
                    <div className="rounded-lg border border-sky-100 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Gợi ý ngắn</p>
                      <p className="mt-2 text-sm leading-7 text-slate-800">{premiumInsight.coachNote}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-sky-200 bg-white p-4 shadow-[0_18px_40px_-34px_rgba(2,132,199,0.18)]">
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
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Giữ chắc</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {suggestedNextWeekPlan.protectTactics.map((item) => (
                            <Badge key={item} variant="outline" className="border-slate-200 bg-white text-slate-700">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {suggestedNextWeekPlan.secondaryTrackLabel}
                        </p>
                        <div className="mt-2 space-y-2">
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
                <div className="mt-4 space-y-3">
                  {/* Status indicator — always computed, shown as teaser */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-100 bg-white px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
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
                  <div className="relative overflow-hidden rounded-lg border border-violet-200 bg-white p-4">
                    <div className="pointer-events-none select-none blur-[3px] opacity-60">
                      <p className="text-sm font-semibold text-slate-900">{premiumInsight.headline}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-2">{premiumInsight.summary}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Gợi ý chỉnh tải: {premiumInsight.recommendedAdjustment}
                      </p>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/50 backdrop-blur-[2px]">
                      <Crown className="h-5 w-5 text-violet-500" />
                      <p className="mt-1 text-xs font-semibold text-violet-700">Chỉ dành cho Plus</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-violet-200/70 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-950">
                      Mở Plus để đọc phân tích đầy đủ và ra ngay kế hoạch tuần sau đủ gọn để làm.
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Plus chốt luôn ưu tiên tuần sau, mức tải nên giữ và phần nào nên buông bớt — không chỉ là phân
                      tích để đọc.
                    </p>
                    <Button className="mt-4 w-full sm:w-auto" onClick={onOpenPremiumInsights}>
                      Mở review Plus ngay
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-best">1. Tuần này kết quả lớn nhất là gì?</Label>
              <Textarea
                id="weekly-best"
                rows={3}
                value={weeklyForm.biggestOutputThisWeek}
                onChange={(event) => onWeeklyFormChange("biggestOutputThisWeek", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-obstacle">2. Điều gì cản trở nhiều nhất?</Label>
              <Textarea
                id="weekly-obstacle"
                rows={3}
                value={weeklyForm.mainObstacle}
                onChange={(event) => onWeeklyFormChange("mainObstacle", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-keep">3. Việc nào tuần sau nên giữ?</Label>
              <Textarea
                id="weekly-keep"
                rows={2}
                value={weeklyForm.keepTactic}
                placeholder="Việc nào đang chạy tốt — giữ nguyên cách làm."
                onChange={(event) => onWeeklyFormChange("keepTactic", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-reduce">4. Việc nào nên giảm hoặc bỏ?</Label>
              <Textarea
                id="weekly-reduce"
                rows={2}
                value={weeklyForm.reduceTactic}
                placeholder="Việc nào đang ngốn thời gian mà ít hiệu quả — giảm tải hoặc đổi lịch."
                onChange={(event) => onWeeklyFormChange("reduceTactic", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-priority">5. Ưu tiên số 1 tuần sau là gì?</Label>
              <Textarea
                id="weekly-priority"
                rows={3}
                value={weeklyForm.nextWeekPriority}
                placeholder={
                  hasPremiumInsights ? suggestedNextWeekPlan.focus : "Ví dụ: chỉ giữ một ưu tiên thật rõ cho tuần sau."
                }
                onChange={(event) => onWeeklyFormChange("nextWeekPriority", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-decision">Tuần sau muốn nhẹ hơn, giữ nguyên hay đẩy nhanh?</Label>
              <Select
                value={weeklyForm.workloadDecision}
                onValueChange={(value) => onWeeklyFormChange("workloadDecision", value)}
              >
                <SelectTrigger id="weekly-decision" aria-label="Chọn quyết định cho tuần sau">
                  <SelectValue placeholder="Chọn mức tải cho tuần sau" />
                </SelectTrigger>
                <SelectContent>
                  {WORKLOAD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {intensityHint && <p className="text-xs leading-5 text-slate-500">{intensityHint}</p>}
            </div>
            <div
              className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
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
                disabled={isSavingReview}
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
    </div>
  );
}

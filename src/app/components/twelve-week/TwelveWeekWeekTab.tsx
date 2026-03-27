import { Crown } from "lucide-react";

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
} from "../../utils/storage-types";
import {
  getPlanLabel,
  type SuggestedNextWeekPlan,
  type WeeklyReviewPremiumInsight,
} from "../../utils/twelve-week-premium";
import { WORKLOAD_OPTIONS, getWorkloadDecisionLabel } from "../../utils/twelve-week-system-ui";

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
  onWeeklyFormChange: (field: keyof TwelveWeekWeeklyReviewForm, value: string) => void;
  onApplySuggestedPlan: () => void;
  onOpenPremiumInsights: () => void;
  onSaveWeeklyReview: () => void;
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
  onWeeklyFormChange,
  onApplySuggestedPlan,
  onOpenPremiumInsights,
  onSaveWeeklyReview,
}: TwelveWeekWeekTabProps) {
  return (
    <div className="space-y-6 pt-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card interactive={false} className="border-0 gradient-dark text-white shadow-[0_30px_70px_-40px_rgba(15,23,42,0.7)]">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/56">Một câu để nhớ</p>
            <p className="mt-3 text-lg font-semibold leading-8 text-white">{currentPlanFocus}</p>
          </CardContent>
        </Card>
        <Card interactive={false} className="border-0 gradient-blue shadow-[0_24px_60px_-36px_rgba(37,99,235,0.24)]">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tiến độ tuần</p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{weekCompletion.percent}%</p>
            <p className="mt-1 text-sm text-slate-600">{weekCompletion.completed}/{weekCompletion.total} việc đã chốt</p>
          </CardContent>
        </Card>
        <Card
          interactive={false}
          className={
            reviewDueToday
              ? "border-0 gradient-amber shadow-[0_24px_60px_-36px_rgba(217,119,6,0.24)]"
              : "border-0 gradient-emerald shadow-[0_24px_60px_-36px_rgba(5,150,105,0.2)]"
          }
        >
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Review tuần</p>
            <p className="mt-3 text-2xl font-bold text-slate-950">{reviewDueToday ? "Hôm nay" : getReviewDayLabel(system.reviewDay)}</p>
            <p className="mt-1 text-sm text-slate-600">{reviewStatusLabel}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="h-full border-0 gradient-indigo shadow-[0_30px_70px_-40px_rgba(99,102,241,0.22)]">
          <CardHeader>
            <CardTitle className="text-slate-950">Tuần này chỉ cần giữ 2 lớp việc</CardTitle>
            <CardDescription className="text-slate-700">
              {currentWeekRange ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}` : "Chu kỳ hiện tại"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] border border-white/70 bg-white/72 p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Ưu tiên tuần</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{currentPlanFocus}</p>
              {currentPlanMilestone && (
                <p className="mt-3 text-sm text-slate-600">Cột mốc đang nhắm tới: {currentPlanMilestone}</p>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Cốt lõi trước</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{coreIndicators.length} tactic giữ nhịp chính</p>
                  </div>
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">{coreIndicators.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {coreIndicators.map((indicator) => (
                    <div key={indicator.id || indicator.name} className="rounded-2xl border border-white/80 bg-white/92 px-4 py-3">
                      <p className="font-medium text-slate-900">{indicator.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {indicator.target || "1"} {indicator.unit || "lần/tuần"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-amber-700">Tùy chọn nếu còn sức</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {optionalIndicators.length > 0 ? `${optionalIndicators.length} tactic bổ sung` : "Không có tactic tùy chọn"}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-200 bg-white text-amber-800">
                    {optionalIndicators.length}
                  </Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {optionalIndicators.length === 0 ? (
                    <div className="rounded-2xl border border-white/80 bg-white/92 px-4 py-4 text-sm text-slate-500">
                      Tuần này bạn chỉ cần giữ các tactic cốt lõi là đủ.
                    </div>
                  ) : (
                    optionalIndicators.map((indicator) => (
                      <div key={indicator.id || indicator.name} className="rounded-2xl border border-white/80 bg-white/92 px-4 py-3">
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
          className="h-full border-0 gradient-purple shadow-[0_30px_70px_-40px_rgba(168,85,247,0.2)]"
        >
          <CardHeader>
            <CardTitle className="text-slate-950">Review tuần</CardTitle>
            <CardDescription className="text-slate-700">Chỉ 3 câu phản tư và 1 quyết định cho tuần sau.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`rounded-[24px] border p-4 ${reviewDueToday ? "border-amber-200 bg-amber-50/80" : "border-slate-200 bg-slate-50/88"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">
                    {reviewDueToday ? "Hôm nay là ngày chốt review tuần." : `Review chính thức vào ${getReviewDayLabel(system.reviewDay)}.`}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {reviewDueToday
                      ? "Chốt ngay hôm nay để tuần sau bắt đầu nhẹ đầu hơn."
                      : "Bạn vẫn có thể ghi trước phần phản tư để đến ngày review chỉ cần chốt lại."}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={reviewDueToday ? "border-amber-200 bg-white text-amber-800" : "border-slate-300 bg-white text-slate-700"}
                >
                  {reviewDueToday ? "Nên chốt hôm nay" : "Chưa đến hạn"}
                </Badge>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/70 bg-white/68 p-4">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Điểm tự động</span>
                <span className="font-semibold text-slate-700">{currentScoreValue}</span>
              </div>
              <Progress value={currentScoreValue} className="mt-3 h-2.5" />
              <p className="mt-3 text-sm text-slate-500">Chỉ số chính: {currentLagMetricValue || "Chưa cập nhật"}</p>
            </div>
            <div
              className={`rounded-[24px] border p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)] ${
                hasPremiumInsights
                  ? "border-sky-200 gradient-sky"
                  : "border-violet-200 gradient-violet"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Insight review premium
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
                    <div className="rounded-[20px] border border-white/70 bg-white/82 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Gợi ý chỉnh tải</p>
                      <p className="mt-2 text-sm leading-7 text-slate-800">{premiumInsight.recommendedAdjustment}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/70 bg-white/82 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Coach note</p>
                      <p className="mt-2 text-sm leading-7 text-slate-800">{premiumInsight.coachNote}</p>
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-sky-200 bg-white/88 p-4 shadow-[0_18px_40px_-34px_rgba(2,132,199,0.18)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Kế hoạch gợi ý cho tuần sau</p>
                        <p className="mt-2 text-base font-semibold leading-7 text-slate-950">
                          {suggestedNextWeekPlan.focus}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {suggestedNextWeekPlan.rationale}
                        </p>
                      </div>
                      <Badge className="bg-sky-700 text-white hover:bg-sky-700">
                        {getWorkloadDecisionLabel(suggestedNextWeekPlan.workloadDecision)}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[18px] border border-white/70 bg-slate-50/90 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Giữ chắc</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {suggestedNextWeekPlan.protectTactics.map((item) => (
                            <Badge key={item} variant="outline" className="border-slate-200 bg-white text-slate-700">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[18px] border border-white/70 bg-slate-50/90 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
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
                      <Button onClick={onApplySuggestedPlan}>Dùng gợi ý này cho tuần sau</Button>
                      <p className="text-sm text-slate-500">Bạn vẫn có thể sửa lại trước khi chốt review.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {/* Status indicator — always computed, shown as teaser */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-violet-100 bg-white/80 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          premiumInsight.status === "strong"
                            ? "bg-emerald-500"
                            : premiumInsight.status === "at_risk"
                              ? "bg-red-400"
                              : "bg-amber-400"
                        }`}
                      />
                      <span className="text-sm font-semibold text-slate-800">
                        Hệ thống đọc được nhịp tuần này
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        premiumInsight.status === "strong"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : premiumInsight.status === "at_risk"
                            ? "border-red-200 bg-red-50 text-red-800"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                      }
                    >
                      {premiumInsight.badgeLabel}
                    </Badge>
                  </div>
                  {/* Blurred content preview */}
                  <div className="relative overflow-hidden rounded-[18px] border border-violet-200 bg-white/80 p-4">
                    <div className="pointer-events-none select-none blur-[3px] opacity-60">
                      <p className="text-sm font-semibold text-slate-900">{premiumInsight.headline}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-2">{premiumInsight.summary}</p>
                      <p className="mt-2 text-xs text-slate-500">Gợi ý chỉnh tải: {premiumInsight.recommendedAdjustment}</p>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[18px] bg-white/50 backdrop-blur-[2px]">
                      <Crown className="h-5 w-5 text-violet-500" />
                      <p className="mt-1 text-xs font-semibold text-violet-700">Chỉ dành cho Plus</p>
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-violet-200/70 bg-white/82 p-4">
                    <p className="text-sm font-semibold text-slate-950">
                      Mở Plus để đọc phân tích đầy đủ và ra ngay kế hoạch tuần sau đủ gọn để làm.
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Plus chốt luôn ưu tiên tuần sau, mức tải nên giữ và phần nào nên buông bớt — không chỉ là insight để đọc.
                    </p>
                    <Button className="mt-4" onClick={onOpenPremiumInsights}>
                      Mở review Plus ngay
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-best">1. Điều gì chạy tốt nhất trong tuần này?</Label>
              <Textarea
                id="weekly-best"
                rows={3}
                value={weeklyForm.biggestOutputThisWeek}
                onChange={(event) => onWeeklyFormChange("biggestOutputThisWeek", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-obstacle">2. Điều gì cản trở nhịp của bạn?</Label>
              <Textarea
                id="weekly-obstacle"
                rows={3}
                value={weeklyForm.mainObstacle}
                onChange={(event) => onWeeklyFormChange("mainObstacle", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-priority">3. Một ưu tiên duy nhất cho tuần sau là gì?</Label>
              <Textarea
                id="weekly-priority"
                rows={3}
                value={weeklyForm.nextWeekPriority}
                placeholder={hasPremiumInsights ? suggestedNextWeekPlan.focus : "Ví dụ: chỉ giữ một ưu tiên thật rõ cho tuần sau."}
                onChange={(event) => onWeeklyFormChange("nextWeekPriority", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly-decision">Quyết định cho tuần sau</Label>
              <Select value={weeklyForm.workloadDecision} onValueChange={(value) => onWeeklyFormChange("workloadDecision", value)}>
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
            </div>
            <Button onClick={onSaveWeeklyReview}>Chốt review tuần này</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



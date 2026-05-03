import { ArrowDown, ArrowRight, ArrowUp, BarChart3, CalendarDays, Flag, Lock, Minus, Sparkles, Target, TrendingUp } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { formatCalendarDate, getReviewDayLabel } from "../../utils/storage";
import type { TwelveWeekSystem } from "../../utils/storage-types";
import type { HeatmapCell, TacticBreakdownItem, WeekTrendPoint } from "../../utils/twelve-week-system-ui";
import { interpretProgressTrend, type ProgressTrendInterpretation } from "@/features/plan12week/logic";
import type { ExecutionInsight } from "@/features/plan12week/logic";

import { TwelveWeekInsightsCard } from "./TwelveWeekInsightsCard";

interface WeekRange {
  start: string;
  end: string;
}

interface WeekCompletionSummary {
  completed: number;
  total: number;
  percent: number;
}

interface MilestoneItem {
  label: string;
  value: string;
}

interface TwelveWeekProgressTabProps {
  system: TwelveWeekSystem;
  currentWeek: number;
  currentWeekRange: WeekRange | null;
  currentWeekScoreValue: number;
  averageScore: number;
  reviewDoneCount: number;
  weekCompletion: WeekCompletionSummary;
  milestoneItems: MilestoneItem[];
  hasAdvancedAnalytics: boolean;
  executionHeatmap: HeatmapCell[];
  weeklyTrend: WeekTrendPoint[];
  tacticBreakdown: TacticBreakdownItem[];
  reviewDueToday?: boolean;
  onOpenTodayTab?: () => void;
  onOpenWeekTab?: () => void;
  onNavigateToSetup?: () => void;
  /**
   * Optional execution insights computed by `getExecutionInsights`. When
   * provided and non-empty, the Progress tab renders an insights card under
   * the trend hero. When omitted or empty, no card renders (backwards compat).
   */
  executionInsights?: ReadonlyArray<ExecutionInsight>;
}

function getNarrativeStyle(level: ProgressTrendInterpretation["level"]): {
  container: string;
  badge: string;
  badgeLabel: string;
} {
  switch (level) {
    case "on_track":
      return {
        container: "border-emerald-200 bg-emerald-50/82",
        badge: "border-emerald-300 bg-white text-emerald-800",
        badgeLabel: "Đang giữ nhịp",
      };
    case "early":
      return {
        container: "border-sky-200 bg-sky-50/82",
        badge: "border-sky-300 bg-white text-sky-800",
        badgeLabel: "Mới bắt đầu",
      };
    case "slowing":
      return {
        container: "border-amber-200 bg-amber-50/82",
        badge: "border-amber-300 bg-white text-amber-800",
        badgeLabel: "Cần chú ý",
      };
    case "at_risk":
      return {
        container: "border-rose-200 bg-rose-50/82",
        badge: "border-rose-300 bg-white text-rose-800",
        badgeLabel: "Cần cứu nhịp",
      };
    default:
      return {
        container: "border-slate-200 bg-slate-50",
        badge: "border-slate-300 bg-white text-slate-700",
        badgeLabel: "Chưa có dữ liệu",
      };
  }
}

function pickNextActionHandler(
  level: ProgressTrendInterpretation["level"],
  reviewDueToday: boolean,
  callbacks: { onOpenTodayTab?: () => void; onOpenWeekTab?: () => void; onNavigateToSetup?: () => void },
): (() => void) | undefined {
  if (level === "no_data") return callbacks.onNavigateToSetup;
  if (reviewDueToday) return callbacks.onOpenWeekTab;
  return callbacks.onOpenTodayTab;
}

export function TwelveWeekProgressTab({
  system,
  currentWeek,
  currentWeekRange,
  currentWeekScoreValue,
  averageScore,
  reviewDoneCount,
  weekCompletion,
  milestoneItems,
  hasAdvancedAnalytics,
  executionHeatmap,
  weeklyTrend,
  tacticBreakdown,
  reviewDueToday = false,
  onOpenTodayTab,
  onOpenWeekTab,
  onNavigateToSetup,
  executionInsights,
}: TwelveWeekProgressTabProps) {
  const previousWeekEntry = system.scoreboard.find((entry) => entry.weekNumber === currentWeek - 1);
  const previousWeekScore =
    previousWeekEntry && previousWeekEntry.weeklyScore > 0 ? previousWeekEntry.weeklyScore : null;
  const hasAnyTasks = system.scoreboard.some((entry) => entry.weeklyScore > 0) || system.taskInstances.length > 0;

  const trend = interpretProgressTrend({
    currentWeek,
    totalWeeks: system.totalWeeks,
    currentWeekScore: currentWeekScoreValue,
    previousWeekScore,
    averageScore,
    reviewDoneCount,
    reviewDueToday,
    hasAnyTasks,
  });
  const narrativeStyle = getNarrativeStyle(trend.level);
  const nextActionHandler = pickNextActionHandler(trend.level, reviewDueToday, {
    onOpenTodayTab,
    onOpenWeekTab,
    onNavigateToSetup,
  });
  const isEarlyState = trend.level === "early" || trend.level === "no_data";

  return (
    <div className="space-y-6 pt-4">
      <Card
        interactive={false}
        data-testid="progress-trend-hero"
        className={`border ${narrativeStyle.container}`}
      >
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Sparkles className="h-3.5 w-3.5" />
                Trạng thái nhịp tuần này
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950 sm:text-lg">{trend.headline}</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">{trend.advice}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {trend.weekOverWeekDelta !== null && (
                  <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
                    {trend.trendDirection === "up" ? (
                      <ArrowUp className="mr-1 h-3 w-3 text-emerald-600" />
                    ) : trend.trendDirection === "down" ? (
                      <ArrowDown className="mr-1 h-3 w-3 text-rose-600" />
                    ) : (
                      <Minus className="mr-1 h-3 w-3 text-slate-500" />
                    )}
                    {trend.weekOverWeekDelta > 0 ? "+" : ""}
                    {trend.weekOverWeekDelta} so với tuần trước
                  </Badge>
                )}
                <span className="text-xs text-slate-500">→ Tiếp theo: {trend.nextAction}</span>
              </div>
              {nextActionHandler && (
                <Button variant="outline" className="mt-4 bg-white sm:w-auto" onClick={nextActionHandler}>
                  {trend.level === "no_data"
                    ? "Mở Setup"
                    : reviewDueToday
                      ? "Mở tab Tuần"
                      : "Mở tab Hôm nay"}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${narrativeStyle.badge}`}
            >
              {narrativeStyle.badgeLabel}
            </span>
          </div>
        </CardContent>
      </Card>

      {executionInsights && executionInsights.length > 0 && (
        <TwelveWeekInsightsCard
          insights={executionInsights}
          onOpenToday={onOpenTodayTab}
          onOpenWeekReview={onOpenWeekTab}
          onReduceLoad={onOpenWeekTab}
          onTightenScope={onOpenWeekTab}
          onResetFocus={onOpenTodayTab}
          onCelebrate={onOpenTodayTab}
          onOpenSetup={onNavigateToSetup}
        />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          interactive={false}
          className="border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.32)]"
        >
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              Tuần đang chạy
            </p>
            <div className="mt-3">
              <p className="text-3xl font-bold text-slate-950">Tuần {currentWeek}</p>
              <p className="mt-1 text-sm text-slate-600">
                {currentWeekRange
                  ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                  : "Đang cập nhật phạm vi tuần"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          interactive={false}
          className="border border-sky-200/80 bg-sky-50/70 shadow-[0_18px_44px_-36px_rgba(37,99,235,0.28)]"
        >
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              <BarChart3 className="h-3.5 w-3.5" />
              Điểm hiện tại
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{currentWeekScoreValue}</p>
            <p className="mt-1 text-sm text-slate-600">Trung bình toàn chu kỳ: {averageScore}</p>
          </CardContent>
        </Card>

        <Card
          interactive={false}
          className="border border-emerald-200/80 bg-emerald-50/70 shadow-[0_18px_44px_-36px_rgba(5,150,105,0.24)]"
        >
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              <Flag className="h-3.5 w-3.5" />
              Review đã khóa
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-950">
              {isEarlyState ? `Tuần ${currentWeek}/${system.totalWeeks}` : `${reviewDoneCount}/${system.totalWeeks}`}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {isEarlyState
                ? "Hết tuần này thì có review đầu tiên — chưa cần gấp."
                : `${weekCompletion.completed}/${weekCompletion.total} việc tuần này đã xong`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card
          interactive={false}
          className="border border-slate-200/80 bg-white/92 shadow-[0_22px_54px_-40px_rgba(15,23,42,0.28)]"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-950">
              <BarChart3 className="h-5 w-5 text-sky-700" />
              Bảng điểm 12 tuần
            </CardTitle>
            <CardDescription className="text-slate-700">
              Mỗi tuần được chấm từ hành vi thật: mức hoàn thành việc cốt lõi, check-in, đúng lịch và review.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Tuần {currentWeek} đang là trọng tâm</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Ưu tiên giữ nhịp việc cốt lõi và chốt review vào {getReviewDayLabel(system.reviewDay)}.
                  </p>
                </div>
                <Badge className="bg-sky-700 text-white hover:bg-sky-700">{currentWeekScoreValue} điểm</Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {system.scoreboard.map((week) => {
                const isCurrentWeek = week.weekNumber === currentWeek;
                const isReviewed = week.reviewDone;

                return (
                  <div
                    key={week.weekNumber}
                    className={`rounded-lg border p-5 shadow-[0_18px_38px_-34px_rgba(15,23,42,0.28)] ${
                      isCurrentWeek
                        ? "border-slate-950 bg-slate-950 text-white"
                        : isReviewed
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                            isCurrentWeek ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          Tuần {week.weekNumber}
                        </p>
                        <p className={`mt-2 text-3xl font-bold ${isCurrentWeek ? "text-white" : "text-slate-950"}`}>
                          {week.weeklyScore}
                        </p>
                      </div>
                      <Badge
                        variant={isReviewed ? "default" : "outline"}
                        className={
                          isCurrentWeek
                            ? "border-white/20 bg-white/10 text-white hover:bg-white/10"
                            : isReviewed
                              ? "bg-emerald-600 text-white hover:bg-emerald-600"
                              : "border-slate-200 bg-white text-slate-600"
                        }
                      >
                        {isCurrentWeek ? "Đang chạy" : isReviewed ? "Đã review" : "Chưa review"}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <div
                          className={`flex items-center justify-between text-sm ${
                            isCurrentWeek ? "text-slate-300" : "text-slate-600"
                          }`}
                        >
                          <span>Hoàn thành cốt lõi</span>
                          <span className={`font-semibold ${isCurrentWeek ? "text-white" : "text-slate-900"}`}>
                            {week.leadCompletionPercent}%
                          </span>
                        </div>
                        <Progress
                          value={week.leadCompletionPercent}
                          className={`mt-2 h-2.5 ${isCurrentWeek ? "bg-white/18" : ""}`}
                        />
                      </div>

                      <div
                        className={`rounded-lg border px-4 py-3 ${
                          isCurrentWeek ? "border-white/10 bg-white/8" : "border-slate-200 bg-white"
                        }`}
                      >
                        <p
                          className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                            isCurrentWeek ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          Chỉ số chính
                        </p>
                        <p className={`mt-1 text-sm font-medium ${isCurrentWeek ? "text-white" : "text-slate-900"}`}>
                          {week.mainMetricProgress || "Chưa cập nhật"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card
          interactive={false}
          className="border border-slate-200/80 bg-slate-50/80 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.26)]"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-950">
              <Target className="h-5 w-5 text-indigo-600" />
              Cột mốc và đích đến
            </CardTitle>
            <CardDescription className="text-slate-700">
              Nhìn lại các mốc quan trọng của chu kỳ thay vì chỉ nhìn điểm số.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="space-y-5">
                {milestoneItems.map((item, index) => {
                  const isLastItem = index === milestoneItems.length - 1;

                  return (
                    <div key={item.label} className={`relative pl-12 ${isLastItem ? "" : "pb-5"}`}>
                      {!isLastItem && <div className="absolute left-[17px] top-9 h-full w-px bg-slate-300/70" />}
                      <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
                        {index + 1}
                      </div>
                      <p className="pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-800">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {hasAdvancedAnalytics ? (
        <div className="space-y-6">
          {executionHeatmap.length > 0 && (
            <Card
              interactive={false}
              className="border border-slate-200/80 bg-white/92 shadow-[0_22px_54px_-40px_rgba(15,23,42,0.28)]"
            >
              <CardHeader>
                <CardTitle className="text-slate-950">Bản đồ thực thi</CardTitle>
                <CardDescription className="text-slate-700">
                  Mỗi ô là một ngày. Màu càng đậm nghĩa là mức hoàn thành càng chắc.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[320px] space-y-2">
                    <div className="flex gap-1 pl-10">
                      {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
                        <div key={day} className="w-9 text-center text-[10px] font-medium text-slate-500">
                          {day}
                        </div>
                      ))}
                    </div>
                    {Array.from({ length: system.totalWeeks }, (_, index) => {
                      const weekNumber = index + 1;
                      const cells = executionHeatmap.filter((cell) => cell.weekNumber === weekNumber);

                      return (
                        <div key={weekNumber} className="flex items-center gap-1">
                          <span className="w-8 text-right text-[10px] font-medium text-slate-500">T{weekNumber}</span>
                          {cells.map((cell) => {
                            const cellClass =
                              cell.total === 0
                                ? "bg-slate-100"
                                : cell.percent >= 80
                                  ? "bg-emerald-500"
                                  : cell.percent >= 50
                                    ? "bg-emerald-300"
                                    : cell.percent > 0
                                      ? "bg-amber-300"
                                      : "bg-rose-300";

                            return (
                              <div
                                key={cell.dateKey}
                                className={`h-9 w-9 rounded-lg ${cellClass} ${
                                  weekNumber === currentWeek ? "ring-2 ring-sky-300" : ""
                                }`}
                                title={`${cell.dateKey}: ${cell.completed}/${cell.total} xong`}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded bg-emerald-500" /> &gt;=80%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded bg-emerald-300" /> 50-79%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded bg-amber-300" /> 1-49%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded bg-rose-300" /> 0%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded bg-slate-100 ring-1 ring-slate-200" /> Trống
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {weeklyTrend.length > 0 && (
            <Card
              interactive={false}
              className="border border-sky-200/80 bg-sky-50/70 shadow-[0_18px_44px_-36px_rgba(37,99,235,0.28)]"
            >
              <CardHeader>
                <CardTitle className="text-slate-950">Xu hướng thực thi theo tuần</CardTitle>
                <CardDescription className="text-slate-600">
                  So sánh mức hoàn thành việc cốt lõi, việc tùy chọn và điểm qua các tuần.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weeklyTrend.map((point) => {
                    const isCurrent = point.weekNumber === currentWeek;

                    return (
                      <div
                        key={point.weekNumber}
                        className={`rounded-lg border p-4 ${
                          isCurrent
                            ? "border-sky-300 bg-white shadow-[0_8px_25px_-12px_rgba(37,99,235,0.25)]"
                            : "border-slate-200 bg-white/80"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-semibold ${isCurrent ? "text-sky-700" : "text-slate-700"}`}>
                              Tuần {point.weekNumber}
                            </span>
                            {isCurrent && (
                              <Badge className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50">Đang chạy</Badge>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{point.score} điểm</span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div>
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>Cốt lõi</span>
                              <span className="font-semibold text-slate-900">{point.corePercent}%</span>
                            </div>
                            <Progress value={point.corePercent} className="mt-1 h-2" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>Tùy chọn</span>
                              <span className="font-semibold text-slate-900">{point.optionalPercent}%</span>
                            </div>
                            <Progress value={point.optionalPercent} className="mt-1 h-2" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {tacticBreakdown.length > 0 && (
            <Card
              interactive={false}
              className="border border-emerald-200/80 bg-emerald-50/70 shadow-[0_18px_44px_-36px_rgba(5,150,105,0.24)]"
            >
              <CardHeader>
                <CardTitle className="text-slate-950">Phân tích theo việc giữ nhịp</CardTitle>
                <CardDescription className="text-slate-600">
                  Chi tiết hoàn thành và xu hướng từng việc giữ nhịp đến tuần {currentWeek}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {tacticBreakdown.map((item) => (
                  <div
                    key={item.tacticId}
                    className="flex items-center gap-4 rounded-lg border border-emerald-100 bg-white px-4 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 break-words text-sm font-semibold text-slate-950">{item.tacticName}</p>
                        <Badge
                          variant="outline"
                          className={
                            item.type === "core"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }
                        >
                          {item.type === "core" ? "Cốt lõi" : "Tùy chọn"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={item.percent} className="h-2 flex-1" />
                        <span className="text-sm font-semibold text-slate-800">{item.percent}%</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.completedTasks}/{item.totalTasks} lần hoàn thành
                      </p>
                    </div>
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        item.trend === "up"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.trend === "down"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.trend === "up" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : item.trend === "down" ? (
                        <ArrowDown className="h-4 w-4" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card
          interactive={false}
          className="border border-violet-200/70 bg-violet-50 shadow-[0_18px_44px_-36px_rgba(124,58,237,0.24)]"
        >
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-950">Phân tích thực thi nâng cao</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-600">
                Bản đồ nhiệt hoàn thành, xu hướng theo tuần và phân tích từng việc giữ nhịp giúp bạn biết chỗ nào đang
                mạnh, chỗ nào cần cứu trước.
              </p>
            </div>
            <Badge className="border-violet-200 bg-white text-violet-700 hover:bg-white">
              <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
              Tính năng Plus
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

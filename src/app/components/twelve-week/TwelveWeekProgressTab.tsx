import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  CalendarDays,
  CircleHelp,
  Flag,
  Lock,
  Minus,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { WeeklyReviewIllustration } from "../illustrations";
import { PrimaryActionCard } from "../layout/PrimaryActionCard";
import { SectionBlock } from "../layout/SectionBlock";
import { formatCalendarDate, getReviewDayLabel } from "../../utils/storage";
import type { TwelveWeekSystem } from "../../utils/storage-types";
import type { HeatmapCell, TacticBreakdownItem, WeekTrendPoint } from "../../utils/twelve-week-system-ui";
import { interpretProgressTrend, type ProgressTrendInterpretation } from "@/features/plan12week/logic";
import type { ExecutionInsight } from "@/features/plan12week/logic";

import { TwelveWeekInsightsCard } from "./TwelveWeekInsightsCard";

const WEEKLY_EXECUTION_TARGET_TOOLTIP =
  "Theo phương pháp 12 Week Year, đạt 85% cam kết hàng tuần là chỉ số dẫn dắt mạnh nhất tới mục tiêu";

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
  onOpenSettingsTab?: () => void;
  onOpenCycleReview?: () => void;
  onNavigateToSetup?: () => void;
  /**
   * Optional execution insights computed by `getExecutionInsights`. When
   * provided and non-empty, the Progress tab renders an insights card under
   * the trend hero. When omitted or empty, no card renders (backwards compat).
   */
  executionInsights?: ReadonlyArray<ExecutionInsight>;
}

export type ProgressNextActionTarget = "cycle_review" | "today" | "week" | "settings";

export interface ProgressNextActionSuggestionInput {
  currentWeek: number;
  totalWeeks: number;
  hasOpenTasksThisWeek: boolean;
  reviewDueToday: boolean;
  hasReviewedCurrentWeek: boolean;
  hasAnyTasks: boolean;
}

export interface ProgressNextActionSuggestion {
  target: ProgressNextActionTarget;
  label: string;
  buttonLabel: string;
}

export function getProgressNextActionSuggestion(
  input: ProgressNextActionSuggestionInput,
): ProgressNextActionSuggestion {
  if (input.currentWeek > input.totalWeeks) {
    return {
      target: "cycle_review",
      label: "Mở Cycle Review",
      buttonLabel: "Mở Cycle Review",
    };
  }

  if (input.hasOpenTasksThisWeek) {
    return {
      target: "today",
      label: "Hoàn thành việc cốt lõi hôm nay",
      buttonLabel: "Mở tab Hôm nay",
    };
  }

  if (input.reviewDueToday && !input.hasReviewedCurrentWeek) {
    return {
      target: "week",
      label: "Mở review tuần",
      buttonLabel: "Mở tab Tuần",
    };
  }

  if (input.hasReviewedCurrentWeek) {
    return {
      target: "week",
      label: "Chuẩn bị tuần sau",
      buttonLabel: "Mở tab Tuần",
    };
  }

  return {
    target: "settings",
    label: input.hasAnyTasks ? "Hoàn thành việc cốt lõi hôm nay" : "Hoàn tất setup trong Cài đặt",
    buttonLabel: input.hasAnyTasks ? "Mở tab Hôm nay" : "Mở Cài đặt",
  };
}

function getNarrativeStyle(level: ProgressTrendInterpretation["level"]): {
  container: string;
  badge: string;
  badgeLabel: string;
} {
  switch (level) {
    case "on_track":
      return {
        container: "border-app-line bg-app-surface",
        badge: "border-app-accent/20 bg-app-accent-soft text-app-accent",
        badgeLabel: "Đang đúng nhịp",
      };
    case "early":
      return {
        container: "border-app-line bg-app-surface",
        badge: "border-app-accent/20 bg-app-accent-soft text-app-accent",
        badgeLabel: "Mới bắt đầu",
      };
    case "slowing":
      return {
        container: "border-app-line bg-app-surface",
        badge: "border-app-warm/30 bg-app-warm-soft text-app-warm",
        badgeLabel: "Cần chú ý",
      };
    case "at_risk":
      return {
        container: "border-app-line bg-app-surface",
        badge: "border-app-warm/30 bg-app-warm-soft text-app-warm",
        badgeLabel: "Cần quay lại nhịp",
      };
    default:
      return {
        container: "border-app-line bg-app-surface",
        badge: "border-app-line bg-app-bg text-app-ink-soft",
        badgeLabel: "Chưa có dữ liệu",
      };
  }
}

function pickNextActionHandler(
  suggestion: ProgressNextActionSuggestion,
  callbacks: {
    onOpenTodayTab?: () => void;
    onOpenWeekTab?: () => void;
    onOpenSettingsTab?: () => void;
    onOpenCycleReview?: () => void;
    onNavigateToSetup?: () => void;
  },
): (() => void) | undefined {
  if (suggestion.target === "cycle_review") return callbacks.onOpenCycleReview ?? callbacks.onOpenWeekTab;
  if (suggestion.target === "week") return callbacks.onOpenWeekTab;
  if (suggestion.target === "settings") return callbacks.onOpenSettingsTab ?? callbacks.onNavigateToSetup;
  return callbacks.onOpenTodayTab;
}

function getAverageLeadScore(system: TwelveWeekSystem): number {
  const reviewedWeeks = system.scoreboard.filter((week) => week.reviewDone);
  if (reviewedWeeks.length === 0) return 0;

  return Math.round(
    reviewedWeeks.reduce((sum, week) => sum + Math.max(0, Math.min(100, week.leadCompletionPercent)), 0) /
      reviewedWeeks.length,
  );
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
  onOpenSettingsTab,
  onOpenCycleReview,
  onNavigateToSetup,
  executionInsights,
}: TwelveWeekProgressTabProps) {
  const previousWeekEntry = system.scoreboard.find((entry) => entry.weekNumber === currentWeek - 1);
  const previousWeekScore =
    previousWeekEntry && previousWeekEntry.weeklyScore > 0 ? previousWeekEntry.weeklyScore : null;
  const hasAnyTasks = system.scoreboard.some((entry) => entry.weeklyScore > 0) || system.taskInstances.length > 0;
  const currentWeekScoreboardEntry = system.scoreboard.find((entry) => entry.weekNumber === currentWeek);
  const hasReviewedCurrentWeek =
    currentWeekScoreboardEntry?.reviewDone ||
    Boolean(system.weeklyReviews.find((review) => review.weekNumber === currentWeek)?.reviewCompleted);
  const nextActionSuggestion = getProgressNextActionSuggestion({
    currentWeek,
    totalWeeks: system.totalWeeks,
    hasOpenTasksThisWeek: weekCompletion.total > 0 && weekCompletion.completed < weekCompletion.total,
    reviewDueToday,
    hasReviewedCurrentWeek,
    hasAnyTasks,
  });

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
  const nextActionHandler = pickNextActionHandler(nextActionSuggestion, {
    onOpenTodayTab,
    onOpenWeekTab,
    onOpenSettingsTab,
    onOpenCycleReview,
    onNavigateToSetup,
  });
  const isEarlyState = trend.level === "early" || trend.level === "no_data";
  const averageLeadScore = getAverageLeadScore(system);

  return (
    <div className="stack-section pt-4">
      <PrimaryActionCard
        data-testid="progress-trend-hero"
        hero
        tone="primary"
        eyebrow="Trạng thái nhịp tuần này"
        icon={<Sparkles className="h-3.5 w-3.5" />}
        title={trend.headline}
        description={trend.advice}
        titleClassName="font-serif text-xl font-medium text-app-ink sm:text-2xl"
        descriptionClassName="text-[14px] leading-6 text-app-ink-soft"
        contentClassName="stack-stack"
        action={
          nextActionHandler ? (
            <div className="rounded-lg border border-app-line bg-app-bg p-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                Tiếp theo nên làm
              </p>
              <p className="mt-1 text-[14px] leading-6 text-app-ink">{nextActionSuggestion.label}</p>
              <Button
                size="lg"
                className="mt-3 w-full bg-app-accent text-white hover:bg-app-accent/90 sm:w-auto"
                onClick={nextActionHandler}
              >
                {nextActionSuggestion.buttonLabel}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          ) : null
        }
      >
        <div className="pointer-events-none hidden justify-end sm:flex">
          <WeeklyReviewIllustration className="-my-6 w-36 text-app-accent opacity-60" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${narrativeStyle.badge}`}
          >
            {narrativeStyle.badgeLabel}
          </span>
          {trend.weekOverWeekDelta !== null && (
            <Badge variant="outline" className="border-app-line bg-app-bg text-app-ink-soft">
              {trend.trendDirection === "up" ? (
                <ArrowUp className="mr-1 h-3 w-3 text-app-accent" />
              ) : trend.trendDirection === "down" ? (
                <ArrowDown className="mr-1 h-3 w-3 text-app-warm" />
              ) : (
                <Minus className="mr-1 h-3 w-3 text-app-ink-muted" />
              )}
              {trend.weekOverWeekDelta > 0 ? "+" : ""}
              {trend.weekOverWeekDelta} so với tuần trước
            </Badge>
          )}
        </div>
      </PrimaryActionCard>

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

      <SectionBlock title="Tổng quan hiệu suất" eyebrow="Performance" collapsible defaultOpen={true}>
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="border border-app-line bg-app-surface">
            <CardContent className="p-5">
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                <CalendarDays className="h-3.5 w-3.5" />
                Tuần đang chạy
              </p>
              <div className="mt-3">
                <p className="font-serif text-2xl font-medium text-app-ink">Tuần {currentWeek}</p>
                <p className="mt-1 text-[14px] text-app-ink-muted">
                  {currentWeekRange
                    ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                    : "Đang cập nhật phạm vi tuần"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-app-line bg-app-surface">
            <CardContent className="p-5">
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                <BarChart3 className="h-3.5 w-3.5 text-app-accent" />
                Tiến độ việc lặp lại
              </p>
              <div className="mt-3 flex items-start justify-between gap-3">
                <p className="font-serif text-2xl font-medium text-app-ink">
                  Việc lặp lại trung bình {averageLeadScore}%
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface text-app-accent"
                      aria-label="Tại sao 85%?"
                    >
                      <CircleHelp className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={8}>{WEEKLY_EXECUTION_TARGET_TOOLTIP}</TooltipContent>
                </Tooltip>
              </div>
              <p className="mt-1 text-[14px] text-app-ink-muted">
                Tuần hiện tại: {currentWeekScoreValue}% việc lặp lại. Điểm hệ cũ: {averageScore}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-app-line bg-app-surface">
            <CardContent className="p-5">
              {reviewDoneCount === 0 && <WeeklyReviewIllustration className="mb-3 w-24 text-app-accent opacity-65" />}
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                <Flag className="h-3.5 w-3.5 text-app-accent" />
                Tuần đã hoàn thành
              </p>
              <p className="mt-3 font-serif text-2xl font-medium text-app-ink">
                Đã hoàn thành {reviewDoneCount}/{system.totalWeeks} tuần
              </p>
              <p className="mt-1 text-[14px] text-app-ink-muted">
                {isEarlyState
                  ? "Hết tuần này thì có review đầu tiên — chưa cần gấp."
                  : `${weekCompletion.completed}/${weekCompletion.total} việc tuần này đã xong`}
              </p>
            </CardContent>
          </Card>
        </div>
      </SectionBlock>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border border-app-line bg-app-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-app-ink">
              <BarChart3 className="h-5 w-5 text-app-accent" />
              Bảng điểm 12 tuần
            </CardTitle>
            <CardDescription className="text-app-ink-soft">
              Mỗi tuần được chấm từ hành vi thật: mức hoàn thành việc cốt lõi, check-in, đúng lịch và review.
            </CardDescription>
          </CardHeader>
          <CardContent className="stack-stack">
            <div className="rounded-lg border border-app-accent/20 bg-app-accent-soft p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-app-ink">Tuần {currentWeek} đang là trọng tâm</p>
                  <p className="mt-1 text-[14px] text-app-ink-soft">
                    Ưu tiên duy trì việc cốt lõi và chốt review vào {getReviewDayLabel(system.reviewDay)}.
                  </p>
                </div>
                <Badge className="bg-app-accent text-white hover:bg-app-accent">{currentWeekScoreValue} điểm</Badge>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {system.scoreboard.map((week) => {
                const isCurrentWeek = week.weekNumber === currentWeek;
                const isReviewed = week.reviewDone;

                return (
                  <div
                    key={week.weekNumber}
                    className={`rounded-card border bg-app-surface p-4 ${
                      isCurrentWeek ? "border-app-ink" : isReviewed ? "border-app-accent/30" : "border-app-line"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`text-[12px] font-semibold uppercase tracking-[0.16em] ${
                            isCurrentWeek ? "text-app-ink" : "text-app-ink-muted"
                          }`}
                        >
                          Tuần {week.weekNumber}
                        </p>
                        <p className="mt-2 font-serif text-2xl font-medium text-app-ink">{week.weeklyScore}</p>
                      </div>
                      <Badge
                        variant={isReviewed ? "default" : "outline"}
                        className={
                          isCurrentWeek
                            ? "border-app-ink bg-app-ink text-white hover:bg-app-ink"
                            : isReviewed
                              ? "bg-app-accent text-white hover:bg-app-accent"
                              : "border-app-line bg-app-bg text-app-ink-muted"
                        }
                      >
                        {isCurrentWeek ? "Đang chạy" : isReviewed ? "Đã review" : "Chưa review"}
                      </Badge>
                    </div>

                    <div className="mt-4 stack-tight">
                      <div>
                        <div className="flex items-center justify-between text-[14px] text-app-ink-soft">
                          <span>Hoàn thành cốt lõi</span>
                          <span className="font-semibold text-app-ink">{week.leadCompletionPercent}%</span>
                        </div>
                        <Progress value={week.leadCompletionPercent} className="mt-2 h-2.5" />
                      </div>

                      <div className="rounded-lg border border-app-line bg-app-bg px-4 py-3">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                          Chỉ số chính
                        </p>
                        <p className="mt-1 text-[14px] font-medium text-app-ink">
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

        <Card className="border border-app-line bg-app-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-app-ink">
              <Target className="h-5 w-5 text-app-accent" />
              Cột mốc và đích đến
            </CardTitle>
            <CardDescription className="text-app-ink-soft">
              Nhìn lại các mốc quan trọng của chu kỳ thay vì chỉ nhìn điểm số.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-app-line bg-app-bg p-5">
              <div className="stack-stack">
                {milestoneItems.map((item, index) => {
                  const isLastItem = index === milestoneItems.length - 1;

                  return (
                    <div key={item.label} className={`relative pl-12 ${isLastItem ? "" : "pb-5"}`}>
                      {!isLastItem && <div className="absolute left-[17px] top-9 h-full w-px bg-app-line" />}
                      <div className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-lg bg-app-ink text-sm font-semibold text-white">
                        {index + 1}
                      </div>
                      <p className="pt-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                        {item.label}
                      </p>
                      <p className="mt-2 text-[14px] leading-7 text-app-ink-soft">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {hasAdvancedAnalytics ? (
        <div className="stack-section">
          {executionHeatmap.length > 0 && (
            <Card className="border border-app-line bg-app-surface">
              <CardHeader>
                <CardTitle className="text-app-ink">Bản đồ thực thi</CardTitle>
                <CardDescription className="text-app-ink-soft">
                  Mỗi ô là một ngày. Màu càng đậm nghĩa là mức hoàn thành càng chắc.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[320px] stack-tight">
                    <div className="flex gap-1 pl-10">
                      {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
                        <div key={day} className="w-9 text-center text-[12px] font-medium text-app-ink-muted">
                          {day}
                        </div>
                      ))}
                    </div>
                    {Array.from({ length: system.totalWeeks }, (_, index) => {
                      const weekNumber = index + 1;
                      const cells = executionHeatmap.filter((cell) => cell.weekNumber === weekNumber);

                      return (
                        <div key={weekNumber} className="flex items-center gap-1">
                          <span className="w-8 text-right text-[12px] font-medium text-app-ink-muted">
                            T{weekNumber}
                          </span>
                          {cells.map((cell) => {
                            const cellClass =
                              cell.total === 0
                                ? "bg-app-bg"
                                : cell.percent >= 80
                                  ? "bg-app-accent"
                                  : cell.percent >= 50
                                    ? "bg-app-accent/60"
                                    : cell.percent > 0
                                      ? "bg-app-warm/70"
                                      : "bg-app-warm";

                            return (
                              <div
                                key={cell.dateKey}
                                className={`h-9 w-9 rounded-lg ${cellClass} ${
                                  weekNumber === currentWeek ? "ring-2 ring-app-ink" : ""
                                }`}
                                title={`${cell.dateKey}: ${cell.completed}/${cell.total} xong`}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-app-ink-muted">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded bg-app-accent" /> &gt;=80%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded bg-app-accent/60" /> 50-79%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded bg-app-warm/70" /> 1-49%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded bg-app-warm" /> 0%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded border border-app-line bg-app-bg" /> Trống
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {weeklyTrend.length > 0 && (
            <Card className="border border-app-line bg-app-surface">
              <CardHeader>
                <CardTitle className="text-app-ink">Xu hướng thực thi theo tuần</CardTitle>
                <CardDescription className="text-app-ink-soft">
                  So sánh mức hoàn thành việc cốt lõi, việc tùy chọn và điểm qua các tuần.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="stack-tight">
                  {weeklyTrend.map((point) => {
                    const isCurrent = point.weekNumber === currentWeek;

                    return (
                      <div
                        key={point.weekNumber}
                        className={`rounded-lg border p-4 ${
                          isCurrent ? "border-app-ink bg-app-surface" : "border-app-line bg-app-bg"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[14px] font-semibold ${isCurrent ? "text-app-ink" : "text-app-ink-soft"}`}
                            >
                              Tuần {point.weekNumber}
                            </span>
                            {isCurrent && (
                              <Badge className="border-app-accent/20 bg-app-accent-soft text-app-accent hover:bg-app-accent-soft">
                                Đang chạy
                              </Badge>
                            )}
                          </div>
                          <span className="text-[14px] font-semibold text-app-ink">{point.score} điểm</span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div>
                            <div className="flex items-center justify-between text-xs text-app-ink-soft">
                              <span>Cốt lõi</span>
                              <span className="font-semibold text-app-ink">{point.corePercent}%</span>
                            </div>
                            <Progress value={point.corePercent} className="mt-1 h-2" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs text-app-ink-soft">
                              <span>Tùy chọn</span>
                              <span className="font-semibold text-app-ink">{point.optionalPercent}%</span>
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
            <Card className="border border-app-line bg-app-surface">
              <CardHeader>
                <CardTitle className="text-app-ink">Phân tích theo việc lặp lại</CardTitle>
                <CardDescription className="text-app-ink-soft">
                  Chi tiết hoàn thành và xu hướng từng việc lặp lại đến tuần {currentWeek}.
                </CardDescription>
              </CardHeader>
              <CardContent className="stack-tight">
                {tacticBreakdown.map((item) => (
                  <div
                    key={item.tacticId}
                    className="flex items-center gap-4 rounded-lg border border-app-line bg-app-bg px-4 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 break-words text-[14px] font-semibold text-app-ink">{item.tacticName}</p>
                        <Badge
                          variant="outline"
                          className={
                            item.type === "core"
                              ? "border-app-accent/20 bg-app-accent-soft text-app-accent"
                              : "border-app-line bg-app-surface text-app-ink-muted"
                          }
                        >
                          {item.type === "core" ? "Cốt lõi" : "Tùy chọn"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={item.percent} className="h-2 flex-1" />
                        <span className="text-[14px] font-semibold text-app-ink">{item.percent}%</span>
                      </div>
                      <p className="mt-1 text-xs text-app-ink-muted">
                        {item.completedTasks}/{item.totalTasks} lần hoàn thành
                      </p>
                    </div>
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        item.trend === "up"
                          ? "bg-app-accent-soft text-app-accent"
                          : item.trend === "down"
                            ? "bg-app-warm-soft text-app-warm"
                            : "bg-app-bg text-app-ink-muted"
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
        <Card className="border border-app-line bg-app-surface">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <p className="font-serif text-lg font-medium text-app-ink">Phân tích thực thi nâng cao</p>
              <p className="mx-auto mt-2 max-w-md text-[14px] leading-7 text-app-ink-soft">
                Bản đồ nhiệt hoàn thành, xu hướng theo tuần và phân tích từng việc lặp lại giúp bạn biết chỗ nào đang
                mạnh, chỗ nào cần chú ý trước.
              </p>
            </div>
            <Badge className="border-app-accent/20 bg-app-accent-soft text-app-accent hover:bg-app-accent-soft">
              <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
              Tính năng Plus
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

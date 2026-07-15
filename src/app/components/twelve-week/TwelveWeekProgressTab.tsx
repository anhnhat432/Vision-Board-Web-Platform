import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  ChevronDown,
  CircleHelp,
  Lock,
  Minus,
  Target,
  TrendingUp,
} from "lucide-react";
import type { ExecutionInsight } from "@/features/plan12week/logic";
import { interpretProgressTrend } from "@/features/plan12week/logic";
import { formatCalendarDate, getReviewDayLabel } from "../../utils/storage";
import type { TwelveWeekSystem } from "../../utils/storage-types";
import type { HeatmapCell, TacticBreakdownItem, WeekTrendPoint } from "../../utils/twelve-week-system-ui";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Progress } from "../ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { buildCycleRailWeeks, TwelveWeekCycleRail } from "./TwelveWeekCycleRail";
import { TwelveWeekInsightsCard } from "./TwelveWeekInsightsCard";
import { ZenJourneyMap } from "./ZenJourneyMap";

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
  goalTitle?: string;
  reviewDueToday?: boolean;
  onRenameGoal?: (title: string) => void | Promise<void>;
  onOpenTodayTab?: () => void;
  onOpenWeekTab?: () => void;
  onOpenSettingsTab?: () => void;
  onOpenCycleReview?: () => void;
  onNavigateToSetup?: () => void;
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
      buttonLabel: "Quay lại hôm nay",
    };
  }

  if (input.reviewDueToday && !input.hasReviewedCurrentWeek) {
    return {
      target: "week",
      label: "Mở review tuần",
      buttonLabel: "Review tuần này",
    };
  }

  if (input.hasReviewedCurrentWeek) {
    return {
      target: "week",
      label: "Chuẩn bị tuần sau",
      buttonLabel: "Review tuần này",
    };
  }

  return {
    target: "settings",
    label: input.hasAnyTasks ? "Hoàn thành việc cốt lõi hôm nay" : "Hoàn tất setup trong Cài đặt",
    buttonLabel: input.hasAnyTasks ? "Quay lại hôm nay" : "Mở Cài đặt",
  };
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

function ProgressMetric({
  label,
  value,
  valueSuffix,
  detail,
  action,
}: {
  label: string;
  value: string;
  valueSuffix?: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <article
      data-testid="progress-primary-metric"
      className="relative min-w-0 rounded-control border border-app-line bg-app-surface p-4"
    >
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-app-ink-muted">{label}</p>
      <div className="mt-3 flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 font-serif text-2xl font-bold text-app-ink tabular-nums">
          {value}{" "}
          {valueSuffix ? (
            <span className="font-sans text-xs font-normal text-app-ink-soft">{valueSuffix}</span>
          ) : null}
        </p>
        {action}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-app-ink-soft">{detail}</p>
    </article>
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
  const nextActionHandler = pickNextActionHandler(nextActionSuggestion, {
    onOpenTodayTab,
    onOpenWeekTab,
    onOpenSettingsTab,
    onOpenCycleReview,
    onNavigateToSetup,
  });
  const averageLeadScore = getAverageLeadScore(system);
  const cycleRailWeeks = buildCycleRailWeeks({
    totalWeeks: system.totalWeeks,
    currentWeek,
    reviewedWeeks: system.weeklyReviews
      .filter((review) => review.reviewCompleted)
      .map((review) => review.weekNumber),
    scoreByWeek: Object.fromEntries(
      system.scoreboard.map((week) => [week.weekNumber, week.leadCompletionPercent]),
    ),
    checkpoints: [4, 8, 12].filter((weekNumber) => weekNumber <= system.totalWeeks),
  });

  return (
    <div className="min-w-0 space-y-5 pt-1">
      <section
        className={`grid min-w-0 gap-4 rounded-card border border-app-line bg-app-surface p-5 shadow-app-sm sm:p-6 ${
          nextActionHandler ? "md:grid-cols-[minmax(0,1fr)_280px] md:items-end" : ""
        }`}
      >
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-app-accent">Trạng thái nhịp tuần này</p>
          <h2 className="mt-2 max-w-[24ch] font-serif text-2xl font-bold leading-tight text-app-ink sm:text-3xl">
            {trend.headline}
          </h2>
          <p className="mt-2 max-w-[65ch] text-[15px] leading-relaxed text-app-ink-soft">{trend.advice}</p>
        </div>

        {nextActionHandler ? (
          <div className="rounded-control bg-app-bg-subtle p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-app-ink-muted">Tiếp theo nên làm</p>
            <p className="mt-2 text-[15px] font-semibold text-app-ink">{nextActionSuggestion.label}</p>
            <Button
              onClick={nextActionHandler}
              className="mt-3 min-h-11 w-full bg-app-accent text-white hover:bg-app-accent-hover"
            >
              {nextActionSuggestion.buttonLabel}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </section>

      {executionInsights && executionInsights.length > 0 ? (
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
      ) : null}

      <section aria-label="Ba chỉ số chính" className="grid gap-3 sm:grid-cols-3">
        <ProgressMetric
          label="Tuần đang chạy"
          value={`Tuần ${currentWeek}`}
          detail={
            currentWeekRange
              ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
              : "Đang cập nhật phạm vi tuần"
          }
        />
        <ProgressMetric
          label="Chỉ số cam kết"
          value={`${averageLeadScore}%`}
          valueSuffix="trung bình"
          detail={`Tuần này ${currentWeekScoreValue}% · Trung bình chu kỳ ${averageScore}%`}
          action={
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface text-app-accent transition-colors hover:bg-app-accent-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface sm:h-8 sm:w-8"
                  aria-label="Tại sao 85%?"
                >
                  <CircleHelp className="h-4 w-4" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent sideOffset={8}>{WEEKLY_EXECUTION_TARGET_TOOLTIP}</TooltipContent>
            </Tooltip>
          }
        />
        <ProgressMetric
          label="Review đã khóa"
          value={`${reviewDoneCount}/${system.totalWeeks}`}
          valueSuffix="tuần"
          detail={`${weekCompletion.completed}/${weekCompletion.total} việc tuần này đã xong`}
        />
      </section>

      <TwelveWeekCycleRail weeks={cycleRailWeeks} label="Đường chạy 12 tuần" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-card border border-app-line/60 bg-app-surface shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-serif text-lg font-bold leading-tight text-app-ink">
              <BarChart3 className="h-5 w-5 text-app-accent" aria-hidden="true" />
              Bảng điểm 12 tuần
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed text-app-ink-soft">
              Mỗi tuần được chấm từ hành vi thật: mức hoàn thành việc cốt lõi, check-in, đúng lịch và review.
            </CardDescription>
          </CardHeader>
          <CardContent className="stack-stack">
            <div className="rounded-control border border-app-accent/15 bg-app-accent-soft/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-app-ink">Tuần {currentWeek} đang là trọng tâm</p>
                  <p className="text-xs leading-relaxed text-app-ink-soft">
                    Duy trì việc cốt lõi và chốt review vào {getReviewDayLabel(system.reviewDay)}.
                  </p>
                </div>
                <Badge className="rounded-control bg-app-accent px-2.5 py-1 text-xs font-bold text-white hover:bg-app-accent">
                  <span className="font-mono">{currentWeekScoreValue}</span> điểm
                </Badge>
              </div>
            </div>
            <ZenJourneyMap scoreboard={system.scoreboard} currentWeek={currentWeek} />
          </CardContent>
        </Card>

        <Card className="rounded-card border border-app-line/60 bg-app-surface shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-serif text-lg font-bold leading-tight text-app-ink">
              <Target className="h-5 w-5 text-app-accent" aria-hidden="true" />
              Cột mốc và đích đến
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed text-app-ink-soft">
              Nhìn lại các mốc quan trọng của chu kỳ thay vì chỉ nhìn điểm số.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-app-line rounded-control border border-app-line">
              {milestoneItems.map((item, index) => (
                <div key={item.label} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 p-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-app-accent-soft font-mono text-xs font-bold text-app-accent">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-app-accent">{item.label}</p>
                    <p className="mt-1 break-words text-sm leading-relaxed text-app-ink">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="min-h-11 w-full justify-between">
            {advancedOpen ? "Đóng phân tích nâng cao" : "Mở phân tích nâng cao"}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${
                advancedOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-5">
          {hasAdvancedAnalytics ? (
            <>
              {executionHeatmap.length > 0 ? (
                <Card className="rounded-card border border-app-line/60 bg-app-surface shadow-xs">
                  <CardHeader className="pb-4">
                    <CardTitle className="font-serif text-lg font-bold leading-tight text-app-ink">
                      Bản đồ thực thi
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-app-ink-soft">
                      Mỗi ô là một ngày. Màu dịu, càng đậm nghĩa là mức hoàn thành càng chắc.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <div className="min-w-[320px] stack-tight">
                        <div className="flex gap-1 pl-10">
                          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
                            <div
                              key={day}
                              className="w-11 text-center text-[10px] font-bold uppercase tracking-wider text-app-ink-muted sm:w-9"
                            >
                              {day}
                            </div>
                          ))}
                        </div>
                        {Array.from({ length: system.totalWeeks }, (_, index) => {
                          const weekNumber = index + 1;
                          const cells = executionHeatmap.filter((cell) => cell.weekNumber === weekNumber);

                          return (
                            <div key={weekNumber} className="flex items-center gap-1">
                              <span className="w-11 pr-1 text-right text-[10px] font-bold text-app-ink-muted sm:mr-1.5 sm:w-8 sm:pr-0">
                                Tuần {weekNumber}
                              </span>
                              {cells.map((cell) => {
                                const cellClass =
                                  cell.total === 0
                                    ? "border border-app-line/10 bg-app-bg/50"
                                    : cell.percent >= 80
                                      ? "bg-app-accent/90"
                                      : cell.percent >= 50
                                        ? "bg-app-accent/60"
                                        : cell.percent > 0
                                          ? "bg-app-accent/30"
                                          : "bg-app-warm/40";

                                return (
                                  <Tooltip key={cell.dateKey}>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        aria-label={`${cell.dateKey}: hoàn thành ${cell.completed} trên ${cell.total} việc`}
                                        className={`h-11 w-11 rounded-[6px] transition-[transform,background-color,box-shadow] duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface motion-reduce:transition-none motion-reduce:hover:scale-100 sm:h-9 sm:w-9 ${cellClass} ${
                                          weekNumber === currentWeek
                                            ? "ring-2 ring-app-accent ring-offset-2 ring-offset-app-surface"
                                            : ""
                                        }`}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent sideOffset={8}>
                                      {cell.dateKey}: {cell.completed}/{cell.total} xong
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          );
                        })}
                        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-app-ink-soft">
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block h-3.5 w-3.5 rounded bg-app-accent/90" /> &gt;=80%
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block h-3.5 w-3.5 rounded bg-app-accent/60" /> 50-79%
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block h-3.5 w-3.5 rounded bg-app-accent/30" /> 1-49%
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block h-3.5 w-3.5 rounded bg-app-warm/40" /> 0%
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block h-3.5 w-3.5 rounded border border-app-line/20 bg-app-bg" /> Trống
                          </span>
                        </div>
                        <p className="mt-3.5 text-[11px] italic text-app-ink-muted">
                          * Chạm hoặc rê chuột lên từng ô để xem số việc đã hoàn thành.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {weeklyTrend.length > 0 ? (
                <Card className="rounded-card border border-app-line/60 bg-app-surface shadow-xs">
                  <CardHeader className="pb-4">
                    <CardTitle className="font-serif text-lg font-bold leading-tight text-app-ink">
                      Xu hướng thực thi theo tuần
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-app-ink-soft">
                      So sánh mức hoàn thành việc cốt lõi, việc tùy chọn và điểm qua các tuần.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="stack-tight">
                    {weeklyTrend.map((point) => {
                      const isCurrent = point.weekNumber === currentWeek;

                      return (
                        <div
                          key={point.weekNumber}
                          className={`rounded-control border p-4 transition-colors duration-200 ${
                            isCurrent
                              ? "border-app-accent/30 bg-app-accent-soft/30"
                              : "border-app-line/60 bg-app-bg/50 hover:bg-app-bg/80"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className={`text-sm font-bold ${isCurrent ? "text-app-ink" : "text-app-ink-soft"}`}>
                                Tuần {point.weekNumber}
                              </span>
                              {isCurrent ? (
                                <Badge className="rounded-control border-app-accent/20 bg-app-accent px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-app-accent">
                                  Đang chạy
                                </Badge>
                              ) : null}
                            </div>
                            <span className="text-sm font-bold text-app-accent">
                              <span className="font-mono">{point.score}</span> điểm
                            </span>
                          </div>
                          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                            <div>
                              <div className="flex items-center justify-between text-xs font-medium text-app-ink-soft">
                                <span>Cốt lõi</span>
                                <span className="font-mono font-semibold text-app-ink">{point.corePercent}%</span>
                              </div>
                              <Progress value={point.corePercent} className="mt-1.5 h-2 rounded-full" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-xs font-medium text-app-ink-soft">
                                <span>Tùy chọn</span>
                                <span className="font-mono font-semibold text-app-ink">{point.optionalPercent}%</span>
                              </div>
                              <Progress value={point.optionalPercent} className="mt-1.5 h-2 rounded-full" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ) : null}

              {tacticBreakdown.length > 0 ? (
                <Card className="rounded-card border border-app-line/60 bg-app-surface shadow-xs">
                  <CardHeader className="pb-4">
                    <CardTitle className="font-serif text-lg font-bold leading-tight text-app-ink">
                      Phân tích theo việc lặp lại
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-app-ink-soft">
                      Chi tiết hoàn thành và xu hướng từng việc lặp lại đến tuần {currentWeek}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="divide-y divide-app-line rounded-control border border-app-line p-0">
                    {tacticBreakdown.map((item) => (
                      <div key={item.tacticId} className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-app-bg/60">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="min-w-0 break-words text-sm font-bold text-app-ink">{item.tacticName}</p>
                            <Badge
                              variant="outline"
                              className={
                                item.type === "core"
                                  ? "border-app-accent/15 bg-app-accent-soft/80 text-[10px] font-semibold text-app-accent"
                                  : "border-app-line bg-app-surface text-[10px] font-medium text-app-ink-muted"
                              }
                            >
                              {item.type === "core" ? "Cốt lõi" : "Tùy chọn"}
                            </Badge>
                          </div>
                          <div className="mt-2.5 flex items-center gap-3">
                            <Progress value={item.percent} className="h-2 flex-1 rounded-full" />
                            <span className="font-mono text-sm font-bold text-app-ink">{item.percent}%</span>
                          </div>
                          <p className="mt-1.5 text-xs text-app-ink-muted">
                            {item.completedTasks}/{item.totalTasks} lần hoàn thành
                          </p>
                        </div>
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${
                            item.trend === "up"
                              ? "bg-app-accent-soft/60 text-app-accent"
                              : item.trend === "down"
                                ? "bg-app-warm-soft/60 text-app-warm-strong"
                                : "bg-app-bg text-app-ink-muted"
                          }`}
                        >
                          {item.trend === "up" ? (
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                          ) : item.trend === "down" ? (
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : (
            <Card className="rounded-card border border-app-warm-border/40 bg-app-surface shadow-xs">
              <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-control bg-app-warm-soft text-app-warm-strong">
                  <Lock className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-xl font-semibold text-app-ink">Phân tích thực thi nâng cao</h3>
                  <p className="mx-auto max-w-md text-sm leading-relaxed text-app-ink-soft">
                    Mở bản đồ nhiệt, xu hướng theo tuần và hiệu quả từng việc lặp lại để tìm điểm cần điều chỉnh.
                  </p>
                </div>
                <Badge className="flex items-center gap-1.5 border border-app-warm-border/30 bg-app-warm-soft/30 px-3.5 py-1 text-xs font-semibold text-app-warm-strong hover:bg-app-warm-soft/30">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  Tính năng Plus
                </Badge>
                {onOpenSettingsTab ? (
                  <Button
                    onClick={onOpenSettingsTab}
                    className="min-h-11 bg-app-warm px-6 text-sm font-semibold text-white hover:bg-app-warm-hover"
                  >
                    Khám phá gói Plus
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

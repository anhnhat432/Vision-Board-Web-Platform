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
  Flame,
  Trophy,
} from "lucide-react";
import type { ExecutionInsight } from "@/features/plan12week/logic";
import { interpretProgressTrend, type ProgressTrendInterpretation } from "@/features/plan12week/logic";
import { formatCalendarDate, getReviewDayLabel } from "../../utils/storage";
import type { TwelveWeekSystem } from "../../utils/storage-types";
import type { HeatmapCell, TacticBreakdownItem, WeekTrendPoint } from "../../utils/twelve-week-system-ui";
import { WeeklyReviewIllustration } from "../illustrations";
import { SectionBlock } from "../layout/SectionBlock";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { InlineGoalTitleEdit } from "./InlineGoalTitleEdit";

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

function getNarrativeStyle(level: ProgressTrendInterpretation["level"]): {
  container: string;
  badge: string;
  badgeLabel: string;
} {
  switch (level) {
    case "on_track":
      return {
        container:
          "border-app-line/60 bg-gradient-to-br from-app-surface via-app-surface to-app-accent-soft/10 rounded-card-lg shadow-xs",
        badge: "border-app-accent/15 bg-app-accent-soft/80 text-app-accent px-3 py-1 rounded-full",
        badgeLabel: "Đang đúng nhịp",
      };
    case "early":
      return {
        container:
          "border-app-line/60 bg-gradient-to-br from-app-surface via-app-surface to-app-accent-soft/10 rounded-card-lg shadow-xs",
        badge: "border-app-accent/15 bg-app-accent-soft/80 text-app-accent px-3 py-1 rounded-full",
        badgeLabel: "Mới bắt đầu",
      };
    case "slowing":
      return {
        container:
          "border-app-line/60 bg-gradient-to-br from-app-surface via-app-surface to-app-warm-soft/10 rounded-card-lg shadow-xs",
        badge: "border-app-warm/20 bg-app-warm-soft/80 text-app-warm-strong px-3 py-1 rounded-full",
        badgeLabel: "Cần chú ý",
      };
    case "at_risk":
      return {
        container:
          "border-app-line/60 bg-gradient-to-br from-app-surface via-app-surface to-app-warm-soft/15 rounded-card-lg shadow-xs",
        badge: "border-app-warm/25 bg-app-warm-soft text-app-warm-strong px-3 py-1 rounded-full",
        badgeLabel: "Cần quay lại nhịp",
      };
    default:
      return {
        container: "border-app-line/60 bg-app-surface rounded-card-lg shadow-xs",
        badge: "border-app-line bg-app-bg text-app-ink-soft px-3 py-1 rounded-full",
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

// Decorative elements for Dreamy Planner aesthetic
const WashiTape = ({ className = "" }: { className?: string }) => (
  <div
    className={`absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-app-warm-soft/40 backdrop-blur-[0.5px] rotate-[-1.5deg] border border-dashed border-app-warm-border/40 shadow-[0_1px_2px_rgba(0,0,0,0.01)] pointer-events-none select-none z-20 ${className}`}
  />
);

const PaperPin = ({ className = "" }: { className?: string }) => (
  <div
    className={`absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none select-none z-20 ${className}`}
  >
    <div className="w-3.5 h-3.5 bg-app-warm rounded-full shadow-[inset_0_-1px_2px_rgba(0,0,0,0.2),0_1.5px_3px_rgba(0,0,0,0.15)] border border-white/20 flex items-center justify-center">
      <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
    </div>
  </div>
);

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
  goalTitle,
  reviewDueToday = false,
  onRenameGoal,
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

  // Tính chuỗi tuần liên tiếp chốt review
  let reviewStreak = 0;
  for (let w = currentWeek - 1; w >= 1; w--) {
    const weekEntry = system.scoreboard.find((entry) => entry.weekNumber === w);
    if (weekEntry?.reviewDone) {
      reviewStreak++;
    } else {
      break;
    }
  }

  // Tính tổng số hành động cốt lõi đã hoàn thành của toàn chu kỳ
  const validTasks = system.taskInstances.filter((task) => !task.skipped);
  const totalTasksCount = validTasks.length;
  const completedTasksCount = validTasks.filter((task) => task.completed).length;
  const totalCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="stack-section pt-4">
      {/* 1. KHU VỰC TIÊU ĐỀ MỤC TIÊU (GOAL CENTER) */}
      {goalTitle ? (
        <div className="relative overflow-hidden rounded-card-lg border border-app-accent/20 bg-gradient-to-r from-app-surface via-app-accent-soft/10 to-app-surface p-4.5 sm:p-6 shadow-2xs">
          <div className="absolute right-0 top-0 -z-10 w-36 h-36 rounded-full bg-app-accent-soft/15 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 -z-10 w-24 h-24 rounded-full bg-app-warm-soft/10 blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-app-accent">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-app-accent"></span>
            </span>
            Mục tiêu chu kỳ 12 tuần
          </div>
          <InlineGoalTitleEdit
            title={goalTitle}
            fallbackTitle="Kế hoạch hiện tại"
            onSave={onRenameGoal}
            headingLevel={2}
            titleClassName="mt-1.5 break-words font-serif text-lg font-bold leading-relaxed text-app-ink sm:text-2xl"
            inputClassName="mt-1.5 h-11 rounded-lg px-2 text-base font-semibold text-app-ink border border-app-line focus-visible:ring-2 focus-visible:ring-app-accent/50"
          />
        </div>
      ) : null}

      {/* 2. HERO TRẠNG THÁI NHỊP TUẦN & GỢI Ý HÀNH ĐỘNG */}
      <div className="relative pt-6">
        <PaperPin />
        <WashiTape className="opacity-70 rotate-[-1.5deg] -top-3.5" />
        
        <div className="grid gap-6 md:grid-cols-3 rounded-card border border-app-accent/20 bg-gradient-to-br from-app-surface via-app-bg-subtle to-app-accent-soft/20 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute right-1/3 top-0 -z-10 w-48 h-48 rounded-full bg-app-accent-soft/10 blur-3xl pointer-events-none" />
          
          {/* Cột 1 & 2: Trạng thái & Advice */}
          <div className="md:col-span-2 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${narrativeStyle.badge}`}
                >
                  {narrativeStyle.badgeLabel}
                </span>
                {trend.weekOverWeekDelta !== null && (
                  <Badge
                    variant="outline"
                    className="border-app-line bg-app-bg text-app-ink-soft rounded-full px-2.5 py-0.5 text-xs font-medium"
                  >
                    {trend.trendDirection === "up" ? (
                      <ArrowUp className="mr-1 h-3 w-3 text-app-accent" />
                    ) : trend.trendDirection === "down" ? (
                      <ArrowDown className="mr-1 h-3 w-3 text-app-warm" />
                    ) : (
                      <Minus className="mr-1 h-3 w-3 text-app-ink-muted" />
                    )}
                    {trend.weekOverWeekDelta > 0 ? "+" : ""}
                    {trend.weekOverWeekDelta}% so với tuần trước
                  </Badge>
                )}
              </div>

              <h1 className="mt-4 font-serif text-xl font-bold leading-snug text-app-ink sm:text-2xl pt-1">
                {trend.headline}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-app-ink-soft max-w-xl">
                {trend.advice}
              </p>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-xs text-app-ink-muted">
              <Sparkles className="h-4 w-4 text-app-accent" />
              <span>Chỉ số phản ánh nhịp độ thực thi thực tế của bạn.</span>
            </div>
          </div>

          {/* Cột 3: Tiếp theo nên làm (CTA Card) */}
          <div className="flex flex-col justify-between">
            {nextActionHandler ? (
              <div className="h-full flex flex-col justify-between rounded-card-lg border border-app-line/40 bg-app-bg-subtle/70 backdrop-blur-xs p-5 shadow-3xs">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-app-ink-muted">
                    Tiếp theo nên làm
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-app-ink">
                    {nextActionSuggestion.label}
                  </p>
                </div>
                <Button
                  size="lg"
                  className="mt-4 w-full bg-app-accent text-white hover:bg-app-accent/90 rounded-card shadow-2xs hover:shadow-xs transition-all duration-150"
                  onClick={nextActionHandler}
                >
                  {nextActionSuggestion.buttonLabel}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex h-full items-center justify-center p-4">
                <WeeklyReviewIllustration className="w-28 text-app-accent opacity-60" />
              </div>
            )}
          </div>
        </div>
      </div>

      {goalTitle ? null : null}

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

      {/* 3. TỔNG QUAN HIỆU SUẤT (4-COLUMN METRIC GRID) */}
      <SectionBlock title="Tổng quan hiệu suất" eyebrow="Performance" collapsible defaultOpen={true}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 pt-2">
          {/* Card 1: Tuần đang chạy */}
          <div className="relative pt-3">
            <Card className="h-full rounded-card border border-app-line/60 bg-gradient-to-br from-app-surface via-app-surface to-app-bg-subtle/40 shadow-2xs hover:shadow-xs transition-all duration-300">
              <CardContent className="p-5 md:p-6 flex flex-col justify-between h-full">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                    <CalendarDays className="h-3.5 w-3.5 text-app-accent-soft-strong" />
                    Tuần đang chạy
                  </p>
                  <div className="mt-4">
                    <p className="font-serif text-3xl font-bold text-app-ink">Tuần {currentWeek}</p>
                    <p className="mt-1.5 text-xs font-medium text-app-ink-soft">
                      {currentWeekRange
                        ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                        : "Đang cập nhật phạm vi tuần"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-app-ink-soft mb-1.5">
                    <span>Tiến trình chu kỳ</span>
                    <span>{Math.round((currentWeek / system.totalWeeks) * 100)}%</span>
                  </div>
                  <Progress value={(currentWeek / system.totalWeeks) * 100} className="h-1.5 rounded-full" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card 2: Cam kết việc cốt lõi */}
          <div className="relative pt-3">
            <PaperPin className="-top-1.5" />
            <Card className="h-full rounded-card border border-app-line/60 bg-gradient-to-br from-app-surface via-app-surface to-app-bg-subtle/40 shadow-2xs hover:shadow-xs transition-all duration-300">
              <CardContent className="p-5 md:p-6 flex flex-col justify-between h-full">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                    <BarChart3 className="h-3.5 w-3.5 text-app-accent" />
                    Tiến độ việc lặp lại
                  </p>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <p className="font-serif text-3xl font-bold text-app-ink">
                      {averageLeadScore}%{" "}
                      <span className="text-xs font-sans font-normal text-app-ink-soft">trung bình</span>
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface text-app-accent transition-all hover:scale-105 hover:bg-app-accent-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface sm:h-8 sm:w-8"
                          aria-label="Tại sao 85%?"
                        >
                          <CircleHelp className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={8}>{WEEKLY_EXECUTION_TARGET_TOOLTIP}</TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-app-ink-soft">
                    Tuần này: <span className="font-mono">{currentWeekScoreValue}%</span> · Điểm trung bình:{" "}
                    <span className="font-mono">{averageScore}%</span>
                  </p>
                </div>
                <div className="mt-4 pt-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-app-ink-soft mb-1.5">
                    <span>Đích ngắm tối ưu: 85%</span>
                    <span className={averageLeadScore >= 85 ? "text-app-accent font-bold" : "text-app-warm font-bold"}>
                      {averageLeadScore >= 85 ? "Đạt" : "Chưa đạt"}
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={averageLeadScore} className="h-1.5 rounded-full" />
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-app-ink/40 dark:bg-white/40"
                      style={{ left: "85%" }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card 3: Tuần đã hoàn thành */}
          <div className="relative pt-3">
            <Card className="h-full rounded-card border border-app-line/60 bg-gradient-to-br from-app-surface via-app-surface to-app-bg-subtle/40 shadow-2xs hover:shadow-xs transition-all duration-300">
              <CardContent className="p-5 md:p-6 flex flex-col justify-between h-full">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                    <Flag className="h-3.5 w-3.5 text-app-accent" />
                    Tuần đã hoàn thành
                  </p>
                  <p className="mt-4 font-serif text-3xl font-bold text-app-ink">
                    {reviewDoneCount}/{system.totalWeeks}{" "}
                    <span className="text-xs font-sans font-normal text-app-ink-soft">tuần</span>
                  </p>
                  <p className="mt-1.5 text-xs font-medium text-app-ink-soft leading-relaxed">
                    {isEarlyState
                      ? "Hết tuần này có review đầu tiên."
                      : `${weekCompletion.completed}/${weekCompletion.total} việc tuần này đã xong`}
                  </p>
                </div>
                <div className="mt-4 pt-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-app-ink-soft mb-1.5">
                    <span>Hoàn thành review</span>
                    <span>{Math.round((reviewDoneCount / system.totalWeeks) * 100)}%</span>
                  </div>
                  <Progress value={(reviewDoneCount / system.totalWeeks) * 100} className="h-1.5 rounded-full" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card 4: Kỷ luật & Chuỗi tích lũy */}
          <div className="relative pt-3">
            <Card className="h-full rounded-card border border-app-line/60 bg-gradient-to-br from-app-surface via-app-surface to-app-bg-subtle/40 shadow-2xs hover:shadow-xs transition-all duration-300">
              <CardContent className="p-5 md:p-6 flex flex-col justify-between h-full">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                    {reviewStreak > 0 ? (
                      <Flame className="h-3.5 w-3.5 text-app-warm animate-pulse" />
                    ) : (
                      <Trophy className="h-3.5 w-3.5 text-app-accent" />
                    )}
                    Chuỗi review liên tiếp
                  </p>
                  <p className="mt-4 font-serif text-3xl font-bold text-app-ink">
                    {reviewStreak}{" "}
                    <span className="text-xs font-sans font-normal text-app-ink-soft">tuần</span>
                  </p>
                  <p className="mt-1.5 text-xs font-medium text-app-ink-soft leading-relaxed">
                    {reviewStreak > 0 
                      ? "Bạn đang giữ vững nhịp tự phản chiếu!" 
                      : "Hãy duy trì việc chốt review cuối mỗi tuần."}
                  </p>
                </div>
                <div className="mt-4 pt-2">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-app-ink-soft mb-1.5">
                    <span>Tổng hành động đã làm</span>
                    <span className="font-mono">{totalCompletionRate}%</span>
                  </div>
                  <Progress value={totalCompletionRate} className="h-1.5 rounded-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SectionBlock>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-card border border-app-line/60 bg-app-surface shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-serif text-lg font-bold leading-tight text-app-ink">
              <BarChart3 className="h-5 w-5 text-app-accent" />
              Bảng điểm 12 tuần
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed text-app-ink-soft">
              Mỗi tuần được chấm từ hành vi thật: mức hoàn thành việc cốt lõi, check-in, đúng lịch và review.
            </CardDescription>
          </CardHeader>
          <CardContent className="stack-stack">
            <div className="rounded-card-lg border border-app-accent/15 bg-gradient-to-br from-app-accent-soft/50 to-app-accent-soft/20 p-5 shadow-3xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-app-ink">Tuần {currentWeek} đang là trọng tâm</p>
                  <p className="text-xs leading-relaxed text-app-ink-soft">
                    Duy trì việc cốt lõi và chốt review vào {getReviewDayLabel(system.reviewDay)}.
                  </p>
                </div>
                <Badge className="bg-app-accent text-white hover:bg-app-accent rounded-lg px-2.5 py-1 text-xs font-bold shadow-2xs">
                  <span className="font-mono">{currentWeekScoreValue}</span> điểm
                </Badge>
              </div>
            </div>

            <ZenJourneyMap scoreboard={system.scoreboard} currentWeek={currentWeek} />
          </CardContent>
        </Card>

        <div className="relative">
          <WashiTape className="w-20 h-4 bg-app-accent-soft/30 rotate-[2deg] -top-1.5 left-auto right-4 translate-x-0" />
          <Card className="rounded-card border border-app-line/60 bg-app-surface shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 font-serif text-lg font-bold leading-tight text-app-ink">
                <Target className="h-5 w-5 text-app-accent" />
                Cột mốc và đích đến
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-app-ink-soft">
                Nhìn lại các mốc quan trọng của chu kỳ thay vì chỉ nhìn điểm số.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-card border border-app-line/60 bg-gradient-to-br from-app-bg-subtle to-app-surface p-5 shadow-3xs">
                <div className="stack-stack">
                  {milestoneItems.map((item, index) => {
                    const isLastItem = index === milestoneItems.length - 1;

                    return (
                      <div key={item.label} className={`relative pl-11 ${isLastItem ? "" : "pb-6"}`}>
                        {!isLastItem && (
                          <div className="absolute left-[13px] top-8 h-full w-[2px] bg-gradient-to-b from-app-accent/30 to-app-line/10" />
                        )}
                        <div className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-app-accent to-app-accent/80 text-[10px] font-bold text-white shadow-app-sm ring-4 ring-app-accent-soft/50">
                          {index + 1}
                        </div>
                        <p className="pt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-app-accent">
                          {item.label}
                        </p>
                        <p className="mt-1.5 font-serif text-sm leading-relaxed text-app-ink font-medium">
                          {item.value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {hasAdvancedAnalytics ? (
        <div className="stack-section">
          {executionHeatmap.length > 0 && (
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
                          className="w-11 sm:w-9 text-center text-[10px] font-bold uppercase tracking-wider text-app-ink-muted"
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
                          <span className="w-11 pr-1 text-right text-[10px] font-bold text-app-ink-muted sm:w-8 sm:pr-0 sm:mr-1.5">
                            Tuần {weekNumber}
                          </span>
                          {cells.map((cell) => {
                            const cellClass =
                              cell.total === 0
                                ? "bg-app-bg/50 border border-app-line/10"
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
                                    className={`h-11 w-11 rounded-[6px] transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface sm:h-9 sm:w-9 ${cellClass} ${
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
                        <span className="inline-block h-3.5 w-3.5 rounded bg-app-accent/90 shadow-3xs" /> &gt;=80%
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3.5 w-3.5 rounded bg-app-accent/60 shadow-3xs" /> 50-79%
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3.5 w-3.5 rounded bg-app-accent/30 shadow-3xs" /> 1-49%
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3.5 w-3.5 rounded bg-app-warm/40 shadow-3xs" /> 0%
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3.5 w-3.5 rounded border border-app-line/20 bg-app-bg shadow-3xs" />{" "}
                        Trống
                      </span>
                    </div>
                    <p className="mt-3.5 text-[11px] italic text-app-ink-muted">
                      * Chạm hoặc rê chuột lên từng ô để xem số việc đã hoàn thành.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {weeklyTrend.length > 0 && (
            <Card className="rounded-card border border-app-line/60 bg-app-surface shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="font-serif text-lg font-bold leading-tight text-app-ink">
                  Xu hướng thực thi theo tuần
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed text-app-ink-soft">
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
                        className={`rounded-card-lg border p-4.5 transition-all duration-200 ${
                          isCurrent
                            ? "border-app-accent/30 bg-app-accent-soft/30 shadow-xs"
                            : "border-app-line/60 bg-app-bg/50 hover:bg-app-bg/80"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${isCurrent ? "text-app-ink" : "text-app-ink-soft"}`}>
                              Tuần {point.weekNumber}
                            </span>
                            {isCurrent && (
                              <Badge className="border-app-accent/20 bg-app-accent text-white hover:bg-app-accent rounded-md px-2 py-0.5 text-[10px] font-semibold">
                                Đang chạy
                              </Badge>
                            )}
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
                </div>
              </CardContent>
            </Card>
          )}

          {tacticBreakdown.length > 0 && (
            <Card className="rounded-card border border-app-line/60 bg-app-surface shadow-xs">
              <CardHeader className="pb-4">
                <CardTitle className="font-serif text-lg font-bold leading-tight text-app-ink">
                  Phân tích theo việc lặp lại
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed text-app-ink-soft">
                  Chi tiết hoàn thành và xu hướng từng việc lặp lại đến tuần {currentWeek}.
                </CardDescription>
              </CardHeader>
              <CardContent className="stack-tight">
                {tacticBreakdown.map((item) => (
                  <div
                    key={item.tacticId}
                    className="flex items-center gap-4 rounded-card-lg border border-app-line/60 bg-app-bg/40 px-4.5 py-4 hover:shadow-2xs hover:bg-app-bg/60 transition-all duration-200"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 break-words text-sm font-bold text-app-ink">{item.tacticName}</p>
                        <Badge
                          variant="outline"
                          className={
                            item.type === "core"
                              ? "border-app-accent/15 bg-app-accent-soft/80 text-app-accent text-[10px] font-semibold"
                              : "border-app-line bg-app-surface text-app-ink-muted text-[10px] font-medium"
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
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-card ${
                        item.trend === "up"
                          ? "bg-app-accent-soft/60 text-app-accent"
                          : item.trend === "down"
                            ? "bg-app-warm-soft/60 text-app-warm-strong"
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
        <Card className="relative overflow-hidden border border-app-warm-border/30 bg-gradient-to-br from-app-warm-soft/10 via-app-warm-subtle/5 to-transparent backdrop-blur-md shadow-2xl rounded-card-lg transition-all duration-300 hover:shadow-app-warm/5 hover:border-app-warm-border/50">
          {/* Background Accents */}
          <div className="absolute -right-16 -top-16 -z-10 w-32 h-32 rounded-full bg-app-warm-soft/15 blur-2xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 -z-10 w-32 h-32 rounded-full bg-app-warm-subtle/10 blur-2xl pointer-events-none" />

          <CardContent className="flex flex-col items-center gap-5 p-8 text-center sm:p-10">
            {/* Glowing Lock Icon */}
            <div className="relative flex h-16 w-16 items-center justify-center rounded-card-lg bg-gradient-to-br from-app-warm via-app-warm to-app-warm/75 text-white shadow-app-lg shadow-app-warm/15 ring-4 ring-app-warm/10 transition-transform duration-300 hover:scale-105">
              <Lock className="h-7 w-7" />
              <Sparkles className="absolute -right-2.5 -top-2.5 h-5 w-5 text-app-warm-strong animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="font-serif text-xl font-semibold tracking-wide text-app-ink">
                Phân tích thực thi nâng cao
              </h3>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-app-ink-soft">
                Khai phá toàn bộ tiềm năng với Bản đồ nhiệt hoàn thành, phân tích xu hướng chi tiết theo tuần và đo
                lường hiệu quả từng việc lặp lại. Giúp bạn biết rõ chỗ nào đang mạnh, điểm nào cần tối ưu hóa để bứt
                phá.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <Badge className="border border-app-warm-border/30 bg-app-warm-soft/30 text-app-warm-strong hover:bg-app-warm-soft/50 px-3.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-app-sm transition-all">
                <TrendingUp className="h-3.5 w-3.5" />
                Tính năng Plus cao cấp
              </Badge>

              {onOpenSettingsTab && (
                <Button
                  onClick={onOpenSettingsTab}
                  className="mt-2 bg-app-warm hover:bg-app-warm-hover text-white font-medium px-6 py-2 rounded-card shadow-app-md shadow-app-warm/15 hover:shadow-app-lg hover:shadow-app-warm/25 transition-all duration-300 flex items-center gap-2 text-sm"
                >
                  Khám phá gói Plus
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

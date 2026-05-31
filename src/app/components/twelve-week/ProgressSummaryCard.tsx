import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Flag,
  Minus,
  Sparkles,
  Target,
} from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import type { TwelveWeekSystem } from "../../utils/storage-types";
import { interpretProgressTrend, type ProgressTrendInterpretation } from "@/features/plan12week/logic";
import { formatCalendarDate } from "../../utils/storage";
import { getProgressNextActionSuggestion, type ProgressNextActionSuggestion } from "./TwelveWeekProgressTab";

interface WeekRange {
  start: string;
  end: string;
}

interface WeekCompletionSummary {
  completed: number;
  total: number;
  percent: number;
}

interface ProgressSummaryCardProps {
  system: TwelveWeekSystem;
  currentWeek: number;
  currentWeekRange: WeekRange | null;
  currentWeekScoreValue: number;
  averageScore: number;
  reviewDoneCount: number;
  weekCompletion: WeekCompletionSummary;
  reviewDueToday?: boolean;
  onOpenTodayTab?: () => void;
  onOpenWeekTab?: () => void;
  onOpenSettingsTab?: () => void;
  onOpenCycleReview?: () => void;
  onNavigateToSetup?: () => void;
  onViewFull?: () => void;
}

function getNarrativeStyle(level: ProgressTrendInterpretation["level"]) {
  switch (level) {
    case "on_track":
      return {
        container: "border-app-line/60 bg-gradient-to-br from-app-surface via-app-surface to-app-accent-soft/10 rounded-3xl shadow-xs",
        badge: "border-app-accent/15 bg-app-accent-soft/80 text-app-accent px-3 py-1 rounded-full",
        badgeLabel: "Đang đúng nhịp",
      };
    case "early":
      return {
        container: "border-app-line/60 bg-gradient-to-br from-app-surface via-app-surface to-app-accent-soft/10 rounded-3xl shadow-xs",
        badge: "border-app-accent/15 bg-app-accent-soft/80 text-app-accent px-3 py-1 rounded-full",
        badgeLabel: "Mới bắt đầu",
      };
    case "slowing":
      return {
        container: "border-app-line/60 bg-gradient-to-br from-app-surface via-app-surface to-app-warm-soft/10 rounded-3xl shadow-xs",
        badge: "border-app-warm/20 bg-app-warm-soft/80 text-app-warm-strong px-3 py-1 rounded-full",
        badgeLabel: "Cần chú ý",
      };
    case "at_risk":
      return {
        container: "border-app-line/60 bg-gradient-to-br from-app-surface via-app-surface to-app-warm-soft/15 rounded-3xl shadow-xs",
        badge: "border-app-warm/25 bg-app-warm-soft text-app-warm-strong px-3 py-1 rounded-full",
        badgeLabel: "Cần quay lại nhịp",
      };
    default:
      return {
        container: "border-app-line/60 bg-app-surface rounded-3xl shadow-xs",
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

export function ProgressSummaryCard({
  system,
  currentWeek,
  currentWeekRange,
  currentWeekScoreValue,
  averageScore,
  reviewDoneCount,
  weekCompletion,
  reviewDueToday = false,
  onOpenTodayTab,
  onOpenWeekTab,
  onOpenSettingsTab,
  onOpenCycleReview,
  onNavigateToSetup,
  onViewFull,
}: ProgressSummaryCardProps) {
  const boundedTotalWeeks = Math.max(system.totalWeeks, 1);
  const boundedCurrentWeek = Math.min(Math.max(currentWeek, 1), boundedTotalWeeks);
  const previousWeekEntry = system.scoreboard.find((entry) => entry.weekNumber === boundedCurrentWeek - 1);
  const previousWeekScore =
    previousWeekEntry && previousWeekEntry.weeklyScore > 0 ? previousWeekEntry.weeklyScore : null;
  const hasAnyTasks = system.scoreboard.some((entry) => entry.weeklyScore > 0) || system.taskInstances.length > 0;

  const trend = interpretProgressTrend({
    currentWeek: boundedCurrentWeek,
    totalWeeks: boundedTotalWeeks,
    currentWeekScore: currentWeekScoreValue,
    previousWeekScore,
    averageScore,
    reviewDoneCount,
    reviewDueToday,
    hasAnyTasks,
  });
  const narrativeStyle = getNarrativeStyle(trend.level);
  const currentWeekScoreboardEntry = system.scoreboard.find((entry) => entry.weekNumber === currentWeek);
  const hasReviewedCurrentWeek =
    currentWeekScoreboardEntry?.reviewDone ||
    Boolean(system.weeklyReviews.find((review) => review.weekNumber === currentWeek)?.reviewCompleted);
  const nextActionSuggestion = getProgressNextActionSuggestion({
    currentWeek,
    totalWeeks: boundedTotalWeeks,
    hasOpenTasksThisWeek: weekCompletion.total > 0 && weekCompletion.completed < weekCompletion.total,
    reviewDueToday,
    hasReviewedCurrentWeek,
    hasAnyTasks,
  });
  const nextActionHandler = pickNextActionHandler(nextActionSuggestion, {
    onOpenTodayTab,
    onOpenWeekTab,
    onOpenSettingsTab,
    onOpenCycleReview,
    onNavigateToSetup,
  });

  const isEarlyState = trend.level === "early" || trend.level === "no_data";
  const reviewedWeeks = new Set(
    system.weeklyReviews.filter((review) => review.reviewCompleted).map((review) => review.weekNumber),
  );
  const milestoneWeekList = [4, 8, 12].filter((weekNumber) => weekNumber <= boundedTotalWeeks);
  const milestoneWeeks = new Set(milestoneWeekList);
  const cycleWeeks = Array.from({ length: boundedTotalWeeks }, (_, index) => index + 1);
  const nextMilestoneWeek = milestoneWeekList.find((weekNumber) => weekNumber >= boundedCurrentWeek);
  const nextMilestoneLabel = nextMilestoneWeek ? `Week ${nextMilestoneWeek}` : `Week ${boundedTotalWeeks}`;
  const previousMilestoneWeek = [...milestoneWeekList].reverse().find((weekNumber) => weekNumber < boundedCurrentWeek);
  const currentPhaseStartWeek = previousMilestoneWeek ?? boundedCurrentWeek;
  const currentPhaseEndWeek = nextMilestoneWeek ?? boundedTotalWeeks;
  const currentPhaseLabel =
    currentPhaseStartWeek === currentPhaseEndWeek
      ? `Week ${currentPhaseStartWeek}`
      : `Week ${currentPhaseStartWeek} -> Week ${currentPhaseEndWeek}`;

  return (
    <div className="stack-section pt-4">
      <Card data-testid="progress-trend-hero" className={`border ${narrativeStyle.container} overflow-hidden`}>
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                <Sparkles className="h-3.5 w-3.5 text-app-accent" />
                Trạng thái nhịp tuần này
              </p>
              <p className="mt-2 font-serif text-xl font-bold leading-snug text-app-ink sm:text-2xl">{trend.headline}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-app-ink-soft">{trend.advice}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {trend.weekOverWeekDelta !== null && (
                  <span className="inline-flex items-center rounded-full border border-app-line bg-app-bg px-2.5 py-0.5 text-xs font-medium text-app-ink-soft">
                    {trend.trendDirection === "up" ? (
                      <ArrowUp className="mr-1 h-3 w-3 text-app-accent" />
                    ) : trend.trendDirection === "down" ? (
                      <ArrowDown className="mr-1 h-3 w-3 text-app-warm" />
                    ) : (
                      <Minus className="mr-1 h-3 w-3 text-app-ink-muted" />
                    )}
                    {trend.weekOverWeekDelta > 0 ? "+" : ""}
                    {trend.weekOverWeekDelta} so với tuần trước
                  </span>
                )}
              </div>
              {nextActionHandler && (
                <div className="mt-4.5 rounded-2xl border border-app-line/60 bg-app-bg/50 backdrop-blur-xs p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                    Tiếp theo nên làm
                  </p>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-app-ink">{nextActionSuggestion.label}</p>
                  <Button
                    size="lg"
                    className="mt-3.5 w-full bg-app-accent text-white hover:bg-app-accent/90 rounded-xl sm:w-auto shadow-2xs hover:shadow-xs transition-all duration-150"
                    onClick={nextActionHandler}
                  >
                    {nextActionSuggestion.buttonLabel}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border border-app-line/60 bg-gradient-to-b from-app-surface to-app-bg/10 shadow-2xs hover:shadow-xs transition-all duration-300">
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
              <CalendarDays className="h-3.5 w-3.5 text-app-accent-soft-strong" />
              Tuần đang chạy
            </p>
            <div className="mt-4">
              <p className="font-serif text-3xl font-bold text-app-ink">Tuần {boundedCurrentWeek}</p>
              <p className="mt-1.5 text-xs font-medium text-app-ink-soft">
                {currentWeekRange
                  ? `${formatCalendarDate(currentWeekRange.start)} - ${formatCalendarDate(currentWeekRange.end)}`
                  : "Đang cập nhật phạm vi tuần"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-app-line/60 bg-gradient-to-b from-app-surface to-app-bg/10 shadow-2xs hover:shadow-xs transition-all duration-300">
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
              <BarChart3 className="h-3.5 w-3.5 text-app-accent" />
              Điểm hiện tại
            </p>
            <p className="mt-4 font-serif text-3xl font-bold text-app-ink">{currentWeekScoreValue}</p>
            <p className="mt-1.5 text-xs font-medium text-app-ink-soft">Trung bình toàn chu kỳ: {averageScore}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-app-line/60 bg-gradient-to-b from-app-surface to-app-bg/10 shadow-2xs hover:shadow-xs transition-all duration-300">
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
              <Flag className="h-3.5 w-3.5 text-app-accent" />
              Review đã khóa
            </p>
            <p className="mt-4 font-serif text-3xl font-bold text-app-ink">
              {isEarlyState
                ? `${boundedCurrentWeek}/${boundedTotalWeeks}`
                : `${reviewDoneCount}/${boundedTotalWeeks}`}
            </p>
            <p className="mt-1.5 text-xs font-medium text-app-ink-soft leading-relaxed">
              {isEarlyState
                ? "Hết tuần này có review đầu tiên."
                : `${weekCompletion.completed}/${weekCompletion.total} việc đã xong`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border border-app-line/60 bg-app-surface shadow-xs">
        <CardContent className="stack-stack p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                <Target className="h-3.5 w-3.5 text-app-accent" />
                Bản đồ chu kỳ
              </p>
              <p className="mt-2 font-serif text-lg font-bold text-app-ink">Đường chạy {boundedTotalWeeks} tuần</p>
              <p className="mt-1 text-sm leading-relaxed text-app-ink-soft">
                Tuần hiện tại, review đã chốt và các mốc checkpoint được gom lại trong một hàng.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <div
                data-testid="progress-current-milestone"
                className="rounded-xl border border-app-line/60 bg-app-bg/50 px-3.5 py-2 text-xs font-semibold text-app-ink-soft shadow-3xs"
              >
                Hiện tại: <span className="font-bold text-app-accent">{currentPhaseLabel}</span>
              </div>
              <div
                data-testid="progress-next-milestone"
                className="rounded-xl border border-app-line/60 bg-app-bg/50 px-3.5 py-2 text-xs font-semibold text-app-ink-soft shadow-3xs"
              >
                Mốc tiếp theo: <span className="font-bold text-app-accent">{nextMilestoneLabel}</span>
              </div>
            </div>
          </div>

          <ol data-testid="progress-12-week-timeline" className="grid list-none grid-cols-6 gap-2 p-0 sm:grid-cols-12">
            {cycleWeeks.map((weekNumber) => {
              const isCurrent = weekNumber === boundedCurrentWeek;
              const isReviewed = reviewedWeeks.has(weekNumber);
              const isMilestone = milestoneWeeks.has(weekNumber);
              const weekLabelParts = [
                `Tuần ${weekNumber}`,
                isCurrent ? "tuần hiện tại" : null,
                isReviewed ? "đã chốt review" : null,
                isMilestone ? "mốc checkpoint" : null,
              ];
              const weekLabel = weekLabelParts.filter(Boolean).join(", ");

              return (
                <li
                  key={weekNumber}
                  data-testid={`progress-week-${weekNumber}`}
                  data-reviewed={isReviewed ? "true" : "false"}
                  data-milestone={isMilestone ? "true" : "false"}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={weekLabel}
                  className={`min-h-14 rounded-xl border px-2 py-2 text-center text-xs transition-all duration-200 hover:scale-105 ${
                    isCurrent
                      ? "border-app-accent bg-app-accent text-white shadow-2xs font-bold"
                      : isReviewed
                        ? "border-app-accent/15 bg-app-accent-soft/80 text-app-accent"
                        : isMilestone
                          ? "border-app-warm/20 bg-app-warm-soft/80 text-app-warm-strong font-semibold"
                          : "border-app-line/60 bg-app-bg text-app-ink-soft"
                  }`}
                >
                  <p className="font-semibold">W{weekNumber}</p>
                  <p className="mt-1 flex items-center justify-center gap-1 text-[10px]">
                    {isReviewed && <CheckCircle2 className="h-3 w-3" />}
                    {isMilestone ? "Mốc" : isReviewed ? "Xong" : isCurrent ? "Nay" : ""}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="rounded-2xl border border-app-line/60 bg-app-bg/50 px-4 py-3.5 text-sm leading-relaxed text-app-ink-soft shadow-3xs">
            {reviewDueToday
              ? "Bước tiếp theo: mở tab Tuần và chốt review trước khi thêm việc mới."
              : "Bước tiếp theo: quay lại Hôm nay và giữ một việc cụ thể trước mắt."}
          </div>
        </CardContent>
      </Card>

      {onViewFull && (
        <div className="flex justify-center mt-2">
          <Button 
            variant="outline" 
            onClick={onViewFull}
            className="rounded-xl border-app-line/80 hover:bg-app-bg transition-colors px-6 py-2 text-sm font-semibold"
          >
            Xem đầy đủ tiến độ
          </Button>
        </div>
      )}
    </div>
  );
}

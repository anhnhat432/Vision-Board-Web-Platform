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
      <Card data-testid="progress-trend-hero" className={`border ${narrativeStyle.container}`}>
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                <Sparkles className="h-3.5 w-3.5 text-app-accent" />
                Trạng thái nhịp tuần này
              </p>
              <p className="mt-2 font-serif text-xl font-medium text-app-ink sm:text-2xl">{trend.headline}</p>
              <p className="mt-1 text-[14px] leading-6 text-app-ink-soft">{trend.advice}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {trend.weekOverWeekDelta !== null && (
                  <span className="inline-flex items-center rounded-full border border-app-line bg-app-bg px-2.5 py-1 text-xs font-medium text-app-ink-soft">
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
                <div className="mt-4 rounded-lg border border-app-line bg-app-bg p-3">
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
        <Card className="border border-app-line bg-app-surface">
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              Tuần đang chạy
            </p>
            <div className="mt-3">
              <p className="font-serif text-2xl font-medium text-app-ink">Tuần {boundedCurrentWeek}</p>
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
              Điểm hiện tại
            </p>
            <p className="mt-3 font-serif text-2xl font-medium text-app-ink">{currentWeekScoreValue}</p>
            <p className="mt-1 text-[14px] text-app-ink-muted">Trung bình toàn chu kỳ: {averageScore}</p>
          </CardContent>
        </Card>

        <Card className="border border-app-line bg-app-surface">
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
              <Flag className="h-3.5 w-3.5 text-app-accent" />
              Review đã khóa
            </p>
            <p className="mt-3 font-serif text-2xl font-medium text-app-ink">
              {isEarlyState
                ? `Tuần ${boundedCurrentWeek}/${boundedTotalWeeks}`
                : `${reviewDoneCount}/${boundedTotalWeeks}`}
            </p>
            <p className="mt-1 text-[14px] text-app-ink-muted">
              {isEarlyState
                ? "Hết tuần này thì có review đầu tiên — chưa cần gấp."
                : `${weekCompletion.completed}/${weekCompletion.total} việc tuần này đã xong`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-app-line bg-app-surface">
        <CardContent className="stack-stack p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
                <Target className="h-3.5 w-3.5 text-app-accent" />
                Bản đồ chu kỳ
              </p>
              <p className="mt-2 font-serif text-lg font-medium text-app-ink">Đường chạy {boundedTotalWeeks} tuần</p>
              <p className="mt-1 text-[14px] leading-6 text-app-ink-soft">
                Tuần hiện tại, review đã chốt và các mốc checkpoint được gom lại trong một hàng.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div
                data-testid="progress-current-milestone"
                className="rounded-lg border border-app-line bg-app-bg px-3 py-2 text-[14px] text-app-ink-soft"
              >
                Hiện tại: <span className="font-semibold text-app-ink">{currentPhaseLabel}</span>
              </div>
              <div
                data-testid="progress-next-milestone"
                className="rounded-lg border border-app-line bg-app-bg px-3 py-2 text-[14px] text-app-ink-soft"
              >
                Mốc tiếp theo: <span className="font-semibold text-app-ink">{nextMilestoneLabel}</span>
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
                  className={`min-h-14 rounded-lg border px-2 py-2 text-center text-xs ${
                    isCurrent
                      ? "border-app-ink bg-app-ink text-white"
                      : isReviewed
                        ? "border-app-accent/20 bg-app-accent-soft text-app-accent"
                        : isMilestone
                          ? "border-app-warm/30 bg-app-warm-soft text-app-warm"
                          : "border-app-line bg-app-bg text-app-ink-soft"
                  }`}
                >
                  <p className="font-semibold">W{weekNumber}</p>
                  <p className="mt-1 flex items-center justify-center gap-1">
                    {isReviewed && <CheckCircle2 className="h-3 w-3" />}
                    {isMilestone ? "M" : isReviewed ? "Xong" : isCurrent ? "Nay" : ""}
                  </p>
                </li>
              );
            })}
          </ol>

          <div className="rounded-lg border border-app-line bg-app-bg px-4 py-3 text-[14px] leading-6 text-app-ink-soft">
            {reviewDueToday
              ? "Bước tiếp theo: mở tab Tuần và chốt review trước khi thêm việc mới."
              : "Bước tiếp theo: quay lại Hôm nay và giữ một việc cụ thể trước mắt."}
          </div>
        </CardContent>
      </Card>

      {onViewFull && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onViewFull}>
            Xem bảng điểm đầy đủ
          </Button>
        </div>
      )}
    </div>
  );
}

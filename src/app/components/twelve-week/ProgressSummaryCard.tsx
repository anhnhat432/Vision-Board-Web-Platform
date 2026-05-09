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
  onNavigateToSetup?: () => void;
  onViewFull?: () => void;
}

function getNarrativeStyle(level: ProgressTrendInterpretation["level"]) {
  switch (level) {
    case "on_track":
      return { container: "border-emerald-200 bg-emerald-50/82", badge: "border-emerald-300 bg-white text-emerald-800", badgeLabel: "Đang đúng nhịp" };
    case "early":
      return { container: "border-sky-200 bg-sky-50/82", badge: "border-sky-300 bg-white text-sky-800", badgeLabel: "Mới bắt đầu" };
    case "slowing":
      return { container: "border-amber-200 bg-amber-50/82", badge: "border-amber-300 bg-white text-amber-800", badgeLabel: "Cần chú ý" };
    case "at_risk":
      return { container: "border-amber-200 bg-amber-50/82", badge: "border-amber-300 bg-white text-amber-800", badgeLabel: "Cần quay lại nhịp" };
    default:
      return { container: "border-slate-200 bg-slate-50", badge: "border-slate-300 bg-white text-slate-700", badgeLabel: "Chưa có dữ liệu" };
  }
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
  onNavigateToSetup,
  onViewFull,
}: ProgressSummaryCardProps) {
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
  const nextActionHandler =
    trend.level === "no_data"
      ? onNavigateToSetup
      : reviewDueToday
        ? onOpenWeekTab
        : onOpenTodayTab;

  const isEarlyState = trend.level === "early" || trend.level === "no_data";
  const reviewedWeeks = new Set(
    system.weeklyReviews.filter((review) => review.reviewCompleted).map((review) => review.weekNumber),
  );
  const milestoneWeeks = new Set([4, 8, 12].filter((weekNumber) => weekNumber <= system.totalWeeks));
  const cycleWeeks = Array.from({ length: system.totalWeeks }, (_, index) => index + 1);
  const nextMilestoneWeek = cycleWeeks.find((weekNumber) => milestoneWeeks.has(weekNumber) && weekNumber >= currentWeek);
  const nextMilestoneLabel = nextMilestoneWeek ? `Week ${nextMilestoneWeek}` : `Week ${system.totalWeeks}`;
  const currentPhaseTargetWeek = nextMilestoneWeek ?? system.totalWeeks;
  const currentPhaseLabel = `Build toward Week ${currentPhaseTargetWeek}`;

  return (
    <div className="space-y-6 pt-4">
      <Card interactive={false} data-testid="progress-trend-hero" className={`border ${narrativeStyle.container}`}>
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
                  <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                    {trend.trendDirection === "up" ? (
                      <ArrowUp className="mr-1 h-3 w-3 text-emerald-600" />
                    ) : trend.trendDirection === "down" ? (
                      <ArrowDown className="mr-1 h-3 w-3 text-amber-600" />
                    ) : (
                      <Minus className="mr-1 h-3 w-3 text-slate-500" />
                    )}
                    {trend.weekOverWeekDelta > 0 ? "+" : ""}
                    {trend.weekOverWeekDelta} so với tuần trước
                  </span>
                )}
              </div>
              {nextActionHandler && (
                <div className="mt-4 rounded-lg border border-slate-900/10 bg-white/86 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tiếp theo nên làm</p>
                  <p className="mt-1 text-sm leading-6 text-slate-800">{trend.nextAction}</p>
                  <Button size="lg" className="mt-3 w-full sm:w-auto" onClick={nextActionHandler}>
                    {trend.level === "no_data"
                      ? "Mở Setup"
                      : reviewDueToday
                        ? "Mở tab Tuần"
                        : "Mở tab Hôm nay"}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${narrativeStyle.badge}`}>
              {narrativeStyle.badgeLabel}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card interactive={false} className="border border-slate-200/80 bg-white/92 shadow-sm">
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

        <Card interactive={false} className="border border-sky-200/80 bg-sky-50/70 shadow-lg">
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              <BarChart3 className="h-3.5 w-3.5" />
              Điểm hiện tại
            </p>
            <p className="mt-3 text-3xl font-bold text-slate-950">{currentWeekScoreValue}</p>
            <p className="mt-1 text-sm text-slate-600">Trung bình toàn chu kỳ: {averageScore}</p>
          </CardContent>
        </Card>

        <Card interactive={false} className="border border-emerald-200/80 bg-emerald-50/70 shadow-lg">
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

      <Card interactive={false} className="border border-slate-200/80 bg-white/92 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Target className="h-3.5 w-3.5" />
                Bản đồ chu kỳ
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">Đường chạy 12 tuần</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Tuần hiện tại, review đã chốt và các mốc checkpoint được gom lại trong một hàng.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div
                data-testid="progress-current-milestone"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                Hiện tại: <span className="font-semibold text-slate-950">{currentPhaseLabel}</span>
              </div>
              <div
                data-testid="progress-next-milestone"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                Mốc tiếp theo: <span className="font-semibold text-slate-950">{nextMilestoneLabel}</span>
              </div>
            </div>
          </div>

          <div data-testid="progress-12-week-timeline" className="grid grid-cols-6 gap-2 sm:grid-cols-12">
            {cycleWeeks.map((weekNumber) => {
              const isCurrent = weekNumber === currentWeek;
              const isReviewed = reviewedWeeks.has(weekNumber);
              const isMilestone = milestoneWeeks.has(weekNumber);

              return (
                <div
                  key={weekNumber}
                  data-testid={`progress-week-${weekNumber}`}
                  data-reviewed={isReviewed ? "true" : "false"}
                  data-milestone={isMilestone ? "true" : "false"}
                  aria-current={isCurrent ? "step" : undefined}
                  className={`min-h-14 rounded-lg border px-2 py-2 text-center text-xs ${
                    isCurrent
                      ? "border-slate-950 bg-slate-950 text-white"
                      : isReviewed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : isMilestone
                          ? "border-violet-200 bg-violet-50 text-violet-800"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  <p className="font-semibold">W{weekNumber}</p>
                  <p className="mt-1 flex items-center justify-center gap-1">
                    {isReviewed && <CheckCircle2 className="h-3 w-3" />}
                    {isMilestone ? "M" : isReviewed ? "Xong" : isCurrent ? "Nay" : ""}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
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

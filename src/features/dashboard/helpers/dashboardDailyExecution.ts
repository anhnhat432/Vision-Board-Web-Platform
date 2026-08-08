import {
  getTwelveWeekCurrentWeek,
  getTwelveWeekMissedTasks,
  getTwelveWeekTodayTasks,
  getTwelveWeekWeekCompletion,
  isTwelveWeekReviewDueToday,
} from "@/app/utils/storage";
import type { TwelveWeekSystem, TwelveWeekTaskInstance } from "@/app/utils/storage-types";

export interface DashboardDailyExecutionSnapshot {
  scheduledTodayTasks: TwelveWeekTaskInstance[];
  openScheduledTodayTasks: TwelveWeekTaskInstance[];
  homePrimaryTask: TwelveWeekTaskInstance | null;
  homeSecondaryTasks: TwelveWeekTaskInstance[];
  todayCompletedCount: number;
  todayRemainingCount: number;
  todayTotalCount: number;
  overdueOpenCount: number;
  currentWeek: number;
  weekCompletion: ReturnType<typeof getTwelveWeekWeekCompletion>;
  reviewDueToday: boolean;
  hasReviewedCurrentWeek: boolean;
}

export function buildDashboardDailyExecutionSnapshot(
  system: TwelveWeekSystem,
  referenceDate = new Date(),
): DashboardDailyExecutionSnapshot {
  const currentWeek = getTwelveWeekCurrentWeek(system, referenceDate);
  const scheduledTodayTasks = getTwelveWeekTodayTasks(system, referenceDate);
  const openScheduledTodayTasks = scheduledTodayTasks.filter((task) => !task.completed);
  const todayCompletedCount = scheduledTodayTasks.length - openScheduledTodayTasks.length;
  const missedTasks = getTwelveWeekMissedTasks(system, referenceDate);
  const hasReviewedCurrentWeek =
    system.weeklyReviews.some((review) => review.weekNumber === currentWeek && review.reviewCompleted) ||
    system.scoreboard.some((week) => week.weekNumber === currentWeek && week.reviewDone);

  return {
    scheduledTodayTasks,
    openScheduledTodayTasks,
    homePrimaryTask: openScheduledTodayTasks[0] ?? null,
    homeSecondaryTasks: openScheduledTodayTasks.slice(1),
    todayCompletedCount,
    todayRemainingCount: openScheduledTodayTasks.length,
    todayTotalCount: scheduledTodayTasks.length,
    overdueOpenCount: missedTasks.filter((task) => !task.completed).length,
    currentWeek,
    weekCompletion: getTwelveWeekWeekCompletion(system, currentWeek),
    reviewDueToday: isTwelveWeekReviewDueToday(system, referenceDate),
    hasReviewedCurrentWeek,
  };
}

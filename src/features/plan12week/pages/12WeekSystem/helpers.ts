import type { BackendConnectionStatus } from "@/app/components/twelve-week/TwelveWeekSettingsShared";
import type { BackendPlanHydrationResult } from "@/app/hooks/useBackendPlanHydration";
import { formatDateInputValue, getCalendarDateKey } from "@/app/utils/storage";
import type { TwelveWeekSystem, UniversalDailyCheckIn } from "@/app/utils/storage-types";
import { dedupeTasks } from "@/app/utils/twelve-week-system-ui";
import {
  getTwelveWeekCurrentWeek,
  getTwelveWeekMissedTasks,
  getTwelveWeekTasksForWeek,
  getTwelveWeekTodayTasks,
} from "@/app/utils/storage-twelve-week";

export function buildBackendSyncKey(goalId: string, system: TwelveWeekSystem): string {
  return JSON.stringify({
    goalId,
    startDate: system.startDate,
    totalWeeks: system.totalWeeks,
    weeklyPlans: system.weeklyPlans.map((week) => [week.weekNumber, week.focus, week.milestone]),
    tasks: system.taskInstances.map((task) => [
      task.id,
      task.weekNumber,
      task.scheduledDate,
      task.title,
      task.completed,
      task.completedAt,
    ]),
    checkIns: system.dailyCheckIns.map((checkIn) => [checkIn.date, checkIn.didWorkToday]),
    reviews: system.weeklyReviews.map((review) => [
      review.weekNumber,
      review.reviewCompleted,
      review.lagProgressValue,
      review.biggestOutputThisWeek,
      review.nextWeekPriority,
    ]),
  });
}

export function getLatestCheckIn(system: TwelveWeekSystem | null): UniversalDailyCheckIn | null {
  const checkIns = system?.dailyCheckIns ?? [];
  if (checkIns.length === 0) return null;

  return (
    [...checkIns].sort((left, right) => {
      const leftKey = getCalendarDateKey(left.date) ?? left.date;
      const rightKey = getCalendarDateKey(right.date) ?? right.date;
      return rightKey.localeCompare(leftKey) || right.date.localeCompare(left.date);
    })[0] ?? null
  );
}

export function getTodayQueueForSystem(system: TwelveWeekSystem) {
  const nextCurrentWeek = getTwelveWeekCurrentWeek(system);
  const nextCurrentWeekTasks = getTwelveWeekTasksForWeek(system, nextCurrentWeek);
  const nextScheduledTodayTasks = getTwelveWeekTodayTasks(system);
  const nextMissedTasks = getTwelveWeekMissedTasks(system);
  const todayDateKey = formatDateInputValue(new Date());
  const nextCompletedTodayTasks = nextCurrentWeekTasks
    .filter((task) => task.completed && !task.skipped && getCalendarDateKey(task.completedAt || "") === todayDateKey)
    .slice(0, 3);
  const nextFallbackTasks = nextCurrentWeekTasks.filter((task) => !task.completed).slice(0, 3);

  return dedupeTasks([
    ...nextMissedTasks.slice(0, 2),
    ...nextCompletedTodayTasks,
    ...(nextScheduledTodayTasks.length > 0 ? nextScheduledTodayTasks : nextFallbackTasks),
  ]);
}

export function hasBackendSyncIssue(
  backendConnectionStatus: BackendConnectionStatus,
  lastBackendHydrationResult: BackendPlanHydrationResult | null,
): boolean {
  return Boolean(
    backendConnectionStatus.syncStatus === "error" ||
      backendConnectionStatus.syncStatus === "partial" ||
      lastBackendHydrationResult?.status === "error" ||
      lastBackendHydrationResult?.status === "partial",
  );
}

export function getBackendSyncIssueMessage(
  backendConnectionStatus: BackendConnectionStatus,
  lastBackendHydrationResult: BackendPlanHydrationResult | null,
): string {
  return (
    backendConnectionStatus.syncMessage ||
    lastBackendHydrationResult?.message ||
    "Dữ liệu trên thiết bị vẫn được giữ lại. Bạn có thể thử đồng bộ lại khi backend hoặc mạng ổn định hơn."
  );
}

export function getSyncBadgeClass(backendConnectionStatus: BackendConnectionStatus): string {
  return backendConnectionStatus.syncStatus === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : backendConnectionStatus.syncStatus === "error" || backendConnectionStatus.syncStatus === "partial"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : backendConnectionStatus.syncing
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : "border-slate-200 bg-slate-50 text-slate-600";
}

export function getSyncBadgeLabel(backendConnectionStatus: BackendConnectionStatus): string {
  return backendConnectionStatus.syncing
    ? "Đang đồng bộ"
    : backendConnectionStatus.syncStatus === "success"
      ? "Đã lưu & đồng bộ"
      : backendConnectionStatus.syncStatus === "error" || backendConnectionStatus.syncStatus === "partial"
        ? "Đã lưu local"
        : backendConnectionStatus.signedIn
          ? "Backend sẵn sàng"
          : "Lưu trên thiết bị";
}

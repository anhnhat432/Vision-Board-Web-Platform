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

const BACKEND_ERROR_PATTERNS: Array<{ match: RegExp; vietnamese: string }> = [
  {
    match: /too many requests|rate limit/i,
    vietnamese: "Bạn vừa đồng bộ liên tục. Hãy đợi một chút rồi thử lại.",
  },
  {
    match: /timeout|timed out|deadline exceeded/i,
    vietnamese: "Yêu cầu mất quá nhiều thời gian. Hãy thử lại khi mạng ổn hơn.",
  },
  {
    match: /network|fetch failed|failed to fetch|offline/i,
    vietnamese: "Mạng đang chập chờn. Hãy kiểm tra kết nối rồi thử lại.",
  },
  {
    match: /unauthorized|unauthenticated|invalid token|expired token|401/i,
    vietnamese: "Phiên đăng nhập đã hết hạn. Hãy đăng xuất rồi đăng nhập lại.",
  },
  {
    match: /forbidden|permission denied|403/i,
    vietnamese: "Tài khoản chưa đủ quyền cho thao tác này.",
  },
  {
    match: /not found|404/i,
    vietnamese: "Không tìm thấy dữ liệu trên máy chủ.",
  },
  {
    match: /service unavailable|503|bad gateway|502|internal server error|500/i,
    vietnamese: "Máy chủ đang bận. Hãy thử lại sau ít phút.",
  },
];

const VIETNAMESE_DIACRITICS_REGEX =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/u;

export function translateBackendErrorMessage(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  for (const pattern of BACKEND_ERROR_PATTERNS) {
    if (pattern.match.test(trimmed)) return pattern.vietnamese;
  }

  // Plain English (no Vietnamese diacritics, ASCII only) → generic friendly fallback
  if (!VIETNAMESE_DIACRITICS_REGEX.test(trimmed) && /^[\x20-\x7e]+$/.test(trimmed)) {
    return "Máy chủ trả về lỗi. Hãy thử lại sau ít giây.";
  }

  return trimmed;
}

export function getBackendSyncIssueMessage(
  backendConnectionStatus: BackendConnectionStatus,
  lastBackendHydrationResult: BackendPlanHydrationResult | null,
): string {
  return (
    translateBackendErrorMessage(backendConnectionStatus.syncMessage) ||
    translateBackendErrorMessage(lastBackendHydrationResult?.message) ||
    "Dữ liệu trên thiết bị vẫn được giữ lại. Bạn có thể thử đồng bộ lại khi tài khoản hoặc mạng ổn định hơn."
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
        ? "Đã lưu trên thiết bị"
        : backendConnectionStatus.signedIn
          ? "Tài khoản sẵn sàng"
          : "Lưu trên thiết bị";
}

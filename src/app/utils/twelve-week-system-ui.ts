import type { BrowserNotificationStatus, OutboxSyncSnapshot } from "./production";
import { formatDateInputValue, getCalendarDateKey, getReviewDayLabel, parseCalendarDate } from "./storage";
import type {
  Goal,
  InAppReminder,
  SyncOutboxItem,
  TwelveWeekTaskInstance,
  UniversalDailyCheckIn,
  UniversalWeeklyReview,
} from "./storage-types";

export type DailyMood = "low" | "steady" | "high";
export type ReentryMode = "restart" | "lighten" | "push";

export interface RescuePlanSummary {
  recommendedMode: ReentryMode;
  headline: string;
  reason: string;
  firstMove: string;
}

export const REVIEW_DAYS = [
  { value: "Monday", label: "Thứ Hai" },
  { value: "Tuesday", label: "Thứ Ba" },
  { value: "Wednesday", label: "Thứ Tư" },
  { value: "Thursday", label: "Thứ Năm" },
  { value: "Friday", label: "Thứ Sáu" },
  { value: "Saturday", label: "Thứ Bảy" },
  { value: "Sunday", label: "Chủ Nhật" },
] as const;

export const WORKLOAD_OPTIONS = [
  { value: "keep same", label: "Giữ nguyên" },
  { value: "reduce slightly", label: "Giảm tải nhẹ" },
  { value: "increase slightly", label: "Tăng tải nhẹ" },
] as const;

export const LOAD_OPTIONS = [
  { value: "balanced", label: "Cân bằng" },
  { value: "lighter", label: "Nhẹ hơn" },
  { value: "push", label: "Đẩy mạnh" },
] as const;

export const MOOD_OPTIONS = [
  { value: "low", label: "Thấp", hint: "Ngày hơi chậm" },
  { value: "steady", label: "Ổn định", hint: "Giữ nhịp đều" },
  { value: "high", label: "Cao", hint: "Có thể đẩy thêm" },
] as const;

export const STATUS_OPTIONS = [
  { value: "active", label: "Đang chạy" },
  { value: "paused", label: "Tạm dừng" },
  { value: "completed", label: "Đã xong" },
] as const;

export function getLatestDailyCheckIn(goal: Goal | null): UniversalDailyCheckIn | null {
  const checkIns = goal?.twelveWeekSystem?.dailyCheckIns ?? [];
  if (checkIns.length === 0) return null;

  return [...checkIns].sort((left, right) => {
    const leftKey = getCalendarDateKey(left.date) ?? left.date;
    const rightKey = getCalendarDateKey(right.date) ?? right.date;
    return rightKey.localeCompare(leftKey) || right.date.localeCompare(left.date);
  })[0];
}

export function addDaysToDateKey(dateKey: string, amount: number): string {
  const parsed = parseCalendarDate(dateKey) ?? new Date();
  parsed.setDate(parsed.getDate() + amount);
  return formatDateInputValue(parsed);
}

export function getMoodLabel(mood: DailyMood): string {
  if (mood === "low") return "Thấp";
  if (mood === "high") return "Cao";
  return "Ổn định";
}

export function getMoodScore(mood: DailyMood): number {
  if (mood === "low") return 2;
  if (mood === "high") return 5;
  return 4;
}

export function getWorkloadDecisionLabel(value: UniversalWeeklyReview["workloadDecision"]): string {
  return WORKLOAD_OPTIONS.find((option) => option.value === value)?.label ?? "Giữ nguyên";
}

export function getReentryModeLabel(mode: ReentryMode): string {
  switch (mode) {
    case "restart":
      return "Bắt đầu lại tuần này";
    case "lighten":
      return "Chỉ giữ phần cốt lõi";
    case "push":
      return "Dời việc trễ sang tuần sau";
    default:
      return mode;
  }
}

export function getReentryModeDescription(
  mode: ReentryMode,
  input: {
    overdueOpenCount: number;
    optionalOpenThisWeekCount: number;
    currentWeekOpenCount: number;
  },
): string {
  switch (mode) {
    case "restart":
      return `Dàn lại tối đa ${Math.min(
        Math.max(input.overdueOpenCount, 1),
        4,
      )} việc vào vài ngày tới để bạn quay lại nhịp ngay trong tuần này.`;
    case "lighten":
      return input.optionalOpenThisWeekCount > 0
        ? `Tạm buông ${input.optionalOpenThisWeekCount} việc tùy chọn để tuần này chỉ còn phần cốt lõi.`
        : "Không thêm tải mới và chỉ giữ 1-2 trục cốt lõi cho phần còn lại của tuần.";
    case "push":
      return `Dời ${input.overdueOpenCount} việc đang trễ sang đầu tuần sau để hôm nay nhẹ đầu hơn.`;
    default:
      return `Hiện còn ${input.currentWeekOpenCount} việc mở trong tuần này.`;
  }
}

export function buildRescuePlanSummary(input: {
  missedTasks: TwelveWeekTaskInstance[];
  currentWeekTasks: TwelveWeekTaskInstance[];
}): RescuePlanSummary | null {
  const overdueOpenCount = input.missedTasks.filter((task) => !task.completed).length;

  if (overdueOpenCount === 0) return null;

  const optionalOpenThisWeekCount = input.currentWeekTasks.filter(
    (task) => !task.completed && !task.isCore,
  ).length;

  if (optionalOpenThisWeekCount > 0 && overdueOpenCount >= 2) {
    return {
      recommendedMode: "lighten",
      headline: "Tuần này nên nhẹ xuống trước khi nghĩ tới tăng tốc.",
      reason:
        "Bạn đang có cả việc trễ lẫn phần tùy chọn còn mở. Giữ phần cốt lõi trước sẽ giúp tuần sau không bị vỡ nhịp tiếp.",
      firstMove:
        "Buông phần tùy chọn trong vài ngày tới, giữ 1-2 việc cốt lõi đẹp nhất rồi mới cân nhắc thêm lại.",
    };
  }

  if (overdueOpenCount >= 3) {
    return {
      recommendedMode: "push",
      headline: "Dời phần trễ sang đầu tuần sau sẽ an toàn hơn cố gồng tiếp.",
      reason:
        "Khi việc trễ đã chồng lên nhau, ép hoàn thành hết trong tuần này thường chỉ làm review nặng đầu hơn.",
      firstMove:
        "Khóa lại vài việc đẹp nhất của tuần này, còn phần trễ thì dời hẳn sang đầu tuần sau để mở lại từ trạng thái gọn.",
    };
  }

  return {
    recommendedMode: "restart",
    headline: "Bạn vẫn cứu được tuần này nếu dàn lại ngay từ hôm nay.",
    reason:
      "Số việc trễ chưa quá nhiều. Cách tốt nhất lúc này là đặt lại thứ tự và vào lại nhịp thay vì tiếp tục né phần mở.",
    firstMove:
      "Xếp lại các việc trễ vào 3-4 ngày tới và bắt đầu bằng đúng việc quan trọng nhất của hôm nay.",
  };
}

export function getCurrentWeekStartDate(weekStartsOn: "Monday" | "Sunday"): Date {
  const today = new Date();
  const next = new Date(today);
  next.setHours(0, 0, 0, 0);

  const startOffset = weekStartsOn === "Sunday" ? 0 : 1;
  const delta = (next.getDay() - startOffset + 7) % 7;
  next.setDate(next.getDate() - delta);
  return next;
}

export function dedupeTasks<T extends { id: string }>(tasks: T[]): T[] {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    if (seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });
}

export function parseOutboxSummary(summary: string): Record<string, string> {
  const startIndex = summary.indexOf("(");
  const endIndex = summary.lastIndexOf(")");
  const payload =
    startIndex !== -1 && endIndex !== -1 && endIndex > startIndex ? summary.slice(startIndex + 1, endIndex) : summary;

  return payload
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, item) => {
      const [key, ...valueParts] = item.split(":");
      if (!key || valueParts.length === 0) return accumulator;
      accumulator[key.trim()] = valueParts.join(":").trim();
      return accumulator;
    }, {});
}

export function getOutboxTypeLabel(type: string): string {
  switch (type) {
    case "12_week_setup_started":
      return "Bắt đầu setup 12 tuần";
    case "12_week_plan_created":
      return "Tạo chu kỳ 12 tuần";
    case "12_week_task_completed":
      return "Hoàn thành việc";
    case "12_week_daily_checkin_submitted":
      return "Gửi check-in";
    case "12_week_weekly_review_submitted":
      return "Gửi review tuần";
    case "12_week_tactic_updated":
      return "Cập nhật tactic";
    case "12_week_reentry_used":
      return "Dùng re-entry";
    case "12_week_cycle_reset":
      return "Làm mới chu kỳ";
    default:
      return type.split("_").join(" ");
  }
}

export function getOutboxSummaryText(item: SyncOutboxItem): string {
  const metadata = parseOutboxSummary(item.payloadSummary);

  switch (item.type) {
    case "12_week_tactic_updated": {
      const tacticLabel = metadata.tacticId?.replace(/^tactic_/, "").split("_").join(" ") || "một tactic";
      if (metadata.field === "type") {
        return `${tacticLabel}: đổi loại sang ${metadata.value === "optional" ? "Tùy chọn" : "Cốt lõi"}.`;
      }
      if (metadata.field === "priority") {
        return `${tacticLabel}: đổi ưu tiên sang mức ${metadata.value || "-"}.`;
      }
      return `${tacticLabel}: đã cập nhật thông tin tactic.`;
    }
    case "12_week_task_completed":
      return `Tuần ${metadata.weekNumber || "-"} · đã đánh dấu xong việc ${metadata.taskId || "--"}.`;
    case "12_week_daily_checkin_submitted": {
      const moodValue =
        metadata.mood === "low" || metadata.mood === "high" || metadata.mood === "steady"
          ? metadata.mood
          : "steady";
      return `Năng lượng ${getMoodLabel(moodValue)} · hoàn thành ${metadata.completedTasks || "0"} việc.`;
    }
    case "12_week_weekly_review_submitted":
      return `Tuần ${metadata.weekNumber || "-"} · điểm ${metadata.score || "-"} · quyết định: ${
        metadata.decision || "giữ nguyên"
      }.`;
    case "12_week_plan_created":
      return `${metadata.coreTactics || "0"} tactic cốt lõi · ${metadata.optionalTactics || "0"} tactic tùy chọn · review vào ${getReviewDayLabel(metadata.reviewDay || "Sunday")}.`;
    case "12_week_setup_started":
      return `Vùng trọng tâm: ${metadata.focusArea || "--"} · độ sẵn sàng ${metadata.readinessScore || "--"}.`;
    case "12_week_reentry_used":
      return `Tuần ${metadata.weekNumber || "-"} · chế độ ${metadata.mode || "--"}.`;
    case "12_week_cycle_reset":
      return `Làm mới từ ${metadata.resetFrom || "--"} · tổng ${metadata.totalWeeks || "12"} tuần.`;
    default:
      return item.payloadSummary.split("(").join(" · ").split(")").join("");
  }
}

export function formatDateTimeLabel(value: string | null): string {
  if (!value) return "Chưa có";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Chưa có";

  return parsed.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getReminderActionLabel(kind: InAppReminder["kind"]): string {
  if (kind === "review") return "Mở tab Tuần";
  return "Mở tab Hôm nay";
}

export function getBrowserNotificationStatusLabel(status: BrowserNotificationStatus): string {
  switch (status) {
    case "granted":
      return "Đã cấp quyền";
    case "denied":
      return "Đã chặn";
    case "default":
      return "Chưa quyết định";
    default:
      return "Không hỗ trợ";
  }
}

export function getSyncStatusLabel(status: OutboxSyncSnapshot["status"] | null): string {
  switch (status) {
    case "success":
      return "Đồng bộ xong";
    case "partial":
      return "Đồng bộ một phần";
    case "offline":
      return "Đang offline";
    case "not_configured":
      return "Chưa cấu hình endpoint";
    case "error":
      return "Đồng bộ lỗi";
    case "idle":
      return "Không có gì để gửi";
    default:
      return "Chưa chạy";
  }
}

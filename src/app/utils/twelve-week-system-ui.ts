import type { BrowserNotificationStatus, OutboxSyncSnapshot } from "./production";
import { formatDateInputValue, getCalendarDateKey, getReviewDayLabel, parseCalendarDate } from "./storage";
import type {
  Goal,
  InAppReminder,
  RescueTrigger,
  RescueTriggerKind,
  RescueTriggerSeverity,
  Subscription,
  SyncOutboxItem,
  TwelveWeekSystem,
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

// ─── D4: Rescue trigger rule engine ──────────────────────────────────────────

const RESCUE_TRIGGER_DISMISS_KEY = "visionboard_rescue_dismissed";

/** Persist a dismissal for `kind` until end of today. */
export function dismissRescueTrigger(kind: RescueTriggerKind): void {
  if (typeof window === "undefined") return;
  try {
    const stored = JSON.parse(localStorage.getItem(RESCUE_TRIGGER_DISMISS_KEY) ?? "{}") as Record<string, string>;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    stored[kind] = tomorrow.toISOString();
    localStorage.setItem(RESCUE_TRIGGER_DISMISS_KEY, JSON.stringify(stored));
  } catch {
    // ignore storage errors
  }
}

/** Returns true if this kind was dismissed and the dismissal is still valid. */
export function isRescueTriggerDismissed(kind: RescueTriggerKind): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = JSON.parse(localStorage.getItem(RESCUE_TRIGGER_DISMISS_KEY) ?? "{}") as Record<string, string>;
    const until = stored[kind];
    if (!until) return false;
    return new Date(until) > new Date();
  } catch {
    return false;
  }
}

/**
 * Evaluates all rescue trigger rules against the current system + subscription
 * state and returns the list of active, non-dismissed triggers sorted by
 * severity (urgent → caution → watch).
 */
export function evaluateRescueTriggers(input: {
  system: TwelveWeekSystem | null;
  subscription?: Subscription | null;
  missedTasksCount?: number;
  weekCompletionPercent?: number;
  referenceDate?: Date;
}): RescueTrigger[] {
  const now = input.referenceDate ?? new Date();
  const triggers: RescueTrigger[] = [];

  // ── trial_ending: trial expires within ≤2 days ───────────────────────────
  const sub = input.subscription;
  if (sub?.status === "trialing" && sub.renewsAt) {
    const msLeft = new Date(sub.renewsAt).getTime() - now.getTime();
    const daysLeft = msLeft / (1000 * 60 * 60 * 24);

    if (daysLeft >= 0 && daysLeft <= 2) {
      const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60));
      const timeLabel = hoursLeft <= 24 ? `${hoursLeft} giờ` : `${Math.ceil(daysLeft)} ngày`;
      triggers.push({
        kind: "trial_ending",
        severity: daysLeft <= 1 ? "urgent" : "caution",
        headline: `Còn ${timeLabel} để nâng cấp và giữ Plus.`,
        detail: "Sau khi hết thử, toàn bộ tính năng Plus sẽ về mức Free. Nâng cấp ngay để không mất nhịp.",
        surfacedAt: now.toISOString(),
      });
    }
  }

  const system = input.system;
  if (!system) return filterAndSortTriggers(triggers);

  // ── missed_checkin: no check-in in the last 2+ days ──────────────────────
  const lastCheckIn = [...(system.dailyCheckIns ?? [])].sort((a, b) =>
    (getCalendarDateKey(b.date) ?? b.date).localeCompare(getCalendarDateKey(a.date) ?? a.date),
  )[0];
  if (lastCheckIn) {
    const lastKey = getCalendarDateKey(lastCheckIn.date) ?? lastCheckIn.date;
    const daysSinceLast = Math.floor(
      (now.getTime() - (parseCalendarDate(lastKey)?.getTime() ?? now.getTime())) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceLast >= 2) {
      const severity: RescueTriggerSeverity = daysSinceLast >= 4 ? "urgent" : "caution";
      triggers.push({
        kind: "missed_checkin",
        severity,
        headline: `Bạn chưa check-in ${daysSinceLast} ngày liên tiếp.`,
        detail: "Mỗi ngày bỏ qua làm khó hơn để quay lại nhịp. Chỉ cần 1 check-in ngắn hôm nay là đủ để giữ đà.",
        surfacedAt: now.toISOString(),
      });
    }
  }

  // ── low_execution_score: <30% completion with ≥3 days elapsed in the week ─
  const weekPercent = input.weekCompletionPercent ?? 0;
  const startDate = system.startDate ? new Date(system.startDate) : null;
  if (startDate) {
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dayInWeek = daysSinceStart % 7;

    if (dayInWeek >= 3 && weekPercent < 30) {
      // Only trigger if there are tasks to complete
      const hasTasks = (input.missedTasksCount ?? 0) > 0 || weekPercent > 0;
      if (hasTasks) {
        triggers.push({
          kind: "low_execution_score",
          severity: "caution",
          headline: `Tuần này mới hoàn thành ${weekPercent}% — nhịp đang chậm lại.`,
          detail: "Còn thời gian cứu tuần này. Chọn 1 việc cốt lõi và khóa nó trước cuối ngày hôm nay.",
          surfacedAt: now.toISOString(),
        });
      }
    }
  }

  // ── overdue_pile: ≥3 missed (overdue) tasks ──────────────────────────────
  const missedCount = input.missedTasksCount ?? 0;
  if (missedCount >= 3) {
    triggers.push({
      kind: "overdue_pile",
      severity: missedCount >= 5 ? "urgent" : "caution",
      headline: `${missedCount} việc đang trễ — cần sắp xếp lại ngay.`,
      detail: "Khi việc trễ chồng chất, cố gồng hết thường phản tác dụng. Hãy chọn cách cứu nhịp đúng nhất.",
      surfacedAt: now.toISOString(),
    });
  }

  return filterAndSortTriggers(triggers);
}

function filterAndSortTriggers(triggers: RescueTrigger[]): RescueTrigger[] {
  const severityScore: Record<RescueTriggerSeverity, number> = {
    urgent: 3,
    caution: 2,
    watch: 1,
  };

  return triggers
    .filter((trigger) => !isRescueTriggerDismissed(trigger.kind))
    .sort((a, b) => severityScore[b.severity] - severityScore[a.severity]);
}

// ─── B4: Premium progress analytics helpers ──────────────────────────────────

/** One cell in the execution heatmap: week × day-of-week. */
export interface HeatmapCell {
  weekNumber: number;
  dayOfWeek: number; // 0 = Mon, 6 = Sun
  dateKey: string;
  total: number;
  completed: number;
  percent: number;
}

/** Weekly execution trend data point. */
export interface WeekTrendPoint {
  weekNumber: number;
  executionPercent: number;
  corePercent: number;
  optionalPercent: number;
  score: number;
}

/** Per-tactic breakdown for a given week range. */
export interface TacticBreakdownItem {
  tacticId: string;
  tacticName: string;
  type: "core" | "optional";
  totalTasks: number;
  completedTasks: number;
  percent: number;
  trend: "up" | "down" | "flat";
}

/**
 * Build a 7×N heatmap grid of task completion by day×week.
 * Each cell has total / completed / percent for that day.
 */
export function buildExecutionHeatmap(system: TwelveWeekSystem): HeatmapCell[] {
  const tasks = system.taskInstances ?? [];
  const cells: HeatmapCell[] = [];
  const startDate = system.startDate ? new Date(system.startDate) : null;
  if (!startDate) return cells;

  for (let week = 1; week <= system.totalWeeks; week++) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + (week - 1) * 7 + day);
      const dateKey = formatDateInputValue(d);
      const dayTasks = tasks.filter(
        (t) => (getCalendarDateKey(t.scheduledDate) ?? t.scheduledDate) === dateKey,
      );
      const total = dayTasks.length;
      const completed = dayTasks.filter((t) => t.completed).length;
      cells.push({
        weekNumber: week,
        dayOfWeek: day,
        dateKey,
        total,
        completed,
        percent: total > 0 ? Math.round((completed / total) * 100) : -1,
      });
    }
  }
  return cells;
}

/**
 * Build a weekly execution trend: overall %, core %, optional %, score.
 */
export function buildWeeklyTrend(system: TwelveWeekSystem): WeekTrendPoint[] {
  const tasks = system.taskInstances ?? [];
  const points: WeekTrendPoint[] = [];

  for (let week = 1; week <= system.totalWeeks; week++) {
    const weekTasks = tasks.filter((t) => t.weekNumber === week);
    const coreTasks = weekTasks.filter((t) => t.isCore);
    const optionalTasks = weekTasks.filter((t) => !t.isCore);
    const scoreEntry = system.scoreboard.find((s) => s.weekNumber === week);

    const pct = (arr: TwelveWeekTaskInstance[]) =>
      arr.length > 0
        ? Math.round((arr.filter((t) => t.completed).length / arr.length) * 100)
        : 0;

    points.push({
      weekNumber: week,
      executionPercent: pct(weekTasks),
      corePercent: pct(coreTasks),
      optionalPercent: pct(optionalTasks),
      score: scoreEntry?.weeklyScore ?? 0,
    });
  }
  return points;
}

/**
 * Build a per-tactic breakdown comparing the latest N weeks.
 * `trend` compares the last 2 completed weeks.
 */
export function buildTacticBreakdown(
  system: TwelveWeekSystem,
  upToWeek?: number,
): TacticBreakdownItem[] {
  const tasks = system.taskInstances ?? [];
  const maxWeek = upToWeek ?? system.totalWeeks;
  const indicators = system.leadIndicators ?? [];

  return indicators.map((indicator) => {
    const tacticId = indicator.id ?? indicator.name;
    const relevantTasks = tasks.filter(
      (t) =>
        t.weekNumber <= maxWeek &&
        (t.tacticId === indicator.id || t.leadIndicatorName === indicator.name),
    );
    const total = relevantTasks.length;
    const completed = relevantTasks.filter((t) => t.completed).length;

    // trend: compare last 2 weeks
    const lastWeekTasks = relevantTasks.filter((t) => t.weekNumber === maxWeek);
    const prevWeekTasks = relevantTasks.filter((t) => t.weekNumber === maxWeek - 1);
    const lastPct =
      lastWeekTasks.length > 0
        ? lastWeekTasks.filter((t) => t.completed).length / lastWeekTasks.length
        : 0;
    const prevPct =
      prevWeekTasks.length > 0
        ? prevWeekTasks.filter((t) => t.completed).length / prevWeekTasks.length
        : 0;
    const trend: "up" | "down" | "flat" =
      lastPct > prevPct + 0.05 ? "up" : lastPct < prevPct - 0.05 ? "down" : "flat";

    return {
      tacticId,
      tacticName: indicator.name,
      type: (indicator.type ?? "core") as "core" | "optional",
      totalTasks: total,
      completedTasks: completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      trend,
    };
  });
}

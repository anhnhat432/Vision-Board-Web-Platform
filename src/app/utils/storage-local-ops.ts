import { formatDateInputValue, getCalendarDateKey } from "./storage-date-utils";
import {
  getActiveTwelveWeekGoal,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTodayTasks,
  isReviewDayForDate,
} from "./storage-twelve-week";
import type {
  AppPreferences,
  FunnelStepSummary,
  InAppReminder,
  SyncOutboxItem,
  TrackingEvent,
  UserData,
} from "./storage-types";

export interface FunnelStepDefinition {
  id: string;
  label: string;
  description: string;
}

function buildReadableOutboxSummary(type: string, metadata?: Record<string, string>): string {
  if (!metadata) return type;

  switch (type) {
    case "paywall_viewed":
      return `Mở paywall từ ${metadata.source ?? "--"} â€¢ context ${metadata.context ?? "--"} â€¢ gợi ý ${metadata.recommendedPlan ?? "--"}`;
    case "paywall_cta_clicked":
      return `Bấm CTA ${metadata.placement ?? "--"} từ ${metadata.source ?? "--"} â€¢ target ${metadata.targetPlan ?? "--"}`;
    case "paywall_checkout_started":
      return `Bắt đầu mở gói ${metadata.planCode ?? "--"} từ ${metadata.source ?? "--"}`;
    case "paywall_checkout_completed":
      return `Đã mở gói ${metadata.resultPlan ?? metadata.planCode ?? "--"} â€¢ mode ${metadata.mode ?? "local_test"}`;
    case "premium_template_unlock_prompted":
      return `Template ${metadata.templateId ?? "--"} cần gói ${metadata.requiredPlan ?? "--"}`;
    case "premium_template_applied":
      return `Áp dụng template ${metadata.templateName ?? metadata.templateId ?? "--"} â€¢ ${metadata.tier ?? "free"}`;
    case "premium_insight_opened":
      return `Đã mở insight premium ở tuần ${metadata.weekNumber ?? "--"} từ ${metadata.source ?? "--"}`;
    default:
      return buildOutboxSummary(type, metadata);
  }
}

function buildOutboxSummary(type: string, metadata?: Record<string, string>): string {
  if (!metadata) return type;

  const metadataText = Object.entries(metadata)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");

  if (metadataText) {
    return `${type} (${metadataText})`;
  }

  switch (type) {
    case "12_week_tactic_updated":
      return metadata.field === "type"
        ? `Đổi loại tactic thành ${metadata.value === "optional" ? "Optional" : "Core"}`
        : `Đổi mức ưu tiên tactic thành ${metadata.value ?? "-"}`;
    case "12_week_task_completed":
      return `Đã hoàn thành một task ở tuần ${metadata.weekNumber ?? "-"}`;
    case "12_week_daily_checkin_submitted":
      return `Mood ${metadata.mood ?? "steady"} • hoàn thành ${metadata.completedTasks ?? "0"} task`;
    case "12_week_weekly_review_submitted":
      return `Review tuần ${metadata.weekNumber ?? "-"} • điểm ${metadata.score ?? "-"} • ${metadata.decision ?? "keep same"}`;
    case "12_week_plan_created":
      return `${metadata.coreTactics ?? "0"} core • ${metadata.optionalTactics ?? "0"} optional • review ${metadata.reviewDay ?? "Sunday"}`;
    case "12_week_setup_started":
      return `Bắt đầu setup cho ${metadata.focusArea ?? "goal"} • readiness ${metadata.readinessScore ?? "--"}`;
    case "12_week_reentry_used":
      return `Dùng re-entry mode ${metadata.mode ?? "--"} ở tuần ${metadata.weekNumber ?? "-"}`;
    case "12_week_cycle_reset":
      return `Reset chu kỳ từ ${metadata.resetFrom ?? "--"}`;
    default: {
      const fallbackText = Object.entries(metadata)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" • ");
      return fallbackText ? `${type} • ${fallbackText}` : type;
    }
  }
}

export function trackAppEventInData(
  data: UserData,
  type: string,
  goalId?: string,
  metadata?: Record<string, string>,
): void {
  const event: TrackingEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    createdAt: new Date().toISOString(),
    goalId,
    metadata,
  };

  if (data.appPreferences.allowLocalAnalytics) {
    data.eventLog = [event, ...data.eventLog].slice(0, 200);
  }

  if (data.appPreferences.keepLocalOutbox) {
    const outboxItem: SyncOutboxItem = {
      id: `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      createdAt: event.createdAt,
      goalId,
      payloadSummary: buildReadableOutboxSummary(type, metadata),
      status: "pending",
    };

    data.syncOutbox = [outboxItem, ...data.syncOutbox].slice(0, 200);
  }
}

export function updateAppPreferencesInData(
  data: UserData,
  defaultAppPreferences: AppPreferences,
  updates: Partial<AppPreferences>,
): void {
  data.appPreferences = {
    ...defaultAppPreferences,
    ...data.appPreferences,
    ...updates,
  };
}

export function archiveOutboxItemInData(data: UserData, outboxId: string): void {
  data.syncOutbox = data.syncOutbox.map((item) =>
    item.id === outboxId ? { ...item, status: "archived" } : item,
  );
}

export function restoreOutboxItemInData(data: UserData, outboxId: string): void {
  data.syncOutbox = data.syncOutbox.map((item) =>
    item.id === outboxId ? { ...item, status: "pending" } : item,
  );
}

export function restoreArchivedOutboxInData(data: UserData): void {
  data.syncOutbox = data.syncOutbox.map((item) =>
    item.status === "archived" ? { ...item, status: "pending" } : item,
  );
}

export function clearArchivedOutboxInData(data: UserData): void {
  data.syncOutbox = data.syncOutbox.filter((item) => item.status !== "archived");
}

export function clearEventLogInData(data: UserData): void {
  data.eventLog = [];
}

export function clearLocalDeviceSignalsInData(data: UserData): void {
  data.eventLog = [];
  data.syncOutbox = [];
}

export function getTwelveWeekFunnelSummaryFromData(
  data: UserData,
  funnelSteps: readonly FunnelStepDefinition[],
  goalId?: string,
): FunnelStepSummary[] {
  const events = goalId ? data.eventLog.filter((event) => event.goalId === goalId) : data.eventLog;

  return funnelSteps.map((step) => {
    const matchingEvents = events.filter((event) => event.type === step.id);
    return {
      ...step,
      count: matchingEvents.length,
      lastSeenAt: matchingEvents[0]?.createdAt ?? null,
    };
  });
}

export function getInAppRemindersFromData(
  data: UserData,
  referenceDate = new Date(),
): InAppReminder[] {
  if (!data.appPreferences.enableInAppReminders) return [];

  const activeGoal = getActiveTwelveWeekGoal(data.goals);
  const system = activeGoal?.twelveWeekSystem;
  if (!activeGoal || !system) return [];

  const currentWeek = getTwelveWeekCurrentWeek(system, referenceDate);
  const currentReview = system.weeklyReviews.find((review) => review.weekNumber === currentWeek);
  const todayTasks = getTwelveWeekTodayTasks(system, referenceDate).filter((task) => !task.completed);
  const todayKey = formatDateInputValue(referenceDate);
  const hasTodayCheckIn = system.dailyCheckIns.some((item) => getCalendarDateKey(item.date) === todayKey);
  const reminders: InAppReminder[] = [];

  if (todayTasks.length > 0) {
    reminders.push({
      id: `reminder_tasks_${activeGoal.id}_${todayKey}`,
      title: `${todayTasks.length} việc đang đợi trong hôm nay`,
      description: `Tập trung vào ${todayTasks.slice(0, 2).map((task) => task.title).join(", ")}.`,
      href: "/12-week-system",
      kind: "tasks",
      goalId: activeGoal.id,
    });
  }

  if (isReviewDayForDate(system.reviewDay, referenceDate) && !currentReview?.reviewCompleted) {
    reminders.push({
      id: `reminder_review_${activeGoal.id}_${currentWeek}`,
      title: `Đã đến lúc review tuần ${currentWeek}`,
      description: "Chốt 3 câu hỏi review và quyết định cho tuần sau để không bị trôi nhịp.",
      href: "/12-week-system",
      kind: "review",
      goalId: activeGoal.id,
    });
  }

  if (!hasTodayCheckIn && referenceDate.getHours() >= data.appPreferences.preferredReminderHour) {
    reminders.push({
      id: `reminder_checkin_${activeGoal.id}_${todayKey}`,
      title: "Nhớ đóng check-in hôm nay",
      description: "30 giây để ghi lại mood và điều cần điều chỉnh cho ngày mai.",
      href: "/12-week-system",
      kind: "check-in",
      goalId: activeGoal.id,
    });
  }

  return reminders
    .map((reminder) => {
      if (reminder.kind === "tasks") {
        return {
          ...reminder,
          title: `${todayTasks.length} việc đang đợi trong hôm nay`,
          description: `Tập trung vào ${todayTasks.slice(0, 2).map((task) => task.title).join(", ")}.`,
        };
      }

      if (reminder.kind === "review") {
        return {
          ...reminder,
          title: `Đã đến lúc review tuần ${currentWeek}`,
          description: "Chốt 3 câu hỏi review và quyết định cho tuần sau để không bị trôi nhịp.",
        };
      }

      return {
        ...reminder,
        title: "Nhớ đóng check-in hôm nay",
        description: "30 giây để ghi lại mood và điều cần điều chỉnh cho ngày mai.",
      };
    })
    .slice(0, 3);
}

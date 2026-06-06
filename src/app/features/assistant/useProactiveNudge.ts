import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { formatDateInputValue } from "@/app/utils/storage-date-utils";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import { getMemoryItems } from "./assistantMemory";
import { isAssistantProactiveNudgeEnabled } from "./assistantFeatureFlags";
import { recordAssistantEvent } from "./assistantObservability";
import { type AssistantContext, buildAssistantContext } from "./buildAssistantContext";

export type NudgeType =
  | "stuck_onboarding"
  | "missing_smart_goal"
  | "missing_feasibility_check"
  | "missing_12_week_plan"
  | "today_task_pending"
  | "overdue_tasks"
  | "weekly_review_due"
  | "reflection_due"
  | "sync_error"
  | "trial_or_billing_warning";

export type NudgeReason = NudgeType | "new-week" | "overdue" | "idle" | "personalized";

export type NudgePriority = "low" | "medium" | "high";

export interface NudgeState {
  active: boolean;
  id: string;
  type: NudgeType | null;
  reason: NudgeReason | null;
  priority: NudgePriority;
  title: string;
  message: string;
  actionLabel: string;
  route?: string;
  href?: string;
  createdAt: string;
  expiresAt: string;
  cooldownKey: string;
  relatedGoalId?: string;
  relatedTaskId?: string;
  suggestedAssistantMessage?: string;
}

interface ProactiveNudgeCandidate {
  type: NudgeType;
  priority: NudgePriority;
  title: string;
  message: string;
  actionLabel: string;
  route?: string;
  href?: string;
  cooldownHours: number;
  relatedGoalId?: string;
  relatedTaskId?: string;
  suggestedAssistantMessage?: string;
}

const LAST_WEEK_KEY = (uid: string | null) => `assistant.lastSeenWeek:${uid ?? "anon"}`;
const COOLDOWN_KEY = (uid: string | null, type: NudgeType) => `assistant.nudgeCooldown:${uid ?? "anon"}.${type}`;
const LEGACY_NUDGE_SHOWN_KEY = (uid: string | null) => `assistant.nudgeShown:${uid ?? "anon"}.${todayISO()}`;
const IDLE_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "scroll", "touchstart"] as const;
const DEFAULT_EXPIRES_HOURS = 24;
const INACTIVE_NUDGE: NudgeState = {
  active: false,
  id: "",
  type: null,
  reason: null,
  priority: "low",
  title: "",
  message: "",
  actionLabel: "",
  createdAt: "",
  expiresAt: "",
  cooldownKey: "",
};

function todayISO(): string {
  return formatDateInputValue(new Date());
}

function canUseLocalStorage(): boolean {
  if (typeof localStorage === "undefined") return false;

  try {
    localStorage.getItem("assistant.storage.check");
    return true;
  } catch {
    return false;
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeActivityListeners(listener: EventListener): void {
  for (const eventName of ACTIVITY_EVENTS) {
    window.removeEventListener(eventName, listener);
  }
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function isCooldownActive(key: string, now: Date): boolean {
  const raw = readStorage(key);
  if (!raw) return false;

  const until = new Date(raw).getTime();
  return Number.isFinite(until) && until > now.getTime();
}

function storeCooldown(key: string, now: Date, hours: number): boolean {
  return writeStorage(key, addHours(now, hours).toISOString());
}

function memoryText(memoryItems: Array<{ content?: string; tags?: string[] }>): string {
  return memoryItems
    .map((item) => `${item.content ?? ""} ${(item.tags ?? []).join(" ")}`)
    .join(" ")
    .toLowerCase();
}

function shouldSuppressForMemory(memoryItems: Array<{ content?: string; tags?: string[] }>, now: Date): boolean {
  const text = memoryText(memoryItems);
  const hour = now.getHours();
  const noNight =
    text.includes("đừng nhắc buổi tối") ||
    text.includes("không nhắc buổi tối") ||
    text.includes("đừng nhắc tối") ||
    text.includes("no evening reminders") ||
    text.includes("no night reminders");

  if (noNight && hour >= 20) return true;

  const prefersMorning =
    text.includes("thích nhắc sáng") || text.includes("nhắc buổi sáng") || text.includes("morning reminders");
  return prefersMorning && (hour < 5 || hour >= 12);
}

function hasCooldown(candidate: ProactiveNudgeCandidate, userId: string | null, now: Date): boolean {
  return isCooldownActive(COOLDOWN_KEY(userId, candidate.type), now);
}

function buildNudgeState(candidate: ProactiveNudgeCandidate, userId: string | null, now: Date): NudgeState {
  const cooldownKey = COOLDOWN_KEY(userId, candidate.type);
  return {
    active: true,
    id: `${candidate.type}:${formatDateInputValue(now)}`,
    type: candidate.type,
    reason: candidate.type,
    priority: candidate.priority,
    title: candidate.title,
    message: candidate.message,
    actionLabel: candidate.actionLabel,
    route: candidate.route,
    href: candidate.href,
    createdAt: now.toISOString(),
    expiresAt: addHours(now, DEFAULT_EXPIRES_HOURS).toISOString(),
    cooldownKey,
    relatedGoalId: candidate.relatedGoalId,
    relatedTaskId: candidate.relatedTaskId,
    suggestedAssistantMessage: candidate.suggestedAssistantMessage,
  };
}

function daysSince(dateValue: string | null, now: Date): number | null {
  if (!dateValue) return null;
  const timestamp = new Date(`${dateValue}T00:00:00`).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.floor((new Date(formatDateInputValue(now)).getTime() - timestamp) / (24 * 60 * 60 * 1000));
}

function selectNudgeCandidate(context: AssistantContext): ProactiveNudgeCandidate | null {
  const nextStep = context.pageContext?.nextSuggestedStep?.toLowerCase() ?? "";
  const currentStep = context.pageContext?.currentStep?.toLowerCase() ?? "";
  const goalsWithoutPlan = context.pageContext?.formDraft?.goalsWithoutTwelveWeekPlan ?? 0;
  const firstGoal = context.goals[0];

  if (
    context.authSyncMode?.authState === "signed_in" &&
    ["error", "offline"].includes(context.authSyncMode.syncState)
  ) {
    return {
      type: "sync_error",
      priority: "medium",
      title: "Sync cần chú ý",
      message:
        context.authSyncMode.syncState === "offline"
          ? "Bạn đang offline. Tiến độ vẫn lưu cục bộ."
          : "Sync đang lỗi. Kiểm tra trước khi đổi thiết bị nhé.",
      actionLabel: "Mở Settings",
      route: "/settings",
      cooldownHours: 12,
      suggestedAssistantMessage: "Giúp mình kiểm tra trạng thái sync và cách giữ dữ liệu an toàn.",
    };
  }

  if (nextStep.includes("onboarding") || currentStep.includes("onboarding")) {
    return {
      type: "stuck_onboarding",
      priority: "medium",
      title: "Tiếp tục onboarding",
      message: "Bạn còn một bước onboarding. Làm tiếp để mở flow mục tiêu nhé.",
      actionLabel: "Tiếp tục",
      route: "/onboarding",
      cooldownHours: 24,
      suggestedAssistantMessage: "Giúp mình hoàn tất bước onboarding tiếp theo.",
    };
  }

  if (context.goals.length === 0 || nextStep.includes("smart")) {
    return {
      type: "missing_smart_goal",
      priority: "high",
      title: "Cần SMART goal",
      message: "Bạn chưa có SMART goal rõ. Viết một mục tiêu đo được trước nhé.",
      actionLabel: "Tạo SMART goal",
      route: "/smart-goal",
      cooldownHours: 24,
      suggestedAssistantMessage: "Giúp mình biến ý tưởng hiện tại thành SMART goal.",
    };
  }

  if (context.feasibility === null || nextStep.includes("feasibility")) {
    return {
      type: "missing_feasibility_check",
      priority: "high",
      title: "Kiểm tra khả thi",
      message: "Goal đã có. Chạy feasibility check để biết nút thắt chính nhé.",
      actionLabel: "Kiểm tra",
      route: "/feasibility",
      cooldownHours: 24,
      relatedGoalId: firstGoal?.id,
      suggestedAssistantMessage: "Giúp mình kiểm tra tính khả thi của goal này.",
    };
  }

  if ((context.currentWeek === null && goalsWithoutPlan > 0) || nextStep.includes("12-week")) {
    return {
      type: "missing_12_week_plan",
      priority: "high",
      title: "Cần 12-week plan",
      message: "Goal đã đủ điều kiện. Tạo 12-week plan để có việc tuần này.",
      actionLabel: "Tạo plan",
      route: "/12-week-plan",
      cooldownHours: 24,
      relatedGoalId: firstGoal?.id,
      suggestedAssistantMessage: "Giúp mình tạo 12-week plan từ goal hiện tại.",
    };
  }

  const overdueCount = context.stuckSignals?.overdueOpenCount ?? 0;
  if (overdueCount > 0) {
    const task = context.stuckSignals.overdueTasks[0];
    return {
      type: "overdue_tasks",
      priority: "high",
      title: "Task quá hạn",
      message: `${overdueCount} task quá hạn. Chọn 1 việc nhỏ để rescue hôm nay nhé.`,
      actionLabel: "Xem task",
      route: "/today",
      cooldownHours: 12,
      relatedTaskId: task?.id,
      suggestedAssistantMessage: "Giúp mình rescue hoặc replan các task quá hạn mà không quá tải.",
    };
  }

  const openTodayTask = context.todayTasks.find((task) => !task.done);
  if (openTodayTask) {
    return {
      type: "today_task_pending",
      priority: "medium",
      title: "Task hôm nay",
      message: `Hôm nay còn: ${openTodayTask.title}. Làm tiếp một bước nhỏ nhé?`,
      actionLabel: "Mở Today",
      route: "/today",
      cooldownHours: 6,
      relatedTaskId: openTodayTask.id,
      suggestedAssistantMessage: `Bạn muốn mình giúp chia nhỏ task "${openTodayTask.title}" không?`,
    };
  }

  if (context.currentWeek !== null) {
    const reviewedWeek = context.latestWeeklyReview?.weekNumber ?? 0;
    if (reviewedWeek < context.currentWeek - 1) {
      return {
        type: "weekly_review_due",
        priority: "medium",
        title: "Review tuần đến hạn",
        message: `Bạn chưa review tuần ${context.currentWeek - 1}. Làm bản ngắn 3 phút nhé?`,
        actionLabel: "Review tuần",
        route: "/weekly-review",
        cooldownHours: 24,
        suggestedAssistantMessage: "Dẫn mình qua weekly review ngắn cho tuần vừa rồi.",
      };
    }
  }

  const reflectionAge = daysSince(context.lastReflectionDate, new Date());
  if (reflectionAge === null || reflectionAge >= 7) {
    return {
      type: "reflection_due",
      priority: "low",
      title: "Reflection ngắn",
      message: "Đã lâu chưa reflection. Ghi 3 dòng để chốt bài học tuần này nhé.",
      actionLabel: "Viết reflection",
      route: "/reflection",
      cooldownHours: 24,
      suggestedAssistantMessage: "Gợi ý cho mình 3 câu hỏi reflection ngắn.",
    };
  }

  return null;
}

export function useProactiveNudge(panelOpen: boolean): {
  nudge: NudgeState;
  dismissNudge: (cooldownKey?: string) => void;
  actOnNudge: () => void;
} {
  const auth = useOptionalAuthContext();
  const location = useLocation();
  const navigate = useNavigate();
  const route = location.pathname;
  const userId = auth?.user?.uid ?? null;
  const [nudge, setNudge] = useState<NudgeState>(INACTIVE_NUDGE);
  const idleTimerRef = useRef<number | null>(null);
  const activeCandidateRef = useRef<ProactiveNudgeCandidate | null>(null);
  const hasTriggeredThisLoadRef = useRef(false);
  const scopeRef = useRef<string | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current === null) return;
    window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  }, []);

  const dismissNudge = useCallback(
    (cooldownKey?: string) => {
      const now = new Date();
      const candidate = activeCandidateRef.current;
      if (candidate) {
        storeCooldown(cooldownKey ?? COOLDOWN_KEY(userId, candidate.type), now, candidate.cooldownHours);
        recordAssistantEvent({
          type: "assistant_nudge_dismissed",
          userId,
          route,
          nudgeType: candidate.type,
          metadata: { cooldownHours: candidate.cooldownHours },
        });
      } else if (cooldownKey) {
        storeCooldown(cooldownKey, now, 24);
      }

      activeCandidateRef.current = null;
      hasTriggeredThisLoadRef.current = true;
      clearIdleTimer();
      setNudge(INACTIVE_NUDGE);
    },
    [clearIdleTimer, route, userId],
  );

  const actOnNudge = useCallback(() => {
    const current = nudge;
    dismissNudge(current.cooldownKey);
    if (current.route) {
      navigate(current.route);
    } else if (current.href && typeof window !== "undefined") {
      window.location.assign(current.href);
    }
  }, [dismissNudge, navigate, nudge]);

  useEffect(() => {
    const nextScope = `${route}:${userId ?? "anon"}`;
    if (scopeRef.current === nextScope) return;

    scopeRef.current = nextScope;
    hasTriggeredThisLoadRef.current = false;
    activeCandidateRef.current = null;
    clearIdleTimer();
    setNudge(INACTIVE_NUDGE);
  }, [clearIdleTimer, route, userId]);

  useEffect(() => {
    if (panelOpen) {
      hasTriggeredThisLoadRef.current = true;
      dismissNudge();
    }
  }, [dismissNudge, panelOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || panelOpen || hasTriggeredThisLoadRef.current) return undefined;
    // Kill-switch: tắt proactive nudge qua flag mà không phá assistant chat.
    if (!isAssistantProactiveNudgeEnabled()) return undefined;
    if (!canUseLocalStorage()) return undefined;

    let mounted = true;

    const activateNudge = (candidate: ProactiveNudgeCandidate) => {
      if (!mounted || panelOpen || hasTriggeredThisLoadRef.current) return;
      const now = new Date();
      if (hasCooldown(candidate, userId, now)) return;
      if (!storeCooldown(COOLDOWN_KEY(userId, candidate.type), now, candidate.cooldownHours)) return;

      hasTriggeredThisLoadRef.current = true;
      activeCandidateRef.current = candidate;
      clearIdleTimer();
      setNudge(buildNudgeState(candidate, userId, now));
      recordAssistantEvent({
        type: "assistant_nudge_shown",
        userId,
        route,
        nudgeType: candidate.type,
        metadata: { priority: candidate.priority, cooldownHours: candidate.cooldownHours },
      });
    };

    const scheduleIdleTimer = () => {
      clearIdleTimer();
      idleTimerRef.current = window.setTimeout(() => {
        activateNudge({
          type: "stuck_onboarding",
          priority: "low",
          title: "Bạn đang kẹt?",
          message: "Bạn đang phân vân chỗ nào không? Hỏi mình thử xem.",
          actionLabel: "Hỏi trợ lý",
          cooldownHours: 12,
          suggestedAssistantMessage: "Mình đang kẹt ở bước hiện tại, hãy giúp mình chọn bước tiếp theo.",
        });
      }, IDLE_MS);
    };

    const context = buildAssistantContext(undefined, route);
    const memoryItems = getMemoryItems(userId) || [];
    if (shouldSuppressForMemory(memoryItems, new Date())) return undefined;

    const currentWeek = context.currentWeek;
    if (currentWeek !== null) {
      const lastSeenWeekRaw = readStorage(LAST_WEEK_KEY(userId));
      const lastSeenWeekNumber = lastSeenWeekRaw === null ? null : Number(lastSeenWeekRaw);
      const isNewWeek =
        lastSeenWeekNumber === null || !Number.isFinite(lastSeenWeekNumber) || lastSeenWeekNumber < currentWeek;

      if (isNewWeek && writeStorage(LAST_WEEK_KEY(userId), String(currentWeek))) {
        activateNudge({
          type: "weekly_review_due",
          priority: "medium",
          title: "Tuần mới bắt đầu",
          message: `Tuần ${currentWeek} bắt đầu rồi. Muốn mình tóm tắt và chọn ưu tiên không?`,
          actionLabel: "Xem tuần",
          route: "/today",
          cooldownHours: 24,
          suggestedAssistantMessage: `Tóm tắt tuần ${currentWeek} và giúp mình chọn ưu tiên chính.`,
        });
        return undefined;
      }
    }

    const selected = selectNudgeCandidate(context);
    if (selected) {
      activateNudge(selected);
      return undefined;
    }

    const handleActivity: EventListener = () => {
      if (panelOpen || hasTriggeredThisLoadRef.current) return;
      scheduleIdleTimer();
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    scheduleIdleTimer();

    return () => {
      mounted = false;
      clearIdleTimer();
      removeActivityListeners(handleActivity);
    };
  }, [clearIdleTimer, panelOpen, route, userId]);

  return { nudge, dismissNudge, actOnNudge };
}

export const __proactiveNudgeTestUtils = {
  selectNudgeCandidate,
  shouldSuppressForMemory,
  COOLDOWN_KEY,
  LEGACY_NUDGE_SHOWN_KEY,
};

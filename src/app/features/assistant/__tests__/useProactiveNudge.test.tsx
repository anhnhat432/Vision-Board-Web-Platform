import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type AssistantContext, buildAssistantContext } from "../buildAssistantContext";
import { useProactiveNudge } from "../useProactiveNudge";

const authContextMock = vi.hoisted(() => ({
  useOptionalAuthContext: vi.fn(),
}));

const assistantMemoryMock = vi.hoisted(() => ({
  getMemoryItems: vi.fn().mockReturnValue([]),
}));

vi.mock("../assistantMemory", () => ({
  getMemoryItems: assistantMemoryMock.getMemoryItems,
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useOptionalAuthContext: authContextMock.useOptionalAuthContext,
}));

vi.mock("../buildAssistantContext", () => ({
  buildAssistantContext: vi.fn(),
}));

const mockedBuildAssistantContext = vi.mocked(buildAssistantContext);
const TODAY = "2026-05-19";
const IDLE_MS = 5 * 60 * 1000;

function setAuthContext(userId: string | null = "user-1") {
  authContextMock.useOptionalAuthContext.mockReturnValue({
    user: userId ? { uid: userId } : null,
    userProfile: null,
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    login: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
  });
}

type ContextOverrides = {
  currentWeek?: number | null;
  goals?: Array<{ id: string; title: string; progress: number }>;
  todayTasks?: Array<{ id: string; title: string; done: boolean }>;
  lastReflectionDate?: string | null;
  feasibility?: {
    readinessScore: number | null;
    bottleneckLabel: string | null;
    bottleneckAction: string | null;
  } | null;
  latestWeeklyReview?: {
    weekNumber: number;
    leadCompletionPercent: number | null;
    mainObstacle: string | null;
    nextWeekPriority: string | null;
    workloadDecision: string | null;
    reviewedAt: string | null;
  } | null;
  overdueOpenCount?: number;
  overdueTasks?: Array<{ id: string; title: string; scheduledDate: string; isCore: boolean }>;
  nextSuggestedStep?: string | null;
  goalsWithoutTwelveWeekPlan?: number;
  authSyncMode?: {
    authState: "signed_in" | "anonymous";
    syncState: "synced" | "syncing" | "error" | "offline" | "disabled";
  };
};

function hasOverride(overrides: ContextOverrides, key: keyof ContextOverrides): boolean {
  return key in overrides;
}

function makeContext(overrides: ContextOverrides = {}): AssistantContext {
  const currentWeek = hasOverride(overrides, "currentWeek") ? (overrides.currentWeek ?? null) : 3;
  const feasibility = hasOverride(overrides, "feasibility")
    ? (overrides.feasibility ?? null)
    : { readinessScore: 80, bottleneckLabel: null, bottleneckAction: null };

  return {
    currentWeek,
    weeksTotal: 12,
    goals: overrides.goals ?? [{ id: "goal-1", title: "Run marathon", progress: 20 }],
    todayTasks: overrides.todayTasks ?? [],
    lastReflectionDate: overrides.lastReflectionDate ?? TODAY,
    feasibility,
    latestWeeklyReview: overrides.latestWeeklyReview ?? {
      weekNumber: 2,
      leadCompletionPercent: 80,
      mainObstacle: null,
      nextWeekPriority: null,
      workloadDecision: null,
      reviewedAt: TODAY,
    },
    stuckSignals: {
      latestObstacle: null,
      missedCommitments: [],
      overdueOpenCount: overrides.overdueOpenCount ?? 0,
      overdueTasks: overrides.overdueTasks ?? [],
    },
    trend: { completionLast4Weeks: [], direction: "unknown" as const },
    streak: { daysWithCompletedTask: 0 },
    upcomingDeadlines: [],
    pageContext: {
      route: "/",
      currentStep: null,
      nextSuggestedStep: overrides.nextSuggestedStep ?? null,
      formDraft: {
        goalsWithoutTwelveWeekPlan: overrides.goalsWithoutTwelveWeekPlan,
      },
    },
    authSyncMode: overrides.authSyncMode ?? { authState: "anonymous" as const, syncState: "disabled" as const },
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("useProactiveNudge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
    localStorage.clear();
    vi.clearAllMocks();
    setAuthContext("user-1");
    assistantMemoryMock.getMemoryItems.mockReturnValue([]);
    mockedBuildAssistantContext.mockReturnValue(makeContext());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("detects onboarding/core-flow next-step nudge", () => {
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: null, nextSuggestedStep: "onboarding" }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({
      active: true,
      type: "stuck_onboarding",
      priority: "medium",
      route: "/onboarding",
    });
  });

  it("detects missing SMART goal nudge", () => {
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: null, goals: [], feasibility: null }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({ type: "missing_smart_goal", route: "/smart-goal-setup" });
  });

  it("detects missing feasibility check nudge", () => {
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: null, feasibility: null }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({ type: "missing_feasibility_check", route: "/feasibility" });
  });

  it("detects missing 12-week plan nudge", () => {
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: null, goalsWithoutTwelveWeekPlan: 1 }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({ type: "missing_12_week_plan", route: "/12-week-setup" });
  });

  it("shows new-week nudge when current week is newer than last seen week", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "2");
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: 3 }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({
      active: true,
      type: "weekly_review_due",
      message: "Tuần 3 bắt đầu rồi. Muốn mình tóm tắt và chọn ưu tiên không?",
    });
    expect(localStorage.getItem("assistant.lastSeenWeek:user-1")).toBe("3");
    expect(localStorage.getItem("assistant.nudgeCooldown:user-1.weekly_review_due")).toBeTruthy();
  });

  it("does not nudge when current week matches last seen week and no rule matches", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: 3 }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge.active).toBe(false);
  });

  it("detects today task pending nudge", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    mockedBuildAssistantContext.mockReturnValue(
      makeContext({ todayTasks: [{ id: "task-1", title: "Write outline", done: false }] }),
    );

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({
      type: "today_task_pending",
      relatedTaskId: "task-1",
      route: "/today",
    });
  });

  it("detects overdue tasks nudge", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    mockedBuildAssistantContext.mockReturnValue(
      makeContext({
        overdueOpenCount: 2,
        overdueTasks: [{ id: "task-old", title: "Missed task", scheduledDate: "2026-05-18", isCore: true }],
      }),
    );

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({
      type: "overdue_tasks",
      relatedTaskId: "task-old",
      message: "2 task quá hạn. Chọn 1 việc nhỏ để rescue hôm nay nhé.",
    });
  });

  it("detects weekly review due nudge", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "4");
    mockedBuildAssistantContext.mockReturnValue(
      makeContext({
        currentWeek: 4,
        latestWeeklyReview: {
          weekNumber: 2,
          leadCompletionPercent: 70,
          mainObstacle: null,
          nextWeekPriority: null,
          workloadDecision: null,
          reviewedAt: TODAY,
        },
      }),
    );

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({ type: "weekly_review_due", route: "/12-week-system?tab=week" });
  });

  it("detects reflection due nudge", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    mockedBuildAssistantContext.mockReturnValue(makeContext({ lastReflectionDate: "2026-05-01" }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({ type: "reflection_due", route: "/journal" });
  });

  it("detects sync error nudge without backend calls", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    mockedBuildAssistantContext.mockReturnValue(
      makeContext({ authSyncMode: { authState: "signed_in", syncState: "error" } }),
    );

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({ type: "sync_error", route: "/settings" });
  });

  it("cooldown prevents repeated nudge", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    localStorage.setItem("assistant.nudgeCooldown:user-1.today_task_pending", "2026-05-19T18:00:00.000Z");
    mockedBuildAssistantContext.mockReturnValue(
      makeContext({ todayTasks: [{ id: "task-1", title: "Write outline", done: false }] }),
    );

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge.active).toBe(false);
  });

  it("dismiss stores cooldown", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    mockedBuildAssistantContext.mockReturnValue(
      makeContext({ todayTasks: [{ id: "task-1", title: "Write outline", done: false }] }),
    );

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    act(() => {
      result.current.dismissNudge();
    });

    expect(result.current.nudge.active).toBe(false);
    expect(localStorage.getItem("assistant.nudgeCooldown:user-1.today_task_pending")).toBeTruthy();
  });

  it("localStorage unavailable does not crash", () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => renderHook(() => useProactiveNudge(false), { wrapper })).not.toThrow();

    getItemSpy.mockRestore();
  });

  it("memory preference don't remind at night suppresses nudge", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    vi.setSystemTime(new Date(`${TODAY}T21:00:00`));
    mockedBuildAssistantContext.mockReturnValue(
      makeContext({ todayTasks: [{ id: "task-1", title: "Write outline", done: false }] }),
    );
    assistantMemoryMock.getMemoryItems.mockReturnValue([
      {
        id: "mem1",
        userId: "user-1",
        type: "user_preference",
        content: "đừng nhắc buổi tối",
        tags: ["preferred_time"],
        createdAt: new Date().toISOString(),
      },
    ]);

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge.active).toBe(false);
  });

  it("shows idle nudge after five minutes without activity", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    mockedBuildAssistantContext.mockReturnValue(makeContext());

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    act(() => {
      vi.advanceTimersByTime(IDLE_MS + 1);
    });

    expect(result.current.nudge).toMatchObject({
      active: true,
      type: "stuck_onboarding",
      message: "Bạn đang phân vân chỗ nào không? Hỏi mình thử xem.",
    });
  });

  it("scopes localStorage keys by user id", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-a", "2");
    localStorage.setItem("assistant.lastSeenWeek:user-b", "3");
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: 3 }));

    setAuthContext("user-a");
    const { result: firstResult, unmount } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(firstResult.current.nudge.type).toBe("weekly_review_due");
    expect(localStorage.getItem("assistant.nudgeCooldown:user-a.weekly_review_due")).toBeTruthy();
    expect(localStorage.getItem("assistant.nudgeCooldown:user-b.weekly_review_due")).toBeNull();

    unmount();
    setAuthContext("user-b");
    const { result: secondResult } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(secondResult.current.nudge.active).toBe(false);
    expect(localStorage.getItem("assistant.lastSeenWeek:user-b")).toBe("3");
  });
});

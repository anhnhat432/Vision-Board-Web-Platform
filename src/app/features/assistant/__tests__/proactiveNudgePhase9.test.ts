import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantMascot } from "../AssistantMascot";
import { type AssistantContext, buildAssistantContext } from "../buildAssistantContext";
import type { NudgeState } from "../useProactiveNudge";
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
  latestWeeklyReview?: AssistantContext["latestWeeklyReview"];
  overdueOpenCount?: number;
  overdueTasks?: AssistantContext["stuckSignals"]["overdueTasks"];
  currentStep?: string | null;
  nextSuggestedStep?: string | null;
  goalsWithoutTwelveWeekPlan?: number;
  authSyncMode?: NonNullable<AssistantContext["authSyncMode"]>;
};

function hasOverride(overrides: ContextOverrides, key: keyof ContextOverrides): boolean {
  return key in overrides;
}

function makeContext(overrides: ContextOverrides = {}): AssistantContext {
  const currentWeek = hasOverride(overrides, "currentWeek") ? (overrides.currentWeek ?? null) : 3;
  const feasibility = hasOverride(overrides, "feasibility")
    ? (overrides.feasibility ?? null)
    : { readinessScore: 80, bottleneckLabel: null, bottleneckAction: null };
  const latestWeeklyReview = hasOverride(overrides, "latestWeeklyReview")
    ? (overrides.latestWeeklyReview ?? null)
    : {
        weekNumber: 2,
        leadCompletionPercent: 80,
        mainObstacle: null,
        nextWeekPriority: null,
        workloadDecision: null,
        reviewedAt: TODAY,
      };

  return {
    currentWeek,
    weeksTotal: 12,
    goals: overrides.goals ?? [{ id: "goal-1", title: "Run marathon", progress: 20 }],
    todayTasks: overrides.todayTasks ?? [],
    lastReflectionDate: overrides.lastReflectionDate ?? TODAY,
    feasibility,
    latestWeeklyReview,
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
      currentStep: overrides.currentStep ?? null,
      nextSuggestedStep: overrides.nextSuggestedStep ?? null,
      formDraft: {
        goalsWithoutTwelveWeekPlan: overrides.goalsWithoutTwelveWeekPlan,
      },
    },
    authSyncMode: overrides.authSyncMode ?? { authState: "anonymous" as const, syncState: "disabled" as const },
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return createElement(MemoryRouter, null, children);
}

function seedSeenWeek() {
  localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
}

describe("Phase 9 proactive nudges", () => {
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

    expect(result.current.nudge).toMatchObject({ active: true, type: "stuck_onboarding", route: "/onboarding" });
  });

  it("detects today task pending nudge", () => {
    seedSeenWeek();
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
    seedSeenWeek();
    mockedBuildAssistantContext.mockReturnValue(
      makeContext({
        overdueOpenCount: 2,
        overdueTasks: [{ id: "task-old", title: "Missed task", scheduledDate: "2026-05-18", isCore: true }],
      }),
    );

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({ type: "overdue_tasks", relatedTaskId: "task-old" });
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
    seedSeenWeek();
    mockedBuildAssistantContext.mockReturnValue(makeContext({ lastReflectionDate: "2026-05-01" }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({ type: "reflection_due", route: "/journal" });
  });

  it("cooldown prevents repeated nudge", () => {
    seedSeenWeek();
    localStorage.setItem("assistant.nudgeCooldown:user-1.today_task_pending", "2026-05-19T18:00:00.000Z");
    mockedBuildAssistantContext.mockReturnValue(
      makeContext({ todayTasks: [{ id: "task-1", title: "Write outline", done: false }] }),
    );

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge.active).toBe(false);
  });

  it("dismiss stores cooldown", () => {
    seedSeenWeek();
    mockedBuildAssistantContext.mockReturnValue(
      makeContext({ todayTasks: [{ id: "task-1", title: "Write outline", done: false }] }),
    );

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    act(() => result.current.dismissNudge());

    expect(localStorage.getItem("assistant.nudgeCooldown:user-1.today_task_pending")).toBeTruthy();
    expect(result.current.nudge.active).toBe(false);
  });

  it("localStorage unavailable does not crash", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => renderHook(() => useProactiveNudge(false), { wrapper })).not.toThrow();
  });

  it("memory preference don't remind at night suppresses nudge", () => {
    seedSeenWeek();
    vi.setSystemTime(new Date(`${TODAY}T21:00:00`));
    mockedBuildAssistantContext.mockReturnValue(
      makeContext({ todayTasks: [{ id: "task-1", title: "Write outline", done: false }] }),
    );
    assistantMemoryMock.getMemoryItems.mockReturnValue([{ content: "đừng nhắc buổi tối", tags: ["preferred_time"] }]);

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge.active).toBe(false);
  });

  it("shows idle nudge after five minutes without activity", () => {
    seedSeenWeek();
    mockedBuildAssistantContext.mockReturnValue(makeContext());

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    act(() => vi.advanceTimersByTime(IDLE_MS + 1));

    expect(result.current.nudge).toMatchObject({
      type: "stuck_onboarding",
      message: "Bạn đang phân vân chỗ nào không? Hỏi mình thử xem.",
    });
  });

  it("UI renders nudge and dismiss works", () => {
    const dismissNudge = vi.fn();
    const proactiveNudge: NudgeState = {
      active: true,
      id: "today_task_pending:2026-05-19",
      type: "today_task_pending",
      reason: "today_task_pending",
      priority: "medium",
      title: "Task hôm nay",
      message: "Hôm nay còn: Write outline. Làm tiếp một bước nhỏ nhé?",
      actionLabel: "Mở Today",
      route: "/today",
      createdAt: "2026-05-19T12:00:00.000Z",
      expiresAt: "2026-05-20T12:00:00.000Z",
      cooldownKey: "assistant.nudgeCooldown:user-1.today_task_pending",
    };

    render(
      createElement(AssistantMascot, {
        isOpen: false,
        onClick: vi.fn(),
        nudge: proactiveNudge,
        dismissNudge,
        position: { x: 120, y: 180 },
        isDragging: false,
        handlePointerDown: vi.fn(),
        wasDragged: false,
      }),
    );

    act(() => vi.advanceTimersByTime(500));

    expect(screen.getAllByText(proactiveNudge.message).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Ẩn gợi ý" })[0]);

    expect(dismissNudge).toHaveBeenCalled();
  });
});

import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAssistantContext } from "../buildAssistantContext";
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

function makeContext(overrides: { currentWeek?: number | null; overdueOpenCount?: number } = {}) {
  return {
    currentWeek: overrides.currentWeek ?? 3,
    weeksTotal: 12,
    goals: [],
    todayTasks: [],
    lastReflectionDate: null,
    feasibility: null,
    latestWeeklyReview: null,
    stuckSignals: {
      latestObstacle: null,
      missedCommitments: [],
      overdueOpenCount: overrides.overdueOpenCount ?? 0,
      overdueTasks: [],
    },
    trend: { completionLast4Weeks: [], direction: "unknown" as const },
    streak: { daysWithCompletedTask: 0 },
    upcomingDeadlines: [],
    pageContext: {
      route: "/",
      currentStep: null,
      nextSuggestedStep: null,
      formDraft: {},
    },
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
    mockedBuildAssistantContext.mockReturnValue(makeContext());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows new-week nudge when current week is newer than last seen week", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "2");
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: 3 }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({
      active: true,
      reason: "new-week",
      message: "Tuần 3 bắt đầu rồi. Muốn mình tóm tắt và chọn ưu tiên không?",
    });
    expect(localStorage.getItem("assistant.lastSeenWeek:user-1")).toBe("3");
    expect(localStorage.getItem(`assistant.nudgeShown:user-1.${TODAY}`)).toBe("1");
  });

  it("does not nudge when current week matches last seen week", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: 3 }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge.active).toBe(false);
  });

  it("shows overdue nudge when week is already seen and overdue tasks exist", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: 3, overdueOpenCount: 2 }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({
      active: true,
      reason: "overdue",
      message: "2 task đang quá hạn. Cùng xử lý từng cái nhé?",
    });
  });

  it("dismisses active nudge and marks today as shown", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "2");
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: 3 }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    act(() => {
      result.current.dismissNudge();
    });

    expect(result.current.nudge.active).toBe(false);
    expect(localStorage.getItem(`assistant.nudgeShown:user-1.${TODAY}`)).toBe("1");
  });

  it("does not show nudge when panel is open on mount", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "2");
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: 3, overdueOpenCount: 2 }));

    const { result } = renderHook(() => useProactiveNudge(true), { wrapper });

    expect(result.current.nudge.active).toBe(false);
  });

  it("shows idle nudge after five minutes without activity", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: 3, overdueOpenCount: 0 }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    act(() => {
      vi.advanceTimersByTime(IDLE_MS + 1);
    });

    expect(result.current.nudge).toMatchObject({
      active: true,
      reason: "idle",
      message: "Bạn đang phân vân chỗ nào không? Hỏi mình thử xem.",
    });
  });

  it("resets idle timer when user moves before five minutes", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: 3, overdueOpenCount: 0 }));

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    act(() => {
      vi.advanceTimersByTime(IDLE_MS - 1);
      window.dispatchEvent(new Event("mousemove"));
      vi.advanceTimersByTime(2);
    });

    expect(result.current.nudge.active).toBe(false);
  });

  it("scopes localStorage keys by user id", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-a", "2");
    localStorage.setItem("assistant.lastSeenWeek:user-b", "3");
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: 3 }));

    setAuthContext("user-a");
    const { result: firstResult, unmount } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(firstResult.current.nudge.reason).toBe("new-week");
    expect(localStorage.getItem(`assistant.nudgeShown:user-a.${TODAY}`)).toBe("1");
    expect(localStorage.getItem(`assistant.nudgeShown:user-b.${TODAY}`)).toBeNull();

    unmount();
    setAuthContext("user-b");
    const { result: secondResult } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(secondResult.current.nudge.active).toBe(false);
    expect(localStorage.getItem("assistant.lastSeenWeek:user-b")).toBe("3");
  });

  it("shows personalized weekend nudge when user has weekend preference and today is weekend", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    // Thiết lập hệ thống chạy vào ngày thứ 7 (2026-05-23)
    vi.setSystemTime(new Date(`2026-05-23T12:00:00`));
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: 3 }));
    assistantMemoryMock.getMemoryItems.mockReturnValue([
      {
        id: "mem1",
        userId: "user-1",
        type: "user_preference",
        content: "rảnh cuối tuần",
        tags: ["preferred_time"],
        createdAt: new Date().toISOString(),
      },
    ]);

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({
      active: true,
      reason: "personalized",
      message: "Đang trong thời gian rảnh cuối tuần của bạn. Dành 10 phút xử lý task nhé?",
    });
  });

  it("shows busy-personalized overdue nudge when user has busy obstacle", () => {
    localStorage.setItem("assistant.lastSeenWeek:user-1", "3");
    // Quay về ngày thường
    vi.setSystemTime(new Date(`${TODAY}T12:00:00`));
    mockedBuildAssistantContext.mockReturnValue(makeContext({ currentWeek: 3, overdueOpenCount: 2 }));
    assistantMemoryMock.getMemoryItems.mockReturnValue([
      {
        id: "mem2",
        userId: "user-1",
        type: "user_preference",
        content: "dạo này bận rộn",
        tags: ["obstacle"],
        createdAt: new Date().toISOString(),
      },
    ]);

    const { result } = renderHook(() => useProactiveNudge(false), { wrapper });

    expect(result.current.nudge).toMatchObject({
      active: true,
      reason: "overdue",
      message: "Biết bạn dạo này khá bận rộn, nhưng có 2 việc đã quá hạn. Dành 5 phút giải quyết 1 việc nhỏ nhé?",
    });
  });
});

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantPageContextHint } from "../buildAssistantContext";
import { useAssistant } from "../useAssistant";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const pageContextMock = vi.hoisted(() => ({
  useAssistantPageContextValue: vi.fn<() => AssistantPageContextHint | null>(() => null),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("../AssistantPageContextProvider", () => ({
  useAssistantPageContextValue: pageContextMock.useAssistantPageContextValue,
}));

vi.mock("../buildAssistantContext", () => ({
  buildAssistantContext: vi.fn(() => ({
    currentWeek: 5,
    weeksTotal: 12,
    goals: [],
    todayTasks: [],
    lastReflectionDate: null,
    feasibility: null,
    latestWeeklyReview: null,
    stuckSignals: {
      latestObstacle: null,
      missedCommitments: [],
      overdueOpenCount: 0,
      overdueTasks: [],
    },
    trend: { completionLast4Weeks: [], direction: "unknown" },
    streak: { daysWithCompletedTask: 0 },
    upcomingDeadlines: [],
  })),
}));

vi.mock("../assistantApi", () => ({
  sendAssistantMessageStream: vi.fn(),
}));

vi.mock("../executeAction", () => ({
  executeAction: vi.fn(),
}));

import { sendAssistantMessageStream } from "../assistantApi";
import {
  createTaskSelectionClarification,
  getPendingAssistantClarification,
  setPendingAssistantClarification,
} from "../assistantConversationState";
import { buildAssistantContext } from "../buildAssistantContext";
import { executeAction } from "../executeAction";

const mockedSendAssistantMessageStream = vi.mocked(sendAssistantMessageStream);
const mockedExecuteAction = vi.mocked(executeAction);
const mockedBuildAssistantContext = vi.mocked(buildAssistantContext);

function setAuthContext(userId: string | null = null) {
  authContextMock.useAuthContext.mockReturnValue({
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

describe("useAssistant onboarding", () => {
  const TEST_USER_ID = "test-user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
    setAuthContext(TEST_USER_ID);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("injects welcome message on first open (localStorage empty)", () => {
    const { result } = renderHook(() => useAssistant());

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({
      role: "assistant",
      isWelcome: true,
    });
    expect(localStorage.getItem("assistant.onboarded:test-user-123")).toBe("1");
  });

  it("does not inject welcome message on second open (onboarded flag exists)", () => {
    localStorage.setItem("assistant.onboarded:test-user-123", "1");

    const { result } = renderHook(() => useAssistant());

    expect(result.current.messages).toHaveLength(0);
  });

  it("clearHistory resets onboarded flag and allows welcome to reappear", () => {
    const { result } = renderHook(() => useAssistant());

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].isWelcome).toBe(true);

    act(() => {
      result.current.clearHistory();
    });

    // After clear, welcome message will be re-injected by useEffect
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].isWelcome).toBe(true);
    expect(localStorage.getItem("assistant.onboarded:test-user-123")).toBe("1");
  });

  it("does not persist welcome message to localStorage", () => {
    const { result } = renderHook(() => useAssistant());

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].isWelcome).toBe(true);

    // Wait for debounce
    vi.advanceTimersByTime(500);

    const storageKey = "assistant.chat.history:test-user-123";
    const persistedRaw = localStorage.getItem(storageKey);

    // Welcome message should NOT be persisted, so storage should be empty or have no welcome messages
    if (persistedRaw) {
      const persisted = JSON.parse(persistedRaw) as {
        messages: Array<{ isWelcome?: boolean }>;
      };
      expect(persisted.messages.every((m) => !m.isWelcome)).toBe(true);
    }
  });

  it("shows separate welcome message for different users", () => {
    const { result: result1 } = renderHook(() => useAssistant());

    expect(result1.current.messages).toHaveLength(1);
    expect(result1.current.messages[0].isWelcome).toBe(true);

    // Clear storage and simulate different user
    localStorage.clear();
    setAuthContext("another-user-456");

    const { result: result2 } = renderHook(() => useAssistant());

    expect(result2.current.messages).toHaveLength(1);
    expect(result2.current.messages[0].isWelcome).toBe(true);
    expect(localStorage.getItem("assistant.onboarded:another-user-456")).toBe("1");
  });
});

describe("useAssistant streaming", () => {
  const ANON_USER = "anon-streaming-test";

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Pre-set onboarded flag to skip welcome message injection in tests
    localStorage.setItem(`assistant.onboarded:${ANON_USER}`, "1");
    setAuthContext(ANON_USER);
    mockedExecuteAction.mockResolvedValue({
      success: true,
      verified: true,
      message: "Đã đánh dấu xong: Đọc sách",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appends deltas to assistant message content in real-time", async () => {
    mockedSendAssistantMessageStream.mockImplementation(async (_request, onDelta) => {
      // Simulate streaming: call onDelta 3 times synchronously
      onDelta("hello");
      onDelta(" ");
      onDelta("world");
    });

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      result.current.send("test message");
    });

    const assistantMessage = result.current.messages.find((m) => m.role === "assistant");
    expect(assistantMessage?.role).toBe("assistant");
    expect(assistantMessage?.content).toBe("hello world");
    expect(assistantMessage?.status).toBe("complete");
  });

  it("calls sendAssistantMessageStream with correct arguments", async () => {
    mockedSendAssistantMessageStream.mockImplementation(async () => {
      // No-op
    });

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      result.current.send("test");
    });

    expect(mockedSendAssistantMessageStream).toHaveBeenCalled();
    const callArg = mockedSendAssistantMessageStream.mock.calls[0][0];
    expect(callArg.message).toBe("test");
    expect(callArg.context).toBeDefined();
  });

  it("accumulates all deltas into final assistant message", async () => {
    mockedSendAssistantMessageStream.mockImplementation(async (_request, onDelta) => {
      // Simulate streaming deltas
      onDelta("first");
      onDelta(" second");
      onDelta(" third");
    });

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      result.current.send("test");
    });

    const assistantMessage = result.current.messages.find((m) => m.role === "assistant");
    expect(assistantMessage?.content).toBe("first second third");
    expect(assistantMessage?.status).toBe("complete");
  });

  it("calls sendAssistantMessageStream with pageContextHint when available", async () => {
    pageContextMock.useAssistantPageContextValue.mockReturnValue({
      pageType: "SMART_GOAL_SETUP",
      currentStep: "specific",
      hint: "Hãy làm rõ mục tiêu",
    });

    // Mock buildAssistantContext to return pageContextHint when provided
    const { buildAssistantContext: originalBuildAssistantContext } = await import("../buildAssistantContext");
    const mockedBuildAssistantContext = vi.mocked(originalBuildAssistantContext);
    mockedBuildAssistantContext.mockImplementationOnce((_ref, _route, hint) => ({
      currentWeek: 5,
      weeksTotal: 12,
      goals: [],
      todayTasks: [],
      lastReflectionDate: null,
      feasibility: null,
      latestWeeklyReview: null,
      stuckSignals: {
        latestObstacle: null,
        missedCommitments: [],
        overdueOpenCount: 0,
        overdueTasks: [],
      },
      trend: { completionLast4Weeks: [], direction: "unknown" },
      streak: { daysWithCompletedTask: 0 },
      upcomingDeadlines: [],
      pageContext: { route: "/today", currentStep: null, nextSuggestedStep: null, formDraft: {} },
      pageContextHint: hint,
    }));

    mockedSendAssistantMessageStream.mockImplementation(async () => {
      // No-op
    });

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      result.current.send("test");
    });

    expect(mockedSendAssistantMessageStream).toHaveBeenCalled();
    const callArg = mockedSendAssistantMessageStream.mock.calls[0][0];
    expect(callArg.context.pageContextHint).toEqual({
      pageType: "SMART_GOAL_SETUP",
      currentStep: "specific",
      hint: "Hãy làm rõ mục tiêu",
    });
  });

  it("auto-executes one safe auto action and appends the verified result", async () => {
    mockedSendAssistantMessageStream.mockImplementation(async (_request, onDelta) => {
      onDelta(`Mình sẽ đánh dấu task này.

\`\`\`action
{
  "type": "mark_task_done",
  "payload": { "taskId": "task_123", "done": true },
  "label": "Hoàn thành: Đọc sách",
  "autoExecute": true
}
\`\`\``);
    });

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      result.current.send("confirm action");
    });

    expect(mockedExecuteAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mark_task_done",
        autoExecute: true,
      }),
      expect.any(String),
    );

    const assistantMessage = result.current.messages.find((m) => m.role === "assistant");
    expect(assistantMessage?.content).toContain("Mình sẽ đánh dấu task này.");
    expect(assistantMessage?.content).toContain("Đã đánh dấu xong: Đọc sách");
    expect(assistantMessage?.actions).toEqual([]);
  });

  it("does not auto-execute unsafe action types even if autoExecute is present", async () => {
    mockedSendAssistantMessageStream.mockImplementation(async (_request, onDelta) => {
      onDelta(`Mình đề xuất tạo mục tiêu.

\`\`\`action
{
  "type": "create_goal",
  "payload": { "title": "Học IELTS", "category": "career" },
  "label": "Tạo mục tiêu: Học IELTS",
  "autoExecute": true
}
\`\`\``);
    });

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      result.current.send("tạo mục tiêu học IELTS");
    });

    expect(mockedExecuteAction).not.toHaveBeenCalled();
    const assistantMessage = result.current.messages.find((m) => m.role === "assistant");
    expect(assistantMessage?.actions).toHaveLength(1);
  });

  it("stores a pending clarification instead of ticking vaguely when multiple tasks match", async () => {
    mockedBuildAssistantContext.mockImplementationOnce(() => ({
      currentWeek: 5,
      weeksTotal: 12,
      goals: [],
      todayTasks: [
        { id: "task_read", title: "Đọc sách 20 phút", done: false },
        { id: "task_run", title: "Chạy bộ 2km", done: false },
      ],
      lastReflectionDate: null,
      feasibility: null,
      latestWeeklyReview: null,
      stuckSignals: {
        latestObstacle: null,
        missedCommitments: [],
        overdueOpenCount: 0,
        overdueTasks: [],
      },
      trend: { completionLast4Weeks: [], direction: "unknown" },
      streak: { daysWithCompletedTask: 0 },
      upcomingDeadlines: [],
      pageContext: { route: "/today", currentStep: null, nextSuggestedStep: null, formDraft: {} },
    }));

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      result.current.send("tick task hôm nay");
    });

    expect(mockedSendAssistantMessageStream).not.toHaveBeenCalled();
    expect(mockedExecuteAction).not.toHaveBeenCalled();
    expect(getPendingAssistantClarification(ANON_USER)).toMatchObject({
      kind: "task_selection",
      intent: "mark_task_done",
    });

    const assistantMessage = result.current.messages.find((m) => m.role === "assistant");
    expect(assistantMessage?.content).toContain("Bạn muốn tick task nào?");
    expect(assistantMessage?.content).toContain("1. Đọc sách 20 phút");
    expect(assistantMessage?.content).toContain("2. Chạy bộ 2km");
  });

  it("resolves follow-up ordinal replies against pending clarification", async () => {
    const pending = createTaskSelectionClarification({
      intent: "mark_task_done",
      candidates: [
        { id: "task_read", label: "Đọc sách 20 phút" },
        { id: "task_run", label: "Chạy bộ 2km" },
      ],
    });
    setPendingAssistantClarification(ANON_USER, pending);
    mockedExecuteAction.mockResolvedValueOnce({
      success: true,
      verified: true,
      message: "Đã đánh dấu xong: Chạy bộ 2km",
    });

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      result.current.send("cái thứ 2");
    });

    expect(mockedSendAssistantMessageStream).not.toHaveBeenCalled();
    expect(mockedExecuteAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mark_task_done",
        payload: { taskId: "task_run", done: true },
      }),
      expect.any(String),
    );
    expect(getPendingAssistantClarification(ANON_USER)).toBeNull();

    const assistantMessage = result.current.messages.find((m) => m.role === "assistant");
    expect(assistantMessage?.content).toContain("Đã đánh dấu xong: Chạy bộ 2km");
  });

  it("cancels pending clarification without mutating data", async () => {
    const pending = createTaskSelectionClarification({
      intent: "mark_task_done",
      candidates: [{ id: "task_read", label: "Đọc sách 20 phút" }],
    });
    setPendingAssistantClarification(ANON_USER, pending);

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      result.current.send("hủy");
    });

    expect(mockedSendAssistantMessageStream).not.toHaveBeenCalled();
    expect(mockedExecuteAction).not.toHaveBeenCalled();
    expect(getPendingAssistantClarification(ANON_USER)).toBeNull();
    const assistantMessage = result.current.messages.find((m) => m.role === "assistant");
    expect(assistantMessage?.content).toContain("Đã hủy");
  });

  it("does not reuse expired pending clarification", async () => {
    const pending = createTaskSelectionClarification({
      intent: "mark_task_done",
      candidates: [{ id: "task_read", label: "Đọc sách 20 phút" }],
      now: new Date(Date.now() - 60_000),
      ttlMs: 1,
    });
    setPendingAssistantClarification(ANON_USER, pending);

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      result.current.send("cái thứ 1");
    });

    expect(mockedSendAssistantMessageStream).not.toHaveBeenCalled();
    expect(mockedExecuteAction).not.toHaveBeenCalled();
    expect(getPendingAssistantClarification(ANON_USER)).toBeNull();
    const assistantMessage = result.current.messages.find((m) => m.role === "assistant");
    expect(assistantMessage?.content).toContain("đã hết hạn");
  });

  it("single-candidate confirmation executes safely", async () => {
    const pending = createTaskSelectionClarification({
      intent: "mark_task_done",
      candidates: [{ id: "task_read", label: "Đọc sách 20 phút" }],
    });
    setPendingAssistantClarification(ANON_USER, pending);
    mockedExecuteAction.mockResolvedValueOnce({
      success: true,
      verified: true,
      message: "Đã đánh dấu xong: Đọc sách 20 phút",
    });

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      result.current.send("ok tick đi");
    });

    expect(mockedExecuteAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mark_task_done",
        payload: { taskId: "task_read", done: true },
      }),
      expect.any(String),
    );
    expect(getPendingAssistantClarification(ANON_USER)).toBeNull();
  });

  it("action failure after clarification does not produce success copy", async () => {
    const pending = createTaskSelectionClarification({
      intent: "mark_task_done",
      candidates: [{ id: "task_read", label: "Đọc sách 20 phút" }],
    });
    setPendingAssistantClarification(ANON_USER, pending);
    mockedExecuteAction.mockResolvedValueOnce({
      success: false,
      verified: false,
      message: "Không tìm thấy task.",
    });

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      result.current.send("1");
    });

    const assistantMessage = result.current.messages.find((m) => m.role === "assistant");
    expect(assistantMessage?.content).toContain("Mình chưa thực hiện được");
    expect(assistantMessage?.content).toContain("Không tìm thấy task.");
    expect(assistantMessage?.content).not.toContain("Đã đánh dấu xong");
  });
});

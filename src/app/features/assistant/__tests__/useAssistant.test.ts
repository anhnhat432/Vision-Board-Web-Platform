import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAssistant } from "../useAssistant";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
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

import { sendAssistantMessageStream } from "../assistantApi";

const mockedSendAssistantMessageStream = vi.mocked(sendAssistantMessageStream);

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
});

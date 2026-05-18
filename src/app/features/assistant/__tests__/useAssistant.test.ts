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

describe("useAssistant streaming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setAuthContext();
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

    const assistantMessage = result.current.messages[1];
    expect(assistantMessage.role).toBe("assistant");
    expect(assistantMessage.content).toBe("hello world");
    expect(assistantMessage.status).toBe("complete");
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
import type {
  CoachRecommendation,
  PersonalCoachContext,
} from "@shared/personalCoachSchema";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appMode: { value: "real" as "demo" | "real" },
  apiConfigured: { value: true },
  requestRecommendation: vi.fn(),
}));

vi.mock("@/app/utils/app-mode", () => ({
  isDemoMode: () => mocks.appMode.value === "demo",
  isRealMode: () => mocks.appMode.value === "real",
}));

vi.mock("@/lib/api/apiClient", () => ({
  isApiBaseUrlConfigured: () => mocks.apiConfigured.value,
}));

vi.mock("../api/personalCoachApi", () => ({
  requestPersonalCoachRecommendation: mocks.requestRecommendation,
}));

import { usePersonalCoach } from "./usePersonalCoach";

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value,
  });
}

function makeContext(id = "goal_1"): PersonalCoachContext {
  const taskId = `${id}_task`;
  return {
    goal: { id, title: `Mục tiêu ${id}` },
    cycle: { currentWeek: 3, totalWeeks: 12, phase: "active" },
    today: {
      date: "2026-08-09",
      primaryTask: {
        id: taskId,
        title: `Việc chính ${id}`,
        scheduledDate: "2026-08-09",
        isCore: true,
      },
      openTasks: [
        {
          id: taskId,
          title: `Việc chính ${id}`,
          scheduledDate: "2026-08-09",
          isCore: true,
        },
      ],
      scheduledCount: 1,
      completedCount: 0,
      allScheduledComplete: false,
    },
    week: {
      focus: `Ưu tiên ${id}`,
      completionToDate: 0,
      wholeWeekCompletion: 0,
      coreCompletionToDate: 0,
      overdueCount: 0,
      overdueTasks: [],
      carryOverCount: 0,
      checkInDays: 0,
      possibleCheckInDays: 1,
      reviewDueToday: false,
    },
    deterministicInsights: [],
  };
}

function makeAiRecommendation(context: PersonalCoachContext): CoachRecommendation {
  return {
    title: "Coach đề xuất",
    recommendation: `Hoàn thành ${context.today.primaryTask?.title}.`,
    rationale: ["Theo kế hoạch hôm nay, đây là việc cốt lõi."],
    primaryAction: {
      type: "open_task",
      taskId: context.today.primaryTask?.id,
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("usePersonalCoach", () => {
  beforeEach(() => {
    mocks.appMode.value = "real";
    mocks.apiConfigured.value = true;
    mocks.requestRecommendation.mockReset();
    setOnline(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stays idle and does not call AI without an active context", () => {
    const { result } = renderHook(() => usePersonalCoach(null));

    expect(result.current.state).toEqual({ status: "idle", recommendation: null });
    expect(mocks.requestRecommendation).not.toHaveBeenCalled();
  });

  it("uses deterministic coaching in demo mode without a protected backend call", () => {
    mocks.appMode.value = "demo";
    const { result } = renderHook(() => usePersonalCoach(makeContext("demo_goal")));

    expect(result.current.state.status).toBe("ready");
    expect(result.current.state).toMatchObject({ source: "deterministic" });
    expect(mocks.requestRecommendation).not.toHaveBeenCalled();
  });

  it("shows an offline fallback without calling the backend", () => {
    setOnline(false);
    const { result } = renderHook(() => usePersonalCoach(makeContext("offline_goal")));

    const state = result.current.state;
    expect(state.status).toBe("offline");
    if (state.status !== "offline") throw new Error("Expected offline Coach state");
    expect(state.recommendation.primaryAction.type).toBe("open_task");
    expect(mocks.requestRecommendation).not.toHaveBeenCalled();
  });

  it("transitions from fallback-backed loading to a validated AI recommendation", async () => {
    const context = makeContext("loading_goal");
    const pending = deferred<CoachRecommendation>();
    mocks.requestRecommendation.mockReturnValue(pending.promise);

    const { result } = renderHook(() => usePersonalCoach(context));

    const loadingState = result.current.state;
    expect(loadingState.status).toBe("loading");
    if (loadingState.status !== "loading") throw new Error("Expected loading Coach state");
    expect(loadingState.recommendation.primaryAction.type).toBe("open_task");

    pending.resolve(makeAiRecommendation(context));
    await flushMicrotasks();

    expect(result.current.state).toMatchObject({
      status: "ready",
      source: "ai",
      recommendation: makeAiRecommendation(context),
    });
  });

  it("reuses a cached recommendation for the same context signature", async () => {
    const context = makeContext("cache_goal");
    mocks.requestRecommendation.mockResolvedValue(makeAiRecommendation(context));

    const first = renderHook(() => usePersonalCoach(context));
    await flushMicrotasks();
    expect(first.result.current.state.status).toBe("ready");
    first.unmount();

    const second = renderHook(() => usePersonalCoach(context));

    expect(second.result.current.state).toMatchObject({ status: "ready", source: "ai" });
    expect(mocks.requestRecommendation).toHaveBeenCalledTimes(1);
  });

  it("ignores an old response after the context signature changes", async () => {
    const contextA = makeContext("stale_a");
    const contextB = makeContext("stale_b");
    const requestA = deferred<CoachRecommendation>();
    const requestB = deferred<CoachRecommendation>();
    mocks.requestRecommendation
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestB.promise);

    const { result, rerender } = renderHook(
      ({ context }: { context: PersonalCoachContext }) => usePersonalCoach(context),
      { initialProps: { context: contextA } },
    );

    rerender({ context: contextB });
    requestA.resolve(makeAiRecommendation(contextA));
    await flushMicrotasks();

    const staleLoadingState = result.current.state;
    expect(staleLoadingState.status).toBe("loading");
    if (staleLoadingState.status !== "loading") throw new Error("Expected replacement request to be loading");
    expect(staleLoadingState.recommendation.recommendation).toContain("stale_b");

    requestB.resolve(makeAiRecommendation(contextB));
    await flushMicrotasks();

    expect(result.current.state).toMatchObject({
      status: "ready",
      source: "ai",
      recommendation: makeAiRecommendation(contextB),
    });
  });

  it("aborts the active request during cleanup", () => {
    let capturedSignal: AbortSignal | undefined;
    mocks.requestRecommendation.mockImplementation(
      (_context: PersonalCoachContext, signal?: AbortSignal) => {
        capturedSignal = signal;
        return new Promise<CoachRecommendation>(() => undefined);
      },
    );

    const { unmount } = renderHook(() => usePersonalCoach(makeContext("abort_goal")));
    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it("deduplicates parallel retries", async () => {
    const context = makeContext("retry_goal");
    mocks.requestRecommendation.mockRejectedValueOnce({
      message: "Provider unavailable",
      status: 503,
      errorCode: "COACH_PROVIDER_UNAVAILABLE",
    });
    const retryRequest = deferred<CoachRecommendation>();
    mocks.requestRecommendation.mockReturnValueOnce(retryRequest.promise);

    const { result } = renderHook(() => usePersonalCoach(context));
    await flushMicrotasks();
    expect(result.current.state.status).toBe("error");

    act(() => {
      result.current.retry();
      result.current.retry();
    });

    expect(mocks.requestRecommendation).toHaveBeenCalledTimes(2);
    expect(result.current.isRetrying).toBe(true);

    retryRequest.resolve(makeAiRecommendation(context));
    await flushMicrotasks();
    expect(result.current.state.status).toBe("ready");
    expect(result.current.isRetrying).toBe(false);
  });

  it("maps rate limits and provider failures to fallback-backed states", async () => {
    const limitedContext = makeContext("limited_goal");
    mocks.requestRecommendation.mockRejectedValueOnce({
      message: "Rate limited",
      status: 429,
      errorCode: "COACH_RATE_LIMITED",
    });

    const limited = renderHook(() => usePersonalCoach(limitedContext));
    await flushMicrotasks();
    expect(limited.result.current.state).toMatchObject({
      status: "rate_limited",
      errorCode: "COACH_RATE_LIMITED",
    });
    limited.unmount();

    const failedContext = makeContext("failed_goal");
    mocks.requestRecommendation.mockRejectedValueOnce({
      message: "Provider unavailable",
      status: 503,
      errorCode: "COACH_PROVIDER_UNAVAILABLE",
    });
    const failed = renderHook(() => usePersonalCoach(failedContext));
    await flushMicrotasks();
    expect(failed.result.current.state).toMatchObject({
      status: "error",
      errorCode: "COACH_PROVIDER_UNAVAILABLE",
    });
    const failedState = failed.result.current.state;
    if (failedState.status !== "error") throw new Error("Expected failed Coach state");
    expect(failedState.recommendation.primaryAction.type).toBe("open_task");
  });
});

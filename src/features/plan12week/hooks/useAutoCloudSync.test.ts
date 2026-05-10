import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { USER_DATA_UPDATED_EVENT_NAME } from "@/app/utils/storage-constants";
import { useAutoCloudSync } from "./useAutoCloudSync";
import type { TwelveWeekManualCloudSyncResult } from "./useTwelveWeekManualCloudSync";

const authContextMock = vi.hoisted(() => ({
  state: {
    user: null as { uid: string } | null,
    userProfile: null as { id: string } | null,
    userProfileLoading: false,
  },
  useAuthContext: vi.fn(),
}));

const appModeMock = vi.hoisted(() => ({
  isRealMode: vi.fn(() => true),
  shouldEnable12WeekMutationSync: vi.fn(() => true),
  shouldEnable12WeekPullSync: vi.fn(() => true),
}));

const apiClientMock = vi.hoisted(() => ({
  isApiBaseUrlConfigured: vi.fn(() => true),
}));

const manualSyncMock = vi.hoisted(() => ({
  syncNow: vi.fn(),
  useTwelveWeekManualCloudSync: vi.fn(),
}));

const mutationSenderMock = vi.hoisted(() => ({
  sendPending12WeekMutations: vi.fn(),
}));

const networkStatusMock = vi.hoisted(() => ({
  state: {
    status: "online",
    isOnline: true,
    isOffline: false,
  },
  lastOptions: null as { onReconnect?: () => void; reconnectDebounceMs?: number } | null,
  useNetworkStatus: vi.fn((options?: { onReconnect?: () => void; reconnectDebounceMs?: number }) => {
    networkStatusMock.lastOptions = options ?? null;
    return networkStatusMock.state;
  }),
}));

const queueMock = vi.hoisted(() => ({
  pendingCount: 0,
  readMutationQueueStore: vi.fn(() => ({ items: [] })),
  summarizeMutationQueueStore: vi.fn(() => ({
    totalCount: 0,
    pendingCount: queueMock.pendingCount,
    inFlightCount: 0,
    failedOrRetryableCount: 0,
    succeededCount: 0,
    lastDrainStartedAt: null,
    lastDrainFinishedAt: null,
  })),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("@/app/utils/app-mode", () => ({
  isRealMode: appModeMock.isRealMode,
  shouldEnable12WeekMutationSync: appModeMock.shouldEnable12WeekMutationSync,
  shouldEnable12WeekPullSync: appModeMock.shouldEnable12WeekPullSync,
}));

vi.mock("@/lib/api/apiClient", () => ({
  isApiBaseUrlConfigured: apiClientMock.isApiBaseUrlConfigured,
}));

vi.mock("@/app/hooks/useNetworkStatus", () => ({
  useNetworkStatus: networkStatusMock.useNetworkStatus,
}));

vi.mock("./useTwelveWeekManualCloudSync", () => ({
  useTwelveWeekManualCloudSync: manualSyncMock.useTwelveWeekManualCloudSync,
}));

vi.mock("../persistence/mutationQueueSender", () => ({
  sendPending12WeekMutations: mutationSenderMock.sendPending12WeekMutations,
}));

vi.mock("../persistence/mutationQueue", () => ({
  readMutationQueueStore: queueMock.readMutationQueueStore,
  summarizeMutationQueueStore: queueMock.summarizeMutationQueueStore,
}));

const appliedResult: TwelveWeekManualCloudSyncResult = {
  status: "applied",
  message: "Synced safely.",
};

const conflictResult: TwelveWeekManualCloudSyncResult = {
  status: "conflict",
  message: "Needs review.",
};

const drainSuccessResult = {
  status: "success",
  attemptedCount: 1,
  succeededCount: 1,
  duplicateCount: 0,
  failedCount: 0,
  pendingCount: 0,
};

let visibilityState = "visible";

function setSignedIn(uid = "firebase_uid_1") {
  authContextMock.state.user = { uid };
  authContextMock.state.userProfile = { id: `profile_${uid}` };
  authContextMock.state.userProfileLoading = false;
}

function setSignedOut() {
  authContextMock.state.user = null;
  authContextMock.state.userProfile = null;
  authContextMock.state.userProfileLoading = false;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useAutoCloudSync", () => {
  beforeEach(() => {
    setSignedOut();
    visibilityState = "visible";
    queueMock.pendingCount = 0;
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });

    authContextMock.useAuthContext.mockImplementation(() => ({
      ...authContextMock.state,
      authLoading: false,
      userProfileError: null,
      error: null,
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      isConfigured: true,
    }));
    appModeMock.isRealMode.mockReturnValue(true);
    appModeMock.shouldEnable12WeekMutationSync.mockReturnValue(true);
    appModeMock.shouldEnable12WeekPullSync.mockReturnValue(true);
    apiClientMock.isApiBaseUrlConfigured.mockReturnValue(true);
    networkStatusMock.state = {
      status: "online",
      isOnline: true,
      isOffline: false,
    };
    networkStatusMock.lastOptions = null;
    manualSyncMock.syncNow.mockResolvedValue(appliedResult);
    manualSyncMock.useTwelveWeekManualCloudSync.mockImplementation(() => ({
      loading: false,
      lastResult: null,
      syncNow: manualSyncMock.syncNow,
    }));
    mutationSenderMock.sendPending12WeekMutations.mockResolvedValue(drainSuccessResult);
  });

  it("skips when not in real mode", () => {
    appModeMock.isRealMode.mockReturnValue(false);
    setSignedIn();

    const { result } = renderHook(() => useAutoCloudSync());

    expect(result.current.lastResult).toBeNull();
    expect(result.current.pendingCount).toBe(0);
    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
  });

  it("does not run background or drain triggers in demo mode", async () => {
    vi.useFakeTimers();
    appModeMock.isRealMode.mockReturnValue(false);
    queueMock.pendingCount = 2;
    setSignedIn("firebase_uid_demo");

    renderHook(() => useAutoCloudSync({ intervalMs: 1_000, mutationDebounceMs: 500 }));

    window.dispatchEvent(new Event(USER_DATA_UPDATED_EVENT_NAME));
    await act(async () => {
      vi.advanceTimersByTime(2_000);
      networkStatusMock.lastOptions?.onReconnect?.();
    });

    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
    expect(mutationSenderMock.sendPending12WeekMutations).not.toHaveBeenCalled();
  });

  it("skips when there is no signed-in user", () => {
    renderHook(() => useAutoCloudSync());

    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
  });

  it("triggers once when the user uid transitions from null to a ready profile", async () => {
    const { rerender } = renderHook(() => useAutoCloudSync());

    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();

    setSignedIn("firebase_uid_login");
    rerender();

    await waitFor(() => {
      expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    });
    expect(console.log).toHaveBeenCalledWith("[auto-sync] starting", { ownerUid: "firebase_uid_login" });
  });

  it("does not trigger again while the same user uid remains mounted", async () => {
    setSignedIn("firebase_uid_same");
    const { rerender } = renderHook(() => useAutoCloudSync());

    await waitFor(() => {
      expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    });

    rerender();
    rerender();

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent triggerSyncNow calls while a sync is in flight", async () => {
    setSignedIn("firebase_uid_inflight");
    const deferred = createDeferred<TwelveWeekManualCloudSyncResult>();
    manualSyncMock.syncNow.mockReturnValue(deferred.promise);

    const { result } = renderHook(() => useAutoCloudSync());

    await waitFor(() => {
      expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    });

    const firstManualTrigger = result.current.triggerSyncNow();
    const secondManualTrigger = result.current.triggerSyncNow();

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve(appliedResult);
      await Promise.all([firstManualTrigger, secondManualTrigger]);
    });

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
  });

  it("rate-limits full sync triggers inside the minimum sync interval", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    setSignedIn("firebase_uid_rate");

    const { result } = renderHook(() => useAutoCloudSync({ minSyncIntervalMs: 30_000 }));

    await flushMicrotasks();
    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    manualSyncMock.syncNow.mockClear();

    await act(async () => {
      await result.current.triggerSyncNow();
    });

    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();

    vi.setSystemTime(new Date("2026-05-10T10:00:30.000Z"));
    await act(async () => {
      await result.current.triggerSyncNow();
    });

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
  });

  it("runs one periodic background sync while signed in, online, and visible", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    setSignedIn("firebase_uid_interval");

    renderHook(() => useAutoCloudSync({ intervalMs: 60_000, minSyncIntervalMs: 30_000 }));

    await flushMicrotasks();
    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    manualSyncMock.syncNow.mockClear();

    vi.setSystemTime(new Date("2026-05-10T10:01:00.000Z"));
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
  });

  it("does not run periodic background sync while the tab is hidden", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    visibilityState = "hidden";
    setSignedIn("firebase_uid_hidden");

    renderHook(() => useAutoCloudSync({ intervalMs: 60_000, minSyncIntervalMs: 30_000 }));

    await act(async () => {
      vi.advanceTimersByTime(180_000);
    });

    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
  });

  it("triggers one sync when a hidden tab becomes visible after the visibility stale window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    visibilityState = "hidden";
    setSignedIn("firebase_uid_visible");

    renderHook(() => useAutoCloudSync({ intervalMs: 60_000, minSyncIntervalMs: 30_000 }));

    vi.setSystemTime(new Date("2026-05-10T10:02:00.000Z"));
    visibilityState = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(300);
    });

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
  });

  it("triggers one sync from the debounced reconnect callback", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    networkStatusMock.state = {
      status: "offline",
      isOnline: false,
      isOffline: true,
    };
    setSignedIn("firebase_uid_reconnect");

    const { rerender } = renderHook(() => useAutoCloudSync({ minSyncIntervalMs: 30_000 }));

    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
    expect(networkStatusMock.lastOptions?.reconnectDebounceMs).toBe(3000);

    vi.setSystemTime(new Date("2026-05-10T10:00:33.000Z"));
    networkStatusMock.state = {
      status: "online",
      isOnline: true,
      isOffline: false,
    };
    rerender();
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      networkStatusMock.lastOptions?.onReconnect?.();
    });

    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
  });

  it("drains pending mutations once after debounced user data updates without pulling cloud data", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
    queueMock.pendingCount = 2;
    setSignedIn("firebase_uid_mutation");

    renderHook(() => useAutoCloudSync({ mutationDebounceMs: 2_000 }));

    await flushMicrotasks();
    expect(manualSyncMock.syncNow).toHaveBeenCalledTimes(1);
    manualSyncMock.syncNow.mockClear();

    window.dispatchEvent(new Event(USER_DATA_UPDATED_EVENT_NAME));
    window.dispatchEvent(new Event(USER_DATA_UPDATED_EVENT_NAME));

    await act(async () => {
      vi.advanceTimersByTime(1_999);
    });
    expect(mutationSenderMock.sendPending12WeekMutations).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(mutationSenderMock.sendPending12WeekMutations).toHaveBeenCalledTimes(1);
    expect(mutationSenderMock.sendPending12WeekMutations).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUid: "firebase_uid_mutation",
        authenticated: true,
        realMode: true,
        apiConfigured: true,
        online: true,
      }),
    );
    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
  });

  it("updates pendingCount after a sync result", async () => {
    queueMock.pendingCount = 3;
    setSignedIn("firebase_uid_pending");
    manualSyncMock.syncNow.mockImplementation(async () => {
      queueMock.pendingCount = 1;
      return appliedResult;
    });

    const { result } = renderHook(() => useAutoCloudSync());

    expect(result.current.pendingCount).toBe(3);
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(1);
    });
  });

  it("marks conflictPending when the last result is a conflict", async () => {
    setSignedIn("firebase_uid_conflict");
    manualSyncMock.syncNow.mockResolvedValue(conflictResult);

    const { result } = renderHook(() => useAutoCloudSync());

    await waitFor(() => {
      expect(result.current.conflictPending).toBe(true);
    });
    expect(result.current.lastResult?.status).toBe("conflict");
  });
});

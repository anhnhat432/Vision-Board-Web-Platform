import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  useNetworkStatus: () => ({ status: "online", isOnline: true, isOffline: false }),
}));

vi.mock("./useTwelveWeekManualCloudSync", () => ({
  useTwelveWeekManualCloudSync: manualSyncMock.useTwelveWeekManualCloudSync,
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

describe("useAutoCloudSync", () => {
  beforeEach(() => {
    setSignedOut();
    queueMock.pendingCount = 0;
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

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
    manualSyncMock.syncNow.mockResolvedValue(appliedResult);
    manualSyncMock.useTwelveWeekManualCloudSync.mockImplementation(() => ({
      loading: false,
      lastResult: null,
      syncNow: manualSyncMock.syncNow,
    }));
  });

  it("skips when not in real mode", () => {
    appModeMock.isRealMode.mockReturnValue(false);
    setSignedIn();

    const { result } = renderHook(() => useAutoCloudSync());

    expect(result.current.lastResult).toBeNull();
    expect(result.current.pendingCount).toBe(0);
    expect(manualSyncMock.syncNow).not.toHaveBeenCalled();
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

import { render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AutoCloudSyncProvider, useAutoCloudSyncContext } from "./AutoCloudSyncProvider";
import type { AutoCloudSyncState } from "./useAutoCloudSync";

const autoCloudSyncMock = vi.hoisted(() => {
  const state: AutoCloudSyncState = {
    loading: false,
    syncing: false,
    lastResult: null,
    lastSyncedAt: null,
    pendingCount: 4,
    online: true,
    conflictPending: false,
    firstLoginRestoreSummary: null,
    triggerSyncNow: vi.fn(),
    triggerDrainOnly: vi.fn(),
    resolveConflictKeepLocal: vi.fn(),
    resolveConflictUseCloud: vi.fn(),
    clearFirstLoginRestoreSummary: vi.fn(),
  };

  return {
    state,
    useAutoCloudSync: vi.fn(() => state),
  };
});

vi.mock("./useAutoCloudSync", () => ({
  useAutoCloudSync: autoCloudSyncMock.useAutoCloudSync,
}));

function Consumer() {
  const autoSync = useAutoCloudSyncContext();
  return <div data-testid="pending-count">{autoSync.pendingCount}</div>;
}

describe("AutoCloudSyncProvider", () => {
  beforeEach(() => {
    autoCloudSyncMock.useAutoCloudSync.mockClear();
  });

  it("renders children with the shared auto sync state", () => {
    render(
      <AutoCloudSyncProvider>
        <div data-testid="child">Child content</div>
        <Consumer />
      </AutoCloudSyncProvider>,
    );

    expect(screen.getByTestId("child")).toHaveTextContent("Child content");
    expect(screen.getByTestId("pending-count")).toHaveTextContent("4");
    expect(autoCloudSyncMock.useAutoCloudSync).toHaveBeenCalledTimes(1);
  });

  it("throws when the context hook is used outside the provider", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const preventExpectedError = (event: ErrorEvent) => {
      if (event.message.includes("useAutoCloudSyncContext must be used inside AutoCloudSyncProvider")) {
        event.preventDefault();
      }
    };
    window.addEventListener("error", preventExpectedError);

    expect(() => renderHook(() => useAutoCloudSyncContext())).toThrow(
      "useAutoCloudSyncContext must be used inside AutoCloudSyncProvider",
    );

    window.removeEventListener("error", preventExpectedError);
    consoleErrorSpy.mockRestore();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AutoCloudSyncState } from "@/features/plan12week/hooks/useAutoCloudSync";
import { AutoCloudSyncContext } from "./AutoCloudSyncContext";
import { AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME, SyncStatusPill } from "./SyncStatusPill";

function createSyncState(overrides: Partial<AutoCloudSyncState> = {}): AutoCloudSyncState {
  return {
    loading: false,
    syncing: false,
    lastResult: null,
    lastSyncedAt: null,
    pendingCount: 0,
    online: true,
    conflictPending: false,
    triggerSyncNow: vi.fn(),
    triggerDrainOnly: vi.fn(),
    resolveConflictKeepLocal: vi.fn(),
    resolveConflictUseCloud: vi.fn(),
    ...overrides,
  };
}

function renderPill(state: AutoCloudSyncState | null, compact = false) {
  return render(
    <AutoCloudSyncContext.Provider value={state}>
      <SyncStatusPill compact={compact} />
    </AutoCloudSyncContext.Provider>,
  );
}

describe("SyncStatusPill", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["syncing", createSyncState({ syncing: true, loading: true }), "Đang đồng bộ"],
    ["conflict", createSyncState({ conflictPending: true }), "Có xung đột"],
    ["offline", createSyncState({ online: false }), "Đợi mạng"],
    ["pending", createSyncState({ pendingCount: 3 }), "3 chờ gửi"],
    ["ok", createSyncState({ lastSyncedAt: "2026-05-10T09:55:00.000Z" }), "Đồng bộ 5 phút trước"],
    ["idle", createSyncState(), "Chưa đồng bộ"],
  ])("renders the %s state", (_stateName, state, text) => {
    renderPill(state);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("uses a compact tooltip without promising multi-device sync", () => {
    renderPill(createSyncState({ lastSyncedAt: "2026-05-10T09:00:00.000Z", pendingCount: 2 }));

    const pill = screen.getByText("2 chờ gửi").closest("button");

    expect(pill).toHaveAttribute("title", "Cập nhật 1 giờ trước, 2 mutation chờ gửi.");
    expect(pill?.getAttribute("title")).not.toMatch(/đa thiết bị|tự đồng bộ/i);
  });

  it("dispatches the conflict dialog event only when clicked in conflict state", () => {
    const listener = vi.fn();
    window.addEventListener(AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME, listener);

    const { rerender } = render(
      <AutoCloudSyncContext.Provider value={createSyncState({ conflictPending: true })}>
        <SyncStatusPill />
      </AutoCloudSyncContext.Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Có xung đột" }));
    expect(listener).toHaveBeenCalledTimes(1);

    rerender(
      <AutoCloudSyncContext.Provider value={createSyncState({ lastSyncedAt: "2026-05-10T09:59:30.000Z" })}>
        <SyncStatusPill />
      </AutoCloudSyncContext.Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Đồng bộ vừa xong" }));
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME, listener);
  });

  it("does not render without auto sync context", () => {
    renderPill(null);

    expect(screen.queryByText("Chưa đồng bộ")).not.toBeInTheDocument();
  });
});

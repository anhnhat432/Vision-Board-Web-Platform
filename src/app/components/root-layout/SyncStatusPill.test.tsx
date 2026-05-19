import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import type { AutoCloudSyncState } from "@/features/plan12week/hooks/useAutoCloudSync";
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
    firstLoginRestoreSummary: null,
    triggerSyncNow: vi.fn(),
    triggerDrainOnly: vi.fn(),
    resolveConflictKeepLocal: vi.fn(),
    resolveConflictUseCloud: vi.fn(),
    clearFirstLoginRestoreSummary: vi.fn(),
    ...overrides,
  };
}

function renderPill(state: AutoCloudSyncState | null, compact = false) {
  return render(
    <MemoryRouter>
      <AutoCloudSyncContext.Provider value={state}>
        <SyncStatusPill compact={compact} />
      </AutoCloudSyncContext.Provider>
    </MemoryRouter>,
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
    ["conflict", createSyncState({ conflictPending: true }), "Cần chọn bản dữ liệu"],
    ["syncing", createSyncState({ syncing: true, loading: true }), "Đang sao lưu"],
    ["offline", createSyncState({ online: false }), "Đã lưu trên thiết bị"],
    ["pending", createSyncState({ pendingCount: 3 }), "3 chờ sao lưu"],
  ])("renders the %s state", (_stateName, state, text) => {
    renderPill(state);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("hides pill when state is ok (lastSyncedAt set, nothing pending)", () => {
    renderPill(createSyncState({ lastSyncedAt: "2026-05-10T09:55:00.000Z" }));

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("hides pill when state is idle (no lastSyncedAt, nothing pending)", () => {
    renderPill(createSyncState());

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("uses a compact tooltip without promising multi-device sync", () => {
    renderPill(createSyncState({ lastSyncedAt: "2026-05-10T09:00:00.000Z", pendingCount: 2 }));

    const pill = screen.getByText("2 chờ sao lưu").closest("button");

    expect(pill).toHaveAttribute("title", "Đã lưu trên thiết bị. 2 thay đổi đã lưu, chờ sao lưu vào tài khoản.");
    expect(pill?.getAttribute("title")).not.toMatch(/đa thiết bị|tự đồng bộ/i);
  });

  it("opens conflict resolution when cloud and device versions diverge", () => {
    const listener = vi.fn();
    window.addEventListener(AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME, listener);

    renderPill(
      createSyncState({
        conflictPending: true,
        lastSyncedAt: "2026-05-10T09:59:30.000Z",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Cần chọn bản dữ liệu" }));

    expect(screen.getByText("Cần chọn bản dữ liệu")).toBeInTheDocument();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME, listener);
  });
});

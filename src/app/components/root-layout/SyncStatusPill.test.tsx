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
    ["conflict", createSyncState({ conflictPending: true }), "Cần xử lý đồng bộ"],
    ["syncing", createSyncState({ syncing: true, loading: true }), "Đang đồng bộ tài khoản"],
    ["offline", createSyncState({ online: false }), "Đã lưu trên thiết bị"],
    ["pending", createSyncState({ pendingCount: 3 }), "3 chờ đồng bộ"],
    ["ok", createSyncState({ lastSyncedAt: "2026-05-10T09:55:00.000Z" }), "Đã đồng bộ tài khoản 5 phút trước"],
    ["idle", createSyncState(), "Chưa đồng bộ"],
  ])("renders the %s state", (_stateName, state, text) => {
    renderPill(state);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("uses a compact tooltip without promising multi-device sync", () => {
    renderPill(createSyncState({ lastSyncedAt: "2026-05-10T09:00:00.000Z", pendingCount: 2 }));

    const pill = screen.getByText("2 chờ đồng bộ").closest("button");

    expect(pill).toHaveAttribute(
      "title",
      "Đã lưu trên thiết bị. 2 thay đổi đã lưu trên thiết bị, chờ gửi lên tài khoản.",
    );
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

    fireEvent.click(screen.getByRole("button", { name: "Cần xử lý đồng bộ" }));

    expect(screen.getByText("Cần xử lý đồng bộ")).toBeInTheDocument();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME, listener);
  });
});

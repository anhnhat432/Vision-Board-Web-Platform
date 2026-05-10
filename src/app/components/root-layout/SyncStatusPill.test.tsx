import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import type { AutoCloudSyncState } from "@/features/plan12week/hooks/useAutoCloudSync";
import { SyncStatusPill } from "./SyncStatusPill";

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

  it("keeps conflict state invisible to regular users", () => {
    renderPill(
      createSyncState({
        conflictPending: true,
        lastSyncedAt: "2026-05-10T09:59:30.000Z",
      }),
    );

    expect(screen.queryByText("Có xung đột")).not.toBeInTheDocument();
    expect(screen.getByText("Đồng bộ vừa xong")).toBeInTheDocument();
  });
});

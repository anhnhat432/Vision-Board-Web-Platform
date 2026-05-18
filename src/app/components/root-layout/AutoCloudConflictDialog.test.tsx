import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import { AutoCloudConflictDialog } from "./AutoCloudConflictDialog";
import { AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME } from "./SyncStatusPill";
import type { AutoCloudSyncState } from "@/features/plan12week/hooks/useAutoCloudSync";

const storageMock = vi.hoisted(() => ({
  exportUserDataSnapshot: vi.fn(() => '{"goals":[]}'),
}));

vi.mock("@/app/utils/storage", () => ({
  exportUserDataSnapshot: storageMock.exportUserDataSnapshot,
}));

const conflictResult = {
  status: "conflict",
  message: "Needs review.",
  mergeReport: {
    safeToApply: false,
    localOnlyChanges: [],
    cloudOnlyChanges: [],
    conflicts: [
      {
        kind: "task",
        source: "local",
        clientId: "task_1",
        path: "goals.goal_1.tasks.task_1",
        message: "Cloud record changed after an unresolved local mutation for the same entity.",
        mutationId: "mutation_1",
        reason: "pending_local_mutation_cloud_newer",
        winner: "cloud",
        winnerSource: "timestamp",
        clockSkewMs: 1000,
      },
      {
        kind: "dailyCheckIn",
        source: "cloud",
        clientId: "2026-05-10",
        path: "goals.goal_1.dailyCheckIns.2026-05-10",
        message: "Local and cloud values differ for a field-complete sync entity.",
        reason: "daily_check_in_differs",
        winner: "cloud",
        winnerSource: "no_local_mutation",
      },
    ],
    missingClientIds: [],
    unsupportedFields: [],
    autoResolvable: false,
    summary: {
      localEntityCount: 2,
      cloudEntityCount: 2,
      localOnlyCount: 0,
      cloudOnlyCount: 0,
      conflictCount: 2,
      missingClientIdCount: 0,
      unsupportedFieldCount: 0,
    },
  },
};

function createAutoSyncState(overrides: Partial<AutoCloudSyncState> = {}): AutoCloudSyncState {
  return {
    loading: false,
    syncing: false,
    lastResult: conflictResult as AutoCloudSyncState["lastResult"],
    lastSyncedAt: "2026-05-10T10:00:00.000Z",
    pendingCount: 1,
    online: true,
    conflictPending: true,
    firstLoginRestoreSummary: null,
    triggerSyncNow: vi.fn(),
    triggerDrainOnly: vi.fn(),
    resolveConflictKeepLocal: vi.fn(),
    resolveConflictUseCloud: vi.fn(),
    clearFirstLoginRestoreSummary: vi.fn(),
    ...overrides,
  };
}

function renderDialog(state = createAutoSyncState()) {
  return render(
    <MemoryRouter>
      <AutoCloudSyncContext.Provider value={state}>
        <AutoCloudConflictDialog />
      </AutoCloudSyncContext.Provider>
    </MemoryRouter>,
  );
}

describe("AutoCloudConflictDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:backup");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  it("renders conflict details and the three resolution actions", () => {
    renderDialog();

    expect(screen.getByText("Dữ liệu giữa thiết bị và tài khoản đang khác nhau")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Giữ trên thiết bị này" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lấy bản tài khoản" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Để sau" })).toBeInTheDocument();
    expect(screen.getByText(/task_1/)).toBeInTheDocument();
  });

  it("calls resolveConflictKeepLocal when the user keeps the device version", async () => {
    const state = createAutoSyncState();
    renderDialog(state);

    fireEvent.click(screen.getByRole("button", { name: "Giữ trên thiết bị này" }));

    await waitFor(() => {
      expect(state.resolveConflictKeepLocal).toHaveBeenCalledTimes(1);
    });
  });

  it("requires a confirmation step, exports backup, then resolves with the account version", async () => {
    const state = createAutoSyncState();
    renderDialog(state);

    fireEvent.click(screen.getByRole("button", { name: "Lấy bản tài khoản" }));

    expect(screen.getByText("Bản trên thiết bị sẽ bị thay thế. Tải xuống bản backup trước?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tải backup và lấy bản tài khoản" }));

    await waitFor(() => {
      expect(storageMock.exportUserDataSnapshot).toHaveBeenCalledTimes(1);
      expect(state.resolveConflictUseCloud).toHaveBeenCalledTimes(1);
    });
  });

  it("closes for the current session when the user postpones resolution", () => {
    const state = createAutoSyncState();
    renderDialog(state);

    fireEvent.click(screen.getByRole("button", { name: "Để sau" }));

    expect(screen.queryByText("Dữ liệu giữa thiết bị và tài khoản đang khác nhau")).not.toBeInTheDocument();
    expect(state.conflictPending).toBe(true);
  });

  it("reopens when the header conflict pill requests the dialog", async () => {
    const state = createAutoSyncState();
    renderDialog(state);

    const postponeButton = screen.getAllByRole("button").find((button) => button.textContent?.includes("sau"));
    expect(postponeButton).toBeDefined();
    fireEvent.click(postponeButton as HTMLButtonElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent(window, new CustomEvent(AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});

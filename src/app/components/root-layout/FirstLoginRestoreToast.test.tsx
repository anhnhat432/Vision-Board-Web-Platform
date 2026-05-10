import { fireEvent, render, waitFor } from "@testing-library/react";
import { useMemo, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import type { AutoCloudSyncState, FirstLoginRestoreSummary } from "@/features/plan12week/hooks/useAutoCloudSync";
import { FirstLoginRestoreToast } from "./FirstLoginRestoreToast";

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastMock.success,
  },
}));

function createAutoSyncState(overrides: Partial<AutoCloudSyncState> = {}): AutoCloudSyncState {
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

function ToastHarness({ initialSummary }: { initialSummary: FirstLoginRestoreSummary | null }) {
  const [summary, setSummary] = useState(initialSummary);
  const state = useMemo(
    () =>
      createAutoSyncState({
        firstLoginRestoreSummary: summary,
        clearFirstLoginRestoreSummary: () => setSummary(null),
      }),
    [summary],
  );

  return (
    <AutoCloudSyncContext.Provider value={state}>
      <FirstLoginRestoreToast />
      <button type="button" onClick={() => setSummary(null)}>
        Sync without restore
      </button>
    </AutoCloudSyncContext.Provider>
  );
}

describe("FirstLoginRestoreToast", () => {
  beforeEach(() => {
    toastMock.success.mockClear();
  });

  it("fires a one-time restore toast and clears the summary", async () => {
    const { getByRole } = render(
      <ToastHarness initialSummary={{ goalCount: 2, checkInCount: 3, weeklyReviewCount: 1 }} />,
    );

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledTimes(1);
    });
    expect(toastMock.success).toHaveBeenCalledWith(
      "Đã khôi phục dữ liệu tài khoản: 2 kế hoạch, 3 check-in",
      expect.objectContaining({
        description: "1 review tuần đã được khôi phục.",
        duration: 5000,
      }),
    );

    fireEvent.click(getByRole("button", { name: "Sync without restore" }));

    expect(toastMock.success).toHaveBeenCalledTimes(1);
  });

  it("does not fire when there is no restore summary", () => {
    render(<ToastHarness initialSummary={null} />);

    expect(toastMock.success).not.toHaveBeenCalled();
  });
});

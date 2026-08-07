import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalDataImportManager } from "../components/LocalDataImportManager";
import { createLocalUserDataBackupJson } from "../utils/local-data-backup";
import { getUserData, resetUserDataCache } from "../utils/storage";
import type { Goal, UserData } from "../utils/storage-types";
import type { LocalDataImportPendingMarker } from "@/features/plan12week/persistence/localDataImportTransaction";

const transactionMock = vi.hoisted(() => ({
  pending: null as LocalDataImportPendingMarker | null,
  recoveries: [] as Array<Record<string, unknown>>,
  apply: vi.fn(),
  restore: vi.fn(),
  resolveAfterCloud: vi.fn(),
}));

const cloudActionsMock = vi.hoisted(() => ({
  handleValidateCloudImport: vi.fn(),
  handleCloudImport: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/features/plan12week/persistence/localDataImportTransaction", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/plan12week/persistence/localDataImportTransaction")>();
  return {
    ...actual,
    getPendingLocalDataImport: () => transactionMock.pending,
    listLocalDataImportRecoverySnapshots: () => transactionMock.recoveries,
    applyLocalDataImportTransaction: transactionMock.apply,
    restoreLocalDataImportRecovery: transactionMock.restore,
    resolveLocalDataImportAfterCloud: transactionMock.resolveAfterCloud,
  };
});

vi.mock("../components/root-layout/useCloudImportActions", () => ({
  useCloudImportActions: () => ({
    cloudImportDryRunEnabled: true,
    cloudImportEnabled: true,
    cloudImportDryRunUnavailableReason: undefined,
    cloudImportUnavailableReason: undefined,
    cloudImportAlreadyCompleted: false,
    handleValidateCloudImport: cloudActionsMock.handleValidateCloudImport,
    handleCloudImport: cloudActionsMock.handleCloudImport,
  }),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

function createGoal(id: string): Goal {
  return {
    id,
    category: "career",
    title: id,
    description: "Settings import fixture",
    deadline: "2026-12-31",
    createdAt: "2026-08-01T00:00:00.000Z",
    tasks: [],
  };
}

function createPendingMarker(ownerUid: string): LocalDataImportPendingMarker {
  return {
    version: 1,
    importId: "local_file_import_test",
    ownerUid,
    recoveryKey: `visionboard_local_file_import_recovery:auth:${ownerUid}:local_file_import_test`,
    candidateFingerprint: "candidate_fp",
    createdAt: "2026-08-07T10:00:00.000Z",
    summary: {
      goalCount: 1,
      twelveWeekSystemCount: 0,
      taskCount: 0,
      dailyCheckInCount: 0,
      weeklyReviewCount: 0,
      wheelRecordCount: 0,
      reflectionCount: 0,
      visionBoardCount: 0,
    },
  };
}

let currentData: UserData;
let validBackupJson: string;
const triggerSyncNowMock = vi.fn().mockResolvedValue(null);
const onDataChangedMock = vi.fn();

function renderPage(options: { demoMode?: boolean; ownerUid?: string | null } = {}) {
  return render(
    <LocalDataImportManager
      currentData={currentData}
      ownerUid={options.ownerUid === undefined ? "owner_a" : options.ownerUid}
      demoMode={options.demoMode ?? false}
      online
      onDataChanged={onDataChangedMock}
      triggerSyncNow={triggerSyncNowMock}
    />,
  );
}

async function importAndConfirm(json: string): Promise<void> {
  const user = userEvent.setup();
  await user.upload(
    screen.getByLabelText("Chọn file backup JSON"),
    new File([json], "restore.json", { type: "application/json" }),
  );
  await user.click(await screen.findByRole("button", { name: "Tiếp tục" }));
  await user.click(await screen.findByRole("button", { name: "Tạo backup và thay dữ liệu" }));
}

const invalidReport = {
  status: "invalid" as const,
  mode: "validate_only" as const,
  dryRun: true as const,
  acceptedEntityCounts: {
    goals: 0,
    plans: 0,
    weeks: 0,
    tasks: 0,
    leadIndicators: 0,
    leadMetrics: 0,
    dailyCheckIns: 0,
    weeklyReviews: 0,
  },
  warnings: [],
  errors: [{ path: "workspace.goals[0]", code: "invalid_goal", message: "Invalid goal" }],
  normalizedClientIdsCount: 0,
};

describe("Settings local file import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetUserDataCache();
    transactionMock.pending = null;
    transactionMock.recoveries = [];
    currentData = { ...getUserData(), userId: "current_identity", goals: [createGoal("current_goal")] };
    validBackupJson = createLocalUserDataBackupJson({ ...currentData, goals: [createGoal("imported_goal")] });
    transactionMock.apply.mockImplementation(({ pauseCloudSync }: { pauseCloudSync: boolean }) => {
      transactionMock.pending = pauseCloudSync ? createPendingMarker("owner_a") : null;
      return {
        status: "applied",
        importId: "local_file_import_test",
        recoveryKey: "visionboard_local_file_import_recovery:anonymous:local_file_import_test",
        pending: transactionMock.pending,
      };
    });
    transactionMock.restore.mockReturnValue({ status: "restored" });
    transactionMock.resolveAfterCloud.mockReturnValue(true);
    cloudActionsMock.handleValidateCloudImport.mockResolvedValue({
      status: "valid",
      message: "Valid",
      report: { ...invalidReport, status: "valid", errors: [] },
    });
    cloudActionsMock.handleCloudImport.mockResolvedValue({ status: "applied", message: "Applied" });
  });

  it("previews current and imported counts before the two-step replace confirmation", async () => {
    const user = userEvent.setup();
    renderPage();
    const file = new File([validBackupJson], "restore.json", { type: "application/json" });

    await user.upload(screen.getByLabelText("Chọn file backup JSON"), file);

    const preview = await screen.findByTestId("local-import-preview-dialog");
    expect(within(preview).getByText("Hiện tại trên thiết bị")).toBeInTheDocument();
    expect(within(preview).getByText("Trong file import")).toBeInTheDocument();
    expect(transactionMock.apply).not.toHaveBeenCalled();

    await user.click(within(preview).getByRole("button", { name: "Tiếp tục" }));
    const confirmation = await screen.findByTestId("local-import-final-dialog");
    expect(within(confirmation).getByText(/bản khôi phục trong 7 ngày/i)).toBeInTheDocument();
    expect(transactionMock.apply).not.toHaveBeenCalled();

    await user.click(within(confirmation).getByRole("button", { name: "Tạo backup và thay dữ liệu" }));
    expect(transactionMock.apply).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid and oversized files without opening a dialog or writing data", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.upload(screen.getByLabelText("Chọn file backup JSON"), new File(["{bad"], "bad.json"));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("File không hợp lệ hoặc bị hỏng."));
    expect(transactionMock.apply).not.toHaveBeenCalled();

    const oversized = new File(["{}"], "too-large.json", { type: "application/json" });
    Object.defineProperty(oversized, "size", { value: 10 * 1024 * 1024 + 1 });
    await user.upload(screen.getByLabelText("Chọn file backup JSON"), oversized);
    expect(toastMock.error).toHaveBeenCalledWith("File quá lớn. Kích thước tối đa là 10 MiB.");
    expect(transactionMock.apply).not.toHaveBeenCalled();
  });

  it("persists a visible sync pause and disables another import for a signed-in real-mode owner", () => {
    transactionMock.pending = createPendingMarker("owner_a");
    renderPage();
    expect(screen.getByText("Đồng bộ đang tạm dừng sau khi nhập dữ liệu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nhập dữ liệu" })).toBeDisabled();
    expect(screen.getByTestId("settings-sync-status-copy")).toHaveTextContent(/chưa được đối chiếu với tài khoản/i);
  });

  it("requires valid dry-run and separate cloud confirmation before resolving the marker", async () => {
    transactionMock.pending = createPendingMarker("owner_a");
    cloudActionsMock.handleValidateCloudImport.mockResolvedValue({
      status: "valid",
      message: "Valid",
      report: { ...invalidReport, status: "valid", errors: [] },
    });
    cloudActionsMock.handleCloudImport.mockResolvedValue({ status: "applied", message: "Applied" });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu tài khoản" }));
    expect(await screen.findByText(/không xóa dữ liệu chỉ có trên tài khoản/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Đồng bộ dữ liệu 12 tuần lên tài khoản" }));
    expect(transactionMock.resolveAfterCloud).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Xác nhận đồng bộ lên tài khoản" }));

    await waitFor(() =>
      expect(transactionMock.resolveAfterCloud).toHaveBeenCalledWith("owner_a", "local_file_import_test"),
    );
    expect(triggerSyncNowMock).toHaveBeenCalledTimes(1);
  });

  it("keeps pause when cloud validation is invalid", async () => {
    transactionMock.pending = createPendingMarker("owner_a");
    cloudActionsMock.handleValidateCloudImport.mockResolvedValue({
      status: "invalid",
      message: "Invalid",
      report: invalidReport,
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu tài khoản" }));

    expect(screen.queryByRole("button", { name: "Đồng bộ dữ liệu 12 tuần lên tài khoản" })).not.toBeInTheDocument();
    expect(transactionMock.resolveAfterCloud).not.toHaveBeenCalled();
    expect(screen.getByText("Đồng bộ đang tạm dừng sau khi nhập dữ liệu")).toBeInTheDocument();
  });

  it.each(["partial", "failed", "skipped", "error"] as const)(
    "keeps pause when the cloud result is %s",
    async (status) => {
      transactionMock.pending = createPendingMarker("owner_a");
      cloudActionsMock.handleCloudImport.mockResolvedValue({ status, message: status });
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu tài khoản" }));
      await user.click(screen.getByRole("button", { name: "Đồng bộ dữ liệu 12 tuần lên tài khoản" }));
      await user.click(screen.getByRole("button", { name: "Xác nhận đồng bộ lên tài khoản" }));

      expect(transactionMock.resolveAfterCloud).not.toHaveBeenCalled();
      expect(screen.getByText("Đồng bộ đang tạm dừng sau khi nhập dữ liệu")).toBeInTheDocument();
    },
  );

  it("keeps the pending marker and avoids protected cloud actions while offline", async () => {
    transactionMock.pending = createPendingMarker("owner_a");
    render(
      <LocalDataImportManager
        currentData={currentData}
        ownerUid="owner_a"
        demoMode={false}
        online={false}
        onDataChanged={onDataChangedMock}
        triggerSyncNow={triggerSyncNowMock}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu tài khoản" }));

    expect(cloudActionsMock.handleValidateCloudImport).not.toHaveBeenCalled();
    expect(cloudActionsMock.handleCloudImport).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith(
      "Bạn đang mất kết nối. Dữ liệu trên thiết bị vẫn an toàn và đồng bộ tiếp tục tạm dừng.",
    );
  });

  it("restores the pre-import snapshot only after AlertDialog confirmation", async () => {
    transactionMock.pending = createPendingMarker("owner_a");
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Khôi phục dữ liệu trước import" }));
    expect(transactionMock.restore).not.toHaveBeenCalled();
    const dialog = await screen.findByTestId("local-import-recovery-dialog");
    await user.click(within(dialog).getByRole("button", { name: "Khôi phục dữ liệu trước import" }));
    expect(transactionMock.restore).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUid: "owner_a",
        recoveryKey: "visionboard_local_file_import_recovery:auth:owner_a:local_file_import_test",
      }),
    );
  });

  it.each([
    { label: "demo", demoMode: true, ownerUid: null },
    { label: "signed-out real mode", demoMode: false, ownerUid: null },
  ])("keeps $label imports local-only", async ({ demoMode, ownerUid }) => {
    renderPage({ demoMode, ownerUid });
    await importAndConfirm(validBackupJson);
    expect(cloudActionsMock.handleValidateCloudImport).not.toHaveBeenCalled();
    expect(cloudActionsMock.handleCloudImport).not.toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith(
      "Đã thay dữ liệu trên thiết bị. Bản khôi phục có hiệu lực trong 7 ngày.",
    );
  });
});

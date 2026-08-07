import { Cloud, FileJson, Loader2, RotateCcw, ShieldAlert, Upload } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  applyLocalDataImportTransaction,
  getPendingLocalDataImport,
  listLocalDataImportRecoverySnapshots,
  resolveLocalDataImportAfterCloud,
  restoreLocalDataImportRecovery,
} from "@/features/plan12week/persistence/localDataImportTransaction";
import {
  LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME,
  type LocalDataImportCandidate,
  type LocalDataImportSummary,
  MAX_LOCAL_DATA_IMPORT_BYTES,
  prepareLocalDataImportCandidate,
} from "../utils/local-data-import";
import type { UserData } from "../utils/storage-types";
import type { CloudImportDryRunResult } from "./root-layout/LocalDataMigrationPrompt";
import { useCloudImportActions } from "./root-layout/useCloudImportActions";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";

interface LocalDataImportManagerProps {
  currentData: UserData;
  ownerUid: string | null;
  demoMode: boolean;
  online: boolean;
  onDataChanged: () => void;
  triggerSyncNow: () => Promise<unknown>;
}

type ReplaceDialogStep = "preview" | "final" | null;
type CloudDialogStep = "confirm" | null;

const SUMMARY_ITEMS: Array<{ key: keyof LocalDataImportSummary; label: string }> = [
  { key: "goalCount", label: "Mục tiêu" },
  { key: "twelveWeekSystemCount", label: "Chu kỳ 12 tuần" },
  { key: "taskCount", label: "Việc" },
  { key: "dailyCheckInCount", label: "Check-in ngày" },
  { key: "weeklyReviewCount", label: "Review tuần" },
  { key: "wheelRecordCount", label: "Bản cân bằng cuộc sống" },
  { key: "reflectionCount", label: "Ghi chú nhìn lại" },
  { key: "visionBoardCount", label: "Vision board" },
];

function SummaryColumn({ title, summary }: { title: string; summary: LocalDataImportSummary }) {
  return (
    <section className="rounded-lg border border-app-line bg-app-bg p-3" aria-label={title}>
      <h3 className="text-sm font-semibold text-app-ink">{title}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        {SUMMARY_ITEMS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-2 border-b border-app-line/70 pb-1.5">
            <dt className="text-app-ink-muted">{label}</dt>
            <dd className="font-semibold tabular-nums text-app-ink">{summary[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function LocalDataImportManager({
  currentData,
  ownerUid,
  demoMode,
  online,
  onDataChanged,
  triggerSyncNow,
}: LocalDataImportManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [candidate, setCandidate] = useState<LocalDataImportCandidate | null>(null);
  const [replaceDialogStep, setReplaceDialogStep] = useState<ReplaceDialogStep>(null);
  const [cloudDialogStep, setCloudDialogStep] = useState<CloudDialogStep>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [pending, setPending] = useState(() => (ownerUid ? getPendingLocalDataImport(ownerUid) : null));
  const [recoveries, setRecoveries] = useState(() => listLocalDataImportRecoverySnapshots(ownerUid));
  const [cloudValidation, setCloudValidation] = useState<CloudImportDryRunResult | null>(null);
  const [busy, setBusy] = useState(false);

  const cloudActions = useCloudImportActions({
    demoMode,
    userUid: ownerUid,
    localDataMigrationCandidate: null,
    trackingSource: "settings_file_import",
    recordMigrationCompletion: false,
  });

  const refreshImportState = useCallback(() => {
    const nextPending = ownerUid ? getPendingLocalDataImport(ownerUid) : null;
    setPending(nextPending);
    setRecoveries(listLocalDataImportRecoverySnapshots(ownerUid));
    if (!nextPending) setCloudValidation(null);
  }, [ownerUid]);

  useEffect(() => {
    refreshImportState();
    window.addEventListener(LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME, refreshImportState);
    return () => window.removeEventListener(LOCAL_DATA_FILE_IMPORT_STATE_CHANGED_EVENT_NAME, refreshImportState);
  }, [refreshImportState]);

  const localOnlyRecovery = ownerUid === null ? (recoveries[0] ?? null) : null;
  const activeRecoveryKey = pending?.recoveryKey ?? localOnlyRecovery?.key ?? null;

  const clearCandidate = () => {
    setCandidate(null);
    setReplaceDialogStep(null);
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_LOCAL_DATA_IMPORT_BYTES) {
      toast.error("File quá lớn. Kích thước tối đa là 10 MiB.");
      return;
    }

    try {
      const result = prepareLocalDataImportCandidate({
        fileName: file.name,
        sizeBytes: file.size,
        text: await file.text(),
        currentData,
      });
      if (result.status !== "ready") {
        toast.error("File không hợp lệ hoặc bị hỏng.");
        return;
      }
      setCandidate(result.candidate);
      setReplaceDialogStep("preview");
    } catch {
      toast.error("Không đọc được file.");
    }
  };

  const handleApply = () => {
    if (!candidate) return;
    setBusy(true);
    try {
      const result = applyLocalDataImportTransaction({
        candidate,
        ownerUid,
        pauseCloudSync: !demoMode && Boolean(ownerUid),
      });
      if (result.status !== "applied") {
        const message =
          result.status === "owner_mismatch"
            ? "Tài khoản hiện tại đã thay đổi. Hãy tải lại trang trước khi nhập dữ liệu."
            : result.status === "fingerprint_mismatch"
              ? "Dữ liệu trên thiết bị đã thay đổi. Hãy chọn lại file và xem trước lần nữa."
              : result.status === "pending_exists"
                ? "Hãy xử lý lần nhập dữ liệu đang chờ trước khi nhập file khác."
                : "Không thể tạo bản khôi phục hoặc thay dữ liệu. Dữ liệu cũ vẫn được giữ.";
        toast.error(message);
        return;
      }
      onDataChanged();
      setCandidate(null);
      setReplaceDialogStep(null);
      refreshImportState();
      toast.success(
        result.pending
          ? "Đã thay dữ liệu trên thiết bị. Đồng bộ tài khoản đang tạm dừng."
          : "Đã thay dữ liệu trên thiết bị. Bản khôi phục có hiệu lực trong 7 ngày.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleValidateCloudImport = async () => {
    if (!online) {
      toast.error("Bạn đang mất kết nối. Dữ liệu trên thiết bị vẫn an toàn và đồng bộ tiếp tục tạm dừng.");
      return;
    }
    if (!cloudActions.cloudImportDryRunEnabled) {
      toast.error(
        cloudActions.cloudImportDryRunUnavailableReason ?? "Không thể kiểm tra dữ liệu tài khoản lúc này.",
      );
      return;
    }

    setBusy(true);
    try {
      setCloudValidation(await cloudActions.handleValidateCloudImport());
    } finally {
      setBusy(false);
    }
  };

  const handleCloudImport = async () => {
    if (!pending) return;
    if (!online) {
      toast.error("Bạn đang mất kết nối. Dữ liệu trên thiết bị vẫn an toàn và đồng bộ tiếp tục tạm dừng.");
      return;
    }
    if (!cloudActions.cloudImportEnabled) {
      toast.error(cloudActions.cloudImportUnavailableReason ?? "Không thể đồng bộ dữ liệu tài khoản lúc này.");
      return;
    }

    setBusy(true);
    try {
      const result = await cloudActions.handleCloudImport();
      if (result.status === "applied" || result.status === "duplicate") {
        if (resolveLocalDataImportAfterCloud(pending.ownerUid, pending.importId)) {
          setCloudDialogStep(null);
          refreshImportState();
          toast.success(result.message);
          await triggerSyncNow();
        } else {
          toast.error("Không thể mở lại đồng bộ tự động. Hãy tải lại trang và thử lại.");
        }
        return;
      }
      toast.error(result.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = () => {
    if (!recoveryKey) return;
    setBusy(true);
    try {
      const result = restoreLocalDataImportRecovery({ recoveryKey, ownerUid });
      if (result.status !== "restored") {
        const message =
          result.status === "owner_mismatch"
            ? "Bản khôi phục không thuộc tài khoản hiện tại."
            : result.status === "expired"
              ? "Bản khôi phục đã hết hạn."
              : result.status === "missing" || result.status === "invalid"
                ? "Không tìm thấy bản khôi phục hợp lệ."
                : "Không thể khôi phục dữ liệu. Dữ liệu hiện tại vẫn được giữ.";
        toast.error(message);
        return;
      }
      setRecoveryKey(null);
      setCloudDialogStep(null);
      onDataChanged();
      refreshImportState();
      toast.success("Đã khôi phục dữ liệu trước import.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="contents">
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={Boolean(pending) || busy}
      >
        <Upload className="h-4 w-4" />
        Nhập dữ liệu
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="Chọn file backup JSON"
        disabled={Boolean(pending) || busy}
        onChange={(event) => void handleFileSelected(event)}
      />

      {pending ? (
        <section className="basis-full rounded-lg border border-app-status-warning/30 bg-app-status-warning/10 p-4 text-app-status-warning">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">Đồng bộ đang tạm dừng sau khi nhập dữ liệu</h3>
              <p data-testid="settings-sync-status-copy" className="mt-1 text-sm leading-6">
                Dữ liệu import đang an toàn trên thiết bị nhưng chưa được đối chiếu với tài khoản.
              </p>
              <p className="mt-1 text-xs leading-5">
                Chọn kiểm tra dữ liệu tài khoản, hoặc để sau để giữ nguyên bản local và trạng thái tạm dừng.
              </p>

              {cloudValidation ? (
                <div
                  className="mt-3 rounded-lg border border-app-line bg-app-surface p-3 text-sm text-app-ink-soft"
                  role={cloudValidation.status === "valid" ? "status" : "alert"}
                >
                  <p className="font-semibold text-app-ink">{cloudValidation.message}</p>
                  {cloudValidation.report?.warnings.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                      {cloudValidation.report.warnings.slice(0, 3).map((warning) => (
                        <li key={`${warning.path}:${warning.code}`}>{warning.message}</li>
                      ))}
                    </ul>
                  ) : null}
                  {cloudValidation.report?.errors.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[color:var(--color-danger-fg)]">
                      {cloudValidation.report.errors.slice(0, 3).map((error) => (
                        <li key={`${error.path}:${error.code}`}>{error.message}</li>
                      ))}
                    </ul>
                  ) : null}
                  {cloudValidation.status === "valid" ? (
                    <p className="mt-2 text-xs leading-5">
                      Tính năng này không xóa dữ liệu chỉ có trên tài khoản. Dữ liệu hỗ trợ sẽ được thêm hoặc cập nhật.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!cloudActions.cloudImportEnabled && cloudActions.cloudImportUnavailableReason ? (
                <p className="mt-3 text-xs leading-5">{cloudActions.cloudImportUnavailableReason}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleValidateCloudImport()}
                  disabled={busy}
                  aria-busy={busy}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                  Kiểm tra dữ liệu tài khoản
                </Button>
                {cloudValidation?.status === "valid" ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setCloudDialogStep("confirm")}
                    disabled={busy || !cloudActions.cloudImportEnabled}
                  >
                    <Upload className="h-4 w-4" />
                    Đồng bộ dữ liệu 12 tuần lên tài khoản
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setRecoveryKey(pending.recoveryKey)}
                  disabled={busy}
                >
                  <RotateCcw className="h-4 w-4" />
                  Khôi phục dữ liệu trước import
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : localOnlyRecovery ? (
        <section className="basis-full rounded-lg border border-app-line bg-app-bg p-4">
          <div className="flex items-start gap-3">
            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-app-ink-muted" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-app-ink">Bản khôi phục trước import</h3>
              <p className="mt-1 text-xs leading-5 text-app-ink-muted">
                Bản dữ liệu trước lần import gần nhất còn hiệu lực đến {new Date(localOnlyRecovery.expiresAt).toLocaleString("vi-VN")}.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setRecoveryKey(localOnlyRecovery.key)}
                disabled={busy}
              >
                <RotateCcw className="h-4 w-4" />
                Khôi phục dữ liệu trước import
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <AlertDialog
        open={replaceDialogStep === "preview"}
        onOpenChange={(open) => {
          if (!open && replaceDialogStep === "preview") clearCandidate();
        }}
      >
        <AlertDialogContent data-testid="local-import-preview-dialog" className="sm:max-w-2xl">
          <AlertDialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
              <FileJson className="h-5 w-5" />
            </div>
            <AlertDialogTitle>Xem trước dữ liệu sẽ thay thế</AlertDialogTitle>
            <AlertDialogDescription>
              File mới chỉ được kiểm tra trong bộ nhớ. Chưa có dữ liệu nào trên thiết bị hoặc tài khoản bị thay đổi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {candidate ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryColumn title="Hiện tại trên thiết bị" summary={candidate.currentSummary} />
              <SummaryColumn title="Trong file import" summary={candidate.importedSummary} />
            </div>
          ) : null}
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={clearCandidate}>
              Hủy
            </Button>
            <Button type="button" onClick={() => setReplaceDialogStep("final")}>
              Tiếp tục
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={replaceDialogStep === "final"}
        onOpenChange={(open) => {
          if (!open && replaceDialogStep === "final" && !busy) clearCandidate();
        }}
      >
        <AlertDialogContent data-testid="local-import-final-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Thay toàn bộ dữ liệu trên thiết bị?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              Dữ liệu hiện tại sẽ được thay bằng file đã xem trước. Hệ thống sẽ tạo một bản khôi phục trong 7 ngày trước
              khi ghi dữ liệu mới.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setReplaceDialogStep("preview")} disabled={busy}>
              Quay lại
            </Button>
            <Button type="button" onClick={handleApply} disabled={busy} aria-busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              Tạo backup và thay dữ liệu
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cloudDialogStep === "confirm"} onOpenChange={(open) => !open && setCloudDialogStep(null)}>
        <AlertDialogContent data-testid="local-import-cloud-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Đồng bộ dữ liệu 12 tuần lên tài khoản?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              Dữ liệu hỗ trợ sẽ được thêm hoặc cập nhật; dữ liệu chỉ có trên tài khoản sẽ không bị xóa. Chỉ tiếp tục
              sau khi kết quả kiểm tra hợp lệ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setCloudDialogStep(null)} disabled={busy}>
              Quay lại
            </Button>
            <Button type="button" onClick={() => void handleCloudImport()} disabled={busy} aria-busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
              Xác nhận đồng bộ lên tài khoản
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(recoveryKey)} onOpenChange={(open) => !open && !busy && setRecoveryKey(null)}>
        <AlertDialogContent data-testid="local-import-recovery-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục dữ liệu trước import?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              Dữ liệu hiện tại, hàng chờ đồng bộ và con trỏ cloud của đúng tài khoản sẽ được thay bằng trạng thái trước
              import. Hành động chỉ áp dụng cho bản khôi phục đang chọn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setRecoveryKey(null)} disabled={busy}>
              Quay lại
            </Button>
            <Button
              type="button"
              data-testid="local-import-recovery-confirm"
              onClick={handleRestore}
              disabled={busy || !activeRecoveryKey}
              aria-busy={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Khôi phục dữ liệu trước import
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

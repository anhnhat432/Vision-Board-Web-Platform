import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, ExternalLink, Loader2, Monitor, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router";

import { exportUserDataSnapshot } from "@/app/utils/storage";
import { useAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import type { AutoCloudSyncState } from "@/features/plan12week/hooks/useAutoCloudSync";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME } from "./SyncStatusPill";

const ENTITY_LABELS: Record<string, string> = {
  goal: "Mục tiêu",
  plan: "Kế hoạch",
  week: "Tuần",
  task: "Việc",
  leadMetric: "Chỉ số dẫn",
  dailyCheckIn: "Check-in ngày",
  weeklyReview: "Review tuần",
};

type ConflictItem = NonNullable<NonNullable<AutoCloudSyncState["lastResult"]>["mergeReport"]>["conflicts"][number];

function getConflictKey(state: AutoCloudSyncState | null): string | null {
  const result = state?.lastResult;
  if (!state?.conflictPending || !result) return null;
  const conflictCount = result.mergeReport?.conflicts.length ?? 0;
  return `${state.lastSyncedAt ?? "unsynced"}:${result.status}:${conflictCount}:${result.message}`;
}

function buildConflictSummary(conflict: ConflictItem): string {
  const label = ENTITY_LABELS[conflict.kind] ?? "Mục";
  const identifier = conflict.clientId ?? conflict.localId ?? conflict.cloudId ?? conflict.path;
  return `${label} ${identifier}: ${conflict.message}`;
}

function downloadBackupJson(): void {
  const backupJson = exportUserDataSnapshot();
  const blob = new Blob([backupJson], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `visionboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AutoCloudConflictDialog() {
  const autoSyncState = useAutoCloudSyncContext();
  const navigate = useNavigate();
  const [dismissedConflictKey, setDismissedConflictKey] = useState<string | null>(null);
  const [showUseCloudConfirm, setShowUseCloudConfirm] = useState(false);
  const [resolvingAction, setResolvingAction] = useState<"keepLocal" | "useCloud" | null>(null);
  const conflictKey = getConflictKey(autoSyncState);
  const open = Boolean(conflictKey && dismissedConflictKey !== conflictKey);
  const conflicts = useMemo(
    () => autoSyncState?.lastResult?.mergeReport?.conflicts.slice(0, 3) ?? [],
    [autoSyncState?.lastResult?.mergeReport?.conflicts],
  );

  useEffect(() => {
    if (!conflictKey) return;
    setShowUseCloudConfirm(false);
    setResolvingAction(null);
  }, [conflictKey]);

  useEffect(() => {
    const handleOpenRequest = () => {
      setDismissedConflictKey(null);
      setShowUseCloudConfirm(false);
    };

    window.addEventListener(AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME, handleOpenRequest);
    return () => {
      window.removeEventListener(AUTO_CLOUD_CONFLICT_DIALOG_OPEN_EVENT_NAME, handleOpenRequest);
    };
  }, []);

  if (!conflictKey) return null;

  const handleKeepLocal = async () => {
    setResolvingAction("keepLocal");
    try {
      await autoSyncState.resolveConflictKeepLocal();
      setDismissedConflictKey(conflictKey);
    } finally {
      setResolvingAction(null);
    }
  };

  const handleUseCloud = async () => {
    setResolvingAction("useCloud");
    try {
      downloadBackupJson();
      await autoSyncState.resolveConflictUseCloud();
      setDismissedConflictKey(conflictKey);
      setShowUseCloudConfirm(false);
    } finally {
      setResolvingAction(null);
    }
  };

  const handlePostpone = () => {
    setDismissedConflictKey(conflictKey);
    setShowUseCloudConfirm(false);
  };

  const handleSettingsLink = () => {
    setDismissedConflictKey(conflictKey);
    navigate("/settings");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handlePostpone();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-[var(--r-tile)] bg-amber-50 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle>Dữ liệu giữa thiết bị và tài khoản đang khác nhau</DialogTitle>
          <DialogDescription className="leading-6">
            Đồng bộ tự động đã dừng trước khi ghi đè. Chọn bản bạn muốn ưu tiên để tiếp tục dùng hệ 12 tuần an toàn.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-[var(--r-card)] border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
          {conflicts.length > 0 ? (
            <ul className="space-y-2">
              {conflicts.map((conflict) => (
                <li key={`${conflict.path}:${conflict.reason}`} className="leading-6">
                  {buildConflictSummary(conflict)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="leading-6">
              Có dữ liệu chưa thể gộp tự động. Bản trên thiết bị và bản trong tài khoản đều được giữ nguyên cho đến khi
              bạn chọn cách xử lý.
            </p>
          )}
        </div>

        {showUseCloudConfirm ? (
          <div className="rounded-[var(--r-card)] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">Bản trên thiết bị sẽ bị thay thế. Tải xuống bản backup trước?</p>
            <p className="mt-2 leading-6">
              Ứng dụng sẽ tự tải một bản sao dữ liệu hiện tại rồi mới áp dụng bản trong tài khoản.
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSettingsLink}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
        >
          Xem chi tiết trong Cài đặt
          <ExternalLink className="h-3.5 w-3.5" />
        </button>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={handlePostpone}>
            Để sau
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="destructive" onClick={handleKeepLocal} disabled={Boolean(resolvingAction)}>
              {resolvingAction === "keepLocal" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
              Giữ trên thiết bị này
            </Button>
            {showUseCloudConfirm ? (
              <Button type="button" onClick={handleUseCloud} disabled={Boolean(resolvingAction)}>
                {resolvingAction === "useCloud" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Tải backup và lấy bản tài khoản
              </Button>
            ) : (
              <Button type="button" onClick={() => setShowUseCloudConfirm(true)} disabled={Boolean(resolvingAction)}>
                <RotateCcw className="h-4 w-4" />
                Lấy bản tài khoản
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

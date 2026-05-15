import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, CloudDownload, CreditCard, Loader2, RefreshCw, RotateCcw, Upload, User2, Volume2, WifiOff } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { DataStorageInfo } from "../components/DataStorageInfo";
import { CloudSyncIllustration, SyncIdleDot, SyncOkDot } from "../components/illustrations";
import { PageHeader } from "../components/layout/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { DashboardDataBackupCard } from "@/features/dashboard/components/DashboardDataBackupCard";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { useAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { formatBillingExpiryDate, getBillingExpiryInfo } from "../utils/billing-expiry";
import { downloadLocalUserDataBackup } from "../utils/local-data-backup";
import { getMigrationBackupSnapshots, restoreMigrationBackupSnapshot, type MigrationBackupSnapshot } from "../utils/local-data-migration";
import { isSoundEnabled, setSoundEnabled } from "../utils/sound";
import { getUserData, parseStoredUserData, saveUserData } from "../utils/storage";
import { exportAccountData } from "@/services/syncService";

function downloadJsonFile(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return fallback;
}

function formatSyncTime(value: string | null): string {
  if (!value) return "Chưa có lần đồng bộ tài khoản";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có lần đồng bộ tài khoản";
  return `Lần cuối: ${date.toLocaleString("vi-VN")}`;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const importFileRef = useRef<HTMLInputElement>(null);
  const [isExportingAccount, setIsExportingAccount] = useState(false);
  const [taskSoundEnabled, setTaskSoundEnabled] = useState(() => isSoundEnabled());
  const [migrationBackups, setMigrationBackups] = useState<MigrationBackupSnapshot[]>(() => getMigrationBackupSnapshots());
  const [recoverySnapshotKey, setRecoverySnapshotKey] = useState<string | null>(null);
  const { isConfigured, user, userProfile } = useAuthContext();
  const autoSyncState = useAutoCloudSyncContext();
  const { userData: syncedUserData, reloadUserData } = useSyncedUserData();
  const userData = syncedUserData ?? getUserData();
  const expiryInfo = getBillingExpiryInfo(userData.subscription);
  const shouldShowExpiryNotice =
    userData.subscription?.planCode === "PLUS" && (expiryInfo.isExpiringSoon || expiryInfo.isExpired);
  const accountLabel = userProfile?.displayName || user?.displayName || user?.email || "Khách";
  const accountStatus = !isConfigured
    ? "Đang dùng dữ liệu trên thiết bị"
    : user
      ? userProfile?.email || user.email || "Đã đăng nhập"
      : "Chưa đăng nhập";
  const AccountStatusDot = isConfigured && user ? SyncOkDot : SyncIdleDot;
  const firstRecoverySnapshot = migrationBackups[0];

  useEffect(() => {
    setMigrationBackups(getMigrationBackupSnapshots());
  }, []);

  const handleExport = () => {
    downloadLocalUserDataBackup({ data: userData, filenamePrefix: "dear-our-future-backup" });
    toast.success("Đã tải bản sao lưu dữ liệu.");
  };

  const handleAccountExport = async () => {
    if (!isConfigured || !user) {
      toast.error("Bạn cần đăng nhập để xuất dữ liệu tài khoản trên đám mây.");
      return;
    }

    setIsExportingAccount(true);
    try {
      const exported = await exportAccountData();
      const dateSlug = exported.generatedAt.slice(0, 10) || new Date().toISOString().slice(0, 10);
      downloadJsonFile(exported, `dear-our-future-account-export-${dateSlug}.json`);
      toast.success("Đã tải bản xuất dữ liệu tài khoản.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xuất dữ liệu tài khoản lúc này."));
    } finally {
      setIsExportingAccount(false);
    }
  };

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== "string") {
        toast.error("Không đọc được file.");
        return;
      }

      const parsed = parseStoredUserData(text);
      if (!parsed) {
        toast.error("File không hợp lệ hoặc bị hỏng.");
        return;
      }

      saveUserData(parsed);
      reloadUserData();
      toast.success("Đã nhập dữ liệu. Trang chính sẽ dùng dữ liệu mới.");
    };
    reader.onerror = () => toast.error("Không đọc được file.");
    reader.readAsText(file);
  };

  const handleTaskSoundEnabledChange = (enabled: boolean) => {
    setTaskSoundEnabled(enabled);
    setSoundEnabled(enabled);
  };

  const handleRestoreMigrationBackup = () => {
    if (!recoverySnapshotKey) return;

    try {
      const restored = restoreMigrationBackupSnapshot(recoverySnapshotKey);
      if (!restored) {
        toast.error("Không tìm thấy bản sao dữ liệu cũ hoặc bản sao đã hỏng.");
        return;
      }

      reloadUserData();
      setMigrationBackups(getMigrationBackupSnapshots());
      setRecoverySnapshotKey(null);
      toast.success("Đã khôi phục dữ liệu cũ.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể khôi phục dữ liệu cũ lúc này."));
    }
  };

  const handleRetrySync = async () => {
    const result = await autoSyncState.triggerSyncNow();
    if (result?.status === "conflict" || result?.status === "unsafe") {
      toast.warning("Có khác biệt giữa thiết bị và tài khoản. Mở thông báo đồng bộ để chọn phiên bản an toàn.");
      return;
    }
    if (result?.status === "error" || result?.status === "drain_failed") {
      toast.error(result.message || "Chưa sao lưu được vào tài khoản. Dữ liệu vẫn được giữ trên thiết bị này.");
      return;
    }
    toast.success("Đã kiểm tra sao lưu tài khoản.");
  };

  const syncIcon = autoSyncState.conflictPending
    ? AlertTriangle
    : autoSyncState.syncing
      ? Loader2
      : !autoSyncState.online
        ? WifiOff
        : autoSyncState.pendingCount > 0
          ? Upload
          : CheckCircle2;
  const SyncIcon = syncIcon;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <h1 className="sr-only">Tài khoản và dữ liệu</h1>
      <PageHeader
        eyebrow="Cài đặt"
        title="Tài khoản và dữ liệu"
        description="Quản lý dữ liệu lưu trên thiết bị này, bản sao lưu và các lối tắt cài đặt quan trọng."
      />

      <section className="stack-tight" aria-label="Dữ liệu và sao lưu">
        <DataStorageInfo variant="banner" />
        <DashboardDataBackupCard
          importInputRef={importFileRef}
          onExport={handleExport}
          onImport={handleImport}
          onOpenImportPicker={() => importFileRef.current?.click()}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]" aria-label="Cài đặt nhanh">
        {firstRecoverySnapshot ? (
          <Card className="glass-surface-sm rounded-[var(--r-card)] border-amber-200 bg-amber-50/80 shadow-none lg:col-span-2">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex gap-3">
                <RotateCcw className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-950">Có 1 bản sao dữ liệu cũ chưa được phục hồi</p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    Bấm để khôi phục dữ liệu cũ. Thao tác này sẽ ghi đè dữ liệu hiện tại trên thiết bị này.
                  </p>
                </div>
              </div>
              <Button className="gap-2 rounded-[var(--r-control)]" onClick={() => setRecoverySnapshotKey(firstRecoverySnapshot.key)}>
                <RotateCcw className="h-4 w-4" />
                Khôi phục dữ liệu cũ
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {shouldShowExpiryNotice && (
          <Card className="glass-surface-sm rounded-[var(--r-card)] border-amber-200 bg-amber-50/80 shadow-none lg:col-span-2">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-950">
                    {expiryInfo.isExpired
                      ? "Gói Plus đã hết hạn"
                      : `Gói Plus còn ${expiryInfo.daysLeft ?? 0} ngày`}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    {expiryInfo.isExpired
                      ? "Gia hạn để mở lại quyền Plus trên tài khoản này."
                      : `Chu kỳ hiện tại hết hạn ngày ${formatBillingExpiryDate(expiryInfo.expiresAt)}.`}
                  </p>
                </div>
              </div>
              <Button className="gap-2 rounded-[var(--r-control)]" onClick={() => navigate("/billing/plan")}>
                <RefreshCw className="h-4 w-4" />
                Mở trang gia hạn
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="glass-surface-sm rounded-[var(--r-card)] border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User2 className="h-4 w-4 text-slate-500" />
              Tài khoản
            </CardTitle>
            <CardDescription>Thông tin đăng nhập hiện tại của không gian làm việc này.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{accountLabel}</p>
                <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-sm text-slate-500">
                  <AccountStatusDot className="h-4 w-4 shrink-0" />
                  <span className="truncate">{accountStatus}</span>
                </p>
              </div>
              <CloudSyncIllustration className="hidden w-24 text-violet-500 opacity-70 sm:block" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-[var(--space-stack)] w-full gap-2 rounded-[var(--r-control)]"
              disabled={!isConfigured || !user || isExportingAccount}
              onClick={handleAccountExport}
            >
              {isExportingAccount ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CloudDownload className="h-4 w-4" />
              )}
              Xuất dữ liệu tài khoản
            </Button>
          </CardContent>
        </Card>

        <Card id="account-sync" className="glass-surface-sm scroll-mt-24 rounded-[var(--r-card)] border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <SyncIcon className={`h-4 w-4 ${autoSyncState.syncing ? "animate-spin text-sky-600" : "text-slate-500"}`} />
              Sao lưu tài khoản
            </CardTitle>
            <CardDescription>Phân biệt dữ liệu đã lưu trên thiết bị và dữ liệu đã sao lưu vào tài khoản.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-[var(--r-control)] border border-slate-200 bg-white/75 p-3">
                <p className="font-semibold text-slate-900">Thiết bị</p>
                <p className="mt-1 leading-6 text-slate-500">Thay đổi được giữ ngay trên thiết bị này.</p>
              </div>
              <div className="rounded-[var(--r-control)] border border-slate-200 bg-white/75 p-3">
                <p className="font-semibold text-slate-900">Tài khoản</p>
                <p className="mt-1 leading-6 text-slate-500">{formatSyncTime(autoSyncState.lastSyncedAt)}</p>
              </div>
              <div className="rounded-[var(--r-control)] border border-slate-200 bg-white/75 p-3">
                <p className="font-semibold text-slate-900">Việc đang chờ đồng bộ</p>
                <p className="mt-1 leading-6 text-slate-500">
                  {autoSyncState.pendingCount > 0
                    ? `${autoSyncState.pendingCount} thay đổi chờ đồng bộ`
                    : "Không có thay đổi chờ đồng bộ"}
                </p>
              </div>
            </div>
            <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50/80 p-3 text-sm leading-6 text-slate-600">
              {autoSyncState.conflictPending
                ? "Dữ liệu trên thiết bị và tài khoản đang khác nhau. Ứng dụng sẽ hỏi bạn trước khi ghi đè."
                  : !autoSyncState.online
                    ? "Bạn đang mất kết nối. Dữ liệu vẫn được lưu trên thiết bị và sẽ gửi lên tài khoản khi có mạng."
                    : autoSyncState.syncing
                      ? "Đang sao lưu lên tài khoản. Bạn có thể tiếp tục dùng app."
                      : "Sao lưu sẵn sàng. Nếu có lỗi, dữ liệu vẫn được giữ trên thiết bị này để thử lại."}
            </div>
            {autoSyncState.lastResult?.message ? (
              <div className="rounded-[var(--r-control)] border border-slate-200 bg-white/80 p-3 text-sm leading-6 text-slate-600">
                <p className="font-semibold text-slate-900">Kết quả gần nhất</p>
                <p className="mt-1">{autoSyncState.lastResult.message}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" className="gap-2 rounded-[var(--r-control)]" onClick={handleRetrySync} disabled={autoSyncState.syncing || !user}>
                {autoSyncState.syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Kiểm tra sao lưu
              </Button>
              <Button type="button" variant="outline" className="gap-2 rounded-[var(--r-control)]" onClick={handleExport}>
                <CloudDownload className="h-4 w-4" />
                Tải backup thiết bị
              </Button>
              <Button type="button" variant="outline" className="gap-2 rounded-[var(--r-control)]" onClick={() => navigate("/12-week-system?tab=settings")}>
                <CalendarDays className="h-4 w-4" />
                Mở cài đặt chu kỳ
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-surface-sm rounded-[var(--r-card)] border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lối tắt cài đặt</CardTitle>
            <CardDescription>Mở đúng khu vực khi cần chỉnh chu kỳ hoặc gói truy cập.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2 rounded-[var(--r-control)]" onClick={() => navigate("/12-week-system/settings")}>
              <CalendarDays className="h-4 w-4" />
              Cài đặt chu kỳ
            </Button>
            <Button variant="outline" className="gap-2 rounded-[var(--r-control)]" onClick={() => navigate("/billing/plan")}>
              <CreditCard className="h-4 w-4" />
              Gói & thanh toán
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-surface-sm rounded-[var(--r-card)] border shadow-none lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Volume2 className="h-4 w-4 text-slate-500" />
              Tuỳ chọn trải nghiệm
            </CardTitle>
            <CardDescription>Điều chỉnh phản hồi nhỏ khi bạn làm việc trong hệ 12 tuần.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-[var(--r-control)] border border-slate-200 bg-white/70 px-4 py-3">
              <div className="min-w-0">
                <label htmlFor="task-complete-sound" className="text-sm font-semibold text-slate-900">
                  Âm thanh khi xong việc
                </label>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Phát một tiếng rất nhẹ khi bạn chốt xong việc hôm nay.
                </p>
              </div>
              <Switch
                id="task-complete-sound"
                checked={taskSoundEnabled}
                onCheckedChange={handleTaskSoundEnabledChange}
                aria-label="Âm thanh khi xong việc"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <AlertDialog open={Boolean(recoverySnapshotKey)} onOpenChange={(open) => !open && setRecoverySnapshotKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục dữ liệu cũ?</AlertDialogTitle>
            <AlertDialogDescription>
              Dữ liệu hiện tại trên thiết bị này sẽ được thay bằng bản sao dữ liệu cũ. Hãy tải backup thiết bị trước nếu bạn muốn giữ cả hai phiên bản.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreMigrationBackup}>Khôi phục dữ liệu cũ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

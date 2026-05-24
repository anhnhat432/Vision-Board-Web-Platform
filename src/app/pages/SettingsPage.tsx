import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  CloudDownload,
  CreditCard,
  Download,
  Languages,
  Loader2,
  Palette,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Upload,
  User2,
  Volume2,
  WifiOff,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

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
import { Switch } from "../components/ui/switch";
import { useTheme } from "../hooks/useTheme";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { useAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { inputClass } from "./SMARTGoalSetup/components/formStyles";
import { formatBillingExpiryDate, getBillingExpiryInfo } from "../utils/billing-expiry";
import { downloadLocalUserDataBackup } from "../utils/local-data-backup";
import {
  getMigrationBackupSnapshots,
  restoreMigrationBackupSnapshot,
  type MigrationBackupSnapshot,
} from "../utils/local-data-migration";
import { isSoundEnabled, setSoundEnabled } from "../utils/sound";
import {
  deleteAllUserData,
  getUserData,
  parseStoredUserData,
  saveUserData,
  updateAppPreferences,
} from "../utils/storage";
import { exportAccountData } from "@/services/syncService";

const themeOptions = [
  { value: "system", label: "Theo thiết bị", description: "Dùng cài đặt hệ thống." },
  { value: "light", label: "Sáng", description: "Nền sáng, dễ đọc ban ngày." },
  { value: "dark", label: "Tối", description: "Giảm sáng khi dùng buổi tối." },
] as const;

type ClearDataConfirmStep = "review" | "final";

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

function getAccountInitial(label: string): string {
  return label.trim().charAt(0).toUpperCase() || "K";
}

export function SettingsPage() {
  const navigate = useNavigate();
  const importFileRef = useRef<HTMLInputElement>(null);
  const [isExportingAccount, setIsExportingAccount] = useState(false);
  const [taskSoundEnabled, setTaskSoundEnabled] = useState(() => isSoundEnabled());
  const [migrationBackups, setMigrationBackups] = useState<MigrationBackupSnapshot[]>(() =>
    getMigrationBackupSnapshots(),
  );
  const [recoverySnapshotKey, setRecoverySnapshotKey] = useState<string | null>(null);
  const [isClearDataDialogOpen, setIsClearDataDialogOpen] = useState(false);
  const [clearDataConfirmStep, setClearDataConfirmStep] = useState<ClearDataConfirmStep>("review");
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { isConfigured, user, userProfile } = useAuthContext();
  const autoSyncState = useAutoCloudSyncContext();
  const { userData: syncedUserData, reloadUserData } = useSyncedUserData();
  const userData = syncedUserData ?? getUserData();
  const appPreferences = userData.appPreferences;
  const expiryInfo = getBillingExpiryInfo(userData.subscription);
  const shouldShowExpiryNotice =
    userData.subscription?.planCode === "PLUS" && (expiryInfo.isExpiringSoon || expiryInfo.isExpired);
  const accountLabel = userProfile?.displayName || user?.displayName || user?.email || "Khách";
  const accountEmail = userProfile?.email || user?.email || "Chưa đăng nhập";
  const accountStatus = !isConfigured
    ? "Đang dùng dữ liệu trên thiết bị"
    : user
      ? userProfile?.email || user.email || "Đã đăng nhập"
      : "Chưa đăng nhập";
  const avatarUrl = userProfile?.avatarUrl ?? user?.photoURL ?? null;
  const accountInitial = getAccountInitial(accountLabel);
  const localeLabel = (userProfile?.locale ?? "vi").startsWith("vi")
    ? "Tiếng Việt"
    : (userProfile?.locale ?? "Tiếng Việt");
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

  const handleInAppRemindersChange = (enabled: boolean) => {
    updateAppPreferences({ enableInAppReminders: enabled });
    reloadUserData();
    toast.success(enabled ? "Đã bật nhắc việc trong app." : "Đã tắt nhắc việc trong app.");
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

  const handleClearDataDialogChange = (open: boolean) => {
    setIsClearDataDialogOpen(open);
    if (!open) setClearDataConfirmStep("review");
  };

  const handleClearAllData = () => {
    deleteAllUserData();
    reloadUserData();
    setIsClearDataDialogOpen(false);
    setClearDataConfirmStep("review");
    toast.success("Đã xóa dữ liệu trên thiết bị này.");
    navigate("/");
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
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">CÀI ĐẶT</p>
        <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-tight text-app-ink">
          Tuỳ chỉnh tài khoản
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-app-ink-soft">
          Quản lý tài khoản, dữ liệu lưu trên thiết bị và những tuỳ chọn nhỏ để app chạy đúng nhịp của bạn.
        </p>
      </header>

      <div className="mt-6 space-y-5">
        {firstRecoverySnapshot ? (
          <section className="rounded-card border border-app-line bg-app-surface p-5" aria-label="Khôi phục dữ liệu cũ">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold text-app-ink">Có 1 bản sao dữ liệu cũ chưa được phục hồi</p>
                  <p className="mt-1 text-sm leading-6 text-app-ink-soft">
                    Bấm để khôi phục dữ liệu cũ. Thao tác này sẽ ghi đè dữ liệu hiện tại trên thiết bị này.
                  </p>
                </div>
              </div>
              <Button type="button" onClick={() => setRecoverySnapshotKey(firstRecoverySnapshot.key)}>
                <RotateCcw className="h-4 w-4" />
                Khôi phục dữ liệu cũ
              </Button>
            </div>
          </section>
        ) : null}

        {shouldShowExpiryNotice ? (
          <section className="rounded-card border border-app-line bg-app-surface p-5" aria-label="Trạng thái gói Plus">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold text-app-ink">
                    {expiryInfo.isExpired ? "Gói Plus đã hết hạn" : `Gói Plus còn ${expiryInfo.daysLeft ?? 0} ngày`}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-app-ink-soft">
                    {expiryInfo.isExpired
                      ? "Gia hạn để mở lại quyền Plus trên tài khoản này."
                      : `Chu kỳ hiện tại hết hạn ngày ${formatBillingExpiryDate(expiryInfo.expiresAt)}.`}
                  </p>
                </div>
              </div>
              <Button type="button" onClick={() => navigate("/billing/plan")}>
                <RefreshCw className="h-4 w-4" />
                Mở trang gia hạn
              </Button>
            </div>
          </section>
        ) : null}

        <section className="rounded-card border border-app-line bg-app-surface p-6 md:p-8" aria-label="Tài khoản">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
              <User2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-medium text-app-ink">Tài khoản</h2>
              <p className="mt-1 text-sm leading-6 text-app-ink-soft">
                Thông tin đăng nhập hiện tại của không gian làm việc này.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[auto_1fr] md:items-start">
            <div className="flex items-center gap-3 md:block">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-app-line bg-app-bg font-serif text-2xl font-semibold text-app-accent">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Ảnh đại diện" className="h-full w-full object-cover" />
                ) : (
                  accountInitial
                )}
              </div>
              <div className="md:mt-3">
                <p className="text-xs font-medium text-app-ink-muted">Ảnh đại diện</p>
                <p className="mt-1 text-xs leading-5 text-app-ink-muted">Đồng bộ từ tài khoản đăng nhập nếu có.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="settings-display-name" className="mb-2 block text-sm font-medium text-app-ink">
                  Tên hiển thị
                </label>
                <input id="settings-display-name" readOnly value={accountLabel} className={`${inputClass} bg-app-bg`} />
              </div>
              <div>
                <label htmlFor="settings-email" className="mb-2 block text-sm font-medium text-app-ink">
                  Email
                </label>
                <input id="settings-email" readOnly value={accountEmail} className={`${inputClass} bg-app-bg`} />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-app-line bg-app-bg p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-app-ink">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${isConfigured && user ? "bg-app-accent" : "bg-app-ink-muted"}`}
                  />
                  {accountStatus}
                </p>
                <p className="mt-1 text-xs leading-5 text-app-ink-muted">
                  Gói hiện tại: {userData.subscription?.planCode ?? "FREE"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAccountExport}
                disabled={!isConfigured || !user || isExportingAccount}
              >
                {isExportingAccount ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudDownload className="h-4 w-4" />
                )}
                Xuất dữ liệu tài khoản
              </Button>
            </div>
          </div>
        </section>

        <section
          className="rounded-card border border-app-line bg-app-surface p-6 md:p-8"
          aria-label="Tuỳ chọn trải nghiệm"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-medium text-app-ink">Tuỳ chọn trải nghiệm</h2>
              <p className="mt-1 text-sm leading-6 text-app-ink-soft">
                Giao diện, ngôn ngữ và nhắc việc nhẹ trong hệ 12 tuần.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-app-line bg-app-surface p-3">
              <div className="flex items-start gap-3">
                <Palette className="mt-0.5 h-4 w-4 text-app-ink-muted" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-app-ink">Giao diện</p>
                  <p className="mt-1 text-xs text-app-ink-muted">
                    Đang dùng: {resolvedTheme === "dark" ? "Tối" : "Sáng"}
                  </p>
                  <fieldset className="mt-3 grid gap-2 sm:grid-cols-3">
                    <legend className="sr-only">Chọn giao diện</legend>
                    {themeOptions.map((option) => {
                      const selected = theme === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`cursor-pointer rounded-lg border p-3 text-left transition-colors duration-150 focus-within:ring-2 focus-within:ring-app-accent/30 ${
                            selected
                              ? "border-app-accent bg-app-accent-soft text-app-accent"
                              : "border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
                          }`}
                        >
                          <input
                            type="radio"
                            name="settings-theme"
                            value={option.value}
                            checked={selected}
                            onChange={() => setTheme(option.value)}
                            className="sr-only"
                          />
                          <span className="block text-sm font-medium">{option.label}</span>
                          <span className="mt-1 block text-xs leading-5 text-app-ink-muted">
                            {option.description}
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-app-line bg-app-surface p-3">
              <div className="flex items-start gap-3">
                <Languages className="mt-0.5 h-4 w-4 text-app-ink-muted" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-app-ink">Ngôn ngữ</p>
                  <fieldset className="mt-3">
                    <legend className="sr-only">Ngôn ngữ</legend>
                    <label className="block rounded-lg border border-app-accent bg-app-accent-soft p-3 text-app-accent">
                      <input type="radio" name="settings-language" checked readOnly className="sr-only" />
                      <span className="block text-sm font-medium">{localeLabel}</span>
                      <span className="mt-1 block text-xs leading-5 text-app-ink-muted">
                        Tiếng Việt tự nhiên cho toàn bộ flow hiện tại.
                      </span>
                    </label>
                  </fieldset>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-app-line bg-app-surface p-3">
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 h-4 w-4 text-app-ink-muted" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-app-ink">Nhắc việc trong app</p>
                      <p className="mt-1 text-xs leading-5 text-app-ink-muted">
                        Hiện gợi ý nhẹ khi có việc hoặc review cần quay lại.
                      </p>
                    </div>
                    <Switch
                      checked={appPreferences.enableInAppReminders}
                      onCheckedChange={handleInAppRemindersChange}
                      aria-label="Nhắc việc trong app"
                      className="border border-app-line data-[state=checked]:bg-app-accent data-[state=unchecked]:bg-app-bg"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-app-line pt-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-app-ink">
                        <Volume2 className="h-4 w-4 text-app-ink-muted" />
                        Âm thanh khi xong việc
                      </p>
                      <p className="mt-1 text-xs leading-5 text-app-ink-muted">
                        Phát một tiếng rất nhẹ khi bạn chốt xong việc hôm nay.
                      </p>
                    </div>
                    <Switch
                      id="task-complete-sound"
                      checked={taskSoundEnabled}
                      onCheckedChange={handleTaskSoundEnabledChange}
                      aria-label="Âm thanh khi xong việc"
                      className="border border-app-line data-[state=checked]:bg-app-accent data-[state=unchecked]:bg-app-bg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-card border border-app-line bg-app-surface p-6 md:p-8" aria-label="Dữ liệu">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
              <CloudDownload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-medium text-app-ink">Dữ liệu</h2>
              <p className="mt-1 text-sm leading-6 text-app-ink-soft">
                Local-first: dữ liệu lưu trên thiết bị trước, rồi sao lưu vào tài khoản khi đủ điều kiện.
              </p>
            </div>
          </div>

          <div id="account-sync" className="mt-5 scroll-mt-24 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-app-line bg-app-bg p-3">
                <p className="text-sm font-semibold text-app-ink">Thiết bị</p>
                <p className="mt-1 text-xs leading-5 text-app-ink-muted">
                  Thay đổi được giữ ngay trên thiết bị này.
                </p>
              </div>
              <div className="rounded-lg border border-app-line bg-app-bg p-3">
                <p className="text-sm font-semibold text-app-ink">Tài khoản</p>
                <p className="mt-1 text-xs leading-5 text-app-ink-muted">
                  {formatSyncTime(autoSyncState.lastSyncedAt)}
                </p>
              </div>
              <div className="rounded-lg border border-app-line bg-app-bg p-3">
                <p className="text-sm font-semibold text-app-ink">Đang chờ đồng bộ</p>
                <p className="mt-1 text-xs leading-5 text-app-ink-muted">
                  {autoSyncState.pendingCount > 0
                    ? `${autoSyncState.pendingCount} thay đổi chờ đồng bộ`
                    : "Không có thay đổi chờ đồng bộ"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-app-line bg-app-bg p-3 text-sm leading-6 text-app-ink-soft">
              <div className="flex gap-2">
                <SyncIcon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${autoSyncState.syncing ? "animate-spin text-app-accent" : "text-app-ink-muted"}`}
                />
                <p>
                  {autoSyncState.conflictPending
                    ? "Dữ liệu trên thiết bị và tài khoản đang khác nhau. Ứng dụng sẽ hỏi bạn trước khi ghi đè."
                    : !autoSyncState.online
                      ? "Bạn đang mất kết nối. Dữ liệu vẫn được lưu trên thiết bị và sẽ gửi lên tài khoản khi có mạng."
                      : autoSyncState.syncing
                        ? "Đang sao lưu lên tài khoản. Bạn có thể tiếp tục dùng app."
                        : "Sao lưu sẵn sàng. Nếu có lỗi, dữ liệu vẫn được giữ trên thiết bị này để thử lại."}
                </p>
              </div>
            </div>

            {autoSyncState.lastResult?.message ? (
              <div className="rounded-lg border border-app-line bg-app-surface p-3 text-sm leading-6 text-app-ink-soft">
                <p className="font-semibold text-app-ink">Kết quả gần nhất</p>
                <p className="mt-1">{autoSyncState.lastResult.message}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Xuất dữ liệu thiết bị
              </Button>
              <Button type="button" variant="outline" onClick={() => importFileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Nhập dữ liệu
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRetrySync}
                disabled={autoSyncState.syncing || !user}
              >
                {autoSyncState.syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Kiểm tra sao lưu
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/12-week-system?tab=settings")}>
                <CalendarDays className="h-4 w-4" />
                Cài đặt chu kỳ
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/billing/plan")}>
                <CreditCard className="h-4 w-4" />
                Gói & thanh toán
              </Button>
              <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>

            <div className="rounded-card border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-danger-fg)]" />
                  <div>
                    <p className="text-base font-semibold text-[color:var(--color-danger-fg)]">Vùng nguy hiểm</p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--color-danger-fg)]">
                      Xóa dữ liệu trên thiết bị này chỉ nên làm sau khi bạn đã tải bản dự phòng.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="bg-[color:var(--color-danger-fg)] text-white hover:bg-[color:var(--color-danger-fg)]/90 focus-visible:ring-[color:var(--color-danger-border)]"
                  onClick={() => setIsClearDataDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa tất cả dữ liệu
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section
          className="rounded-card border border-app-line bg-app-surface p-6 md:p-8"
          aria-label="Thông tin ứng dụng"
        >
          <h2 className="font-serif text-xl font-medium text-app-ink">Thông tin</h2>
          <p className="mt-2 text-xs leading-5 text-app-ink-muted">
            Phiên bản v0.4 · Vision Board Web Platform · local-first 12-Week Year.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-app-ink-soft">
            <Link
              to="/privacy"
              className="rounded-full border border-app-line bg-app-bg px-3 py-1.5 hover:text-app-accent"
            >
              Bảo mật
            </Link>
            <Link
              to="/terms"
              className="rounded-full border border-app-line bg-app-bg px-3 py-1.5 hover:text-app-accent"
            >
              Điều khoản
            </Link>
            <Link
              to="/billing/faq"
              className="rounded-full border border-app-line bg-app-bg px-3 py-1.5 hover:text-app-accent"
            >
              Hỏi đáp thanh toán
            </Link>
          </div>
        </section>
      </div>

      <AlertDialog open={Boolean(recoverySnapshotKey)} onOpenChange={(open) => !open && setRecoverySnapshotKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục dữ liệu cũ?</AlertDialogTitle>
            <AlertDialogDescription>
              Dữ liệu hiện tại trên thiết bị này sẽ được thay bằng bản sao dữ liệu cũ. Hãy tải backup thiết bị trước nếu
              bạn muốn giữ cả hai phiên bản.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreMigrationBackup}>Khôi phục dữ liệu cũ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearDataDialogOpen} onOpenChange={handleClearDataDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {clearDataConfirmStep === "review" ? "Xóa tất cả dữ liệu trên thiết bị?" : "Xác nhận lần cuối"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {clearDataConfirmStep === "review"
                ? "Hành động này xóa dữ liệu local: mục tiêu, kế hoạch, nhật ký, vision board và các bản nháp trên thiết bị này. Hãy tải bản dự phòng trước nếu cần."
                : "Sau bước này, dữ liệu local trên thiết bị sẽ bị xóa và app quay về trạng thái mới. Hành động này không thể hoàn tác từ trong app."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại</AlertDialogCancel>
            {clearDataConfirmStep === "review" ? (
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  setClearDataConfirmStep("final");
                }}
              >
                Tôi hiểu, tiếp tục
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={handleClearAllData}
                className="bg-[color:var(--color-danger-fg)] text-white hover:bg-[color:var(--color-danger-fg)] hover:opacity-90"
              >
                Xóa tất cả dữ liệu
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

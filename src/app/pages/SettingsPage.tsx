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
  type LucideIcon,
} from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { DeleteCloudWorkspaceDialog } from "@/app/components/twelve-week/DeleteCloudWorkspaceDialog";
import { clearMemory } from "@/app/features/assistant/assistantMemory";
import { usePetPreferences } from "@/app/features/pet/usePetPreferences";
import { useAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { deleteAccount, deleteCloudWorkspace, exportAccountData } from "@/services/syncService";
import { ScreenGuide } from "../components/ScreenGuide";
import { SCREEN_GUIDES } from "../components/screen-guides";
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
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { useTheme } from "../hooks/useTheme";
import { formatBillingExpiryDate, getBillingExpiryInfo } from "../utils/billing-expiry";
import { downloadLocalUserDataBackup } from "../utils/local-data-backup";
import {
  getBrowserNotificationStatus,
  getLastOutboxSyncSnapshot,
  requestBrowserNotificationPermission,
  sendTestBrowserNotification,
  type BrowserNotificationStatus,
  type OutboxSyncSnapshot,
} from "../utils/production";
import {
  getMigrationBackupSnapshots,
  type MigrationBackupSnapshot,
  restoreMigrationBackupSnapshot,
} from "../utils/local-data-migration";
import { isSoundEnabled, setSoundEnabled } from "../utils/sound";
import {
  clearLocalDeviceSignals,
  deleteAllUserData,
  getUserData,
  parseStoredUserData,
  saveUserData,
  updateAppPreferences,
} from "../utils/storage";
import { getBrowserNotificationStatusLabel } from "../utils/twelve-week-system-ui";
import { inputClass } from "./SMARTGoalSetup/components/formStyles";

const themeOptions = [
  {
    value: "system",
    label: "Theo thiết bị",
    description: "Dùng cài đặt hệ thống.",
  },
  { value: "light", label: "Sáng", description: "Nền sáng, dễ đọc ban ngày." },
  { value: "dark", label: "Tối", description: "Giảm sáng khi dùng buổi tối." },
] as const;

type ClearDataConfirmStep = "review" | "final";
type DeleteAccountConfirmStep = "review" | "final";

function downloadJsonFile(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
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
  return `Lần cuối: ${new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date)}`;
}

function getAccountInitial(label: string): string {
  return label.trim().charAt(0).toUpperCase() || "K";
}

function SettingsNavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-9 items-center rounded-full px-2 text-sm font-medium text-app-ink-soft transition-colors duration-150 hover:text-app-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-app-accent/25"
    >
      {label}
    </a>
  );
}

function SettingsStudioHero({
  accountValue,
  syncValue,
  planValue,
}: {
  accountValue: string;
  syncValue: string;
  planValue: string;
}) {
  return (
    <section className="rounded-[20px] border border-app-line bg-app-surface px-5 py-6 sm:px-7 sm:py-7">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] md:items-end">
        <div>
          <p className="text-xs font-semibold text-app-accent">Cài đặt</p>
          <h1 className="mt-3 text-balance font-serif text-3xl font-semibold leading-tight text-app-ink sm:text-4xl">
            Quản lý tài khoản, trải nghiệm và dữ liệu.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-app-ink-soft">
            Những tuỳ chọn chung của website được gom ở đây; cài đặt riêng cho chu kỳ 12 tuần nằm ở tab chu kỳ.
          </p>
        </div>

        <dl className="grid gap-3 rounded-[16px] border border-app-line bg-app-bg-subtle p-4 sm:grid-cols-3 md:grid-cols-1">
          <div>
            <dt className="text-xs font-medium text-app-ink-muted">Tài khoản</dt>
            <dd className="mt-1 truncate text-sm font-semibold text-app-ink">{accountValue}</dd>
          </div>
          <div className="border-t border-app-line pt-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 md:border-l-0 md:border-t md:pl-0 md:pt-3">
            <dt className="text-xs font-medium text-app-ink-muted">Sao lưu</dt>
            <dd className="mt-1 truncate text-sm font-semibold text-app-ink">{syncValue}</dd>
          </div>
          <div className="border-t border-app-line pt-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 md:border-l-0 md:border-t md:pl-0 md:pt-3">
            <dt className="text-xs font-medium text-app-ink-muted">Gói</dt>
            <dd className="mt-1 truncate text-sm font-semibold text-app-ink">{planValue}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function SettingsSection({
  id,
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
  className = "",
  bodyClassName = "p-5 sm:p-6",
  testId,
}: {
  id?: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  testId?: string;
}) {
  return (
    <section
      id={id}
      data-testid={testId}
      className={`scroll-mt-24 overflow-hidden rounded-[18px] border border-app-line bg-app-surface ${className}`}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <div className="border-b border-app-line px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-app-line bg-app-bg-subtle text-app-ink-soft"
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold leading-5 text-app-ink-muted">{eyebrow}</p>
            <h2 id={id ? `${id}-title` : undefined} className="mt-0.5 text-xl font-semibold text-app-ink">
              {title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-app-ink-soft">{description}</p>
          </div>
        </div>
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function SettingsControlRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 border-b border-app-line px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div className="flex min-w-0 gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-app-line bg-app-surface text-app-ink-muted"
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-app-ink">{title}</p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-app-ink-muted">{description}</p>
        </div>
      </div>
      <div className="sm:min-w-[220px]">{children}</div>
    </div>
  );
}

const settingsNavItems = [
  {
    href: "#settings-account",
    label: "Tài khoản",
  },
  {
    href: "#settings-experience",
    label: "Trải nghiệm",
  },
  {
    href: "#account-sync",
    label: "Dữ liệu",
  },
  {
    href: "#settings-safety",
    label: "An toàn",
  },
] satisfies Array<{
  href: string;
  label: string;
}>;

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
  const [isClearLocalSignalsDialogOpen, setIsClearLocalSignalsDialogOpen] = useState(false);
  const [isDeleteCloudDialogOpen, setIsDeleteCloudDialogOpen] = useState(false);
  const [isDeletingCloudWorkspace, setIsDeletingCloudWorkspace] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [deleteAccountConfirmStep, setDeleteAccountConfirmStep] = useState<DeleteAccountConfirmStep>("review");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { preferences: petPreferences, updatePreferences } = usePetPreferences();
  const { isConfigured, user, userProfile, logout } = useAuthContext();
  const autoSyncState = useAutoCloudSyncContext();
  const [browserNotificationStatus, setBrowserNotificationStatus] = useState<BrowserNotificationStatus>(() =>
    getBrowserNotificationStatus(),
  );
  const [lastOutboxSyncSnapshot, setLastOutboxSyncSnapshot] = useState<OutboxSyncSnapshot | null>(() =>
    getLastOutboxSyncSnapshot(),
  );
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshOutboxSyncSnapshot = () => {
      setLastOutboxSyncSnapshot(getLastOutboxSyncSnapshot());
    };

    window.addEventListener("email-verification:required", refreshOutboxSyncSnapshot);
    window.addEventListener("storage", refreshOutboxSyncSnapshot);
    return () => {
      window.removeEventListener("email-verification:required", refreshOutboxSyncSnapshot);
      window.removeEventListener("storage", refreshOutboxSyncSnapshot);
    };
  }, []);

  const handleExport = () => {
    downloadLocalUserDataBackup({
      data: userData,
      filenamePrefix: "dear-our-future-backup",
    });
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

  const handlePetAnimationChange = (enabled: boolean) => {
    updatePreferences({ ...petPreferences, animationEnabled: enabled });
    toast.success(enabled ? "Đã bật chuyển động của Mầm." : "Mầm sẽ đứng yên để giảm chuyển động.");
  };

  const handleInAppRemindersChange = (enabled: boolean) => {
    updateAppPreferences({ enableInAppReminders: enabled });
    reloadUserData();
    toast.success(enabled ? "Đã bật nhắc việc trong app." : "Đã tắt nhắc việc trong app.");
  };

  const handleBrowserNotificationsChange = async (enabled: boolean) => {
    updateAppPreferences({ enableBrowserNotifications: enabled });
    reloadUserData();

    if (!enabled) {
      setBrowserNotificationStatus(getBrowserNotificationStatus());
      toast.success("Đã tắt thông báo trình duyệt.");
      return;
    }

    const permission = await requestBrowserNotificationPermission();
    setBrowserNotificationStatus(permission);

    if (permission === "granted") {
      sendTestBrowserNotification();
      toast.success("Đã bật thông báo trình duyệt.");
      return;
    }

    if (permission === "denied") {
      toast.error("Trình duyệt đang chặn thông báo.");
      return;
    }

    toast.info("Thiết bị hiện tại không hỗ trợ thông báo trình duyệt.");
  };

  const handleLocalAnalyticsChange = (enabled: boolean) => {
    updateAppPreferences({ allowLocalAnalytics: enabled });
    reloadUserData();
    toast.success(enabled ? "Đã bật phân tích trên thiết bị." : "Đã tắt phân tích trên thiết bị.");
  };

  const handleKeepLocalOutboxChange = (enabled: boolean) => {
    updateAppPreferences({ keepLocalOutbox: enabled });
    reloadUserData();
    toast.success(enabled ? "Đã giữ hàng chờ đồng bộ trên thiết bị." : "Đã tắt lưu hàng chờ đồng bộ trên thiết bị.");
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

  const handleClearLocalSignals = () => {
    clearLocalDeviceSignals();
    reloadUserData();
    setLastOutboxSyncSnapshot(getLastOutboxSyncSnapshot());
    setIsClearLocalSignalsDialogOpen(false);
    toast.success("Đã xóa nhật ký, hàng chờ đồng bộ và trạng thái nhắc việc trên thiết bị này.");
  };

  const handleDeleteCloudWorkspaceOnly = async () => {
    setIsDeletingCloudWorkspace(true);
    try {
      await deleteCloudWorkspace();
      setIsDeleteCloudDialogOpen(false);
      toast.success("Đã xóa dữ liệu 12 tuần đã sao lưu.", {
        description: "Dữ liệu trên thiết bị, quyền Plus và tài khoản không bị ảnh hưởng.",
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa dữ liệu đã đồng bộ. Kiểm tra kết nối và thử lại."));
    } finally {
      setIsDeletingCloudWorkspace(false);
    }
  };

  const handleDeleteAccountDialogChange = (open: boolean) => {
    if (isDeletingAccount) return;
    setIsDeleteAccountDialogOpen(open);
    if (!open) setDeleteAccountConfirmStep("review");
  };

  const handleDeleteAccount = async () => {
    if (!isConfigured || !user) {
      toast.error("Bạn cần đăng nhập để xóa tài khoản.");
      return;
    }

    setIsDeletingAccount(true);
    const toastId = toast.loading("Đang xóa tài khoản...");
    try {
      await deleteAccount();
      try {
        await logout();
      } catch (logoutError) {
        console.error("Không thể đăng xuất sau khi xóa tài khoản:", logoutError);
      }
      deleteAllUserData();
      reloadUserData();
      setIsDeleteAccountDialogOpen(false);
      setDeleteAccountConfirmStep("review");
      toast.success("Đã gửi yêu cầu xóa tài khoản và xóa dữ liệu local trên thiết bị này.", { id: toastId });
      navigate("/");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể xóa tài khoản lúc này."), {
        id: toastId,
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleClearAllData = async () => {
    setIsClearDataDialogOpen(false);
    setClearDataConfirmStep("review");

    if (isConfigured && user) {
      const toastId = toast.loading("Đang xóa dữ liệu trên đám mây...");
      try {
        await deleteCloudWorkspace();
        toast.success("Đã xóa dữ liệu trên tài khoản đám mây.", {
          id: toastId,
        });
      } catch (error) {
        console.error("Lỗi khi xóa dữ liệu cloud:", error);
        toast.error("Không thể xóa dữ liệu trên tài khoản đám mây. Vui lòng kiểm tra kết nối mạng và thử lại.", {
          id: toastId,
        });
        return;
      }
    }

    deleteAllUserData();
    reloadUserData();
    toast.success("Đã xóa toàn bộ dữ liệu.");
    navigate("/");
  };

  const syncBlockedByEmailVerification = lastOutboxSyncSnapshot?.status === "email_unverified";
  const syncIcon = syncBlockedByEmailVerification
    ? ShieldAlert
    : autoSyncState.syncing
      ? Loader2
      : !autoSyncState.online
        ? WifiOff
        : autoSyncState.pendingCount > 0
          ? Upload
          : CheckCircle2;
  const SyncIcon = syncIcon;
  const syncStatusMessage = syncBlockedByEmailVerification
    ? "Dữ liệu vẫn được lưu trên thiết bị này, nhưng chưa thể sao lưu lên tài khoản cho tới khi email được xác thực."
    : !autoSyncState.online
      ? "Bạn đang mất kết nối. Dữ liệu vẫn được lưu trên thiết bị và sẽ gửi lên tài khoản khi có mạng."
      : autoSyncState.syncing
        ? "Đang sao lưu lên tài khoản. Bạn có thể tiếp tục dùng app."
        : "Sao lưu sẵn sàng. Hệ thống tự đồng bộ và xử lý chênh lệch; nếu có lỗi, dữ liệu vẫn được giữ trên thiết bị này để thử lại.";
  const syncSignalValue = syncBlockedByEmailVerification
    ? "Tạm dừng"
    : !autoSyncState.online
      ? "Offline"
      : autoSyncState.syncing
        ? "Đang sao lưu"
        : autoSyncState.pendingCount > 0
          ? `${autoSyncState.pendingCount} mục chờ`
          : "Sẵn sàng";
  const accountSignalValue = isConfigured && user ? "Đã kết nối" : "Local-only";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-14 pt-6 sm:px-6 lg:px-8">
      <ScreenGuide {...SCREEN_GUIDES.settings} autoOpen />
      <SettingsStudioHero
        accountValue={accountSignalValue}
        syncValue={syncSignalValue}
        planValue={userData.subscription?.planCode ?? "FREE"}
      />

      <nav
        className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-b border-app-line pb-3"
        aria-label="Đi tới nhóm cài đặt"
      >
        {settingsNavItems.map((item) => (
          <SettingsNavLink key={item.href} {...item} />
        ))}
      </nav>

      <div className="mt-6 space-y-6">
        {firstRecoverySnapshot ? (
          <section
            className="rounded-[16px] border border-app-line bg-app-surface p-4 sm:p-5"
            aria-label="Khôi phục dữ liệu cũ"
          >
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
          <section
            className="rounded-[16px] border border-app-line bg-app-surface p-4 sm:p-5"
            aria-label="Trạng thái gói Plus"
          >
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

        <div className="grid gap-6">
          <SettingsSection
            id="settings-account"
            icon={User2}
            eyebrow="Hồ sơ"
            title="Tài khoản"
            description="Thông tin đăng nhập hiện tại của không gian làm việc này."
            bodyClassName="p-0"
          >
            <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] md:items-start">
              <div className="flex min-w-0 gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-app-line bg-app-bg-subtle font-serif text-2xl font-semibold text-app-accent">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Ảnh đại diện" className="h-full w-full object-cover" />
                  ) : (
                    accountInitial
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-app-ink">{accountLabel}</p>
                  <p className="mt-1 break-all text-sm leading-5 text-app-ink-muted">{accountEmail}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                    <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-app-line bg-app-bg-subtle px-3 text-app-ink-soft">
                      <span
                        className={`h-2 w-2 rounded-full ${isConfigured && user ? "bg-app-accent" : "bg-app-ink-muted"}`}
                        aria-hidden="true"
                      />
                      {accountStatus}
                    </span>
                    <span className="inline-flex min-h-8 items-center rounded-full border border-app-line bg-app-bg-subtle px-3 text-app-ink-soft">
                      Gói {userData.subscription?.planCode ?? "FREE"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="settings-display-name"
                    className="mb-1.5 block text-sm font-medium leading-5 text-app-ink"
                  >
                    Tên hiển thị
                  </label>
                  <input
                    id="settings-display-name"
                    readOnly
                    aria-readonly="true"
                    value={accountLabel}
                    className={`${inputClass} bg-app-bg`}
                  />
                </div>
                <div>
                  <label htmlFor="settings-email" className="mb-1.5 block text-sm font-medium leading-5 text-app-ink">
                    Email
                  </label>
                  <input
                    id="settings-email"
                    type="email"
                    readOnly
                    aria-readonly="true"
                    value={accountEmail}
                    className={`${inputClass} bg-app-bg`}
                  />
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="settings-experience"
            icon={Palette}
            eyebrow="Cảm giác dùng app"
            title="Tuỳ chọn trải nghiệm"
            description="Giao diện, ngôn ngữ và nhắc việc nhẹ trong hệ 12 tuần."
            bodyClassName="p-0"
          >
            <SettingsControlRow
              icon={Palette}
              title="Giao diện"
              description={`Đang dùng: ${resolvedTheme === "dark" ? "Tối" : "Sáng"}`}
            >
              <fieldset className="grid gap-2 sm:grid-cols-3">
                <legend className="sr-only">Chọn giao diện</legend>
                {themeOptions.map((option) => {
                  const selected = theme === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-[12px] border px-3 py-2.5 text-left transition-colors duration-150 focus-within:ring-2 focus-within:ring-app-accent/30 ${
                        selected
                          ? "border-app-accent bg-app-accent-soft text-app-accent shadow-app-sm"
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
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-app-ink-muted">{option.description}</span>
                    </label>
                  );
                })}
              </fieldset>
            </SettingsControlRow>

            <SettingsControlRow
              icon={Languages}
              title="Ngôn ngữ"
              description="Giữ tiếng Việt tự nhiên cho flow hiện tại."
            >
              <fieldset>
                <legend className="sr-only">Ngôn ngữ</legend>
                <label className="block rounded-[14px] border border-app-accent bg-app-accent-soft px-3 py-3 text-app-accent shadow-3xs">
                  <input type="radio" name="settings-language" checked readOnly className="sr-only" />
                  <span className="block text-sm font-semibold">{localeLabel}</span>
                  <span className="mt-1 block text-xs leading-5 text-app-ink-muted">
                    Toàn bộ sản phẩm đang ưu tiên tiếng Việt.
                  </span>
                </label>
              </fieldset>
            </SettingsControlRow>

            <SettingsControlRow
              icon={Bell}
              title="Nhắc việc trong app"
              description="Hiện gợi ý nhẹ khi có việc hoặc review cần quay lại."
            >
              <div className="flex justify-start sm:justify-end">
                <Switch
                  checked={appPreferences.enableInAppReminders}
                  onCheckedChange={handleInAppRemindersChange}
                  aria-label="Nhắc việc trong app"
                  className="border border-app-line data-[state=checked]:bg-app-accent data-[state=unchecked]:bg-app-bg"
                />
              </div>
            </SettingsControlRow>

            <SettingsControlRow
              icon={Bell}
              title="Thông báo trình duyệt"
              description={`${getBrowserNotificationStatusLabel(browserNotificationStatus)}.`}
            >
              <div className="flex justify-start sm:justify-end">
                <Switch
                  checked={appPreferences.enableBrowserNotifications}
                  onCheckedChange={(enabled) => void handleBrowserNotificationsChange(enabled)}
                  aria-label="Thông báo trình duyệt"
                  className="border border-app-line data-[state=checked]:bg-app-accent data-[state=unchecked]:bg-app-bg"
                />
              </div>
            </SettingsControlRow>

            <SettingsControlRow
              icon={Volume2}
              title="Âm thanh khi xong việc"
              description="Phát một tiếng rất nhẹ khi bạn chốt xong việc hôm nay."
            >
              <div className="flex justify-start sm:justify-end">
                <Switch
                  id="task-complete-sound"
                  checked={taskSoundEnabled}
                  onCheckedChange={handleTaskSoundEnabledChange}
                  aria-label="Âm thanh khi xong việc"
                  className="border border-app-line data-[state=checked]:bg-app-accent data-[state=unchecked]:bg-app-bg"
                />
              </div>
            </SettingsControlRow>

            <SettingsControlRow
              icon={Palette}
              title="Animation của Mầm"
              description="Giữ Mầm chuyển động nhẹ trên Dashboard, hoặc đứng yên khi bạn muốn yên tĩnh hơn."
            >
              <div className="flex justify-start sm:justify-end">
                <Switch
                  checked={petPreferences.animationEnabled}
                  onCheckedChange={handlePetAnimationChange}
                  aria-label="Animation của Mầm"
                  className="border border-app-line data-[state=checked]:bg-app-accent data-[state=unchecked]:bg-app-bg"
                />
              </div>
            </SettingsControlRow>
          </SettingsSection>
        </div>

        <SettingsSection
          id="account-sync"
          testId="settings-sync-section"
          icon={CloudDownload}
          eyebrow="Dữ liệu local-first"
          title="Dữ liệu"
          description="Dữ liệu lưu trên thiết bị trước, rồi sao lưu vào tài khoản khi đủ điều kiện."
          bodyClassName="p-0"
        >
          <div className="p-5 sm:p-6">
            <div
              data-testid="settings-sync-status-copy"
              className="rounded-[16px] border border-app-line bg-app-bg-subtle p-4 text-sm leading-6 text-app-ink-soft"
            >
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-app-line bg-app-surface text-app-accent">
                  <SyncIcon className={`h-4 w-4 ${autoSyncState.syncing ? "animate-spin" : ""}`} />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-app-ink">Sao lưu: {syncSignalValue}</p>
                  {syncBlockedByEmailVerification ? (
                    <p className="mt-1">{syncStatusMessage}</p>
                  ) : (
                    <p className="mt-1">
                      {!autoSyncState.online
                        ? "Bạn đang mất kết nối. Dữ liệu vẫn được lưu trên thiết bị và sẽ gửi lên tài khoản khi có mạng."
                        : autoSyncState.syncing
                          ? "Đang sao lưu lên tài khoản. Bạn có thể tiếp tục dùng app."
                          : "Sao lưu sẵn sàng. Hệ thống tự đồng bộ và xử lý chênh lệch; nếu có lỗi, dữ liệu vẫn được giữ trên thiết bị này để thử lại."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <dl className="mt-5 grid gap-4 border-y border-app-line py-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-app-ink">Tài khoản</dt>
                <dd data-testid="settings-sync-last-synced" className="mt-1 text-xs leading-5 text-app-ink-muted">
                  {formatSyncTime(autoSyncState.lastSyncedAt)}
                </dd>
              </div>
              <div className="border-t border-app-line pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <dt className="text-xs font-semibold text-app-ink">Đang chờ đồng bộ</dt>
                <dd data-testid="settings-sync-pending-count" className="mt-1 text-xs leading-5 text-app-ink-muted">
                  {autoSyncState.pendingCount > 0
                    ? `${autoSyncState.pendingCount} thay đổi chờ đồng bộ`
                    : "Không có thay đổi chờ đồng bộ"}
                </dd>
              </div>
            </dl>

            {syncBlockedByEmailVerification ? (
              <div
                data-testid="settings-sync-email-unverified"
                className="mt-4 rounded-[16px] border border-app-warm-border bg-app-warm-soft p-4 text-sm leading-6 text-app-warm-strong"
              >
                <p className="font-semibold">Email chưa xác thực, cloud sync đang tạm dừng</p>
                <p className="mt-1">{lastOutboxSyncSnapshot.message}</p>
              </div>
            ) : null}

            {autoSyncState.lastResult?.message ? (
              <div
                data-testid="settings-sync-last-result"
                className="mt-4 rounded-[16px] border border-app-line bg-app-surface p-4 text-sm leading-6 text-app-ink-soft"
              >
                <p className="font-semibold text-app-ink">Kết quả gần nhất</p>
                <p className="mt-1">{autoSyncState.lastResult.message}</p>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,1fr)] md:items-start">
              <div>
                <p className="text-sm font-semibold text-app-ink">Sao lưu và di chuyển dữ liệu</p>
                <p className="mt-2 text-xs leading-5 text-app-ink-muted">
                  Tải bản dự phòng trước khi đổi thiết bị, nhập dữ liệu cũ hoặc kiểm tra trạng thái cloud.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                  Xuất dữ liệu thiết bị
                </Button>
                {isConfigured && user ? (
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="settings-account-export"
                    onClick={() => void handleAccountExport()}
                    disabled={isExportingAccount}
                  >
                    {isExportingAccount ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CloudDownload className="h-4 w-4" />
                    )}
                    Xuất dữ liệu tài khoản
                  </Button>
                ) : null}
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
            </div>
          </div>

          <div className="border-t border-app-line">
            <SettingsControlRow
              icon={Download}
              title="Phân tích trên thiết bị"
              description="Lưu lịch sử thao tác để xem hành trình thực hiện mà không phụ thuộc máy chủ."
            >
              <div className="flex justify-start sm:justify-end">
                <Switch
                  checked={appPreferences.allowLocalAnalytics}
                  onCheckedChange={handleLocalAnalyticsChange}
                  aria-label="Phân tích trên thiết bị"
                  className="border border-app-line data-[state=checked]:bg-app-accent data-[state=unchecked]:bg-app-bg"
                />
              </div>
            </SettingsControlRow>
            <SettingsControlRow
              icon={Upload}
              title="Hàng chờ đồng bộ trên thiết bị"
              description="Giữ thay đổi đang chờ gửi để app vẫn dùng được khi mạng hoặc tài khoản chưa sẵn sàng."
            >
              <div className="flex justify-start sm:justify-end">
                <Switch
                  checked={appPreferences.keepLocalOutbox}
                  onCheckedChange={handleKeepLocalOutboxChange}
                  aria-label="Hàng chờ đồng bộ trên thiết bị"
                  className="border border-app-line data-[state=checked]:bg-app-accent data-[state=unchecked]:bg-app-bg"
                />
              </div>
            </SettingsControlRow>
          </div>
        </SettingsSection>

        <SettingsSection
          id="settings-safety"
          icon={ShieldAlert}
          eyebrow="Xác nhận trước khi xoá"
          title="An toàn & dọn dẹp"
          description="Những thao tác có thể xoá trạng thái cục bộ hoặc dữ liệu đã đồng bộ được tách riêng và luôn đi qua dialog."
          bodyClassName="p-0"
        >
          <SettingsControlRow
            icon={Trash2}
            title="Bộ nhớ Trợ lý AI"
            description="Xóa sạch các thông tin trợ lý tự động ghi nhớ về bạn như sở thích học tập và thói quen làm việc."
          >
            <div className="flex justify-start sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="border-[color:var(--color-warning-border)] text-[color:var(--color-warning-fg)] hover:bg-[color:var(--color-warning-bg)] hover:text-[color:var(--color-warning-fg)]"
                onClick={() => {
                  clearMemory(user?.uid ?? null);
                  toast.success("Đã xóa sạch bộ nhớ của Trợ lý AI.");
                }}
              >
                <Trash2 className="h-4 w-4" />
                Xóa bộ nhớ Trợ lý
              </Button>
            </div>
          </SettingsControlRow>

          <div className="p-5 sm:p-6">
            <div className="rounded-[16px] border border-[color:var(--color-danger-border)] bg-app-surface">
              <div className="border-b border-[color:var(--color-danger-border)] px-4 py-4">
                <p className="text-sm font-semibold text-[color:var(--color-danger-fg)]">Thao tác xoá dữ liệu</p>
                <p className="mt-1 text-xs leading-5 text-app-ink-muted">
                  Nên xuất dữ liệu trước. Các nút bên dưới vẫn dùng dialog xác nhận riêng.
                </p>
              </div>
              <div className="divide-y divide-app-line">
                <div className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-app-ink">Dọn dữ liệu tạm trên thiết bị</p>
                    <p className="mt-1 text-xs leading-5 text-app-ink-muted">
                      Xóa nhật ký thao tác, hàng chờ đồng bộ và trạng thái nhắc việc cục bộ.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[color:var(--color-warning-border)] text-[color:var(--color-warning-fg)] hover:bg-[color:var(--color-warning-bg)] hover:text-[color:var(--color-warning-fg)]"
                    onClick={() => setIsClearLocalSignalsDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa dữ liệu tạm
                  </Button>
                </div>

                {isConfigured && user ? (
                  <div className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-app-ink">Xóa dữ liệu đã sao lưu</p>
                      <p className="mt-1 text-xs leading-5 text-app-ink-muted">
                        Xóa dữ liệu 12 tuần trên tài khoản; dữ liệu local, quyền Plus và tài khoản không bị ảnh hưởng.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[color:var(--color-danger-border)] text-[color:var(--color-danger-fg)] hover:bg-[color:var(--color-danger-bg)] hover:text-[color:var(--color-danger-fg)]"
                      onClick={() => setIsDeleteCloudDialogOpen(true)}
                    >
                      <CloudDownload className="h-4 w-4" />
                      Xóa dữ liệu tài khoản
                    </Button>
                  </div>
                ) : null}

                <div className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-app-ink">Xóa toàn bộ dữ liệu trong app</p>
                    <p className="mt-1 text-xs leading-5 text-app-ink-muted">
                      Xóa dữ liệu local và, nếu đã đăng nhập, xóa dữ liệu cloud trước khi quay về trạng thái mới.
                    </p>
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

                {isConfigured && user ? (
                  <div className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-app-ink">Xóa tài khoản</p>
                      <p className="mt-1 text-xs leading-5 text-app-ink-muted">
                        Xóa hoặc vô hiệu hóa tài khoản theo khả năng backend/Firebase, rồi đăng xuất khỏi app.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-[color:var(--color-danger-border)] text-[color:var(--color-danger-fg)] hover:bg-[color:var(--color-danger-bg)] hover:text-[color:var(--color-danger-fg)]"
                      data-testid="settings-delete-account-open"
                      onClick={() => setIsDeleteAccountDialogOpen(true)}
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Xóa tài khoản
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </SettingsSection>

        <section className="border-t border-app-line pt-5" aria-label="Thông tin ứng dụng">
          <h2 className="text-base font-semibold text-app-ink">Thông tin</h2>
          <p className="mt-2 text-xs leading-5 text-app-ink-muted">
            Phiên bản v0.4 · Vision Board Web Platform · local-first 12-Week Year.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-app-ink-soft">
            <Link
              to="/privacy"
              className="rounded-full border border-app-line bg-app-surface px-3 py-1.5 hover:text-app-accent"
            >
              Bảo mật
            </Link>
            <Link
              to="/terms"
              className="rounded-full border border-app-line bg-app-surface px-3 py-1.5 hover:text-app-accent"
            >
              Điều khoản
            </Link>
            <Link
              to="/billing/faq"
              className="rounded-full border border-app-line bg-app-surface px-3 py-1.5 hover:text-app-accent"
            >
              Hỏi đáp thanh toán
            </Link>
          </div>
        </section>
      </div>

      <DeleteCloudWorkspaceDialog
        open={isDeleteCloudDialogOpen}
        onOpenChange={setIsDeleteCloudDialogOpen}
        onConfirm={handleDeleteCloudWorkspaceOnly}
        isLoading={isDeletingCloudWorkspace}
      />

      <AlertDialog open={isClearLocalSignalsDialogOpen} onOpenChange={setIsClearLocalSignalsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa dữ liệu tạm trên thiết bị?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này xóa nhật ký thao tác, hàng chờ đồng bộ và trạng thái nhắc việc cục bộ. Mục tiêu, kế hoạch,
              check-in và review chính vẫn được giữ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearLocalSignals}
              className="bg-[color:var(--color-danger-fg)] text-white hover:bg-[color:var(--color-danger-fg)]/90"
            >
              Xóa dữ liệu tạm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <AlertDialog open={isDeleteAccountDialogOpen} onOpenChange={handleDeleteAccountDialogChange}>
        <AlertDialogContent data-testid="settings-delete-account-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteAccountConfirmStep === "review" ? "Xóa tài khoản và dữ liệu?" : "Xác nhận xóa tài khoản lần cuối"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAccountConfirmStep === "review"
                ? "Hành động này xóa dữ liệu tài khoản trên hệ thống, dữ liệu local trên thiết bị này, mục tiêu, kế hoạch, thanh toán liên quan và không thể hoàn tác từ trong app. Hãy xuất dữ liệu trước nếu cần giữ lại bản sao."
                : "Sau bước này, tài khoản sẽ bị xóa hoặc vô hiệu hóa theo khả năng của backend/Firebase. Bạn sẽ được đăng xuất và app quay về trạng thái mới."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAccount}>Quay lại</AlertDialogCancel>
            {deleteAccountConfirmStep === "review" ? (
              <AlertDialogAction
                disabled={isDeletingAccount}
                data-testid="settings-delete-account-continue"
                onClick={(event) => {
                  event.preventDefault();
                  setDeleteAccountConfirmStep("final");
                }}
              >
                Tôi hiểu, tiếp tục
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                disabled={isDeletingAccount}
                data-testid="settings-delete-account-confirm"
                onClick={(event) => {
                  event.preventDefault();
                  void handleDeleteAccount();
                }}
                className="bg-[color:var(--color-danger-fg)] text-white hover:bg-[color:var(--color-danger-fg)]/90"
              >
                {isDeletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Xóa tài khoản
              </AlertDialogAction>
            )}
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
                className="bg-[color:var(--color-danger-fg)] text-white hover:bg-[color:var(--color-danger-fg)]/90"
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

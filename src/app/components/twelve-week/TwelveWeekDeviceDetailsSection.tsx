import { AlertTriangle, ChevronDown, Flag, RotateCcw, Settings2, Target } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { isDemoMode } from "../../utils/app-mode";
import { requestPushPermissionAndSubscribe, unregisterPushSubscription } from "../../utils/production";
import { formatCalendarDate, getPushSubscription, getUserData } from "../../utils/storage";
import {
  formatDateTimeLabel,
  getBrowserNotificationStatusLabel,
  getOutboxSummaryText,
  getOutboxTypeLabel,
  getReminderActionLabel,
  getSyncStatusLabel,
} from "../../utils/twelve-week-system-ui";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";

type TwelveWeekDeviceDetailsSectionProps = Pick<
  TwelveWeekSettingsTabProps,
  | "appPreferences"
  | "backendConnectionStatus"
  | "funnelSteps"
  | "monetizationSteps"
  | "browserNotificationStatus"
  | "lastSyncSnapshot"
  | "pendingOutboxCount"
  | "archivedOutboxCount"
  | "eventCount"
  | "activeReminders"
  | "recentOutboxItems"
  | "onPreferenceToggle"
  | "onArchivePendingOutbox"
  | "onRestoreArchivedOutbox"
  | "onOpenReminder"
  | "onExportLocalData"
  | "onBrowserNotificationToggle"
  | "onRunOutboxSync"
  | "onOutboxItemToggle"
  | "onClearEventLog"
  | "onClearArchivedOutbox"
  | "onOpenClearLocalDialog"
  | "onOpenDeleteDataDialog"
  | "onOpenResetDialog"
  | "onNavigateGoals"
  | "onNavigateJournal"
  | "onNavigateSetup"
> & {
  onOpenDeleteDataDialog: () => void;
  onDeleteCloudWorkspace?: () => void;
};

interface ExpandableSectionProps {
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
}

function ExpandableSection({ title, description, badge, children }: ExpandableSectionProps) {
  return (
    <details className="group rounded-xl border border-app-line bg-app-surface px-5 py-4">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2">
        <div>
          <p className="text-sm font-semibold text-app-ink">{title}</p>
          <p className="mt-1 pr-6 text-sm text-app-ink">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-app-ink-muted transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

// 1. Reminders and browser permissions settings component
export function TwelveWeekRemindersSettings({
  appPreferences,
  browserNotificationStatus,
  onPreferenceToggle,
  onBrowserNotificationToggle,
  activeReminders,
  onOpenReminder,
}: Pick<
  TwelveWeekDeviceDetailsSectionProps,
  | "appPreferences"
  | "browserNotificationStatus"
  | "onPreferenceToggle"
  | "onBrowserNotificationToggle"
  | "activeReminders"
  | "onOpenReminder"
>) {
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  const hasPushEntitlement = (() => {
    const sub = getUserData().subscription;
    if (!sub) return false;
    if (sub.status === "inactive" || sub.status === "canceled") return false;
    if (sub.renewsAt && new Date(sub.renewsAt) < new Date() && sub.status !== "active") return false;
    return true;
  })();

  useEffect(() => {
    setIsPushSubscribed(getPushSubscription() !== null);
  }, []);

  const handlePushToggle = async (enabled: boolean) => {
    setIsPushLoading(true);
    try {
      if (enabled) {
        const record = await requestPushPermissionAndSubscribe();
        if (record) {
          setIsPushSubscribed(true);
          toast.success("Đã bật push notification.");
        } else {
          toast.error("Không thể đăng ký push. Hãy kiểm tra quyền trình duyệt.");
        }
      } else {
        await unregisterPushSubscription();
        setIsPushSubscribed(false);
        toast.success("Đã tắt push notification.");
      }
    } catch {
      toast.error("Đã có lỗi khi thay đổi cài đặt push.");
    } finally {
      setIsPushLoading(false);
    }
  };

  return (
    <div className="stack-tight">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-app-line bg-app-bg px-4 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-app-ink">Nhắc việc trên web</p>
            <Badge
              variant="outline"
              className={
                appPreferences.enableInAppReminders
                  ? "border-app-accent/20 bg-app-accent-soft text-app-accent"
                  : "border-app-line bg-app-surface text-app-ink-muted"
              }
            >
              {appPreferences.enableInAppReminders ? "Đang bật" : "Đang tắt"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-app-ink">Hiện nhắc việc cho công việc, review và check-in.</p>
        </div>
        <Switch
          checked={appPreferences.enableInAppReminders}
          onCheckedChange={(value) => onPreferenceToggle("enableInAppReminders", value)}
          aria-label="Bật tắt nhắc việc trên web"
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-app-line bg-app-bg px-4 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-app-ink">Nhắc ngoài trình duyệt</p>
            <Badge
              variant="outline"
              className={
                appPreferences.enableBrowserNotifications
                  ? "border-app-accent/20 bg-app-accent-soft text-app-accent"
                  : "border-app-line bg-app-surface text-app-ink-muted"
              }
            >
              {appPreferences.enableBrowserNotifications ? "Đang bật" : "Đang tắt"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-app-ink">
            {getBrowserNotificationStatusLabel(browserNotificationStatus)}. Hữu ích khi bạn rời khỏi tab nhưng vẫn muốn
            được nhắc việc.
          </p>
        </div>
        <Switch
          checked={appPreferences.enableBrowserNotifications}
          onCheckedChange={onBrowserNotificationToggle}
          aria-label="Bật tắt thông báo trình duyệt"
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-app-line bg-app-bg px-4 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-app-ink">Push notification</p>
            {hasPushEntitlement ? (
              <Badge
                variant="outline"
                className={
                  isPushSubscribed
                    ? "border-app-accent/20 bg-app-accent-soft text-app-accent"
                    : "border-app-line bg-app-surface text-app-ink-muted"
                }
              >
                {isPushSubscribed ? "Đang bật" : "Đang tắt"}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-app-accent/20 bg-app-accent-soft text-app-accent">
                Plus
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-app-ink">
            {hasPushEntitlement
              ? "Nhận thông báo đẩy ngay cả khi trình duyệt đang đóng."
              : "Mở Plus để bật push notification trên thiết bị này."}
          </p>
        </div>
        {hasPushEntitlement ? (
          <Switch
            checked={isPushSubscribed}
            onCheckedChange={handlePushToggle}
            disabled={isPushLoading}
            aria-label="Bật tắt push notification"
          />
        ) : (
          <Badge variant="outline" className="shrink-0 border-app-line text-app-ink-muted">
            Khoá
          </Badge>
        )}
      </div>

      {activeReminders.length > 0 && (
        <div className="mt-4 rounded-xl border border-app-line bg-app-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
                Nhắc việc đang hoạt động
              </p>
              <p className="mt-1 text-sm text-app-ink">Danh sách nhắc việc đang chờ hiển thị.</p>
            </div>
            <Badge variant="outline" className="border-app-line bg-app-bg text-app-ink-soft">
              {activeReminders.length}
            </Badge>
          </div>
          <div className="mt-3 space-y-2" aria-live="polite">
            {activeReminders.map((reminder) => (
              <div key={reminder.id} className="rounded-xl border border-app-line bg-app-bg p-4">
                <p className="text-sm font-semibold text-app-ink">{reminder.title}</p>
                <p className="mt-1 text-sm text-app-ink">{reminder.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-xl bg-app-surface"
                  onClick={() => onOpenReminder(reminder)}
                >
                  {getReminderActionLabel(reminder.kind)}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 2. Execution preferences and analytics funnel components
export function TwelveWeekExecutionPreferences({
  appPreferences,
  funnelSteps,
  monetizationSteps,
  onPreferenceToggle,
}: Pick<
  TwelveWeekDeviceDetailsSectionProps,
  "appPreferences" | "funnelSteps" | "monetizationSteps" | "onPreferenceToggle"
>) {
  return (
    <div className="stack-tight">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-app-line bg-app-bg px-4 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-app-ink">Phân tích trên thiết bị</p>
            <Badge
              variant="outline"
              className={
                appPreferences.allowLocalAnalytics
                  ? "border-app-accent/20 bg-app-accent-soft text-app-accent"
                  : "border-app-line bg-app-surface text-app-ink-muted"
              }
            >
              {appPreferences.allowLocalAnalytics ? "Đang bật" : "Đang tắt"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-app-ink">Lưu hành trình 12 tuần trên thiết bị này để xem lịch sử thao tác.</p>
        </div>
        <Switch
          checked={appPreferences.allowLocalAnalytics}
          onCheckedChange={(value) => onPreferenceToggle("allowLocalAnalytics", value)}
          aria-label="Bật tắt phân tích trên thiết bị"
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-app-line bg-app-bg px-4 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-app-ink">Hàng chờ trên thiết bị</p>
            <Badge
              variant="outline"
              className={
                appPreferences.keepLocalOutbox
                  ? "border-app-accent/20 bg-app-accent-soft text-app-accent"
                  : "border-app-line bg-app-surface text-app-ink-muted"
              }
            >
              {appPreferences.keepLocalOutbox ? "Đang bật" : "Đang tắt"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-app-ink">Giữ các mục chờ đồng bộ để thao tác hằng ngày vẫn nhẹ và nhanh.</p>
        </div>
        <Switch
          checked={appPreferences.keepLocalOutbox}
          onCheckedChange={(value) => onPreferenceToggle("keepLocalOutbox", value)}
          aria-label="Bật tắt hàng chờ gửi"
        />
      </div>

      <ExpandableSection
        title="Hành trình 12 tuần"
        description="Theo dõi 5 mốc quan trọng của luồng thực thi ngay trên thiết bị này."
        badge={
          <Badge variant="outline" className="border-app-line bg-app-surface text-app-ink-soft">
            {funnelSteps.reduce((sum, step) => sum + step.count, 0)} sự kiện
          </Badge>
        }
      >
        <ul className="stack-tight" aria-label="Hành trình 12 tuần">
          {funnelSteps.map((step) => (
            <li key={step.id} className="rounded-xl border border-app-line bg-app-bg px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-app-ink">{step.label}</p>
                  <p className="mt-1 text-sm text-app-ink">{step.description}</p>
                </div>
                <Badge variant={step.count > 0 ? "default" : "outline"}>{step.count}</Badge>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-app-ink-muted">
                Lần gần nhất: {formatDateTimeLabel(step.lastSeenAt)}
              </p>
            </li>
          ))}
        </ul>
      </ExpandableSection>

      <ExpandableSection
        title="Hành trình nâng cấp"
        description="Theo dõi các bước từ lúc thấy quyền Plus tới khi mở gói và dùng tính năng nâng cao."
        badge={
          <Badge variant="outline" className="border-app-line bg-app-surface text-app-ink-soft">
            {monetizationSteps.reduce((sum, step) => sum + step.count, 0)} sự kiện
          </Badge>
        }
      >
        <ul className="stack-tight" aria-label="Funnel nâng cấp">
          {monetizationSteps.map((step) => (
            <li key={step.id} className="rounded-xl border border-app-line bg-app-bg px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-app-ink">{step.label}</p>
                  <p className="mt-1 text-sm text-app-ink">{step.description}</p>
                </div>
                <Badge variant={step.count > 0 ? "default" : "outline"}>{step.count}</Badge>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-app-ink-muted">
                Lần gần nhất: {formatDateTimeLabel(step.lastSeenAt)}
              </p>
            </li>
          ))}
        </ul>
      </ExpandableSection>
    </div>
  );
}

// 3. Data safety, exports and backup status component
export function TwelveWeekDataSafety({
  onExportLocalData,
  backendConnectionStatus,
  eventCount,
  onClearEventLog,
  pendingOutboxCount,
  archivedOutboxCount,
  lastSyncSnapshot,
  onRunOutboxSync,
  onArchivePendingOutbox,
  onRestoreArchivedOutbox,
  onClearArchivedOutbox,
  recentOutboxItems,
  onOutboxItemToggle,
}: Pick<
  TwelveWeekDeviceDetailsSectionProps,
  | "onExportLocalData"
  | "backendConnectionStatus"
  | "eventCount"
  | "onClearEventLog"
  | "pendingOutboxCount"
  | "archivedOutboxCount"
  | "lastSyncSnapshot"
  | "onRunOutboxSync"
  | "onArchivePendingOutbox"
  | "onRestoreArchivedOutbox"
  | "onClearArchivedOutbox"
  | "recentOutboxItems"
  | "onOutboxItemToggle"
>) {
  const localDataOnly = isDemoMode() || !backendConnectionStatus.signedIn;
  const privacyBadgeLabel = localDataOnly ? "Chỉ lưu trên thiết bị" : "Dữ liệu tài khoản";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-app-line bg-app-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Dữ liệu trên thiết bị</p>
          <p className="mt-2 text-sm leading-6 text-app-ink-soft">
            Dữ liệu chu kỳ 12 tuần, tactic và nhật ký phản tư được lưu trữ an toàn trong trình duyệt của bạn. Bạn nên
            xuất dữ liệu định kỳ làm bản sao dự phòng.
          </p>
          <div className="mt-4">
            <Button variant="outline" className="w-full bg-app-surface rounded-xl" onClick={onExportLocalData}>
              Xuất dữ liệu thiết bị
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-app-line bg-app-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
            Quyền riêng tư & Tải về
          </p>
          <p className="mt-2 text-sm leading-6 text-app-ink-soft">
            Hiểu dữ liệu nào đang lưu trên thiết bị và dữ liệu nào có thể được gửi đi. Tải bản sao gồm mục tiêu, kế
            hoạch 12 tuần và cài đặt ứng dụng.
          </p>
          <div className="mt-4">
            <Badge
              variant="outline"
              className={
                localDataOnly
                  ? "border-app-warm/30 bg-app-warm-soft text-app-warm"
                  : "border-app-accent/20 bg-app-accent-soft text-app-accent"
              }
            >
              {privacyBadgeLabel}
            </Badge>
          </div>
        </div>
      </div>

      <ExpandableSection
        title="Dữ liệu & quyền riêng tư"
        description="Chi tiết dữ liệu được lưu cục bộ và các kênh truyền nhận dữ liệu."
      >
        <div className="stack-stack">
          <div className="rounded-xl border border-app-accent/20 bg-app-accent-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-accent">
              Dữ liệu lưu trên thiết bị
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-app-ink">
              <li>• Mục tiêu, tactic, check-in, review hàng tuần</li>
              <li>• Nhật ký phản tư và vision board</li>
              <li>• Nhật ký thao tác trên thiết bị (nếu bật)</li>
              <li>• Cài đặt ưu tiên và trạng thái gói Plus trên thiết bị</li>
            </ul>
          </div>
          <div className="rounded-xl border border-app-warm/30 bg-app-warm-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-warm">
              Dữ liệu có thể được gửi đi
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-app-ink">
              <li>• Hàng chờ gửi (nếu bật giữ lại dữ liệu chờ)</li>
              <li>• Đường dẫn đăng ký thông báo đẩy (nếu bật push)</li>
              <li>• Sự kiện analytics (nếu bật cho phép)</li>
            </ul>
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection
        title="Đồng bộ nâng cao (Chỉ dành cho nhà phát triển)"
        description="Xem các mục đang chờ gửi, trạng thái đồng bộ nâng cao và nhật ký sự kiện."
      >
        <div className="grid gap-3">
          <div className="rounded-xl border border-app-line bg-app-bg p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">Nhật ký sự kiện</p>
                <p className="mt-2 text-3xl font-bold text-app-ink">{eventCount}</p>
                <p className="mt-1 text-sm text-app-ink">Số thao tác đang được giữ lại trên thiết bị này.</p>
              </div>
            </div>
            <Button variant="outline" className="mt-4 w-full bg-app-surface rounded-xl" onClick={onClearEventLog}>
              Xóa nhật ký thao tác
            </Button>
          </div>

          <div className="rounded-xl border border-app-line bg-app-bg p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
                  Hàng chờ gửi trên thiết bị
                </p>
                <p className="mt-2 text-3xl font-bold text-app-ink">{pendingOutboxCount} đang chờ</p>
                <p className="text-sm text-app-ink">{archivedOutboxCount} mục đã lưu</p>
                <p className="mt-2 text-sm text-app-ink">
                  {lastSyncSnapshot
                    ? `${getSyncStatusLabel(lastSyncSnapshot.status)} · ${lastSyncSnapshot.message}`
                    : "Chưa có lần đồng bộ nào được chạy."}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <Button variant="outline" className="w-full bg-app-surface rounded-xl" onClick={onRunOutboxSync}>
                Đồng bộ ngay
              </Button>
              <Button variant="outline" className="w-full bg-app-surface rounded-xl" onClick={onArchivePendingOutbox}>
                Lưu lại mục đang chờ
              </Button>
              <Button variant="outline" className="w-full bg-app-surface rounded-xl" onClick={onRestoreArchivedOutbox}>
                Khôi phục mục đã lưu
              </Button>
              <Button variant="outline" className="w-full bg-app-surface rounded-xl" onClick={onClearArchivedOutbox}>
                Xóa hàng chờ đã lưu
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-app-line bg-app-bg p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">Hàng chờ gần đây</p>
              <p className="mt-1 text-sm text-app-ink">3 mục mới nhất đang chờ hoặc đã được lưu lại.</p>
            </div>
            <Badge variant="outline" className="border-app-line bg-app-surface text-app-ink-soft">
              {recentOutboxItems.length}
            </Badge>
          </div>
          <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {recentOutboxItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-app-line bg-app-bg px-4 py-4 text-sm text-app-ink">
                Chưa có mục nào trong hàng chờ trên thiết bị.
              </div>
            ) : (
              recentOutboxItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-app-line bg-app-bg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-app-ink">{getOutboxTypeLabel(item.type)}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-app-ink-muted">
                        {formatCalendarDate(item.createdAt)}
                      </p>
                    </div>
                    <Badge variant={item.status === "pending" ? "default" : "outline"}>
                      {item.status === "pending" ? "đang chờ" : "đã lưu"}
                    </Badge>
                  </div>
                  <p className="mt-3 break-words text-sm leading-6 text-app-ink">{getOutboxSummaryText(item)}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 bg-app-surface rounded-xl"
                    onClick={() => onOutboxItemToggle(item)}
                  >
                    {item.status === "pending" ? "Lưu mục này" : "Khôi phục về hàng chờ"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </ExpandableSection>
    </div>
  );
}

// 4. Danger zone component (Reset cycle, delete data etc)
export function TwelveWeekDangerZone({
  backendConnectionStatus,
  onOpenResetDialog,
  onOpenClearLocalDialog,
  onOpenDeleteDataDialog,
  onDeleteCloudWorkspace,
}: Pick<
  TwelveWeekDeviceDetailsSectionProps,
  | "backendConnectionStatus"
  | "onOpenResetDialog"
  | "onOpenClearLocalDialog"
  | "onOpenDeleteDataDialog"
  | "onDeleteCloudWorkspace"
>) {
  const localDataOnly = isDemoMode() || !backendConnectionStatus.signedIn;
  const deleteActionLabel = localDataOnly ? "Xóa toàn bộ dữ liệu" : "Xóa tài khoản";

  return (
    <div className="rounded-xl border border-app-warm/25 bg-gradient-to-br from-app-warm/10 to-transparent p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-app-warm" />
        <div>
          <h3 className="font-serif text-lg font-medium text-app-warm">Vùng nguy hiểm</h3>
          <p className="mt-1.5 text-sm text-app-ink-soft">
            Các hành động dưới đây sẽ thay đổi hoặc xóa bỏ dữ liệu vĩnh viễn. Hãy chắc chắn rằng bạn đã tải bản sao lưu
            dữ liệu trước khi thực hiện.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {/* Action 1: Reset cycle */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-app-line bg-app-bg p-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-app-ink">Làm mới chu kỳ hiện tại</p>
            <p className="mt-1 text-xs text-app-ink-muted">
              Bắt đầu lại tuần 1 từ tuần hiện tại, làm mới tiến trình hàng ngày nhưng giữ nguyên các tactic và mục tiêu.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-app-warm/20 bg-app-surface text-app-warm hover:bg-app-warm-soft rounded-xl"
            onClick={onOpenResetDialog}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Làm mới chu kỳ
          </Button>
        </div>

        {/* Action 2: Clear local temporary data */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-app-line bg-app-bg p-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-app-ink">Xóa dữ liệu tạm cục bộ</p>
            <p className="mt-1 text-xs text-app-ink-muted">
              Xóa nhật ký sự kiện thao tác, hàng chờ đồng bộ và trạng thái nhắc nhở trên thiết bị này. Dữ liệu chính vẫn
              an toàn.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-app-warm/20 bg-app-surface text-app-warm hover:bg-app-warm-soft rounded-xl"
            onClick={onOpenClearLocalDialog}
          >
            Xóa dữ liệu tạm
          </Button>
        </div>

        {/* Action 3: Delete Cloud Workspace (Only when not localDataOnly) */}
        {!localDataOnly && onDeleteCloudWorkspace && (
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-app-line bg-app-bg p-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-app-ink">Xóa dữ liệu trên tài khoản (Cloud)</p>
              <p className="mt-1 text-xs text-app-ink-muted">
                Xóa toàn bộ các bản sao chu kỳ 12 tuần trên đám mây. Dữ liệu trên thiết bị này và thông tin gói dịch vụ
                không bị ảnh hưởng.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-app-warm/20 bg-app-surface text-app-warm hover:bg-app-warm-soft rounded-xl"
              onClick={onDeleteCloudWorkspace}
            >
              Xóa dữ liệu tài khoản
            </Button>
          </div>
        )}

        {/* Action 4: Delete account or wipe all local data */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-app-line bg-app-bg p-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-app-ink">
              {localDataOnly ? "Xóa vĩnh viễn mọi dữ liệu" : "Xóa tài khoản người dùng"}
            </p>
            <p className="mt-1 text-xs text-app-ink-muted">
              {localDataOnly
                ? "Hủy bỏ toàn bộ mục tiêu, kế hoạch và dữ liệu trên thiết bị này. Không thể khôi phục."
                : "Xóa toàn bộ hồ sơ, dữ liệu đám mây và chấm dứt tài khoản đăng nhập của bạn vĩnh viễn."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-red-300 bg-red-50/50 text-red-700 hover:bg-red-100 dark:border-red-950/30 dark:bg-red-950/20 dark:text-red-400 rounded-xl"
            onClick={onOpenDeleteDataDialog}
          >
            {deleteActionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// 5. Quick shortcuts component
export function TwelveWeekQuickShortcuts({
  onNavigateGoals,
  onNavigateJournal,
  onNavigateSetup,
}: Pick<TwelveWeekDeviceDetailsSectionProps, "onNavigateGoals" | "onNavigateJournal" | "onNavigateSetup">) {
  return (
    <div className="stack-tight">
      <Button className="w-full justify-start bg-app-surface rounded-xl" variant="outline" onClick={onNavigateGoals}>
        <Target className="mr-2 h-4 w-4 text-app-accent" />
        Mở Mục tiêu
      </Button>
      <Button className="w-full justify-start bg-app-surface rounded-xl" variant="outline" onClick={onNavigateJournal}>
        <Flag className="mr-2 h-4 w-4 text-app-accent" />
        Mở nhật ký
      </Button>
      <Button className="w-full justify-start rounded-xl" onClick={onNavigateSetup}>
        <Settings2 className="mr-2 h-4 w-4" />
        Tạo chu kỳ mới từ setup
      </Button>
    </div>
  );
}

// Component default fallback wrapper (for backward compatibility)
export function TwelveWeekDeviceDetailsSection(props: TwelveWeekDeviceDetailsSectionProps) {
  return (
    <>
      <ExpandableSection
        title="Nhắc việc và quyền trên thiết bị"
        description="Quản lý nhắc việc, thông báo và các quyền đang mở trên thiết bị này."
      >
        <TwelveWeekRemindersSettings
          appPreferences={props.appPreferences}
          browserNotificationStatus={props.browserNotificationStatus}
          onPreferenceToggle={props.onPreferenceToggle}
          onBrowserNotificationToggle={props.onBrowserNotificationToggle}
          activeReminders={props.activeReminders}
          onOpenReminder={props.onOpenReminder}
        />
      </ExpandableSection>

      <TwelveWeekExecutionPreferences
        appPreferences={props.appPreferences}
        funnelSteps={props.funnelSteps}
        monetizationSteps={props.monetizationSteps}
        onPreferenceToggle={props.onPreferenceToggle}
      />

      <ExpandableSection
        title="Dữ liệu & sao lưu"
        description="Sao lưu dữ liệu thiết bị, quyền riêng tư và theo dõi đồng bộ nâng cao."
      >
        <TwelveWeekDataSafety
          onExportLocalData={props.onExportLocalData}
          backendConnectionStatus={props.backendConnectionStatus}
          eventCount={props.eventCount}
          onClearEventLog={props.onClearEventLog}
          pendingOutboxCount={props.pendingOutboxCount}
          archivedOutboxCount={props.archivedOutboxCount}
          lastSyncSnapshot={props.lastSyncSnapshot}
          onRunOutboxSync={props.onRunOutboxSync}
          onArchivePendingOutbox={props.onArchivePendingOutbox}
          onRestoreArchivedOutbox={props.onRestoreArchivedOutbox}
          onClearArchivedOutbox={props.onClearArchivedOutbox}
          recentOutboxItems={props.recentOutboxItems}
          onOutboxItemToggle={props.onOutboxItemToggle}
        />
      </ExpandableSection>

      <TwelveWeekQuickShortcuts
        onNavigateGoals={props.onNavigateGoals}
        onNavigateJournal={props.onNavigateJournal}
        onNavigateSetup={props.onNavigateSetup}
      />

      <TwelveWeekDangerZone
        backendConnectionStatus={props.backendConnectionStatus}
        onOpenResetDialog={props.onOpenResetDialog}
        onOpenClearLocalDialog={props.onOpenClearLocalDialog}
        onOpenDeleteDataDialog={props.onOpenDeleteDataDialog}
        onDeleteCloudWorkspace={props.onDeleteCloudWorkspace}
      />
    </>
  );
}

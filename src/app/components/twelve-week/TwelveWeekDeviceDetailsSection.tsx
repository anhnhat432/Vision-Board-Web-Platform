import { type ReactNode, useEffect, useState } from "react";
import { ChevronDown, Flag, RotateCcw, Settings2, Target } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { formatCalendarDate, getPushSubscription, getUserData } from "../../utils/storage";
import { isDemoMode } from "../../utils/app-mode";
import { requestPushPermissionAndSubscribe, unregisterPushSubscription } from "../../utils/production";
import {
  formatDateTimeLabel,
  getBrowserNotificationStatusLabel,
  getOutboxSummaryText,
  getOutboxTypeLabel,
  getReminderActionLabel,
  getSyncStatusLabel,
} from "../../utils/twelve-week-system-ui";
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
};

interface ExpandableSectionProps {
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
}

function ExpandableSection({ title, description, badge, children }: ExpandableSectionProps) {
  return (
    <details className="group rounded-lg border border-app-line bg-app-surface px-5 py-4">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2">
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

export function TwelveWeekDeviceDetailsSection({
  appPreferences,
  backendConnectionStatus,
  funnelSteps,
  monetizationSteps,
  browserNotificationStatus,
  lastSyncSnapshot,
  pendingOutboxCount,
  archivedOutboxCount,
  eventCount,
  activeReminders,
  recentOutboxItems,
  onPreferenceToggle,
  onArchivePendingOutbox,
  onRestoreArchivedOutbox,
  onOpenReminder,
  onExportLocalData,
  onBrowserNotificationToggle,
  onRunOutboxSync,
  onOutboxItemToggle,
  onClearEventLog,
  onClearArchivedOutbox,
  onOpenClearLocalDialog,
  onOpenDeleteDataDialog,
  onOpenResetDialog,
  onNavigateGoals,
  onNavigateJournal,
  onNavigateSetup,
}: TwelveWeekDeviceDetailsSectionProps) {
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const localDataOnly = isDemoMode() || !backendConnectionStatus.signedIn;
  const privacyBadgeLabel = localDataOnly ? "Chỉ lưu trên thiết bị" : "Dữ liệu tài khoản";
  const deleteActionLabel = localDataOnly ? "Xóa toàn bộ dữ liệu" : "Xóa tài khoản";
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
    <>
      <ExpandableSection
        title="Nhắc việc và quyền trên thiết bị"
        description="Quản lý nhắc việc, thông báo và các quyền đang mở trên thiết bị này."
      >
        <div className="stack-tight">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-app-line bg-app-bg px-4 py-4">
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

          <div className="flex items-center justify-between gap-4 rounded-lg border border-app-line bg-app-bg px-4 py-4">
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
                {getBrowserNotificationStatusLabel(browserNotificationStatus)}. Hữu ích khi bạn rời khỏi tab nhưng vẫn
                muốn được nhắc việc.
              </p>
            </div>
            <Switch
              checked={appPreferences.enableBrowserNotifications}
              onCheckedChange={onBrowserNotificationToggle}
              aria-label="Bật tắt thông báo trình duyệt"
            />
          </div>

          {/* Push notification toggle (D2) */}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-app-line bg-app-bg px-4 py-4">
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

          <div className="flex items-center justify-between gap-4 rounded-lg border border-app-line bg-app-bg px-4 py-4">
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
              <p className="mt-1 text-sm text-app-ink">
                Lưu hành trình 12 tuần trên thiết bị này để xem lịch sử thao tác.
              </p>
            </div>
            <Switch
              checked={appPreferences.allowLocalAnalytics}
              onCheckedChange={(value) => onPreferenceToggle("allowLocalAnalytics", value)}
              aria-label="Bật tắt phân tích trên thiết bị"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-app-line bg-app-bg px-4 py-4">
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
              <p className="mt-1 text-sm text-app-ink">
                Giữ các mục chờ đồng bộ để thao tác hằng ngày vẫn nhẹ và nhanh.
              </p>
            </div>
            <Switch
              checked={appPreferences.keepLocalOutbox}
              onCheckedChange={(value) => onPreferenceToggle("keepLocalOutbox", value)}
              aria-label="Bật tắt hàng chờ gửi"
            />
          </div>
        </div>
      </ExpandableSection>

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
            <li key={step.id} className="rounded-lg border border-app-line bg-app-bg px-4 py-4">
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
            <li key={step.id} className="rounded-lg border border-app-line bg-app-bg px-4 py-4">
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
        title="Dữ liệu trên thiết bị"
        description="Dữ liệu đang được lưu trên thiết bị này. Hãy xuất bản sao nếu muốn giữ lại."
        badge={
          <Badge variant="outline" className="border-app-line bg-app-surface text-app-ink-soft">
            Thiết bị này
          </Badge>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="bg-app-surface" onClick={onExportLocalData}>
            Xuất dữ liệu
          </Button>
          <Button variant="outline" className="bg-app-surface" onClick={onOpenClearLocalDialog}>
            Xóa dữ liệu tạm
          </Button>
        </div>
        <p className="mt-3 text-sm text-app-ink-muted">
          Sẽ xóa nhật ký sự kiện, hàng chờ gửi và trạng thái nhắc việc. Dữ liệu chu kỳ 12 tuần và nhật ký vẫn được giữ
          nguyên trên thiết bị này.
        </p>
      </ExpandableSection>

      <ExpandableSection
        title="Dữ liệu & quyền riêng tư"
        description="Hiểu dữ liệu nào đang lưu trên thiết bị, dữ liệu nào có thể được gửi đi, và xóa toàn bộ nếu cần."
        badge={
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
        }
      >
        <div className="stack-stack">
          <div className="rounded-lg border border-app-line bg-app-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Quyền riêng tư</p>
            <p className="mt-2 text-sm leading-6 text-app-ink">
              Tải bản sao gồm mục tiêu hiện tại, hệ thống 12 tuần và cài đặt ứng dụng. Nếu xóa dữ liệu, chỉ dữ liệu đang
              lưu trên thiết bị này bị xóa.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="bg-app-surface" onClick={onExportLocalData}>
                Xuất dữ liệu của tôi
              </Button>
              <Button variant="destructive" onClick={onOpenDeleteDataDialog}>
                {deleteActionLabel}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-app-accent/20 bg-app-accent-soft p-4">
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
          <div className="rounded-lg border border-app-warm/30 bg-app-warm-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-warm">
              Dữ liệu có thể được gửi đi
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-app-ink">
              <li>• Hàng chờ gửi (nếu bật giữ lại dữ liệu chờ)</li>
              <li>• Đường dẫn đăng ký thông báo đẩy (nếu bật push)</li>
              <li>• Sự kiện analytics (nếu bật cho phép)</li>
            </ul>
            <p className="mt-2 text-xs text-app-warm">
              Bạn có thể tắt từng kênh ở phần &quot;Nhắc việc và quyền trên thiết bị&quot; bên trên.
            </p>
          </div>
          <div className="rounded-lg border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-danger-fg)]">
              Xóa toàn bộ dữ liệu
            </p>
            <p className="mt-2 text-sm text-[color:var(--color-danger-fg)]">
              Hành động này sẽ xóa vĩnh viễn tất cả dữ liệu đang lưu trên thiết bị này: mục tiêu, nhật ký, check-in, cài
              đặt và trạng thái gói Plus. Không thể hoàn tác.
            </p>
            <Button variant="destructive" className="mt-3 w-full" onClick={onOpenDeleteDataDialog}>
              {deleteActionLabel}
            </Button>
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection
        title="Đồng bộ nâng cao và nhắc việc"
        description="Xem các mục đang chờ gửi, trạng thái đồng bộ và nhắc việc đang chờ hiển thị."
      >
        <div className="grid gap-3">
          <div className="rounded-lg border border-app-accent/20 bg-app-accent-soft p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-accent">Nhật ký sự kiện</p>
                <p className="mt-2 text-3xl font-bold text-app-ink">{eventCount}</p>
                <p className="mt-1 text-sm text-app-ink">Số thao tác đang được giữ lại trên thiết bị này.</p>
              </div>
              <Badge variant="outline" className="border-app-accent/20 bg-app-surface text-app-accent">
                {appPreferences.allowLocalAnalytics ? "Bật" : "Tắt"}
              </Badge>
            </div>
            <Button variant="outline" className="mt-4 w-full bg-app-surface" onClick={onClearEventLog}>
              Xóa nhật ký thao tác
            </Button>
          </div>

          <div className="rounded-lg border border-app-accent/20 bg-app-accent-soft p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-accent">
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
              <Badge variant="outline" className="border-app-line bg-app-surface text-app-ink-soft">
                {appPreferences.keepLocalOutbox ? "Bật" : "Tắt"}
              </Badge>
            </div>
            <div className="mt-4 grid gap-2">
              <Button variant="outline" className="w-full bg-app-surface" onClick={onRunOutboxSync}>
                Đồng bộ ngay
              </Button>
              <Button variant="outline" className="w-full bg-app-surface" onClick={onArchivePendingOutbox}>
                Lưu lại mục đang chờ
              </Button>
              <Button variant="outline" className="w-full bg-app-surface" onClick={onRestoreArchivedOutbox}>
                Khôi phục mục đã lưu
              </Button>
              <Button variant="outline" className="w-full bg-app-surface" onClick={onClearArchivedOutbox}>
                Xóa hàng chờ đã lưu
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-app-line bg-app-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
                Nhắc việc đang hoạt động
              </p>
              <p className="mt-1 text-sm text-app-ink">Danh sách nhắc việc đang chờ hiển thị.</p>
            </div>
            <Badge variant="outline" className="border-app-line bg-app-surface text-app-ink-soft">
              {activeReminders.length}
            </Badge>
          </div>
          <div className="mt-3 space-y-2" aria-live="polite">
            {activeReminders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-app-line bg-app-bg px-4 py-4 text-sm text-app-ink">
                Không có nhắc việc nào đang chờ lúc này.
              </div>
            ) : (
              activeReminders.map((reminder) => (
                <div key={reminder.id} className="rounded-lg border border-app-line bg-app-bg p-4">
                  <p className="text-sm font-semibold text-app-ink">{reminder.title}</p>
                  <p className="mt-1 text-sm text-app-ink">{reminder.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 bg-app-surface"
                    onClick={() => onOpenReminder(reminder)}
                  >
                    {getReminderActionLabel(reminder.kind)}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-app-line bg-app-surface p-5">
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
              <div className="rounded-lg border border-dashed border-app-line bg-app-bg px-4 py-4 text-sm text-app-ink">
                Chưa có mục nào trong hàng chờ trên thiết bị.
              </div>
            ) : (
              recentOutboxItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-app-line bg-app-bg p-4">
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
                    className="mt-3 bg-app-surface"
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

      <div className="rounded-lg border border-app-warm/30 bg-app-warm-soft p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-warm">Làm mới chu kỳ</p>
        <p className="mt-2 text-sm text-app-accent">
          Bắt đầu lại tuần 1 từ tuần hiện tại, giữ nguyên kết quả và việc lặp lại, nhưng làm mới việc hàng ngày,
          check-in và review của chu kỳ này.
        </p>
        <Button className="mt-3 w-full bg-app-surface" variant="outline" onClick={onOpenResetDialog}>
          <RotateCcw className="h-4 w-4" />
          Làm mới chu kỳ từ tuần này
        </Button>
      </div>

      <ExpandableSection
        title="Lối tắt nhanh"
        description="Đi sang Mục tiêu, Nhật ký hoặc bắt đầu một chu kỳ mới chỉ bằng một lần mở."
      >
        <div className="stack-tight">
          <Button className="w-full justify-start bg-app-surface" variant="outline" onClick={onNavigateGoals}>
            <Target className="h-4 w-4" />
            Mở Mục tiêu
          </Button>
          <Button className="w-full justify-start bg-app-surface" variant="outline" onClick={onNavigateJournal}>
            <Flag className="h-4 w-4" />
            Mở nhật ký
          </Button>
          <Button className="w-full justify-start" onClick={onNavigateSetup}>
            <Settings2 className="h-4 w-4" />
            Tạo chu kỳ mới từ setup
          </Button>
        </div>
      </ExpandableSection>
    </>
  );
}

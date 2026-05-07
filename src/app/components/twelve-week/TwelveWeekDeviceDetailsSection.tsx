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
    <details className="group rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-[0_16px_36px_-32px_rgba(15,23,42,0.18)]">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 pr-6 text-sm text-slate-600">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
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
  const deleteActionLabel = localDataOnly ? "Xóa toàn bộ dữ liệu local" : "Xóa tài khoản";
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
        description="Bật tắt nhắc việc, thông báo và dữ liệu chỉ lưu trên trình duyệt này."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-950">Nhắc việc trên web</p>
                <Badge
                  variant="outline"
                  className={
                    appPreferences.enableInAppReminders
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-600"
                  }
                >
                  {appPreferences.enableInAppReminders ? "Đang bật" : "Đang tắt"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">Hiện nhắc việc local cho việc, review và check-in.</p>
            </div>
            <Switch
              checked={appPreferences.enableInAppReminders}
              onCheckedChange={(value) => onPreferenceToggle("enableInAppReminders", value)}
              aria-label="Bật tắt nhắc việc trên web"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-950">Nhắc ngoài trình duyệt</p>
                <Badge
                  variant="outline"
                  className={
                    appPreferences.enableBrowserNotifications
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-600"
                  }
                >
                  {appPreferences.enableBrowserNotifications ? "Đang bật" : "Đang tắt"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">
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
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-950">Push notification</p>
                {hasPushEntitlement ? (
                  <Badge
                    variant="outline"
                    className={
                      isPushSubscribed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-300 bg-white text-slate-600"
                    }
                  >
                    {isPushSubscribed ? "Đang bật" : "Đang tắt"}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                    Plus
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {hasPushEntitlement
                  ? "Nhận thông báo đẩy ngay cả khi trình duyệt đang đóng."
                  : "Mở Plus demo để bật push notification trên thiết bị này. Mock upgrade không thu tiền thật."}
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
              <Badge variant="outline" className="shrink-0 border-slate-200 text-slate-500">
                Khoá
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-950">Phân tích trên thiết bị</p>
                <Badge
                  variant="outline"
                  className={
                    appPreferences.allowLocalAnalytics
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-600"
                  }
                >
                  {appPreferences.allowLocalAnalytics ? "Đang bật" : "Đang tắt"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Lưu hành trình 12 tuần trên thiết bị này để xem lịch sử thao tác.
              </p>
            </div>
            <Switch
              checked={appPreferences.allowLocalAnalytics}
              onCheckedChange={(value) => onPreferenceToggle("allowLocalAnalytics", value)}
              aria-label="Bật tắt phân tích local"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-950">Hàng chờ trên thiết bị</p>
                <Badge
                  variant="outline"
                  className={
                    appPreferences.keepLocalOutbox
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-600"
                  }
                >
                  {appPreferences.keepLocalOutbox ? "Đang bật" : "Đang tắt"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">
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
        description="Theo dõi 5 mốc quan trọng của flow thực thi ngay trên thiết bị này."
        badge={
          <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
            {funnelSteps.reduce((sum, step) => sum + step.count, 0)} sự kiện
          </Badge>
        }
      >
        <ul className="space-y-3" aria-label="Hành trình 12 tuần">
          {funnelSteps.map((step) => (
            <li key={step.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">{step.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                </div>
                <Badge variant={step.count > 0 ? "default" : "outline"}>{step.count}</Badge>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                Lần gần nhất: {formatDateTimeLabel(step.lastSeenAt)}
              </p>
            </li>
          ))}
        </ul>
      </ExpandableSection>

      <ExpandableSection
        title="Funnel nâng cấp"
        description="Theo dõi mạch paywall từ lúc nhìn thấy tới khi mở gói và dùng giá trị premium."
        badge={
          <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
            {monetizationSteps.reduce((sum, step) => sum + step.count, 0)} sự kiện
          </Badge>
        }
      >
        <ul className="space-y-3" aria-label="Funnel nâng cấp">
          {monetizationSteps.map((step) => (
            <li key={step.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">{step.label}</p>
                  <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                </div>
                <Badge variant={step.count > 0 ? "default" : "outline"}>{step.count}</Badge>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                Lần gần nhất: {formatDateTimeLabel(step.lastSeenAt)}
              </p>
            </li>
          ))}
        </ul>
      </ExpandableSection>

      <ExpandableSection
        title="Dữ liệu trên thiết bị"
        description="Bản demo lưu trên trình duyệt này. Hãy export dữ liệu nếu muốn giữ bản sao."
        badge={
          <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
            Thiết bị này
          </Badge>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="bg-white/90" onClick={onExportLocalData}>
            Xuất dữ liệu
          </Button>
          <Button variant="outline" className="bg-white/90" onClick={onOpenClearLocalDialog}>
            Xóa dấu vết local
          </Button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Sẽ xóa nhật ký sự kiện, hàng chờ gửi và trạng thái nhắc việc. Dữ liệu chu kỳ 12 tuần và nhật ký vẫn được giữ
          nguyên trên trình duyệt này.
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
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }
          >
            {privacyBadgeLabel}
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Data & Privacy</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Xuất bản JSON gồm mục tiêu hiện tại, hệ thống 12 tuần và cài đặt ứng dụng. Nếu xóa trong demo,
              chỉ dữ liệu local trên trình duyệt này bị xóa.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="bg-white/90" onClick={onExportLocalData}>
                Xuất dữ liệu của tôi
              </Button>
              <Button variant="destructive" onClick={onOpenDeleteDataDialog}>
                {deleteActionLabel}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Dữ liệu lưu trên thiết bị
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
              <li>• Mục tiêu, tactic, check-in, review hàng tuần</li>
              <li>• Nhật ký phản tư và vision board</li>
              <li>• Nhật ký sự kiện local (nếu bật)</li>
              <li>• Cài đặt ưu tiên và trạng thái gói mock/local</li>
            </ul>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              Dữ liệu có thể được gửi đi
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
              <li>• Hàng chờ gửi (nếu bật giữ lại dữ liệu chờ)</li>
              <li>• Push subscription endpoint (nếu bật push)</li>
              <li>• Sự kiện analytics (nếu bật cho phép)</li>
            </ul>
            <p className="mt-2 text-xs text-amber-600">
              Bạn có thể tắt từng kênh ở phần &quot;Nhắc việc và quyền trên thiết bị&quot; bên trên.
            </p>
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-destructive">Xóa toàn bộ dữ liệu</p>
            <p className="mt-2 text-sm text-destructive/90">
              Hành động này sẽ xóa vĩnh viễn tất cả dữ liệu local trên trình duyệt này: mục tiêu, nhật ký, check-in,
              cài đặt và gói mock. Không thể hoàn tác.
            </p>
            <Button variant="destructive" className="mt-3 w-full" onClick={onOpenDeleteDataDialog}>
              {deleteActionLabel}
            </Button>
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection
        title="Hàng chờ gửi, đồng bộ và nhắc việc"
        description="Xem hàng chờ gửi, trạng thái đồng bộ thử nghiệm và nhắc việc đang chờ. Demo không hứa đồng bộ đám mây."
      >
        <div className="grid gap-3">
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Nhật ký sự kiện</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{eventCount}</p>
                <p className="mt-1 text-sm text-slate-600">Số thao tác đang được giữ lại trên thiết bị này.</p>
              </div>
              <Badge variant="outline" className="border-sky-200 bg-white/90 text-sky-700">
                {appPreferences.allowLocalAnalytics ? "Bật" : "Tắt"}
              </Badge>
            </div>
            <Button variant="outline" className="mt-4 w-full bg-white/90" onClick={onClearEventLog}>
              Xóa log
            </Button>
          </div>

          <div className="rounded-lg border border-violet-200 bg-violet-50 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                  Hàng chờ gửi trên thiết bị
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{pendingOutboxCount} đang chờ</p>
                <p className="text-sm text-slate-600">{archivedOutboxCount} mục đã lưu</p>
                <p className="mt-2 text-sm text-slate-600">
                  {lastSyncSnapshot
                    ? `${getSyncStatusLabel(lastSyncSnapshot.status)} · ${lastSyncSnapshot.message}`
                    : "Chưa có lần đồng bộ nào được chạy."}
                </p>
              </div>
              <Badge variant="outline" className="border-violet-200 bg-white/90 text-violet-700">
                {appPreferences.keepLocalOutbox ? "Bật" : "Tắt"}
              </Badge>
            </div>
            <div className="mt-4 grid gap-2">
              <Button variant="outline" className="w-full bg-white/90" onClick={onRunOutboxSync}>
                Đồng bộ ngay
              </Button>
              <Button variant="outline" className="w-full bg-white/90" onClick={onArchivePendingOutbox}>
                Lưu lại mục đang chờ
              </Button>
              <Button variant="outline" className="w-full bg-white/90" onClick={onRestoreArchivedOutbox}>
                Khôi phục mục đã lưu
              </Button>
              <Button variant="outline" className="w-full bg-white/90" onClick={onClearArchivedOutbox}>
                Xóa hàng chờ đã lưu
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Nhắc việc đang hoạt động
              </p>
              <p className="mt-1 text-sm text-slate-600">Danh sách nhắc việc local đang chờ được hiện.</p>
            </div>
            <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
              {activeReminders.length}
            </Badge>
          </div>
          <div className="mt-3 space-y-2" aria-live="polite">
            {activeReminders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                Không có nhắc việc nào đang chờ lúc này.
              </div>
            ) : (
              activeReminders.map((reminder) => (
                <div key={reminder.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">{reminder.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{reminder.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 bg-white"
                    onClick={() => onOpenReminder(reminder)}
                  >
                    {getReminderActionLabel(reminder.kind)}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hàng chờ gần đây</p>
              <p className="mt-1 text-sm text-slate-600">3 mục mới nhất đang chờ hoặc đã được lưu lại.</p>
            </div>
            <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
              {recentOutboxItems.length}
            </Badge>
          </div>
          <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {recentOutboxItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                Chưa có mục nào trong hàng chờ trên thiết bị.
              </div>
            ) : (
              recentOutboxItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{getOutboxTypeLabel(item.type)}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                        {formatCalendarDate(item.createdAt)}
                      </p>
                    </div>
                    <Badge variant={item.status === "pending" ? "default" : "outline"}>
                      {item.status === "pending" ? "đang chờ" : "đã lưu"}
                    </Badge>
                  </div>
                  <p className="mt-3 break-words text-sm leading-6 text-slate-600">{getOutboxSummaryText(item)}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 bg-white"
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

      <div className="rounded-lg border border-amber-300/70 bg-amber-50 p-5 shadow-[0_18px_38px_-34px_rgba(217,119,6,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Làm mới chu kỳ</p>
        <p className="mt-2 text-sm text-red-900">
          Bắt đầu lại tuần 1 từ tuần hiện tại, giữ nguyên kết quả và việc lặp lại, nhưng làm mới việc hàng ngày, check-in và review của
          chu kỳ này.
        </p>
        <Button className="mt-3 w-full bg-white/90" variant="outline" onClick={onOpenResetDialog}>
          <RotateCcw className="h-4 w-4" />
          Làm mới chu kỳ từ tuần này
        </Button>
      </div>

      <ExpandableSection
        title="Lối tắt nhanh"
        description="Đi sang Mục tiêu, Nhật ký hoặc bắt đầu một chu kỳ mới chỉ bằng một lần mở."
      >
        <div className="space-y-3">
          <Button className="w-full justify-start bg-white/90" variant="outline" onClick={onNavigateGoals}>
            <Target className="h-4 w-4" />
            Mở Mục tiêu
          </Button>
          <Button className="w-full justify-start bg-white/90" variant="outline" onClick={onNavigateJournal}>
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

import type { ReactNode } from "react";
import { ChevronDown, Flag, RotateCcw, Settings2, Target } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { formatCalendarDate } from "../../utils/storage";
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
  | "onOpenResetDialog"
  | "onNavigateGoals"
  | "onNavigateJournal"
  | "onNavigateSetup"
>;

interface ExpandableSectionProps {
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
}

function ExpandableSection({ title, description, badge, children }: ExpandableSectionProps) {
  return (
    <details className="group rounded-[24px] border border-white/55 bg-white/72 px-5 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
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
  onOpenResetDialog,
  onNavigateGoals,
  onNavigateJournal,
  onNavigateSetup,
}: TwelveWeekDeviceDetailsSectionProps) {
  return (
    <>
      <ExpandableSection
        title="Nhắc việc và quyền trên thiết bị"
        description="Bật tắt nhắc việc, thông báo và dữ liệu chỉ lưu trên thiết bị này."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/65 bg-white/76 px-4 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-950">Nhắc việc trong app</p>
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
              aria-label="Bật tắt nhắc việc trong app"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/65 bg-white/76 px-4 py-4">
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

          <div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/65 bg-white/76 px-4 py-4">
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

          <div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/65 bg-white/76 px-4 py-4">
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
              aria-label="Bật tắt outbox local"
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
            <li key={step.id} className="rounded-[18px] border border-white/70 bg-white/82 px-4 py-4">
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
            <li key={step.id} className="rounded-[18px] border border-white/70 bg-white/82 px-4 py-4">
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
        description="Xuất dữ liệu hoặc xóa dấu vết local mà không đụng vào chu kỳ và review của bạn."
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
          Sẽ xóa nhật ký sự kiện, outbox và trạng thái nhắc việc local. Dữ liệu chu kỳ 12 tuần và nhật ký vẫn được giữ
          nguyên.
        </p>
      </ExpandableSection>

      <ExpandableSection
        title="Outbox, đồng bộ và nhắc việc"
        description="Xem trạng thái đồng bộ, outbox gần đây và những nhắc việc đang chờ mà không phải kéo qua nhiều card rời."
      >
        <div className="grid gap-3">
          <div className="rounded-[24px] border border-sky-200 bg-sky-50/92 p-5">
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

          <div className="rounded-[24px] border border-violet-200 bg-violet-50/92 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Outbox trên thiết bị</p>
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
                Xóa outbox đã lưu
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[24px] border border-white/65 bg-white/76 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Nhắc việc đang hoạt động</p>
              <p className="mt-1 text-sm text-slate-600">Danh sách nhắc việc local đang chờ được hiện.</p>
            </div>
            <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
              {activeReminders.length}
            </Badge>
          </div>
          <div className="mt-3 space-y-2" aria-live="polite">
            {activeReminders.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-slate-300 bg-white/86 px-4 py-4 text-sm text-slate-600">
                Không có nhắc việc nào đang chờ lúc này.
              </div>
            ) : (
              activeReminders.map((reminder) => (
                <div key={reminder.id} className="rounded-[18px] border border-white/70 bg-white/84 p-4">
                  <p className="text-sm font-semibold text-slate-950">{reminder.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{reminder.description}</p>
                  <Button variant="outline" size="sm" className="mt-3 bg-white" onClick={() => onOpenReminder(reminder)}>
                    {getReminderActionLabel(reminder.kind)}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-3 rounded-[24px] border border-white/65 bg-white/76 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Outbox gần đây</p>
              <p className="mt-1 text-sm text-slate-600">3 mục mới nhất đang chờ hoặc đã được lưu lại.</p>
            </div>
            <Badge variant="outline" className="border-slate-300 bg-white text-slate-700">
              {recentOutboxItems.length}
            </Badge>
          </div>
          <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {recentOutboxItems.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-slate-300 bg-white/86 px-4 py-4 text-sm text-slate-600">
                Chưa có mục nào trong outbox trên thiết bị.
              </div>
            ) : (
              recentOutboxItems.map((item) => (
                <div key={item.id} className="rounded-[18px] border border-white/70 bg-white/84 p-4">
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
                  <Button variant="outline" size="sm" className="mt-3 bg-white" onClick={() => onOutboxItemToggle(item)}>
                    {item.status === "pending" ? "Lưu mục này" : "Khôi phục về hàng chờ"}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </ExpandableSection>

      <div className="rounded-[24px] border border-red-300/70 bg-[linear-gradient(180deg,_rgba(254,226,226,0.96)_0%,_rgba(254,242,242,0.92)_100%)] p-5 shadow-[0_20px_45px_-34px_rgba(220,38,38,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Làm mới chu kỳ</p>
        <p className="mt-2 text-sm text-red-900">
          Bắt đầu lại tuần 1 từ tuần hiện tại, giữ nguyên outcome và tactic, nhưng làm mới việc, check-in và review của
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

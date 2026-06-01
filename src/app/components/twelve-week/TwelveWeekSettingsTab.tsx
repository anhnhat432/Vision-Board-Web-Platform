import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Crown,
  Database,
  MessageSquare,
  Settings2,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { SectionBlock } from "@/app/components/layout/SectionBlock";
import { isRealMode } from "../../utils/app-mode";
import { FeedbackDialog } from "../FeedbackDialog";
import { TwelveWeekCycleSettingsPanel } from "./TwelveWeekCycleSettingsPanel";
import {
  TwelveWeekDangerZone,
  TwelveWeekDataSafety,
  TwelveWeekExecutionPreferences,
  TwelveWeekQuickShortcuts,
  TwelveWeekRemindersSettings,
} from "./TwelveWeekDeviceDetailsSection";
import { TwelveWeekLocalStatusSection } from "./TwelveWeekLocalStatusSection";
import { TwelveWeekPlanAccessSection } from "./TwelveWeekPlanAccessSection";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";
import { WeeklyTimeBlocksPanel } from "./WeeklyTimeBlocksPanel";

export function TwelveWeekSettingsTab(props: TwelveWeekSettingsTabProps) {
  return (
    <div className="stack-section pt-4 space-y-8 pb-12">
      {/* 1. Nhịp kế hoạch (Plan Rhythm) */}
      <SectionBlock
        title={
          <span className="flex items-center gap-2 text-app-ink">
            <SlidersHorizontal className="h-5 w-5 text-emerald-500" />
            Nhịp kế hoạch
            <span className="sr-only">Cài đặt mục tiêu</span>
          </span>
        }
        description="Điều chỉnh chu kỳ 12 tuần, ngày review, mức tải, sắp xếp tactics và lịch tuần tham chiếu."
      >
        <TwelveWeekCycleSettingsPanel
          system={props.system}
          onReviewDayChange={props.onReviewDayChange}
          onReminderTimeChange={props.onReminderTimeChange}
          onLoadPreferenceChange={props.onLoadPreferenceChange}
          onStatusChange={props.onStatusChange}
          onTacticPriorityChange={props.onTacticPriorityChange}
          onTacticTypeChange={props.onTacticTypeChange}
        />
        <div className="mt-6 border-t border-app-line pt-6">
          <p className="text-sm font-semibold text-app-ink mb-3 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-sky-500" />
            Lịch tuần tham chiếu
          </p>
          <WeeklyTimeBlocksPanel value={props.system.weeklyTimeBlocks ?? []} onChange={props.onTimeBlocksChange} />
        </div>
      </SectionBlock>

      {/* 2. Đăng ký & Quyền truy cập (Billing & Access) - Chỉ hiển thị trong Real Mode */}
      {isRealMode() && (
        <SectionBlock
          title={
            <span className="flex items-center gap-2 text-app-ink">
              <Crown className="h-5 w-5 text-amber-500" />
              Đăng ký & Quyền truy cập
            </span>
          }
          description="Quản lý gói dịch vụ Plus, khôi phục quyền truy cập hoặc đồng bộ hóa trạng thái tài khoản."
        >
          <TwelveWeekPlanAccessSection
            currentPlanCode={props.currentPlanCode}
            entitlementKeys={props.entitlementKeys}
            billingProviderStatus={props.billingProviderStatus}
            lastEntitlementSyncSnapshot={props.lastEntitlementSyncSnapshot}
            lastRestoreAccessSnapshot={props.lastRestoreAccessSnapshot}
            isSyncingEntitlements={props.isSyncingEntitlements}
            isRestoringPlanAccess={props.isRestoringPlanAccess}
            onOpenUpgradePlan={props.onOpenUpgradePlan}
            onSyncEntitlements={props.onSyncEntitlements}
            onRestorePlanAccess={props.onRestorePlanAccess}
            onOpenBillingPortal={props.onOpenBillingPortal}
          />
        </SectionBlock>
      )}

      {/* 3. Nhắc nhở & Thiết bị (Reminders) */}
      <SectionBlock
        title={
          <span className="flex items-center gap-2 text-app-ink">
            <Bell className="h-5 w-5 text-sky-500" />
            Nhắc nhở & Thiết bị
          </span>
        }
        description="Cấu hình thông báo trình duyệt, push notification ngoài ứng dụng và theo dõi nhắc nhở đang hoạt động."
      >
        <TwelveWeekRemindersSettings
          appPreferences={props.appPreferences}
          browserNotificationStatus={props.browserNotificationStatus}
          onPreferenceToggle={props.onPreferenceToggle}
          onBrowserNotificationToggle={props.onBrowserNotificationToggle}
          activeReminders={props.activeReminders}
          onOpenReminder={props.onOpenReminder}
        />
      </SectionBlock>

      {/* 4. Tùy chọn thực thi (Execution Preferences) */}
      <SectionBlock
        title={
          <span className="flex items-center gap-2 text-app-ink">
            <Settings2 className="h-5 w-5 text-purple-500" />
            Tùy chọn thực thi
          </span>
        }
        description="Tinh chỉnh hành vi ứng dụng và theo dõi hành trình thực hiện mục tiêu trên thiết bị này."
      >
        <TwelveWeekExecutionPreferences
          appPreferences={props.appPreferences}
          funnelSteps={props.funnelSteps}
          monetizationSteps={props.monetizationSteps}
          onPreferenceToggle={props.onPreferenceToggle}
        />
      </SectionBlock>

      {/* 5. Đồng bộ & An toàn dữ liệu (Sync & Data Safety) */}
      <SectionBlock
        title={
          <span className="flex items-center gap-2 text-app-ink">
            <Database className="h-5 w-5 text-indigo-500" />
            Đồng bộ & An toàn dữ liệu
          </span>
        }
        description="Kiểm tra đồng bộ đám mây, sao lưu dữ liệu thiết bị và quản lý hàng chờ gửi."
      >
        <TwelveWeekLocalStatusSection
          activeGoalId={props.activeGoalId}
          appPreferences={props.appPreferences}
          backendConnectionStatus={props.backendConnectionStatus}
          isHydratingBackendPlans={props.isHydratingBackendPlans}
          isResolvingBackendPlanConflicts={props.isResolvingBackendPlanConflicts}
          lastBackendHydrationResult={props.lastBackendHydrationResult}
          mutationQueueSyncStatus={props.mutationQueueSyncStatus}
          onExportLocalData={props.onExportLocalData}
          onExportCloudWorkspace={props.onExportCloudWorkspace}
          onDeleteCloudWorkspace={props.onDeleteCloudWorkspace}
          onHydrateBackendPlans={props.onHydrateBackendPlans}
          onRunMutationQueueSync={props.onRunMutationQueueSync}
          onKeepLocalPlanForConflicts={props.onKeepLocalPlanForConflicts}
          onUseBackendPlanForConflicts={props.onUseBackendPlanForConflicts}
          onUseCloudVersion={props.onUseCloudVersion}
          pendingOutboxCount={props.pendingOutboxCount}
        />
        <div className="mt-6 border-t border-app-line pt-6">
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
        </div>
      </SectionBlock>

      {/* 6. Lối tắt nhanh & Vùng nguy hiểm */}
      <div className="grid gap-6 md:grid-cols-2 items-start">
        <SectionBlock
          title={
            <span className="flex items-center gap-2 text-app-ink">
              <Zap className="h-5 w-5 text-amber-500" />
              Lối tắt nhanh
            </span>
          }
          description="Chuyển nhanh sang các màn hình liên quan của chu kỳ 12 tuần."
        >
          <TwelveWeekQuickShortcuts
            onNavigateGoals={props.onNavigateGoals}
            onNavigateJournal={props.onNavigateJournal}
            onNavigateSetup={props.onNavigateSetup}
          />
        </SectionBlock>

        <SectionBlock
          title={
            <span className="flex items-center gap-2 text-app-warm">
              <AlertTriangle className="h-5 w-5 text-app-warm" />
              Vùng nguy hiểm
            </span>
          }
          description="Các hành động thay đổi hoặc xóa dữ liệu vĩnh viễn."
        >
          <TwelveWeekDangerZone
            backendConnectionStatus={props.backendConnectionStatus}
            onOpenResetDialog={props.onOpenResetDialog}
            onOpenClearLocalDialog={props.onOpenClearLocalDialog}
            onOpenDeleteDataDialog={props.onOpenDeleteDataDialog}
            onDeleteCloudWorkspace={props.onDeleteCloudWorkspace}
          />
        </SectionBlock>
      </div>

      {/* Góp ý */}
      <SectionBlock
        title={
          <span className="flex items-center gap-2 text-app-ink">
            <MessageSquare className="h-5 w-5 text-emerald-500" />
            Góp ý
          </span>
        }
        description="Gửi phản hồi để cải thiện trải nghiệm 12 tuần."
      >
        <div className="flex justify-end pt-2">
          <FeedbackDialog
            source="settings"
            context="12_week_settings"
            triggerLabel="Góp ý"
            triggerClassName="border-amber-300 bg-amber-50/50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 font-semibold shadow-sm transition-all duration-200 rounded-xl px-4 py-2"
          />
        </div>
      </SectionBlock>
    </div>
  );
}

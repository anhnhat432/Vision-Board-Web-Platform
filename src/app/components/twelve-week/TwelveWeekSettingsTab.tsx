import type { ReactNode } from "react";
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

function SettingsGroup({
  id,
  title,
  description,
  children,
  warning = false,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  warning?: boolean;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`rounded-card border bg-app-surface p-4 sm:p-6 ${
        warning ? "border-app-status-warning/30" : "border-app-line"
      }`}
    >
      <h2 id={id} className="font-serif text-xl font-bold text-app-ink">
        {title}
      </h2>
      <p className="mt-1 max-w-[65ch] text-[15px] leading-relaxed text-app-ink-soft">{description}</p>
      <div className="mt-5 min-w-0 space-y-5">{children}</div>
    </section>
  );
}

export function TwelveWeekSettingsTab(props: TwelveWeekSettingsTabProps) {
  return (
    <div className="min-w-0 space-y-5 pb-12 pt-1">
      <SettingsGroup
        id="cycle-settings-heading"
        title="Chu kỳ"
        description="Điều chỉnh ngày review, mức tải, trạng thái chu kỳ và lịch tuần tham chiếu."
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

        <div className="border-t border-app-line pt-5">
          <h3 className="text-[15px] font-semibold text-app-ink">Lịch tuần tham chiếu</h3>
          <p className="mt-1 text-sm leading-relaxed text-app-ink-soft">
            Giữ các khung thời gian quan trọng của tuần ở cùng một nơi với nhịp thực thi.
          </p>
          <div className="mt-4">
            <WeeklyTimeBlocksPanel value={props.system.weeklyTimeBlocks ?? []} onChange={props.onTimeBlocksChange} />
          </div>
        </div>

        <div className="border-t border-app-line pt-5">
          <TwelveWeekExecutionPreferences
            appPreferences={props.appPreferences}
            funnelSteps={props.funnelSteps}
            monetizationSteps={props.monetizationSteps}
            onPreferenceToggle={props.onPreferenceToggle}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup
        id="sync-settings-heading"
        title="Nhắc nhở và đồng bộ"
        description="Quản lý nhắc việc, quyền truy cập và trạng thái an toàn của bản sao trên tài khoản."
      >
        {isRealMode() ? (
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
        ) : null}

        <div className={isRealMode() ? "border-t border-app-line pt-5" : undefined}>
          <TwelveWeekRemindersSettings
            appPreferences={props.appPreferences}
            browserNotificationStatus={props.browserNotificationStatus}
            onPreferenceToggle={props.onPreferenceToggle}
            onBrowserNotificationToggle={props.onBrowserNotificationToggle}
            activeReminders={props.activeReminders}
            onOpenReminder={props.onOpenReminder}
          />
        </div>

        <div className="border-t border-app-line pt-5">
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
            onHydrateBackendPlans={props.onHydrateBackendPlans}
            onRunMutationQueueSync={props.onRunMutationQueueSync}
            onKeepLocalPlanForConflicts={props.onKeepLocalPlanForConflicts}
            onUseBackendPlanForConflicts={props.onUseBackendPlanForConflicts}
            onUseCloudVersion={props.onUseCloudVersion}
            pendingOutboxCount={props.pendingOutboxCount}
          />
        </div>
      </SettingsGroup>

      <SettingsGroup
        id="danger-settings-heading"
        title="Dữ liệu và nguy hiểm"
        description="Xuất bản sao trước khi dọn dữ liệu, làm mới chu kỳ hoặc xóa tài khoản."
        warning
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

        <div className="border-t border-app-status-warning/20 pt-5">
          <TwelveWeekDangerZone
            backendConnectionStatus={props.backendConnectionStatus}
            onOpenResetDialog={props.onOpenResetDialog}
            onOpenClearLocalDialog={props.onOpenClearLocalDialog}
            onOpenDeleteDataDialog={props.onOpenDeleteDataDialog}
            onDeleteCloudWorkspace={props.onDeleteCloudWorkspace}
          />
        </div>
      </SettingsGroup>

      <div className="grid gap-4 rounded-card border border-app-line bg-app-surface p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-app-ink">Lối tắt nhanh</p>
          <p className="mt-1 text-sm leading-relaxed text-app-ink-soft">
            Chuyển tới mục tiêu, nhật ký hoặc setup mà không rời nhịp làm việc.
          </p>
          <div className="mt-4">
            <TwelveWeekQuickShortcuts
              onNavigateGoals={props.onNavigateGoals}
              onNavigateJournal={props.onNavigateJournal}
              onNavigateSetup={props.onNavigateSetup}
            />
          </div>
        </div>

        <div className="md:pb-0.5">
          <FeedbackDialog
            source="settings"
            context="12_week_settings"
            triggerLabel="Góp ý"
            triggerClassName="min-h-11 rounded-control border-app-status-warning/30 bg-app-status-warning/10 px-4 font-semibold text-app-status-warning hover:bg-app-status-warning/20"
          />
        </div>
      </div>
    </div>
  );
}

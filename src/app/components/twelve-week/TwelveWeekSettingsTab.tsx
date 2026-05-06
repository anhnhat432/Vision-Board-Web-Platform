import { FeedbackDialog } from "../FeedbackDialog";
import { FunnelDiagnosticsPanel } from "./FunnelDiagnosticsPanel";
import { TwelveWeekCycleSettingsPanel } from "./TwelveWeekCycleSettingsPanel";
import { TwelveWeekDeviceAndSyncPanel } from "./TwelveWeekDeviceAndSyncPanel";
import { SectionBlock } from "@/app/components/layout/SectionBlock";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";

export function TwelveWeekSettingsTab(props: TwelveWeekSettingsTabProps) {
  return (
    <div className="space-y-6 pt-4">
      <SectionBlock title="Cài đặt mục tiêu" description="Tên mục tiêu, chu kỳ 12 tuần, ngày review, thời gian nhắc nhở">
        <TwelveWeekCycleSettingsPanel
          system={props.system}
          onReviewDayChange={props.onReviewDayChange}
          onReminderTimeChange={props.onReminderTimeChange}
          onLoadPreferenceChange={props.onLoadPreferenceChange}
          onStatusChange={props.onStatusChange}
          onTacticPriorityChange={props.onTacticPriorityChange}
          onTacticTypeChange={props.onTacticTypeChange}
        />
      </SectionBlock>

      <SectionBlock title="Đồng bộ, Dữ liệu & Thiết bị" description="Trạng thái kết nối, đồng bộ cloud, thông tin thiết bị, xuất dữ liệu và cài đặt cục bộ">
        <TwelveWeekDeviceAndSyncPanel
          activeGoalId={props.activeGoalId}
          backendConnectionStatus={props.backendConnectionStatus}
          currentPlanCode={props.currentPlanCode}
          entitlementKeys={props.entitlementKeys}
          billingProviderStatus={props.billingProviderStatus}
          lastEntitlementSyncSnapshot={props.lastEntitlementSyncSnapshot}
          lastRestoreAccessSnapshot={props.lastRestoreAccessSnapshot}
          lastBackendHydrationResult={props.lastBackendHydrationResult}
          appPreferences={props.appPreferences}
          funnelSteps={props.funnelSteps}
          monetizationSteps={props.monetizationSteps}
          browserNotificationStatus={props.browserNotificationStatus}
          lastSyncSnapshot={props.lastSyncSnapshot}
          pendingOutboxCount={props.pendingOutboxCount}
          archivedOutboxCount={props.archivedOutboxCount}
          eventCount={props.eventCount}
          activeReminders={props.activeReminders}
          recentOutboxItems={props.recentOutboxItems}
          isSyncingEntitlements={props.isSyncingEntitlements}
          isRestoringPlanAccess={props.isRestoringPlanAccess}
          isHydratingBackendPlans={props.isHydratingBackendPlans}
          isResolvingBackendPlanConflicts={props.isResolvingBackendPlanConflicts}
          mutationQueueSyncStatus={props.mutationQueueSyncStatus}
          onPreferenceToggle={props.onPreferenceToggle}
          onArchivePendingOutbox={props.onArchivePendingOutbox}
          onRestoreArchivedOutbox={props.onRestoreArchivedOutbox}
          onOpenReminder={props.onOpenReminder}
          onExportLocalData={props.onExportLocalData}
          onExportCloudWorkspace={props.onExportCloudWorkspace}
          onDeleteCloudWorkspace={props.onDeleteCloudWorkspace}
          onBrowserNotificationToggle={props.onBrowserNotificationToggle}
          onRunOutboxSync={props.onRunOutboxSync}
          onOutboxItemToggle={props.onOutboxItemToggle}
          onClearEventLog={props.onClearEventLog}
          onClearArchivedOutbox={props.onClearArchivedOutbox}
          onOpenClearLocalDialog={props.onOpenClearLocalDialog}
          onDeleteAllData={props.onDeleteAllData}
          onOpenResetDialog={props.onOpenResetDialog}
          onOpenUpgradePlan={props.onOpenUpgradePlan}
          onSyncEntitlements={props.onSyncEntitlements}
          onRestorePlanAccess={props.onRestorePlanAccess}
          onHydrateBackendPlans={props.onHydrateBackendPlans}
          onRunMutationQueueSync={props.onRunMutationQueueSync}
          onKeepLocalPlanForConflicts={props.onKeepLocalPlanForConflicts}
          onUseBackendPlanForConflicts={props.onUseBackendPlanForConflicts}
          onUseCloudVersion={props.onUseCloudVersion}
          onOpenBillingPortal={props.onOpenBillingPortal}
          onNavigateGoals={props.onNavigateGoals}
          onNavigateJournal={props.onNavigateJournal}
          onNavigateSetup={props.onNavigateSetup}
        />
      </SectionBlock>

      <SectionBlock title="Chẩn đoán & Góp ý" description="Thông tin chẩn đoán nội bộ và gửi feedback">
        <FunnelDiagnosticsPanel />
        <div className="flex justify-end pt-4">
          <FeedbackDialog
            source="settings"
            context="12_week_settings"
            triggerLabel="Góp ý về demo"
            triggerClassName="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          />
        </div>
      </SectionBlock>
    </div>
  );
}

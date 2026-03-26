import { TwelveWeekCycleSettingsPanel } from "./TwelveWeekCycleSettingsPanel";
import { TwelveWeekDeviceAndSyncPanel } from "./TwelveWeekDeviceAndSyncPanel";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";

export function TwelveWeekSettingsTab(props: TwelveWeekSettingsTabProps) {
  return (
    <div className="space-y-6 pt-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <TwelveWeekCycleSettingsPanel
          system={props.system}
          onReviewDayChange={props.onReviewDayChange}
          onReminderTimeChange={props.onReminderTimeChange}
          onLoadPreferenceChange={props.onLoadPreferenceChange}
          onStatusChange={props.onStatusChange}
          onTacticPriorityChange={props.onTacticPriorityChange}
          onTacticTypeChange={props.onTacticTypeChange}
        />
        <TwelveWeekDeviceAndSyncPanel
          currentPlanCode={props.currentPlanCode}
          entitlementKeys={props.entitlementKeys}
          billingProviderStatus={props.billingProviderStatus}
          lastEntitlementSyncSnapshot={props.lastEntitlementSyncSnapshot}
          lastRestoreAccessSnapshot={props.lastRestoreAccessSnapshot}
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
          onPreferenceToggle={props.onPreferenceToggle}
          onArchivePendingOutbox={props.onArchivePendingOutbox}
          onRestoreArchivedOutbox={props.onRestoreArchivedOutbox}
          onOpenReminder={props.onOpenReminder}
          onExportLocalData={props.onExportLocalData}
          onBrowserNotificationToggle={props.onBrowserNotificationToggle}
          onRunOutboxSync={props.onRunOutboxSync}
          onOutboxItemToggle={props.onOutboxItemToggle}
          onClearEventLog={props.onClearEventLog}
          onClearArchivedOutbox={props.onClearArchivedOutbox}
          onOpenClearLocalDialog={props.onOpenClearLocalDialog}
          onOpenResetDialog={props.onOpenResetDialog}
          onOpenUpgradePlan={props.onOpenUpgradePlan}
          onSyncEntitlements={props.onSyncEntitlements}
          onRestorePlanAccess={props.onRestorePlanAccess}
          onOpenBillingPortal={props.onOpenBillingPortal}
          onNavigateGoals={props.onNavigateGoals}
          onNavigateJournal={props.onNavigateJournal}
          onNavigateSetup={props.onNavigateSetup}
        />
      </div>
    </div>
  );
}

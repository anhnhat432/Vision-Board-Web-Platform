import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { TwelveWeekDeviceDetailsSection } from "./TwelveWeekDeviceDetailsSection";
import { TwelveWeekLocalStatusSection } from "./TwelveWeekLocalStatusSection";
import { TwelveWeekPlanAccessSection } from "./TwelveWeekPlanAccessSection";
import type { TwelveWeekSettingsTabProps } from "./TwelveWeekSettingsShared";

type TwelveWeekDeviceAndSyncPanelProps = Omit<
  TwelveWeekSettingsTabProps,
  | "system"
  | "onReviewDayChange"
  | "onReminderTimeChange"
  | "onLoadPreferenceChange"
  | "onStatusChange"
  | "onTacticPriorityChange"
  | "onTacticTypeChange"
>;

export function TwelveWeekDeviceAndSyncPanel(props: TwelveWeekDeviceAndSyncPanelProps) {
  return (
    <Card
      interactive={false}
      className="border border-slate-200/80 bg-slate-50/80 shadow-[0_22px_54px_-40px_rgba(15,23,42,0.24)] lg:sticky lg:top-6"
    >
      <CardHeader>
        <CardTitle className="text-slate-950">Thiết bị, dữ liệu và đồng bộ</CardTitle>
        <CardDescription className="text-slate-600">
          Bản demo lưu trên trình duyệt này. Export dữ liệu nếu muốn giữ bản sao; đăng nhập và sync chỉ là lớp sau.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <TwelveWeekLocalStatusSection
          activeGoalId={props.activeGoalId}
          appPreferences={props.appPreferences}
          backendConnectionStatus={props.backendConnectionStatus}
          isHydratingBackendPlans={props.isHydratingBackendPlans}
          isResolvingBackendPlanConflicts={props.isResolvingBackendPlanConflicts}
          lastBackendHydrationResult={props.lastBackendHydrationResult}
          mutationQueueSyncStatus={props.mutationQueueSyncStatus}
          onExportLocalData={props.onExportLocalData}
          onHydrateBackendPlans={props.onHydrateBackendPlans}
          onRunMutationQueueSync={props.onRunMutationQueueSync}
          onKeepLocalPlanForConflicts={props.onKeepLocalPlanForConflicts}
          onUseBackendPlanForConflicts={props.onUseBackendPlanForConflicts}
          onUseCloudVersion={props.onUseCloudVersion}
          pendingOutboxCount={props.pendingOutboxCount}
        />

        <TwelveWeekDeviceDetailsSection
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
          onDeleteAllData={props.onDeleteAllData}
          onOpenResetDialog={props.onOpenResetDialog}
          onNavigateGoals={props.onNavigateGoals}
          onNavigateJournal={props.onNavigateJournal}
          onNavigateSetup={props.onNavigateSetup}
        />
      </CardContent>
    </Card>
  );
}

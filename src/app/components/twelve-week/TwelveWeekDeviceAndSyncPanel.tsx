import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { shouldShowSyncDebugUi } from "../../utils/app-mode";
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
  const syncResultStatus = props.mutationQueueSyncStatus.lastResult?.status;
  const hasSyncAttention =
    (props.lastBackendHydrationResult?.conflictCount ?? 0) > 0 ||
    syncResultStatus === "conflict" ||
    syncResultStatus === "unsafe";
  const showAdvancedSync = shouldShowSyncDebugUi() || hasSyncAttention;
  const storageDescription = props.backendConnectionStatus.signedIn
    ? "Quản lý quyền Plus, nhắc việc và dữ liệu tài khoản. Bản trên thiết bị vẫn được giữ để dùng khi mất mạng và đồng bộ an toàn."
    : "Quản lý quyền Plus, nhắc việc và dữ liệu đang lưu trên trình duyệt này. Các thao tác xóa đều cần xác nhận.";

  return (
    <Card className="border border-slate-200/80 bg-slate-50/80 shadow-sm lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle className="text-slate-950">Dữ liệu, nhắc việc và quyền Plus</CardTitle>
        <CardDescription className="text-slate-600">{storageDescription}</CardDescription>
      </CardHeader>
      <CardContent className="stack-stack">
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

        {showAdvancedSync ? (
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
        ) : null}

        <TwelveWeekDeviceDetailsSection
          appPreferences={props.appPreferences}
          backendConnectionStatus={props.backendConnectionStatus}
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
          onOpenDeleteDataDialog={props.onOpenDeleteDataDialog}
          onOpenResetDialog={props.onOpenResetDialog}
          onNavigateGoals={props.onNavigateGoals}
          onNavigateJournal={props.onNavigateJournal}
          onNavigateSetup={props.onNavigateSetup}
        />
      </CardContent>
    </Card>
  );
}

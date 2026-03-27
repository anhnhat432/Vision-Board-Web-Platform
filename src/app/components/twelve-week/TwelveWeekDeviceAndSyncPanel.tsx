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
      className="border-0 gradient-shell shadow-[0_30px_70px_-40px_rgba(15,23,42,0.16)] lg:sticky lg:top-6"
    >
      <CardHeader>
        <CardTitle className="text-slate-950">Thiết bị, dữ liệu và đồng bộ</CardTitle>
        <CardDescription className="text-slate-600">
          Gom các phần liên quan đến thiết bị này vào một cột để dễ nhìn hơn khi dùng trên web.
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
          appPreferences={props.appPreferences}
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

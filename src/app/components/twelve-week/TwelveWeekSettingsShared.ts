import type { BrowserNotificationStatus, OutboxSyncSnapshot } from "../../utils/production";
import type { BillingActionSnapshot, BillingProviderStatus } from "../../utils/billing-contract";
import type {
  AppPreferences,
  EntitlementKey,
  FunnelStepSummary,
  InAppReminder,
  PricingPlanCode,
  SyncOutboxItem,
  TwelveWeekSystem,
} from "../../utils/storage-types";

export interface TwelveWeekSettingsTabProps {
  system: TwelveWeekSystem;
  currentPlanCode: PricingPlanCode;
  entitlementKeys: EntitlementKey[];
  billingProviderStatus: BillingProviderStatus;
  lastEntitlementSyncSnapshot: BillingActionSnapshot | null;
  lastRestoreAccessSnapshot: BillingActionSnapshot | null;
  appPreferences: AppPreferences;
  funnelSteps: FunnelStepSummary[];
  monetizationSteps: FunnelStepSummary[];
  browserNotificationStatus: BrowserNotificationStatus;
  lastSyncSnapshot: OutboxSyncSnapshot | null;
  pendingOutboxCount: number;
  archivedOutboxCount: number;
  eventCount: number;
  activeReminders: InAppReminder[];
  recentOutboxItems: SyncOutboxItem[];
  isSyncingEntitlements: boolean;
  isRestoringPlanAccess: boolean;
  onReviewDayChange: (value: string) => void;
  onReminderTimeChange: (value: string) => void;
  onLoadPreferenceChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTacticPriorityChange: (tacticId: string | undefined, value: string) => void;
  onTacticTypeChange: (tacticId: string | undefined, value: string) => void;
  onPreferenceToggle: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => void;
  onArchivePendingOutbox: () => void;
  onRestoreArchivedOutbox: () => void;
  onOpenReminder: (reminder: InAppReminder) => void;
  onExportLocalData: () => void;
  onBrowserNotificationToggle: (value: boolean) => void;
  onRunOutboxSync: () => void;
  onOutboxItemToggle: (item: SyncOutboxItem) => void;
  onClearEventLog: () => void;
  onClearArchivedOutbox: () => void;
  onOpenClearLocalDialog: () => void;
  onDeleteAllData: () => void;
  onOpenResetDialog: () => void;
  onOpenUpgradePlan: (planCode: Exclude<PricingPlanCode, "FREE">) => void;
  onSyncEntitlements: () => void;
  onRestorePlanAccess: () => void;
  onOpenBillingPortal: () => void;
  onNavigateGoals: () => void;
  onNavigateJournal: () => void;
  onNavigateSetup: () => void;
}

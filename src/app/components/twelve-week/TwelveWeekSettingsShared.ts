import type { BrowserNotificationStatus, OutboxSyncSnapshot } from "../../utils/production";
import type { BackendPlanHydrationResult } from "../../hooks/useBackendPlanHydration";
import type { BillingActionSnapshot, BillingProviderStatus } from "../../utils/billing-contract";
import type { TwelveWeekManualCloudSyncResult } from "@/features/plan12week/hooks/useTwelveWeekManualCloudSync";
import type { DataMutationQueueStoreSummary } from "@/features/plan12week/persistence/mutationQueue";
import type {
  AppPreferences,
  EntitlementKey,
  FunnelStepSummary,
  InAppReminder,
  PricingPlanCode,
  SyncOutboxItem,
  TwelveWeekSystem,
} from "../../utils/storage-types";

export interface BackendConnectionStatus {
  authConfigured: boolean;
  authLoading: boolean;
  signedIn: boolean;
  profileReady: boolean;
  displayName: string | null;
  email: string | null;
  syncing: boolean;
  syncStatus: "idle" | "syncing" | "success" | "partial" | "error";
  lastSyncedAt: string | null;
  syncMessage: string | null;
  failedSyncCount: number;
}

export interface MutationQueueManualSyncStatus {
  realMode: boolean;
  featureEnabled: boolean;
  pullFeatureEnabled: boolean;
  apiConfigured: boolean;
  loading: boolean;
  lastResult: TwelveWeekManualCloudSyncResult | null;
  queueSummary: DataMutationQueueStoreSummary;
  /** Browser network status: online, offline, or unknown. */
  networkStatus: "online" | "offline" | "unknown";
  /** Whether reconnect-retry is enabled for this session. */
  retryOnReconnectEnabled: boolean;
}

export interface TwelveWeekSettingsTabProps {
  system: TwelveWeekSystem;
  backendConnectionStatus: BackendConnectionStatus;
  currentPlanCode: PricingPlanCode;
  entitlementKeys: EntitlementKey[];
  billingProviderStatus: BillingProviderStatus;
  lastEntitlementSyncSnapshot: BillingActionSnapshot | null;
  lastRestoreAccessSnapshot: BillingActionSnapshot | null;
  lastBackendHydrationResult: BackendPlanHydrationResult | null;
  activeGoalId: string;
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
  isHydratingBackendPlans: boolean;
  isResolvingBackendPlanConflicts: boolean;
  mutationQueueSyncStatus: MutationQueueManualSyncStatus;
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
  onExportCloudWorkspace: () => void;
  onDeleteCloudWorkspace: () => void;
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
  onHydrateBackendPlans: () => void;
  onRunMutationQueueSync: () => void;
  onUseBackendPlanForConflicts: (goalId: string) => void;
  onKeepLocalPlanForConflicts: (goalId: string) => void;
  onUseCloudVersion: () => void;
  onOpenBillingPortal: () => void;
  onNavigateGoals: () => void;
  onNavigateJournal: () => void;
  onNavigateSetup: () => void;
}

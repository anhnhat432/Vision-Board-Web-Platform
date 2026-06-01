import { Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { DataStorageInfo } from "@/app/components/DataStorageInfo";
import { TabErrorBoundary } from "@/app/components/TabErrorBoundary";
import { DeleteCloudWorkspaceDialog } from "@/app/components/twelve-week/DeleteCloudWorkspaceDialog";
import { DeleteDataConfirmationDialog } from "@/app/components/twelve-week/DeleteDataConfirmationDialog";
import { UpgradePaywallDialog } from "@/app/components/UpgradePaywallDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { useNetworkStatus } from "@/app/hooks/useNetworkStatus";
import { useTwelveWeekSystemSnapshot } from "@/app/hooks/useTwelveWeekSystemSnapshot";
import {
  isDemoMode,
  isRealMode,
  shouldEnable12WeekMutationSync,
  shouldEnable12WeekPullSync,
} from "@/app/utils/app-mode";
import { clearArchivedOutbox, clearEventLog, updateGoal } from "@/app/utils/storage";
import { buildDerivedScoreboard, getDefaultScoreboard } from "@/app/utils/storage-twelve-week";
import type { TwelveWeekSystem as TwelveWeekSystemModel } from "@/app/utils/storage-types";
import { usePlanExecutionSync } from "@/features/plan12week/hooks";
import { readMutationQueueStore, summarizeMutationQueueStore } from "@/features/plan12week/persistence/mutationQueue";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { TwelveWeekTabFallback } from "./12WeekSystem/components";
import { WeekEditor } from "./12WeekSystem/lazyTabs";
import { useTwelveWeekBackendActions } from "./12WeekSystem/useTwelveWeekBackendActions";
import { useTwelveWeekBillingActions } from "./12WeekSystem/useTwelveWeekBillingActions";
import { useTwelveWeekSettingsActions } from "./12WeekSystem/useTwelveWeekSettingsActions";

const emptyMutationQueueSummary = {
  totalCount: 0,
  pendingCount: 0,
  inFlightCount: 0,
  failedOrRetryableCount: 0,
  succeededCount: 0,
  lastDrainStartedAt: null,
  lastDrainFinishedAt: null,
};

export function TwelveWeekSystemSettings() {
  const navigate = useNavigate();
  const { authLoading, isConfigured: isAuthConfigured, user, userProfile } = useAuthContext();
  const {
    isReady,
    activeGoal,
    system,
    activePlanCode,
    activeEntitlementKeys,
    appPreferences,
    browserNotificationStatus,
    setBrowserNotificationStatus,
    lastSyncSnapshot,
    lastEntitlementSyncSnapshot,
    lastRestoreAccessSnapshot,
    pendingOutboxCount,
    archivedOutboxCount,
    eventCount,
    activeReminders,
    recentOutboxItems,
    funnelSteps,
    monetizationSteps,
    billingProviderStatus,
    refreshSnapshotMeta,
    loadGoalData,
  } = useTwelveWeekSystemSnapshot();

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isClearLocalDialogOpen, setIsClearLocalDialogOpen] = useState(false);
  const [isDeleteDataDialogOpen, setIsDeleteDataDialogOpen] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const demoMode = isDemoMode();

  const activeGoalIdRef = useRef<string | null>(activeGoal?.id ?? null);
  useEffect(() => {
    activeGoalIdRef.current = activeGoal?.id ?? null;
  }, [activeGoal?.id]);

  const networkStatusInfo = useNetworkStatus();

  const {
    loading: isBackendSyncing,
    error: backendSyncError,
    data: backendSyncData,
    actions: executionSyncActions,
  } = usePlanExecutionSync({
    goalId: activeGoal?.id ?? null,
    system,
    enabled: Boolean(userProfile),
  });

  const backendConnectionStatus = {
    authConfigured: isAuthConfigured,
    authLoading,
    signedIn: Boolean(user),
    profileReady: Boolean(userProfile),
    displayName: userProfile?.displayName || user?.displayName || null,
    email: userProfile?.email || user?.email || null,
    syncing: isBackendSyncing,
    syncStatus: backendSyncError
      ? "error"
      : isBackendSyncing
        ? "syncing"
        : (backendSyncData.lastSnapshot?.status ?? "idle"),
    lastSyncedAt: backendSyncData.lastSnapshot?.at ?? null,
    syncMessage: backendSyncError?.message ?? backendSyncData.lastSnapshot?.message ?? null,
    failedSyncCount: backendSyncData.lastSnapshot?.failedCount ?? 0,
  } as const;

  const mutationQueueRealMode = isRealMode();
  const mutationQueueSummary = mutationQueueRealMode
    ? summarizeMutationQueueStore(readMutationQueueStore(user?.uid ?? null))
    : emptyMutationQueueSummary;
  const mutationQueueSyncStatus = {
    realMode: mutationQueueRealMode,
    featureEnabled: shouldEnable12WeekMutationSync(),
    pullFeatureEnabled: shouldEnable12WeekPullSync(),
    apiConfigured: isApiBaseUrlConfigured(),
    loading: false,
    lastResult: null,
    queueSummary: mutationQueueSummary,
    networkStatus: networkStatusInfo.status,
    retryOnReconnectEnabled: false,
  };

  const isHydratingBackendPlans = false;
  const isResolvingBackendPlanConflicts = false;
  const lastBackendHydrationResult = null;

  const commitSystemUpdate = (nextSystem: TwelveWeekSystemModel) => {
    const normalizedNextSystem = {
      ...nextSystem,
      scoreboard: buildDerivedScoreboard(nextSystem, getDefaultScoreboard(nextSystem.totalWeeks)),
    };
    if (!activeGoal) return normalizedNextSystem;
    updateGoal(activeGoal.id, { twelveWeekSystem: normalizedNextSystem });
    return normalizedNextSystem;
  };

  const {
    isUpgradeDialogOpen,
    setIsUpgradeDialogOpen,
    upgradeContext,
    upgradeRecommendedPlan,
    isSyncingEntitlements,
    isRestoringPlanAccess,
    handleOpenUpgradeDialog,
    handleCheckoutComplete,
    handleRestorePlanAccess,
    handleSyncEntitlements,
    handleOpenBillingPortal,
  } = useTwelveWeekBillingActions({
    activeGoalId: activeGoal?.id ?? null,
    activeGoalIdRef,
    activeTab: "settings",
    activePlanCode,
    refreshSnapshotMeta,
  });

  const {
    handleRunOutboxSync,
    handleHydrateBackendPlans,
    handleUseBackendPlanForConflicts,
    handleKeepLocalPlanForConflicts,
  } = useTwelveWeekBackendActions({
    activeGoal,
    system,
    isBackendProfileReady: Boolean(userProfile),
    executionSyncActions,
    activeGoalIdRef,
    lastBackendSyncKeyRef: { current: null },
    setLastSyncSnapshot: () => {},
    loadGoalData,
    refreshBackendProgressOverlay: () => {},
    refreshSnapshotMeta,
  });

  const {
    handleReviewDayChange,
    handleReminderTimeChange,
    handleLoadPreferenceChange,
    handleStatusChange,
    handleTacticPriorityChange,
    handleTacticTypeChange,
    handleTimeBlocksChange,
    handlePreferenceToggle,
    handleArchivePendingOutbox,
    handleRestoreArchivedOutbox,
    handleOpenReminder,
    handleExportLocalData,
    handleExportCloudWorkspace,
    handleDeleteCloudWorkspace,
    handleBrowserNotificationToggle,
    handleOutboxItemToggle,
    handleClearLocalSignals,
    handleDeleteAllData,
    handleOpenDeleteDataDialog,
    handleResetCycle,
    isDeleteCloudDialogOpen,
    setIsDeleteCloudDialogOpen,
    handleConfirmDeleteCloudWorkspace,
  } = useTwelveWeekSettingsActions({
    activeGoal,
    system,
    activeGoalIdRef,
    commitSystemUpdate,
    refreshSnapshotMeta,
    loadGoalData,
    handleTabChange: () => {},
    setActiveTab: () => {},
    setBrowserNotificationStatus,
    setIsClearLocalDialogOpen,
    setIsResetDialogOpen,
    setIsDeleteDataDialogOpen,
    setIsDeletingData,
    isSignedIn: Boolean(user),
    navigate,
  });

  // Handlers for clearing logs/outbox (using imported functions directly)
  const handleClearEventLog = () => {
    clearEventLog();
    refreshSnapshotMeta();
  };

  const handleClearArchivedOutbox = () => {
    clearArchivedOutbox();
    refreshSnapshotMeta();
  };

  // Mutation queue sync handler (simplified for settings page)
  const handleRunMutationQueueSync = () => {
    toast.info("Tính năng đồng bộ hàng chờ chưa được kích hoạt trong trang cài đặt.");
  };

  // Cloud version handler (simplified - not functional in settings context)
  const handleUseCloudVersion = () => {
    toast.info("Tính năng dùng bản trên tài khoản chưa được hỗ trợ trong trang cài đặt.");
  };

  if (!isReady || !activeGoal || !system) {
    return null;
  }

  return (
    <div className="stack-section pb-12 pt-4">
      <h1 className="sr-only">Cài đặt hệ 12 tuần</h1>
      <UpgradePaywallDialog
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        context={upgradeContext}
        currentPlan={activePlanCode}
        goalId={activeGoal.id}
        recommendedPlan={upgradeRecommendedPlan}
        source="settings"
        onCheckoutComplete={handleCheckoutComplete}
      />

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset chu kỳ 12 tuần?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa toàn bộ việc, check-in và review của chu kỳ hiện tại để bạn bắt đầu lại từ tuần này.
              Bạn sẽ không mất dữ liệu các chu kỳ trước đó.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleResetCycle();
                navigate("/12-week-system");
              }}
            >
              Reset chu kỳ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearLocalDialogOpen} onOpenChange={setIsClearLocalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa dữ liệu cục bộ?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa log, hàng chờ đồng bộ và trạng thái nhắc việc trên thiết bị này. Dữ liệu chính của
              bạn (mục tiêu, kế hoạch, việc, check-in, review) sẽ không bị ảnh hưởng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearLocalSignals}>Xóa dữ liệu cục bộ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteDataConfirmationDialog
        open={isDeleteDataDialogOpen}
        onOpenChange={setIsDeleteDataDialogOpen}
        isDemoMode={demoMode}
        isSignedIn={Boolean(user)}
        onConfirm={handleDeleteAllData}
        isLoading={isDeletingData}
      />

      <DeleteCloudWorkspaceDialog
        open={isDeleteCloudDialogOpen}
        onOpenChange={setIsDeleteCloudDialogOpen}
        onConfirm={handleConfirmDeleteCloudWorkspace}
      />

      <DataStorageInfo showSyncHint className="mb-6" />

      <TabErrorBoundary fallbackTitle="Cài đặt gặp lỗi">
        <Suspense
          fallback={
            <TwelveWeekTabFallback
              title="Đang mở tab Cài đặt"
              description="Phần chỉnh nhịp chu kỳ, dữ liệu trên thiết bị và quyền gói đang được tải."
            />
          }
        >
          <WeekEditor
            system={system}
            activeGoalId={activeGoal.id}
            backendConnectionStatus={backendConnectionStatus}
            currentPlanCode={activePlanCode}
            entitlementKeys={activeEntitlementKeys}
            billingProviderStatus={billingProviderStatus}
            lastEntitlementSyncSnapshot={lastEntitlementSyncSnapshot}
            lastRestoreAccessSnapshot={lastRestoreAccessSnapshot}
            lastBackendHydrationResult={lastBackendHydrationResult}
            appPreferences={appPreferences}
            funnelSteps={funnelSteps}
            monetizationSteps={monetizationSteps}
            browserNotificationStatus={browserNotificationStatus}
            lastSyncSnapshot={lastSyncSnapshot}
            pendingOutboxCount={pendingOutboxCount}
            archivedOutboxCount={archivedOutboxCount}
            eventCount={eventCount}
            activeReminders={activeReminders}
            recentOutboxItems={recentOutboxItems}
            isSyncingEntitlements={isSyncingEntitlements}
            isRestoringPlanAccess={isRestoringPlanAccess}
            isHydratingBackendPlans={isHydratingBackendPlans}
            isResolvingBackendPlanConflicts={isResolvingBackendPlanConflicts}
            mutationQueueSyncStatus={mutationQueueSyncStatus}
            onReviewDayChange={handleReviewDayChange}
            onReminderTimeChange={handleReminderTimeChange}
            onLoadPreferenceChange={handleLoadPreferenceChange}
            onStatusChange={handleStatusChange}
            onTacticPriorityChange={handleTacticPriorityChange}
            onTacticTypeChange={handleTacticTypeChange}
            onTimeBlocksChange={handleTimeBlocksChange}
            onPreferenceToggle={handlePreferenceToggle}
            onArchivePendingOutbox={handleArchivePendingOutbox}
            onRestoreArchivedOutbox={handleRestoreArchivedOutbox}
            onOpenReminder={handleOpenReminder}
            onExportLocalData={handleExportLocalData}
            onExportCloudWorkspace={handleExportCloudWorkspace}
            onDeleteCloudWorkspace={handleDeleteCloudWorkspace}
            onBrowserNotificationToggle={handleBrowserNotificationToggle}
            onRunOutboxSync={handleRunOutboxSync}
            onOutboxItemToggle={handleOutboxItemToggle}
            onClearEventLog={handleClearEventLog}
            onClearArchivedOutbox={handleClearArchivedOutbox}
            onOpenClearLocalDialog={() => setIsClearLocalDialogOpen(true)}
            onDeleteAllData={handleDeleteAllData}
            onOpenDeleteDataDialog={handleOpenDeleteDataDialog}
            onOpenResetDialog={() => setIsResetDialogOpen(true)}
            onOpenUpgradePlan={(planCode) => handleOpenUpgradeDialog("plan", planCode)}
            onSyncEntitlements={handleSyncEntitlements}
            onRestorePlanAccess={handleRestorePlanAccess}
            onHydrateBackendPlans={handleHydrateBackendPlans}
            onRunMutationQueueSync={handleRunMutationQueueSync}
            onKeepLocalPlanForConflicts={handleKeepLocalPlanForConflicts}
            onUseBackendPlanForConflicts={handleUseBackendPlanForConflicts}
            onUseCloudVersion={handleUseCloudVersion}
            onOpenBillingPortal={handleOpenBillingPortal}
            onNavigateGoals={() => navigate("/goals")}
            onNavigateJournal={() => navigate("/journal")}
            onNavigateSetup={() => navigate("/life-insight")}
          />
        </Suspense>
      </TabErrorBoundary>
    </div>
  );
}

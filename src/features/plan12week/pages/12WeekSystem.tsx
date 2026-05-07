import { Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { BarChart3, CalendarDays, ListTodo, Settings2, MoreHorizontal } from "lucide-react";

import { useTwelveWeekSystemSnapshot } from "@/app/hooks/useTwelveWeekSystemSnapshot";
import { useScrollToTopOnChange } from "@/app/hooks/useScrollToTopOnChange";
import { useNetworkStatus } from "@/app/hooks/useNetworkStatus";
import { TabErrorBoundary } from "@/app/components/TabErrorBoundary";
import { DeleteDataConfirmationDialog } from "@/app/components/twelve-week/DeleteDataConfirmationDialog";
import { UpgradePaywallDialog } from '@/app/components/UpgradePaywallDialog';
import { trackAnalyticsEvent } from '@/app/utils/analytics';
import {
  isDemoMode,
  isRealMode,
  shouldEnable12WeekMutationSync,
  shouldEnable12WeekPullSync,
} from '@/app/utils/app-mode';
import {
  trackPremiumInsightOpened,
  trackRescueActionTaken,
  trackRescueTriggerDismissed,
  trackRescueTriggerFired,
} from '@/app/utils/monetization-analytics';
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
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
  clearArchivedOutbox,
  clearEventLog,
  formatDateInputValue,
  getUserData,
  saveUserData,
  updateGoal,
} from '@/app/utils/storage';
import { dismissRescueTrigger } from "@/app/utils/twelve-week-system-ui";
import type { TwelveWeekSystem as TwelveWeekSystemModel } from '@/app/utils/storage-types';
import {
  buildDerivedScoreboard,
  getDefaultScoreboard,
  getTwelveWeekCurrentWeek,
} from '@/app/utils/storage-twelve-week';
import { TaskBoard } from "@/features/plan12week/components/TaskBoard";
import { usePlanExecutionSync } from "@/features/plan12week/hooks";
import { useTwelveWeekManualCloudSync } from "@/features/plan12week/hooks/useTwelveWeekManualCloudSync";
import {
  readMutationQueueStore,
  summarizeMutationQueueStore,
} from "@/features/plan12week/persistence/mutationQueue";
import { applyPulledWorkspaceToUserData } from "@/features/plan12week/persistence/pulledWorkspaceApply";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  TwelveWeekDashboardHeader,
  TwelveWeekDashboardNotice,
  TwelveWeekDashboardState,
  TwelveWeekGoalSwitcher,
  TwelveWeekRescueTriggerBanner,
  TwelveWeekTabFallback,
} from "./12WeekSystem/components";
import {
  buildBackendSyncKey,
  getBackendSyncIssueMessage,
  getLatestCheckIn,
  getSyncBadgeClass,
  getSyncBadgeLabel,
  hasBackendSyncIssue as getHasBackendSyncIssue,
} from "./12WeekSystem/helpers";
import { PlanOverview, WeekEditor, WeeklyReview } from "./12WeekSystem/lazyTabs";
import { ProgressSummaryCard } from "@/app/components/twelve-week/ProgressSummaryCard";
import { useTwelveWeekBackendActions } from "./12WeekSystem/useTwelveWeekBackendActions";
import { useTwelveWeekBillingActions } from "./12WeekSystem/useTwelveWeekBillingActions";
import { useTwelveWeekExecutionActions } from "./12WeekSystem/useTwelveWeekExecutionActions";
import { useTwelveWeekSettingsActions } from "./12WeekSystem/useTwelveWeekSettingsActions";
import { useWeeklyReviewFormState } from "./12WeekSystem/useWeeklyReviewFormState";

const emptyMutationQueueSummary = {
  totalCount: 0,
  pendingCount: 0,
  inFlightCount: 0,
  failedOrRetryableCount: 0,
  succeededCount: 0,
  lastDrainStartedAt: null,
  lastDrainFinishedAt: null,
};

export function TwelveWeekSystem() {
  const navigate = useNavigate();
  const { authLoading, isConfigured: isAuthConfigured, user, userProfile } = useAuthContext();
  const {
    isReady,
    activeGoal,
    allGoals,
    activeTab,
    setActiveTab,
    activePlanCode,
    activeEntitlementKeys,
    appPreferences,
    activeReminders,
    recentOutboxItems,
    funnelSteps,
    monetizationSteps,
    billingProviderStatus,
    browserNotificationStatus,
    setBrowserNotificationStatus,
    lastSyncSnapshot,
    setLastSyncSnapshot,
    lastEntitlementSyncSnapshot,
    lastRestoreAccessSnapshot,
    pendingOutboxCount,
    archivedOutboxCount,
    eventCount,
    system,
    currentWeek,
    currentWeekRange,
    todayQueue,
    missedTasks,
    weekCompletion,
    currentReview,
    currentPlanFocus,
    currentPlanMilestone,
    currentLagMetricValue,
    reviewDoneCount,
    coreTacticCount,
    optionalTacticCount,
    todayCompletedCount,
    todayRemainingCount,
    overdueOpenCount,
    currentWeekOpenTasks,
    optionalOpenThisWeekCount,
    firstPriorityTask,
    secondaryTodayTasks,
    averageScore,
    reviewDueToday,
    currentWeekScoreValue,
    reviewStatusLabel,
    coreIndicators,
    optionalIndicators,
    hasSmartRescue,
    rescuePlanSummary,
    rescueStatus,
    nextWeekRecommendation,
    executionInsights,
    weeklyReflectionInsights,
    activeTriggers,
    hasPremiumReviewInsights,
    premiumReviewInsight,
    suggestedNextWeekPlan,
    hasAdvancedAnalytics,
    executionHeatmap,
    weeklyTrend,
    tacticBreakdown,
    milestoneItems,
    updateActiveSystemState,
    refreshSnapshotMeta,
    refreshBackendProgressOverlay,
    invalidateOverlay,
    loadGoalData,
  } = useTwelveWeekSystemSnapshot();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isClearLocalDialogOpen, setIsClearLocalDialogOpen] = useState(false);
  const [isDeleteDataDialogOpen, setIsDeleteDataDialogOpen] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [dismissedTriggerKind, setDismissedTriggerKind] = useState<string | null>(null);
  const demoMode = isDemoMode();
  const [showFullProgress, setShowFullProgress] = useState(false);
  const {
    loading: isManualCloudSyncing,
    lastResult: lastManualCloudSyncResult,
    syncNow: syncManualCloudNow,
  } = useTwelveWeekManualCloudSync({
    onApplied: () => {
      loadGoalData(activeGoalIdRef.current ?? undefined);
      refreshBackendProgressOverlay();
      refreshSnapshotMeta();
    },
  });
  const networkStatusInfo = useNetworkStatus();

  const handleUseCloudVersion = () => {
    const pullResponse = lastManualCloudSyncResult?.pullResponse;
    if (!pullResponse?.workspace) return;
    const localData = getUserData();
    const nextData = applyPulledWorkspaceToUserData(localData, pullResponse, {});
    const didWrite = saveUserData(nextData);
    if (didWrite) {
      loadGoalData(activeGoalIdRef.current ?? undefined);
      refreshBackendProgressOverlay();
      refreshSnapshotMeta();
    }
  };

  const todayDateKey = formatDateInputValue(new Date());
  const isBackendProfileReady = Boolean(userProfile);
  const latestCheckIn = getLatestCheckIn(system);
  const { dailyMood, dailyNote, weeklyForm, setDailyMood, setDailyNote, setWeeklyForm } = useWeeklyReviewFormState({
    activeGoalId: activeGoal?.id ?? null,
    system,
    currentReview,
    currentLagMetricValue,
    latestCheckIn,
  });
  const hasTodayTasks = todayQueue.length > 0;
  const hasCurrentReview = Boolean(currentReview);

  const activeGoalIdRef = useRef<string | null>(activeGoal?.id ?? null);
  const lastBackendSyncKeyRef = useRef<string | null>(null);
  const systemViewedGoalIdRef = useRef<string | null>(null);
  const tabsTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeGoalIdRef.current = activeGoal?.id ?? null;
  }, [activeGoal?.id]);

  const {
    loading: isBackendSyncing,
    error: backendSyncError,
    data: backendSyncData,
    actions: executionSyncActions,
  } = usePlanExecutionSync({
    goalId: activeGoal?.id ?? null,
    system,
    enabled: isBackendProfileReady,
  });

  const backendConnectionStatus = {
    authConfigured: isAuthConfigured,
    authLoading,
    signedIn: Boolean(user),
    profileReady: isBackendProfileReady,
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
    loading: isManualCloudSyncing,
    lastResult: lastManualCloudSyncResult,
    queueSummary: mutationQueueSummary,
    networkStatus: networkStatusInfo.status,
    retryOnReconnectEnabled: false,
  };
  const planHasNoTasks = Boolean(system && system.taskInstances.length === 0);
  const planHasNoLeadMetrics = Boolean(system && system.leadIndicators.length === 0);
  const planHasNoLagMetric = Boolean(system && system.lagMetric.name.trim().length === 0);
  const hasIncompletePlanStructure = Boolean(system && (planHasNoTasks || planHasNoLeadMetrics || planHasNoLagMetric));

  const commitSystemUpdate = (nextSystem: TwelveWeekSystemModel) => {
    const normalizedNextSystem = {
      ...nextSystem,
      scoreboard: buildDerivedScoreboard(nextSystem, getDefaultScoreboard(nextSystem.totalWeeks)),
    };

    if (!activeGoal) return normalizedNextSystem;

    updateGoal(activeGoal.id, {
      twelveWeekSystem: normalizedNextSystem,
    });
    updateActiveSystemState(() => normalizedNextSystem);
    return normalizedNextSystem;
  };

  useEffect(() => {
    if (activeTab !== "progress") {
      setShowFullProgress(false);
    }
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    if (!activeGoal || !system) return;

    if (value === "progress") {
      trackAnalyticsEvent(
        "progress_viewed",
        {
          source: "12_week_system",
          week_number: getTwelveWeekCurrentWeek(system),
          total_weeks: system.totalWeeks,
          current_plan: activePlanCode,
        },
        { goalId: activeGoal.id },
      );
    }

    if (value === "week" && hasPremiumReviewInsights) {
      const insightWeekNumber = getTwelveWeekCurrentWeek(system);
      trackPremiumInsightOpened({
        goalId: activeGoal.id,
        source: "12_week_system",
        currentPlan: activePlanCode,
        weekNumber: insightWeekNumber,
      });
    }
  };

  const handleRunMutationQueueSync = () => {
    void syncManualCloudNow();
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
    activeTab,
    activePlanCode,
    refreshSnapshotMeta,
  });

  const {
    isHydratingBackendPlans,
    isResolvingBackendPlanConflicts,
    lastBackendHydrationResult,
    handleRunOutboxSync,
    handleHydrateBackendPlans,
    handleUseBackendPlanForConflicts,
    handleKeepLocalPlanForConflicts,
  } = useTwelveWeekBackendActions({
    activeGoal,
    system,
    isBackendProfileReady,
    executionSyncActions,
    activeGoalIdRef,
    lastBackendSyncKeyRef,
    setLastSyncSnapshot,
    loadGoalData,
    refreshBackendProgressOverlay,
    refreshSnapshotMeta,
  });

  const {
    handleToggleTask,
    handleSaveCheckIn,
    handleSaveWeeklyReview,
    handleReentry,
    handleApplyRecommendedReentry,
    handleApplySuggestedPlan,
    handleRescheduleTaskWithinWeek,
    handleRescheduleTaskToNextWeek,
    handleSkipNonCoreTask,
  } = useTwelveWeekExecutionActions({
    activeGoal,
    system,
    activeGoalIdRef,
    dailyMood,
    dailyNote,
    weeklyForm,
    setWeeklyForm,
    hasPremiumReviewInsights,
    suggestedNextWeekPlan,
    rescuePlanSummary,
    executionSyncActions,
    commitSystemUpdate,
    updateActiveSystemState,
    refreshBackendProgressOverlay,
    invalidateOverlay,
    refreshSnapshotMeta,
  });

  const {
    handleReviewDayChange,
    handleReminderTimeChange,
    handleLoadPreferenceChange,
    handleStatusChange,
    handleTacticPriorityChange,
    handleTacticTypeChange,
    handlePreferenceToggle,
    handleArchivePendingOutbox,
    handleOutboxItemToggle,
    handleRestoreArchivedOutbox,
    handleOpenReminder,
    handleExportLocalData,
    handleExportCloudWorkspace,
    handleDeleteCloudWorkspace,
    handleClearLocalSignals,
    handleDeleteAllData,
    handleBrowserNotificationToggle,
    handleResetCycle,
  } = useTwelveWeekSettingsActions({
    activeGoal,
    system,
    activeGoalIdRef,
    commitSystemUpdate,
    refreshSnapshotMeta,
    loadGoalData,
    handleTabChange,
    setActiveTab,
    setBrowserNotificationStatus,
    setIsClearLocalDialogOpen,
    setIsResetDialogOpen,
    setIsDeleteDataDialogOpen,
    setIsDeletingData,
    isSignedIn: Boolean(user),
    navigate,
  });

  useScrollToTopOnChange(activeTab, {
    targetRef: tabsTopRef,
    focus: false,
    enabled:
      isReady &&
      Boolean(activeGoal && system) &&
      !isUpgradeDialogOpen &&
      !isResetDialogOpen &&
      !isClearLocalDialogOpen,
  });

  useEffect(() => {
    if (!isReady || !activeGoal || !system) return;
    if (systemViewedGoalIdRef.current === activeGoal.id) return;

    systemViewedGoalIdRef.current = activeGoal.id;
    trackAnalyticsEvent(
      "twelve_week_system_viewed",
      {
        source: "12_week_system",
        week_number: currentWeek,
        total_weeks: system.totalWeeks,
        current_plan: activePlanCode,
        active_tab: activeTab,
        has_today_tasks: hasTodayTasks,
        has_weekly_review: hasCurrentReview,
      },
      { goalId: activeGoal.id },
    );
  }, [
    activeGoal,
    activePlanCode,
    activeTab,
    currentWeek,
    hasCurrentReview,
    hasTodayTasks,
    isReady,
    system,
  ]);

  const hasBackendSyncIssue = getHasBackendSyncIssue(backendConnectionStatus, lastBackendHydrationResult);
  const backendSyncIssueMessage = getBackendSyncIssueMessage(backendConnectionStatus, lastBackendHydrationResult);
  const syncBadgeClass = getSyncBadgeClass(backendConnectionStatus);
  const syncBadgeLabel = getSyncBadgeLabel(backendConnectionStatus);

  useEffect(() => {
    const localSystem = activeGoal?.twelveWeekSystem ?? null;
    if (!isBackendProfileReady || !activeGoal || !localSystem) return;
    const hasPendingBackendConflict = lastBackendHydrationResult?.conflicts.some(
      (conflict) => conflict.goalId === activeGoal.id,
    );
    if (hasPendingBackendConflict) return;

    const syncKey = buildBackendSyncKey(activeGoal.id, localSystem);
    if (lastBackendSyncKeyRef.current === syncKey) return;
    lastBackendSyncKeyRef.current = syncKey;

    let cancelled = false;
    void executionSyncActions.syncLocalSnapshot({ system: localSystem }).then((snapshot) => {
      if (cancelled || activeGoalIdRef.current !== activeGoal.id) return;

      if (snapshot.status === "success" || snapshot.status === "partial") {
        refreshBackendProgressOverlay();
      }
      refreshSnapshotMeta();
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeGoal,
    executionSyncActions,
    isBackendProfileReady,
    lastBackendHydrationResult,
    refreshBackendProgressOverlay,
    refreshSnapshotMeta,
  ]);

  if (!isReady) {
    return (
      <TwelveWeekDashboardState
        kind="loading"
        eyebrow="Đang chuẩn bị dashboard"
        title="Đang tải hệ thống 12 tuần"
        description="Mình đang đọc dữ liệu local và kiểm tra trạng thái chu kỳ hiện tại trước khi mở hàng việc hôm nay."
      />
    );
  }

  if (!activeGoal || !system) {
    return (
      <TwelveWeekDashboardState
        kind="empty"
        eyebrow="Chưa có chu kỳ đang chạy"
        title="Bạn chưa có hệ thống 12 tuần"
        description="Tạo một chu kỳ 12 tuần để web trả lời rõ hôm nay nên làm gì, tuần này đang ở đâu và khi nào cần review."
      >
        <div className="mx-auto mt-8 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
          {[
            "Chọn lĩnh vực ưu tiên từ Life Insight.",
            "Viết SMART goal và kiểm tra tính thực tế.",
            "Chốt việc giữ nhịp, chỉ số và ngày review tuần.",
          ].map((item, index) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="mr-2 font-semibold text-slate-950">0{index + 1}</span>
              {item}
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button className="w-full sm:w-auto" onClick={() => navigate("/life-insight")}>
            Tạo mục tiêu 12 tuần
          </Button>
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => navigate("/goals")}>
            Mở mục tiêu đã có
          </Button>
        </div>
      </TwelveWeekDashboardState>
    );
  }

  return (
    <div className="ops-shell ops-system pb-20 md:pb-4">
      <UpgradePaywallDialog
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        context={upgradeContext}
        currentPlan={activePlanCode}
        goalId={activeGoal.id}
        recommendedPlan={upgradeRecommendedPlan}
        source={
          activeTab === "settings" ? "settings" : upgradeContext === "review" ? "review_teaser" : "12_week_system"
        }
        onCheckoutComplete={handleCheckoutComplete}
      />

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Làm mới chu kỳ 12 tuần?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ bắt đầu lại tuần 1 từ tuần hiện tại, xóa việc đã hoàn thành, check-in hằng ngày, review
              tuần và nhật ký review tuần đã liên kết của chu kỳ đang chạy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetCycle}>Làm mới từ tuần này</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearLocalDialogOpen} onOpenChange={setIsClearLocalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa dấu vết local trên thiết bị này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này chỉ xóa nhật ký sự kiện, outbox và trạng thái nhắc việc local. Mục tiêu, review tuần, nhật
              ký và vision board của bạn vẫn được giữ nguyên.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ lại</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearLocalSignals}>Xóa dấu vết local</AlertDialogAction>
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

      <TwelveWeekDashboardHeader
        activeGoal={activeGoal}
        system={system}
        activePlanCode={activePlanCode}
        currentWeek={currentWeek}
        syncBadgeClass={syncBadgeClass}
        syncBadgeLabel={syncBadgeLabel}
        reviewDueToday={reviewDueToday}
        todayRemainingCount={todayRemainingCount}
        todayCompletedCount={todayCompletedCount}
        weekCompletion={weekCompletion}
        currentWeekRange={currentWeekRange}
        reviewStatusLabel={reviewStatusLabel}
        firstPriorityTask={firstPriorityTask}
        onOpenFocusTab={() => handleTabChange(reviewDueToday ? "week" : "today")}
        onOpenGoals={() => navigate("/goals")}
      />

      <TwelveWeekGoalSwitcher allGoals={allGoals} activeGoalId={activeGoal.id} onLoadGoal={loadGoalData} />

      {hasIncompletePlanStructure && (
        <TwelveWeekDashboardNotice
          tone="warning"
          title="Chu kỳ này chưa có việc hoặc chỉ số đủ rõ"
          description={
            planHasNoLeadMetrics
              ? "Dashboard đã thấy kế hoạch, nhưng chưa có việc giữ nhịp để tạo hàng việc mỗi tuần. Hãy tạo lại chu kỳ từ flow mục tiêu để có việc và review rõ ràng."
              : planHasNoTasks
                ? "Kế hoạch đã có việc giữ nhịp nhưng chưa có việc nào trong chu kỳ. Hãy kiểm tra lại setup hoặc tạo lại chu kỳ để dashboard có hàng việc hôm nay."
                : "Chỉ số kết quả chính đang trống, nên phần tiến độ và review sẽ khó hiểu hơn. Hãy bổ sung chỉ số khi chỉnh lại chu kỳ."
          }
        >
          <Button
            className="w-full border-slate-950 bg-slate-950 text-white hover:bg-slate-800 sm:w-auto"
            onClick={() => navigate("/life-insight")}
          >
            Tạo lại chu kỳ
          </Button>
          <Button className="w-full bg-white sm:w-auto" variant="outline" onClick={() => handleTabChange("settings")}>
            Mở cài đặt chu kỳ
          </Button>
        </TwelveWeekDashboardNotice>
      )}

      {hasBackendSyncIssue && (
        <TwelveWeekDashboardNotice
          tone="error"
          title="Chưa thể đồng bộ backend"
          description={`${backendSyncIssueMessage} Các thay đổi hiện tại vẫn được giữ trên thiết bị này.`}
        >
          <Button
            className="w-full border-rose-900 bg-rose-900 text-white hover:bg-rose-800 sm:w-auto"
            disabled={isBackendSyncing}
            onClick={handleRunOutboxSync}
          >
            {isBackendSyncing ? "Đang thử lại..." : "Thử đồng bộ lại"}
          </Button>
          <Button className="w-full bg-white sm:w-auto" variant="outline" onClick={() => handleTabChange("settings")}>
            Xem trạng thái
          </Button>
        </TwelveWeekDashboardNotice>
      )}

      <TwelveWeekRescueTriggerBanner
        trigger={activeTriggers.filter((trigger) => trigger.kind !== dismissedTriggerKind)[0] ?? null}
        onTriggerFired={(trigger) => {
          trackRescueTriggerFired({
            kind: trigger.kind,
            severity: trigger.severity,
            currentPlan: activePlanCode,
          });
        }}
        onActionTaken={(trigger, action) => {
          trackRescueActionTaken({
            kind: trigger.kind,
            action,
            currentPlan: activePlanCode,
          });
        }}
        onOpenUpgrade={() => navigate("/billing/plan")}
        onOpenToday={() => setActiveTab("today")}
        onDismiss={(kind) => {
          dismissRescueTrigger(kind);
          trackRescueTriggerDismissed({ kind, currentPlan: activePlanCode });
          setDismissedTriggerKind(kind);
        }}
      />

      {/* Desktop secondary navigation dropdown */}
      <div className="hidden md:flex justify-end mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="gap-2">
              <MoreHorizontal className="h-4 w-4" />
              Khác
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleTabChange("week")}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Review tuần
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTabChange("progress")}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Tiến độ
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/12-week-system/settings")}>
              <Settings2 className="mr-2 h-4 w-4" />
              Cài đặt chu kỳ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main content sections */}
      <div ref={tabsTopRef} className="pt-4">
        {/* TODAY SECTION */}
        {activeTab === "today" && (
          <TabErrorBoundary fallbackTitle="Tab Hôm nay gặp lỗi">
            <TaskBoard
              system={system}
              currentWeek={currentWeek}
              currentWeekRange={currentWeekRange}
              currentPlanFocus={currentPlanFocus}
              reviewDueToday={reviewDueToday}
              reviewStatusLabel={reviewStatusLabel}
              currentWeekScoreValue={currentWeekScoreValue}
              weekCompletion={weekCompletion}
              coreTacticCount={coreTacticCount}
              optionalTacticCount={optionalTacticCount}
              missedTasks={missedTasks}
              todayQueue={todayQueue}
              currentWeekTasksCount={currentWeekOpenTasks.length}
              todayDateKey={todayDateKey}
              todayCompletedCount={todayCompletedCount}
              todayRemainingCount={todayRemainingCount}
              overdueOpenCount={overdueOpenCount}
              optionalOpenThisWeekCount={optionalOpenThisWeekCount}
              hasPlanTasks={!planHasNoTasks}
              hasLeadMetrics={!planHasNoLeadMetrics}
              firstPriorityTask={firstPriorityTask}
              secondaryTodayTasks={secondaryTodayTasks}
              hasSmartRescue={hasSmartRescue}
              rescuePlanSummary={rescuePlanSummary}
              dailyMood={dailyMood}
              dailyNote={dailyNote}
              latestCheckIn={latestCheckIn}
              onReentry={handleReentry}
              onApplyRecommendedReentry={handleApplyRecommendedReentry}
              onOpenSmartRescue={() => handleOpenUpgradeDialog("plan", "PLUS")}
              onToggleTask={handleToggleTask}
              onDailyMoodChange={setDailyMood}
              onDailyNoteChange={setDailyNote}
              onSaveCheckIn={handleSaveCheckIn}
              onOpenWeekTab={() => handleTabChange("week")}
              onNavigateToSetup={() => navigate("/life-insight")}
              rescueStatus={rescueStatus}
              onPickTinyTask={() => handleTabChange("today")}
              onReviewPlan={() => navigate("/life-insight")}
              onRescheduleTaskWithinWeek={handleRescheduleTaskWithinWeek}
              onRescheduleTaskToNextWeek={handleRescheduleTaskToNextWeek}
              onSkipNonCoreTask={handleSkipNonCoreTask}
            />
          </TabErrorBoundary>
        )}

        {/* WEEK SECTION */}
        {activeTab === "week" && (
          <TabErrorBoundary fallbackTitle="Tab Tuần gặp lỗi">
            <Suspense
              fallback={
                <TwelveWeekTabFallback
                  title="Đang mở tab Tuần"
                  description="Phần review tuần và gợi ý cho tuần sau sẽ hiện ra ngay sau khi tải xong."
                />
              }
            >
              <WeeklyReview
                system={system}
                currentWeekNumber={currentWeek}
                currentWeekRange={currentWeekRange}
                currentPlanFocus={currentPlanFocus}
                currentPlanMilestone={currentPlanMilestone}
                reviewDueToday={reviewDueToday}
                reviewStatusLabel={reviewStatusLabel}
                currentScoreValue={currentWeekScoreValue}
                weekCompletion={weekCompletion}
                currentLagMetricValue={currentLagMetricValue}
                coreIndicators={coreIndicators}
                optionalIndicators={optionalIndicators}
                currentPlanCode={activePlanCode}
                hasPremiumInsights={hasPremiumReviewInsights}
                premiumInsight={premiumReviewInsight}
                suggestedNextWeekPlan={suggestedNextWeekPlan}
                weeklyForm={weeklyForm}
                currentReview={currentReview}
                onWeeklyFormChange={(field, value) =>
                  setWeeklyForm((previousForm) => ({
                    ...previousForm,
                    [field]: value,
                  }))
                }
                onApplySuggestedPlan={handleApplySuggestedPlan}
                onOpenPremiumInsights={() => handleOpenUpgradeDialog("review", "PLUS")}
                onSaveWeeklyReview={handleSaveWeeklyReview}
                onOpenTodayTab={() => handleTabChange("today")}
                rescueStatus={rescueStatus}
                onPickTinyTask={() => handleTabChange("today")}
                onReducePlan={handleApplySuggestedPlan}
                nextWeekRecommendation={nextWeekRecommendation}
                onAcceptNextWeekRecommendation={handleApplySuggestedPlan}
                weeklyReflectionInsights={weeklyReflectionInsights}
              />
            </Suspense>
          </TabErrorBoundary>
        )}

        {/* PROGRESS SECTION */}
        {activeTab === "progress" && (
          <TabErrorBoundary fallbackTitle="Tab Tiến độ gặp lỗi">
            <Suspense
              fallback={
                <TwelveWeekTabFallback
                  title="Đang mở tab Tiến độ"
                  description="Bảng điểm và cột mốc của chu kỳ đang được chuẩn bị cho bạn."
                />
              }
            >
              {!showFullProgress ? (
                <ProgressSummaryCard
                  system={system}
                  currentWeek={currentWeek}
                  currentWeekRange={currentWeekRange}
                  currentWeekScoreValue={currentWeekScoreValue}
                  averageScore={averageScore}
                  reviewDoneCount={reviewDoneCount}
                  weekCompletion={weekCompletion}
                  reviewDueToday={reviewDueToday}
                  onOpenTodayTab={() => setActiveTab("today")}
                  onOpenWeekTab={() => setActiveTab("week")}
                  onNavigateToSetup={() => navigate("/life-insight")}
                  onViewFull={() => setShowFullProgress(true)}
                />
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <Button variant="outline" onClick={() => setShowFullProgress(false)}>
                      ← Quay lại tóm tắt
                    </Button>
                  </div>
                  <PlanOverview
                    system={system}
                    currentWeek={currentWeek}
                    currentWeekRange={currentWeekRange}
                    currentWeekScoreValue={currentWeekScoreValue}
                    averageScore={averageScore}
                    reviewDoneCount={reviewDoneCount}
                    weekCompletion={weekCompletion}
                    milestoneItems={milestoneItems}
                    hasAdvancedAnalytics={hasAdvancedAnalytics}
                    executionHeatmap={executionHeatmap}
                    weeklyTrend={weeklyTrend}
                    tacticBreakdown={tacticBreakdown}
                    reviewDueToday={reviewDueToday}
                    onOpenTodayTab={() => setActiveTab("today")}
                    onOpenWeekTab={() => setActiveTab("week")}
                    onNavigateToSetup={() => navigate("/life-insight")}
                    executionInsights={executionInsights}
                  />
                </>
              )}
            </Suspense>
          </TabErrorBoundary>
        )}

        {/* SETTINGS SECTION */}
        {activeTab === "settings" && (
          <TabErrorBoundary fallbackTitle="Tab Cài đặt chu kỳ gặp lỗi">
            <Suspense
              fallback={
                <TwelveWeekTabFallback
                  title="Đang mở cài đặt chu kỳ"
                  description="Phần chỉnh nhịp chu kỳ, dữ liệu local và quyền gói đang được tải."
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
                onClearEventLog={() => {
                  clearEventLog();
                  refreshSnapshotMeta();
                }}
                onClearArchivedOutbox={() => {
                  clearArchivedOutbox();
                  refreshSnapshotMeta();
                }}
                onOpenClearLocalDialog={() => setIsClearLocalDialogOpen(true)}
                onDeleteAllData={handleDeleteAllData}
                onOpenDeleteDataDialog={() => setIsDeleteDataDialogOpen(true)}
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
        )}
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16">
          <Button
            variant={activeTab === "today" ? "default" : "ghost"}
            size="sm"
            className="flex flex-col items-center justify-center h-full px-3 py-2 gap-1"
            onClick={() => handleTabChange("today")}
          >
            <ListTodo className={`h-5 w-5 ${activeTab === "today" ? "text-primary-foreground" : "text-slate-500"}`} />
            <span className="text-xs font-medium">Hôm nay</span>
          </Button>

          <Button
            variant={activeTab === "week" ? "default" : "ghost"}
            size="sm"
            className="flex flex-col items-center justify-center h-full px-3 py-2 gap-1"
            onClick={() => handleTabChange("week")}
          >
            <CalendarDays className={`h-5 w-5 ${activeTab === "week" ? "text-primary-foreground" : "text-slate-500"}`} />
            <span className="text-xs font-medium">Tuần</span>
          </Button>

          <Button
            variant={activeTab === "progress" ? "default" : "ghost"}
            size="sm"
            className="flex flex-col items-center justify-center h-full px-3 py-2 gap-1"
            onClick={() => handleTabChange("progress")}
          >
            <BarChart3 className={`h-5 w-5 ${activeTab === "progress" ? "text-primary-foreground" : "text-slate-500"}`} />
            <span className="text-xs font-medium">Tiến độ</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant={activeTab === "settings" ? "default" : "ghost"}
                size="sm"
                className="flex flex-col items-center justify-center h-full px-3 py-2 gap-1"
              >
                <MoreHorizontal className={`h-5 w-5 ${activeTab === "settings" ? "text-primary-foreground" : "text-slate-500"}`} />
                <span className="text-xs font-medium">Khác</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate("/12-week-system/settings")}>
                <Settings2 className="mr-2 h-4 w-4" />
                Cài đặt chu kỳ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

    </div>
  );
}

export function TwelveWeekSystemSettings() {
}

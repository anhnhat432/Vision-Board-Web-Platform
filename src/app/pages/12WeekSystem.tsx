import { Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { BarChart3, CalendarDays, ListTodo, Settings2 } from "lucide-react";

import { useTwelveWeekSystemSnapshot } from "../hooks/useTwelveWeekSystemSnapshot";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { TabErrorBoundary } from "../components/TabErrorBoundary";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import { trackAnalyticsEvent } from "../utils/analytics";
import {
  isRealMode,
  shouldEnable12WeekMutationSync,
  shouldEnable12WeekPullSync,
} from "../utils/app-mode";
import {
  trackPremiumInsightOpened,
  trackRescueActionTaken,
  trackRescueTriggerDismissed,
  trackRescueTriggerFired,
} from "../utils/monetization-analytics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  clearArchivedOutbox,
  clearEventLog,
  formatDateInputValue,
  getUserData,
  saveUserData,
  updateGoal,
} from "../utils/storage";
import { dismissRescueTrigger } from "../utils/twelve-week-system-ui";
import type { TwelveWeekSystem as TwelveWeekSystemModel } from "../utils/storage-types";
import {
  buildDerivedScoreboard,
  getDefaultScoreboard,
  getTwelveWeekCurrentWeek,
} from "../utils/storage-twelve-week";
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
    loadGoalData,
  } = useTwelveWeekSystemSnapshot();
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isClearLocalDialogOpen, setIsClearLocalDialogOpen] = useState(false);
  const [dismissedTriggerKind, setDismissedTriggerKind] = useState<string | null>(null);
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
    <div className="ops-shell ops-system">
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
            Mở cài đặt
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

      <div ref={tabsTopRef}>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList
            data-tour-id="system-tabs"
            aria-label="Điều hướng trung tâm 12 tuần"
            className="sticky top-14 z-20 grid h-auto w-full grid-cols-4 gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-sm sm:top-3"
          >
          <TabsTrigger
            value="today"
            className="min-w-0 shrink-0 flex-col justify-center gap-1 rounded-md px-2 py-2 text-xs leading-tight sm:flex-row sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <ListTodo className="h-4 w-4" />
            Hôm nay
          </TabsTrigger>
          <TabsTrigger
            value="week"
            className="min-w-0 shrink-0 flex-col justify-center gap-1 rounded-md px-2 py-2 text-xs leading-tight sm:flex-row sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <CalendarDays className="h-4 w-4" />
            Tuần
          </TabsTrigger>
          <TabsTrigger
            value="progress"
            className="min-w-0 shrink-0 flex-col justify-center gap-1 rounded-md px-2 py-2 text-xs leading-tight sm:flex-row sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <BarChart3 className="h-4 w-4" />
            Tiến độ
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="min-w-0 shrink-0 flex-col justify-center gap-1 rounded-md px-2 py-2 text-xs leading-tight sm:flex-row sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <Settings2 className="h-4 w-4" />
            Cài đặt
          </TabsTrigger>
        </TabsList>

        <p className="mt-3 rounded-lg border border-slate-200 bg-white/82 px-4 py-3 text-sm leading-6 text-slate-600 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.16)]">
          Hôm nay: tick việc và check-in. Tuần: chốt review. Tiến độ: xem điểm và cột mốc. Cài đặt: export hoặc xóa
          dữ liệu local trên trình duyệt này.
        </p>

        <TabsContent value="today" className="space-y-6 pt-4">
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
            />
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="week" className="space-y-6 pt-4">
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
                onWeeklyFormChange={(field, value) =>
                  setWeeklyForm((previousForm) => ({
                    ...previousForm,
                    [field]: value,
                  }))
                }
                onApplySuggestedPlan={handleApplySuggestedPlan}
                onOpenPremiumInsights={() => handleOpenUpgradeDialog("review", "PLUS")}
                onSaveWeeklyReview={handleSaveWeeklyReview}
              />
            </Suspense>
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="progress">
          <TabErrorBoundary fallbackTitle="Tab Tiến độ gặp lỗi">
            <Suspense
              fallback={
                <TwelveWeekTabFallback
                  title="Đang mở tab Tiến độ"
                  description="Bảng điểm và cột mốc của chu kỳ đang được chuẩn bị cho bạn."
                />
              }
            >
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
              />
            </Suspense>
          </TabErrorBoundary>
        </TabsContent>

        <TabsContent value="settings">
          <TabErrorBoundary fallbackTitle="Tab Cài đặt gặp lỗi">
            <Suspense
              fallback={
                <TwelveWeekTabFallback
                  title="Đang mở tab Cài đặt"
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

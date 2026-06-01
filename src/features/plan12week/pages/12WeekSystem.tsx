import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toastSuccess } from "@/app/utils/toast";
import { Skeleton } from "@/app/components/ui/skeleton";
import { useNetworkStatus } from "@/app/hooks/useNetworkStatus";
import { useScrollToTopOnChange } from "@/app/hooks/useScrollToTopOnChange";
import { useTwelveWeekSystemSnapshot } from "@/app/hooks/useTwelveWeekSystemSnapshot";
import { trackAnalyticsEvent } from "@/app/utils/analytics";
import {
  isDemoMode,
  isRealMode,
  shouldEnable12WeekMutationSync,
  shouldEnable12WeekPullSync,
} from "@/app/utils/app-mode";
import {
  trackPremiumInsightOpened,
} from "@/app/utils/monetization-analytics";
import {
  APP_STORAGE_KEYS,
  clearArchivedOutbox,
  clearEventLog,
  formatDateInputValue,
  getUserData,
  saveUserData,
  USER_DATA_STORAGE_KEY,
  USER_DATA_UPDATED_EVENT_NAME,
  updateGoal,
  upsertReflection,
} from "@/app/utils/storage";
import {
  buildDerivedScoreboard,
  getCycleEndDate,
  getDefaultScoreboard,
  getStartOfWeek,
  getTwelveWeekCurrentWeek,
  isTwelveWeekCycleReviewPhase,
  syncWeeklyPlans,
} from "@/app/utils/storage-twelve-week";
import type { TwelveWeekSystem as TwelveWeekSystemModel, UniversalWeeklyReview } from "@/app/utils/storage-types";
import { usePlanExecutionSync } from "@/features/plan12week/hooks";
import { useBackendSyncIssueState } from "@/features/plan12week/hooks/useBackendSyncIssueState";
import { useTwelveWeekManualCloudSync } from "@/features/plan12week/hooks/useTwelveWeekManualCloudSync";
import type { CycleSummary } from "@/features/plan12week/logic/cycleReview";
import { readMutationQueueStore, summarizeMutationQueueStore } from "@/features/plan12week/persistence/mutationQueue";
import { applyPulledWorkspaceToUserData } from "@/features/plan12week/persistence/pulledWorkspaceApply";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { celebrateLarge } from "@/lib/effects/celebrate";
import { claimCelebrationOnce, getCycleCelebrationStorageKey } from "@/lib/effects/celebrationTriggers";
import {
  TwelveWeekDashboardHeader,
  TwelveWeekDashboardState,
  TwelveWeekGoalSwitcher,
} from "./12WeekSystem/components";
import { buildBackendSyncKey, getLatestCheckIn, getSyncBadgeClass, getSyncBadgeLabel } from "./12WeekSystem/helpers";
import { useTwelveWeekBackendActions } from "./12WeekSystem/useTwelveWeekBackendActions";
import { useTwelveWeekBillingActions } from "./12WeekSystem/useTwelveWeekBillingActions";
import { useTwelveWeekExecutionActions } from "./12WeekSystem/useTwelveWeekExecutionActions";
import { useTwelveWeekSettingsActions } from "./12WeekSystem/useTwelveWeekSettingsActions";
import { useWeeklyReviewFormState } from "./12WeekSystem/useWeeklyReviewFormState";

// Import refactored subcomponents
import { TwelveWeekSystemDialogs } from "./12WeekSystem/TwelveWeekSystemDialogs";
import { TwelveWeekSystemNotices } from "./12WeekSystem/TwelveWeekSystemNotices";
import { TwelveWeekSystemTabs } from "./12WeekSystem/TwelveWeekSystemTabs";

const emptyMutationQueueSummary = {
  totalCount: 0,
  pendingCount: 0,
  inFlightCount: 0,
  failedOrRetryableCount: 0,
  succeededCount: 0,
  lastDrainStartedAt: null,
  lastDrainFinishedAt: null,
};

export const WEEKLY_REVIEW_SNOOZE_STORAGE_KEY = "weekly_review_snooze";
const WEEKLY_REVIEW_SNOOZE_MS = 24 * 60 * 60 * 1000;

function readWeeklyReviewSnoozeUntil(): number {
  if (typeof window === "undefined") return 0;

  const rawValue = window.localStorage.getItem(WEEKLY_REVIEW_SNOOZE_STORAGE_KEY);
  if (!rawValue) return 0;

  const numericValue = Number(rawValue);
  if (Number.isFinite(numericValue)) return numericValue;

  const parsedDateValue = Date.parse(rawValue);
  if (Number.isFinite(parsedDateValue)) return parsedDateValue;

  window.localStorage.removeItem(WEEKLY_REVIEW_SNOOZE_STORAGE_KEY);
  return 0;
}

function getCycleId(goalId: string, system: TwelveWeekSystemModel): string {
  return `${goalId}:cycle:${system.cycleNumber ?? 1}`;
}

function getLatestContinuingCommitments(system: TwelveWeekSystemModel): string[] {
  return [...system.weeklyReviews]
    .sort((left, right) => right.weekNumber - left.weekNumber)
    .flatMap((review) =>
      review.nextWeekCommitments?.length
        ? review.nextWeekCommitments
        : review.nextWeekPriority
          ? [review.nextWeekPriority]
          : [],
    )
    .map((commitment) => commitment.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function buildCycleReviewContent(input: {
  summary: CycleSummary;
  lessons: string[];
  continuingCommitments: string[];
}): string {
  const { summary, lessons, continuingCommitments } = input;
  return [
    `Lag cuối cycle: ${summary.finalLagPercent}%`,
    `Lead trung bình: ${summary.averageLeadScore}%`,
    `Tỷ lệ giữ cam kết: ${summary.commitmentsKeptRate}%`,
    `Số tuần đạt 85%+: ${summary.weeksWith85Plus}/12`,
    summary.biggestWins.length > 0 ? `Biggest wins:\n${summary.biggestWins.map((item) => `- ${item}`).join("\n")}` : "",
    summary.topAdjustments.length > 0
      ? `Top adjustments:\n${summary.topAdjustments.map((item) => `- ${item}`).join("\n")}`
      : "",
    lessons.length > 0 ? `3 bài học lớn nhất:\n${lessons.map((item) => `- ${item}`).join("\n")}` : "",
    continuingCommitments.length > 0
      ? `Cam kết tiếp tục:\n${continuingCommitments.map((item) => `- ${item}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function TwelveWeekSystem() {
  const navigate = useNavigate();
  const tabPanelId = useId();
  const [isCloudDeleteConfirmed, setIsCloudDeleteConfirmed] = useState(false);
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
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  useEffect(() => {
    if (isReady && activeGoal && localStorage.getItem("show_12week_setup_success") === "true") {
      setShowSuccessOverlay(true);
      localStorage.removeItem("show_12week_setup_success");
      const timer = setTimeout(() => {
        celebrateLarge();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isReady, activeGoal]);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [dismissedTriggerKind, setDismissedTriggerKind] = useState<string | null>(null);
  const [weeklyReviewSnoozeUntil, setWeeklyReviewSnoozeUntil] = useState(readWeeklyReviewSnoozeUntil);
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
  const aspirationalVisionSummary = getUserData().aspirationalVision?.summary ?? null;

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

  useEffect(() => {
    if (!reviewDueToday) return;
    const delayMs = weeklyReviewSnoozeUntil - Date.now() + 1;
    if (delayMs <= 0) return;

    const timer = window.setTimeout(
      () => {
        setWeeklyReviewSnoozeUntil(readWeeklyReviewSnoozeUntil());
      },
      Math.min(delayMs, 2_147_483_647),
    );

    return () => window.clearTimeout(timer);
  }, [reviewDueToday, weeklyReviewSnoozeUntil]);

  useEffect(() => {
    const handleRefresh = () => loadGoalData(activeGoalIdRef.current ?? undefined);
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === USER_DATA_STORAGE_KEY ||
        event.key.startsWith(`${USER_DATA_STORAGE_KEY}:auth:`)
      ) {
        handleRefresh();
      }
    };

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(USER_DATA_UPDATED_EVENT_NAME, handleRefresh);
    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(USER_DATA_UPDATED_EVENT_NAME, handleRefresh);
    };
  }, [loadGoalData]);

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

    const previousSystem = activeGoal.twelveWeekSystem;
    updateActiveSystemState(() => normalizedNextSystem);

    try {
      updateGoal(activeGoal.id, {
        twelveWeekSystem: normalizedNextSystem,
      });
    } catch (error) {
      if (previousSystem) {
        updateActiveSystemState(() => previousSystem);
      }
      throw error;
    }

    return normalizedNextSystem;
  };

  const handleRenameActiveGoal = (title: string) => {
    if (!activeGoal) return;
    const nextTitle = title.trim();
    if (!nextTitle || nextTitle === activeGoal.title.trim()) return;

    updateGoal(activeGoal.id, { title: nextTitle });
    loadGoalData(activeGoal.id);
    refreshSnapshotMeta();
    toastSuccess("Đã đổi tên mục tiêu.");
  };

  const markWeeklyReviewCompleted = () => {
    if (!system) return;

    const nowIso = new Date().toISOString();
    const scoreFromCompletion = Math.max(5, Math.round(weekCompletion.percent / 20));
    const fallbackReview: UniversalWeeklyReview = {
      weekNumber: currentWeek,
      leadCompletionPercent: weekCompletion.percent,
      lagProgressValue: currentLagMetricValue,
      biggestOutputThisWeek: "",
      mainObstacle: "",
      nextWeekPriority: "",
      workloadDecision: "keep same",
      reviewCompleted: true,
      progressScore: scoreFromCompletion,
      disciplineScore: scoreFromCompletion,
      focusScore: weekCompletion.percent >= 70 ? 8 : 6,
      improvementScore: 6,
      outputQualityScore: 6,
      completedLeadIndicators: weekCompletion.completed,
      commitmentsKept: [],
      commitmentsMissed: [],
      insights: "",
      nextWeekCommitments: [],
      executionScore: weekCompletion.percent,
      lastReviewAt: nowIso,
      reflection: "",
      adjustments: "",
    };
    const nextReview: UniversalWeeklyReview = {
      ...fallbackReview,
      ...(currentReview ?? {}),
      weekNumber: currentWeek,
      leadCompletionPercent: currentReview?.leadCompletionPercent ?? weekCompletion.percent,
      lagProgressValue: currentReview?.lagProgressValue ?? currentLagMetricValue,
      workloadDecision: currentReview?.workloadDecision || "keep same",
      reviewCompleted: true,
      completedLeadIndicators: currentReview?.completedLeadIndicators ?? weekCompletion.completed,
      executionScore: currentReview?.executionScore ?? weekCompletion.percent,
      lastReviewAt: nowIso,
    };
    const updatedReviews = [
      ...system.weeklyReviews.filter((review) => review.weekNumber !== currentWeek),
      nextReview,
    ].sort((left, right) => left.weekNumber - right.weekNumber);

    commitSystemUpdate({
      ...system,
      weeklyReviews: updatedReviews,
    });
  };

  const handleSnoozeWeeklyReview = () => {
    const snoozeUntil = Date.now() + WEEKLY_REVIEW_SNOOZE_MS;
    localStorage.setItem(WEEKLY_REVIEW_SNOOZE_STORAGE_KEY, String(snoozeUntil));
    setWeeklyReviewSnoozeUntil(snoozeUntil);
  };

  const shouldShowWeeklyReviewBanner = reviewDueToday && Date.now() > weeklyReviewSnoozeUntil;

  const isCycleReviewMode = Boolean(system && isTwelveWeekCycleReviewPhase(system));

  const handleSaveCycleReview = (input: { lessons: string[]; summary: CycleSummary }) => {
    if (!activeGoal || !system) return;
    const cycleId = getCycleId(activeGoal.id, system);
    const continuingCommitments = getLatestContinuingCommitments(system);
    const content = buildCycleReviewContent({
      summary: input.summary,
      lessons: input.lessons,
      continuingCommitments,
    });

    upsertReflection({
      date: formatDateInputValue(new Date()),
      title: `Cycle review - ${activeGoal.title} - cycle ${system.cycleNumber ?? 1}`,
      content,
      mood: input.summary.averageLeadScore >= 85 ? "happy" : input.summary.averageLeadScore >= 65 ? "neutral" : "sad",
      entryType: "cycleReview",
      linkedGoalId: activeGoal.id,
      cycleId,
      finalLagPercent: input.summary.finalLagPercent,
    });
    refreshSnapshotMeta();
    if (claimCelebrationOnce(getCycleCelebrationStorageKey(cycleId))) {
      celebrateLarge();
    }
    toastSuccess("Báo cáo cycle đã được lưu.");
  };

  const handleStartNewCycle = (input: { lessons: string[]; summary: CycleSummary }) => {
    if (!activeGoal || !system) return;

    handleSaveCycleReview(input);

    const totalWeeks = system.totalWeeks || 12;
    const nextStartDate = getStartOfWeek(new Date(), system.weekStartsOn ?? "Monday");
    const nextEndDate = getCycleEndDate(nextStartDate, totalWeeks);
    const nextStartKey = formatDateInputValue(nextStartDate);
    const nextEndKey = formatDateInputValue(nextEndDate);
    const nextCycleNumber = (system.cycleNumber ?? 1) + 1;
    const continuingCommitments = getLatestContinuingCommitments(system);
    const setupSuccessEvidence = [
      system.successEvidence,
      continuingCommitments.length > 0 ? `Tiếp tục: ${continuingCommitments.join("; ")}` : "",
      input.lessons.length > 0 ? `Bài học cycle trước: ${input.lessons.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const nextSystem: TwelveWeekSystemModel = {
      ...system,
      cycleNumber: nextCycleNumber,
      startDate: nextStartKey,
      endDate: nextEndKey,
      status: "active",
      currentWeek: 1,
      reentryCount: 0,
      weeklyPlans: syncWeeklyPlans(system.weeklyPlans, totalWeeks, system.week12Outcome).map((plan, index) => ({
        ...plan,
        completed: false,
        focus:
          index === 0 && continuingCommitments.length > 0
            ? `Tiếp tục: ${continuingCommitments.slice(0, 3).join("; ")}`
            : plan.focus,
      })),
      taskInstances: [],
      dailyCheckIns: [],
      weeklyReviews: [],
      scoreboard: getDefaultScoreboard(totalWeeks),
    };

    const focusArea = activeGoal.focusArea || activeGoal.category || "Career";
    localStorage.setItem(APP_STORAGE_KEYS.selectedFocusArea, focusArea);
    localStorage.setItem(
      APP_STORAGE_KEYS.pendingSmartGoal,
      JSON.stringify({
        focusArea,
        specific: activeGoal.title,
        measurable:
          `${system.lagMetric.name || "Chỉ số kết quả chính"} đạt ${system.lagMetric.target || "mục tiêu"} ${system.lagMetric.unit || ""}`.trim(),
        achievable: "Dùng lại nhịp đã học từ cycle trước và chỉnh tải theo bài học mới.",
        relevant: activeGoal.description || system.vision12Week,
        timeBound: "Trong 12 tuần tới",
      }),
    );
    localStorage.setItem(
      APP_STORAGE_KEYS.pendingFeasibilityResult,
      JSON.stringify({
        resultType: "realistic",
        resultTitle: "Sẵn sàng cho cycle mới",
        resultSummary: "Cycle trước đã có dữ liệu thực tế để tinh chỉnh nhịp tiếp theo.",
        recommendation: "Giữ các tactic còn hiệu quả, giảm phần thường bị bỏ lỡ và bắt đầu lại từ tuần 1.",
        readinessScore: 16,
        adjustedScore: 16,
        wheelScore: 7,
        planLoad: system.tacticLoadPreference ?? "balanced",
      }),
    );
    localStorage.setItem(
      APP_STORAGE_KEYS.pending12WeekSetupDraft,
      JSON.stringify({
        templateId: system.templateId ?? "",
        goalType: system.goalType,
        vision12Week: system.vision12Week,
        week12Outcome: system.week12Outcome,
        lagMetricName: system.lagMetric.name,
        lagMetricTarget: system.lagMetric.target,
        lagMetricUnit: system.lagMetric.unit,
        leadIndicators: system.leadIndicators.map((indicator, index) => ({
          id: indicator.id ?? `cycle_${nextCycleNumber}_indicator_${index + 1}`,
          name: indicator.name,
          target: indicator.target || "1",
          unit: indicator.unit || "lần/tuần",
          type: indicator.type === "optional" ? "optional" : "core",
          cadence: "spread",
        })),
        startDate: nextStartKey,
        reviewDay: system.reviewDay,
        tacticLoadPreference: system.tacticLoadPreference ?? "balanced",
        week4Milestone: system.milestones.week4,
        week8Milestone: system.milestones.week8,
        successEvidence: setupSuccessEvidence,
        dailyTimeBudget: "",
        preferredDays: system.preferredDays ?? [],
        personalConstraint: system.personalConstraint ?? "",
      }),
    );

    updateGoal(activeGoal.id, {
      twelveWeekSystem: nextSystem,
      deadline: nextEndKey,
    });
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, activeGoal.id);
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, activeGoal.id);
    const savedSystem = getUserData().goals.find((goal) => goal.id === activeGoal.id)?.twelveWeekSystem;
    if (savedSystem) {
      updateActiveSystemState(() => savedSystem);
    }
    refreshSnapshotMeta();
    loadGoalData(activeGoal.id);
    toastSuccess("Cycle mới đã sẵn sàng.", {
      description: "Mục tiêu cũ được giữ nguyên, nhịp tuần đã reset về tuần 1 và Setup đã có pre-fill từ cycle trước.",
    });
    navigate("/12-week-setup");
  };

  useEffect(() => {
    if (activeTab !== "progress") {
      setShowFullProgress(false);
    }
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/12-week-system?tab=${value}`, { replace: true });

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
    handleTimeBlocksChange,
    handlePreferenceToggle,
    handleArchivePendingOutbox,
    handleOutboxItemToggle,
    handleRestoreArchivedOutbox,
    handleOpenReminder,
    handleExportLocalData,
    handleExportCloudWorkspace,
    handleDeleteCloudWorkspace,
    handleConfirmDeleteCloudWorkspace,
    isDeleteCloudDialogOpen,
    setIsDeleteCloudDialogOpen,
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

  useEffect(() => {
    if (!isDeleteCloudDialogOpen) {
      setIsCloudDeleteConfirmed(false);
    }
  }, [isDeleteCloudDialogOpen]);

  useScrollToTopOnChange(activeTab, {
    targetRef: tabsTopRef,
    focus: false,
    enabled:
      isReady && Boolean(activeGoal && system) && !isUpgradeDialogOpen && !isResetDialogOpen && !isClearLocalDialogOpen,
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
  }, [activeGoal, activePlanCode, activeTab, currentWeek, hasCurrentReview, hasTodayTasks, isReady, system]);

  const syncIssueState = useBackendSyncIssueState({
    backendConnectionStatus,
    lastBackendHydrationResult,
    failedOrRetryableCount: mutationQueueSummary.failedOrRetryableCount,
    error: backendSyncError,
  });
  const hasBackendSyncIssue = syncIssueState.visible;
  const backendSyncIssueMessage = syncIssueState.message;
  const syncBadgeClass = getSyncBadgeClass(backendConnectionStatus);
  const syncBadgeLabel = syncIssueState.isTransient ? "Đang thử lại…" : getSyncBadgeLabel(backendConnectionStatus);

  useEffect(() => {
    const localSystem = activeGoal?.twelveWeekSystem ?? null;
    if (!isBackendProfileReady || !activeGoal || !localSystem) return;
    const hasPendingBackendConflict = lastBackendHydrationResult?.conflicts.some(
      (conflict: { goalId: string }) => conflict.goalId === activeGoal.id,
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
      <div className="ops-shell ops-system pb-28 md:pb-4 space-y-6 mx-auto max-w-6xl px-4 pt-8">
        {/* Header Skeleton */}
        <div className="border border-app-line/40 bg-gradient-to-br from-app-surface via-app-surface to-app-accent-soft/10 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-24 rounded-md animate-pulse bg-app-bg" />
                <Skeleton className="h-5 w-28 rounded-md animate-pulse bg-app-bg" />
                <Skeleton className="h-5 w-32 rounded-full animate-pulse bg-app-bg" />
              </div>
              <Skeleton className="h-7 w-3/4 animate-pulse bg-app-bg rounded-lg" />
              <Skeleton className="h-4 w-1/3 animate-pulse bg-app-bg rounded-md" />
            </div>
            {/* Action buttons skeleton */}
            <div className="flex gap-2 pt-1 sm:pt-0 shrink-0">
              <Skeleton className="h-9 w-32 rounded-xl animate-pulse bg-app-bg" />
              <Skeleton className="h-9 w-24 rounded-xl animate-pulse bg-app-bg" />
            </div>
          </div>
        </div>

        {/* Goal Switcher Skeleton */}
        <div className="border border-app-line/40 bg-app-surface rounded-2xl p-3 shadow-xs">
          <Skeleton className="h-6 w-48 animate-pulse bg-app-bg rounded-lg" />
        </div>

        {/* Navigation Tabs Skeleton */}
        <div className="inline-flex gap-2 bg-app-bg/60 p-1 border border-app-line/40 rounded-2xl backdrop-blur-md">
          <Skeleton className="h-9 w-24 rounded-xl animate-pulse bg-app-bg" />
          <Skeleton className="h-9 w-24 rounded-xl animate-pulse bg-app-bg" />
          <Skeleton className="h-9 w-24 rounded-xl animate-pulse bg-app-bg" />
          <Skeleton className="h-9 w-24 rounded-xl animate-pulse bg-app-bg" />
        </div>

        {/* Tab Content Today Skeleton */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main Today Tasks Column */}
          <div className="space-y-4">
            <div className="border border-app-line/40 bg-app-surface rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-32 animate-pulse bg-app-bg rounded-lg" />
                <Skeleton className="h-4 w-20 animate-pulse bg-app-bg rounded-md" />
              </div>
              {/* Today list of tasks */}
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 border border-app-line/40 p-4 rounded-xl">
                    <Skeleton className="h-5 w-5 rounded-md animate-pulse bg-app-bg" />
                    <Skeleton className="h-5 flex-1 animate-pulse bg-app-bg rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar: Mood & Note Check-in */}
          <div className="space-y-4">
            <div className="border border-app-line/40 bg-app-surface rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
              <Skeleton className="h-6 w-40 animate-pulse bg-app-bg rounded-lg" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-12 w-full rounded-xl animate-pulse bg-app-bg" />
                <Skeleton className="h-12 w-full rounded-xl animate-pulse bg-app-bg" />
                <Skeleton className="h-12 w-full rounded-xl animate-pulse bg-app-bg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 animate-pulse bg-app-bg rounded-md" />
                <Skeleton className="h-20 w-full rounded-xl animate-pulse bg-app-bg" />
              </div>
              <Skeleton className="h-10 w-32 rounded-xl animate-pulse bg-app-bg" />
            </div>
          </div>
        </div>
      </div>
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
            "Chọn lĩnh vực ưu tiên từ Góc nhìn cuộc sống.",
            "Viết mục tiêu SMART và kiểm tra tính thực tế.",
            "Chốt việc giữ nhịp, chỉ số và ngày review tuần.",
          ].map((item, index) => (
            <div
              key={item}
              className="rounded-lg border border-app-line bg-app-bg px-4 py-3 text-sm leading-5 text-app-ink-soft"
            >
              <span className="mr-2 font-medium text-app-ink">0{index + 1}</span>
              {item}
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-lg bg-app-accent px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
            onClick={() => navigate("/life-insight")}
          >
            Tạo mục tiêu 12 tuần
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-lg border border-app-line bg-app-surface px-5 py-2.5 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
            onClick={() => navigate("/goals")}
          >
            Mở mục tiêu đã có
          </button>
        </div>
      </TwelveWeekDashboardState>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 relative">
      {/* Decorative dreamy gradient blobs for execution center feeling */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-80 h-80 bg-app-accent-soft/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute top-1/3 right-1/4 translate-x-1/2 w-96 h-96 bg-app-warm-soft/15 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" style={{ animationDuration: "12s" }} />

      {/* 1. Subcomponent Dialogs Container */}
      <TwelveWeekSystemDialogs
        isUpgradeDialogOpen={isUpgradeDialogOpen}
        setIsUpgradeDialogOpen={setIsUpgradeDialogOpen}
        upgradeContext={upgradeContext}
        activePlanCode={activePlanCode}
        activeGoal={activeGoal}
        upgradeRecommendedPlan={upgradeRecommendedPlan}
        activeTab={activeTab}
        handleCheckoutComplete={handleCheckoutComplete}
        isResetDialogOpen={isResetDialogOpen}
        setIsResetDialogOpen={setIsResetDialogOpen}
        handleResetCycle={handleResetCycle}
        isClearLocalDialogOpen={isClearLocalDialogOpen}
        setIsClearLocalDialogOpen={setIsClearLocalDialogOpen}
        handleClearLocalSignals={handleClearLocalSignals}
        isDeleteCloudDialogOpen={isDeleteCloudDialogOpen}
        setIsDeleteCloudDialogOpen={setIsDeleteCloudDialogOpen}
        isCloudDeleteConfirmed={isCloudDeleteConfirmed}
        setIsCloudDeleteConfirmed={setIsCloudDeleteConfirmed}
        handleConfirmDeleteCloudWorkspace={handleConfirmDeleteCloudWorkspace}
        isDeleteDataDialogOpen={isDeleteDataDialogOpen}
        setIsDeleteDataDialogOpen={setIsDeleteDataDialogOpen}
        demoMode={demoMode}
        isSignedIn={Boolean(user)}
        handleDeleteAllData={handleDeleteAllData}
        isDeletingData={isDeletingData}
      />

      <div className="space-y-5">
        {/* 2. Page Header component */}
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
          reviewStatusLabel={reviewStatusLabel}
          firstPriorityTask={firstPriorityTask}
          onOpenFocusTab={() => handleTabChange(reviewDueToday ? "week" : "today")}
          onOpenGoals={() => navigate("/goals")}
          onRenameGoal={handleRenameActiveGoal}
        />

        {/* 3. Goal Switcher select list */}
        <TwelveWeekGoalSwitcher allGoals={allGoals} activeGoalId={activeGoal.id} onLoadGoal={loadGoalData} />

        {/* 4. Subcomponent Notifications & Notices Container */}
        <TwelveWeekSystemNotices
          navigate={navigate}
          handleTabChange={handleTabChange}
          setActiveTab={setActiveTab}
          activePlanCode={activePlanCode}
          shouldShowWeeklyReviewBanner={shouldShowWeeklyReviewBanner}
          markWeeklyReviewCompleted={markWeeklyReviewCompleted}
          handleSnoozeWeeklyReview={handleSnoozeWeeklyReview}
          hasIncompletePlanStructure={hasIncompletePlanStructure}
          planHasNoLeadMetrics={planHasNoLeadMetrics}
          planHasNoTasks={planHasNoTasks}
          hasBackendSyncIssue={hasBackendSyncIssue}
          backendSyncIssueMessage={backendSyncIssueMessage}
          isBackendSyncing={isBackendSyncing}
          handleRunOutboxSync={handleRunOutboxSync}
          activeTriggers={activeTriggers}
          dismissedTriggerKind={dismissedTriggerKind}
          setDismissedTriggerKind={setDismissedTriggerKind}
          handleOpenUpgradeDialog={handleOpenUpgradeDialog}
        />
      </div>

      {/* 5. Subcomponent Tabs and Main Tab Panels Container */}
      <TwelveWeekSystemTabs
        activeTab={activeTab}
        handleTabChange={handleTabChange}
        setActiveTab={setActiveTab}
        tabPanelId={tabPanelId}
        isCycleReviewMode={isCycleReviewMode}
        activeGoal={activeGoal}
        system={system}
        handleSaveCycleReview={handleSaveCycleReview}
        handleStartNewCycle={handleStartNewCycle}
        handleRenameActiveGoal={handleRenameActiveGoal}
        aspirationalVisionSummary={aspirationalVisionSummary}
        currentWeek={currentWeek}
        currentWeekRange={currentWeekRange}
        currentPlanFocus={currentPlanFocus}
        currentPlanMilestone={currentPlanMilestone}
        reviewDueToday={reviewDueToday}
        reviewStatusLabel={reviewStatusLabel}
        currentWeekScoreValue={currentWeekScoreValue}
        weekCompletion={weekCompletion}
        coreTacticCount={coreTacticCount}
        optionalTacticCount={optionalTacticCount}
        missedTasks={missedTasks}
        todayQueue={todayQueue}
        currentWeekOpenTasks={currentWeekOpenTasks}
        todayDateKey={todayDateKey}
        todayCompletedCount={todayCompletedCount}
        todayRemainingCount={todayRemainingCount}
        overdueOpenCount={overdueOpenCount}
        optionalOpenThisWeekCount={optionalOpenThisWeekCount}
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
        onDailyMoodChange={(mood) => setDailyMood(mood)}
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
        currentLagMetricValue={currentLagMetricValue}
        coreIndicators={coreIndicators}
        optionalIndicators={optionalIndicators}
        activePlanCode={activePlanCode}
        hasPremiumReviewInsights={hasPremiumReviewInsights}
        premiumReviewInsight={premiumReviewInsight}
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
        nextWeekRecommendation={nextWeekRecommendation}
        onAcceptNextWeekRecommendation={handleApplySuggestedPlan}
        weeklyReflectionInsights={weeklyReflectionInsights}
        showFullProgress={showFullProgress}
        setShowFullProgress={setShowFullProgress}
        averageScore={averageScore}
        reviewDoneCount={reviewDoneCount}
        milestoneItems={milestoneItems}
        hasAdvancedAnalytics={hasAdvancedAnalytics}
        executionHeatmap={executionHeatmap}
        weeklyTrend={weeklyTrend}
        tacticBreakdown={tacticBreakdown}
        executionInsights={executionInsights}
        navigate={navigate}
        backendConnectionStatus={backendConnectionStatus}
        activeEntitlementKeys={activeEntitlementKeys}
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
        handleReviewDayChange={handleReviewDayChange}
        handleReminderTimeChange={handleReminderTimeChange}
        handleLoadPreferenceChange={handleLoadPreferenceChange}
        handleStatusChange={handleStatusChange}
        handleTacticPriorityChange={handleTacticPriorityChange}
        handleTacticTypeChange={handleTacticTypeChange}
        handleTimeBlocksChange={handleTimeBlocksChange}
        handlePreferenceToggle={handlePreferenceToggle}
        handleArchivePendingOutbox={handleArchivePendingOutbox}
        handleRestoreArchivedOutbox={handleRestoreArchivedOutbox}
        handleOpenReminder={handleOpenReminder}
        handleExportLocalData={handleExportLocalData}
        handleExportCloudWorkspace={handleExportCloudWorkspace}
        handleDeleteCloudWorkspace={handleDeleteCloudWorkspace}
        handleBrowserNotificationToggle={handleBrowserNotificationToggle}
        handleRunOutboxSync={handleRunOutboxSync}
        handleOutboxItemToggle={handleOutboxItemToggle}
        handleClearEventLog={() => {
          clearEventLog();
          refreshSnapshotMeta();
        }}
        handleClearArchivedOutbox={() => {
          clearArchivedOutbox();
          refreshSnapshotMeta();
        }}
        setIsClearLocalDialogOpen={setIsClearLocalDialogOpen}
        handleDeleteAllData={handleDeleteAllData}
        setIsDeleteDataDialogOpen={setIsDeleteDataDialogOpen}
        setIsResetDialogOpen={setIsResetDialogOpen}
        handleOpenUpgradeDialog={handleOpenUpgradeDialog}
        handleSyncEntitlements={handleSyncEntitlements}
        handleRestorePlanAccess={handleRestorePlanAccess}
        handleHydrateBackendPlans={handleHydrateBackendPlans}
        handleRunMutationQueueSync={handleRunMutationQueueSync}
        handleKeepLocalPlanForConflicts={handleKeepLocalPlanForConflicts}
        handleUseBackendPlanForConflicts={handleUseBackendPlanForConflicts}
        handleUseCloudVersion={handleUseCloudVersion}
        handleOpenBillingPortal={handleOpenBillingPortal}
      />

      {/* Success Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-app-ink/40 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-app-surface border border-app-line rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative overflow-hidden animate-scale-up">
            {/* Decorative soft gradient blobs inside the card */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-app-accent-soft/20 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-app-warm-soft/20 rounded-full blur-xl pointer-events-none" />
            
            {/* Washi Tape effect */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-20 h-5 bg-app-accent/15 backdrop-blur-[1px] rotate-[-1deg] border border-dashed border-app-accent/20" />
            
            {/* Celebrate Icon */}
            <div className="mx-auto mt-4 mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-app-accent-soft text-app-accent animate-bounce">
              <span className="text-3xl" role="img" aria-label="party popper">🎉</span>
            </div>

            <h2 className="font-serif text-2xl font-semibold text-app-ink">
              Thiết lập kế hoạch thành công!
            </h2>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-app-accent">
              12 TUẦN HÀNH ĐỘNG BẮT ĐẦU TỪ HÔM NAY
            </p>

            <div className="my-4 p-3 rounded-xl bg-app-bg-subtle/50 border border-app-line/40 text-left">
              <p className="text-[9px] font-bold text-app-ink-muted uppercase">Mục tiêu của bạn:</p>
              <p className="mt-0.5 text-xs font-semibold leading-snug text-app-ink break-words line-clamp-2">
                {activeGoal?.title}
              </p>
            </div>

            {/* KHU VỰC CHỈ DẪN: Bây giờ bạn cần làm gì */}
            <div className="my-5 space-y-3.5 text-left border-t border-b border-app-line/60 py-4">
              <p className="text-xs font-bold text-app-ink flex items-center gap-1.5 select-none">
                <span>📌</span>
                <span>Bây giờ bạn cần làm gì tiếp theo?</span>
              </p>
              
              <div className="space-y-3">
                <div className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent text-[10px] font-extrabold select-none">1</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-app-ink leading-tight">Nhận nhiệm vụ ngày</p>
                    <p className="mt-0.5 text-[10px] text-app-ink-soft leading-relaxed">
                      Vào ngay tab <span className="font-bold">"Hôm nay"</span> để xem các hành động lặp lại cần hoàn thành trong ngày.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent text-[10px] font-extrabold select-none">2</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-app-ink leading-tight">Tích lũy điểm kỷ luật</p>
                    <p className="mt-0.5 text-[10px] text-app-ink-soft leading-relaxed">
                      Đánh dấu tích xanh mỗi khi hoàn thành việc lặp lại hằng ngày để giữ nhịp kỷ luật đều đặn.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent text-[10px] font-extrabold select-none">3</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-app-ink leading-tight">Nhìn lại &amp; Chấm điểm tuần</p>
                    <p className="mt-0.5 text-[10px] text-app-ink-soft leading-relaxed">
                      Gặp nhau vào ngày <span className="font-bold underline">{
                        system?.reviewDay === "Sunday" ? "Chủ Nhật" :
                        system?.reviewDay === "Saturday" ? "Thứ Bảy" : 
                        system?.reviewDay === "Friday" ? "Thứ Sáu" :
                        system?.reviewDay === "Monday" ? "Thứ Hai" :
                        "Cuối tuần"
                      }</span> để chấm điểm tự phản tư, điều chỉnh nhịp tuần tới.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full bg-app-accent hover:bg-app-accent-hover text-white font-bold py-3 px-5 rounded-xl shadow-md active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: "var(--color-accent)" }}
              onClick={() => {
                setShowSuccessOverlay(false);
                handleTabChange("today");
              }}
            >
              Bắt đầu hành động hôm nay 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

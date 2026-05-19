import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";

import { useBackendProgressOverlay } from "./useBackendProgressOverlay";
import type { BillingActionSnapshot, BillingProviderStatus } from "../utils/billing-contract";
import type { BrowserNotificationStatus, OutboxSyncSnapshot } from "../utils/production";
import {
  getBillingProviderStatus,
  getBrowserNotificationStatus,
  getLastEntitlementSyncSnapshot,
  getLastOutboxSyncSnapshot,
  getLastRestoreAccessSnapshot,
} from "../utils/production";
import {
  APP_STORAGE_KEYS,
  type AppPreferences,
  type EntitlementKey,
  type FunnelStepSummary,
  type Goal,
  type InAppReminder,
  type PricingPlanCode,
  type SyncOutboxItem,
  type TwelveWeekSystem,
  getActiveTwelveWeekGoal,
  getCurrentEntitlementKeys,
  getCurrentPlan,
  getInAppReminders,
  getReviewDayLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekFunnelSummary,
  getTwelveWeekMissedTasks,
  getTwelveWeekMonetizationSummary,
  getTwelveWeekTasksForWeek,
  getTwelveWeekTodayTasks,
  getTwelveWeekWeekCompletion,
  getTwelveWeekWeekRange,
  getUserData,
  hasEntitlement,
  isTwelveWeekReviewDueToday,
  sortTwelveWeekGoalsForSelection,
} from "../utils/storage";
import {
  buildExecutionHeatmap,
  buildRescuePlanSummary,
  buildTacticBreakdown,
  buildWeeklyTrend,
  dedupeTasks,
  evaluateRescueTriggers,
  getLatestDailyCheckIn,
} from "../utils/twelve-week-system-ui";
import { buildSuggestedNextWeekPlan, buildWeeklyReviewPremiumInsight } from "../utils/twelve-week-premium";
import { formatDateInputValue, getCalendarDateKey } from "../utils/storage";
import {
  getExecutionInsights,
  getNextWeekAdjustmentRecommendation,
  getRescueModeStatus,
  getWeeklyReflectionInsights,
  type ExecutionInsight,
  type NextWeekRecommendation,
  type RescueModeStatus,
} from "@/features/plan12week/logic";

const DEFAULT_WEEK_FOCUS = "Giữ nhịp tactic cốt lõi và tạo ra một đầu ra thật rõ ràng.";

export function useTwelveWeekSystemSnapshot() {
  const location = useLocation();
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [allGoals, setAllGoals] = useState<Goal[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [activePlanCode, setActivePlanCode] = useState<PricingPlanCode>(getCurrentPlan());
  const [activeEntitlementKeys, setActiveEntitlementKeys] = useState<EntitlementKey[]>(getCurrentEntitlementKeys());
  const [appPreferences, setAppPreferences] = useState<AppPreferences>(getUserData().appPreferences);
  const [activeReminders, setActiveReminders] = useState<InAppReminder[]>([]);
  const [recentOutboxItems, setRecentOutboxItems] = useState<SyncOutboxItem[]>([]);
  const [funnelSteps, setFunnelSteps] = useState<FunnelStepSummary[]>([]);
  const [monetizationSteps, setMonetizationSteps] = useState<FunnelStepSummary[]>([]);
  const [billingProviderStatus, setBillingProviderStatus] = useState<BillingProviderStatus>(getBillingProviderStatus());
  const [browserNotificationStatus, setBrowserNotificationStatus] = useState<BrowserNotificationStatus>(
    getBrowserNotificationStatus(),
  );
  const [lastSyncSnapshot, setLastSyncSnapshot] = useState<OutboxSyncSnapshot | null>(getLastOutboxSyncSnapshot());
  const [lastEntitlementSyncSnapshot, setLastEntitlementSyncSnapshot] = useState<BillingActionSnapshot | null>(
    getLastEntitlementSyncSnapshot(),
  );
  const [lastRestoreAccessSnapshot, setLastRestoreAccessSnapshot] = useState<BillingActionSnapshot | null>(
    getLastRestoreAccessSnapshot(),
  );
  const [pendingOutboxCount, setPendingOutboxCount] = useState(0);
  const [archivedOutboxCount, setArchivedOutboxCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [activeSubscription, setActiveSubscription] = useState<
    import("../utils/storage-types").Subscription | null | undefined
  >(null);

  const loadGoalData = useCallback((preferredGoalId?: string) => {
    const data = getUserData();
    const goalsWithSystem = sortTwelveWeekGoalsForSelection(data.goals);
    const selectedGoal =
      getActiveTwelveWeekGoal(
        data.goals,
        preferredGoalId ??
          localStorage.getItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId) ??
          localStorage.getItem(APP_STORAGE_KEYS.latest12WeekGoalId),
      ) ?? null;

    setAllGoals(goalsWithSystem);
    setActiveGoal(selectedGoal);
    setAppPreferences(data.appPreferences);
    setActiveReminders(getInAppReminders());
    setEventCount(data.eventLog.length);
    setPendingOutboxCount(data.syncOutbox.filter((item) => item.status === "pending").length);
    setArchivedOutboxCount(
      data.syncOutbox.filter((item) => item.status === "archived" || item.status === "sent" || item.status === "failed")
        .length,
    );
    setRecentOutboxItems(data.syncOutbox.slice(0, 3));
    setFunnelSteps(getTwelveWeekFunnelSummary(selectedGoal?.id));
    setMonetizationSteps(getTwelveWeekMonetizationSummary(selectedGoal?.id));
    setBillingProviderStatus(getBillingProviderStatus());
    setBrowserNotificationStatus(getBrowserNotificationStatus());
    setLastSyncSnapshot(getLastOutboxSyncSnapshot());
    setLastEntitlementSyncSnapshot(getLastEntitlementSyncSnapshot());
    setLastRestoreAccessSnapshot(getLastRestoreAccessSnapshot());
    setActivePlanCode(getCurrentPlan(data));
    setActiveEntitlementKeys(getCurrentEntitlementKeys(data));
    setActiveSubscription(data.subscription);

    if (selectedGoal) {
      localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, selectedGoal.id);
      localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, selectedGoal.id);
    }

    setIsReady(true);
  }, []);

  const updateActiveGoalState = useCallback((updater: (goal: Goal) => Goal) => {
    setActiveGoal((previousGoal) => {
      if (!previousGoal) return previousGoal;
      const nextGoal = updater(previousGoal);
      setAllGoals((previousGoals) => previousGoals.map((goal) => (goal.id === nextGoal.id ? nextGoal : goal)));
      return nextGoal;
    });
  }, []);

  const updateActiveSystemState = useCallback(
    (updater: (system: TwelveWeekSystem) => TwelveWeekSystem) => {
      updateActiveGoalState((goal) => {
        if (!goal.twelveWeekSystem) return goal;
        return {
          ...goal,
          twelveWeekSystem: updater(goal.twelveWeekSystem),
        };
      });
    },
    [updateActiveGoalState],
  );

  const refreshSnapshotMeta = useCallback(() => {
    const data = getUserData();
    const selectedGoalId = activeGoal?.id;

    setAppPreferences(data.appPreferences);
    setActiveReminders(getInAppReminders());
    setEventCount(data.eventLog.length);
    setPendingOutboxCount(data.syncOutbox.filter((item) => item.status === "pending").length);
    setArchivedOutboxCount(
      data.syncOutbox.filter((item) => item.status === "archived" || item.status === "sent" || item.status === "failed")
        .length,
    );
    setRecentOutboxItems(data.syncOutbox.slice(0, 3));
    setFunnelSteps(getTwelveWeekFunnelSummary(selectedGoalId));
    setMonetizationSteps(getTwelveWeekMonetizationSummary(selectedGoalId));
    setBillingProviderStatus(getBillingProviderStatus());
    setBrowserNotificationStatus(getBrowserNotificationStatus());
    setLastSyncSnapshot(getLastOutboxSyncSnapshot());
    setLastEntitlementSyncSnapshot(getLastEntitlementSyncSnapshot());
    setLastRestoreAccessSnapshot(getLastRestoreAccessSnapshot());
    setActivePlanCode(getCurrentPlan(data));
    setActiveEntitlementKeys(getCurrentEntitlementKeys(data));
    setActiveSubscription(data.subscription);
  }, [activeGoal?.id]);

  useEffect(() => {
    loadGoalData();
  }, [loadGoalData]);

  useEffect(() => {
    const nextTab = new URLSearchParams(location.search).get("tab");
    if (nextTab === "today" || nextTab === "week" || nextTab === "progress" || nextTab === "settings") {
      setActiveTab(nextTab);
    }
  }, [location.search]);

  const system = activeGoal?.twelveWeekSystem ?? null;
  const {
    effectiveSystem,
    refresh: refreshBackendProgressOverlay,
    invalidateOverlay,
  } = useBackendProgressOverlay(activeGoal?.id ?? null, system);

  const currentWeek = useMemo(
    () => (effectiveSystem ? getTwelveWeekCurrentWeek(effectiveSystem) : 1),
    [effectiveSystem],
  );

  const currentWeekRange = useMemo(
    () => (effectiveSystem ? getTwelveWeekWeekRange(effectiveSystem, currentWeek) : null),
    [effectiveSystem, currentWeek],
  );

  const currentWeekTasks = useMemo(
    () => (effectiveSystem ? getTwelveWeekTasksForWeek(effectiveSystem, currentWeek) : []),
    [effectiveSystem, currentWeek],
  );

  const scheduledTodayTasks = useMemo(
    () => (effectiveSystem ? getTwelveWeekTodayTasks(effectiveSystem) : []),
    [effectiveSystem],
  );

  const missedTasks = useMemo(
    () => (effectiveSystem ? getTwelveWeekMissedTasks(effectiveSystem) : []),
    [effectiveSystem],
  );

  const snapshotTodayDateKey = useMemo(() => formatDateInputValue(new Date()), []);

  const completedTodayTasks = useMemo(
    () =>
      currentWeekTasks.filter(
        (task) =>
          task.completed && !task.skipped && getCalendarDateKey(task.completedAt || "") === snapshotTodayDateKey,
      ),
    [currentWeekTasks, snapshotTodayDateKey],
  );

  const fallbackTasks = useMemo(
    () => currentWeekTasks.filter((task) => !task.completed).slice(0, 3),
    [currentWeekTasks],
  );

  const todayQueue = useMemo(
    () =>
      dedupeTasks([
        ...missedTasks.slice(0, 2),
        ...completedTodayTasks,
        ...(scheduledTodayTasks.length > 0 ? scheduledTodayTasks : fallbackTasks),
      ]),
    [missedTasks, completedTodayTasks, scheduledTodayTasks, fallbackTasks],
  );

  const weekCompletion = useMemo(
    () =>
      effectiveSystem
        ? getTwelveWeekWeekCompletion(effectiveSystem, currentWeek)
        : { completed: 0, total: 0, percent: 0 },
    [effectiveSystem, currentWeek],
  );

  const currentReview = useMemo(
    () => effectiveSystem?.weeklyReviews.find((review) => review.weekNumber === currentWeek) ?? null,
    [effectiveSystem, currentWeek],
  );

  const currentScore = useMemo(
    () => effectiveSystem?.scoreboard.find((week) => week.weekNumber === currentWeek) ?? null,
    [effectiveSystem, currentWeek],
  );

  const currentPlan = useMemo(
    () => effectiveSystem?.weeklyPlans.find((plan) => plan.weekNumber === currentWeek) ?? null,
    [effectiveSystem, currentWeek],
  );

  const currentPlanFocus = useMemo(() => currentPlan?.focus ?? DEFAULT_WEEK_FOCUS, [currentPlan]);

  const currentPlanMilestone = useMemo(() => currentPlan?.milestone ?? "", [currentPlan]);

  const currentLagMetricValue = useMemo(
    () => currentReview?.lagProgressValue || effectiveSystem?.lagMetric.currentValue || "",
    [currentReview, effectiveSystem],
  );

  const latestCheckIn = useMemo(() => getLatestDailyCheckIn(activeGoal), [activeGoal]);

  const reviewDoneCount = useMemo(
    () => effectiveSystem?.scoreboard.filter((week) => week.reviewDone).length ?? 0,
    [effectiveSystem],
  );

  const coreTacticCount = useMemo(
    () =>
      effectiveSystem ? effectiveSystem.leadIndicators.filter((indicator) => indicator.type !== "optional").length : 0,
    [effectiveSystem],
  );

  const optionalTacticCount = useMemo(
    () =>
      effectiveSystem ? effectiveSystem.leadIndicators.filter((indicator) => indicator.type === "optional").length : 0,
    [effectiveSystem],
  );

  const todayCompletedCount = useMemo(() => todayQueue.filter((task) => task.completed).length, [todayQueue]);

  const todayRemainingCount = useMemo(() => todayQueue.filter((task) => !task.completed).length, [todayQueue]);

  const overdueOpenCount = useMemo(() => missedTasks.filter((task) => !task.completed).length, [missedTasks]);

  const currentWeekOpenTasks = useMemo(() => currentWeekTasks.filter((task) => !task.completed), [currentWeekTasks]);

  const optionalOpenThisWeekCount = useMemo(
    () => currentWeekOpenTasks.filter((task) => !task.isCore).length,
    [currentWeekOpenTasks],
  );

  const openTodayTasks = useMemo(() => todayQueue.filter((task) => !task.completed), [todayQueue]);

  const firstPriorityTask = useMemo(() => openTodayTasks[0] ?? null, [openTodayTasks]);

  const secondaryTodayTasks = useMemo(() => openTodayTasks.slice(1), [openTodayTasks]);

  const averageScore = useMemo(() => {
    if (!effectiveSystem || effectiveSystem.scoreboard.length === 0) return 0;
    return Math.round(
      effectiveSystem.scoreboard.reduce((sum, week) => sum + week.weeklyScore, 0) / effectiveSystem.scoreboard.length,
    );
  }, [effectiveSystem]);

  const reviewDueToday = useMemo(
    () => Boolean(effectiveSystem && isTwelveWeekReviewDueToday(effectiveSystem)),
    [effectiveSystem],
  );

  const currentWeekScoreValue = useMemo(
    () => currentScore?.weeklyScore ?? weekCompletion.percent,
    [currentScore, weekCompletion.percent],
  );

  const reviewStatusLabel = useMemo(
    () =>
      reviewDueToday ? "Đến hạn hôm nay" : `Review vào ${getReviewDayLabel(effectiveSystem?.reviewDay ?? "Sunday")}`,
    [reviewDueToday, effectiveSystem],
  );

  const coreIndicators = useMemo(
    () => effectiveSystem?.leadIndicators.filter((indicator) => indicator.type !== "optional") ?? [],
    [effectiveSystem],
  );

  const optionalIndicators = useMemo(
    () => effectiveSystem?.leadIndicators.filter((indicator) => indicator.type === "optional") ?? [],
    [effectiveSystem],
  );

  const hasSmartRescue = useMemo(() => hasEntitlement("priority_reminders"), []);

  const rescuePlanSummary = useMemo(
    () => buildRescuePlanSummary({ missedTasks, currentWeekTasks }),
    [missedTasks, currentWeekTasks],
  );

  const activeTriggers = useMemo(
    () =>
      evaluateRescueTriggers({
        system: effectiveSystem,
        subscription: activeSubscription,
        missedTasksCount: overdueOpenCount,
        weekCompletionPercent: weekCompletion.percent,
      }),
    [effectiveSystem, activeSubscription, overdueOpenCount, weekCompletion.percent],
  );

  const hasPremiumReviewInsights = useMemo(() => hasEntitlement("premium_review_insights"), []);

  const premiumReviewInsight = useMemo(
    () =>
      buildWeeklyReviewPremiumInsight({
        weekCompletionPercent: weekCompletion.percent,
        currentScore: currentWeekScoreValue,
        currentLagMetricValue,
        missedTasksCount: overdueOpenCount,
        coreTacticCount,
        optionalTacticCount,
        reviewDueToday,
      }),
    [
      weekCompletion.percent,
      currentWeekScoreValue,
      currentLagMetricValue,
      overdueOpenCount,
      coreTacticCount,
      optionalTacticCount,
      reviewDueToday,
    ],
  );

  const suggestedNextWeekPlan = useMemo(
    () =>
      buildSuggestedNextWeekPlan({
        insight: premiumReviewInsight,
        currentPlanFocus,
        currentPlanMilestone,
        weekCompletionPercent: weekCompletion.percent,
        currentScore: currentWeekScoreValue,
        missedTasksCount: overdueOpenCount,
        coreIndicators,
        optionalIndicators,
      }),
    [
      premiumReviewInsight,
      currentPlanFocus,
      currentPlanMilestone,
      weekCompletion.percent,
      currentWeekScoreValue,
      overdueOpenCount,
      coreIndicators,
      optionalIndicators,
    ],
  );

  const hasAdvancedAnalytics = useMemo(() => hasEntitlement("advanced_analytics"), []);
  const executionHeatmap = useMemo(
    () => (effectiveSystem && hasAdvancedAnalytics ? buildExecutionHeatmap(effectiveSystem) : []),
    [effectiveSystem, hasAdvancedAnalytics],
  );
  const weeklyTrend = useMemo(
    () => (effectiveSystem && hasAdvancedAnalytics ? buildWeeklyTrend(effectiveSystem) : []),
    [effectiveSystem, hasAdvancedAnalytics],
  );
  const tacticBreakdown = useMemo(
    () => (effectiveSystem && hasAdvancedAnalytics ? buildTacticBreakdown(effectiveSystem, currentWeek) : []),
    [effectiveSystem, hasAdvancedAnalytics, currentWeek],
  );
  const rescueStatus: RescueModeStatus = useMemo(() => {
    if (!effectiveSystem) {
      return {
        severity: "none",
        triggers: [],
        daysSinceLastCompletion: null,
        daysSinceLastCheckIn: null,
        daysRemainingInWeek: null,
      };
    }
    return getRescueModeStatus({
      todayDateKey: formatDateInputValue(new Date()),
      currentWeek,
      currentWeekRange,
      weekCompletionPercent: weekCompletion.percent,
      overdueOpenCount,
      todayQueueCount: todayQueue.length,
      reviewDueToday,
      dailyCheckIns: effectiveSystem.dailyCheckIns ?? [],
      weeklyReviews: effectiveSystem.weeklyReviews ?? [],
      taskInstances: effectiveSystem.taskInstances ?? [],
      startDate: effectiveSystem.startDate,
    });
  }, [
    effectiveSystem,
    currentWeek,
    currentWeekRange,
    weekCompletion.percent,
    overdueOpenCount,
    todayQueue.length,
    reviewDueToday,
  ]);

  const nextWeekRecommendation: NextWeekRecommendation | null = useMemo(() => {
    if (!effectiveSystem || !currentReview?.reviewCompleted) return null;

    // Daily check-in consistency this week: # of check-ins logged in current week range
    // divided by days elapsed (capped at 7).
    let consistencyPercent: number | null = null;
    if (currentWeekRange) {
      const todayKey = formatDateInputValue(new Date());
      const start = currentWeekRange.start.slice(0, 10);
      const end = currentWeekRange.end.slice(0, 10);
      const checkInsThisWeek = (effectiveSystem.dailyCheckIns ?? []).filter((entry) => {
        const date = entry.date?.slice(0, 10) ?? "";
        return date >= start && date <= end;
      }).length;
      const startMs = Date.parse(`${start}T00:00:00Z`);
      const todayMs = Date.parse(`${todayKey}T00:00:00Z`);
      const endMs = Date.parse(`${end}T00:00:00Z`);
      const cappedTodayMs = Math.min(todayMs, endMs);
      const daysElapsed =
        Number.isFinite(startMs) && Number.isFinite(cappedTodayMs)
          ? Math.max(1, Math.round((cappedTodayMs - startMs) / 86_400_000) + 1)
          : 7;
      consistencyPercent = Math.min(100, Math.round((checkInsThisWeek / Math.min(daysElapsed, 7)) * 100));
    }

    return getNextWeekAdjustmentRecommendation({
      weekCompletionPercent: weekCompletion.percent,
      leadMetricCompletionPercent: null,
      dailyCheckInConsistencyPercent: consistencyPercent,
      workloadDecision: currentReview?.workloadDecision,
      feasibilityPlanLoad: effectiveSystem.tacticLoadPreference ?? null,
      rescueSeverity: rescueStatus.severity,
      rescueTriggers: rescueStatus.triggers,
    });
  }, [
    effectiveSystem,
    currentReview,
    weekCompletion.percent,
    currentWeekRange,
    rescueStatus.severity,
    rescueStatus.triggers,
  ]);

  const executionInsights: ExecutionInsight[] = useMemo(() => {
    if (!effectiveSystem) return [];
    return getExecutionInsights(effectiveSystem, {
      todayDateKey: formatDateInputValue(new Date()),
      weekNumber: currentWeek,
    });
  }, [effectiveSystem, currentWeek]);

  const weeklyReflectionInsights: ExecutionInsight[] = useMemo(() => {
    if (!effectiveSystem) return [];
    return getWeeklyReflectionInsights(effectiveSystem, currentWeek, {
      todayDateKey: formatDateInputValue(new Date()),
    });
  }, [effectiveSystem, currentWeek]);

  const milestoneItems = useMemo(
    () => [
      { label: "Tuần 4", value: effectiveSystem?.milestones.week4 || "Chưa đặt cột mốc cho tuần 4." },
      { label: "Tuần 8", value: effectiveSystem?.milestones.week8 || "Chưa đặt cột mốc cho tuần 8." },
      {
        label: "Tuần 12",
        value: effectiveSystem?.milestones.week12 || effectiveSystem?.week12Outcome || "Chưa có outcome cuối chu kỳ.",
      },
      { label: "Dấu hiệu thành công", value: effectiveSystem?.successEvidence || "Chưa thêm bằng chứng thành công." },
    ],
    [effectiveSystem],
  );

  return {
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
    system: effectiveSystem,
    currentWeek,
    currentWeekRange,
    currentWeekTasks,
    todayQueue,
    missedTasks,
    weekCompletion,
    currentReview,
    currentScore,
    currentPlan,
    currentPlanFocus,
    currentPlanMilestone,
    currentLagMetricValue,
    latestCheckIn,
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
    updateActiveGoalState,
    updateActiveSystemState,
    refreshSnapshotMeta,
    refreshBackendProgressOverlay,
    invalidateOverlay,
    loadGoalData,
  };
}

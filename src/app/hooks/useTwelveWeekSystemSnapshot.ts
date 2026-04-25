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
import {
  buildSuggestedNextWeekPlan,
  buildWeeklyReviewPremiumInsight,
} from "../utils/twelve-week-premium";

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
  const [billingProviderStatus, setBillingProviderStatus] =
    useState<BillingProviderStatus>(getBillingProviderStatus());
  const [browserNotificationStatus, setBrowserNotificationStatus] =
    useState<BrowserNotificationStatus>(getBrowserNotificationStatus());
  const [lastSyncSnapshot, setLastSyncSnapshot] = useState<OutboxSyncSnapshot | null>(getLastOutboxSyncSnapshot());
  const [lastEntitlementSyncSnapshot, setLastEntitlementSyncSnapshot] =
    useState<BillingActionSnapshot | null>(getLastEntitlementSyncSnapshot());
  const [lastRestoreAccessSnapshot, setLastRestoreAccessSnapshot] =
    useState<BillingActionSnapshot | null>(getLastRestoreAccessSnapshot());
  const [pendingOutboxCount, setPendingOutboxCount] = useState(0);
  const [archivedOutboxCount, setArchivedOutboxCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [activeSubscription, setActiveSubscription] = useState<import("../utils/storage-types").Subscription | null | undefined>(null);

  const loadGoalData = useCallback((preferredGoalId?: string) => {
    const data = getUserData();
    const goalsWithSystem = data.goals.filter((goal) => Boolean(goal.twelveWeekSystem));
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
    setArchivedOutboxCount(data.syncOutbox.filter((item) => item.status === "archived" || item.status === "sent" || item.status === "failed").length);
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
      setAllGoals((previousGoals) =>
        previousGoals.map((goal) => (goal.id === nextGoal.id ? nextGoal : goal)),
      );
      return nextGoal;
    });
  }, []);

  const updateActiveSystemState = useCallback((updater: (system: TwelveWeekSystem) => TwelveWeekSystem) => {
    updateActiveGoalState((goal) => {
      if (!goal.twelveWeekSystem) return goal;
      return {
        ...goal,
        twelveWeekSystem: updater(goal.twelveWeekSystem),
      };
    });
  }, [updateActiveGoalState]);

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
  } = useBackendProgressOverlay(activeGoal?.id ?? null, system);

  const currentWeek = effectiveSystem ? getTwelveWeekCurrentWeek(effectiveSystem) : 1;
  const currentWeekRange = effectiveSystem ? getTwelveWeekWeekRange(effectiveSystem, currentWeek) : null;
  const currentWeekTasks = effectiveSystem ? getTwelveWeekTasksForWeek(effectiveSystem, currentWeek) : [];
  const scheduledTodayTasks = effectiveSystem ? getTwelveWeekTodayTasks(effectiveSystem) : [];
  const missedTasks = effectiveSystem ? getTwelveWeekMissedTasks(effectiveSystem) : [];
  const fallbackTasks = currentWeekTasks.filter((task) => !task.completed).slice(0, 3);
  const todayQueue = dedupeTasks([
    ...missedTasks.slice(0, 2),
    ...(scheduledTodayTasks.length > 0 ? scheduledTodayTasks : fallbackTasks),
  ]);
  const weekCompletion = effectiveSystem
    ? getTwelveWeekWeekCompletion(effectiveSystem, currentWeek)
    : { completed: 0, total: 0, percent: 0 };
  const currentReview = effectiveSystem?.weeklyReviews.find((review) => review.weekNumber === currentWeek) ?? null;
  const currentScore = effectiveSystem?.scoreboard.find((week) => week.weekNumber === currentWeek) ?? null;
  const currentPlan = effectiveSystem?.weeklyPlans.find((plan) => plan.weekNumber === currentWeek) ?? null;
  const currentPlanFocus = currentPlan?.focus ?? DEFAULT_WEEK_FOCUS;
  const currentPlanMilestone = currentPlan?.milestone ?? "";
  const currentLagMetricValue = currentReview?.lagProgressValue || effectiveSystem?.lagMetric.currentValue || "";
  const latestCheckIn = getLatestDailyCheckIn(activeGoal);
  const reviewDoneCount = effectiveSystem?.scoreboard.filter((week) => week.reviewDone).length ?? 0;
  const coreTacticCount = effectiveSystem ? effectiveSystem.leadIndicators.filter((indicator) => indicator.type !== "optional").length : 0;
  const optionalTacticCount = effectiveSystem ? effectiveSystem.leadIndicators.filter((indicator) => indicator.type === "optional").length : 0;
  const todayCompletedCount = todayQueue.filter((task) => task.completed).length;
  const todayRemainingCount = todayQueue.filter((task) => !task.completed).length;
  const overdueOpenCount = missedTasks.filter((task) => !task.completed).length;
  const currentWeekOpenTasks = currentWeekTasks.filter((task) => !task.completed);
  const optionalOpenThisWeekCount = currentWeekOpenTasks.filter((task) => !task.isCore).length;
  const openTodayTasks = todayQueue.filter((task) => !task.completed);
  const firstPriorityTask = openTodayTasks[0] ?? null;
  const secondaryTodayTasks = openTodayTasks.slice(1);
  const averageScore =
    effectiveSystem && effectiveSystem.scoreboard.length > 0
      ? Math.round(
          effectiveSystem.scoreboard.reduce((sum, week) => sum + week.weeklyScore, 0) /
            effectiveSystem.scoreboard.length,
        )
      : 0;
  const reviewDueToday = Boolean(effectiveSystem && isTwelveWeekReviewDueToday(effectiveSystem));
  const currentWeekScoreValue = currentScore?.weeklyScore ?? weekCompletion.percent;
  const reviewStatusLabel = reviewDueToday
    ? "Đến hạn hôm nay"
    : `Review vào ${getReviewDayLabel(effectiveSystem?.reviewDay ?? "Sunday")}`;
  const coreIndicators = effectiveSystem?.leadIndicators.filter((indicator) => indicator.type !== "optional") ?? [];
  const optionalIndicators = effectiveSystem?.leadIndicators.filter((indicator) => indicator.type === "optional") ?? [];
  const hasSmartRescue = hasEntitlement("priority_reminders");
  const rescuePlanSummary = buildRescuePlanSummary({ missedTasks, currentWeekTasks });
  const activeTriggers = evaluateRescueTriggers({
    system: effectiveSystem,
    subscription: activeSubscription,
    missedTasksCount: overdueOpenCount,
    weekCompletionPercent: weekCompletion.percent,
  });
  const hasPremiumReviewInsights = hasEntitlement("premium_review_insights");
  const premiumReviewInsight = buildWeeklyReviewPremiumInsight({
    weekCompletionPercent: weekCompletion.percent,
    currentScore: currentWeekScoreValue,
    currentLagMetricValue,
    missedTasksCount: overdueOpenCount,
    coreTacticCount,
    optionalTacticCount,
    reviewDueToday,
  });
  const suggestedNextWeekPlan = buildSuggestedNextWeekPlan({
    insight: premiumReviewInsight,
    currentPlanFocus,
    currentPlanMilestone,
    weekCompletionPercent: weekCompletion.percent,
    currentScore: currentWeekScoreValue,
    missedTasksCount: overdueOpenCount,
    coreIndicators,
    optionalIndicators,
  });
  const hasAdvancedAnalytics = hasEntitlement("advanced_analytics");
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
    loadGoalData,
  };
}

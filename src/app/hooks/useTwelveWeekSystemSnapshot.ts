import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";

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
  buildRescuePlanSummary,
  dedupeTasks,
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
    setArchivedOutboxCount(data.syncOutbox.filter((item) => item.status === "archived").length);
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

    if (selectedGoal) {
      localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, selectedGoal.id);
      localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, selectedGoal.id);
    }
  }, []);

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
  const currentWeek = system ? getTwelveWeekCurrentWeek(system) : 1;
  const currentWeekRange = system ? getTwelveWeekWeekRange(system, currentWeek) : null;
  const currentWeekTasks = system ? getTwelveWeekTasksForWeek(system, currentWeek) : [];
  const scheduledTodayTasks = system ? getTwelveWeekTodayTasks(system) : [];
  const missedTasks = system ? getTwelveWeekMissedTasks(system) : [];
  const fallbackTasks = currentWeekTasks.filter((task) => !task.completed).slice(0, 3);
  const todayQueue = dedupeTasks([
    ...missedTasks.slice(0, 2),
    ...(scheduledTodayTasks.length > 0 ? scheduledTodayTasks : fallbackTasks),
  ]);
  const weekCompletion = system
    ? getTwelveWeekWeekCompletion(system, currentWeek)
    : { completed: 0, total: 0, percent: 0 };
  const currentReview = system?.weeklyReviews.find((review) => review.weekNumber === currentWeek) ?? null;
  const currentScore = system?.scoreboard.find((week) => week.weekNumber === currentWeek) ?? null;
  const currentPlan = system?.weeklyPlans.find((plan) => plan.weekNumber === currentWeek) ?? null;
  const currentPlanFocus = currentPlan?.focus ?? DEFAULT_WEEK_FOCUS;
  const currentPlanMilestone = currentPlan?.milestone ?? "";
  const currentLagMetricValue = currentReview?.lagProgressValue || system?.lagMetric.currentValue || "";
  const latestCheckIn = getLatestDailyCheckIn(activeGoal);
  const reviewDoneCount = system?.scoreboard.filter((week) => week.reviewDone).length ?? 0;
  const coreTacticCount = system ? system.leadIndicators.filter((indicator) => indicator.type !== "optional").length : 0;
  const optionalTacticCount = system ? system.leadIndicators.filter((indicator) => indicator.type === "optional").length : 0;
  const todayCompletedCount = todayQueue.filter((task) => task.completed).length;
  const todayRemainingCount = todayQueue.filter((task) => !task.completed).length;
  const overdueOpenCount = missedTasks.filter((task) => !task.completed).length;
  const currentWeekOpenTasks = currentWeekTasks.filter((task) => !task.completed);
  const optionalOpenThisWeekCount = currentWeekOpenTasks.filter((task) => !task.isCore).length;
  const openTodayTasks = todayQueue.filter((task) => !task.completed);
  const firstPriorityTask = openTodayTasks[0] ?? null;
  const secondaryTodayTasks = openTodayTasks.slice(1);
  const averageScore =
    system && system.scoreboard.length > 0
      ? Math.round(system.scoreboard.reduce((sum, week) => sum + week.weeklyScore, 0) / system.scoreboard.length)
      : 0;
  const reviewDueToday = Boolean(system && isTwelveWeekReviewDueToday(system));
  const currentWeekScoreValue = currentScore?.weeklyScore ?? weekCompletion.percent;
  const reviewStatusLabel = reviewDueToday
    ? "Đến hạn hôm nay"
    : `Review vào ${getReviewDayLabel(system?.reviewDay ?? "Sunday")}`;
  const coreIndicators = system?.leadIndicators.filter((indicator) => indicator.type !== "optional") ?? [];
  const optionalIndicators = system?.leadIndicators.filter((indicator) => indicator.type === "optional") ?? [];
  const hasSmartRescue = hasEntitlement("priority_reminders");
  const rescuePlanSummary = buildRescuePlanSummary({ missedTasks, currentWeekTasks });
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
  const milestoneItems = useMemo(
    () => [
      { label: "Tuần 4", value: system?.milestones.week4 || "Chưa đặt cột mốc cho tuần 4." },
      { label: "Tuần 8", value: system?.milestones.week8 || "Chưa đặt cột mốc cho tuần 8." },
      { label: "Tuần 12", value: system?.milestones.week12 || system?.week12Outcome || "Chưa có outcome cuối chu kỳ." },
      { label: "Dấu hiệu thành công", value: system?.successEvidence || "Chưa thêm bằng chứng thành công." },
    ],
    [system],
  );

  return {
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
    hasPremiumReviewInsights,
    premiumReviewInsight,
    suggestedNextWeekPlan,
    milestoneItems,
    loadGoalData,
  };
}

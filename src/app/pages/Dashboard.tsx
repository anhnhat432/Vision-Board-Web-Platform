import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { ActiveGoalsCard } from "@/features/dashboard/v2/ActiveGoalsCard";
import { BalanceCard } from "@/features/dashboard/v2/BalanceCard";
import { DashboardFooter } from "@/features/dashboard/v2/DashboardFooter";
import { DashboardHero } from "@/features/dashboard/v2/DashboardHero";
import { NewUserSetupView } from "@/features/dashboard/v2/NewUserSetupView";
import { PublicVisitorView } from "@/features/dashboard/v2/PublicVisitorView";
import { QuoteBlock } from "@/features/dashboard/v2/QuoteBlock";
import { ReflectionPrompt } from "@/features/dashboard/v2/ReflectionPrompt";
import { RescueAlert } from "@/features/dashboard/v2/RescueAlert";
import { TodayMiniCard } from "@/features/dashboard/v2/TodayMiniCard";
import { TwelveWeekTrendCard } from "@/features/dashboard/v2/TwelveWeekTrendCard";
import { WeekRhythmCard } from "@/features/dashboard/v2/WeekRhythmCard";
import {
  buildCurrentWeekExecutionSnapshot,
  buildGoalProgressSnapshot,
  buildWeeklyProgressPoints,
  calculateWeeklyStreak,
  type WeeklyProgressPoint,
} from "@/features/dashboard/helpers/dashboardInsights";
import { buildLoginPath } from "@/features/dashboard/helpers/dashboardNavigation";
import { getDashboardNextAction } from "@/features/dashboard/helpers/dashboardSections";
import { useDashboardPlanLink } from "@/features/dashboard/hooks/useDashboardPlanLink";
import { usePlan12Week } from "@/features/plan12week/hooks";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { FeedbackDialog } from "../components/FeedbackDialog";
import { SpotlightTour, type SpotlightTourStep } from "../components/SpotlightTour";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import { Skeleton } from "../components/ui/skeleton";
import { useBackendProgressOverlay } from "../hooks/useBackendProgressOverlay";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { usePageTour } from "../hooks/usePageTour";
import { usePlanEntitlements } from "../hooks/usePlanEntitlements";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { useUpgradeDialog } from "../hooks/useUpgradeDialog";
import { trackAnalyticsEvent } from "../utils/analytics";
import { isDemoMode } from "../utils/app-mode";
import { FREE_TIER_LIMITS, getFreeTierUsage } from "../utils/feature-entitlements";
import {
  trackRescueActionTaken,
  trackRescueTriggerDismissed,
  trackRescueTriggerFired,
} from "../utils/monetization-analytics";
import {
  getActiveTwelveWeekGoal,
  getLifeAreaLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTasksForWeek,
  getTwelveWeekTodayTasks,
  getTwelveWeekWeekCompletion,
  isTwelveWeekReviewDueToday,
  sortReflectionsByDateDesc,
  type Goal,
  type LifeArea,
  type TwelveWeekSystem,
  type TwelveWeekTaskInstance,
  type UserData,
} from "../utils/storage";
import { dismissRescueTrigger, evaluateRescueTriggers } from "../utils/twelve-week-system-ui";

const DASHBOARD_TOUR_STEPS: SpotlightTourStep[] = [
  {
    id: "start",
    targetId: "dashboard-start-card",
    title: "Bắt đầu từ khối này",
    description:
      "Nếu chưa có chu kỳ, hãy nhìn khối này trước. Đây là nơi dẫn bạn qua đúng luồng: góc nhìn, mục tiêu SMART, kiểm tra tính thực tế rồi mới vào 12 tuần.",
  },
  {
    id: "attention",
    targetId: "dashboard-next-card",
    title: "Nhìn khối này trước khi quét cả màn",
    description: "Phần đầu Trang chính gom ba tín hiệu quan trọng nhất để bạn biết nên mở vào đâu tiếp theo.",
  },
  {
    id: "plan",
    targetId: "dashboard-plan-card",
    title: "Phân biệt Free và Plus ở đây",
    description: "Khối này cho biết bạn đang ở gói nào, quyền nào đã mở và chỗ để quản lý hoặc khôi phục lại nếu cần.",
  },
];

const LIFE_BALANCE_ROWS = [
  { label: "Sức khoẻ", aliases: ["Health"], fallbackScore: 7 },
  { label: "Sự nghiệp", aliases: ["Career", "Education"], fallbackScore: 6 },
  { label: "Mối quan hệ", aliases: ["Relationships", "Family"], fallbackScore: 8 },
  { label: "Tinh thần", aliases: ["Personal Growth", "Leisure"], fallbackScore: 5 },
] as const;

interface LifeBalanceRow {
  label: string;
  score: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getDashboardGreeting(now = new Date()): string {
  const hour = now.getHours();

  if (hour >= 5 && hour <= 11) return "Chào buổi sáng";
  if (hour >= 12 && hour <= 17) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function getDashboardDisplayName(user: ReturnType<typeof useAuthContext>["user"]): string {
  const displayName = user?.displayName?.trim();
  if (displayName) return displayName.split(/\s+/)[0];

  const emailName = user?.email?.split("@")[0]?.trim();
  return emailName || "bạn";
}

function formatDashboardDateCaption(date: Date, greeting: string): string {
  const weekday = new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(date);
  return `${greeting} · ${weekday}, ngày ${date.getDate()} tháng ${date.getMonth() + 1}`.toLocaleUpperCase("vi-VN");
}

function getLifeBalanceRows(areas: LifeArea[]): LifeBalanceRow[] {
  return LIFE_BALANCE_ROWS.map((row) => {
    const matchedArea = areas.find((area) => row.aliases.some((alias) => alias === area.name));
    const score = Math.round(clamp(matchedArea?.score ?? row.fallbackScore, 0, 10));

    return {
      label: row.label,
      score,
    };
  });
}

function getLastSavedLabel(userData: UserData, tasks: TwelveWeekTaskInstance[]): string {
  const timestamps = [
    ...tasks.map((task) => task.lastModifiedAt ?? 0),
    ...tasks.map((task) => (task.completedAt ? Date.parse(task.completedAt) : 0)),
    ...userData.goals.map((goal) => Date.parse(goal.createdAt)),
    ...userData.reflections.map((reflection) => Date.parse(reflection.date)),
  ].filter((value) => Number.isFinite(value) && value > 0);

  if (timestamps.length === 0) return "vừa xong";

  const minutes = Math.max(0, Math.round((Date.now() - Math.max(...timestamps)) / 60000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  return `${Math.round(hours / 24)} ngày trước`;
}

function buildSystemWeeklyProgressPoints(system: TwelveWeekSystem | null): WeeklyProgressPoint[] {
  if (!system) return [];

  return Array.from({ length: system.totalWeeks }, (_, index) => {
    const weekNumber = index + 1;
    const completion = getTwelveWeekWeekCompletion(system, weekNumber);

    return {
      weekNumber,
      completedTasks: completion.completed,
      totalTasks: completion.total,
      executionScore: completion.percent,
    };
  });
}

function getGoalTarget(goal: Goal): string {
  return goal.twelveWeekSystem ? "/12-week-system" : "/goals";
}

export function Dashboard() {
  const { userData, reloadUserData } = useSyncedUserData();
  const { isTourOpen, setIsTourOpen } = usePageTour("dashboard");

  if (!userData) {
    return (
      <div className="min-h-screen bg-app-bg text-app-ink">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-0">
          <div className="space-y-5">
            <Skeleton className="h-14 rounded-card bg-app-surface" />
            <Skeleton className="h-56 rounded-card bg-app-surface" />
            <div className="grid gap-5 lg:grid-cols-3">
              <Skeleton className="h-48 rounded-card bg-app-surface lg:col-span-2" />
              <Skeleton className="h-48 rounded-card bg-app-surface" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeTwelveWeekGoal = getActiveTwelveWeekGoal(userData.goals);

  return (
    <DashboardContent
      userData={userData}
      activeTwelveWeekGoal={activeTwelveWeekGoal}
      isTourOpen={isTourOpen}
      setIsTourOpen={setIsTourOpen}
      onReload={reloadUserData}
    />
  );
}

function useDashboardDerivedData({
  visibleGoals,
  visibleWheelOfLife,
  visibleReflections,
  visibleVisionBoards,
  visibleActiveTwelveWeekGoal,
  plan,
  hasRealLifeBalance,
  isSignedOut,
  isFreshDemoVisitor,
}: {
  visibleGoals: UserData["goals"];
  visibleWheelOfLife: UserData["currentWheelOfLife"];
  visibleReflections: UserData["reflections"];
  visibleVisionBoards: UserData["visionBoards"];
  visibleActiveTwelveWeekGoal: ReturnType<typeof getActiveTwelveWeekGoal>;
  plan: ReturnType<typeof usePlan12Week>["plan"];
  hasRealLifeBalance: boolean;
  isSignedOut: boolean;
  isFreshDemoVisitor: boolean;
}) {
  const recentGoals = visibleGoals.slice(0, 3);
  const recentReflections = sortReflectionsByDateDesc(visibleReflections).slice(0, 2);
  const dashboardGoalTitle = visibleActiveTwelveWeekGoal?.title ?? plan?.vision ?? "Mục tiêu hiện tại";
  const goalProgressSnapshot = useMemo(() => buildGoalProgressSnapshot(plan), [plan]);
  const currentWeekExecutionSnapshot = useMemo(() => buildCurrentWeekExecutionSnapshot(plan), [plan]);
  const weeklyProgressPoints = useMemo(() => buildWeeklyProgressPoints(plan), [plan]);
  const weeklyStreak = useMemo(() => calculateWeeklyStreak(weeklyProgressPoints), [weeklyProgressPoints]);
  const averageLifeScore =
    hasRealLifeBalance && visibleWheelOfLife.length > 0
      ? visibleWheelOfLife.reduce((sum, area) => sum + area.score, 0) / visibleWheelOfLife.length
      : 0;
  const journalStreak = useMemo(() => {
    const sorted = [...visibleReflections].sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length === 0) return 0;

    const dates = [...new Set(sorted.map((reflection) => reflection.date.slice(0, 10)))];
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    if (dates[0] !== todayKey && dates[0] !== yesterdayKey) return 0;

    let streak = 0;
    const check = new Date(dates[0]);
    for (const date of dates) {
      const expected = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, "0")}-${String(check.getDate()).padStart(2, "0")}`;
      if (date !== expected) break;
      streak++;
      check.setDate(check.getDate() - 1);
    }
    return streak;
  }, [visibleReflections]);
  const weakestArea =
    hasRealLifeBalance && visibleWheelOfLife.length > 0
      ? [...visibleWheelOfLife].sort((a, b) => a.score - b.score)[0]
      : null;
  const localActiveSystem = visibleActiveTwelveWeekGoal?.twelveWeekSystem ?? null;
  const { effectiveSystem: activeSystem } = useBackendProgressOverlay(
    visibleActiveTwelveWeekGoal?.id ?? null,
    localActiveSystem,
  );
  const effectiveSystem = activeSystem;
  const activeSystemWeek = effectiveSystem ? getTwelveWeekCurrentWeek(effectiveSystem) : null;
  const activeSystemTodayTasks = effectiveSystem ? getTwelveWeekTodayTasks(effectiveSystem) : [];
  const activeSystemTodayOpenTasks = activeSystemTodayTasks.filter((task) => !task.completed);
  const activeSystemTodayCompletedCount = activeSystemTodayTasks.length - activeSystemTodayOpenTasks.length;
  const activeSystemWeekCompletion =
    effectiveSystem && activeSystemWeek ? getTwelveWeekWeekCompletion(effectiveSystem, activeSystemWeek) : null;
  const reviewDueToday = Boolean(effectiveSystem && isTwelveWeekReviewDueToday(effectiveSystem));
  const activeSystemTaskPreview =
    effectiveSystem && activeSystemWeek
      ? (activeSystemTodayOpenTasks.length > 0
          ? activeSystemTodayOpenTasks
          : getTwelveWeekTasksForWeek(effectiveSystem, activeSystemWeek).filter((task) => !task.completed)
        ).slice(0, 3)
      : [];
  const hasReviewedCurrentWeek = Boolean(
    effectiveSystem &&
      activeSystemWeek &&
      (effectiveSystem.weeklyReviews.some(
        (review) => review.weekNumber === activeSystemWeek && review.reviewCompleted,
      ) ||
        effectiveSystem.scoreboard.some((week) => week.weekNumber === activeSystemWeek && week.reviewDone)),
  );
  const dashboardNextAction = getDashboardNextAction({
    hasGoal: visibleGoals.length > 0,
    hasTwelveWeekSystem: Boolean(effectiveSystem),
    reviewDueToday,
    hasOpenTodayTasks: activeSystemTodayOpenTasks.length > 0,
    hasReviewedCurrentWeek,
    currentWeek: activeSystemWeek,
    totalWeeks: effectiveSystem?.totalWeeks ?? null,
  });
  const dashboardActiveGoals = visibleActiveTwelveWeekGoal ? [visibleActiveTwelveWeekGoal] : recentGoals;
  const dashboardKpiLeadAverage = activeSystemWeekCompletion?.percent ?? currentWeekExecutionSnapshot.executionScore;
  const dashboardKpiCurrentWeek = activeSystemWeek ?? currentWeekExecutionSnapshot.weekNumber ?? null;
  const dashboardKpiTotalWeeks = effectiveSystem?.totalWeeks ?? 12;
  const dashboardKpiStreak = weeklyStreak > 0 ? weeklyStreak : journalStreak;
  const dashboardOpenTaskCount = activeSystemTodayOpenTasks.length;
  const hasLocalTwelveWeekSystem = Boolean(effectiveSystem);
  const hasWorkspaceSignals =
    hasRealLifeBalance || visibleGoals.length > 0 || visibleVisionBoards.length > 0 || visibleReflections.length > 0;
  const shouldShowMainDashboardCard =
    !isSignedOut && !isFreshDemoVisitor && (Boolean(activeSystem) || hasWorkspaceSignals);
  const showMobileStickyCTA = shouldShowMainDashboardCard && activeSystem && activeSystemTodayOpenTasks.length > 0;
  const shouldShowSetupGuide = !isSignedOut && !isFreshDemoVisitor && !activeSystem;
  const shouldShowWorkspaceDetailGrid =
    !isSignedOut && !isFreshDemoVisitor && (Boolean(activeSystem) || hasWorkspaceSignals);
  const radarData = hasRealLifeBalance
    ? visibleWheelOfLife.map((area) => ({
        subject: getLifeAreaLabel(area.name),
        value: area.score,
        fullMark: 10,
      }))
    : [];

  return {
    recentGoals,
    recentReflections,
    dashboardGoalTitle,
    goalProgressSnapshot,
    currentWeekExecutionSnapshot,
    weeklyProgressPoints,
    averageLifeScore,
    journalStreak,
    weakestArea,
    activeSystem,
    effectiveSystem,
    activeSystemWeek,
    activeSystemTodayTasks,
    activeSystemTodayOpenTasks,
    activeSystemTodayCompletedCount,
    activeSystemWeekCompletion,
    reviewDueToday,
    activeSystemTaskPreview,
    hasReviewedCurrentWeek,
    dashboardNextAction,
    dashboardActiveGoals,
    dashboardKpiLeadAverage,
    dashboardKpiCurrentWeek,
    dashboardKpiTotalWeeks,
    dashboardKpiStreak,
    dashboardOpenTaskCount,
    hasLocalTwelveWeekSystem,
    hasWorkspaceSignals,
    showMobileStickyCTA,
    shouldShowSetupGuide,
    shouldShowWorkspaceDetailGrid,
    radarData,
  };
}

function DashboardContent({
  userData,
  activeTwelveWeekGoal,
  isTourOpen,
  setIsTourOpen,
  onReload,
}: {
  userData: UserData;
  activeTwelveWeekGoal: ReturnType<typeof getActiveTwelveWeekGoal>;
  isTourOpen: boolean;
  setIsTourOpen: (open: boolean) => void;
  onReload: () => void;
}) {
  const isDesktopViewport = useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();
  const { isConfigured, user } = useAuthContext();
  const [dismissedTrigger, setDismissedTrigger] = useState<string | null>(null);
  const landingViewedRef = useRef(false);
  const progressViewedGoalIdRef = useRef<string | null>(null);
  const firedTriggerKindRef = useRef<string | null>(null);
  const { currentPlanCode } = usePlanEntitlements(userData);
  const demoMode = isDemoMode();
  const isSignedOut = !user;
  const shouldRequireAuthForSignedOut = isSignedOut && !demoMode;
  const hasLocalWorkspaceData =
    userData.goals.length > 0 ||
    userData.currentWheelOfLife.some((area) => area.score > 0) ||
    userData.reflections.length > 0 ||
    userData.visionBoards.length > 0;
  const hasSignedOutRealLocalData = !demoMode && isSignedOut && hasLocalWorkspaceData;
  const isFreshDemoVisitor = demoMode && isSignedOut && userData.goals.length === 0;
  const visibleGoals = isSignedOut ? [] : userData.goals;
  const visibleWheelOfLife = isSignedOut ? [] : userData.currentWheelOfLife;
  const visibleReflections = isSignedOut ? [] : userData.reflections;
  const visibleVisionBoards = isSignedOut ? [] : userData.visionBoards;
  const visibleActiveTwelveWeekGoal = isSignedOut ? null : activeTwelveWeekGoal;
  const hasRealLifeBalance =
    !isSignedOut && userData.onboardingCompleted && visibleWheelOfLife.some((area) => area.score > 0);
  const { isUpgradeDialogOpen, setIsUpgradeDialogOpen, upgradeContext, recommendedPlan, openUpgradeDialog } =
    useUpgradeDialog({
      source: "dashboard",
      placement: "dashboard_plan_card",
      currentPlanCode,
      goalId: visibleActiveTwelveWeekGoal?.id,
    });
  const { plan, loading: planLoading, error: planError, actions: planActions } = usePlan12Week();
  const dashboardPlanId = useDashboardPlanLink(visibleActiveTwelveWeekGoal?.id ?? null);
  const loadPlan = planActions.loadPlan;
  const authDestination = `${location.pathname}${location.search}${location.hash}`;
  const handleAuthNavigate = (mode: "signin" | "signup") => {
    navigate(buildLoginPath(mode, authDestination));
  };
  const handlePublicVisitorStart = () => {
    if (shouldRequireAuthForSignedOut) {
      handleAuthNavigate("signup");
      return;
    }

    trackAnalyticsEvent("demo_started", {
      source: "dashboard",
      app_mode: demoMode ? "demo" : "real",
      signed_in: Boolean(user),
      auth_configured: isConfigured,
      start_destination: "onboarding",
    });
    navigate("/onboarding");
  };

  useEffect(() => {
    if (!dashboardPlanId) return;
    if (plan?.id === dashboardPlanId) return;
    void loadPlan(dashboardPlanId);
  }, [dashboardPlanId, loadPlan, plan?.id]);

  const dashboardData = useDashboardDerivedData({
    visibleGoals,
    visibleWheelOfLife,
    visibleReflections,
    visibleVisionBoards,
    visibleActiveTwelveWeekGoal,
    plan,
    hasRealLifeBalance,
    isSignedOut,
    isFreshDemoVisitor,
  });
  const dashboardGreeting = getDashboardGreeting();
  const dashboardDisplayName = getDashboardDisplayName(user);
  const caption = formatDashboardDateCaption(new Date(), dashboardGreeting);
  const signedIn = Boolean(user);
  const goalLimitUsage = getFreeTierUsage(userData, "maxActiveGoals");
  const shouldShowFreeGoalLimit =
    !isSignedOut && currentPlanCode === "FREE" && Number.isFinite(FREE_TIER_LIMITS.maxActiveGoals);
  const lastSavedLabel = getLastSavedLabel(userData, dashboardData.activeSystemTodayTasks);
  const balanceRows = getLifeBalanceRows(visibleWheelOfLife);

  useEffect(() => {
    if (landingViewedRef.current) return;

    landingViewedRef.current = true;
    trackAnalyticsEvent("landing_viewed", {
      source: "dashboard",
      app_mode: demoMode ? "demo" : "real",
      signed_in: signedIn,
      auth_configured: isConfigured,
      has_local_12_week_system: dashboardData.hasLocalTwelveWeekSystem,
    });
  }, [dashboardData.hasLocalTwelveWeekSystem, demoMode, isConfigured, signedIn]);

  useEffect(() => {
    if (!visibleActiveTwelveWeekGoal || !dashboardData.effectiveSystem || !dashboardData.activeSystemWeek) return;
    if (progressViewedGoalIdRef.current === visibleActiveTwelveWeekGoal.id) return;

    progressViewedGoalIdRef.current = visibleActiveTwelveWeekGoal.id;
    trackAnalyticsEvent(
      "progress_viewed",
      {
        source: "dashboard",
        week_number: dashboardData.activeSystemWeek,
        total_weeks: dashboardData.effectiveSystem.totalWeeks,
        current_plan: currentPlanCode,
      },
      { goalId: visibleActiveTwelveWeekGoal.id },
    );
  }, [currentPlanCode, dashboardData.activeSystemWeek, dashboardData.effectiveSystem, visibleActiveTwelveWeekGoal]);

  const overdueCount = dashboardData.activeSystem
    ? dashboardData.activeSystemTodayTasks.filter((task) => !task.completed).length
    : 0;
  const activeTriggers = evaluateRescueTriggers({
    system: dashboardData.activeSystem,
    subscription: isSignedOut ? null : (userData.subscription ?? null),
    missedTasksCount: overdueCount,
    weekCompletionPercent: dashboardData.activeSystemWeekCompletion?.percent ?? 0,
  }).filter((trigger) => trigger.kind !== dismissedTrigger);
  const topTrigger = activeTriggers[0] ?? null;

  useEffect(() => {
    if (!topTrigger) return;
    if (firedTriggerKindRef.current === topTrigger.kind) return;

    firedTriggerKindRef.current = topTrigger.kind;
    trackRescueTriggerFired({
      kind: topTrigger.kind,
      severity: topTrigger.severity,
      currentPlan: currentPlanCode,
    });
  }, [currentPlanCode, topTrigger]);

  const dashboardTourSteps = isSignedOut ? [] : DASHBOARD_TOUR_STEPS;
  const showMobileStickyCTA = !isDesktopViewport && dashboardData.showMobileStickyCTA;

  return (
    <div
      className={
        showMobileStickyCTA ? "min-h-screen bg-app-bg pb-24 text-app-ink" : "min-h-screen bg-app-bg text-app-ink"
      }
    >
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6 lg:px-0">
        {shouldShowFreeGoalLimit ? (
          <FreeGoalLimitCard
            current={goalLimitUsage.current}
            limit={goalLimitUsage.limit}
            onUpgrade={() => openUpgradeDialog("plan")}
          />
        ) : null}

        <TrialCountdownBanner
          demoMode={demoMode}
          renewsAt={
            userData.subscription?.status === "trialing" ? (userData.subscription.renewsAt ?? undefined) : undefined
          }
          onOpenPlan={() => navigate("/billing/plan")}
        />

        {isSignedOut ? (
          <PublicVisitorView
            isDemo={demoMode}
            hasLocalData={hasSignedOutRealLocalData}
            onStart={handlePublicVisitorStart}
            onSignIn={() => handleAuthNavigate("signin")}
            onSignUp={() => handleAuthNavigate("signup")}
          />
        ) : !dashboardData.activeSystem ? (
          <NewUserSetupView
            userData={userData}
            displayName={dashboardDisplayName}
            onContinue={(href) => navigate(href)}
          />
        ) : (
          <DashboardActiveLayout
            data={dashboardData}
            displayName={dashboardDisplayName}
            caption={caption}
            balanceRows={balanceRows}
            topTrigger={topTrigger}
            planLoading={planLoading}
            hasPlan={Boolean(plan)}
            planError={planError}
            onSelectGoal={(goal) => navigate(getGoalTarget(goal))}
            onAddGoal={() => navigate("/life-insight")}
            onTriggerAction={() => {
              if (!topTrigger) return;
              const ctaHref = topTrigger.kind === "trial_ending" ? "/billing/plan" : "/12-week-system";
              trackRescueActionTaken({
                kind: topTrigger.kind,
                action: topTrigger.kind === "trial_ending" ? "upgrade" : "navigate_system",
                currentPlan: currentPlanCode,
              });
              navigate(ctaHref);
            }}
            onTriggerDismiss={() => {
              if (!topTrigger) return;
              dismissRescueTrigger(topTrigger.kind);
              trackRescueTriggerDismissed({ kind: topTrigger.kind, currentPlan: currentPlanCode });
              setDismissedTrigger(topTrigger.kind);
            }}
          />
        )}

        {!isSignedOut && userData.isHydratedFromDemo ? (
          <DemoDataNotice onOpenLifeBalance={() => navigate("/life-balance")} />
        ) : null}

        <DashboardFooter lastSavedLabel={lastSavedLabel} />

        <div className="mt-5 flex justify-end">
          <FeedbackDialog
            source="dashboard"
            context="dashboard"
            triggerClassName="border-app-line bg-app-surface text-app-ink-muted hover:bg-app-bg"
          />
        </div>
      </div>

      {showMobileStickyCTA ? (
        <div className="above-mobile-nav fixed bottom-0 left-0 right-0 z-40 border-t border-app-line bg-app-surface/95 p-4 shadow-[0_-1px_2px_rgba(26,26,26,0.04)] backdrop-blur md:hidden">
          <button
            type="button"
            className="w-full rounded-lg border border-app-line bg-app-surface px-4 py-3 text-[14px] font-medium text-app-ink transition-colors duration-150 hover:bg-app-accent-soft hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            onClick={() => navigate("/today-v2")}
          >
            Mở Today - {dashboardData.dashboardOpenTaskCount} việc
          </button>
        </div>
      ) : null}

      <UpgradePaywallDialog
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        context={upgradeContext}
        currentPlan={currentPlanCode}
        goalId={visibleActiveTwelveWeekGoal?.id}
        recommendedPlan={recommendedPlan}
        source="dashboard"
        onCheckoutComplete={onReload}
      />
      <SpotlightTour
        open={isTourOpen}
        onOpenChange={setIsTourOpen}
        title="Tour Trang chính"
        description="Ba điểm chính để người mới mở vào là biết nên bắt đầu từ đâu."
        steps={dashboardTourSteps}
      />
    </div>
  );
}

type DashboardData = ReturnType<typeof useDashboardDerivedData>;

function DashboardActiveLayout({
  data,
  displayName,
  caption,
  balanceRows,
  topTrigger,
  planLoading,
  hasPlan,
  planError,
  onSelectGoal,
  onAddGoal,
  onTriggerAction,
  onTriggerDismiss,
}: {
  data: DashboardData;
  displayName: string;
  caption: string;
  balanceRows: LifeBalanceRow[];
  topTrigger: ReturnType<typeof evaluateRescueTriggers>[number] | null;
  planLoading: boolean;
  hasPlan: boolean;
  planError: ReturnType<typeof usePlan12Week>["error"];
  onSelectGoal: (goal: Goal) => void;
  onAddGoal: () => void;
  onTriggerAction: () => void;
  onTriggerDismiss: () => void;
}) {
  const trendPoints =
    data.weeklyProgressPoints.length > 0
      ? data.weeklyProgressPoints
      : buildSystemWeeklyProgressPoints(data.activeSystem);
  const planHref = "/12-week-system?tab=week";

  return (
    <div className="space-y-6">
      <div data-tour-id="dashboard-start-card">
        <DashboardHero
          caption={caption}
          currentWeek={data.dashboardKpiCurrentWeek}
          totalWeeks={data.dashboardKpiTotalWeeks}
          displayName={displayName}
          featuredGoalTitle={data.dashboardGoalTitle}
          progressPercent={data.goalProgressSnapshot.percent || data.dashboardKpiLeadAverage}
          planHref={planHref}
        />
      </div>

      {topTrigger ? (
        <RescueAlert
          trigger={topTrigger}
          ctaLabel={topTrigger.kind === "trial_ending" ? "Mở Plus" : "Xem ngay"}
          onAction={onTriggerAction}
          onDismiss={onTriggerDismiss}
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <DashboardPlanStateNotice planLoading={planLoading} hasPlan={hasPlan} planError={planError} />
          <ActiveGoalsCard goals={data.dashboardActiveGoals} onSelectGoal={onSelectGoal} onAddGoal={onAddGoal} />
          <WeekRhythmCard
            system={data.activeSystem}
            currentWeek={data.dashboardKpiCurrentWeek}
            totalWeeks={data.dashboardKpiTotalWeeks}
            completedCount={
              data.activeSystemWeekCompletion?.completed ?? data.currentWeekExecutionSnapshot.completedTasks
            }
            totalCount={data.activeSystemWeekCompletion?.total ?? data.currentWeekExecutionSnapshot.totalTasks}
            leadAverage={data.dashboardKpiLeadAverage}
            wheelScore={data.averageLifeScore}
            streak={data.dashboardKpiStreak}
          />
          <TwelveWeekTrendCard points={trendPoints} currentWeek={data.dashboardKpiCurrentWeek} />
        </div>

        <aside className="space-y-5">
          {data.reviewDueToday ? (
            <ReflectionPrompt
              currentWeek={data.dashboardKpiCurrentWeek}
              reviewHref={data.dashboardNextAction.ctaTarget}
            />
          ) : null}
          <TodayMiniCard
            tasks={data.activeSystemTaskPreview.length > 0 ? data.activeSystemTaskPreview : data.activeSystemTodayTasks}
            completedCount={data.activeSystemTodayCompletedCount}
            totalCount={data.activeSystemTodayTasks.length}
          />
          <BalanceCard rows={balanceRows} />
          <QuoteBlock />
        </aside>
      </div>
    </div>
  );
}

function FreeGoalLimitCard({ current, limit, onUpgrade }: { current: number; limit: number; onUpgrade: () => void }) {
  return (
    <section className="mb-5 rounded-card border border-app-line bg-app-surface p-4" aria-label="Giới hạn gói Free">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-semibold text-app-ink">
            Gói Free: {current}/{limit} mục tiêu
          </p>
          <p className="mt-1 text-[13px] leading-6 text-app-ink-muted">
            Nâng cấp Plus khi bạn cần tạo thêm mục tiêu mới. Dữ liệu cũ vẫn được giữ nguyên.
          </p>
        </div>
        <button
          type="button"
          onClick={onUpgrade}
          className="inline-flex shrink-0 rounded-lg border border-app-line bg-app-surface px-3.5 py-2 text-[13px] font-medium text-app-accent transition-colors duration-150 hover:bg-app-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          Mở Plus
        </button>
      </div>
    </section>
  );
}

function TrialCountdownBanner({
  demoMode,
  renewsAt,
  onOpenPlan,
}: {
  demoMode: boolean;
  renewsAt?: string;
  onOpenPlan: () => void;
}) {
  if (!renewsAt || new Date(renewsAt) < new Date()) return null;

  const daysLeft = Math.max(0, Math.ceil((new Date(renewsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <section
      className="mb-5 rounded-card border border-app-line bg-app-surface p-4 text-[13px] text-app-ink-soft"
      aria-label="Thời hạn Plus"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span>
          <span className="font-semibold text-app-ink">
            {demoMode ? "Plus dùng thử:" : "Plus đang trong thời gian ưu đãi:"}
          </span>{" "}
          còn {daysLeft} ngày {demoMode ? "trên trình duyệt này" : "trên tài khoản này"}.
        </span>
        <button
          type="button"
          onClick={onOpenPlan}
          className="inline-flex shrink-0 rounded-lg border border-app-line bg-app-surface px-3 py-1.5 text-[13px] font-medium text-app-accent transition-colors duration-150 hover:bg-app-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:ml-auto"
        >
          Chi tiết
        </button>
      </div>
    </section>
  );
}

function DashboardPlanStateNotice({
  planLoading,
  hasPlan,
  planError,
}: {
  planLoading: boolean;
  hasPlan: boolean;
  planError: ReturnType<typeof usePlan12Week>["error"];
}) {
  if (planLoading && !hasPlan) {
    return (
      <div className="rounded-card border border-app-line bg-app-surface p-4 text-[13px] text-app-ink-muted">
        Đang tải dữ liệu Trang chính 12 tuần...
      </div>
    );
  }

  if (planError) {
    return (
      <div className="rounded-card border border-app-line bg-app-surface p-4 text-[13px] text-app-ink-soft">
        {planError.message}
      </div>
    );
  }

  return null;
}

function DemoDataNotice({ onOpenLifeBalance }: { onOpenLifeBalance: () => void }) {
  return (
    <section className="mt-6 rounded-card border border-app-line bg-app-accent-soft p-5" aria-label="Dữ liệu mẫu">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[14px] font-semibold text-app-accent">Dữ liệu đang hiển thị là ví dụ mẫu</p>
          <p className="mt-1 text-[13px] leading-6 text-app-ink-soft">
            Cập nhật bánh xe cuộc sống của bạn để thay dữ liệu mẫu bằng thông tin thật.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenLifeBalance}
          className="inline-flex shrink-0 rounded-lg bg-app-accent px-3.5 py-2 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-[#264d43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          Cập nhật ngay
        </button>
      </div>
    </section>
  );
}

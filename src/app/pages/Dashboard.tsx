import { AlertCircle, ArrowRight, Award, CheckCircle2, ChevronDown, Compass, Loader2, WifiOff, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
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
import { ActiveGoalsCard } from "@/features/dashboard/v2/ActiveGoalsCard";
import { BalanceCard } from "@/features/dashboard/v2/BalanceCard";
import { DailyStoicCard } from "@/features/dashboard/v2/DailyStoicCard";
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
import { usePlan12Week } from "@/features/plan12week/hooks";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { FeedbackDialog } from "../components/FeedbackDialog";
import { NewUserGuideBanner } from "../components/NewUserGuide";
import { SpotlightTour, type SpotlightTourStep } from "../components/SpotlightTour";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible";
import { Skeleton } from "../components/ui/skeleton";
import { useSetAssistantPageContext } from "../features/assistant/AssistantPageContextProvider";
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
  type Goal,
  getActiveTwelveWeekGoal,
  getLifeAreaLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTasksForWeek,
  getTwelveWeekTodayTasks,
  getTwelveWeekWeekCompletion,
  isTwelveWeekReviewDueToday,
  type LifeArea,
  type PricingPlanCode,
  sortReflectionsByDateDesc,
  type TwelveWeekSystem,
  type TwelveWeekTaskInstance,
  type UserData,
} from "../utils/storage";
import { formatDisplayDate } from "../utils/storage-date-utils";
import { dismissRescueTrigger, evaluateRescueTriggers } from "../utils/twelve-week-system-ui";

const DASHBOARD_TOUR_STEPS: SpotlightTourStep[] = [
  {
    id: "hero",
    targetId: "dashboard-next-card",
    title: "Đây là khối chính của Trang chủ",
    description: "Hãy nhìn khối này trước để biết mục tiêu hiện tại và nút đi tiếp nhanh nhất.",
  },
  {
    id: "plan",
    targetId: "dashboard-plan-card",
    title: "Đây là mục tiêu đang được ưu tiên",
    description: "Khối bên phải cho bạn thấy trọng tâm chu kỳ hiện tại và tiến độ của nó.",
  },
];

const DASHBOARD_SECONDARY_INSIGHTS_OPEN_KEY = "visionboard_dashboard_secondary_insights_open";

function getInitialSecondaryInsightsOpen(isDesktopViewport: boolean): boolean {
  if (typeof window === "undefined") return isDesktopViewport;

  try {
    const storedValue = window.localStorage.getItem(DASHBOARD_SECONDARY_INSIGHTS_OPEN_KEY);
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
  } catch {
    return isDesktopViewport;
  }

  return isDesktopViewport;
}

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
  const formattedDate = formatDisplayDate(date);
  return `${greeting} · ${weekday}, ${formattedDate}`.toLocaleUpperCase("vi-VN");
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

  useSetAssistantPageContext({
    pageType: "dashboard",
    hint: "Đang xem tổng quan mục tiêu và hệ thống 12 tuần",
  });

  if (!userData) {
    return (
      <div className="min-h-screen bg-app-bg text-app-ink">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <Skeleton className="h-14 rounded-[18px] bg-app-surface" />
            <Skeleton className="h-56 rounded-[18px] bg-app-surface" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-48 rounded-[18px] bg-app-surface lg:col-span-2" />
              <Skeleton className="h-48 rounded-[18px] bg-app-surface" />
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

  const activeSystemWeekTasks =
    effectiveSystem && activeSystemWeek
      ? getTwelveWeekTasksForWeek(effectiveSystem, activeSystemWeek).filter((task) => !task.skipped)
      : [];
  const activeSystemWeekOpenTasks = activeSystemWeekTasks.filter((task) => !task.completed);

  // Preview ưu tiên task hôm nay; nếu trống thì fallback sang task tuần này
  // chưa hoàn thành. Khi fallback, counter cũng đổi sang nguồn tuần để
  // "0/0 việc" không hiện sai cùng 3 task render từ tuần.
  const todayPreviewUsesToday = activeSystemTodayOpenTasks.length > 0;
  const activeSystemTaskPreview =
    effectiveSystem && activeSystemWeek
      ? (todayPreviewUsesToday ? activeSystemTodayOpenTasks : activeSystemWeekOpenTasks).slice(0, 3)
      : [];
  const todayPreviewTotal = todayPreviewUsesToday ? activeSystemTodayTasks.length : activeSystemWeekTasks.length;
  const todayPreviewCompleted = todayPreviewUsesToday
    ? activeSystemTodayCompletedCount
    : activeSystemWeekTasks.length - activeSystemWeekOpenTasks.length;
  const todayPreviewTitle = todayPreviewUsesToday ? "Việc hôm nay" : "Việc tuần này";
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
    activeSystemWeekOpenTasks,
    activeSystemTodayCompletedCount,
    activeSystemWeekCompletion,
    reviewDueToday,
    activeSystemTaskPreview,
    todayPreviewTotal,
    todayPreviewCompleted,
    todayPreviewTitle,
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
    shouldShowMainDashboardCard,
    shouldShowSetupGuide,
    shouldShowWorkspaceDetailGrid,
    radarData,
  };
}

function useDashboardAnalytics({
  signedIn,
  demoMode,
  isConfigured,
  hasLocalTwelveWeekSystem,
  visibleActiveTwelveWeekGoal,
  activeSystemWeek,
  effectiveSystem,
  currentPlanCode,
  topTrigger,
}: {
  signedIn: boolean;
  demoMode: boolean;
  isConfigured: boolean;
  hasLocalTwelveWeekSystem: boolean;
  visibleActiveTwelveWeekGoal: Goal | null;
  activeSystemWeek: number | null;
  effectiveSystem: TwelveWeekSystem | null;
  currentPlanCode: PricingPlanCode;
  topTrigger: ReturnType<typeof evaluateRescueTriggers>[number] | null;
}) {
  const landingViewedRef = useRef(false);
  const progressViewedGoalIdRef = useRef<string | null>(null);
  const firedTriggerKindRef = useRef<string | null>(null);

  useEffect(() => {
    if (landingViewedRef.current) return;

    landingViewedRef.current = true;
    trackAnalyticsEvent("landing_viewed", {
      source: "dashboard",
      app_mode: demoMode ? "demo" : "real",
      signed_in: signedIn,
      auth_configured: isConfigured,
      has_local_12_week_system: hasLocalTwelveWeekSystem,
    });
  }, [hasLocalTwelveWeekSystem, demoMode, isConfigured, signedIn]);

  useEffect(() => {
    if (!visibleActiveTwelveWeekGoal || !effectiveSystem || !activeSystemWeek) return;
    if (progressViewedGoalIdRef.current === visibleActiveTwelveWeekGoal.id) return;

    progressViewedGoalIdRef.current = visibleActiveTwelveWeekGoal.id;
    trackAnalyticsEvent(
      "progress_viewed",
      {
        source: "dashboard",
        week_number: activeSystemWeek,
        total_weeks: effectiveSystem.totalWeeks,
        current_plan: currentPlanCode,
      },
      { goalId: visibleActiveTwelveWeekGoal.id },
    );
  }, [currentPlanCode, activeSystemWeek, effectiveSystem, visibleActiveTwelveWeekGoal]);

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
    !isSignedOut &&
    currentPlanCode === "FREE" &&
    Number.isFinite(FREE_TIER_LIMITS.maxActiveGoals) &&
    goalLimitUsage.current > 0;
  const lastSavedLabel = getLastSavedLabel(userData, dashboardData.activeSystemTodayTasks);
  const balanceRows = getLifeBalanceRows(visibleWheelOfLife);

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

  useDashboardAnalytics({
    signedIn,
    demoMode,
    isConfigured,
    hasLocalTwelveWeekSystem: dashboardData.hasLocalTwelveWeekSystem,
    visibleActiveTwelveWeekGoal,
    activeSystemWeek: dashboardData.activeSystemWeek,
    effectiveSystem: dashboardData.effectiveSystem,
    currentPlanCode,
    topTrigger,
  });

  const dashboardTourSteps = isSignedOut ? [] : DASHBOARD_TOUR_STEPS;
  const showMobileStickyCTA = !isDesktopViewport && dashboardData.showMobileStickyCTA;

  return (
    <div
      className={
        showMobileStickyCTA
          ? "min-h-screen bg-app-bg pb-24 text-app-ink relative overflow-hidden"
          : "min-h-screen bg-app-bg text-app-ink relative overflow-hidden"
      }
    >
      {/* Lớp nền Ambient & Texture nâng cấp (ui-design) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {/* Lưới điểm mịn (Dot Grid) */}
        <div className="absolute inset-0 bg-[radial-gradient(#8080800c_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#ffffff04_1.2px,transparent_1.2px)] bg-[size:24px_24px] opacity-70" />

        {/* Bóng sáng Forest Green (Top Right) */}
        <div className="absolute -right-[10%] -top-[10%] w-[50%] aspect-square rounded-full bg-app-accent/4 dark:bg-app-accent/6 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />

        {/* Bóng sáng Amber (Bottom Left) */}
        <div className="absolute -left-[10%] bottom-[10%] w-[45%] aspect-square rounded-full bg-amber-500/2 dark:bg-amber-500/4 blur-[130px] mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 relative z-10">
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
            userData={userData}
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

        {!isSignedOut ? <DashboardFooter lastSavedLabel={lastSavedLabel} /> : null}

        {/* Desktop feedback button - inline */}
        <div className="hidden md:block mt-5 flex justify-end">
          <FeedbackDialog
            source="dashboard"
            context="dashboard"
            triggerLabel="Góp ý"
            triggerClassName="border-app-line bg-app-surface text-app-ink-muted hover:bg-app-bg"
          />
        </div>

        {/* Mobile floating feedback button */}
        <div className="fixed bottom-4 right-4 z-30 md:hidden">
          <FeedbackDialog
            source="dashboard"
            context="dashboard"
            triggerLabel=""
            triggerClassName="flex size-10 items-center justify-center rounded-full border border-app-line bg-app-surface/90 text-app-ink-soft shadow-sm transition-all duration-200 hover:bg-app-surface hover:text-app-ink hover:shadow-md backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
          />
        </div>
      </div>

      {showMobileStickyCTA ? (
        <div className="above-mobile-nav fixed bottom-0 left-0 right-0 z-40 border-t border-app-line/80 bg-app-surface/85 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md md:hidden">
          <button
            type="button"
            className="w-full rounded-xl bg-app-accent hover:bg-app-accent-hover px-4 py-3 text-sm font-semibold text-white shadow-xs transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
            onClick={() => navigate("/12-week-system?tab=today")}
          >
            Mở Today · {dashboardData.dashboardOpenTaskCount} việc hôm nay
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

function NextBestAction({ data }: { data: DashboardData }) {
  const navigate = useNavigate();
  const {
    activeSystemTodayOpenTasks,
    reviewDueToday,
    hasReviewedCurrentWeek,
    activeSystemWeek,
    activeSystemWeekOpenTasks,
    radarData,
  } = data;

  const hasRadarData = radarData && radarData.length > 0 && radarData.some((d) => d.value > 0);

  // Determine the next best action scenario
  let title = "";
  let description = "";
  let ctaLabel = "";
  let ctaPath = "";
  let Icon = Compass;
  let borderLeftColor = "border-l-emerald-600 dark:border-l-emerald-400";
  let bgClass =
    "bg-emerald-500/10 border-emerald-500/15 dark:bg-emerald-950/20 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-300";
  let iconColor = "text-emerald-600 dark:text-emerald-400";
  let buttonColor = "bg-emerald-700 hover:bg-emerald-800 text-white";

  if (!hasRadarData) {
    title = "Chưa thiết lập bánh xe cuộc sống";
    description = "Hãy dành 3 phút chấm điểm 8 khía cạnh cuộc sống để tìm ra khía cạnh lệch nhịp cần ưu tiên.";
    ctaLabel = "Chấm điểm ngay";
    ctaPath = "/onboarding";
    Icon = Compass;
    borderLeftColor = "border-l-amber-500 dark:border-l-amber-450";
    bgClass =
      "bg-amber-500/10 border-amber-500/15 dark:bg-amber-950/20 dark:border-amber-800/30 text-amber-900 dark:text-amber-300";
    iconColor = "text-amber-600 dark:text-amber-400";
    buttonColor = "bg-amber-500 hover:bg-amber-600 text-app-ink";
  } else if (activeSystemTodayOpenTasks.length > 0) {
    title = `Còn ${activeSystemTodayOpenTasks.length} việc cần hoàn thành hôm nay`;
    description = "Kiên trì thực hiện các hành động nhỏ để giữ vững Streak và hoàn thành mục tiêu 12 tuần.";
    ctaLabel = "Mở Today";
    ctaPath = "/12-week-system?tab=today";
    Icon = CheckCircle2;
  } else if (reviewDueToday && !hasReviewedCurrentWeek) {
    title = `Đến ngày Phản tư Tuần ${activeSystemWeek}`;
    description = "Hãy dành 5 phút tĩnh lặng để nhìn nhận lại chặng đường 7 ngày qua và đúc rút bài học.";
    ctaLabel = "Viết phản tư";
    ctaPath = "/12-week-system?tab=review";
    Icon = Award;
    borderLeftColor = "border-l-purple-600 dark:border-l-purple-400";
    bgClass =
      "bg-purple-500/10 border-purple-500/15 dark:bg-purple-950/20 dark:border-purple-800/30 text-purple-800 dark:text-purple-300";
    iconColor = "text-purple-600 dark:text-purple-400";
    buttonColor = "bg-purple-700 hover:bg-purple-800 text-white";
  } else if (activeSystemWeekOpenTasks.length > 0) {
    title = `Chu kỳ Tuần ${activeSystemWeek} đang chạy`;
    description = `Bạn còn ${activeSystemWeekOpenTasks.length} hành động chưa hoàn thành trong tuần này. Hãy tiếp tục nỗ lực!`;
    ctaLabel = "Xem kế hoạch";
    ctaPath = "/12-week-system?tab=week";
    Icon = AlertCircle;
  } else {
    title = "Mọi việc đã hoàn thành xuất sắc!";
    description = "Hôm nay bạn không còn nhiệm vụ nào chưa xử lý. Hãy nghỉ ngơi, chuẩn bị cho ngày tiếp theo.";
    ctaLabel = "Xem mục tiêu";
    ctaPath = "/goals";
    Icon = CheckCircle2;
  }

  return (
    <section
      className={`rounded-3xl border border-l-4 p-5 pl-4.5 shadow-3xs backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-300 hover:shadow-2xs ${borderLeftColor} ${bgClass} select-none relative`}
      aria-label="Hành động đề xuất tiếp theo"
    >
      {/* 📌 Floating pin for visual consistency */}
      <span className="hidden sm:inline absolute -top-3 left-6 text-lg filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        📌
      </span>

      <div className="flex gap-4 items-start sm:items-center">
        <div className="p-2.5 rounded-2xl bg-app-surface shadow-3xs shrink-0 flex items-center justify-center">
          <Icon className={`h-5 w-5 animate-pulse ${iconColor}`} />
        </div>
        <div className="space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-60">Hành động đề xuất</span>
          <h3 className="text-xs font-bold leading-tight">{title}</h3>
          <p className="text-xs font-semibold leading-relaxed opacity-80 max-w-xl">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate(ctaPath)}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-bold transition-all duration-200 hover:-translate-y-px active:scale-[0.98] cursor-pointer shadow-sm ${buttonColor}`}
      >
        <span>{ctaLabel}</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}

function DashboardActiveLayout({
  data,
  userData,
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
  userData: UserData;
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
  const isDesktopViewport = useBreakpoint();
  const [secondaryInsightsOpen, setSecondaryInsightsOpen] = useState(() =>
    getInitialSecondaryInsightsOpen(isDesktopViewport),
  );
  const trendPoints =
    data.weeklyProgressPoints.length > 0
      ? data.weeklyProgressPoints
      : buildSystemWeeklyProgressPoints(data.activeSystem);
  const planHref = "/12-week-system?tab=week";
  const handleSecondaryInsightsOpenChange = (open: boolean) => {
    setSecondaryInsightsOpen(open);
    try {
      window.localStorage.setItem(DASHBOARD_SECONDARY_INSIGHTS_OPEN_KEY, String(open));
    } catch {
      // Ignore storage failures; the dashboard remains usable without persistence.
    }
  };

  return (
    <div className="space-y-6">
      <div data-tour-id="dashboard-start-card" className="appear-fade-up" style={{ animationDelay: "0ms" }}>
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

      <div className="appear-fade-up animate-delay-100" style={{ animationDelay: "75ms" }}>
        <NewUserGuideBanner userData={userData} variant="compact" />
      </div>

      {/* Next Best Action Banner */}
      <div className="appear-fade-up animate-delay-100" style={{ animationDelay: "100ms" }}>
        <NextBestAction data={data} />
      </div>

      {topTrigger ? (
        <div className="appear-fade-up" style={{ animationDelay: "150ms" }}>
          <RescueAlert
            trigger={topTrigger}
            ctaLabel={topTrigger.kind === "trial_ending" ? "Mở Plus" : "Xem ngay"}
            onAction={onTriggerAction}
            onDismiss={onTriggerDismiss}
          />
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Left Column: Today Tasks & Execution Core */}
        <div className="space-y-6 lg:col-span-2">
          <DashboardPlanStateNotice planLoading={planLoading} hasPlan={hasPlan} planError={planError} />

          {/* Today Tasks - Primary Focus */}
          <div className="relative appear-fade-up" style={{ animationDelay: "200ms" }}>
            <TodayMiniCard
              title={data.todayPreviewTitle}
              tasks={data.activeSystemTaskPreview}
              completedCount={data.todayPreviewCompleted}
              totalCount={data.todayPreviewTotal}
            />
          </div>

          {/* Active Goals Card - Quieter border */}
          <div
            className="opacity-95 hover:opacity-100 transition-opacity duration-200 appear-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            <ActiveGoalsCard goals={data.dashboardActiveGoals} onSelectGoal={onSelectGoal} onAddGoal={onAddGoal} />
          </div>
        </div>

        {/* Right Column: Review prompt stays visible; secondary insights move into the collapsible group below. */}
        <aside className="space-y-6">
          {data.reviewDueToday ? (
            <div className="relative appear-fade-up" style={{ animationDelay: "150ms" }}>
              <span className="hidden sm:inline absolute -top-3 left-6 text-xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)] z-10">
                📌
              </span>
              <ReflectionPrompt
                currentWeek={data.dashboardKpiCurrentWeek}
                reviewHref={data.dashboardNextAction.ctaTarget}
              />
            </div>
          ) : null}
        </aside>
      </div>

      <Collapsible open={secondaryInsightsOpen} onOpenChange={handleSecondaryInsightsOpenChange}>
        <section
          className="rounded-2xl border border-app-line bg-app-surface/70 p-4 shadow-app-sm appear-fade-up sm:p-5"
          style={{ animationDelay: "400ms" }}
          aria-labelledby="dashboard-secondary-insights-title"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                id="dashboard-secondary-insights-title"
                className="text-sm font-semibold uppercase tracking-[0.14em] text-app-ink-muted"
              >
                Phân tích & nhịp độ
              </p>
              <p className="mt-1 text-sm leading-6 text-app-ink-soft">
                Biểu đồ, cân bằng và nguồn gợi ý được gom lại để phần việc hôm nay dễ quét hơn.
              </p>
            </div>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-app-line bg-app-bg px-4 py-2 text-sm font-semibold text-app-ink-soft transition-colors duration-150 hover:bg-app-bg-subtle hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                {secondaryInsightsOpen ? "Thu gọn" : "Mở phân tích"}
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-150 ${secondaryInsightsOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-5 lg:col-span-2">
                <div className="opacity-90 hover:opacity-100 transition-opacity duration-200">
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
                </div>

                <div className="opacity-85 hover:opacity-100 transition-opacity duration-200">
                  <TwelveWeekTrendCard points={trendPoints} currentWeek={data.dashboardKpiCurrentWeek} />
                </div>
              </div>

              <div className="space-y-5">
                <div className="opacity-95 hover:opacity-100 transition-opacity duration-200">
                  <BalanceCard rows={balanceRows} />
                </div>

                <div className="opacity-90 hover:opacity-100 transition-opacity duration-200">
                  <DailyStoicCard />
                </div>

                <div className="opacity-90 hover:opacity-100 transition-opacity duration-200">
                  <QuoteBlock />
                </div>

                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-app-line shadow-3xs group select-none opacity-90 transition-opacity duration-200 hover:opacity-100">
                  <img
                    src="/study_desk_hero.png"
                    alt="Góc học tập & lập kế hoạch ấm áp"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    width={320}
                    height={180}
                  />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 via-transparent to-transparent p-4">
                    <p className="font-serif text-[10px] font-medium italic text-white/90">
                      "Góc nhỏ kỷ luật cho những chu kỳ chuyển mình rõ nét."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>
    </div>
  );
}

function FreeGoalLimitCard({ current, limit, onUpgrade }: { current: number; limit: number; onUpgrade: () => void }) {
  return (
    <section
      className="mb-5 surface-raised rounded-xl border border-app-line bg-app-surface p-4"
      aria-label="Giới hạn gói Free"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-app-ink">
            Gói Free: {current}/{limit} mục tiêu
          </p>
          <p className="mt-1 text-sm leading-6 text-app-ink-muted">
            Nâng cấp Plus khi bạn cần tạo thêm mục tiêu mới. Dữ liệu cũ vẫn được giữ nguyên.
          </p>
        </div>
        <button
          type="button"
          onClick={onUpgrade}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-app-line bg-app-surface px-3.5 py-2 text-sm font-medium text-app-accent transition-colors duration-150 hover:bg-app-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
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
      className="mb-5 surface-raised rounded-xl border border-app-line bg-app-surface p-4 text-sm text-app-ink-soft"
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
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-app-line bg-app-surface px-3 py-1.5 text-sm font-medium text-app-accent transition-colors duration-150 hover:bg-app-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:ml-auto"
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
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed khi có lỗi mới
  const errorMessage = planError?.message ?? null;
  const prevErrorRef = useRef(errorMessage);
  if (errorMessage !== prevErrorRef.current) {
    prevErrorRef.current = errorMessage;
    if (errorMessage) setDismissed(false);
  }

  if (planLoading && !hasPlan) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-app-line/50 bg-app-surface/60 backdrop-blur-sm p-3 text-xs text-app-ink-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 opacity-60" />
        <span>Đang tải kế hoạch 12 tuần từ máy chủ…</span>
      </div>
    );
  }

  if (planError && !dismissed) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 backdrop-blur-sm p-3 text-xs text-amber-800 dark:text-amber-300">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span className="truncate">Không tải được kế hoạch từ máy chủ — dữ liệu hiển thị từ bộ nhớ cục bộ.</span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md p-1 transition-colors hover:bg-amber-200/40 dark:hover:bg-amber-800/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
          aria-label="Đóng thông báo"
        >
          <X className="h-3.5 w-3.5" />
        </button>
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
          <p className="text-sm font-semibold text-app-accent">Dữ liệu đang hiển thị là ví dụ mẫu</p>
          <p className="mt-1 text-sm leading-6 text-app-ink-soft">
            Cập nhật bánh xe cuộc sống của bạn để thay dữ liệu mẫu bằng thông tin thật.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenLifeBalance}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-app-accent px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
        >
          Cập nhật ngay
        </button>
      </div>
    </section>
  );
}

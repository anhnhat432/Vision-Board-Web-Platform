import type { PersonalCoachContext } from "@shared/personalCoachSchema";
import {
  ChevronDown,
  Gem,
  Loader2,
  WifiOff,
  X,
} from "lucide-react";
import { lazy, type ReactNode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { buildDashboardDailyExecutionSnapshot } from "@/features/dashboard/helpers/dashboardDailyExecution";
import {
  buildCurrentWeekExecutionSnapshot,
  buildGoalProgressSnapshot,
  buildWeeklyProgressPoints,
  calculateWeeklyStreak,
  type WeeklyProgressPoint,
} from "@/features/dashboard/helpers/dashboardInsights";
import { buildLoginPath } from "@/features/dashboard/helpers/dashboardNavigation";
import {
  getDashboardNextAction,
  resolveDashboardNextStepGuidance,
} from "@/features/dashboard/helpers/dashboardSections";
import { type DashboardWidgetId, getDashboardWidgetIds } from "@/features/dashboard/helpers/dashboardWidgetLayout";
import { useDashboardPlanLink } from "@/features/dashboard/hooks/useDashboardPlanLink";
import { ActiveGoalsCard } from "@/features/dashboard/v2/ActiveGoalsCard";
import { BalanceCard } from "@/features/dashboard/v2/BalanceCard";
import { DailyFocusCard } from "@/features/dashboard/v2/DailyFocusCard";
import { DailyStoicCard } from "@/features/dashboard/v2/DailyStoicCard";
import { DashboardFooter } from "@/features/dashboard/v2/DashboardFooter";
import { DashboardHero } from "@/features/dashboard/v2/DashboardHero";
import { NewUserSetupView } from "@/features/dashboard/v2/NewUserSetupView";
import { QuoteBlock } from "@/features/dashboard/v2/QuoteBlock";
import { ReflectionPrompt } from "@/features/dashboard/v2/ReflectionPrompt";
import { RescueAlert } from "@/features/dashboard/v2/RescueAlert";
import { TodayMiniCard } from "@/features/dashboard/v2/TodayMiniCard";
import { WeekRhythmCard } from "@/features/dashboard/v2/WeekRhythmCard";
import { WeeklyPulseCard } from "@/features/dashboard/v2/WeeklyPulseCard";
import { PersonalCoachCard } from "@/features/personalCoach/components/PersonalCoachCard";
import { buildPersonalCoachContext } from "@/features/personalCoach/context/buildPersonalCoachContext";
import { usePlan12Week } from "@/features/plan12week/hooks";
import { commitTwelveWeekTaskCompletion } from "@/features/plan12week/persistence/taskCompletionMutation";
import { useAuthContext } from "@/lib/auth/AuthContext";
import type { SpotlightTourStep } from "../components/SpotlightTour";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible";
import { Skeleton } from "../components/ui/skeleton";
import { useSetAssistantPageContext } from "../features/assistant/AssistantPageContextProvider";
import { LazyMamCompanion } from "../features/pet/LazyMamCompanion";
import { useBackendProgressOverlay } from "../hooks/useBackendProgressOverlay";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { usePageTour } from "../hooks/usePageTour";
import { usePlanEntitlements } from "../hooks/usePlanEntitlements";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { useUpgradeDialog } from "../hooks/useUpgradeDialog";
import { trackAnalyticsEvent } from "../utils/analytics";
import type { AppMode } from "../utils/app-mode";
import { isDemoMode } from "../utils/app-mode";
import { CORE_FLOW_STEP_ROUTE, deriveCoreFlowCompletion, isRegisteredRoute } from "../utils/core-flow-navigation";
import {
  type CoreFlowCompletion,
  CORE_FLOW_STEP_ORDER,
  type CoreFlowStepId,
  resolveCoreFlowPosition,
} from "../utils/core-flow-position";
import { resolveModeAwareCopy } from "../utils/demo-copy-guard";
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
  getTwelveWeekWeekCompletion,
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
    title: "Đây là việc quan trọng nhất hôm nay",
    description: "Hoàn thành trực tiếp tại đây để Trang chủ chuyển sang việc tiếp theo trong ngày.",
  },
  {
    id: "plan",
    targetId: "dashboard-plan-card",
    title: "Đây là nhịp thực tế của tuần",
    description: "Khối này cho biết tiến độ tuần, việc đang trễ và thời điểm review mà không thay thế việc hôm nay.",
  },
];

const DASHBOARD_SECONDARY_INSIGHTS_OPEN_KEY = "visionboard_dashboard_secondary_insights_open";

const FeedbackDialog = lazy(() =>
  import("../components/FeedbackDialog").then((module) => ({
    default: module.FeedbackDialog,
  })),
);

const NewUserGuideBanner = lazy(() =>
  import("../components/NewUserGuide").then((module) => ({
    default: module.NewUserGuideBanner,
  })),
);

const SpotlightTour = lazy(() =>
  import("../components/SpotlightTour").then((module) => ({
    default: module.SpotlightTour,
  })),
);

const TwelveWeekTrendCard = lazy(() =>
  import("@/features/dashboard/v2/TwelveWeekTrendCard").then((module) => ({
    default: module.TwelveWeekTrendCard,
  })),
);

const UpgradePaywallDialog = lazy(() =>
  import("../components/UpgradePaywallDialog").then((module) => ({
    default: module.UpgradePaywallDialog,
  })),
);

const PublicVisitorView = lazy(() =>
  import("@/features/dashboard/v2/PublicVisitorView").then((module) => ({
    default: module.PublicVisitorView,
  })),
);

function PublicVisitorFallback() {
  return (
    <div className="min-h-screen bg-app-bg px-4 py-8 text-app-ink">
      <div className="mx-auto max-w-4xl rounded-card border border-app-line bg-app-surface p-6 shadow-app-sm">
        <p className="text-sm font-semibold text-app-ink">Đang mở Dear Our Future...</p>
      </div>
    </div>
  );
}

function getInitialSecondaryInsightsOpen(isDesktopViewport: boolean): boolean {
  if (typeof window === "undefined") return isDesktopViewport;

  // Mobile: luôn thu gọn ban đầu để tránh section "Phân tích & nhịp độ" tràn
  // ~2000px cuộn. Stored value chỉ áp dụng cho desktop (nơi có không gian dọc).
  if (!isDesktopViewport) return false;

  try {
    const storedValue = window.localStorage.getItem(DASHBOARD_SECONDARY_INSIGHTS_OPEN_KEY);
    if (storedValue === "true") return true;
    if (storedValue === "false") return false;
  } catch {
    return isDesktopViewport;
  }

  return isDesktopViewport;
}

function useNearViewport<TElement extends Element>(enabled: boolean, rootMargin = "280px") {
  const ref = useRef<TElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    if (!enabled || isNearViewport) return;
    const element = ref.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      setIsNearViewport(true);
      return;
    }

    let idleHandle: number | null = null;
    const fallbackTimerId = window.setTimeout(() => {
      const loadWhenIdle = () => setIsNearViewport(true);

      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(loadWhenIdle, { timeout: 800 });
        return;
      }

      loadWhenIdle();
    }, 450);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsNearViewport(true);
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(element);
    return () => {
      window.clearTimeout(fallbackTimerId);
      if (idleHandle !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }
      observer.disconnect();
    };
  }, [enabled, isNearViewport, rootMargin]);

  return [ref, isNearViewport] as const;
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
            <Skeleton className="h-14 rounded-card bg-app-surface" />
            <Skeleton className="h-56 rounded-card bg-app-surface" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
  coreFlowCompletion,
  onboardingCompleted,
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
  coreFlowCompletion: CoreFlowCompletion;
  onboardingCompleted: boolean;
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
  const {
    effectiveSystem,
    invalidateOverlay: invalidateBackendProgressOverlay,
  } = useBackendProgressOverlay(
    visibleActiveTwelveWeekGoal?.id ?? null,
    localActiveSystem,
  );
  const dailyExecution = useMemo(
    () => (localActiveSystem ? buildDashboardDailyExecutionSnapshot(localActiveSystem) : null),
    [localActiveSystem],
  );
  const activeSystemWeek = dailyExecution?.currentWeek ?? null;
  const activeSystemWeekCompletion = dailyExecution?.weekCompletion ?? null;
  const reviewDueToday = Boolean(dailyExecution?.reviewDueToday);
  const baseDashboardNextAction = getDashboardNextAction({
    hasGoal: visibleGoals.length > 0,
    hasTwelveWeekSystem: Boolean(effectiveSystem),
    reviewDueToday,
    hasOpenTodayTasks: Boolean(dailyExecution?.homePrimaryTask),
    hasReviewedCurrentWeek: Boolean(dailyExecution?.hasReviewedCurrentWeek),
    currentWeek: activeSystemWeek,
    totalWeeks: effectiveSystem?.totalWeeks ?? null,
  });
  // Nối Next_Step_Guidance với vị trí Core_Flow cho các trạng thái TRƯỚC khi có
  // hệ thống 12 tuần (gồm khi Onboarding chưa xong): `resolveCoreFlowPosition`
  // cho biết bước chưa hoàn tất đầu tiên (Req 2.1) và guidance chỉ trỏ tới route
  // đã đăng ký trong `createAppRoutes` (Req 2.6). `currentStepId` chỉ dùng để
  // đọc `firstIncompleteStepId` (suy ra từ completion, độc lập currentStepId).
  //
  // Khi đã có hệ thống 12 tuần, giữ nguyên guidance gốc của
  // `getDashboardNextAction` (review/today/chu kỳ) để không đụng tới ctaTarget
  // mà `reflection_prompt` đang dùng làm reviewHref.
  //
  // Người dùng chưa hoàn tất Onboarding: bước `life_balance` được vào qua trình
  // Onboarding (`/onboarding`) để giữ nguyên phễu hiện có thay vì màn chấm lại
  // độc lập `/life-balance`; sau khi onboarded thì dùng route Core_Flow chuẩn.
  const firstIncompleteStepId = resolveCoreFlowPosition(
    CORE_FLOW_STEP_ORDER[0],
    coreFlowCompletion,
  ).firstIncompleteStepId;
  const dashboardStepRoute: Record<CoreFlowStepId, string> = onboardingCompleted
    ? CORE_FLOW_STEP_ROUTE
    : { ...CORE_FLOW_STEP_ROUTE, life_balance: "/onboarding" };
  const dashboardNextAction = effectiveSystem
    ? baseDashboardNextAction
    : resolveDashboardNextStepGuidance({
        baseAction: baseDashboardNextAction,
        firstIncompleteStepId,
        stepRoute: dashboardStepRoute,
        isRouteRegistered: isRegisteredRoute,
      });
  const dashboardActiveGoals = visibleActiveTwelveWeekGoal ? [visibleActiveTwelveWeekGoal] : recentGoals;
  const dashboardKpiLeadAverage = activeSystemWeekCompletion?.percent ?? currentWeekExecutionSnapshot.executionScore;
  const dashboardKpiCurrentWeek = activeSystemWeek ?? currentWeekExecutionSnapshot.weekNumber ?? null;
  const dashboardKpiTotalWeeks = effectiveSystem?.totalWeeks ?? 12;
  const dashboardKpiStreak = weeklyStreak > 0 ? weeklyStreak : journalStreak;
  const dashboardOpenTaskCount = dailyExecution?.todayRemainingCount ?? 0;
  const hasLocalTwelveWeekSystem = Boolean(localActiveSystem);
  const hasWorkspaceSignals =
    hasRealLifeBalance || visibleGoals.length > 0 || visibleVisionBoards.length > 0 || visibleReflections.length > 0;
  const shouldShowMainDashboardCard =
    !isSignedOut && !isFreshDemoVisitor && (Boolean(effectiveSystem) || hasWorkspaceSignals);
  const shouldShowSetupGuide = !isSignedOut && !isFreshDemoVisitor && !effectiveSystem;
  const shouldShowWorkspaceDetailGrid =
    !isSignedOut && !isFreshDemoVisitor && (Boolean(effectiveSystem) || hasWorkspaceSignals);
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
    localActiveSystem,
    effectiveSystem,
    invalidateBackendProgressOverlay,
    dailyExecution,
    activeSystemWeek,
    activeSystemWeekCompletion,
    reviewDueToday,
    dashboardNextAction,
    dashboardActiveGoals,
    dashboardKpiLeadAverage,
    dashboardKpiCurrentWeek,
    dashboardKpiTotalWeeks,
    dashboardKpiStreak,
    dashboardOpenTaskCount,
    hasLocalTwelveWeekSystem,
    hasWorkspaceSignals,
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
  const navigate = useNavigate();
  const location = useLocation();
  const { isConfigured, user } = useAuthContext();
  const [dismissedTrigger, setDismissedTrigger] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const completingTaskIdRef = useRef<string | null>(null);
  const releaseCompletionLock = useCallback(() => {
    completingTaskIdRef.current = null;
    setCompletingTaskId(null);
  }, []);
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
  const handleRetryPlanLoad = () => {
    if (!dashboardPlanId) return;
    void loadPlan(dashboardPlanId);
  };
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

  // Completion Core_Flow suy từ dữ liệu người dùng đang hiển thị (chỉ đọc, không
  // đổi Storage_Contract) để nối Next_Step_Guidance với bước chưa hoàn tất.
  const coreFlowCompletion = useMemo(
    () =>
      deriveCoreFlowCompletion({
        ...userData,
        goals: visibleGoals,
        currentWheelOfLife: visibleWheelOfLife,
      }),
    [userData, visibleGoals, visibleWheelOfLife],
  );
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
    coreFlowCompletion,
    onboardingCompleted: !isSignedOut && userData.onboardingCompleted,
  });
  const personalCoachContext = useMemo(
    () =>
      visibleActiveTwelveWeekGoal && dashboardData.localActiveSystem
        ? buildPersonalCoachContext({
            goal: visibleActiveTwelveWeekGoal,
            system: dashboardData.localActiveSystem,
          })
        : null,
    [dashboardData.localActiveSystem, visibleActiveTwelveWeekGoal],
  );
  useEffect(() => {
    if (!completingTaskId) return;
    const task = dashboardData.localActiveSystem?.taskInstances.find((item) => item.id === completingTaskId);
    if (!task || task.completed) releaseCompletionLock();
  }, [completingTaskId, dashboardData.localActiveSystem, releaseCompletionLock]);

  const handleCompletePrimaryTask = (taskId: string) => {
    if (!visibleActiveTwelveWeekGoal || completingTaskIdRef.current) return;

    completingTaskIdRef.current = taskId;
    setCompletingTaskId(taskId);
    const result = commitTwelveWeekTaskCompletion({
      goalId: visibleActiveTwelveWeekGoal.id,
      taskId,
      completed: true,
    });

    if (result.status === "local_save_failed") {
      releaseCompletionLock();
      toast.error("Không thể cập nhật, vui lòng thử lại");
      return;
    }

    dashboardData.invalidateBackendProgressOverlay();
    onReload();

    if (result.status === "applied") {
      toast.success("Đã chốt việc hôm nay.");
      return;
    }

    if (result.status === "not_found") {
      toast.error("Việc này vừa thay đổi. Trang chính đang cập nhật lại.");
    }
  };
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
  const lastSavedLabel = getLastSavedLabel(userData, dashboardData.dailyExecution?.scheduledTodayTasks ?? []);
  const balanceRows = getLifeBalanceRows(visibleWheelOfLife);

  const activeTriggers = evaluateRescueTriggers({
    system: dashboardData.effectiveSystem,
    subscription: isSignedOut ? null : (userData.subscription ?? null),
    missedTasksCount: dashboardData.dailyExecution?.overdueOpenCount ?? 0,
    weekCompletionPercent: dashboardData.dailyExecution?.weekCompletion.percent ?? 0,
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

  // Khách chưa đăng nhập: render landing "Dear Our Future" tràn viền, KHÔNG bọc
  // trong container max-w-6xl / lớp nền ambient / nút feedback của bản signed-in,
  // để header + footer riêng của thiết kế hiển thị đúng full-bleed.
  if (isSignedOut) {
    return (
      <Suspense fallback={<PublicVisitorFallback />}>
        <PublicVisitorView
          isDemo={demoMode}
          hasLocalData={hasSignedOutRealLocalData}
          onStart={handlePublicVisitorStart}
          onSignIn={() => handleAuthNavigate("signin")}
          onSignUp={() => handleAuthNavigate("signup")}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-ink relative overflow-hidden">
      {/* Lớp nền Ambient & Texture nâng cấp (ui-design) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {/* Lưới điểm mịn (Dot Grid) */}
        <div className="absolute inset-0 bg-[radial-gradient(#8080800c_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#ffffff04_1.2px,transparent_1.2px)] bg-[size:24px_24px] opacity-70" />

        {/* Bóng sáng Forest Green (Top Right) */}
        <div
          className="absolute -right-[18%] -top-[20%] h-[48rem] w-[48rem]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--app-accent) 8%, transparent) 0%, transparent 68%)",
            willChange: "transform",
            transform: "translate3d(0, 0, 0)",
          }}
        />

        {/* Bóng sáng Amber (Bottom Left) */}
        <div
          className="absolute -left-[18%] bottom-[4%] h-[44rem] w-[44rem]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--app-energy) 6%, transparent) 0%, transparent 70%)",
            willChange: "transform",
            transform: "translate3d(0, 0, 0)",
          }}
        />
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

        {!dashboardData.effectiveSystem ? (
          <div className="space-y-6">
            <NewUserSetupView
              userData={userData}
              displayName={dashboardDisplayName}
              onContinue={(href) => navigate(href)}
              companion={<LazyMamCompanion initialEvent="welcomeBack" />}
              nextStepGuidance={dashboardData.dashboardNextAction}
            />
            <PersonalCoachCard context={null} setupHref={dashboardData.dashboardNextAction.ctaTarget} />
          </div>
        ) : (
          <DashboardActiveLayout
            data={dashboardData}
            personalCoachContext={personalCoachContext}
            personalCoachSetupHref={dashboardData.dashboardNextAction.ctaTarget}
            userData={userData}
            displayName={dashboardDisplayName}
            caption={caption}
            lastSavedLabel={lastSavedLabel}
            balanceRows={balanceRows}
            topTrigger={topTrigger}
            completingTaskId={completingTaskId}
            planLoading={planLoading}
            hasPlan={Boolean(plan)}
            planError={planError}
            onRetryPlanLoad={dashboardPlanId ? handleRetryPlanLoad : undefined}
            onSelectGoal={(goal) => navigate(getGoalTarget(goal))}
            onAddGoal={() => navigate("/life-insight")}
            onCompletePrimaryTask={handleCompletePrimaryTask}
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
          <Suspense fallback={null}>
            <FeedbackDialog
              source="dashboard"
              context="dashboard"
              triggerLabel="Góp ý"
              triggerClassName="border-app-line bg-app-surface text-app-ink-muted hover:bg-app-bg"
            />
          </Suspense>
        </div>

        {/* Mobile floating feedback button */}
        <div className="fixed bottom-4 right-4 z-30 md:hidden">
          <Suspense fallback={null}>
            <FeedbackDialog
              source="dashboard"
              context="dashboard"
              triggerLabel=""
              triggerClassName="flex size-10 items-center justify-center rounded-full border border-app-line bg-app-surface text-app-ink-soft shadow-sm transition-all duration-200 hover:bg-app-surface hover:text-app-ink hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            />
          </Suspense>
        </div>
      </div>

      {isUpgradeDialogOpen ? (
        <Suspense fallback={null}>
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
        </Suspense>
      ) : null}
      {isTourOpen ? (
        <Suspense fallback={null}>
          <SpotlightTour
            open={isTourOpen}
            onOpenChange={setIsTourOpen}
            title="Tour Trang chính"
            description="Ba điểm chính để người mới mở vào là biết nên bắt đầu từ đâu."
            steps={dashboardTourSteps}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

type DashboardData = ReturnType<typeof useDashboardDerivedData>;

function DashboardActiveLayout({
  data,
  personalCoachContext,
  personalCoachSetupHref,
  userData,
  displayName,
  caption,
  lastSavedLabel,
  balanceRows,
  topTrigger,
  completingTaskId,
  planLoading,
  hasPlan,
  planError,
  onRetryPlanLoad,
  onSelectGoal,
  onAddGoal,
  onCompletePrimaryTask,
  onTriggerAction,
  onTriggerDismiss,
}: {
  data: DashboardData;
  personalCoachContext: PersonalCoachContext | null;
  personalCoachSetupHref: string;
  userData: UserData;
  displayName: string;
  caption: string;
  lastSavedLabel: string;
  balanceRows: LifeBalanceRow[];
  topTrigger: ReturnType<typeof evaluateRescueTriggers>[number] | null;
  completingTaskId: string | null;
  planLoading: boolean;
  hasPlan: boolean;
  planError: ReturnType<typeof usePlan12Week>["error"];
  onRetryPlanLoad?: () => void;
  onSelectGoal: (goal: Goal) => void;
  onAddGoal: () => void;
  onCompletePrimaryTask: (taskId: string) => void;
  onTriggerAction: () => void;
  onTriggerDismiss: () => void;
}) {
  const isDesktopViewport = useBreakpoint();
  const [secondaryInsightsOpen, setSecondaryInsightsOpen] = useState(() =>
    getInitialSecondaryInsightsOpen(isDesktopViewport),
  );
  const [secondaryInsightsRef, shouldLoadTrendChart] = useNearViewport<HTMLDivElement>(secondaryInsightsOpen);
  const lastPetNudgeKeyRef = useRef<string | null>(null);
  const trendPoints =
    data.weeklyProgressPoints.length > 0
      ? data.weeklyProgressPoints
      : buildSystemWeeklyProgressPoints(data.effectiveSystem);
  const handleSecondaryInsightsOpenChange = (open: boolean) => {
    setSecondaryInsightsOpen(open);
    try {
      window.localStorage.setItem(DASHBOARD_SECONDARY_INSIGHTS_OPEN_KEY, String(open));
    } catch {
      // Ignore storage failures; the dashboard remains usable without persistence.
    }
  };

  useEffect(() => {
    const nudgeKey = `${data.dashboardGoalTitle}:${data.dashboardOpenTaskCount}`;
    if (data.dashboardOpenTaskCount <= 0 || lastPetNudgeKeyRef.current === nudgeKey) return;

    lastPetNudgeKeyRef.current = nudgeKey;
    const timer = window.setTimeout(() => {
      void import("../features/pet/petEvents").then(({ emitPetEvent }) => {
        emitPetEvent({
          event: "gentleNudge",
          source: "dashboard",
          message: "Không sao nếu lệch nhịp. Bắt đầu lại từ một việc nhỏ.",
        });
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [data.dashboardGoalTitle, data.dashboardOpenTaskCount]);

  const secondaryMainIds = getDashboardWidgetIds("secondary", "main");
  const secondarySideIds = getDashboardWidgetIds("secondary", "side");

  const widgetNodes: Partial<Record<DashboardWidgetId, ReactNode>> = {
    week_rhythm: (
      <WeekRhythmCard
        system={data.effectiveSystem}
        currentWeek={data.dashboardKpiCurrentWeek}
        totalWeeks={data.dashboardKpiTotalWeeks}
        completedCount={data.activeSystemWeekCompletion?.completed ?? data.currentWeekExecutionSnapshot.completedTasks}
        totalCount={data.activeSystemWeekCompletion?.total ?? data.currentWeekExecutionSnapshot.totalTasks}
        leadAverage={data.dashboardKpiLeadAverage}
        wheelScore={data.averageLifeScore}
        streak={data.dashboardKpiStreak}
      />
    ),
    twelve_week_trend: shouldLoadTrendChart ? (
      <Suspense
        fallback={<div className="h-[280px] rounded-card border border-app-line bg-app-surface p-5 md:p-6" />}
      >
        <TwelveWeekTrendCard points={trendPoints} currentWeek={data.dashboardKpiCurrentWeek} />
      </Suspense>
    ) : (
      <div className="h-[280px] rounded-card border border-app-line bg-app-surface p-5 md:p-6" />
    ),
    balance: <BalanceCard rows={balanceRows} />,
    daily_stoic: <DailyStoicCard />,
    quote: <QuoteBlock />,
  };

  const renderWidgetSlot = (ids: DashboardWidgetId[]) =>
    ids
      .map((id) => ({ id, node: widgetNodes[id] }))
      .filter((entry): entry is { id: DashboardWidgetId; node: ReactNode } => entry.node != null)
      .map((entry, index) => (
        <div key={entry.id} className="appear-fade-up" style={{ animationDelay: `${index * 75}ms` }}>
          {entry.node}
        </div>
      ));

  return (
    <div className="space-y-6">
      <div data-tour-id="dashboard-start-card" className="appear-fade-up" style={{ animationDelay: "0ms" }}>
        <DashboardHero
          caption={caption}
          currentWeek={data.dailyExecution?.currentWeek ?? data.dashboardKpiCurrentWeek}
          totalWeeks={data.dashboardKpiTotalWeeks}
          displayName={displayName}
          lastSavedLabel={lastSavedLabel}
        />
      </div>

      <DashboardPlanStateNotice
        planLoading={planLoading}
        hasPlan={hasPlan}
        planError={planError}
        onRetry={onRetryPlanLoad}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)] lg:items-stretch">
        <DailyFocusCard
          task={data.dailyExecution?.homePrimaryTask ?? null}
          goalTitle={data.dashboardGoalTitle}
          completedCount={data.dailyExecution?.todayCompletedCount ?? 0}
          totalCount={data.dailyExecution?.todayTotalCount ?? 0}
          reviewDueToday={Boolean(data.dailyExecution?.reviewDueToday)}
          completing={completingTaskId === data.dailyExecution?.homePrimaryTask?.id}
          onComplete={onCompletePrimaryTask}
        />
        <WeeklyPulseCard
          currentWeek={data.dailyExecution?.currentWeek ?? 1}
          totalWeeks={data.dashboardKpiTotalWeeks}
          completedCount={data.dailyExecution?.weekCompletion.completed ?? 0}
          totalCount={data.dailyExecution?.weekCompletion.total ?? 0}
          percent={data.dailyExecution?.weekCompletion.percent ?? 0}
          overdueOpenCount={data.dailyExecution?.overdueOpenCount ?? 0}
          reviewDueToday={Boolean(data.dailyExecution?.reviewDueToday)}
        />
      </div>

      <PersonalCoachCard context={personalCoachContext} setupHref={personalCoachSetupHref} />

      <TodayMiniCard
        tasks={data.dailyExecution?.homeSecondaryTasks ?? []}
        completedCount={data.dailyExecution?.todayCompletedCount ?? 0}
        totalCount={data.dailyExecution?.todayTotalCount ?? 0}
        companion={
          <LazyMamCompanion initialEvent={data.dailyExecution?.todayRemainingCount ? "gentleNudge" : "welcomeBack"} />
        }
      />

      {data.dailyExecution?.reviewDueToday && data.dailyExecution.homePrimaryTask ? (
        <ReflectionPrompt currentWeek={data.dailyExecution.currentWeek} reviewHref="/12-week-system?tab=week" />
      ) : null}

      {topTrigger ? (
        <RescueAlert
          trigger={topTrigger}
          ctaLabel={topTrigger.kind === "trial_ending" ? "Mở Plus" : "Xem ngay"}
          onAction={onTriggerAction}
          onDismiss={onTriggerDismiss}
        />
      ) : null}

      <Suspense fallback={null}>
        <NewUserGuideBanner userData={userData} variant="compact" />
      </Suspense>

      <ActiveGoalsCard goals={data.dashboardActiveGoals} onSelectGoal={onSelectGoal} onAddGoal={onAddGoal} />

      <Collapsible open={secondaryInsightsOpen} onOpenChange={handleSecondaryInsightsOpenChange}>
        <section
          className="rounded-2xl border border-app-line bg-app-surface/70 p-4 shadow-app-sm appear-fade-up sm:p-5"
          style={{ animationDelay: "400ms" }}
          aria-labelledby="dashboard-secondary-insights-title"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="dashboard-secondary-insights-title"
                className="font-serif text-xl font-bold tracking-tight text-app-ink"
              >
                Phân tích & nhịp độ
              </h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-app-ink-soft">
                Biểu đồ, cân bằng và nguồn gợi ý gom lại để tuần này dễ quét hơn.
              </p>
            </div>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-app-line bg-app-surface px-4 py-2 text-xs font-semibold text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
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
            {/* Nhóm secondary — luôn nằm dưới nhóm core_flow trong thứ tự đọc (Req 3.2, 3.3) */}
            <div ref={secondaryInsightsRef} className="mt-5 grid items-start gap-[18px] lg:grid-cols-[1.5fr_1fr]">
              <div className="space-y-[18px]">{renderWidgetSlot(secondaryMainIds)}</div>

              <div className="space-y-[18px] contain-render-lazy">{renderWidgetSlot(secondarySideIds)}</div>
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
      className="mb-4 flex items-center gap-3 rounded-card border border-app-line bg-app-surface px-4 py-2.5"
      aria-label="Giới hạn gói Free"
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-control bg-app-accent-subtle text-app-accent"
        aria-hidden="true"
      >
        <Gem className="h-4 w-4" />
      </span>
      <p className="flex-1 text-[12.5px] font-semibold text-app-ink">
        Gói Free ·{" "}
        <span className="font-mono text-app-accent">
          {current}/{limit}
        </span>{" "}
        mục tiêu
        <span className="font-normal text-app-ink-muted"> — nâng cấp Plus để tạo thêm mục tiêu mới.</span>
      </p>
      <button
        type="button"
        onClick={onUpgrade}
        className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full bg-app-ink px-4 py-1.5 text-[12px] font-semibold text-app-bg transition-all duration-200 hover:-translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
      >
        Mở Plus
      </button>
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

  // Bọc copy đếm ngược/hạn gói qua resolveModeAwareCopy: real mode luôn demo-free
  // (không rò rỉ "dùng thử"/"trên trình duyệt này"), demo mode giữ nguyên chuỗi gốc.
  // Req 8.1, 8.2, 8.3.
  const appMode: AppMode = demoMode ? "demo" : "real";
  const titleCopy = resolveModeAwareCopy(demoMode ? "Plus dùng thử:" : "Plus đang trong thời gian ưu đãi:", appMode);
  const detailCopy = resolveModeAwareCopy(
    `còn ${daysLeft} ngày ${demoMode ? "trên trình duyệt này" : "trên tài khoản này"}.`,
    appMode,
  );

  return (
    <section
      className="mb-5 surface-raised rounded-xl border border-app-line bg-app-surface p-4 text-sm text-app-ink-soft"
      aria-label="Thời hạn Plus"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span>
          <span className="font-semibold text-app-ink">{titleCopy}</span> {detailCopy}
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
  onRetry,
}: {
  planLoading: boolean;
  hasPlan: boolean;
  planError: ReturnType<typeof usePlan12Week>["error"];
  onRetry?: () => void;
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
      <div className="flex items-center justify-between gap-2 rounded-xl border border-app-status-warning/40 bg-app-status-warning/10 backdrop-blur-sm p-3 text-xs text-app-status-warning">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span className="truncate">Không tải được kế hoạch từ máy chủ — dữ liệu hiển thị từ bộ nhớ cục bộ.</span>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-app-status-warning/30 px-3 py-1 text-xs font-semibold transition-colors hover:bg-app-status-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-status-warning/40"
            aria-label="Thử lại tải kế hoạch"
          >
            Thử lại
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md p-1 transition-colors hover:bg-app-status-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-status-warning/40"
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

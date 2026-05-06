import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Crown,
  Images,
  LogIn,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { toast } from "sonner";
import { DashboardDataBackupCard } from "@/features/dashboard/components/DashboardDataBackupCard";
import { ExecutionScoreCard } from "@/features/dashboard/components/ExecutionScoreCard";
import { GoalProgressCard } from "@/features/dashboard/components/GoalProgressCard";
import { MetricsSummary } from "@/features/dashboard/components/MetricsSummary";
import { PublicVisitorAccountCard } from "@/features/dashboard/components/PublicVisitorAccountCard";
import { PublicVisitorHero } from "@/features/dashboard/components/PublicVisitorHero";
import { StreakCard } from "@/features/dashboard/components/StreakCard";
import { WeeklyProgressChart } from "@/features/dashboard/components/WeeklyProgressChart";
import {
  buildCurrentWeekExecutionSnapshot,
  buildGoalProgressSnapshot,
  buildLeadMetricsSummary,
  buildWeeklyProgressPoints,
  calculateWeeklyStreak,
} from "@/features/dashboard/helpers/dashboardInsights";
import { buildLoginPath } from "@/features/dashboard/helpers/dashboardNavigation";
import { useDashboardPlanLink } from "@/features/dashboard/hooks/useDashboardPlanLink";
import { usePlan12Week } from "@/features/plan12week/hooks";
import { useAuthContext } from "@/lib/auth/AuthContext";
import { FeedbackDialog } from "../components/FeedbackDialog";
import { PageHeader } from "../components/layout/PageHeader";
import { NewUserGuideBanner } from "../components/NewUserGuide";
import { SpotlightTour, type SpotlightTourStep } from "../components/SpotlightTour";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import { EmptyState } from "../components/states";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { CountUp } from "../components/ui/count-up";
import { Progress } from "../components/ui/progress";
import { Reveal } from "../components/ui/reveal";
import { Skeleton } from "../components/ui/skeleton";
import { useBackendProgressOverlay } from "../hooks/useBackendProgressOverlay";
import { usePageTour } from "../hooks/usePageTour";
import { usePlanEntitlements } from "../hooks/usePlanEntitlements";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { useUpgradeDialog } from "../hooks/useUpgradeDialog";
import { trackAnalyticsEvent } from "../utils/analytics";
import { isDemoMode } from "../utils/app-mode";
import {
  trackRescueActionTaken,
  trackRescueTriggerDismissed,
  trackRescueTriggerFired,
} from "../utils/monetization-analytics";
import { downloadLocalUserDataBackup } from "../utils/local-data-backup";
import {
  calculateGoalProgress,
  formatCalendarDate,
  getActiveTwelveWeekGoal,
  getGoalExecutionStats,
  getLifeAreaLabel,
  getReviewDayLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTasksForWeek,
  getTwelveWeekTodayTasks,
  getTwelveWeekWeekCompletion,
  getTwelveWeekWeekRange,
  isTwelveWeekReviewDueToday,
  parseStoredUserData,
  saveUserData,
  sortReflectionsByDateDesc,
  type UserData,
} from "../utils/storage";
import { getEntitlementLabel, getPlanLabel } from "../utils/twelve-week-premium";
import { dismissRescueTrigger, evaluateRescueTriggers } from "../utils/twelve-week-system-ui";

const DashboardLifeAreaRadar = lazy(async () => {
  const module = await import("../components/DashboardLifeAreaRadar");
  return { default: module.DashboardLifeAreaRadar };
});

const DASHBOARD_TOUR_STEPS: SpotlightTourStep[] = [
  {
    id: "start",
    targetId: "dashboard-start-card",
    title: "Báº¯t Ä‘áº§u tá»« khá»‘i nÃ y",
    description:
      "Náº¿u chÆ°a cÃ³ chu ká»³, hÃ£y nhÃ¬n khá»‘i nÃ y trÆ°á»›c. ÄÃ¢y lÃ  nÆ¡i dáº«n báº¡n qua Ä‘Ãºng flow: insight, SMART, kiá»ƒm tra tÃ­nh thá»±c táº¿ rá»“i má»›i vÃ o 12 tuáº§n.",
  },
  {
    id: "attention",
    targetId: "dashboard-next-card",
    title: "NhÃ¬n khá»‘i nÃ y trÆ°á»›c khi quÃ©t cáº£ mÃ n",
    description: "Pháº§n 'Äi tiáº¿p ngay' gom ba tÃ­n hiá»‡u quan trá»ng nháº¥t Ä‘á»ƒ báº¡n biáº¿t nÃªn má»Ÿ vÃ o Ä‘Ã¢u tiáº¿p theo.",
  },
  {
    id: "plan",
    targetId: "dashboard-plan-card",
    title: "PhÃ¢n biá»‡t Free vÃ  Plus á»Ÿ Ä‘Ã¢y",
    description: "Khá»‘i nÃ y cho biáº¿t báº¡n Ä‘ang á»Ÿ gÃ³i nÃ o, quyá»n nÃ o Ä‘Ã£ má»Ÿ vÃ  chá»— Ä‘á»ƒ quáº£n lÃ½ hoáº·c khÃ´i phá»¥c láº¡i náº¿u cáº§n.",
  },
];

export function Dashboard() {
  const { userData, reloadUserData } = useSyncedUserData();
  const { isTourOpen, setIsTourOpen } = usePageTour("dashboard");

  if (!userData) {
    return (
      <div className="ops-shell ops-dashboard">
        {/* Hero card skeleton */}
        <Skeleton className="h-56 rounded-[28px]" />
        {/* Quick action tiles skeleton */}
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-[22px]" />
          ))}
        </div>
        {/* Stat cards skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-[22px]" />
          ))}
        </div>
        {/* Content cards skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-[28px]" />
          <Skeleton className="h-48 rounded-[28px]" />
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
  const importFileRef = useRef<HTMLInputElement>(null);
  const landingViewedRef = useRef(false);
  const progressViewedGoalIdRef = useRef<string | null>(null);
  const { currentPlanCode, currentPlanDefinition, entitlementKeys, premiumStatusItems } = usePlanEntitlements(userData);
  const demoMode = isDemoMode();
  const isPublicVisitor = isConfigured && !user;
  const shouldRequireAuthForPublicVisitor = isPublicVisitor && !demoMode;
  const visibleGoals = isPublicVisitor ? [] : userData.goals;
  const visibleWheelOfLife = isPublicVisitor ? [] : userData.currentWheelOfLife;
  const visibleReflections = isPublicVisitor ? [] : userData.reflections;
  const visibleVisionBoards = isPublicVisitor ? [] : userData.visionBoards;
  const visibleActiveTwelveWeekGoal = isPublicVisitor ? null : activeTwelveWeekGoal;
  const hasRealLifeBalance =
    !isPublicVisitor && userData.onboardingCompleted && visibleWheelOfLife.some((area) => area.score > 0);
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
    if (shouldRequireAuthForPublicVisitor) {
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

  const recentGoals = visibleGoals.slice(0, 3);
  const recentReflections = sortReflectionsByDateDesc(visibleReflections).slice(0, 2);
  const dashboardGoalTitle = visibleActiveTwelveWeekGoal?.title ?? plan?.vision ?? "Má»¥c tiÃªu hiá»‡n táº¡i";
  const goalProgressSnapshot = useMemo(() => buildGoalProgressSnapshot(plan), [plan]);
  const currentWeekExecutionSnapshot = useMemo(() => buildCurrentWeekExecutionSnapshot(plan), [plan]);
  const weeklyProgressPoints = useMemo(() => buildWeeklyProgressPoints(plan), [plan]);
  const weeklyStreak = useMemo(() => calculateWeeklyStreak(weeklyProgressPoints), [weeklyProgressPoints]);
  const leadMetricsSummary = useMemo(() => buildLeadMetricsSummary(plan), [plan]);

  const handleExport = () => {
    downloadLocalUserDataBackup({ data: userData, filenamePrefix: "dear-our-future-backup" });
    toast.success("ÄÃ£ táº£i báº£n sao lÆ°u dá»¯ liá»‡u.");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== "string") {
        toast.error("KhÃ´ng Ä‘á»c Ä‘Æ°á»£c file.");
        return;
      }
      const parsed = parseStoredUserData(text);
      if (!parsed) {
        toast.error("File khÃ´ng há»£p lá»‡ hoáº·c bá»‹ há»ng.");
        return;
      }
      saveUserData(parsed);
      onReload();
      toast.success("ÄÃ£ khÃ´i phá»¥c dá»¯ liá»‡u thÃ nh cÃ´ng!");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const latestVisionBoard = visibleVisionBoards[visibleVisionBoards.length - 1];
  const completedGoalsCount = visibleGoals.filter((goal) => calculateGoalProgress(goal) === 100).length;
  const executionTotals = visibleGoals.reduce(
    (sum, goal) => {
      const execution = getGoalExecutionStats(goal);
      return {
        total: sum.total + execution.total,
        completed: sum.completed + execution.completed,
      };
    },
    { total: 0, completed: 0 },
  );
  const totalTasks = executionTotals.total;
  const completedTasks = executionTotals.completed;
  const averageLifeScore =
    hasRealLifeBalance && visibleWheelOfLife.length > 0
      ? visibleWheelOfLife.reduce((sum, area) => sum + area.score, 0) / visibleWheelOfLife.length
      : 0;

  // Compute journal writing streak
  const journalStreak = (() => {
    const sorted = [...visibleReflections].sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length === 0) return 0;
    const dates = [...new Set(sorted.map((r) => r.date.slice(0, 10)))];
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    if (dates[0] !== todayKey && dates[0] !== yesterdayKey) return 0;
    let streak = 0;
    const check = new Date(dates[0]);
    for (const d of dates) {
      const expected = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, "0")}-${String(check.getDate()).padStart(2, "0")}`;
      if (d !== expected) break;
      streak++;
      check.setDate(check.getDate() - 1);
    }
    return streak;
  })();

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
  const activeSystemWeekRange =
    effectiveSystem && activeSystemWeek ? getTwelveWeekWeekRange(effectiveSystem, activeSystemWeek) : null;
  const reviewDueToday = Boolean(effectiveSystem && isTwelveWeekReviewDueToday(effectiveSystem));
  const activeSystemTaskPreview =
    effectiveSystem && activeSystemWeek
      ? (activeSystemTodayOpenTasks.length > 0
          ? activeSystemTodayOpenTasks
          : getTwelveWeekTasksForWeek(effectiveSystem, activeSystemWeek).filter((task) => !task.completed)
        ).slice(0, 3)
      : [];
  const signedIn = Boolean(user);
  const hasLocalTwelveWeekSystem = Boolean(effectiveSystem);
  const hasWorkspaceSignals =
    hasRealLifeBalance || visibleGoals.length > 0 || visibleVisionBoards.length > 0 || visibleReflections.length > 0;

  const shouldShowMainDashboardCard = !isPublicVisitor && (Boolean(activeSystem) || hasWorkspaceSignals);
  const showMobileStickyCTA = shouldShowMainDashboardCard && activeSystem && activeSystemTodayOpenTasks.length > 0;

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
  }, [demoMode, hasLocalTwelveWeekSystem, isConfigured, signedIn]);

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
  }, [activeSystemWeek, currentPlanCode, effectiveSystem, visibleActiveTwelveWeekGoal]);

  const radarData = hasRealLifeBalance
    ? visibleWheelOfLife.map((area) => ({
        subject: getLifeAreaLabel(area.name),
        value: area.score,
        fullMark: 10,
      }))
    : [];

  const setupPrimaryPath = hasRealLifeBalance ? "/life-insight" : "/onboarding";
  const setupPrimaryLabel = hasRealLifeBalance ? "Táº¡o má»¥c tiÃªu" : "Báº¯t Ä‘áº§u Life Balance";
  const setupStartTitle = hasRealLifeBalance
    ? "Äi qua insight rá»“i chá»‘t má»¥c tiÃªu SMART."
    : "Cháº¥m Life Balance trÆ°á»›c Ä‘á»ƒ dashboard khÃ´ng bá»‹ rá»—ng.";
  const setupStartDescription = hasRealLifeBalance
    ? "ÄÃ¢y lÃ  funnel gá»‘c cá»§a web: insight trÆ°á»›c, SMART sau, rá»“i má»›i kiá»ƒm tra tÃ­nh thá»±c táº¿ vÃ  vÃ o há»‡ 12 tuáº§n."
    : "BÆ°á»›c nÃ y táº¡o dá»¯ liá»‡u tháº­t cho cÃ¡c mÃ n sau: Life Insight, SMART Goal, kiá»ƒm tra tÃ­nh thá»±c táº¿ vÃ  káº¿ hoáº¡ch 12 tuáº§n.";
  const publicVisitorBadge = demoMode ? "Báº£n demo lÆ°u trÃªn trÃ¬nh duyá»‡t nÃ y" : "ÄÄƒng kÃ½ Ä‘á»ƒ lÆ°u vÃ  Ä‘á»“ng bá»™ dá»¯ liá»‡u";
  const publicVisitorDashboardTitle = demoMode
    ? "DÃ¹ng thá»­ flow MVP 1 ngay trÃªn trÃ¬nh duyá»‡t hiá»‡n táº¡i."
    : "Trang chÃ­nh giÃºp báº¡n nhÃ¬n rÃµ luá»“ng sáº£n pháº©m trÆ°á»›c khi táº¡o tÃ i khoáº£n.";
  const publicVisitorDashboardDescription = demoMode
    ? "Báº¡n cÃ³ thá»ƒ báº¯t Ä‘áº§u Onboarding, cháº¥m Life Balance, chá»n insight, táº¡o SMART goal vÃ  Ä‘i tá»›i 12-week setup mÃ  khÃ´ng cáº§n Ä‘Äƒng nháº­p. Báº£n demo lÆ°u dá»¯ liá»‡u trÃªn trÃ¬nh duyá»‡t nÃ y; hÃ£y export náº¿u muá»‘n giá»¯ báº£n sao."
    : "Báº¡n cÃ³ thá»ƒ xem tá»•ng quan ngay táº¡i Ä‘Ã¢y. Khi báº¯t Ä‘áº§u tháº­t, hÃ£y Ä‘Äƒng kÃ½ Ä‘á»ƒ dá»¯ liá»‡u má»¥c tiÃªu vÃ  káº¿ hoáº¡ch khÃ´ng bá»‹ máº¥t theo trÃ¬nh duyá»‡t.";
  const publicVisitorStartTitle = demoMode
    ? "DÃ¹ng thá»­ khÃ´ng cáº§n Ä‘Äƒng nháº­p."
    : "Táº¡o tÃ i khoáº£n trÆ°á»›c khi nháº­p dá»¯ liá»‡u tháº­t.";
  const publicVisitorStartDescription = demoMode
    ? "Báº¯t Ä‘áº§u báº±ng Onboarding hoáº·c Life Balance Ä‘á»ƒ tráº£i nghiá»‡m core flow MVP 1. ÄÄƒng nháº­p/sync lÃ  lá»›p sau, khÃ´ng báº¯t buá»™c cho demo."
    : "Pháº§n onboarding, má»¥c tiÃªu vÃ  káº¿ hoáº¡ch Ä‘á»u lÃ  dá»¯ liá»‡u cÃ¡ nhÃ¢n. ÄÄƒng kÃ½ trÆ°á»›c sáº½ giÃºp báº¡n lÆ°u láº¡i tiáº¿n trÃ¬nh vÃ  quay láº¡i Ä‘Ãºng workspace sau nÃ y.";
  const publicVisitorPrimaryLabel = demoMode ? "DÃ¹ng thá»­ khÃ´ng cáº§n Ä‘Äƒng nháº­p" : "ÄÄƒng kÃ½ miá»…n phÃ­";

  const overviewCards = isPublicVisitor
    ? [
        {
          title: "Luá»“ng cá»‘t lÃµi",
          value: 7,
          note: "tá»« cÃ¢n báº±ng cuá»™c sá»‘ng tá»›i review tuáº§n",
          icon: Target,
          iconClass: "bg-slate-950 text-white",
        },
        {
          title: "Chu ká»³ thá»±c thi",
          value: 12,
          note: "tuáº§n Ä‘á»ƒ biáº¿n má»¥c tiÃªu thÃ nh viá»‡c rÃµ rÃ ng",
          icon: CalendarDays,
          iconClass: "bg-sky-100 text-sky-700",
        },
        {
          title: "TÃ i khoáº£n",
          value: 1,
          note: demoMode ? "tÃ¹y chá»n Ä‘á»ƒ sync sau, khÃ´ng báº¯t buá»™c" : "nÆ¡i Ä‘á»“ng bá»™ má»¥c tiÃªu vÃ  káº¿ hoáº¡ch cá»§a báº¡n",
          icon: UserPlus,
          iconClass: "bg-emerald-100 text-emerald-700",
        },
        {
          title: "Review",
          value: 1,
          note: "nhá»‹p nhÃ¬n láº¡i má»—i tuáº§n Ä‘á»ƒ khÃ´ng Ä‘i lá»‡ch",
          icon: BookOpen,
          iconClass: "bg-violet-100 text-violet-700",
        },
      ]
    : [
        {
          title: "Má»¥c tiÃªu Ä‘ang theo",
          value: userData.goals.length,
          note: `${completedGoalsCount} Ä‘Ã£ hoÃ n thÃ nh`,
          icon: Target,
          iconClass: "bg-slate-950 text-white",
        },
        {
          title: "Viá»‡c Ä‘Ã£ chá»‘t",
          value: completedTasks,
          note: `trÃªn tá»•ng sá»‘ ${totalTasks}`,
          icon: TrendingUp,
          iconClass: "bg-sky-100 text-sky-700",
        },
        {
          title: "ThÃ nh tá»±u",
          value: userData.achievements.length,
          note: "huy hiá»‡u Ä‘Ã£ má»Ÿ khÃ³a",
          icon: Award,
          iconClass: "bg-emerald-100 text-emerald-700",
        },
        {
          title: "Nháº­t kÃ½",
          value: userData.reflections.length,
          note: journalStreak > 0 ? `streak ${journalStreak} ngÃ y` : "bÃ i viáº¿t Ä‘Ã£ lÆ°u",
          icon: BookOpen,
          iconClass: "bg-violet-100 text-violet-700",
        },
      ];

  const quickActions = isPublicVisitor
    ? [
        {
          title: demoMode ? "TÃ¹y chá»n: Ä‘Äƒng kÃ½ Ä‘á»ƒ sync sau" : "ÄÄƒng kÃ½ Ä‘á»ƒ lÆ°u workspace",
          description: demoMode
            ? "Demo váº«n dÃ¹ng Ä‘Æ°á»£c khÃ´ng cáº§n Ä‘Äƒng nháº­p. TÃ i khoáº£n chá»‰ dÃ nh cho lá»›p lÆ°u/sync sau nÃ y."
            : "Táº¡o workspace riÃªng Ä‘á»ƒ lÆ°u bÃ¡nh xe cuá»™c sá»‘ng, má»¥c tiÃªu SMART vÃ  káº¿ hoáº¡ch 12 tuáº§n.",
          icon: UserPlus,
          onClick: () => handleAuthNavigate("signup"),
        },
        {
          title: "ÄÄƒng nháº­p náº¿u Ä‘Ã£ cÃ³ tÃ i khoáº£n",
          description: demoMode
            ? "KhÃ´ng báº¯t buá»™c cho demo. Chá»‰ dÃ¹ng khi báº¡n muá»‘n thá»­ lá»›p tÃ i khoáº£n/sync sau nÃ y."
            : "Quay láº¡i Ä‘Ãºng dá»¯ liá»‡u Ä‘Ã£ Ä‘á»“ng bá»™: má»¥c tiÃªu, tuáº§n hiá»‡n táº¡i vÃ  review gáº§n nháº¥t.",
          icon: LogIn,
          onClick: () => handleAuthNavigate("signin"),
        },
        {
          title: demoMode ? "Demo cÃ³ thá»ƒ Ä‘i tháº³ng vÃ o core flow" : "ÄÄƒng kÃ½ rá»“i Ä‘i theo luá»“ng chÃ­nh",
          description: demoMode
            ? "CTA demo chÃ­nh sáº½ Ä‘Æ°a báº¡n vÃ o Life Balance mÃ  khÃ´ng cáº§n tÃ i khoáº£n."
            : "Sau khi cÃ³ workspace, báº¡n Ä‘i tá»« Life Balance, chá»n insight, chá»‘t má»¥c tiÃªu SMART rá»“i má»›i vÃ o 12 tuáº§n.",
          icon: CalendarDays,
          onClick: () => handleAuthNavigate("signup"),
        },
      ]
    : [
        {
          title: activeSystem ? "Má»Ÿ trung tÃ¢m 12 tuáº§n" : setupPrimaryLabel,
          description: activeSystem
            ? "VÃ o tháº³ng hÃ ng viá»‡c hÃ´m nay."
            : hasRealLifeBalance
              ? "Äi tiáº¿p Ä‘Ãºng thá»© tá»±: insight, SMART, kiá»ƒm tra tÃ­nh thá»±c táº¿ rá»“i má»›i vÃ o 12 tuáº§n."
              : "Cháº¥m Life Balance trÆ°á»›c Ä‘á»ƒ cÃ³ dá»¯ liá»‡u tháº­t cho má»¥c tiÃªu.",
          icon: CalendarDays,
          onClick: () => navigate(activeSystem ? "/12-week-system" : setupPrimaryPath),
        },
        {
          title: "Má»Ÿ má»¥c tiÃªu",
          description: "Xem tiáº¿n Ä‘á»™ vÃ  háº¡n chÃ³t hiá»‡n táº¡i.",
          icon: Target,
          onClick: () => navigate("/goals"),
        },
        {
          title: "Má»Ÿ nháº­t kÃ½",
          description: "Ghi láº¡i suy ngáº«m gáº§n Ä‘Ã¢y.",
          icon: BookOpen,
          onClick: () => navigate("/journal"),
        },
      ];
  const quickActionIntro = isPublicVisitor
    ? "Má»™t ngÆ°á»i má»›i chá»‰ cáº§n Ä‘i theo má»™t Ä‘Æ°á»ng: hiá»ƒu hiá»‡n táº¡i, chá»n má»¥c tiÃªu, kiá»ƒm tra kháº£ thi, rá»“i cháº¡y 12 tuáº§n."
    : activeSystem
      ? "Äi theo thá»© tá»±: xá»­ lÃ½ viá»‡c hÃ´m nay, kiá»ƒm tra má»¥c tiÃªu, rá»“i ghi láº¡i Ä‘iá»u há»c Ä‘Æ°á»£c."
      : "Äi theo thá»© tá»±: táº¡o má»¥c tiÃªu, kiá»ƒm tra hÆ°á»›ng Ä‘i, rá»“i ghi láº¡i suy nghÄ© Ä‘áº§u tiÃªn.";

  const attentionPanels = isPublicVisitor
    ? [
        {
          eyebrow: "Äiá»ƒm báº¯t Ä‘áº§u",
          title: demoMode ? "ÄÄƒng nháº­p khÃ´ng pháº£i cá»•ng cháº·n demo" : "Äá»«ng vÃ o tháº³ng 12 tuáº§n khi má»¥c tiÃªu cÃ²n mÆ¡ há»“",
          description: demoMode
            ? "Báº¡n cÃ³ thá»ƒ dÃ¹ng core flow ngay trÃªn trÃ¬nh duyá»‡t nÃ y. ÄÄƒng kÃ½ chá»‰ lÃ  lá»±a chá»n Ä‘á»ƒ chuáº©n bá»‹ sync sau."
            : "Web nÃ y dáº«n báº¡n tá»« bá»©c tranh cuá»™c sá»‘ng hiá»‡n táº¡i tá»›i má»™t má»¥c tiÃªu SMART Ä‘á»§ rÃµ, rá»“i má»›i chia thÃ nh káº¿ hoáº¡ch 12 tuáº§n.",
          cardClass: "rounded-[22px] border border-slate-300 bg-slate-50/90 p-4 shadow-sm",
          eyebrowClass: "text-slate-500",
          titleClass: "text-slate-950",
          descriptionClass: "text-slate-600",
          buttonClass: "mt-4 bg-slate-950 text-white hover:bg-slate-800",
          buttonVariant: "outline" as const,
          buttonLabel: demoMode ? "ÄÄƒng kÃ½ náº¿u muá»‘n sync" : "Báº¯t Ä‘áº§u miá»…n phÃ­",
          icon: Target,
          onClick: () => handleAuthNavigate("signup"),
        },
        {
          eyebrow: "Dá»¯ liá»‡u cÃ¡ nhÃ¢n",
          title: demoMode ? "Sync lÃ  lá»›p sau cá»§a demo local-first" : "ÄÄƒng nháº­p Ä‘á»ƒ Ä‘á»“ng bá»™ thay vÃ¬ chá»‰ lÆ°u trÃªn mÃ¡y",
          description: demoMode
            ? "Báº£n demo hiá»‡n lÆ°u trÃªn trÃ¬nh duyá»‡t nÃ y. Náº¿u muá»‘n giá»¯ báº£n sao, hÃ£y export dá»¯ liá»‡u trÆ°á»›c khi Ä‘á»•i mÃ¡y hoáº·c xÃ³a site data."
            : "Khi cÃ³ tÃ i khoáº£n, má»¥c tiÃªu, káº¿ hoáº¡ch vÃ  tiáº¿n Ä‘á»™ Ä‘Æ°á»£c ná»‘i vá»›i workspace cá»§a báº¡n thay vÃ¬ phá»¥ thuá»™c vÃ o trÃ¬nh duyá»‡t hiá»‡n táº¡i.",
          cardClass: "rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm",
          eyebrowClass: "text-slate-400",
          titleClass: "text-slate-900",
          descriptionClass: "text-slate-600",
          buttonClass: "mt-4 border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
          buttonVariant: "outline" as const,
          buttonLabel: "ÄÄƒng nháº­p",
          icon: LogIn,
          onClick: () => handleAuthNavigate("signin"),
        },
      ]
    : activeSystem
      ? [
          {
            eyebrow: "Chu ká»³ Ä‘ang cháº¡y",
            title: visibleActiveTwelveWeekGoal?.title ?? "Chu ká»³ 12 tuáº§n hiá»‡n táº¡i",
            description:
              activeSystemTodayOpenTasks.length > 0
                ? `${activeSystemTodayOpenTasks.length} viá»‡c Ä‘ang má»Ÿ hÃ´m nay. Äi tháº³ng vÃ o trung tÃ¢m Ä‘á»ƒ cháº¡m tiáº¿p Ä‘Ãºng viá»‡c cáº§n lÃ m.`
                : `Tuáº§n ${activeSystemWeek}/${activeSystem.totalWeeks} Ä‘ang khÃ¡ gá»n. ÄÃ¢y lÃ  lÃºc Ä‘áº¹p Ä‘á»ƒ nhÃ¬n láº¡i tuáº§n hoáº·c chuáº©n bá»‹ review.`,
            cardClass: "rounded-[22px] border border-slate-300 bg-slate-50/90 p-4 shadow-sm",
            eyebrowClass: "text-slate-500",
            titleClass: "text-slate-950",
            descriptionClass: "text-slate-600",
            buttonClass: "mt-4 bg-slate-950 text-white hover:bg-slate-800",
            buttonVariant: "outline" as const,
            buttonLabel: "Má»Ÿ trung tÃ¢m 12 tuáº§n",
            icon: CalendarDays,
            onClick: () => navigate("/12-week-system"),
          },
          {
            eyebrow: "Review tuáº§n",
            title: reviewDueToday ? "Äáº¿n háº¡n hÃ´m nay" : getReviewDayLabel(activeSystem.reviewDay),
            description: reviewDueToday
              ? "NÃªn chá»‘t trÆ°á»›c khi sang nhá»‹p tuáº§n má»›i Ä‘á»ƒ dashboard quay vá» tráº¡ng thÃ¡i gá»n Ä‘áº§u."
              : "Chu ká»³ Ä‘ang cÃ³ ngÃ y review cá»‘ Ä‘á»‹nh. Khi tá»›i háº¡n, tháº» cáº£nh bÃ¡o sáº½ ná»•i lÃªn á»Ÿ Ä‘áº§u mÃ n.",
            cardClass: `rounded-[22px] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] ${
              reviewDueToday ? "border-amber-200 bg-amber-50/92" : "border-slate-200 bg-white"
            }`,
            eyebrowClass: reviewDueToday ? "text-amber-700" : "text-slate-400",
            titleClass: "text-slate-900",
            descriptionClass: "text-slate-600",
            buttonClass: reviewDueToday
              ? "mt-4 border-amber-200 bg-white text-amber-800 hover:bg-amber-100"
              : "mt-4 border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
            buttonVariant: "outline" as const,
            buttonLabel: reviewDueToday ? "Chá»‘t review tuáº§n" : "Xem chu ká»³",
            icon: AlertTriangle,
            onClick: () => navigate("/12-week-system"),
          },
          ...(weakestArea
            ? [
                {
                  eyebrow: "LÄ©nh vá»±c nÃªn chÄƒm láº¡i",
                  title: getLifeAreaLabel(weakestArea.name),
                  description: `Äiá»ƒm hiá»‡n táº¡i ${weakestArea.score}/10. Náº¿u hÃ´m nay cÃ²n thá»i gian, Ä‘Ã¢y lÃ  nÆ¡i Ä‘Ã¡ng quay láº¡i trÆ°á»›c.`,
                  cardClass: "rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm",
                  eyebrowClass: "text-slate-400",
                  titleClass: "text-slate-900",
                  descriptionClass: "text-slate-600",
                  buttonClass: "mt-4 border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                  buttonVariant: "outline" as const,
                  buttonLabel: "Má»Ÿ cÃ¢n báº±ng cuá»™c sá»‘ng",
                  icon: TrendingUp,
                  onClick: () => navigate("/life-balance"),
                },
              ]
            : []),
        ]
      : [
          {
            eyebrow: "Thiáº¿t láº­p nhá»‹p 12 tuáº§n",
            title: "ChÆ°a cÃ³ chu ká»³ Ä‘ang cháº¡y",
            description:
              "Táº¡o má»™t chu ká»³ Ä‘á»ƒ web luÃ´n tráº£ lá»i rÃµ hÃ´m nay nÃªn lÃ m gÃ¬, tuáº§n nÃ y Ä‘ang á»Ÿ Ä‘Ã¢u vÃ  review khi nÃ o Ä‘áº¿n háº¡n.",
            cardClass: "rounded-[22px] border border-slate-300 bg-slate-50/90 p-4 shadow-sm",
            eyebrowClass: "text-slate-500",
            titleClass: "text-slate-950",
            descriptionClass: "text-slate-600",
            buttonClass: "mt-4 bg-slate-950 text-white hover:bg-slate-800",
            buttonVariant: "outline" as const,
            buttonLabel: "Táº¡o má»¥c tiÃªu",
            icon: CalendarDays,
            onClick: () => navigate("/life-insight"),
          },
          ...(weakestArea
            ? [
                {
                  eyebrow: "LÄ©nh vá»±c nÃªn chÄƒm láº¡i",
                  title: getLifeAreaLabel(weakestArea.name),
                  description: `Äiá»ƒm hiá»‡n táº¡i ${weakestArea.score}/10. Náº¿u muá»‘n báº¯t Ä‘áº§u nháº¹ hÆ¡n, hÃ£y cáº£i thiá»‡n má»™t gÃ³c nhá» á»Ÿ Ä‘Ã¢y trÆ°á»›c.`,
                  cardClass: "rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm",
                  eyebrowClass: "text-slate-400",
                  titleClass: "text-slate-900",
                  descriptionClass: "text-slate-600",
                  buttonClass: "mt-4 border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                  buttonVariant: "outline" as const,
                  buttonLabel: "Má»Ÿ cÃ¢n báº±ng cuá»™c sá»‘ng",
                  icon: TrendingUp,
                  onClick: () => navigate("/life-balance"),
                },
              ]
            : []),
          {
            eyebrow: "Báº£ng táº§m nhÃ¬n",
            title: latestVisionBoard ? latestVisionBoard.name : "ChÆ°a cÃ³ báº£ng táº§m nhÃ¬n",
            description: latestVisionBoard
              ? `NÄƒm ${latestVisionBoard.year} â€¢ ${latestVisionBoard.items.length} pháº§n tá»­ Ä‘ang Ä‘Æ°á»£c lÆ°u láº¡i.`
              : "Táº¡o má»™t báº£ng táº§m nhÃ¬n Ä‘á»ƒ trá»±c quan hÃ³a Ä‘iá»u báº¡n Ä‘ang hÆ°á»›ng tá»›i vÃ  quay láº¡i nÃ³ dá»… hÆ¡n má»—i ngÃ y.",
            cardClass: "rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm",
            eyebrowClass: "text-slate-400",
            titleClass: "text-slate-900",
            descriptionClass: "text-slate-600",
            buttonClass: "mt-4 border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
            buttonVariant: "outline" as const,
            buttonLabel: latestVisionBoard ? "Má»Ÿ thÆ° viá»‡n táº§m nhÃ¬n" : "Táº¡o báº£ng táº§m nhÃ¬n",
            icon: Images,
            onClick: () => navigate(latestVisionBoard ? "/gallery" : "/vision-board"),
          },
        ];
  const dashboardAttentionPanels = attentionPanels.slice(0, 2);

  const overdueCount = activeSystem ? activeSystemTodayTasks.filter((t) => !t.completed).length : 0;
  const activeTriggers = evaluateRescueTriggers({
    system: activeSystem,
    subscription: isPublicVisitor ? null : (userData.subscription ?? null),
    missedTasksCount: overdueCount,
    weekCompletionPercent: activeSystemWeekCompletion?.percent ?? 0,
  }).filter((t) => t.kind !== dismissedTrigger);
  const topTrigger = activeTriggers[0] ?? null;
  const shouldShowSetupGuide = !isPublicVisitor && !activeSystem;
  const shouldShowTopSidebar = !isPublicVisitor && !activeSystem && hasWorkspaceSignals;
  const shouldShowWorkspaceDetailGrid = !isPublicVisitor && (Boolean(activeSystem) || hasWorkspaceSignals);
  // Signed-out visitors get their hero from `PublicVisitorHero` (rendered above);
  // skip the secondary dashboard card for them to avoid a double-hero.
  const dashboardTourSteps = shouldShowTopSidebar
    ? DASHBOARD_TOUR_STEPS
    : DASHBOARD_TOUR_STEPS.filter(
        (step) => step.targetId !== "dashboard-next-card" && step.targetId !== "dashboard-plan-card",
      );

  return (
    <div className={`ops-shell ops-dashboard ${showMobileStickyCTA ? 'pb-24' : ''}`}>
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
      {isPublicVisitor ? (
        <>
          <PublicVisitorHero
            isDemo={demoMode}
            onStartDemo={handlePublicVisitorStart}
            onSignIn={() => handleAuthNavigate("signin")}
            onSignUp={() => handleAuthNavigate("signup")}
          />
          <div className="flex justify-end">
            <FeedbackDialog
              source="dashboard"
              context="dashboard"
              triggerClassName="border-slate-200 bg-white/80 text-slate-700 hover:bg-white"
            />
          </div>
        </>
      ) : shouldShowSetupGuide ? (
        <NewUserGuideBanner userData={userData} variant="compact" />
      ) : null}

      {/* Rescue trigger nudge banner */}
      {topTrigger &&
        (() => {
          const severityStyles = {
            urgent: {
              wrapper: "border-rose-200 bg-rose-50",
              icon: "bg-rose-100 text-rose-600",
              headline: "text-rose-800",
              detail: "text-rose-700",
            },
            caution: {
              wrapper: "border-amber-200 bg-amber-50",
              icon: "bg-amber-100 text-amber-600",
              headline: "text-amber-800",
              detail: "text-amber-700",
            },
            watch: {
              wrapper: "border-slate-200 bg-slate-50",
              icon: "bg-slate-100 text-slate-500",
              headline: "text-slate-800",
              detail: "text-slate-600",
            },
          } as const;
          const s = severityStyles[topTrigger.severity];
          const ctaHref = topTrigger.kind === "trial_ending" ? "/billing/plan" : "/12-week-system";
          const ctaLabel = topTrigger.kind === "trial_ending" ? "Má»Ÿ mock upgrade" : "Xem ngay";
          return (
            <Reveal key={topTrigger.kind}>
              <div
                className={`rounded-xl border px-4 py-3 text-sm flex flex-wrap items-start gap-3 ${s.wrapper}`}
                onAnimationStart={() => {
                  trackRescueTriggerFired({
                    kind: topTrigger.kind,
                    severity: topTrigger.severity,
                    currentPlan: currentPlanCode,
                  });
                }}
              >
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${s.icon}`}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${s.headline}`}>{topTrigger.headline}</p>
                  <p className={`mt-0.5 text-xs ${s.detail}`}>{topTrigger.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 ml-auto">
                  <Button
                    size="sm"
                    onClick={() => {
                      trackRescueActionTaken({
                        kind: topTrigger.kind,
                        action: topTrigger.kind === "trial_ending" ? "upgrade" : "navigate_system",
                        currentPlan: currentPlanCode,
                      });
                      navigate(ctaHref);
                    }}
                  >
                    {ctaLabel}
                  </Button>
                  <button
                    type="button"
                    className="text-xs opacity-60 hover:opacity-100 transition-opacity px-1"
                    aria-label="ÄÃ³ng thÃ´ng bÃ¡o"
                    onClick={() => {
                      dismissRescueTrigger(topTrigger.kind);
                      trackRescueTriggerDismissed({ kind: topTrigger.kind, currentPlan: currentPlanCode });
                      setDismissedTrigger(topTrigger.kind);
                    }}
                  >
                    âœ•
                  </button>
                </div>
              </div>
            </Reveal>
          );
        })()}

      {/* Trial countdown banner */}
      {!isPublicVisitor &&
        userData.subscription?.status === "trialing" &&
        userData.subscription.renewsAt &&
        new Date(userData.subscription.renewsAt) >= new Date() &&
        (() => {
          const daysLeft = Math.max(
            0,
            Math.ceil((new Date(userData.subscription.renewsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          );
          return (
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm flex flex-wrap items-center gap-3">
              <span>
                <span className="font-semibold">Plus demo:</span> cÃ²n {daysLeft} ngÃ y â€” dÃ¹ng thá»­ local, khÃ´ng thu tiá»n tháº­t.
              </span>
              <Button size="sm" variant="ghost" className="ml-auto shrink-0 text-amber-700 hover:bg-amber-100" onClick={() => navigate("/billing/plan")}>
                Chi tiáº¿t
              </Button>
            </div>
          );
        })()}
      <SpotlightTour
        open={isTourOpen}
        onOpenChange={setIsTourOpen}
        title="Tour báº£ng Ä‘iá»u khiá»ƒn"
        description="Ba Ä‘iá»ƒm chÃ­nh Ä‘á»ƒ ngÆ°á»i má»›i má»Ÿ vÃ o lÃ  biáº¿t nÃªn báº¯t Ä‘áº§u tá»« Ä‘Ã¢u."
        steps={dashboardTourSteps}
      />

      {/* HERO SECTION: Promise + Primary CTA */}
      <div className="ops-section-hero space-y-6">
        {activeSystem && reviewDueToday && (
          <Reveal>
            <Card className="border-amber-200 bg-amber-50/92 shadow-[0_16px_40px_-28px_rgba(217,119,6,0.24)]">
              <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Review Ä‘áº¿n háº¡n hÃ´m nay
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-950">HÃ´m nay lÃ  lÃºc chá»‘t review tuáº§n.</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {visibleActiveTwelveWeekGoal?.title}. KhÃ³a tuáº§n {activeSystemWeek} vÃ  quyáº¿t Ä‘á»‹nh nhá»‹p cho tuáº§n tiáº¿p
                      theo.
                    </p>
                  </div>
                </div>
                <Button className="w-full min-w-[180px] sm:w-auto" onClick={() => navigate("/12-week-system")}>
                  Má»Ÿ review tuáº§n
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {/* Primary Action Card - Most Important Thing */}
        {shouldShowMainDashboardCard && activeSystem && activeSystemTodayOpenTasks.length > 0 && (
          <Card className="border-2 border-primary bg-white shadow-[0_16px_36px_-28px_rgba(79,70,229,0.28)]">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_8px_20px_-12px_rgba(79,70,229,0.5)]">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      Viá»‡c quan trá»ng nháº¥t hÃ´m nay
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-slate-950 truncate">
                      {activeSystemTodayOpenTasks[0].title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {activeSystemTodayOpenTasks.length > 1
                        ? `CÃ²n ${activeSystemTodayOpenTasks.length - 1} viá»‡c khÃ¡c chá» sau Ä‘Ã³`
                        : "ÄÃ¢y lÃ  viá»‡c duy nháº¥t hÃ´m nay"}
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full bg-slate-950 text-white hover:bg-slate-900 sm:w-auto"
                  onClick={() => navigate("/12-week-system")}
                >
                  ÄÃ¡nh dáº¥u xong
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile Sticky CTA Bar */}
        {showMobileStickyCTA && (
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 p-4 backdrop-blur supports-backdrop-blur:bg-white/90 md:hidden">
            <Button
              className="w-full shadow-lg"
              size="lg"
              onClick={() => navigate("/12-week-system")}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Đánh dấu xong - {activeSystemTodayOpenTasks.length} việc
            </Button>
          </div>
        )}

        {/* Main Dashboard Card with PageHeader */}
        {shouldShowMainDashboardCard && (
          <Card className="border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.28)]">
            <CardContent className="p-4 sm:p-6 lg:p-7">
              <div className="space-y-5">
                <PageHeader
                  eyebrow={isPublicVisitor ? "Trang chÃ­nh" : "HÃ´m nay"}
                  title={
                    isPublicVisitor
                      ? publicVisitorDashboardTitle
                      : activeSystem
                        ? `Quay láº¡i Ä‘Ãºng nhá»‹p cá»§a "${visibleActiveTwelveWeekGoal?.title ?? "chu ká»³ 12 tuáº§n hiá»‡n táº¡i"}".`
                        : setupStartTitle
                  }
                  description={
                    isPublicVisitor
                      ? publicVisitorDashboardDescription
                      : activeSystem
                        ? activeSystemTodayOpenTasks.length > 0
                          ? `Táº­p trung vÃ o ${activeSystemTodayOpenTasks.length} viá»‡c Ä‘ang má»Ÿ hÃ´m nay trÆ°á»›c khi xem tiáº¿n Ä‘á»™ tuáº§n.`
                          : "HÃ´m nay khÃ´ng cÃ²n viá»‡c má»Ÿ. Náº¿u cÃ²n thá»i gian, hÃ£y xem láº¡i tuáº§n hoáº·c chuáº©n bá»‹ review khi Ä‘áº¿n háº¡n."
                        : setupStartDescription
                  }
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {isPublicVisitor ? (
                    <span title="Cháº¿ Ä‘á»™ xem khÃ´ng cáº§n Ä‘Äƒng nháº­p, dÃ¹ng thá»­ cÃ¡c tÃ­nh nÄƒng cÆ¡ báº£n" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
                      {publicVisitorBadge}
                    </span>
                  ) : (
                    <span title={`GÃ³i hiá»‡n táº¡i: ${getPlanLabel(currentPlanCode)} â€” xem quyá»n truy cáº­p trong pháº§n quáº£n lÃ½ tÃ i khoáº£n`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
                      GÃ³i {getPlanLabel(currentPlanCode)}
                    </span>
                  )}
                  {activeSystem && activeSystemWeek && (
                    <span title={`Tuáº§n hiá»‡n táº¡i trong chu ká»³ 12 tuáº§n (${getTwelveWeekCurrentWeek(activeSystem)}/${activeSystem.totalWeeks})`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
                      Tuáº§n {activeSystemWeek} cá»§a chu ká»³ hiá»‡n táº¡i
                    </span>
                  )}
                </div>

                {activeSystem && activeSystemWeekCompletion && activeSystemWeekRange ? (
                  <div className="grid gap-4">
                    <div
                      data-tour-id="dashboard-start-card"
                      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            LÃ m tiáº¿p ngay
                          </p>
                          <h2 className="mt-2 text-2xl font-bold text-slate-950">
                            {activeSystemTodayOpenTasks.length > 0
                              ? `${activeSystemTodayOpenTasks.length} viá»‡c Ä‘ang má»Ÿ hÃ´m nay`
                              : "HÃ´m nay Ä‘ang khÃ¡ gá»n"}
                          </h2>
                        </div>
                        <Button
                          data-tour-id="dashboard-primary-action"
                          className="w-full gradient-brand text-white shadow-[0_14px_34px_-20px_rgba(109,40,217,0.38)] hover:shadow-[0_18px_40px_-22px_rgba(109,40,217,0.44)] hover:scale-[1.01] sm:w-auto"
                          onClick={() => navigate("/12-week-system")}
                        >
                          Má»Ÿ trung tÃ¢m 12 tuáº§n
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>

                          {activeSystemTaskPreview.length > 0 ? (
                            <div className="mt-4 space-y-3">
                              {activeSystemTaskPreview.map((task, index) => (
                                <div
                                  key={task.id}
                                  className={`flex items-center gap-4 rounded-[22px] border px-4 py-4 ${
                                    index === 0 ? "border-slate-300 bg-white" : "border-slate-200 bg-white/80"
                                  }`}
                                >
                                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                                    {index + 1}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-950">{task.title}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {index === 0 ? "Viá»‡c nÃªn cháº¡m vÃ o Ä‘áº§u tiÃªn" : "Viá»‡c Ä‘ang chá» phÃ­a sau"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4">
                              <p className="font-semibold text-slate-950">Báº¡n Ä‘Ã£ chá»‘t xong pháº§n má»Ÿ cá»§a hÃ´m nay.</p>
                              <p className="mt-1 text-sm leading-7 text-slate-600">
                                Náº¿u cÃ²n sá»©c, hÃ£y má»Ÿ trung tÃ¢m 12 tuáº§n Ä‘á»ƒ xem pháº§n cÃ²n láº¡i cá»§a tuáº§n hoáº·c chá»‘t review khi
                                Ä‘áº¿n háº¡n.
                              </p>
                            </div>
                          )}

                          <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                HÃ´m nay
                              </p>
                              <p className="mt-1 text-xl font-bold text-slate-950">
                                {activeSystemTodayOpenTasks.length}
                              </p>
                              <p className="text-xs text-slate-500">{activeSystemTodayCompletedCount} viá»‡c Ä‘Ã£ chá»‘t</p>
                            </div>
                            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Tuáº§n nÃ y
                              </p>
                              <div className="mt-1 flex items-center gap-3">
                                <p className="text-xl font-bold text-slate-950">
                                  {activeSystemWeekCompletion.percent}%
                                </p>
                                <Progress
                                  value={activeSystemWeekCompletion.percent}
                                  className="h-2 flex-1 bg-slate-100"
                                />
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatCalendarDate(activeSystemWeekRange.start)} -{" "}
                                {formatCalendarDate(activeSystemWeekRange.end)}
                              </p>
                            </div>
                            <div
                              className={`rounded-[18px] border px-4 py-3 ${
                                reviewDueToday ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
                              }`}
                            >
                              <p
                                className={`text-xs font-semibold uppercase tracking-[0.14em] ${
                                  reviewDueToday ? "text-amber-700" : "text-slate-500"
                                }`}
                              >
                                Review
                              </p>
                              <p className="mt-1 text-base font-bold text-slate-950">
                                {reviewDueToday ? "Äáº¿n háº¡n hÃ´m nay" : getReviewDayLabel(activeSystem.reviewDay)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {reviewDueToday ? "NÃªn chá»‘t trÆ°á»›c tuáº§n má»›i." : "NgÃ y cá»‘ Ä‘á»‹nh cá»§a chu ká»³."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        data-tour-id="dashboard-start-card"
                        className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {isPublicVisitor ? "Báº¯t Ä‘áº§u Ä‘Ãºng cÃ¡ch" : "Báº¯t Ä‘áº§u nhanh nháº¥t"}
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-950">
                          {isPublicVisitor ? publicVisitorStartTitle : setupStartTitle}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                          {isPublicVisitor ? publicVisitorStartDescription : setupStartDescription}
                        </p>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <Button
                            data-tour-id="dashboard-primary-action"
                            className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto"
                            onClick={() => (isPublicVisitor ? handlePublicVisitorStart() : navigate(setupPrimaryPath))}
                          >
                            {isPublicVisitor ? publicVisitorPrimaryLabel : setupPrimaryLabel}
                          </Button>
                          {isPublicVisitor ? (
                            <Button
                              variant="outline"
                              className="w-full border-slate-200 bg-white text-slate-900 sm:w-auto"
                              onClick={() => handleAuthNavigate("signin")}
                            >
                              ÄÄƒng nháº­p
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {shouldShowTopSidebar && (
              <>
                <section className="rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.22)] sm:p-5">
                  <PageHeader
                    eyebrow="Thá»© tá»± nÃªn Ä‘i"
                    title="Má»™t luá»“ng chÃ­nh, khÃ´ng pháº£i ba lá»±a chá»n ngang nhau."
                    description={quickActionIntro}
                  />

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {quickActions.map((action, actionIndex) => {
                      const Icon = action.icon;
                      const stepIndex = actionIndex + 1;

                      return (
                        <Button
                          key={action.title}
                          variant="outline"
                          className="group h-auto min-w-0 justify-start whitespace-normal rounded-[18px] border-slate-200 bg-white px-3.5 py-3.5 text-left shadow-[0_10px_24px_-20px_rgba(15,23,42,0.16)] transition-colors hover:border-slate-300 hover:bg-white hover:shadow-[0_14px_28px_-20px_rgba(15,23,42,0.20)]"
                          onClick={action.onClick}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                            {stepIndex}
                          </div>
                          <div className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200 transition-colors group-hover:text-slate-950">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="ml-3 min-w-0 flex-1">
                            <div className="line-clamp-2 break-words text-sm font-semibold leading-5 text-slate-900 sm:text-base">
                              {action.title}
                            </div>
                            <div className="mt-1 line-clamp-2 text-sm text-slate-500">{action.description}</div>
                          </div>
                          <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-700" />
                        </Button>
                      );
                    })}
                  </div>
                </section>

                {/* Stats Cards - Collapsible on mobile */}
                <details className="group rounded-[26px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.28)] sm:p-5 open:sm:!block sm:!block" open>
                  <summary className="flex cursor-pointer list-none flex-wrap items-end justify-between gap-3 text-sm font-semibold text-slate-950 sm:cursor-default">
                    <span>Tá»•ng quan nhanh</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                      {isPublicVisitor ? "Luá»“ng cá»‘t lÃµi" : `${userData.goals.length} má»¥c tiÃªu`}
                    </span>
                    <svg className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {overviewCards.map((item, index) => {
                      const Icon = item.icon;

                      return (
                        <div
                          key={`top-${item.title}`}
                          className="animate-fade-in-up"
                          style={{ animationDelay: `${0.04 * index}s` }}
                        >
                          <Card className="h-full border border-slate-100 bg-white/88 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)]">
                            <CardHeader className="flex flex-row items-start justify-between pb-3">
                              <div>
                                <CardDescription className="text-xs font-medium text-slate-500">
                                  {item.title}
                                </CardDescription>
                                <CardTitle className="mt-2 text-3xl font-bold text-slate-950">
                                  {isPublicVisitor ? item.value : <CountUp value={item.value} />}
                                </CardTitle>
                              </div>
                              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.iconClass}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-slate-500">{item.note}</p>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </details>
              </>
            )}

            {isPublicVisitor ? null : !activeSystem ? (
              <EmptyState
                as="section"
                align="left"
                headingLevel={2}
                testId="fresh-workspace-empty-state"
                eyebrow="Workspace má»›i"
                title="ChÆ°a cÃ³ dá»¯ liá»‡u thá»±c thi Ä‘á»ƒ hiá»ƒn thá»‹."
                description="Dashboard sáº½ chá»‰ hiá»‡n Ä‘iá»ƒm, chuá»—i ngÃ y vÃ  chá»‰ sá»‘ sau khi báº¡n táº¡o chu ká»³ 12 tuáº§n Ä‘áº§u tiÃªn. BÃ¢y giá» nÃªn Ä‘i tá»« Life Balance Ä‘á»ƒ cÃ³ dá»¯ liá»‡u tháº­t, rá»“i má»›i chá»‘t má»¥c tiÃªu SMART."
                actions={
                  <Button
                    className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto"
                    onClick={() => navigate("/onboarding")}
                  >
                    Báº¯t Ä‘áº§u Life Balance
                  </Button>
                }
              >
                <ol className="grid gap-3 md:grid-cols-3">
                  {["Cháº¥m 8 lÄ©nh vá»±c cuá»™c sá»‘ng", "Chá»n má»™t insight Æ°u tiÃªn", "Táº¡o SMART goal vÃ  chu ká»³ 12 tuáº§n"].map(
                    (item, index) => (
                      <li key={item} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                        <div
                          aria-hidden="true"
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white"
                        >
                          {index + 1}
                        </div>
                        <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">{item}</p>
                      </li>
                    ),
                  )}
                </ol>
              </EmptyState>
            ) : (
              <details className="group rounded-[26px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.28)] sm:p-5 lg:p-6 open:sm:!block sm:!block" open>
                <summary className="flex cursor-pointer list-none flex-wrap items-end justify-between gap-3 sm:cursor-default">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Báº£ng thá»±c thi</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                      Tá»•ng quan hiá»‡u suáº¥t 12 tuáº§n
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Theo dÃµi tiáº¿n Ä‘á»™, nhá»‹p thá»±c thi vÃ  chá»‰ sá»‘ dáº«n cá»§a má»¥c tiÃªu Ä‘ang cháº¡y.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      Dá»¯ liá»‡u chu ká»³ hiá»‡n táº¡i
                    </span>
                    <svg className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  <GoalProgressCard
                    goalTitle={dashboardGoalTitle}
                    percent={goalProgressSnapshot.percent}
                    completedTasks={goalProgressSnapshot.completedTasks}
                    totalTasks={goalProgressSnapshot.totalTasks}
                  />
                  <ExecutionScoreCard
                    weekNumber={currentWeekExecutionSnapshot.weekNumber}
                    executionScore={currentWeekExecutionSnapshot.executionScore}
                    completedTasks={currentWeekExecutionSnapshot.completedTasks}
                    totalTasks={currentWeekExecutionSnapshot.totalTasks}
                  />
                  <StreakCard streak={weeklyStreak} />
                </div>

                <details className="group rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-950">
                    <span>PhÃ¢n tÃ­ch má»Ÿ rá»™ng</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                      Tiáº¿n Ä‘á»™ theo tuáº§n + chá»‰ sá»‘ dáº«n
                    </span>
                  </summary>
                  <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                    <WeeklyProgressChart points={weeklyProgressPoints} />
                    <MetricsSummary items={leadMetricsSummary} />
                  </div>
                </details>


                {planLoading && !plan && (
                  <Card className="border border-slate-200 bg-white/80 shadow-sm">
                    <CardContent className="p-4 text-sm text-slate-500">
                      Äang táº£i dá»¯ liá»‡u dashboard 12 tuáº§n...
                    </CardContent>
                  </Card>
                )}

                {planError && (
                  <Card className="border border-rose-200 bg-rose-50 shadow-sm">
                    <CardContent className="p-4 text-sm text-rose-700">{planError.message}</CardContent>
                  </Card>
                )}
              </details>
            )}

        {shouldShowTopSidebar && (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.08s' }}>
            <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              {isPublicVisitor ? (
                <PublicVisitorAccountCard
                  onSignIn={() => handleAuthNavigate("signin")}
                  onSignUp={() => handleAuthNavigate("signup")}
                />
              ) : (
                <Card
                  data-tour-id="dashboard-plan-card"
                  className="glass-surface-gradient-border border-0 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.28)] ambient-glow"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-950">
                      Káº¿ hoáº¡ch hiá»‡n táº¡i
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      {getPlanLabel(currentPlanCode)} â€” {currentPlanDefinition.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Äang dÃ¹ng</p>
                      <p className="mt-2 text-3xl font-bold text-slate-950">{getPlanLabel(currentPlanCode)}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{currentPlanDefinition.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {premiumStatusItems.map((key) => {
                        const isUnlocked = entitlementKeys.includes(key);

                        return (
                          <span
                            key={key}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                              isUnlocked
                                ? "border-emerald-200/70 bg-emerald-50 text-emerald-900"
                                : "border-slate-200 bg-slate-50 text-slate-500"
                            }`}
                          >
                            {isUnlocked ? "Äang má»Ÿ" : "Äang khÃ³a"} Â· {getEntitlementLabel(key)}
                          </span>
                        );
                      })}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {currentPlanCode === "FREE" ? (
                        <>
                          <Button
                            className="bg-slate-950 text-white hover:bg-slate-800"
                            onClick={() => openUpgradeDialog("plan", "PLUS")}
                          >
                            Má»Ÿ Plus demo
                          </Button>
                          <Button
                            variant="outline"
                            className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                            onClick={() => navigate(activeSystem ? "/12-week-system?tab=settings" : "/life-insight")}
                          >
                            Xem Free Ä‘ang cÃ³ gÃ¬
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50 sm:col-span-2"
                          onClick={() => navigate(activeSystem ? "/12-week-system?tab=settings" : "/life-insight")}
                        >
                          Quáº£n lÃ½ gÃ³i vÃ  quyá»n
                        </Button>
                      )}
                    </div>

                    <p className="text-sm text-slate-500">
                      Quyá»n Plus trong MVP 1 lÃ  mock/local trÃªn trÃ¬nh duyá»‡t nÃ y. Mock checkout khÃ´ng thu tiá»n tháº­t.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card
                data-tour-id="dashboard-next-card"
                className="border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.24)]"
              >
                <CardHeader>
                  <CardTitle className="text-slate-950">Äi tiáº¿p ngay</CardTitle>
                  <CardDescription className="text-slate-700">
                    Chá»‰ giá»¯ hai tÃ­n hiá»‡u quan trá»ng nháº¥t Ä‘á»ƒ báº¡n quyáº¿t Ä‘á»‹nh nhanh.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dashboardAttentionPanels.map((panel) => {
                    const Icon = panel.icon;
                    return (
                      <div key={panel.eyebrow} className={panel.cardClass}>
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs uppercase tracking-[0.16em] ${panel.eyebrowClass}`}>
                              {panel.eyebrow}
                            </p>
                            <p className={`mt-2 text-lg font-semibold ${panel.titleClass}`}>{panel.title}</p>
                            <p className={`mt-1 text-sm leading-7 ${panel.descriptionClass}`}>{panel.description}</p>
                            <Button variant={panel.buttonVariant} className={panel.buttonClass} onClick={panel.onClick}>
                              {panel.buttonLabel}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {!isPublicVisitor && userData.isHydratedFromDemo && (
        <Reveal>
          <div className="flex flex-wrap items-center gap-4 rounded-[22px] border border-amber-200 bg-amber-50/92 px-5 py-4 shadow-[0_20px_45px_-34px_rgba(217,119,6,0.22)]">
            <Sparkles className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">Dá»¯ liá»‡u Ä‘ang hiá»ƒn thá»‹ lÃ  vÃ­ dá»¥ demo</p>
              <p className="mt-0.5 text-sm text-amber-700">
                Cáº­p nháº­t bÃ¡nh xe cuá»™c sá»‘ng cá»§a báº¡n Ä‘á»ƒ thay dá»¯ liá»‡u máº«u báº±ng thÃ´ng tin tháº­t.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
              onClick={() => navigate("/life-balance")}
            >
              Cáº­p nháº­t ngay
            </Button>
          </div>
        </Reveal>
      )}

      {/* SECONDARY SECTION: Workspace Details */}
      {shouldShowWorkspaceDetailGrid && (
        <div className="ops-section-secondary space-y-6">
          <PageHeader
            eyebrow="Chi tiáº¿t workspace"
            title="Dá»¯ liá»‡u gáº§n Ä‘Ã¢y"
            description="Xem nhanh má»¥c tiÃªu, cÃ¢n báº±ng cuá»™c sá»‘ng vÃ  nháº­t kÃ½ cá»§a báº¡n."
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <Reveal>
              <Card className="h-full border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.24)]">
                <CardHeader>
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <CardTitle className="text-slate-950">
                        {isPublicVisitor ? "Luá»“ng má»¥c tiÃªu trong demo" : "Má»¥c tiÃªu gáº§n Ä‘Ã¢y"}
                      </CardTitle>
                      <CardDescription className="text-slate-700">
                        {isPublicVisitor
                          ? "Tá»« má»™t mong muá»‘n rá»™ng, web sáº½ Ã©p láº¡i thÃ nh má»¥c tiÃªu rÃµ vÃ  káº¿ hoáº¡ch cÃ³ lá»‹ch."
                          : "Äá»§ Ã­t Ä‘á»ƒ báº¡n nhÃ¬n má»™t lÆ°á»£t lÃ  hiá»ƒu."}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => (isPublicVisitor ? handleAuthNavigate("signup") : navigate("/life-insight"))}
                    >
                      <Plus className="h-4 w-4" />
                      {isPublicVisitor ? "ÄÄƒng kÃ½ Ä‘á»ƒ sync sau" : "Táº¡o má»¥c tiÃªu"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentGoals.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center text-slate-500">
                      <Target className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                      <p>
                        {isPublicVisitor
                          ? "Trong demo, báº¡n cÃ³ thá»ƒ Ä‘i qua Life Insight, SMART Goal vÃ  kiá»ƒm tra tÃ­nh thá»±c táº¿ mÃ  khÃ´ng cáº§n Ä‘Äƒng nháº­p."
                          : "ChÆ°a cÃ³ má»¥c tiÃªu nÃ o. HÃ£y báº¯t Ä‘áº§u báº±ng má»¥c tiÃªu Ä‘áº§u tiÃªn cá»§a báº¡n."}
                      </p>
                      <Button
                        className="mt-5 w-full sm:w-auto"
                        onClick={() => (isPublicVisitor ? handleAuthNavigate("signup") : navigate("/life-insight"))}
                      >
                        {isPublicVisitor ? "ÄÄƒng kÃ½ Ä‘á»ƒ sync sau" : "Táº¡o má»¥c tiÃªu"}
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                      <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(120px,0.6fr)_minmax(120px,0.6fr)_minmax(100px,0.5fr)] gap-4 border-b border-slate-200/80 bg-slate-50/90 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 lg:grid">
                        <span>Má»¥c tiÃªu</span>
                        <span>Loáº¡i</span>
                        <span>Tiáº¿n Ä‘á»™</span>
                        <span className="text-right">HÃ nh Ä‘á»™ng</span>
                      </div>

                      <div className="divide-y divide-slate-200/80">
                        {recentGoals.map((goal) => {
                          const progress = calculateGoalProgress(goal);
                          const execution = getGoalExecutionStats(goal);

                          return (
                            <div
                              key={goal.id}
                              className={`px-4 py-4 lg:px-5 ${goal.twelveWeekSystem ? "bg-violet-50/55" : "bg-white/40"}`}
                            >
                              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(120px,0.6fr)_minmax(120px,0.6fr)_minmax(100px,0.5fr)] lg:items-center">
                                <div className="min-w-0">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                      <Target className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="truncate font-semibold text-slate-900">{goal.title}</h4>
                                        {goal.twelveWeekSystem && (
                                          <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold text-violet-700">
                                            12 tuáº§n
                                          </span>
                                        )}
                                        {progress === 100 && (
                                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                            HoÃ n thÃ nh
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-500">
                                        <span>{getLifeAreaLabel(goal.category)}</span>
                                        {goal.deadline && <span>â€¢ ÄÃ­ch {formatCalendarDate(goal.deadline)}</span>}
                                      </div>
                                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 lg:hidden">
                                        <span className="rounded-full bg-slate-100 px-3 py-1">
                                          {goal.twelveWeekSystem ? "Chu ká»³ 12 tuáº§n" : "Má»¥c tiÃªu thÆ°á»ng"}
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-3 py-1">
                                          {execution.completed}/{execution.total} viá»‡c Ä‘Ã£ chá»‘t
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-3 py-1">{progress}% tiáº¿n Ä‘á»™</span>
                                      </div>
                                    </div>
                                    <CheckCircle2
                                      aria-hidden="true"
                                      className={`h-5 w-5 shrink-0 ${progress === 100 ? "text-emerald-600" : "text-slate-300"}`}
                                    />
                                  </div>
                                </div>

                                <div className="hidden min-w-0 lg:block">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {goal.twelveWeekSystem ? "Chu ká»³ 12 tuáº§n" : "Má»¥c tiÃªu thÆ°á»ng"}
                                  </p>
                                  <p className="mt-1 truncate text-sm text-slate-500">
                                    {goal.twelveWeekSystem
                                      ? `GÃ³i ${getPlanLabel(currentPlanCode)}`
                                      : "Theo dÃµi tá»•ng quan"}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-slate-900">{progress}%</span>
                                    <span className="text-slate-500">
                                      {execution.completed}/{execution.total} viá»‡c
                                    </span>
                                  </div>
                                  <Progress value={progress} className="h-2.5" />
                                  {goal.twelveWeekSystem && !entitlementKeys.includes("premium_review_insights") && (
                                    <p className="text-xs font-medium text-violet-700">PhÃ¢n tÃ­ch review Ä‘ang khÃ³a</p>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                  <Button
                                    size="sm"
                                    variant={goal.twelveWeekSystem ? "default" : "outline"}
                                    className={goal.twelveWeekSystem ? "" : "border-white/70 bg-white hover:bg-slate-50"}
                                    onClick={() => navigate(goal.twelveWeekSystem ? "/12-week-system" : "/goals")}
                                    aria-label={
                                      goal.twelveWeekSystem ? `Má»Ÿ 12 tuáº§n: ${goal.title}` : `Má»Ÿ má»¥c tiÃªu: ${goal.title}`
                                    }
                                  >
                                    {goal.twelveWeekSystem ? "Má»Ÿ 12 tuáº§n" : "Má»Ÿ má»¥c tiÃªu"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Reveal>

            <Reveal>
              <Card className="h-full border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.24)]">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-slate-950">
                        {isPublicVisitor ? "BÃ¡nh xe cuá»™c sá»‘ng lÃ  bÆ°á»›c má»Ÿ Ä‘áº§u" : "BÃ¡nh xe cuá»™c sá»‘ng"}
                      </CardTitle>
                      <CardDescription className="text-slate-700">
                        {isPublicVisitor
                          ? "NgÆ°á»i má»›i nÃªn cháº¥m 8 lÄ©nh vá»±c trÆ°á»›c khi chá»n má»¥c tiÃªu Æ°u tiÃªn."
                          : "NhÃ¬n nhanh bá»©c tranh tá»•ng quan hiá»‡n táº¡i."}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Äiá»ƒm trung bÃ¬nh</p>
                      <p className="mt-1 text-3xl font-bold text-slate-900">
                        <CountUp value={averageLifeScore} precision={1} />
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                    {radarData.length > 0 ? (
                      <Suspense
                        fallback={
                          <div className="flex h-[300px] items-center justify-center rounded-[20px] bg-slate-100/88 text-sm text-slate-500">
                            Äang táº£i biá»ƒu Ä‘á»“ cÃ¢n báº±ng cuá»™c sá»‘ng...
                          </div>
                        }
                      >
                        <DashboardLifeAreaRadar data={radarData} />
                      </Suspense>
                    ) : (
                      <div className="flex h-[300px] flex-col items-center justify-center rounded-[20px] bg-slate-50 px-5 text-center">
                        <TrendingUp className="h-10 w-10 text-slate-300" />
                        <p className="mt-3 font-semibold text-slate-900">ChÆ°a cÃ³ dá»¯ liá»‡u bÃ¡nh xe cuá»™c sá»‘ng</p>
                        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                          {isPublicVisitor
                            ? "Trong demo, báº¡n cÃ³ thá»ƒ báº¯t Ä‘áº§u Life Balance khÃ´ng cáº§n Ä‘Äƒng nháº­p. TÃ i khoáº£n/sync lÃ  lá»›p sau."
                            : "Báº¯t Ä‘áº§u báº±ng bÃ i Ä‘Ã¡nh giÃ¡ Life Balance Ä‘á»ƒ dashboard cÃ³ dá»¯ liá»‡u tháº­t thay vÃ¬ sá»‘ máº·c Ä‘á»‹nh."}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cáº§n Æ°u tiÃªn tiáº¿p</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {isPublicVisitor
                          ? "Chá»n sau Life Balance"
                          : weakestArea
                            ? getLifeAreaLabel(weakestArea.name)
                            : "ChÆ°a cÃ³ dá»¯ liá»‡u"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {isPublicVisitor
                          ? "Demo lÆ°u local trÃªn trÃ¬nh duyá»‡t nÃ y"
                          : weakestArea
                            ? `${weakestArea.score}/10`
                            : "--"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="h-auto w-full min-w-0 justify-start whitespace-normal rounded-[20px] border-slate-200 bg-white px-4 py-4 text-left shadow-sm hover:bg-slate-50"
                      onClick={() => (isPublicVisitor ? handleAuthNavigate("signup") : navigate("/life-balance"))}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div className="ml-3 min-w-0 flex-1">
                        <div className="line-clamp-2 break-words font-semibold text-slate-900">
                          {isPublicVisitor
                            ? "Báº¯t Ä‘áº§u báº±ng cÃ¢n báº±ng cuá»™c sá»‘ng"
                            : hasRealLifeBalance
                              ? "Má»Ÿ cÃ¢n báº±ng cuá»™c sá»‘ng"
                              : "Báº¯t Ä‘áº§u Ä‘Ã¡nh giÃ¡ cuá»™c sá»‘ng"}
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm text-slate-500">
                          {isPublicVisitor
                            ? "ÄÄƒng kÃ½ chá»‰ khi muá»‘n thá»­ lá»›p sync sau."
                            : hasRealLifeBalance
                              ? "Xem chi tiáº¿t vÃ  cáº­p nháº­t láº¡i bÃ¡nh xe cuá»™c Ä‘á»i."
                              : "Cháº¥m Ä‘iá»ƒm 8 lÄ©nh vá»±c Ä‘á»ƒ má»Ÿ Ä‘Ãºng luá»“ng má»¥c tiÃªu."}
                        </div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </div>
      )}

      {/* Recent Reflections - Part of secondary content */}
      {recentReflections.length > 0 && (
        <div className="ops-section-secondary">
          <Reveal>
            <Card className="border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.28)]">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-slate-950">Nháº­t kÃ½ gáº§n Ä‘Ã¢y</CardTitle>
                    <CardDescription className="text-slate-700">
                      Nhá»¯ng suy ngáº«m má»›i nháº¥t trÃªn hÃ nh trÃ¬nh cá»§a báº¡n.
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/journal")}>
                    Xem táº¥t cáº£
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                {recentReflections.map((reflection, index) => (
                  <div
                    key={reflection.id}
                    className={`rounded-[24px] border p-5 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)] ${
                      index === 0 ? "border-slate-300 bg-slate-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <h4 className="min-w-0 truncate font-semibold text-slate-900">{reflection.title}</h4>
                      <span className="text-xs font-medium text-slate-400">{formatCalendarDate(reflection.date)}</span>
                    </div>
                    <p className="line-clamp-3 text-sm text-slate-600">{reflection.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      )}

      {/* Demo Notice - Non-intrusive, at bottom */}
      {!isPublicVisitor && userData.isHydratedFromDemo && (
        <div className="ops-section-notice">
          <Reveal>
            <div className="flex flex-wrap items-center gap-4 rounded-[22px] border border-amber-200 bg-amber-50/92 px-5 py-4 shadow-[0_20px_45px_-34px_rgba(217,119,6,0.22)]">
              <Sparkles className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-900">Dá»¯ liá»‡u Ä‘ang hiá»ƒn thá»‹ lÃ  vÃ­ dá»¥ demo</p>
                <p className="mt-0.5 text-sm text-amber-700">
                  Cáº­p nháº­t bÃ¡nh xe cuá»™c sá»‘ng cá»§a báº¡n Ä‘á»ƒ thay dá»¯ liá»‡u máº«u báº±ng thÃ´ng tin tháº­t.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                onClick={() => navigate("/life-balance")}
              >
                Cáº­p nháº­t ngay
              </Button>
            </div>
          </Reveal>
        </div>
      )}

      {/* Data Backup - Moved to Settings, shown here only if needed */}
      {shouldShowWorkspaceDetailGrid && (
        <div className="ops-section-secondary">
          <Reveal>
            <DashboardDataBackupCard
              importInputRef={importFileRef}
              onExport={handleExport}
              onImport={handleImport}
              onOpenImportPicker={() => importFileRef.current?.click()}
            />
          </Reveal>
        </div>
      )}
    </div>
  );
}

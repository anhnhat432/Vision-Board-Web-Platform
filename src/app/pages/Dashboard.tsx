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

import { DataStorageInfo } from "../components/DataStorageInfo";
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
import { SectionBlock } from "../components/layout/SectionBlock";
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
import { useIsMobile } from "../components/ui/use-mobile";
import { useBackendProgressOverlay } from "../hooks/useBackendProgressOverlay";
import { usePageTour } from "../hooks/usePageTour";
import { usePlanEntitlements } from "../hooks/usePlanEntitlements";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { useUpgradeDialog } from "../hooks/useUpgradeDialog";
import { trackAnalyticsEvent } from "../utils/analytics";
import { isDemoMode } from "../utils/app-mode";
import { loadWithChunkReload } from "../utils/chunkLoad";
import {
  trackRescueActionTaken,
  trackRescueTriggerDismissed,
  trackRescueTriggerFired,
} from "../utils/monetization-analytics";
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
  sortReflectionsByDateDesc,
  type UserData,
} from "../utils/storage";
import { getEntitlementLabel, getPlanLabel } from "../utils/twelve-week-premium";
import { dismissRescueTrigger, evaluateRescueTriggers } from "../utils/twelve-week-system-ui";

const DashboardLifeAreaRadar = lazy(() =>
  loadWithChunkReload(async () => {
    const module = await import("../components/DashboardLifeAreaRadar");
    return { default: module.DashboardLifeAreaRadar };
  }),
);

type DashboardRadarDatum = {
  subject: string;
  value: number;
  fullMark: number;
};

function useDeferredVisibility<TElement extends HTMLElement>(rootMargin = "240px") {
  const ref = useRef<TElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) return;

    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isVisible, rootMargin]);

  return { ref, isVisible };
}

function DeferredDashboardLifeAreaRadar({ data }: { data: DashboardRadarDatum[] }) {
  const { ref, isVisible } = useDeferredVisibility<HTMLDivElement>();

  return (
    <div ref={ref}>
      {isVisible ? (
        <Suspense
          fallback={
            <div className="flex h-[300px] items-center justify-center rounded-[var(--r-tile)] bg-muted text-sm text-muted-foreground">
              Đang tải biểu đồ cân bằng cuộc sống...
            </div>
          }
        >
          <DashboardLifeAreaRadar data={data} />
        </Suspense>
      ) : (
        <div
          data-testid="dashboard-radar-deferred"
          className="flex h-[300px] flex-col items-center justify-center rounded-[var(--r-tile)] bg-muted px-5 text-center"
        >
          <TrendingUp className="h-10 w-10 text-muted-foreground/45" />
          <p className="mt-[var(--space-inline)] font-semibold text-foreground">Biểu đồ sẽ tải khi bạn kéo tới đây.</p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            Dashboard giữ phần đầu nhẹ hơn; dữ liệu cân bằng vẫn nằm ở đây khi cần xem.
          </p>
        </div>
      )}
    </div>
  );
}

const DASHBOARD_TOUR_STEPS: SpotlightTourStep[] = [
  {
    id: "start",
    targetId: "dashboard-start-card",
    title: "Bắt đầu từ khối này",
    description:
      "Nếu chưa có chu kỳ, hãy nhìn khối này trước. Đây là nơi dẫn bạn qua đúng flow: insight, SMART, kiểm tra tính thực tế rồi mới vào 12 tuần.",
  },
  {
    id: "attention",
    targetId: "dashboard-next-card",
    title: "Nhìn khối này trước khi quét cả màn",
    description: "Phần 'Đi tiếp ngay' gom ba tín hiệu quan trọng nhất để bạn biết nên mở vào đâu tiếp theo.",
  },
  {
    id: "plan",
    targetId: "dashboard-plan-card",
    title: "Phân biệt Free và Plus ở đây",
    description: "Khối này cho biết bạn đang ở gói nào, quyền nào đã mở và chỗ để quản lý hoặc khôi phục lại nếu cần.",
  },
];

export function Dashboard() {
  const { userData, reloadUserData } = useSyncedUserData();
  const { isTourOpen, setIsTourOpen } = usePageTour("dashboard");

  if (!userData) {
    return (
      <div className="ops-shell ops-dashboard">
        {/* Hero card skeleton */}
        <Skeleton className="h-56 rounded-[var(--r-card)]" />
        {/* Quick action tiles skeleton */}
        <div className="grid gap-[var(--space-stack)] md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-[var(--r-card)]" />
          ))}
        </div>
        {/* Stat cards skeleton */}
        <div className="grid gap-[var(--space-stack)] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-[var(--r-card)]" />
          ))}
        </div>
        {/* Content cards skeleton */}
        <div className="grid gap-[var(--space-stack)] lg:grid-cols-2">
          <Skeleton className="h-48 rounded-[var(--r-card)]" />
          <Skeleton className="h-48 rounded-[var(--r-card)]" />
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
  const isMobileViewport = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { isConfigured, user } = useAuthContext();
  const [dismissedTrigger, setDismissedTrigger] = useState<string | null>(null);
  const landingViewedRef = useRef(false);
  const progressViewedGoalIdRef = useRef<string | null>(null);
  const { currentPlanCode, currentPlanDefinition, entitlementKeys, premiumStatusItems } = usePlanEntitlements(userData);
  const demoMode = isDemoMode();
  const isSignedOut = !user;
  const shouldRequireAuthForSignedOut = isSignedOut && !demoMode;
  const isFreshDemoVisitor = demoMode && isSignedOut && userData.goals.length === 0;
  const visibleGoals = isSignedOut ? [] : userData.goals;
  const visibleWheelOfLife = isSignedOut ? [] : userData.currentWheelOfLife;
  const visibleReflections = isSignedOut ? [] : userData.reflections;
  const visibleVisionBoards = isSignedOut ? [] : userData.visionBoards;
  const aspirationalVision = isSignedOut ? null : (userData.aspirationalVision ?? null);
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

  const recentGoals = visibleGoals.slice(0, 3);
  const recentReflections = sortReflectionsByDateDesc(visibleReflections).slice(0, 2);
  const dashboardGoalTitle = visibleActiveTwelveWeekGoal?.title ?? plan?.vision ?? "Mục tiêu hiện tại";
  const goalProgressSnapshot = useMemo(() => buildGoalProgressSnapshot(plan), [plan]);
  const currentWeekExecutionSnapshot = useMemo(() => buildCurrentWeekExecutionSnapshot(plan), [plan]);
  const weeklyProgressPoints = useMemo(() => buildWeeklyProgressPoints(plan), [plan]);
  const weeklyStreak = useMemo(() => calculateWeeklyStreak(weeklyProgressPoints), [weeklyProgressPoints]);
  const leadMetricsSummary = useMemo(() => buildLeadMetricsSummary(plan), [plan]);

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

  const shouldShowMainDashboardCard = !isSignedOut && !isFreshDemoVisitor && (Boolean(activeSystem) || hasWorkspaceSignals);
  const showMobileStickyCTA = shouldShowMainDashboardCard && activeSystem && activeSystemTodayOpenTasks.length > 0;
  const shouldShowSetupGuide = !isSignedOut && !isFreshDemoVisitor && !activeSystem;
  const shouldShowTopSidebar = !isSignedOut && !isFreshDemoVisitor && !activeSystem && hasWorkspaceSignals;
  const shouldShowWorkspaceDetailGrid = !isSignedOut && !isFreshDemoVisitor && (Boolean(activeSystem) || hasWorkspaceSignals);

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
  const setupPrimaryLabel = hasRealLifeBalance ? "Tạo mục tiêu" : "Bắt đầu Life Balance";
  const setupStartTitle = hasRealLifeBalance
    ? "Đi qua insight rồi chốt mục tiêu SMART."
    : "Chấm Life Balance trước để dashboard không bị rỗng.";
  const setupStartDescription = hasRealLifeBalance
    ? "Đây là funnel gốc của web: insight trước, SMART sau, rồi mới kiểm tra tính thực tế và vào hệ 12 tuần."
    : "Bước này tạo dữ liệu thật cho các màn sau: Life Insight, SMART Goal, kiểm tra tính thực tế và kế hoạch 12 tuần.";
  const publicVisitorBadge = demoMode ? "Dữ liệu lưu trên trình duyệt hiện tại" : "Đăng ký để lưu và đồng bộ dữ liệu";
  const publicVisitorDashboardTitle = demoMode
    ? "Dùng thử luồng mục tiêu 12 tuần ngay trên trình duyệt hiện tại."
    : "Trang chính giúp bạn nhìn rõ luồng sản phẩm trước khi tạo tài khoản.";
  const publicVisitorDashboardDescription = demoMode
    ? "Bạn có thể bắt đầu Onboarding, chấm Life Balance, chọn insight, tạo SMART goal và đi tới setup 12 tuần mà không cần đăng nhập. Dữ liệu được lưu trên trình duyệt này; hãy xuất bản sao nếu muốn giữ lại."
    : "Bạn có thể xem tổng quan ngay tại đây. Khi bắt đầu thật, hãy đăng ký để dữ liệu mục tiêu và kế hoạch không bị mất theo trình duyệt.";
  const publicVisitorStartTitle = demoMode
    ? "Dùng thử không cần đăng nhập."
    : "Tạo tài khoản trước khi nhập dữ liệu thật.";
  const publicVisitorStartDescription = demoMode
    ? "Bắt đầu bằng Onboarding hoặc Life Balance để trải nghiệm luồng chính. Đăng nhập là tùy chọn khi bạn muốn đồng bộ sau."
    : "Phần onboarding, mục tiêu và kế hoạch đều là dữ liệu cá nhân. Đăng ký trước sẽ giúp bạn lưu lại tiến trình và quay lại đúng workspace sau này.";
  const publicVisitorPrimaryLabel = demoMode ? "Dùng thử không cần đăng nhập" : "Đăng ký miễn phí";

  const overviewCards = isSignedOut
    ? [
        {
          title: "Luồng cốt lõi",
          value: 7,
          note: "từ cân bằng cuộc sống tới review tuần",
          icon: Target,
          iconClass: "bg-foreground text-white",
        },
        {
          title: "Chu kỳ thực thi",
          value: 12,
          note: "tuần để biến mục tiêu thành việc rõ ràng",
          icon: CalendarDays,
          iconClass: "bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]",
        },
        {
          title: "Tài khoản",
          value: 1,
          note: demoMode ? "tùy chọn khi muốn đồng bộ sau" : "nơi đồng bộ mục tiêu và kế hoạch của bạn",
          icon: UserPlus,
          iconClass: "bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)]",
        },
        {
          title: "Review",
          value: 1,
          note: "nhịp nhìn lại mỗi tuần để không đi lệch",
          icon: BookOpen,
          iconClass: "bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]",
        },
      ]
    : [
        {
          title: "Mục tiêu đang theo",
          value: userData.goals.length,
          note: `${completedGoalsCount} đã hoàn thành`,
          icon: Target,
          iconClass: "bg-foreground text-white",
        },
        {
          title: "Việc đã chốt",
          value: completedTasks,
          note: `trên tổng số ${totalTasks}`,
          icon: TrendingUp,
          iconClass: "bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]",
        },
        {
          title: "Thành tựu",
          value: userData.achievements.length,
          note: "huy hiệu đã mở khóa",
          icon: Award,
          iconClass: "bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)]",
        },
        {
          title: "Nhật ký",
          value: userData.reflections.length,
          note: journalStreak > 0 ? `streak ${journalStreak} ngày` : "bài viết đã lưu",
          icon: BookOpen,
          iconClass: "bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]",
        },
      ];

  const quickActions = isSignedOut
    ? [
        {
          title: demoMode ? "Tùy chọn: đăng ký để đồng bộ sau" : "Đăng ký để lưu workspace",
          description: demoMode
            ? "Bạn vẫn dùng được không cần đăng nhập. Tài khoản chỉ cần khi muốn lưu và đồng bộ qua thiết bị khác."
            : "Tạo workspace riêng để lưu bánh xe cuộc sống, mục tiêu SMART và kế hoạch 12 tuần.",
          icon: UserPlus,
          onClick: () => handleAuthNavigate("signup"),
        },
        {
          title: "Đăng nhập nếu đã có tài khoản",
          description: demoMode
            ? "Không bắt buộc. Chỉ dùng khi bạn muốn thử lớp tài khoản và đồng bộ sau này."
            : "Quay lại đúng dữ liệu đã đồng bộ: mục tiêu, tuần hiện tại và review gần nhất.",
          icon: LogIn,
          onClick: () => handleAuthNavigate("signin"),
        },
        {
          title: demoMode ? "Có thể đi thẳng vào luồng chính" : "Đăng ký rồi đi theo luồng chính",
          description: demoMode
            ? "Nút bắt đầu sẽ đưa bạn vào Life Balance mà không cần tài khoản."
            : "Sau khi có workspace, bạn đi từ Life Balance, chọn insight, chốt mục tiêu SMART rồi mới vào 12 tuần.",
          icon: CalendarDays,
          onClick: () => handleAuthNavigate("signup"),
        },
      ]
    : [
        {
          title: activeSystem ? "Mở trung tâm 12 tuần" : setupPrimaryLabel,
          description: activeSystem
            ? "Vào thẳng hàng việc hôm nay."
            : hasRealLifeBalance
              ? "Đi tiếp đúng thứ tự: insight, SMART, kiểm tra tính thực tế rồi mới vào 12 tuần."
              : "Chấm Life Balance trước để có dữ liệu thật cho mục tiêu.",
          icon: CalendarDays,
          onClick: () => navigate(activeSystem ? "/12-week-system" : setupPrimaryPath),
        },
        {
          title: "Mở mục tiêu",
          description: "Xem tiến độ và hạn chót hiện tại.",
          icon: Target,
          onClick: () => navigate("/goals"),
        },
        {
          title: "Mở nhật ký",
          description: "Ghi lại suy ngẫm gần đây.",
          icon: BookOpen,
          onClick: () => navigate("/journal"),
        },
      ];
  const quickActionIntro = isSignedOut
    ? "Một người mới chỉ cần đi theo một đường: hiểu hiện tại, chọn mục tiêu, kiểm tra khả thi, rồi chạy 12 tuần."
    : activeSystem
      ? "Đi theo thứ tự: xử lý việc hôm nay, kiểm tra mục tiêu, rồi ghi lại điều học được."
      : "Đi theo thứ tự: tạo mục tiêu, kiểm tra hướng đi, rồi ghi lại suy nghĩ đầu tiên.";

  const attentionPanels = isSignedOut
    ? [
        {
          eyebrow: "Điểm bắt đầu",
          title: demoMode ? "Có thể bắt đầu ngay, không cần đăng nhập" : "Đừng vào thẳng 12 tuần khi mục tiêu còn mơ hồ",
          description: demoMode
            ? "Bạn có thể dùng luồng chính ngay trên trình duyệt này. Đăng ký chỉ là lựa chọn khi muốn đồng bộ sau."
            : "Web này dẫn bạn từ bức tranh cuộc sống hiện tại tới một mục tiêu SMART đủ rõ, rồi mới chia thành kế hoạch 12 tuần.",
          cardClass: "rounded-[var(--r-card)] border border-border bg-muted p-4 shadow-sm",
          eyebrowClass: "text-muted-foreground",
          titleClass: "text-foreground",
          descriptionClass: "text-muted-foreground",
          buttonClass: "mt-4 bg-foreground text-white hover:bg-foreground/90",
          buttonVariant: "outline" as const,
          buttonLabel: demoMode ? "Đăng ký nếu muốn đồng bộ" : "Bắt đầu miễn phí",
          icon: Target,
          onClick: () => handleAuthNavigate("signup"),
        },
        {
          eyebrow: "Dữ liệu cá nhân",
          title: demoMode ? "Dữ liệu đang lưu trên trình duyệt hiện tại" : "Đăng nhập để đồng bộ thay vì chỉ lưu trên máy",
          description: demoMode
            ? "Nếu muốn giữ bản sao, hãy xuất dữ liệu trước khi đổi máy hoặc xóa dữ liệu trình duyệt."
            : "Khi có tài khoản, mục tiêu, kế hoạch và tiến độ được nối với workspace của bạn thay vì phụ thuộc vào trình duyệt hiện tại.",
          cardClass: "rounded-[var(--r-card)] border border-border bg-white p-4 shadow-sm",
          eyebrowClass: "text-muted-foreground",
          titleClass: "text-foreground",
          descriptionClass: "text-muted-foreground",
          buttonClass: "mt-4 border-border bg-white text-foreground hover:bg-muted",
          buttonVariant: "outline" as const,
          buttonLabel: "Đăng nhập",
          icon: LogIn,
          onClick: () => handleAuthNavigate("signin"),
        },
      ]
    : activeSystem
      ? [
          {
            eyebrow: "Chu kỳ đang chạy",
            title: visibleActiveTwelveWeekGoal?.title ?? "Chu kỳ 12 tuần hiện tại",
            description:
              activeSystemTodayOpenTasks.length > 0
                ? `${activeSystemTodayOpenTasks.length} việc đang mở hôm nay. Đi thẳng vào trung tâm để chạm tiếp đúng việc cần làm.`
                : `Tuần ${activeSystemWeek}/${activeSystem.totalWeeks} đang khá gọn. Đây là lúc đẹp để nhìn lại tuần hoặc chuẩn bị review.`,
            cardClass: "rounded-[var(--r-card)] border border-border bg-muted p-4 shadow-sm",
            eyebrowClass: "text-muted-foreground",
            titleClass: "text-foreground",
            descriptionClass: "text-muted-foreground",
            buttonClass: "mt-4 bg-foreground text-white hover:bg-foreground/90",
            buttonVariant: "outline" as const,
            buttonLabel: "Mở trung tâm 12 tuần",
            icon: CalendarDays,
            onClick: () => navigate("/12-week-system"),
          },
          {
            eyebrow: "Review tuần",
            title: reviewDueToday ? "Đến hạn hôm nay" : getReviewDayLabel(activeSystem.reviewDay),
            description: reviewDueToday
              ? "Nên chốt trước khi sang nhịp tuần mới để dashboard quay về trạng thái gọn đầu."
              : "Chu kỳ đang có ngày review cố định. Khi tới hạn, thẻ cảnh báo sẽ nổi lên ở đầu màn.",
            cardClass: `rounded-[var(--r-card)] border p-4 shadow-sm ${
              reviewDueToday ? "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)]" : "border-border bg-white"
            }`,
            eyebrowClass: reviewDueToday ? "text-[color:var(--color-warning-fg)]" : "text-muted-foreground",
            titleClass: "text-foreground",
            descriptionClass: "text-muted-foreground",
            buttonClass: reviewDueToday
              ? "mt-4 border-[color:var(--color-warning-border)] bg-white text-[color:var(--color-warning-fg)] hover:bg-[color:var(--color-warning-bg)]"
              : "mt-4 border-border bg-white text-foreground hover:bg-muted",
            buttonVariant: "outline" as const,
            buttonLabel: reviewDueToday ? "Chốt review tuần" : "Xem chu kỳ",
            icon: AlertTriangle,
            onClick: () => navigate("/12-week-system"),
          },
          ...(weakestArea
            ? [
                {
                  eyebrow: "Lĩnh vực nên chăm lại",
                  title: getLifeAreaLabel(weakestArea.name),
                  description: `Điểm hiện tại ${weakestArea.score}/10. Nếu hôm nay còn thời gian, đây là nơi đáng quay lại trước.`,
                  cardClass: "rounded-[var(--r-card)] border border-border bg-white p-4 shadow-sm",
                  eyebrowClass: "text-muted-foreground",
                  titleClass: "text-foreground",
                  descriptionClass: "text-muted-foreground",
                  buttonClass: "mt-4 border-border bg-white text-foreground hover:bg-muted",
                  buttonVariant: "outline" as const,
                  buttonLabel: "Mở cân bằng cuộc sống",
                  icon: TrendingUp,
                  onClick: () => navigate("/life-balance"),
                },
              ]
            : []),
        ]
      : [
          {
            eyebrow: "Thiết lập nhịp 12 tuần",
            title: "Chưa có chu kỳ đang chạy",
            description:
              "Tạo một chu kỳ để web luôn trả lời rõ hôm nay nên làm gì, tuần này đang ở đâu và review khi nào đến hạn.",
            cardClass: "rounded-[var(--r-card)] border border-border bg-muted p-4 shadow-sm",
            eyebrowClass: "text-muted-foreground",
            titleClass: "text-foreground",
            descriptionClass: "text-muted-foreground",
            buttonClass: "mt-4 bg-foreground text-white hover:bg-foreground/90",
            buttonVariant: "outline" as const,
            buttonLabel: "Tạo mục tiêu",
            icon: CalendarDays,
            onClick: () => navigate("/life-insight"),
          },
          ...(weakestArea
            ? [
                {
                  eyebrow: "Lĩnh vực nên chăm lại",
                  title: getLifeAreaLabel(weakestArea.name),
                  description: `Điểm hiện tại ${weakestArea.score}/10. Nếu muốn bắt đầu nhẹ hơn, hãy cải thiện một góc nhỏ ở đây trước.`,
                  cardClass: "rounded-[var(--r-card)] border border-border bg-white p-4 shadow-sm",
                  eyebrowClass: "text-muted-foreground",
                  titleClass: "text-foreground",
                  descriptionClass: "text-muted-foreground",
                  buttonClass: "mt-4 border-border bg-white text-foreground hover:bg-muted",
                  buttonVariant: "outline" as const,
                  buttonLabel: "Mở cân bằng cuộc sống",
                  icon: TrendingUp,
                  onClick: () => navigate("/life-balance"),
                },
              ]
            : []),
          {
            eyebrow: "Bảng tầm nhìn",
            title: latestVisionBoard ? latestVisionBoard.name : "Chưa có bảng tầm nhìn",
            description: latestVisionBoard
              ? `Năm ${latestVisionBoard.year} • ${latestVisionBoard.items.length} phần tử đang được lưu lại.`
              : "Tạo một bảng tầm nhìn để trực quan hóa điều bạn đang hướng tới và quay lại nó dễ hơn mỗi ngày.",
            cardClass: "rounded-[var(--r-card)] border border-border bg-white p-4 shadow-sm",
            eyebrowClass: "text-muted-foreground",
            titleClass: "text-foreground",
            descriptionClass: "text-muted-foreground",
            buttonClass: "mt-4 border-border bg-white text-foreground hover:bg-muted",
            buttonVariant: "outline" as const,
            buttonLabel: latestVisionBoard ? "Mở thư viện tầm nhìn" : "Tạo bảng tầm nhìn",
            icon: Images,
            onClick: () => navigate(latestVisionBoard ? "/gallery" : "/vision-board"),
          },
        ];
  const dashboardAttentionPanels = attentionPanels.slice(0, 2);

  const overdueCount = activeSystem ? activeSystemTodayTasks.filter((t) => !t.completed).length : 0;
  const activeTriggers = evaluateRescueTriggers({
    system: activeSystem,
    subscription: isSignedOut ? null : (userData.subscription ?? null),
    missedTasksCount: overdueCount,
    weekCompletionPercent: activeSystemWeekCompletion?.percent ?? 0,
  }).filter((t) => t.kind !== dismissedTrigger);
  const topTrigger = activeTriggers[0] ?? null;
  // Signed-out visitors get their hero from `PublicVisitorHero` (rendered above);
  // skip the secondary dashboard card for them to avoid a double-hero.
  const dashboardTourSteps = shouldShowTopSidebar
    ? DASHBOARD_TOUR_STEPS
    : DASHBOARD_TOUR_STEPS.filter(
        (step) => step.targetId !== "dashboard-next-card" && step.targetId !== "dashboard-plan-card",
      );

  return (
    <div className={`ops-shell ops-dashboard ${showMobileStickyCTA ? 'pb-24' : ''}`}>
      {!isSignedOut ? <h1 className="sr-only">Bảng điều khiển</h1> : null}
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
      {isSignedOut ? (
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
              triggerClassName="border-border bg-white/80 text-muted-foreground hover:bg-white"
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
              wrapper: "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)]",
              icon: "bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)]",
              headline: "text-[color:var(--color-danger-fg)]",
              detail: "text-[color:var(--color-danger-fg)]",
            },
            caution: {
              wrapper: "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)]",
              icon: "bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)]",
              headline: "text-[color:var(--color-warning-fg)]",
              detail: "text-[color:var(--color-warning-fg)]",
            },
            watch: {
              wrapper: "border-border bg-muted",
              icon: "bg-muted text-muted-foreground",
              headline: "text-muted-foreground",
              detail: "text-muted-foreground",
            },
          } as const;
          const s = severityStyles[topTrigger.severity];
          const ctaHref = topTrigger.kind === "trial_ending" ? "/billing/plan" : "/12-week-system";
          const ctaLabel = topTrigger.kind === "trial_ending" ? "Mở Plus" : "Xem ngay";
          return (
            <Reveal key={topTrigger.kind}>
              <div
                className={`rounded-[var(--r-tile)] border px-4 py-3 text-sm flex flex-wrap items-start gap-3 ${s.wrapper}`}
                onAnimationStart={() => {
                  trackRescueTriggerFired({
                    kind: topTrigger.kind,
                    severity: topTrigger.severity,
                    currentPlan: currentPlanCode,
                  });
                }}
              >
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--r-pill)] ${s.icon}`}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${s.headline}`}>{topTrigger.headline}</p>
                  <p className={`mt-0.5 text-xs ${s.detail}`}>{topTrigger.detail}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 ml-auto">
                  <Button
                    variant="secondary"
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
                    aria-label="Đóng thông báo"
                    onClick={() => {
                      dismissRescueTrigger(topTrigger.kind);
                      trackRescueTriggerDismissed({ kind: topTrigger.kind, currentPlan: currentPlanCode });
                      setDismissedTrigger(topTrigger.kind);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </Reveal>
          );
        })()}

      {/* Trial countdown banner */}
      {!isSignedOut &&
        userData.subscription?.status === "trialing" &&
        userData.subscription.renewsAt &&
        new Date(userData.subscription.renewsAt) >= new Date() &&
        (() => {
          const daysLeft = Math.max(
            0,
            Math.ceil((new Date(userData.subscription.renewsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          );
          return (
            <div className="rounded-[var(--r-tile)] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] px-4 py-3 text-sm flex flex-wrap items-center gap-3">
              <span>
                <span className="font-semibold">Plus dùng thử:</span> còn {daysLeft} ngày trên trình duyệt này.
              </span>
              <Button size="sm" variant="ghost" className="ml-auto shrink-0 text-[color:var(--color-warning-fg)] hover:bg-[color:var(--color-warning-bg)]" onClick={() => navigate("/billing/plan")}>
                Chi tiết
              </Button>
            </div>
          );
        })()}
      {!isSignedOut && (
        <Card className="border border-[color:var(--color-info-border)] bg-white/94 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-info-fg)]">Tầm nhìn 3 năm</p>
              <h2 className="mt-2 text-xl font-bold text-foreground">
                {aspirationalVision ? "Tầm nhìn dài hạn đã được neo lại" : "Hình dung hướng đi trước khi chạy 12 tuần"}
              </h2>
              <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {aspirationalVision
                  ? aspirationalVision.summary
                  : "Discipline #4 của 12 Week Year khuyên tách tầm nhìn 3 năm khỏi mục tiêu 12 tuần để mỗi cycle có điểm tựa rõ hơn."}
              </p>
            </div>
            <Button className="w-full sm:w-auto" variant={aspirationalVision ? "outline" : "secondary"} onClick={() => navigate("/vision")}>
              {aspirationalVision ? "Sửa tầm nhìn 3 năm" : "Hình dung tầm nhìn 3 năm"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
      <SpotlightTour
        open={isTourOpen}
        onOpenChange={setIsTourOpen}
        title="Tour bảng điều khiển"
        description="Ba điểm chính để người mới mở vào là biết nên bắt đầu từ đâu."
        steps={dashboardTourSteps}
      />

      {/* HERO SECTION: Promise + Primary CTA */}
      <SectionBlock title="Hôm nay và bước tiếp theo" headerVisuallyHidden className="ops-section-hero">
        {activeSystem && reviewDueToday && (
          <Reveal>
            <Card className="border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] shadow-lg">
              <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)]">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-warning-fg)]">
                      Review đến hạn hôm nay
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-foreground">Hôm nay là lúc chốt review tuần.</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {visibleActiveTwelveWeekGoal?.title}. Khóa tuần {activeSystemWeek} và quyết định nhịp cho tuần tiếp
                      theo.
                    </p>
                  </div>
                </div>
                <Button variant="secondary" className="w-full min-w-[180px] sm:w-auto" onClick={() => navigate("/12-week-system")}>
                  Mở review tuần
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {/* Primary Action Card - Most Important Thing */}
        {shouldShowMainDashboardCard && activeSystem && activeSystemTodayOpenTasks.length > 0 && (
          <Card data-testid="dashboard-primary-action-card" className="border-2 border-primary bg-white shadow-lg">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-primary text-white shadow-lg">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      Việc quan trọng nhất hôm nay
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-foreground sm:text-xl">
                      {activeSystemTodayOpenTasks[0].title}
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-[color:var(--color-success-fg)]">
                      Chỉ cần xong việc này là hôm nay đã đủ. Phần còn lại mở sau.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activeSystemTodayOpenTasks.length > 1
                        ? `Còn ${activeSystemTodayOpenTasks.length - 1} việc khác chờ sau đó`
                        : "Đây là việc duy nhất hôm nay"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="w-full bg-foreground text-white hover:bg-foreground sm:w-auto"
                  onClick={() => navigate("/12-week-system")}
                >
                  Mở và đánh dấu xong
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
              variant="secondary"
              className="w-full shadow-lg"
              size="lg"
              onClick={() => navigate("/12-week-system")}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Đánh dấu xong - {activeSystemTodayOpenTasks.length} việc
            </Button>
          </div>
        )}

        {/* Demo Visitor Empty State - Fresh signed-out users see this instead of sample goals */}
        {isFreshDemoVisitor && (
          <Card className="border border-border bg-white shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--r-tile)] bg-muted">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Bắt đầu trải nghiệm</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Bạn có thể dùng thử các tính năng cơ bản mà không cần đăng nhập.
                Hãy bắt đầu với Life Balance để tạo dữ liệu thực.
              </p>
              <Button variant="secondary" className="mt-4" onClick={handlePublicVisitorStart}>
                Bắt đầu Life Balance
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Card with PageHeader */}
        {shouldShowMainDashboardCard && (
          <Card data-testid="dashboard-main-card" className="border border-border bg-white/92 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="stack-stack">
                <PageHeader
                  eyebrow={isSignedOut ? "Trang chính" : "Hôm nay"}
                  title={
                    isSignedOut
                      ? publicVisitorDashboardTitle
                      : activeSystem
                        ? `Quay lại đúng nhịp của "${visibleActiveTwelveWeekGoal?.title ?? "chu kỳ 12 tuần hiện tại"}".`
                        : setupStartTitle
                  }
                  description={
                    isSignedOut
                      ? publicVisitorDashboardDescription
                      : activeSystem
                        ? activeSystemTodayOpenTasks.length > 0
                          ? `Tập trung vào ${activeSystemTodayOpenTasks.length} việc đang mở hôm nay trước khi xem tiến độ tuần.`
                          : "Hôm nay không còn việc mở. Nếu còn thời gian, hãy xem lại tuần hoặc chuẩn bị review khi đến hạn."
                        : setupStartDescription
                  }
                />
                <div className="mt-[var(--space-inline)] flex flex-wrap gap-2">
                  {isSignedOut ? (
                    <span title="Chế độ xem không cần đăng nhập, dùng thử các tính năng cơ bản" className="rounded-[var(--r-pill)] border border-border bg-white px-3 py-1.5 text-sm text-muted-foreground">
                      {publicVisitorBadge}
                    </span>
                  ) : (
                    <button
                      type="button"
                      title={`Gói hiện tại: ${getPlanLabel(currentPlanCode)} — mở trang quản lý gói`}
                      className={`inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border px-3 py-1.5 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        currentPlanCode === "FREE"
                          ? "border-border bg-white text-muted-foreground"
                          : "border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]"
                      }`}
                      onClick={() => navigate("/billing/plan")}
                    >
                      <Crown className="h-3.5 w-3.5" />
                      {currentPlanCode === "FREE" ? "Gói Free" : `${getPlanLabel(currentPlanCode)} đang hoạt động`}
                    </button>
                  )}
                  {activeSystem && activeSystemWeek && (
                    <span title={`Tuần hiện tại trong chu kỳ 12 tuần (${getTwelveWeekCurrentWeek(activeSystem)}/${activeSystem.totalWeeks})`} className="rounded-[var(--r-pill)] border border-border bg-white px-3 py-1.5 text-sm text-muted-foreground">
                      Tuần {activeSystemWeek} của chu kỳ hiện tại
                    </span>
                  )}
                </div>

                {activeSystem && <DataStorageInfo variant="inline" className="mt-2" />}

                {activeSystem && activeSystemWeekCompletion && activeSystemWeekRange ? (
                  <div className="grid gap-4">
                    <div
                      data-tour-id="dashboard-start-card"
                      className="rounded-[var(--r-card)] border border-border bg-white p-5 sm:p-6"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Làm tiếp ngay
                          </p>
                          <h2 className="mt-2 text-2xl font-bold text-foreground">
                            {activeSystemTodayOpenTasks.length > 0
                              ? `${activeSystemTodayOpenTasks.length} việc đang mở hôm nay`
                              : "Hôm nay đang khá gọn"}
                          </h2>
                        </div>
                        <Button
                          data-tour-id="dashboard-primary-action"
                          className="w-full sm:w-auto"
                          onClick={() => navigate("/12-week-system")}
                        >
                          Mở trung tâm 12 tuần
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>

                          {activeSystemTaskPreview.length > 0 ? (
                            <div className="mt-4 stack-tight">
                              {activeSystemTaskPreview.map((task, index) => (
                                <div
                                  key={task.id}
                                  className={`flex items-center gap-4 rounded-[var(--r-card)] border px-4 py-4 ${
                                    index === 0 ? "border-border bg-white" : "border-border bg-white/80"
                                  }`}
                                >
                                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--r-tile)] bg-foreground text-sm font-semibold text-white">
                                    {index + 1}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {index === 0 ? "Việc nên chạm vào đầu tiên" : "Việc đang chờ phía sau"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-4 rounded-[var(--r-card)] border border-border bg-white p-4">
                              <p className="font-semibold text-foreground">Bạn đã chốt xong phần mở của hôm nay.</p>
                              <p className="mt-1 text-sm leading-7 text-muted-foreground">
                                Nếu còn sức, hãy mở trung tâm 12 tuần để xem phần còn lại của tuần hoặc chốt review khi
                                đến hạn.
                              </p>
                            </div>
                          )}

                          <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            <div className="rounded-[var(--r-tile)] border border-border bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Hôm nay
                              </p>
                              <p className="mt-1 text-xl font-bold text-foreground">
                                {activeSystemTodayOpenTasks.length}
                              </p>
                              <p className="text-xs text-muted-foreground">{activeSystemTodayCompletedCount} việc đã chốt</p>
                            </div>
                            <div className="rounded-[var(--r-tile)] border border-border bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Tuần này
                              </p>
                              <div className="mt-1 flex items-center gap-3">
                                <p className="text-xl font-bold text-foreground">
                                  {activeSystemWeekCompletion.percent}%
                                </p>
                                <Progress
                                  value={activeSystemWeekCompletion.percent}
                                  className="h-2 flex-1 bg-muted"
                                />
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatCalendarDate(activeSystemWeekRange.start)} -{" "}
                                {formatCalendarDate(activeSystemWeekRange.end)}
                              </p>
                            </div>
                            <div
                              className={`rounded-[var(--r-tile)] border px-4 py-3 ${
                                reviewDueToday ? "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)]" : "border-border bg-white"
                              }`}
                            >
                              <p
                                className={`text-xs font-semibold uppercase tracking-[0.14em] ${
                                  reviewDueToday ? "text-[color:var(--color-warning-fg)]" : "text-muted-foreground"
                                }`}
                              >
                                Review
                              </p>
                              <p className="mt-1 text-base font-bold text-foreground">
                                {reviewDueToday ? "Đến hạn hôm nay" : getReviewDayLabel(activeSystem.reviewDay)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {reviewDueToday ? "Nên chốt trước tuần mới." : "Ngày cố định của chu kỳ."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        data-tour-id="dashboard-start-card"
                        className="rounded-[var(--r-card)] border border-border bg-muted p-5"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {isSignedOut ? "Bắt đầu đúng cách" : "Bắt đầu nhanh nhất"}
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-foreground">
                          {isSignedOut ? publicVisitorStartTitle : setupStartTitle}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                          {isSignedOut ? publicVisitorStartDescription : setupStartDescription}
                        </p>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <Button
                            data-tour-id="dashboard-primary-action"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={() => (isSignedOut ? handlePublicVisitorStart() : navigate(setupPrimaryPath))}
                          >
                            {isSignedOut ? publicVisitorPrimaryLabel : setupPrimaryLabel}
                          </Button>
                          {isSignedOut ? (
                            <Button
                              variant="outline"
                              className="w-full border-border bg-white text-foreground sm:w-auto"
                              onClick={() => handleAuthNavigate("signin")}
                            >
                              Đăng nhập
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
            <section className="rounded-[var(--r-card)] border border-border bg-white/92 p-5 shadow-sm sm:p-6">
              <PageHeader
                eyebrow="Thứ tự nên đi"
                title="Một luồng chính, không phải ba lựa chọn ngang nhau."
                description={quickActionIntro}
              />

              <div className="mt-[var(--space-inline)] grid gap-[var(--space-stack)] md:grid-cols-3">
                    {quickActions.map((action) => {
                      const Icon = action.icon;

                      return (
                        <Button
                          key={action.title}
                          variant="outline"
                          className="group h-auto min-w-0 justify-start whitespace-normal rounded-[var(--r-card)] border-border bg-white px-4 py-4 text-left shadow-sm transition-colors hover:border-border hover:bg-white hover:shadow"
                          onClick={action.onClick}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-tile)] bg-muted text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="ml-3 min-w-0 flex-1">
                            <div className="line-clamp-2 break-words text-sm font-semibold leading-5 text-foreground sm:text-base">
                              {action.title}
                            </div>
                            <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{action.description}</div>
                          </div>
                          <ArrowRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/45 transition-colors group-hover:text-muted-foreground" />
                        </Button>
                      );
                    })}
                  </div>
                </section>

                {/* Stats Cards - Collapsible on mobile */}
                <details className="group rounded-[var(--r-card)] border border-border bg-white/92 p-5 shadow-sm sm:p-6 sm:!block">
                  <summary className="flex cursor-pointer list-none flex-wrap items-end justify-between gap-3 text-sm font-semibold text-foreground sm:cursor-default">
                    <span>Tổng quan nhanh</span>
                    <span className="rounded-[var(--r-pill)] border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {isSignedOut ? "Luồng cốt lõi" : `${userData.goals.length} mục tiêu`}
                    </span>
                    <svg aria-hidden="true" className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-[var(--space-stack)] grid gap-[var(--space-stack)] grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {overviewCards.map((item, index) => {
                      const Icon = item.icon;

                      return (
                        <div
                          key={`top-${item.title}`}
                          className="animate-fade-in-up"
                          style={{ animationDelay: `${0.04 * index}s` }}
                        >
                          <Card className="h-full border border-border bg-white/88 shadow-sm">
                            <CardHeader className="flex flex-row items-start justify-between pb-3">
                              <div>
                                <CardDescription className="text-xs font-medium text-muted-foreground">
                                  {item.title}
                                </CardDescription>
                                <CardTitle className="mt-2 text-2xl font-bold text-foreground">
                                  {isSignedOut ? item.value : <CountUp value={item.value} />}
                                </CardTitle>
                              </div>
                              <div className={`flex h-9 w-9 items-center justify-center rounded-[var(--r-tile)] ${item.iconClass}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground">{item.note}</p>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </details>
              </>
            )}

            {isSignedOut ? null : !activeSystem ? (
              <EmptyState
                as="section"
                align="left"
                headingLevel={2}
                testId="fresh-workspace-empty-state"
                eyebrow="Workspace mới"
                title="Chưa có dữ liệu thực thi để hiển thị."
                description="Dashboard sẽ chỉ hiện điểm, chuỗi ngày và chỉ số sau khi bạn tạo chu kỳ 12 tuần đầu tiên. Bây giờ nên đi từ Life Balance để có dữ liệu thật, rồi mới chốt mục tiêu SMART."
                actions={
                  <Button
                    variant="secondary"
                    className="w-full bg-foreground text-white hover:bg-foreground/90 sm:w-auto"
                    onClick={() => navigate("/onboarding")}
                  >
                    Bắt đầu Life Balance
                  </Button>
                }
              >
                <ol className="grid gap-3 md:grid-cols-3">
                  {["Chấm 8 lĩnh vực cuộc sống", "Chọn một insight ưu tiên", "Tạo SMART goal và chu kỳ 12 tuần"].map(
                    (item, index) => (
                      <li key={item} className="rounded-[var(--r-tile)] border border-border bg-muted p-4">
                        <div
                          aria-hidden="true"
                          className="flex h-9 w-9 items-center justify-center rounded-[var(--r-pill)] bg-foreground text-sm font-semibold text-white"
                        >
                          {index + 1}
                        </div>
                        <p className="mt-[var(--space-inline)] text-sm font-semibold leading-6 text-foreground">{item}</p>
                      </li>
                    ),
                  )}
                </ol>
              </EmptyState>
            ) : (
              <details
                data-testid="dashboard-execution-board"
                className="group rounded-[var(--r-card)] border border-border bg-white/92 p-5 shadow-sm sm:p-6 open:sm:!block sm:!block"
                open={!isMobileViewport}
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-end justify-between gap-3 sm:cursor-default">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Bảng thực thi</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                      Tổng quan hiệu suất 12 tuần
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Theo dõi tiến độ, nhịp thực thi và chỉ số dẫn của mục tiêu đang chạy.
                    </p>
                    <p className="mt-2 text-sm font-medium text-muted-foreground sm:hidden">
                      Tuần {activeSystemWeek || currentWeekExecutionSnapshot.weekNumber || 1}:{" "}
                      {activeSystemWeekCompletion?.completed ?? currentWeekExecutionSnapshot.completedTasks}/
                      {activeSystemWeekCompletion?.total ?? currentWeekExecutionSnapshot.totalTasks} việc —{" "}
                      {activeSystemWeekCompletion?.percent ?? currentWeekExecutionSnapshot.executionScore}% lead completion
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-[var(--r-pill)] border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      Dữ liệu chu kỳ hiện tại
                    </span>
                    <svg aria-hidden="true" className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <div className="mt-[var(--space-stack)] grid gap-[var(--space-stack)] sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3">
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

                <details className="group rounded-[var(--r-card)] border border-border bg-muted p-5">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 text-sm font-semibold text-foreground">
                    <span>Phân tích mở rộng</span>
                    <span className="rounded-[var(--r-pill)] border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground">
                      Tiến độ theo tuần + chỉ số dẫn
                    </span>
                  </summary>
                  <div className="mt-[var(--space-stack)] grid gap-[var(--space-stack)] xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                    <WeeklyProgressChart points={weeklyProgressPoints} />
                    <MetricsSummary items={leadMetricsSummary} />
                  </div>
                </details>


                {planLoading && !plan && (
                  <Card className="border border-border bg-white/80 shadow-sm">
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      Đang tải dữ liệu dashboard 12 tuần...
                    </CardContent>
                  </Card>
                )}

                {planError && (
                  <Card className="border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] shadow-sm">
                    <CardContent className="p-4 text-sm text-[color:var(--color-danger-fg)]">{planError.message}</CardContent>
                  </Card>
                )}
              </details>
            )}

        {shouldShowTopSidebar && (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.08s' }}>
            <div className="stack-section lg:sticky lg:top-24 lg:self-start">
              {isSignedOut ? (
                <PublicVisitorAccountCard
                  onSignIn={() => handleAuthNavigate("signin")}
                  onSignUp={() => handleAuthNavigate("signup")}
                />
              ) : (
                <Card
                  data-tour-id="dashboard-plan-card"
                  className="glass-surface-gradient-border border-0 bg-white/92 shadow-sm ambient-glow"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      Kế hoạch hiện tại
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {getPlanLabel(currentPlanCode)} — {currentPlanDefinition.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="stack-stack">
                    <div className="rounded-[var(--r-card)] border border-border bg-muted p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Đang dùng</p>
                      <p className="mt-2 text-3xl font-bold text-foreground">{getPlanLabel(currentPlanCode)}</p>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">{currentPlanDefinition.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {premiumStatusItems.map((key) => {
                        const isUnlocked = entitlementKeys.includes(key);

                        return (
                          <span
                            key={key}
                            className={`rounded-[var(--r-pill)] border px-3 py-1.5 text-xs font-medium ${
                              isUnlocked
                                ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)]"
                                : "border-border bg-muted text-muted-foreground"
                            }`}
                          >
                            {isUnlocked ? "Đang mở" : "Đang khóa"} · {getEntitlementLabel(key)}
                          </span>
                        );
                      })}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {currentPlanCode === "FREE" ? (
                        <>
                          <Button
                            variant="secondary"
                            className="bg-foreground text-white hover:bg-foreground/90"
                            onClick={() => openUpgradeDialog("plan", "PLUS")}
                          >
                            Nâng cấp Plus
                          </Button>
                          <Button
                            variant="outline"
                            className="border-border bg-white text-foreground hover:bg-muted"
                            onClick={() => navigate(activeSystem ? "/12-week-system?tab=settings" : "/life-insight")}
                          >
                            Xem Free đang có gì
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          className="border-border bg-white text-foreground hover:bg-muted sm:col-span-2"
                          onClick={() => navigate(activeSystem ? "/12-week-system?tab=settings" : "/life-insight")}
                        >
                          Quản lý gói và quyền
                        </Button>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Nâng cấp gói Plus để mở toàn bộ quyền nâng cao cho chu kỳ 12 tuần.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card
                data-tour-id="dashboard-next-card"
                className="border border-border bg-white/92 shadow-sm"
              >
                <CardHeader>
                  <CardTitle className="text-foreground">Đi tiếp ngay</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Chỉ giữ hai tín hiệu quan trọng nhất để bạn quyết định nhanh.
                  </CardDescription>
                </CardHeader>
                <CardContent className="stack-tight">
                  {dashboardAttentionPanels.map((panel) => {
                    const Icon = panel.icon;
                    return (
                      <div key={panel.eyebrow} className={panel.cardClass}>
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-[var(--r-tile)] bg-muted text-muted-foreground">
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
      </SectionBlock>

      {!isSignedOut && userData.isHydratedFromDemo && (
        <Reveal>
          <div className="flex flex-wrap items-center gap-4 rounded-[var(--r-card)] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] px-5 py-4 shadow-lg">
            <Sparkles className="h-5 w-5 shrink-0 text-[color:var(--color-warning-fg)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[color:var(--color-warning-fg)]">Dữ liệu đang hiển thị là ví dụ mẫu</p>
              <p className="mt-0.5 text-sm text-[color:var(--color-warning-fg)]">
                Cập nhật bánh xe cuộc sống của bạn để thay dữ liệu mẫu bằng thông tin thật.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-[color:var(--color-warning-border)] bg-white text-[color:var(--color-warning-fg)] hover:bg-[color:var(--color-warning-bg)]"
              onClick={() => navigate("/life-balance")}
            >
              Cập nhật ngay
            </Button>
          </div>
        </Reveal>
      )}

      {/* SECONDARY SECTION: Workspace Details */}
      {shouldShowWorkspaceDetailGrid && (
        <SectionBlock title="Dữ liệu gần đây" headerVisuallyHidden className="ops-section-secondary">
          <PageHeader
            eyebrow="Chi tiết workspace"
            title="Dữ liệu gần đây"
            description="Xem nhanh mục tiêu, cân bằng cuộc sống và nhật ký của bạn."
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <Reveal>
              <Card className="h-full border border-border bg-white/92 shadow-sm">
                <CardHeader>
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <CardTitle className="text-foreground">
                        {isSignedOut ? "Luồng mục tiêu mẫu" : "Mục tiêu gần đây"}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {isSignedOut
                          ? "Từ một mong muốn rộng, web sẽ ép lại thành mục tiêu rõ và kế hoạch có lịch."
                          : "Đủ ít để bạn nhìn một lượt là hiểu."}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => (isSignedOut ? handleAuthNavigate("signup") : navigate("/life-insight"))}
                    >
                      <Plus className="h-4 w-4" />
                      {isSignedOut ? "Đăng ký để đồng bộ sau" : "Tạo mục tiêu"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="stack-stack">
                  {recentGoals.length === 0 ? (
                    <div className="rounded-[var(--r-card)] border border-dashed border-border bg-muted px-6 py-10 text-center text-muted-foreground">
                      <Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground/45" />
                      <p>
                        {isSignedOut
                          ? "Bạn có thể đi qua Life Insight, SMART Goal và kiểm tra tính thực tế mà không cần đăng nhập."
                          : "Chưa có mục tiêu nào. Hãy bắt đầu bằng mục tiêu đầu tiên của bạn."}
                      </p>
                      <Button
                        variant="secondary"
                        className="mt-[var(--space-stack)] w-full sm:w-auto"
                        onClick={() => (isSignedOut ? handleAuthNavigate("signup") : navigate("/life-insight"))}
                      >
                        {isSignedOut ? "Đăng ký để đồng bộ sau" : "Tạo mục tiêu"}
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-[var(--r-card)] border border-border bg-white shadow-sm">
                      <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(120px,0.6fr)_minmax(120px,0.6fr)_minmax(100px,0.5fr)] gap-4 border-b border-border bg-muted px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground lg:grid">
                        <span>Mục tiêu</span>
                        <span>Loại</span>
                        <span>Tiến độ</span>
                        <span className="text-right">Hành động</span>
                      </div>

                      <div className="divide-y divide-border">
                        {recentGoals.map((goal) => {
                          const progress = calculateGoalProgress(goal);
                          const execution = getGoalExecutionStats(goal);

                          return (
                            <div
                              key={goal.id}
                              className={`px-4 py-4 lg:px-5 ${goal.twelveWeekSystem ? "bg-[color:var(--color-info-bg)]" : "bg-white/40"}`}
                            >
                              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(120px,0.6fr)_minmax(120px,0.6fr)_minmax(100px,0.5fr)] lg:items-center">
                                <div className="min-w-0">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-tile)] bg-foreground text-white">
                                      <Target className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate font-semibold text-foreground">{goal.title}</p>
                                        {goal.twelveWeekSystem && (
                                          <span className="rounded-[var(--r-pill)] bg-[color:var(--color-info-bg)] px-3 py-1 text-[11px] font-semibold text-[color:var(--color-info-fg)]">
                                            12 tuần
                                          </span>
                                        )}
                                        {progress === 100 && (
                                          <span className="rounded-[var(--r-pill)] bg-[color:var(--color-success-bg)] px-3 py-1 text-[11px] font-semibold text-[color:var(--color-success-fg)]">
                                            Hoàn thành
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                                        <span>{getLifeAreaLabel(goal.category)}</span>
                                        {goal.deadline && <span>• Đích {formatCalendarDate(goal.deadline)}</span>}
                                      </div>
                                      <div className="mt-[var(--space-inline)] flex flex-wrap gap-2 text-xs text-muted-foreground lg:hidden">
                                        <span className="rounded-[var(--r-pill)] bg-muted px-3 py-1">
                                          {goal.twelveWeekSystem ? "Chu kỳ 12 tuần" : "Mục tiêu thường"}
                                        </span>
                                        <span className="rounded-[var(--r-pill)] bg-muted px-3 py-1">
                                          {execution.completed}/{execution.total} việc đã chốt
                                        </span>
                                        <span className="rounded-[var(--r-pill)] bg-muted px-3 py-1">{progress}% tiến độ</span>
                                      </div>
                                    </div>
                                    <CheckCircle2
                                      aria-hidden="true"
                                      className={`h-5 w-5 shrink-0 ${progress === 100 ? "text-[color:var(--color-success-fg)]" : "text-muted-foreground/45"}`}
                                    />
                                  </div>
                                </div>

                                <div className="hidden min-w-0 lg:block">
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    {goal.twelveWeekSystem ? "Chu kỳ 12 tuần" : "Mục tiêu thường"}
                                  </p>
                                  <p className="mt-1 truncate text-sm text-muted-foreground">
                                    {goal.twelveWeekSystem
                                      ? `Gói ${getPlanLabel(currentPlanCode)}`
                                      : "Theo dõi tổng quan"}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <div                               className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-foreground">{progress}%</span>
                                    <span className="text-muted-foreground">
                                      {execution.completed}/{execution.total} việc
                                    </span>
                                  </div>
                                  <Progress value={progress} className="h-2" />
                                  {goal.twelveWeekSystem && !entitlementKeys.includes("premium_review_insights") && (
                                    <p className="text-xs font-medium text-[color:var(--color-info-fg)]">Phân tích review đang khóa</p>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                  <Button
                                    size="sm"
                                    variant={goal.twelveWeekSystem ? "secondary" : "outline"}
                                    className={goal.twelveWeekSystem ? "" : "border-white/70 bg-white hover:bg-muted"}
                                    onClick={() => navigate(goal.twelveWeekSystem ? "/12-week-system" : "/goals")}
                                    aria-label={
                                      goal.twelveWeekSystem ? `Mở 12 tuần: ${goal.title}` : `Mở mục tiêu: ${goal.title}`
                                    }
                                  >
                                    {goal.twelveWeekSystem ? "Mở 12 tuần" : "Mở mục tiêu"}
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
              <Card className="h-full border border-border bg-white/92 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-foreground">
                        {isSignedOut ? "Bánh xe cuộc sống là bước mở đầu" : "Bánh xe cuộc sống"}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {isSignedOut
                          ? "Người mới nên chấm 8 lĩnh vực trước khi chọn mục tiêu ưu tiên."
                          : "Nhìn nhanh bức tranh tổng quan hiện tại."}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Điểm trung bình</p>
                      <p className="mt-1 text-3xl font-bold text-foreground">
                        <CountUp value={averageLifeScore} precision={1} />
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="stack-stack">
                  <div className="rounded-[var(--r-card)] border border-border bg-white p-4 shadow-sm">
                    {radarData.length > 0 ? (
                      <DeferredDashboardLifeAreaRadar data={radarData} />
                    ) : (
                      <div className="flex h-[300px] flex-col items-center justify-center rounded-[var(--r-tile)] bg-muted px-5 text-center">
                        <TrendingUp className="h-10 w-10 text-muted-foreground/45" />
                        <p className="mt-[var(--space-inline)] font-semibold text-foreground">Chưa có dữ liệu bánh xe cuộc sống</p>
                        <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                          {isSignedOut
                            ? "Bạn có thể bắt đầu Life Balance không cần đăng nhập. Tài khoản chỉ cần khi muốn đồng bộ sau."
                            : "Bắt đầu bằng bài đánh giá Life Balance để dashboard có dữ liệu thật thay vì số mặc định."}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[var(--r-tile)] border border-border bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cần ưu tiên tiếp</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {isSignedOut
                          ? "Chọn sau Life Balance"
                          : weakestArea
                            ? getLifeAreaLabel(weakestArea.name)
                            : "Chưa có dữ liệu"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isSignedOut
                          ? "Dữ liệu lưu trên trình duyệt này"
                          : weakestArea
                            ? `${weakestArea.score}/10`
                            : "--"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="h-auto w-full min-w-0 justify-start whitespace-normal rounded-[var(--r-tile)] border-border bg-white px-4 py-4 text-left shadow-sm hover:bg-muted"
                      onClick={() => (isSignedOut ? handleAuthNavigate("signup") : navigate("/life-balance"))}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-tile)] bg-foreground text-white">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div className="ml-3 min-w-0 flex-1">
                        <div className="line-clamp-2 break-words font-semibold text-foreground">
                          {isSignedOut
                            ? "Bắt đầu bằng cân bằng cuộc sống"
                            : hasRealLifeBalance
                              ? "Mở cân bằng cuộc sống"
                              : "Bắt đầu đánh giá cuộc sống"}
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {isSignedOut
                            ? "Đăng ký chỉ khi muốn thử lớp đồng bộ sau."
                            : hasRealLifeBalance
                              ? "Xem chi tiết và cập nhật lại bánh xe cuộc đời."
                              : "Chấm điểm 8 lĩnh vực để mở đúng luồng mục tiêu."}
                        </div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </SectionBlock>
      )}

      {/* Recent Reflections - Part of secondary content */}
      {!isFreshDemoVisitor && recentReflections.length > 0 && (
        <SectionBlock title="Nhật ký gần đây" headerVisuallyHidden className="ops-section-secondary">
          <Reveal>
            <Card className="border border-border bg-white/92 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-foreground">Nhật ký gần đây</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Những suy ngẫm mới nhất trên hành trình của bạn.
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/journal")}>
                    Xem tất cả
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                {recentReflections.map((reflection, index) => (
                  <div
                    key={reflection.id}
                    className={`rounded-[var(--r-card)] border p-5 shadow-sm ${
                      index === 0 ? "border-border bg-muted" : "border-border bg-white"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <p className="min-w-0 truncate font-semibold text-foreground">{reflection.title}</p>
                      <span className="text-xs font-medium text-muted-foreground">{formatCalendarDate(reflection.date)}</span>
                    </div>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{reflection.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </Reveal>
        </SectionBlock>
      )}

      {/* Demo Notice - Non-intrusive, at bottom */}
      {!isSignedOut && !isFreshDemoVisitor && userData.isHydratedFromDemo && (
        <div className="ops-section-notice">
          <Reveal>
            <div className="flex flex-wrap items-center gap-4 rounded-[var(--r-card)] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] px-5 py-4 shadow-lg">
              <Sparkles className="h-5 w-5 shrink-0 text-[color:var(--color-warning-fg)]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[color:var(--color-warning-fg)]">Dữ liệu đang hiển thị là ví dụ mẫu</p>
                <p className="mt-0.5 text-sm text-[color:var(--color-warning-fg)]">
                  Cập nhật bánh xe cuộc sống của bạn để thay dữ liệu mẫu bằng thông tin thật.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-[color:var(--color-warning-border)] bg-white text-[color:var(--color-warning-fg)] hover:bg-[color:var(--color-warning-bg)]"
                onClick={() => navigate("/life-balance")}
              >
                Cập nhật ngay
              </Button>
            </div>
          </Reveal>
        </div>
      )}

    </div>
  );
}

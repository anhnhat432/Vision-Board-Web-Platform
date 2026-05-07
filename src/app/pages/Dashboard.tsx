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
          iconClass: "bg-slate-950 text-white",
        },
        {
          title: "Chu kỳ thực thi",
          value: 12,
          note: "tuần để biến mục tiêu thành việc rõ ràng",
          icon: CalendarDays,
          iconClass: "bg-sky-100 text-sky-700",
        },
        {
          title: "Tài khoản",
          value: 1,
          note: demoMode ? "tùy chọn khi muốn đồng bộ sau" : "nơi đồng bộ mục tiêu và kế hoạch của bạn",
          icon: UserPlus,
          iconClass: "bg-emerald-100 text-emerald-700",
        },
        {
          title: "Review",
          value: 1,
          note: "nhịp nhìn lại mỗi tuần để không đi lệch",
          icon: BookOpen,
          iconClass: "bg-violet-100 text-violet-700",
        },
      ]
    : [
        {
          title: "Mục tiêu đang theo",
          value: userData.goals.length,
          note: `${completedGoalsCount} đã hoàn thành`,
          icon: Target,
          iconClass: "bg-slate-950 text-white",
        },
        {
          title: "Việc đã chốt",
          value: completedTasks,
          note: `trên tổng số ${totalTasks}`,
          icon: TrendingUp,
          iconClass: "bg-sky-100 text-sky-700",
        },
        {
          title: "Thành tựu",
          value: userData.achievements.length,
          note: "huy hiệu đã mở khóa",
          icon: Award,
          iconClass: "bg-emerald-100 text-emerald-700",
        },
        {
          title: "Nhật ký",
          value: userData.reflections.length,
          note: journalStreak > 0 ? `streak ${journalStreak} ngày` : "bài viết đã lưu",
          icon: BookOpen,
          iconClass: "bg-violet-100 text-violet-700",
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
          cardClass: "rounded-[22px] border border-slate-300 bg-slate-50/90 p-4 shadow-sm",
          eyebrowClass: "text-slate-500",
          titleClass: "text-slate-950",
          descriptionClass: "text-slate-600",
          buttonClass: "mt-4 bg-slate-950 text-white hover:bg-slate-800",
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
          cardClass: "rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm",
          eyebrowClass: "text-slate-400",
          titleClass: "text-slate-900",
          descriptionClass: "text-slate-600",
          buttonClass: "mt-4 border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
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
            cardClass: "rounded-[22px] border border-slate-300 bg-slate-50/90 p-4 shadow-sm",
            eyebrowClass: "text-slate-500",
            titleClass: "text-slate-950",
            descriptionClass: "text-slate-600",
            buttonClass: "mt-4 bg-slate-950 text-white hover:bg-slate-800",
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
                  cardClass: "rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm",
                  eyebrowClass: "text-slate-400",
                  titleClass: "text-slate-900",
                  descriptionClass: "text-slate-600",
                  buttonClass: "mt-4 border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
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
            cardClass: "rounded-[22px] border border-slate-300 bg-slate-50/90 p-4 shadow-sm",
            eyebrowClass: "text-slate-500",
            titleClass: "text-slate-950",
            descriptionClass: "text-slate-600",
            buttonClass: "mt-4 bg-slate-950 text-white hover:bg-slate-800",
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
                  cardClass: "rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm",
                  eyebrowClass: "text-slate-400",
                  titleClass: "text-slate-900",
                  descriptionClass: "text-slate-600",
                  buttonClass: "mt-4 border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
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
            cardClass: "rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm",
            eyebrowClass: "text-slate-400",
            titleClass: "text-slate-900",
            descriptionClass: "text-slate-600",
            buttonClass: "mt-4 border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
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
          const ctaLabel = topTrigger.kind === "trial_ending" ? "Mở Plus" : "Xem ngay";
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
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm flex flex-wrap items-center gap-3">
              <span>
                <span className="font-semibold">Plus dùng thử:</span> còn {daysLeft} ngày trên trình duyệt này.
              </span>
              <Button size="sm" variant="ghost" className="ml-auto shrink-0 text-amber-700 hover:bg-amber-100" onClick={() => navigate("/billing/plan")}>
                Chi tiết
              </Button>
            </div>
          );
        })()}
      <SpotlightTour
        open={isTourOpen}
        onOpenChange={setIsTourOpen}
        title="Tour bảng điều khiển"
        description="Ba điểm chính để người mới mở vào là biết nên bắt đầu từ đâu."
        steps={dashboardTourSteps}
      />

      {/* HERO SECTION: Promise + Primary CTA */}
      <div className="ops-section-hero space-y-4">
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
                      Review đến hạn hôm nay
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-950">Hôm nay là lúc chốt review tuần.</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {visibleActiveTwelveWeekGoal?.title}. Khóa tuần {activeSystemWeek} và quyết định nhịp cho tuần tiếp
                      theo.
                    </p>
                  </div>
                </div>
                <Button className="w-full min-w-[180px] sm:w-auto" onClick={() => navigate("/12-week-system")}>
                  Mở review tuần
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
                      Việc quan trọng nhất hôm nay
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-slate-950 truncate">
                      {activeSystemTodayOpenTasks[0].title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {activeSystemTodayOpenTasks.length > 1
                        ? `Còn ${activeSystemTodayOpenTasks.length - 1} việc khác chờ sau đó`
                        : "Đây là việc duy nhất hôm nay"}
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full bg-slate-950 text-white hover:bg-slate-900 sm:w-auto"
                  onClick={() => navigate("/12-week-system")}
                >
                  Đánh dấu xong
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

        {/* Demo Visitor Empty State - Fresh signed-out users see this instead of sample goals */}
        {isFreshDemoVisitor && (
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Sparkles className="h-8 w-8 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-950">Bắt đầu trải nghiệm</h2>
              <p className="mt-2 text-sm text-slate-600">
                Bạn có thể dùng thử các tính năng cơ bản mà không cần đăng nhập.
                Hãy bắt đầu với Life Balance để tạo dữ liệu thực.
              </p>
              <Button className="mt-4" onClick={handlePublicVisitorStart}>
                Bắt đầu Life Balance
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Card with PageHeader */}
        {shouldShowMainDashboardCard && (
          <Card className="border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.28)]">
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="space-y-4">
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
                <div className="mt-3 flex flex-wrap gap-2">
                  {isSignedOut ? (
                    <span title="Chế độ xem không cần đăng nhập, dùng thử các tính năng cơ bản" className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
                      {publicVisitorBadge}
                    </span>
                  ) : (
                    <button
                      type="button"
                      title={`Gói hiện tại: ${getPlanLabel(currentPlanCode)} — mở trang quản lý gói`}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 ${
                        currentPlanCode === "FREE"
                          ? "border-slate-200 bg-white text-slate-600"
                          : "border-violet-200 bg-violet-50 text-violet-800"
                      }`}
                      onClick={() => navigate("/billing/plan")}
                    >
                      <Crown className="h-3.5 w-3.5" />
                      {currentPlanCode === "FREE" ? "Gói Free" : `${getPlanLabel(currentPlanCode)} đang hoạt động`}
                    </button>
                  )}
                  {activeSystem && activeSystemWeek && (
                    <span title={`Tuần hiện tại trong chu kỳ 12 tuần (${getTwelveWeekCurrentWeek(activeSystem)}/${activeSystem.totalWeeks})`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
                      Tuần {activeSystemWeek} của chu kỳ hiện tại
                    </span>
                  )}
                </div>

                {activeSystem && <DataStorageInfo variant="inline" className="mt-2" />}

                {activeSystem && activeSystemWeekCompletion && activeSystemWeekRange ? (
                  <div className="grid gap-4">
                    <div
                      data-tour-id="dashboard-start-card"
                      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Làm tiếp ngay
                          </p>
                          <h2 className="mt-2 text-2xl font-bold text-slate-950">
                            {activeSystemTodayOpenTasks.length > 0
                              ? `${activeSystemTodayOpenTasks.length} việc đang mở hôm nay`
                              : "Hôm nay đang khá gọn"}
                          </h2>
                        </div>
                        <Button
                          data-tour-id="dashboard-primary-action"
                          className="w-full gradient-brand text-white shadow-[0_14px_34px_-20px_rgba(109,40,217,0.38)] hover:shadow-[0_18px_40px_-22px_rgba(109,40,217,0.44)] hover:scale-[1.01] sm:w-auto"
                          onClick={() => navigate("/12-week-system")}
                        >
                          Mở trung tâm 12 tuần
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
                                      {index === 0 ? "Việc nên chạm vào đầu tiên" : "Việc đang chờ phía sau"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4">
                              <p className="font-semibold text-slate-950">Bạn đã chốt xong phần mở của hôm nay.</p>
                              <p className="mt-1 text-sm leading-7 text-slate-600">
                                Nếu còn sức, hãy mở trung tâm 12 tuần để xem phần còn lại của tuần hoặc chốt review khi
                                đến hạn.
                              </p>
                            </div>
                          )}

                          <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Hôm nay
                              </p>
                              <p className="mt-1 text-xl font-bold text-slate-950">
                                {activeSystemTodayOpenTasks.length}
                              </p>
                              <p className="text-xs text-slate-500">{activeSystemTodayCompletedCount} việc đã chốt</p>
                            </div>
                            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Tuần này
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
                                {reviewDueToday ? "Đến hạn hôm nay" : getReviewDayLabel(activeSystem.reviewDay)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {reviewDueToday ? "Nên chốt trước tuần mới." : "Ngày cố định của chu kỳ."}
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
                          {isSignedOut ? "Bắt đầu đúng cách" : "Bắt đầu nhanh nhất"}
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-950">
                          {isSignedOut ? publicVisitorStartTitle : setupStartTitle}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                          {isSignedOut ? publicVisitorStartDescription : setupStartDescription}
                        </p>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <Button
                            data-tour-id="dashboard-primary-action"
                            className="w-full sm:w-auto"
                            onClick={() => (isSignedOut ? handlePublicVisitorStart() : navigate(setupPrimaryPath))}
                          >
                            {isSignedOut ? publicVisitorPrimaryLabel : setupPrimaryLabel}
                          </Button>
                          {isSignedOut ? (
                            <Button
                              variant="outline"
                              className="w-full border-slate-200 bg-white text-slate-900 sm:w-auto"
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
            <section className="rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.22)] sm:p-5">
              <PageHeader
                eyebrow="Thứ tự nên đi"
                title="Một luồng chính, không phải ba lựa chọn ngang nhau."
                description={quickActionIntro}
              />

              <div className="mt-3 grid gap-3 md:grid-cols-3">
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
                <details className="group rounded-[26px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.28)] sm:p-5 sm:!block">
                  <summary className="flex cursor-pointer list-none flex-wrap items-end justify-between gap-3 text-sm font-semibold text-slate-950 sm:cursor-default">
                    <span>Tổng quan nhanh</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                      {isSignedOut ? "Luồng cốt lõi" : `${userData.goals.length} mục tiêu`}
                    </span>
                    <svg aria-hidden="true" className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                  {isSignedOut ? item.value : <CountUp value={item.value} />}
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
                    className="w-full bg-slate-950 text-white hover:bg-slate-800 sm:w-auto"
                    onClick={() => navigate("/onboarding")}
                  >
                    Bắt đầu Life Balance
                  </Button>
                }
              >
                <ol className="grid gap-3 md:grid-cols-3">
                  {["Chấm 8 lĩnh vực cuộc sống", "Chọn một insight ưu tiên", "Tạo SMART goal và chu kỳ 12 tuần"].map(
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
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bảng thực thi</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                      Tổng quan hiệu suất 12 tuần
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Theo dõi tiến độ, nhịp thực thi và chỉ số dẫn của mục tiêu đang chạy.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      Dữ liệu chu kỳ hiện tại
                    </span>
                    <svg aria-hidden="true" className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <span>Phân tích mở rộng</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                      Tiến độ theo tuần + chỉ số dẫn
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
                      Đang tải dữ liệu dashboard 12 tuần...
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
              {isSignedOut ? (
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
                      Kế hoạch hiện tại
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      {getPlanLabel(currentPlanCode)} — {currentPlanDefinition.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Đang dùng</p>
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
                            {isUnlocked ? "Đang mở" : "Đang khóa"} · {getEntitlementLabel(key)}
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
                            Nâng cấp Plus
                          </Button>
                          <Button
                            variant="outline"
                            className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                            onClick={() => navigate(activeSystem ? "/12-week-system?tab=settings" : "/life-insight")}
                          >
                            Xem Free đang có gì
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50 sm:col-span-2"
                          onClick={() => navigate(activeSystem ? "/12-week-system?tab=settings" : "/life-insight")}
                        >
                          Quản lý gói và quyền
                        </Button>
                      )}
                    </div>

                    <p className="text-sm text-slate-500">
                      Nâng cấp gói Plus để mở toàn bộ quyền nâng cao cho chu kỳ 12 tuần.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card
                data-tour-id="dashboard-next-card"
                className="border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.24)]"
              >
                <CardHeader>
                  <CardTitle className="text-slate-950">Đi tiếp ngay</CardTitle>
                  <CardDescription className="text-slate-700">
                    Chỉ giữ hai tín hiệu quan trọng nhất để bạn quyết định nhanh.
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

      {!isSignedOut && userData.isHydratedFromDemo && (
        <Reveal>
          <div className="flex flex-wrap items-center gap-4 rounded-[22px] border border-amber-200 bg-amber-50/92 px-5 py-4 shadow-[0_20px_45px_-34px_rgba(217,119,6,0.22)]">
            <Sparkles className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">Dữ liệu đang hiển thị là ví dụ mẫu</p>
              <p className="mt-0.5 text-sm text-amber-700">
                Cập nhật bánh xe cuộc sống của bạn để thay dữ liệu mẫu bằng thông tin thật.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
              onClick={() => navigate("/life-balance")}
            >
              Cập nhật ngay
            </Button>
          </div>
        </Reveal>
      )}

      {/* SECONDARY SECTION: Workspace Details */}
      {shouldShowWorkspaceDetailGrid && (
        <div className="ops-section-secondary space-y-4">
          <PageHeader
            eyebrow="Chi tiết workspace"
            title="Dữ liệu gần đây"
            description="Xem nhanh mục tiêu, cân bằng cuộc sống và nhật ký của bạn."
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <Reveal>
              <Card className="h-full border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.24)]">
                <CardHeader>
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <CardTitle className="text-slate-950">
                        {isSignedOut ? "Luồng mục tiêu mẫu" : "Mục tiêu gần đây"}
                      </CardTitle>
                      <CardDescription className="text-slate-700">
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
                <CardContent className="space-y-4">
                  {recentGoals.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center text-slate-500">
                      <Target className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                      <p>
                        {isSignedOut
                          ? "Bạn có thể đi qua Life Insight, SMART Goal và kiểm tra tính thực tế mà không cần đăng nhập."
                          : "Chưa có mục tiêu nào. Hãy bắt đầu bằng mục tiêu đầu tiên của bạn."}
                      </p>
                      <Button
                        className="mt-5 w-full sm:w-auto"
                        onClick={() => (isSignedOut ? handleAuthNavigate("signup") : navigate("/life-insight"))}
                      >
                        {isSignedOut ? "Đăng ký để đồng bộ sau" : "Tạo mục tiêu"}
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                      <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(120px,0.6fr)_minmax(120px,0.6fr)_minmax(100px,0.5fr)] gap-4 border-b border-slate-200/80 bg-slate-50/90 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 lg:grid">
                        <span>Mục tiêu</span>
                        <span>Loại</span>
                        <span>Tiến độ</span>
                        <span className="text-right">Hành động</span>
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
                                            12 tuần
                                          </span>
                                        )}
                                        {progress === 100 && (
                                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                            Hoàn thành
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-1 flex flex-wrap gap-2 text-sm text-slate-500">
                                        <span>{getLifeAreaLabel(goal.category)}</span>
                                        {goal.deadline && <span>• Đích {formatCalendarDate(goal.deadline)}</span>}
                                      </div>
                                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 lg:hidden">
                                        <span className="rounded-full bg-slate-100 px-3 py-1">
                                          {goal.twelveWeekSystem ? "Chu kỳ 12 tuần" : "Mục tiêu thường"}
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-3 py-1">
                                          {execution.completed}/{execution.total} việc đã chốt
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-3 py-1">{progress}% tiến độ</span>
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
                                    {goal.twelveWeekSystem ? "Chu kỳ 12 tuần" : "Mục tiêu thường"}
                                  </p>
                                  <p className="mt-1 truncate text-sm text-slate-500">
                                    {goal.twelveWeekSystem
                                      ? `Gói ${getPlanLabel(currentPlanCode)}`
                                      : "Theo dõi tổng quan"}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <div                               className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-slate-900">{progress}%</span>
                                    <span className="text-slate-500">
                                      {execution.completed}/{execution.total} việc
                                    </span>
                                  </div>
                                  <Progress value={progress} className="h-2" />
                                  {goal.twelveWeekSystem && !entitlementKeys.includes("premium_review_insights") && (
                                    <p className="text-xs font-medium text-violet-700">Phân tích review đang khóa</p>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                  <Button
                                    size="sm"
                                    variant={goal.twelveWeekSystem ? "default" : "outline"}
                                    className={goal.twelveWeekSystem ? "" : "border-white/70 bg-white hover:bg-slate-50"}
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
              <Card className="h-full border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.24)]">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-slate-950">
                        {isSignedOut ? "Bánh xe cuộc sống là bước mở đầu" : "Bánh xe cuộc sống"}
                      </CardTitle>
                      <CardDescription className="text-slate-700">
                        {isSignedOut
                          ? "Người mới nên chấm 8 lĩnh vực trước khi chọn mục tiêu ưu tiên."
                          : "Nhìn nhanh bức tranh tổng quan hiện tại."}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Điểm trung bình</p>
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
                            Đang tải biểu đồ cân bằng cuộc sống...
                          </div>
                        }
                      >
                        <DashboardLifeAreaRadar data={radarData} />
                      </Suspense>
                    ) : (
                      <div className="flex h-[300px] flex-col items-center justify-center rounded-[20px] bg-slate-50 px-5 text-center">
                        <TrendingUp className="h-10 w-10 text-slate-300" />
                        <p className="mt-3 font-semibold text-slate-900">Chưa có dữ liệu bánh xe cuộc sống</p>
                        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                          {isSignedOut
                            ? "Bạn có thể bắt đầu Life Balance không cần đăng nhập. Tài khoản chỉ cần khi muốn đồng bộ sau."
                            : "Bắt đầu bằng bài đánh giá Life Balance để dashboard có dữ liệu thật thay vì số mặc định."}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cần ưu tiên tiếp</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {isSignedOut
                          ? "Chọn sau Life Balance"
                          : weakestArea
                            ? getLifeAreaLabel(weakestArea.name)
                            : "Chưa có dữ liệu"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {isSignedOut
                          ? "Dữ liệu lưu trên trình duyệt này"
                          : weakestArea
                            ? `${weakestArea.score}/10`
                            : "--"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="h-auto w-full min-w-0 justify-start whitespace-normal rounded-[20px] border-slate-200 bg-white px-4 py-4 text-left shadow-sm hover:bg-slate-50"
                      onClick={() => (isSignedOut ? handleAuthNavigate("signup") : navigate("/life-balance"))}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div className="ml-3 min-w-0 flex-1">
                        <div className="line-clamp-2 break-words font-semibold text-slate-900">
                          {isSignedOut
                            ? "Bắt đầu bằng cân bằng cuộc sống"
                            : hasRealLifeBalance
                              ? "Mở cân bằng cuộc sống"
                              : "Bắt đầu đánh giá cuộc sống"}
                        </div>
                        <div className="mt-1 line-clamp-2 text-sm text-slate-500">
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
        </div>
      )}

      {/* Recent Reflections - Part of secondary content */}
      {!isFreshDemoVisitor && recentReflections.length > 0 && (
        <div className="ops-section-secondary">
          <Reveal>
            <Card className="border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.28)]">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-slate-950">Nhật ký gần đây</CardTitle>
                    <CardDescription className="text-slate-700">
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
      {!isSignedOut && !isFreshDemoVisitor && userData.isHydratedFromDemo && (
        <div className="ops-section-notice">
          <Reveal>
            <div className="flex flex-wrap items-center gap-4 rounded-[22px] border border-amber-200 bg-amber-50/92 px-5 py-4 shadow-[0_20px_45px_-34px_rgba(217,119,6,0.22)]">
              <Sparkles className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-900">Dữ liệu đang hiển thị là ví dụ mẫu</p>
                <p className="mt-0.5 text-sm text-amber-700">
                  Cập nhật bánh xe cuộc sống của bạn để thay dữ liệu mẫu bằng thông tin thật.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
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

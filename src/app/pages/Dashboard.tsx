import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Crown,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { PrimaryActionCard } from "../components/layout/PrimaryActionCard";
import { DashboardActiveGoalsList } from "@/features/dashboard/components/DashboardActiveGoalsList";
import { DashboardKpiRow } from "@/features/dashboard/components/DashboardKpiRow";
import { PublicVisitorHero } from "@/features/dashboard/components/PublicVisitorHero";
import {
  buildCurrentWeekExecutionSnapshot,
  buildGoalProgressSnapshot,
  buildWeeklyProgressPoints,
  calculateWeeklyStreak,
} from "@/features/dashboard/helpers/dashboardInsights";
import { getDashboardNextAction } from "@/features/dashboard/helpers/dashboardSections";
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
import { useBreakpoint } from "../hooks/useBreakpoint";
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
  isTwelveWeekReviewDueToday,
  sortReflectionsByDateDesc,
  type UserData,
} from "../utils/storage";
import { getPlanLabel } from "../utils/twelve-week-premium";
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
  const isDesktopViewport = useBreakpoint();
  const isMobileViewport = !isDesktopViewport;
  const navigate = useNavigate();
  const location = useLocation();
  const { isConfigured, user } = useAuthContext();
  const [dismissedTrigger, setDismissedTrigger] = useState<string | null>(null);
  const landingViewedRef = useRef(false);
  const progressViewedGoalIdRef = useRef<string | null>(null);
  const { currentPlanCode, entitlementKeys } = usePlanEntitlements(userData);
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
  const signedIn = Boolean(user);
  const hasLocalTwelveWeekSystem = Boolean(effectiveSystem);
  const hasWorkspaceSignals =
    hasRealLifeBalance || visibleGoals.length > 0 || visibleVisionBoards.length > 0 || visibleReflections.length > 0;

  const shouldShowMainDashboardCard = !isSignedOut && !isFreshDemoVisitor && (Boolean(activeSystem) || hasWorkspaceSignals);
  const showMobileStickyCTA = shouldShowMainDashboardCard && activeSystem && activeSystemTodayOpenTasks.length > 0;
  const shouldShowSetupGuide = !isSignedOut && !isFreshDemoVisitor && !activeSystem;
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

  const planTarget = activeSystem ? "/12-week-system?tab=settings" : "/billing/plan";

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
  const dashboardTourSteps = isSignedOut
    ? DASHBOARD_TOUR_STEPS.filter(
        (step) => step.targetId !== "dashboard-next-card" && step.targetId !== "dashboard-plan-card",
      )
    : DASHBOARD_TOUR_STEPS;

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
      ) : null}

      {/* Rescue trigger nudge banner */}
      {isDesktopViewport && topTrigger &&
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
                <span className="font-semibold">
                  {demoMode ? "Plus dùng thử:" : "Plus đang trong thời gian ưu đãi:"}
                </span>{" "}
                còn {daysLeft} ngày {demoMode ? "trên trình duyệt này" : "trên tài khoản này"}.
              </span>
              <Button size="sm" variant="ghost" className="ml-auto shrink-0 text-[color:var(--color-warning-fg)] hover:bg-[color:var(--color-warning-bg)]" onClick={() => navigate("/billing/plan")}>
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

      {!isSignedOut && (
        <div className="stack-section">
          <div data-testid="dashboard-primary-action-card" data-tour-id="dashboard-next-card">
            <PrimaryActionCard
              data-testid="dashboard-next-action-hero"
              hero
              titleAs="h2"
              density="compact"
              eyebrow={dashboardNextAction.eyebrow}
              title={dashboardNextAction.title}
              description={dashboardNextAction.description}
              icon={<CalendarDays className="h-4 w-4" />}
              headerClassName="relative z-10"
              actionClassName="relative z-10"
              action={
                <Button
                  variant="outline"
                  className="w-full border-slate-950 bg-slate-950 hover:bg-slate-800 sm:w-auto"
                  style={{ color: "#fff" }}
                  onClick={() => navigate(dashboardNextAction.ctaTarget)}
                >
                  {dashboardNextAction.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              }
            >
              <div className="stack-stack">
                {activeSystem && activeSystemTodayOpenTasks.length > 0 && (
                  <div data-tour-id="dashboard-start-card" className="rounded-[var(--r-tile)] bg-white/88 p-4 ring-1 ring-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-tile)] bg-foreground text-white">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                          Việc quan trọng nhất hôm nay
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-base font-bold text-foreground">
                          {activeSystemTodayOpenTasks[0].title}
                        </h3>
                        <p className="mt-2 text-sm font-medium leading-6 text-[color:var(--color-success-fg)]">
                          Chỉ cần xong việc này là hôm nay đã đủ. Phần còn lại mở sau.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="hidden flex-col gap-3 border-t border-border pt-4 text-sm sm:flex sm:flex-row sm:flex-wrap sm:items-center">
                  <span className="font-semibold text-foreground">Tầm nhìn 3 năm</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-border bg-white text-foreground hover:bg-muted sm:w-auto"
                    onClick={() => navigate("/vision")}
                  >
                    {aspirationalVision ? "Sửa tầm nhìn 3 năm" : "Hình dung tầm nhìn 3 năm"}
                  </Button>
                  <span
                    data-tour-id="dashboard-plan-card"
                    className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    <Crown className="h-3.5 w-3.5" />
                    {getPlanLabel(currentPlanCode)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground hover:bg-muted sm:w-auto"
                    onClick={() => (currentPlanCode === "FREE" ? openUpgradeDialog("plan", "PLUS") : navigate(planTarget))}
                  >
                    {currentPlanCode === "FREE" ? "Khám phá Plus" : "Quản lý gói"}
                  </Button>
                </div>
              </div>
            </PrimaryActionCard>
          </div>

          {shouldShowSetupGuide && <NewUserGuideBanner userData={userData} variant="compact" />}

          <SectionBlock
            title="Nhịp 12 tuần"
            description={isDesktopViewport ? "Bốn tín hiệu đủ để biết cycle đang chạy gọn hay cần chỉnh." : undefined}
          >
            <DashboardKpiRow
              leadAverage={dashboardKpiLeadAverage}
              currentWeek={dashboardKpiCurrentWeek}
              totalWeeks={dashboardKpiTotalWeeks}
              streak={dashboardKpiStreak}
              wheelScore={averageLifeScore}
            />
          </SectionBlock>

          <SectionBlock
            title="Mục tiêu đang chạy"
            description={isDesktopViewport ? "Chuẩn bị slot 1-3 mục tiêu cho cùng một cycle." : undefined}
          >
            <DashboardActiveGoalsList
              goals={dashboardActiveGoals}
              onSelectGoal={(goal) => navigate(goal.twelveWeekSystem ? "/12-week-system" : "/goals")}
              onAddGoal={() => navigate("/life-insight")}
            />
          </SectionBlock>

          {isMobileViewport && topTrigger ? (
            <SectionBlock
              title="Cảnh báo tuần này"
              density="compact"
              collapsible
              defaultOpen={false}
            >
              <div className="rounded-[var(--r-tile)] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] px-4 py-3 text-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-warning-fg)]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[color:var(--color-warning-fg)]">{topTrigger.headline}</p>
                    <p className="mt-1 text-xs leading-5 text-[color:var(--color-warning-fg)]">{topTrigger.detail}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-slate-950 text-white hover:bg-slate-800"
                    onClick={() => {
                      trackRescueActionTaken({
                        kind: topTrigger.kind,
                        action: topTrigger.kind === "trial_ending" ? "upgrade" : "navigate_system",
                        currentPlan: currentPlanCode,
                      });
                      navigate(topTrigger.kind === "trial_ending" ? "/billing/plan" : "/12-week-system");
                    }}
                  >
                    {topTrigger.kind === "trial_ending" ? "Mở Plus" : "Xem ngay"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[color:var(--color-warning-fg)] hover:bg-[color:var(--color-warning-bg)]"
                    onClick={() => {
                      dismissRescueTrigger(topTrigger.kind);
                      trackRescueTriggerDismissed({ kind: topTrigger.kind, currentPlan: currentPlanCode });
                      setDismissedTrigger(topTrigger.kind);
                    }}
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            </SectionBlock>
          ) : null}

          {!activeSystem ? (
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
            <SectionBlock
              key={isDesktopViewport ? "dashboard-week-summary-desktop" : "dashboard-week-summary-mobile"}
              title="Tóm tắt tuần này"
              density="compact"
              collapsible={isMobileViewport}
              defaultOpen={isDesktopViewport}
            >
              <Card data-testid="dashboard-main-card" className="border border-border bg-white/92 shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="grid gap-[var(--space-stack)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="stack-tight">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {dashboardGoalTitle}
                      </p>
                      <h3 className="text-xl font-bold text-foreground">
                        {activeSystemTodayOpenTasks.length > 0
                          ? `${activeSystemTodayOpenTasks.length} việc đang mở hôm nay`
                          : "Hôm nay đang khá gọn"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Tuần {activeSystemWeek ?? currentWeekExecutionSnapshot.weekNumber}:{" "}
                        {activeSystemWeekCompletion?.completed ?? currentWeekExecutionSnapshot.completedTasks}/
                        {activeSystemWeekCompletion?.total ?? currentWeekExecutionSnapshot.totalTasks} việc —{" "}
                        {activeSystemWeekCompletion?.percent ?? currentWeekExecutionSnapshot.executionScore}% lead completion
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                      <div className="rounded-[var(--r-tile)] bg-muted px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tiến độ goal</p>
                        <p className="mt-1 text-xl font-bold text-foreground">{goalProgressSnapshot.percent}%</p>
                      </div>
                      <div className="rounded-[var(--r-tile)] bg-muted px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Review</p>
                        <p className="mt-1 text-base font-bold text-foreground">
                          {reviewDueToday ? "Đến hạn hôm nay" : getReviewDayLabel(activeSystem.reviewDay)}
                        </p>
                      </div>
                      <div className="rounded-[var(--r-tile)] bg-muted px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Hôm nay</p>
                        <p className="mt-1 text-xl font-bold text-foreground">{activeSystemTodayCompletedCount}</p>
                        <p className="text-xs text-muted-foreground">việc đã chốt</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <details
                data-testid="dashboard-execution-board"
                className="group rounded-[var(--r-card)] border border-border bg-white/92 p-5 shadow-sm sm:p-6"
                open={!isMobileViewport}
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-end justify-between gap-3 sm:cursor-default">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Bảng thực thi
                    </p>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">Chi tiết nhịp tuần</h2>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">
                      Tuần {activeSystemWeek ?? currentWeekExecutionSnapshot.weekNumber}:{" "}
                      {activeSystemWeekCompletion?.completed ?? currentWeekExecutionSnapshot.completedTasks}/
                      {activeSystemWeekCompletion?.total ?? currentWeekExecutionSnapshot.totalTasks} việc —{" "}
                      {activeSystemWeekCompletion?.percent ?? currentWeekExecutionSnapshot.executionScore}% lead completion
                    </p>
                  </div>
                  <span className="rounded-[var(--r-pill)] border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    Dữ liệu chu kỳ hiện tại
                  </span>
                </summary>
                <div className="mt-[var(--space-stack)] stack-stack">
                  {activeSystemTaskPreview.length > 0 ? (
                    <div className="stack-tight">
                      {activeSystemTaskPreview.map((task, index) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 rounded-[var(--r-tile)] bg-white px-4 py-3 ring-1 ring-slate-200"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-tile)] bg-foreground text-sm font-semibold text-white">
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
                    <p className="rounded-[var(--r-tile)] bg-muted p-4 text-sm text-muted-foreground">
                      Hôm nay không còn việc mở. Nếu còn thời gian, hãy xem lại tuần hoặc chuẩn bị review khi đến hạn.
                    </p>
                  )}

                  {planLoading && !plan && (
                    <Card className="border border-border bg-white/80 shadow-sm">
                      <CardContent className="p-4 text-sm text-muted-foreground">
                        Đang tải dữ liệu dashboard 12 tuần...
                      </CardContent>
                    </Card>
                  )}

                  {planError && (
                    <Card className="border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] shadow-sm">
                      <CardContent className="p-4 text-sm text-[color:var(--color-danger-fg)]">
                        {planError.message}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </details>
            </SectionBlock>
          )}
        </div>
      )}

      {showMobileStickyCTA && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 p-4 backdrop-blur supports-backdrop-blur:bg-white/90 md:hidden">
          <Button variant="secondary" className="w-full shadow-lg" size="lg" onClick={() => navigate("/12-week-system")}>
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Đánh dấu xong - {activeSystemTodayOpenTasks.length} việc
          </Button>
        </div>
      )}

      {/* SECONDARY SECTION: Workspace Details */}
      {shouldShowWorkspaceDetailGrid && (
        <SectionBlock
          key={isDesktopViewport ? "dashboard-workspace-details-desktop" : "dashboard-workspace-details-mobile"}
          title="Dữ liệu gần đây"
          headerVisuallyHidden={isDesktopViewport}
          collapsible={isMobileViewport}
          defaultOpen={isDesktopViewport}
          className="ops-section-secondary"
        >
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

                                <div className="stack-tight">
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
        <SectionBlock
          key={isDesktopViewport ? "dashboard-reflections-desktop" : "dashboard-reflections-mobile"}
          title="Nhật ký gần đây"
          headerVisuallyHidden={isDesktopViewport}
          collapsible={isMobileViewport}
          defaultOpen={isDesktopViewport}
          className="ops-section-secondary"
        >
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

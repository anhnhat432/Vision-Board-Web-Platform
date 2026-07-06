import { Plus, Search, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/app/components/states/EmptyState";
import { SpotlightTour } from "@/app/components/SpotlightTour";
import { UpgradePaywallDialog } from "@/app/components/UpgradePaywallDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Button } from "@/app/components/ui/button";
import { useOptionalAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import { enqueueStoredMutation } from "@/features/plan12week/persistence/mutationQueue";
import { getPlanLink } from "@/features/plan12week/persistence/planLinkStore";
import { getTwelveWeekClientPlanId } from "@/features/plan12week/persistence/twelveWeekImportPayload";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { getBackendGoalId } from "@/lib/api/goalLinkStore";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import { MountainMoonIllustration } from "../components/illustrations";
import { useBackendProgressOverlayMap } from "../hooks/useBackendProgressOverlay";
import { usePageTour } from "../hooks/usePageTour";
import { usePlanEntitlements } from "../hooks/usePlanEntitlements";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { soundService } from "../services/soundService";
import { isRealMode, shouldEnable12WeekGoalTombstoneSync } from "../utils/app-mode";
import { celebrateSpark, celebrateSpotlight } from "../utils/experience";
import { hasReachedLimit } from "../utils/feature-entitlements";
import {
  APP_STORAGE_KEYS,
  calculateGoalProgress,
  clearGoalPlanningDrafts,
  deleteGoal as deleteLocalGoal,
  type Goal,
  getCalendarDayDifference,
  getGoalExecutionStats,
  getUserData,
  recomputeGoalProgressFromWeeks,
  saveUserData,
  toggleTwelveWeekTask,
  type UserData,
  updateGoal,
} from "../utils/storage";
import {
  completedGoalStyle,
  GoalCard,
  GoalFilterChips,
  GoalSummaryStrip,
  GoalTrackerSkeleton,
  GOALTRACKER_TOUR_STEPS,
  TodayFocusCard,
  getTodayFocusGoal,
} from "./GoalTracker/components";

export function GoalTracker() {
  const { userData, reloadUserData } = useSyncedUserData();
  const authContext = useOptionalAuthContext();
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  if (!userData) {
    return <GoalTrackerSkeleton />;
  }

  return (
    <GoalTrackerContent
      userData={userData}
      goalToDelete={goalToDelete}
      setGoalToDelete={setGoalToDelete}
      onReload={reloadUserData}
      canSyncRemoteDelete={isRealMode() && isApiBaseUrlConfigured() && Boolean(authContext?.user)}
    />
  );
}

function GoalTrackerContent({
  userData,
  goalToDelete,
  setGoalToDelete,
  onReload,
  canSyncRemoteDelete,
}: {
  userData: UserData;
  goalToDelete: string | null;
  setGoalToDelete: (value: string | null) => void;
  onReload: () => void;
  canSyncRemoteDelete: boolean;
}) {
  const navigate = useNavigate();
  const { isTourOpen, setIsTourOpen } = usePageTour("goaltracker");
  const autoCloudSync = useOptionalAutoCloudSyncContext();
  const reload = onReload;
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "12week" | "simple" | "dueSoon" | "atRisk" | "completed">(
    "all",
  );
  const [viewUserData, setViewUserData] = useState(userData);
  const [isGoalLimitPaywallOpen, setIsGoalLimitPaywallOpen] = useState(false);
  const [locallyUpdatedSystemGoalIds, setLocallyUpdatedSystemGoalIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setViewUserData(userData);
  }, [userData]);

  useEffect(() => {
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);

  const { currentPlanCode } = usePlanEntitlements(viewUserData);

  const goals = useMemo(
    () =>
      [...viewUserData.goals].sort((left, right) => {
        const leftProgress = calculateGoalProgress(left);
        const rightProgress = calculateGoalProgress(right);
        if ((leftProgress === 100) !== (rightProgress === 100)) {
          return leftProgress === 100 ? 1 : -1;
        }
        const leftDays = getCalendarDayDifference(left.deadline) ?? Number.MAX_SAFE_INTEGER;
        const rightDays = getCalendarDayDifference(right.deadline) ?? Number.MAX_SAFE_INTEGER;
        if (leftDays !== rightDays) return leftDays - rightDays;
        return left.title.localeCompare(right.title, "vi");
      }),
    [viewUserData.goals],
  );

  const backendSystemsByGoalId = useBackendProgressOverlayMap(
    useMemo(
      () =>
        goals
          .filter((goal) => Boolean(goal.twelveWeekSystem))
          .map((goal) => ({
            goalId: goal.id,
            system: goal.twelveWeekSystem,
          })),
      [goals],
    ),
  );

  const effectiveGoals = useMemo(
    () =>
      goals.map((goal) => {
        if (!goal.twelveWeekSystem) return goal;
        if (locallyUpdatedSystemGoalIds.has(goal.id)) return goal;
        const effectiveSystem = backendSystemsByGoalId.get(goal.id);
        if (!effectiveSystem) return goal;
        return { ...goal, twelveWeekSystem: effectiveSystem };
      }),
    [backendSystemsByGoalId, goals, locallyUpdatedSystemGoalIds],
  );

  const goalsWithMetadata = useMemo(() => {
    return effectiveGoals.map((goal) => {
      const progress = calculateGoalProgress(goal);
      const daysLeft = getCalendarDayDifference(goal.deadline);
      const isOverdue = daysLeft !== null && daysLeft < 0 && progress < 100;
      const isNearDeadline = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && progress < 100;
      const stats = getGoalExecutionStats(goal);
      const isAtRisk = isOverdue || stats.reviewDueToday;
      const isCompleted = progress === 100;
      const isTwelveWeek = Boolean(goal.twelveWeekSystem);
      const isSimple = !isTwelveWeek;

      return {
        goal,
        progress,
        daysLeft,
        isOverdue,
        isNearDeadline,
        isAtRisk,
        isCompleted,
        isTwelveWeek,
        isSimple,
      };
    });
  }, [effectiveGoals]);

  const filteredGoalsWithMetadata = useMemo(() => {
    let result = goalsWithMetadata;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        ({ goal }) => goal.title.toLowerCase().includes(q) || goal.description?.toLowerCase().includes(q),
      );
    }

    if (activeFilter === "12week") {
      result = result.filter(({ isTwelveWeek }) => isTwelveWeek);
    } else if (activeFilter === "simple") {
      result = result.filter(({ isSimple }) => isSimple);
    } else if (activeFilter === "dueSoon") {
      result = result.filter(({ isNearDeadline }) => isNearDeadline);
    } else if (activeFilter === "atRisk") {
      result = result.filter(({ isAtRisk }) => isAtRisk);
    } else if (activeFilter === "completed") {
      result = result.filter(({ isCompleted }) => isCompleted);
    }

    return result;
  }, [goalsWithMetadata, searchQuery, activeFilter]);

  const focusGoal = useMemo(() => getTodayFocusGoal(goalsWithMetadata), [goalsWithMetadata]);
  const hasGoals = effectiveGoals.length > 0;
  const hasRealLifeBalance =
    viewUserData.onboardingCompleted && viewUserData.currentWheelOfLife.some((area) => area.score > 0);
  const goalFlowStartHref = hasRealLifeBalance ? "/life-insight" : "/onboarding";

  const displayTwelveWeekGoals = useMemo(
    () => filteredGoalsWithMetadata.filter(({ isTwelveWeek }) => isTwelveWeek).map(({ goal }) => goal),
    [filteredGoalsWithMetadata],
  );

  const displayStandardGoals = useMemo(
    () => filteredGoalsWithMetadata.filter(({ isSimple }) => isSimple).map(({ goal }) => goal),
    [filteredGoalsWithMetadata],
  );

  const openTwelveWeekCenter = (goalId: string) => {
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, goalId);
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, goalId);
    navigate("/12-week-system");
  };

  const handleStartGuidedGoalFlow = () => {
    if (hasReachedLimit(viewUserData, "maxActiveGoals")) {
      setIsGoalLimitPaywallOpen(true);
      return;
    }
    clearGoalPlanningDrafts();
    navigate(goalFlowStartHref);
  };

  const handleStartDirectGoalFlow = () => {
    if (hasReachedLimit(viewUserData, "maxActiveGoals")) {
      setIsGoalLimitPaywallOpen(true);
      return;
    }
    clearGoalPlanningDrafts();
    navigate("/smart-goal-setup");
  };

  const handleToggleTask = (goalId: string, taskId: string) => {
    const goal = viewUserData.goals.find((item) => item.id === goalId);
    if (!goal) return;

    if (goal.twelveWeekSystem) {
      const task = goal.twelveWeekSystem.taskInstances.find((item) => item.id === taskId);
      if (!task) return;

      const previousProgress = calculateGoalProgress(goal);
      const nextCompleted = !task.completed;
      const now = Date.now();
      const previousViewUserData = viewUserData;
      const nextSystem = {
        ...goal.twelveWeekSystem,
        taskInstances: goal.twelveWeekSystem.taskInstances.map((item) =>
          item.id === taskId
            ? {
                ...item,
                completed: nextCompleted,
                completedAt: nextCompleted ? new Date(now).toISOString() : undefined,
                lastModifiedAt: now,
              }
            : item,
        ),
      };

      setLocallyUpdatedSystemGoalIds((current) => new Set(current).add(goalId));
      setViewUserData((current) => ({
        ...current,
        goals: current.goals.map((item) =>
          item.id === goalId ? { ...item, twelveWeekSystem: nextSystem } : item,
        ),
      }));

      try {
        if (!toggleTwelveWeekTask(goalId, taskId, nextCompleted, now)) {
          throw new Error("Unable to toggle 12-week task");
        }
      } catch {
        setViewUserData(previousViewUserData);
        toast.error("Không thể cập nhật, vui lòng thử lại");
        return;
      }

      const afterData = getUserData();
      setViewUserData(afterData);
      const refreshedProgress = recomputeGoalProgressFromWeeks(goalId) ?? previousProgress;
      const justCompletedGoal = previousProgress < 100 && refreshedProgress === 100;

      if (nextCompleted) {
        if (justCompletedGoal) {
          celebrateSpotlight({ x: 0.82, y: 0.14 });
          soundService.success();
        } else {
          celebrateSpark({ x: 0.82, y: 0.14 });
          soundService.click();
        }
        toast.success(justCompletedGoal ? "Mục tiêu vừa chạm mốc 100%." : "Đã chốt thêm một bước nhỏ.");
      }

      return;
    }

    const previousProgress = calculateGoalProgress(goal);
    const taskWasCompleted = Boolean(goal.tasks.find((task) => task.id === taskId)?.completed);
    const nextCompleted = !taskWasCompleted;
    const now = Date.now();
    const previousViewUserData = viewUserData;
    const nextTasks = goal.tasks.map((task) =>
      task.id === taskId ? { ...task, completed: nextCompleted, lastModifiedAt: now } : task,
    );

    setViewUserData((current) => ({
      ...current,
      goals: current.goals.map((item) => (item.id === goalId ? { ...item, tasks: nextTasks } : item)),
    }));

    try {
      const latestGoal = getUserData().goals.find((item) => item.id === goalId) ?? goal;
      updateGoal(goalId, {
        tailwindClass: "update-goal",
        tasks: latestGoal.tasks.map((task) =>
          task.id === taskId ? { ...task, completed: nextCompleted, lastModifiedAt: now } : task,
        ),
      } as Partial<Goal>);
    } catch {
      setViewUserData(previousViewUserData);
      toast.error("Không thể cập nhật, vui lòng thử lại");
      return;
    }

    const afterData = getUserData();
    const refreshedGoal = afterData.goals.find((item) => item.id === goalId);
    const refreshedProgress = refreshedGoal ? calculateGoalProgress(refreshedGoal) : previousProgress;
    const justCompletedGoal = previousProgress < 100 && refreshedProgress === 100;

    if (!taskWasCompleted) {
      if (justCompletedGoal) {
        celebrateSpotlight({ x: 0.82, y: 0.14 });
        soundService.success();
      } else {
        celebrateSpark({ x: 0.82, y: 0.14 });
        soundService.click();
      }
      toast.success(justCompletedGoal ? "Mục tiêu vừa chạm mốc 100%." : "Đã chốt thêm một bước nhỏ.");
    }

    reload();
  };

  const handleConfirmDeleteGoal = () => {
    if (!goalToDelete) return;
    const deletedGoalId = goalToDelete;
    const snapshot = getUserData();
    const backendGoalId = getBackendGoalId(deletedGoalId);
    const backendPlanId = getPlanLink(deletedGoalId)?.planId ?? null;
    const clientPlanId = getTwelveWeekClientPlanId(deletedGoalId);
    const shouldQueueRemoteDelete =
      canSyncRemoteDelete && shouldEnable12WeekGoalTombstoneSync() && Boolean(backendPlanId || backendGoalId);

    deleteLocalGoal(deletedGoalId);
    setViewUserData((current) => ({
      ...current,
      goals: current.goals.filter((goal) => goal.id !== deletedGoalId),
    }));
    setGoalToDelete(null);
    reload();

    if (shouldQueueRemoteDelete) {
      const deletedAt = new Date().toISOString();
      if (backendGoalId) {
        enqueueStoredMutation({
          kind: "goal_deleted",
          goalId: deletedGoalId,
          planId: clientPlanId,
          payload: {
            clientGoalId: deletedGoalId,
            backendGoalId,
            backendPlanId: backendPlanId ?? undefined,
            deletedAt,
          },
        });
      }
      if (backendPlanId) {
        enqueueStoredMutation({
          kind: "plan_deleted",
          goalId: deletedGoalId,
          planId: clientPlanId,
          payload: {
            clientPlanId,
            backendPlanId,
            clientGoalId: deletedGoalId,
            deletedAt,
          },
        });
      }
      void autoCloudSync?.triggerDrainOnly();
      toast.success("Mục tiêu đã được xóa.");
      return;
    }

    toast.success("Mục tiêu đã được xóa.", {
      action: {
        label: "Hoàn tác",
        onClick: () => {
          saveUserData(snapshot);
          setViewUserData(snapshot);
          reload();
          toast.info("Đã khôi phục mục tiêu.");
        },
      },
    });
  };

  const summary = useMemo(() => {
    const totalGoals = effectiveGoals.length;
    const completedGoals = effectiveGoals.filter((goal) => calculateGoalProgress(goal) === 100).length;
    const completedTasks = effectiveGoals.reduce((sum, goal) => sum + getGoalExecutionStats(goal).completed, 0);
    const totalTasks = effectiveGoals.reduce((sum, goal) => sum + getGoalExecutionStats(goal).total, 0);
    const activeSystems = effectiveGoals.filter((goal) => Boolean(goal.twelveWeekSystem)).length;

    const dueSoon = effectiveGoals.filter((goal) => {
      const daysLeft = getCalendarDayDifference(goal.deadline);
      return calculateGoalProgress(goal) < 100 && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
    }).length;

    const overdue = effectiveGoals.filter((goal) => {
      const daysLeft = getCalendarDayDifference(goal.deadline);
      return calculateGoalProgress(goal) < 100 && daysLeft !== null && daysLeft < 0;
    }).length;

    const reviewDue = effectiveGoals.filter((goal) => getGoalExecutionStats(goal).reviewDueToday).length;

    return {
      totalGoals,
      completedGoals,
      completedTasks,
      totalTasks,
      activeSystems,
      dueSoon,
      overdue,
      reviewDue,
      needsAttention: dueSoon + overdue + reviewDue,
    };
  }, [effectiveGoals]);

  const filterCounts = useMemo(() => {
    return {
      all: goalsWithMetadata.length,
      twelveWeek: goalsWithMetadata.filter(({ isTwelveWeek }) => isTwelveWeek).length,
      simple: goalsWithMetadata.filter(({ isSimple }) => isSimple).length,
      dueSoon: goalsWithMetadata.filter(({ isNearDeadline }) => isNearDeadline).length,
      atRisk: goalsWithMetadata.filter(({ isAtRisk }) => isAtRisk).length,
      completed: goalsWithMetadata.filter(({ isCompleted }) => isCompleted).length,
    };
  }, [goalsWithMetadata]);

  return (
    <div className="mx-auto max-w-[1100px] px-[26px] pt-[26px] pb-[64px] sm:px-[36px]">
      <style>{completedGoalStyle}</style>
      <UpgradePaywallDialog
        open={isGoalLimitPaywallOpen}
        onOpenChange={setIsGoalLimitPaywallOpen}
        context="plan"
        currentPlan={currentPlanCode}
        title="Bạn đã có 3 mục tiêu"
        description="Nâng cấp Plus để tạo thêm mục tiêu. Dữ liệu hiện có vẫn được giữ nguyên."
        source="goal_tracker"
      />
      <AlertDialog
        open={Boolean(goalToDelete)}
        onOpenChange={(open) => {
          if (!open) setGoalToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa mục tiêu này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Mục tiêu và toàn bộ việc liên quan sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteGoal}
              className="bg-app-status-error hover:bg-app-status-error/90 text-white"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-5 sm:space-y-6">
        {/* HERO */}
        <section
          data-tour-id="goaltracker-hero"
          className="relative grid overflow-hidden rounded-[var(--app-radius-card-lg)] border border-app-line/70 bg-app-surface shadow-[var(--app-shadow-card)] lg:grid-cols-[minmax(0,1fr)_280px] dark:border-app-line/70 dark:bg-app-surface"
        >
          <div className="min-w-0 px-6 py-7 sm:px-8 sm:py-8 lg:px-9 lg:py-9">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-app-accent/15 bg-app-accent-soft/45 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-app-accent" />
              Core loop
            </div>
            <h1 className="max-w-[11ch] font-serif text-[clamp(30px,4vw,46px)] font-extrabold leading-[0.98] tracking-[-0.035em] text-app-ink sm:max-w-none">
              Hành trình mục tiêu
            </h1>
            <p className="mt-4 max-w-[54ch] text-[14px] leading-[1.7] text-app-ink-soft sm:text-[15px]">
              Chọn đúng việc, giữ nhịp tuần và biến mục tiêu lớn thành tiến triển nhìn thấy được mỗi ngày.
            </p>
            <div className="mt-6 flex flex-col flex-wrap gap-2.5 sm:flex-row">
              <Button
                className="inline-flex h-auto items-center justify-center gap-[9px] rounded-full bg-app-accent px-5 py-3 text-[13.5px] font-bold text-white shadow-[var(--app-shadow-sm)] transition-all duration-200 hover:bg-app-accent-hover sm:w-auto"
                onClick={handleStartGuidedGoalFlow}
              >
                <Zap className="h-4 w-4" />
                Bắt đầu chu kỳ 12 tuần
              </Button>
              <Button
                variant="outline"
                className="inline-flex h-auto items-center justify-center gap-2 rounded-full border border-app-line bg-app-surface px-5 py-3 text-[13.5px] font-semibold text-app-ink shadow-none transition-all duration-200 hover:bg-app-bg sm:w-auto dark:border-app-line dark:bg-app-surface"
                onClick={handleStartDirectGoalFlow}
              >
                <Plus className="h-4 w-4" />
                Tạo nhanh mục tiêu
              </Button>
            </div>
          </div>
          <div className="relative min-h-[210px] border-t border-app-line/60 bg-app-bg-subtle lg:min-h-full lg:border-l lg:border-t-0">
            <img
              src="/vision_board_detail.png"
              alt="Bản đồ tầm nhìn và mục tiêu"
              className="absolute inset-0 h-full w-full object-cover opacity-90 saturate-[0.92] dark:brightness-[0.82] dark:contrast-[1.05]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-app-surface/15 via-transparent to-app-accent/10" />
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/35 bg-app-surface/88 p-4 shadow-[0_18px_46px_-32px_rgba(23,21,15,0.55)] backdrop-blur-md dark:border-app-line/60 dark:bg-app-surface/90">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-app-accent">Nhịp hôm nay</p>
              <p className="mt-1 text-sm font-semibold leading-snug text-app-ink">
                {summary.completedTasks}/{summary.totalTasks || 0} việc đã chốt · {summary.activeSystems} chu kỳ đang chạy
              </p>
            </div>
          </div>
        </section>

        {/* KPI Row */}
        <GoalSummaryStrip
          totalGoals={summary.totalGoals}
          completedGoals={summary.completedGoals}
          completedTasks={summary.completedTasks}
          totalTasks={summary.totalTasks}
          activeSystems={summary.activeSystems}
          needsAttention={summary.needsAttention}
        />

        {/* Tiêu điểm hôm nay */}
        <TodayFocusCard
          focusData={focusGoal}
          openTwelveWeekCenter={openTwelveWeekCenter}
          handleToggleTask={handleToggleTask}
          onStartGuidedGoalFlow={handleStartGuidedGoalFlow}
        />

        {/* Search + Filter */}
        <div className="flex flex-col gap-3.5">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
            <input
              type="search"
              aria-label="Tìm kiếm mục tiêu"
              placeholder="Tìm theo tên hoặc mô tả mục tiêu…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-[46px] w-full rounded-[13px] border border-app-line bg-app-surface pl-11 pr-4 text-[13.5px] text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent transition-all duration-200"
            />
          </div>

          <GoalFilterChips activeFilter={activeFilter} setActiveFilter={setActiveFilter} counts={filterCounts} />
        </div>

        {/* Danh sách mục tiêu */}
        <div data-tour-id="goaltracker-goals" className="space-y-6">
          {!hasGoals ? (
            <EmptyState
              variant="card"
              illustration={<MountainMoonIllustration className="w-full text-app-ink-muted" />}
              title="Chưa có mục tiêu"
              description="Bắt đầu bằng chu kỳ 12 tuần đầu tiên để biến một mục tiêu quan trọng thành hành động cụ thể."
              actions={
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Button
                    className="bg-app-accent text-white hover:bg-app-accent-hover font-bold shadow-[var(--app-shadow-sm)] hover:scale-[1.01] transition-all px-6 py-2.5 rounded-lg text-sm"
                    onClick={handleStartGuidedGoalFlow}
                  >
                    Bắt đầu chu kỳ 12 tuần
                  </Button>
                  <Button
                    variant="outline"
                    className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg px-6 py-2.5 rounded-lg font-bold text-sm"
                    onClick={handleStartDirectGoalFlow}
                  >
                    Tạo mục tiêu thường
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="space-y-6">
              {displayTwelveWeekGoals.length > 0 && (
                <div className="space-y-4">
                  <div className="mx-1 mb-1 mt-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted mb-1">
                          Chu kỳ 12 tuần
                        </p>
                        <h2 className="font-serif text-[20px] font-bold tracking-normal text-app-ink">
                          Mục tiêu đang chạy
                        </h2>
                        <p className="mt-0.5 text-[12.5px] text-app-ink-muted">
                          {displayTwelveWeekGoals.length} mục tiêu
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {displayTwelveWeekGoals.map((goal) => {
                      const meta = goalsWithMetadata.find((m) => m.goal.id === goal.id);
                      return (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          currentPlanCode={currentPlanCode}
                          progress={meta?.progress ?? 0}
                          isOverdue={meta?.isOverdue ?? false}
                          isNearDeadline={meta?.isNearDeadline ?? false}
                          handleToggleTask={handleToggleTask}
                          openTwelveWeekCenter={openTwelveWeekCenter}
                          setGoalToDelete={setGoalToDelete}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {displayStandardGoals.length > 0 && (
                <div className="space-y-4">
                  <div className="mx-1 mb-1 mt-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <h2 className="font-serif text-[20px] font-bold tracking-normal text-app-ink">
                          Mục tiêu thường
                        </h2>
                        <p className="mt-0.5 text-[12.5px] text-app-ink-muted">{displayStandardGoals.length} mục tiêu</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {displayStandardGoals.map((goal) => {
                      const meta = goalsWithMetadata.find((m) => m.goal.id === goal.id);
                      return (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          currentPlanCode={currentPlanCode}
                          progress={meta?.progress ?? 0}
                          isOverdue={meta?.isOverdue ?? false}
                          isNearDeadline={meta?.isNearDeadline ?? false}
                          handleToggleTask={handleToggleTask}
                          openTwelveWeekCenter={openTwelveWeekCenter}
                          setGoalToDelete={setGoalToDelete}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredGoalsWithMetadata.length === 0 && (
                <EmptyState
                  variant="dashed"
                  title="Không tìm thấy mục tiêu"
                  description={
                    searchQuery.trim()
                      ? `Không tìm thấy mục tiêu nào khớp với "${searchQuery}"`
                      : "Không tìm thấy mục tiêu nào phù hợp với bộ lọc hiện tại."
                  }
                  actions={
                    <Button
                      variant="outline"
                      className="mt-2 border-app-line bg-app-surface text-app-accent hover:bg-app-accent-soft font-bold rounded-lg px-4 py-2 text-sm"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveFilter("all");
                      }}
                    >
                      Xóa tìm kiếm & bộ lọc
                    </Button>
                  }
                />
              )}
            </div>
          )}
        </div>
      </div>
      <SpotlightTour
        open={isTourOpen}
        onOpenChange={setIsTourOpen}
        title="Tour Mục tiêu"
        description="Ba điểm quan trọng để bạn biết nên tạo, theo dõi và xử lý mục tiêu ở đâu."
        steps={GOALTRACKER_TOUR_STEPS}
      />
    </div>
  );
}

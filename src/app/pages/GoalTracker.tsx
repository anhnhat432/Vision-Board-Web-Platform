import { AlertTriangle, ArrowRight, CheckCircle2, Circle, Plus, Search, Target, Trash2, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/app/components/states/EmptyState";
import { useOptionalAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import { enqueueStoredMutation } from "@/features/plan12week/persistence/mutationQueue";
import { getPlanLink } from "@/features/plan12week/persistence/planLinkStore";
import { getTwelveWeekClientPlanId } from "@/features/plan12week/persistence/twelveWeekImportPayload";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { getBackendGoalId } from "@/lib/api/goalLinkStore";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import { getGoalArchetypeIcon, MountainMoonIllustration } from "../components/illustrations";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { CountUp } from "../components/ui/count-up";
import { Skeleton } from "../components/ui/skeleton";
import { SpotlightCard } from "../components/ui/spotlight-card";
import { cn } from "../components/ui/utils";
import { useBackendProgressOverlayMap } from "../hooks/useBackendProgressOverlay";
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
  getLifeAreaLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTodayTasks,
  getUserData,
  recomputeGoalProgressFromWeeks,
  saveUserData,
  toggleTwelveWeekTask,
  type UserData,
  updateGoal,
  type PricingPlanCode,
} from "../utils/storage";
import { getPlanLabel } from "../utils/twelve-week-premium";

const CATEGORY_STYLES: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    bar: string;
  }
> = {
  default: {
    bg: "bg-app-accent-soft text-app-accent",
    text: "text-app-accent",
    border: "border-app-accent/15",
    bar: "from-app-accent/80 to-app-accent",
  },
};

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
  const autoCloudSync = useOptionalAutoCloudSyncContext();
  const reload = onReload;
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<'all' | '12week' | 'simple' | 'dueSoon' | 'atRisk' | 'completed'>('all');
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

        return {
          ...goal,
          twelveWeekSystem: effectiveSystem,
        };
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

    // Lọc theo tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        ({ goal }) =>
          goal.title.toLowerCase().includes(q) ||
          goal.description?.toLowerCase().includes(q),
      );
    }

    // Lọc theo filter chip
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
          item.id === goalId
            ? {
                ...item,
                twelveWeekSystem: nextSystem,
              }
            : item,
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

  const todayUncompletedTasks = useMemo(() => {
    const list: Array<{
      goalId: string;
      goalTitle: string;
      taskId: string;
      title: string;
      completed: boolean;
    }> = [];
    for (const { goal, isTwelveWeek } of goalsWithMetadata) {
      if (isTwelveWeek && goal.twelveWeekSystem) {
        const todayTasks = getTwelveWeekTodayTasks(goal.twelveWeekSystem);
        for (const task of todayTasks) {
          if (!task.completed) {
            list.push({
              goalId: goal.id,
              goalTitle: goal.title,
              taskId: task.id,
              title: task.title,
              completed: task.completed,
            });
          }
        }
      }
    }
    return list.slice(0, 4);
  }, [goalsWithMetadata]);

  const needsReviewGoals = useMemo(() => {
    return goalsWithMetadata
      .filter(({ goal }) => getGoalExecutionStats(goal).reviewDueToday)
      .map(({ goal }) => goal);
  }, [goalsWithMetadata]);

  const atRiskGoals = useMemo(() => {
    return goalsWithMetadata
      .filter(({ isOverdue }) => isOverdue)
      .map(({ goal }) => goal);
  }, [goalsWithMetadata]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 lg:px-8">
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

      {/* Grid Layout 2 Cột trên Desktop, 1 Cột trên Mobile */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:gap-8">
        {/* Cột chính bên trái */}
        <div className="space-y-6">
          {/* Hero Section gọn gàng */}
          <div
            data-tour-id="goaltracker-hero"
            className="rounded-[18px] border border-app-line bg-white dark:bg-neutral-950 p-6 relative overflow-hidden shadow-app-sm"
          >
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center relative z-10">
              <div className="space-y-2">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-app-accent flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-app-accent"></span>
                  </span>
                  MỤC TIÊU
                </p>
                <h1 className="font-serif text-3xl font-medium leading-tight tracking-normal text-app-ink sm:text-4xl">
                  Hành trình mục tiêu
                </h1>
                <p className="text-xs sm:text-sm leading-relaxed text-app-ink-soft max-w-xl font-sans">
                  Tập trung vào những gì cốt lõi nhất. Chia nhỏ mục tiêu lớn thành các chu kỳ 12 tuần để hành động đều đặn.
                </p>
              </div>

              {/* CTAs ở Hero section */}
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
                <Button
                  className="bg-app-accent text-white rounded-lg px-4 py-2.5 text-xs sm:text-sm font-bold hover:bg-app-accent-hover transition-all duration-200 shadow-app-sm hover:shadow-app-md hover:scale-[1.02] inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                  onClick={handleStartGuidedGoalFlow}
                  disabled={hasReachedLimit(viewUserData, "maxActiveGoals")}
                >
                  <Zap className="h-4 w-4" />
                  Bắt đầu chu kỳ 12 tuần
                </Button>
                <Button
                  variant="outline"
                  className="rounded-lg border border-app-line bg-app-surface text-app-ink hover:bg-app-bg px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 shadow-app-sm hover:shadow-app-md hover:scale-[1.02] inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                  onClick={handleStartGuidedGoalFlow}
                  disabled={hasReachedLimit(viewUserData, "maxActiveGoals")}
                >
                  <Plus className="h-4 w-4" />
                  Tạo mục tiêu thường
                </Button>
              </div>
            </div>
          </div>

          {/* Focus Strip đặt ngang */}
          <GoalSummaryStrip
            totalGoals={summary.totalGoals}
            completedGoals={summary.completedGoals}
            completedTasks={summary.completedTasks}
            totalTasks={summary.totalTasks}
            activeSystems={summary.activeSystems}
            needsAttention={summary.needsAttention}
          />

          {/* Search + Filter Strip */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
              {/* Search Input */}
              <div className="relative w-full md:w-80 shadow-app-sm rounded-lg">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
                <input
                  type="search"
                  placeholder="Tìm theo tên hoặc mô tả..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-app-line bg-app-surface pl-10 pr-3.5 py-2.5 text-sm text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/30 focus:border-app-accent transition-all duration-200"
                />
              </div>

              {/* Filter Chips */}
              <GoalFilterChips
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                counts={filterCounts}
              />
            </div>
          </div>

          {/* Danh sách mục tiêu / Trạng thái trống */}
          <div data-tour-id="goaltracker-goals" className="space-y-6">
            {!hasGoals ? (
              <EmptyState
                variant="card"
                illustration={<MountainMoonIllustration className="w-full text-app-ink-muted" />}
                title="Chưa có mục tiêu"
                description="Bắt đầu bằng chu kỳ 12 tuần đầu tiên — hoặc tạo mục tiêu thường nếu bạn chưa sẵn sàng."
                actions={
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <Button
                      className="bg-app-accent text-white hover:bg-app-accent-hover font-bold shadow-app-sm hover:scale-[1.02] transition-all px-6 py-2.5 rounded-lg"
                      onClick={handleStartGuidedGoalFlow}
                    >
                      Bắt đầu chu kỳ 12 tuần →
                    </Button>
                    <Button
                      variant="outline"
                      className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg px-6 py-2.5 rounded-lg font-bold"
                      onClick={handleStartGuidedGoalFlow}
                    >
                      Tạo mục tiêu thường
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="space-y-8">
                {displayTwelveWeekGoals.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-baseline justify-between border-b border-app-line/50 pb-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                          CHU KỲ 12 TUẦN
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-normal text-app-ink">
                          Mục tiêu đang chạy
                        </h2>
                        <p className="mt-1 text-xs text-app-ink-muted font-semibold">
                          {displayTwelveWeekGoals.length} mục tiêu
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
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
                    <div className="flex items-baseline justify-between border-b border-app-line/50 pb-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                          MỤC TIÊU THƯỜNG
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-normal text-app-ink">
                          {displayStandardGoals.length} mục tiêu thường
                        </h2>
                      </div>
                    </div>
                    <div className="space-y-4">
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
                        className="mt-2 border-app-line bg-app-surface text-app-accent hover:bg-app-accent-soft font-bold rounded-lg px-4 py-2"
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

        {/* Sidebar bên phải (Các Widget hành động) */}
        <GoalsSidebar
          todayUncompletedTasks={todayUncompletedTasks}
          needsReviewGoals={needsReviewGoals}
          atRiskGoals={atRiskGoals}
          handleToggleTask={handleToggleTask}
          openTwelveWeekCenter={openTwelveWeekCenter}
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// COMPONENTS PHỤ CHO TRANG GOAL TRACKER
// -------------------------------------------------------------

interface GoalSummaryStripProps {
  totalGoals: number;
  completedGoals: number;
  completedTasks: number;
  totalTasks: number;
  activeSystems: number;
  needsAttention: number;
}

function GoalSummaryStrip({
  totalGoals,
  completedGoals,
  completedTasks,
  totalTasks,
  activeSystems,
  needsAttention,
}: GoalSummaryStripProps) {
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const items = [
    {
      title: "Mục tiêu hoạt động",
      value: totalGoals,
      note: `${completedGoals} đã hoàn thành`,
      icon: Target,
      colorClass: "text-app-accent bg-app-accent-soft",
    },
    {
      title: "Việc đã chốt",
      value: `${completedTasks}/${totalTasks}`,
      note: `${completionRate}% hoàn thành`,
      icon: CheckCircle2,
      colorClass: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30",
    },
    {
      title: "Chu kỳ 12 tuần",
      value: activeSystems,
      note: "chu kỳ đang chạy",
      icon: Zap,
      colorClass: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30",
    },
    {
      title: "Cần chú ý",
      value: needsAttention,
      note: "quá hạn, sắp hạn, review",
      icon: AlertTriangle,
      colorClass: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-tour-id="goaltracker-summary">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="rounded-[18px] border border-app-line bg-app-surface p-4 flex items-center justify-between gap-3 shadow-app-sm hover:border-app-accent/20 hover:shadow-app-md transition-all duration-300"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-app-ink-soft/85 truncate">
                {item.title}
              </p>
              <p className="mt-1 font-serif text-2xl font-black text-app-ink tabular-nums leading-none">
                {item.value}
              </p>
              <p className="mt-1.5 text-[10px] font-bold text-app-ink-muted truncate">
                {item.note}
              </p>
            </div>
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-app-sm", item.colorClass)}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface GoalFilterChipsProps {
  activeFilter: string;
  setActiveFilter: (filter: 'all' | '12week' | 'simple' | 'dueSoon' | 'atRisk' | 'completed') => void;
  counts: {
    all: number;
    twelveWeek: number;
    simple: number;
    dueSoon: number;
    atRisk: number;
    completed: number;
  };
}

function GoalFilterChips({ activeFilter, setActiveFilter, counts }: GoalFilterChipsProps) {
  const chips = [
    { id: "all", label: "Tất cả", count: counts.all },
    { id: "12week", label: "12 tuần", count: counts.twelveWeek },
    { id: "simple", label: "Mục tiêu thường", count: counts.simple },
    { id: "dueSoon", label: "Sắp đến hạn", count: counts.dueSoon },
    { id: "atRisk", label: "Rủi ro", count: counts.atRisk },
    { id: "completed", label: "Hoàn thành", count: counts.completed },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 no-scrollbar max-w-full">
      {chips.map((chip) => {
        const isActive = activeFilter === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => setActiveFilter(chip.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-full border transition-all duration-200 flex items-center gap-1.5 shadow-app-sm shrink-0",
              isActive
                ? "bg-app-accent text-white border-app-accent"
                : "bg-app-surface text-app-ink-soft border-app-line hover:border-app-accent/30 hover:bg-app-bg",
            )}
          >
            <span>{chip.label}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-extrabold tabular-nums",
              isActive
                ? "bg-white/20 text-white"
                : "bg-app-line text-app-ink-muted",
            )}>
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface GoalCardProps {
  goal: Goal;
  currentPlanCode: PricingPlanCode;
  progress: number;
  isOverdue: boolean;
  isNearDeadline: boolean;
  handleToggleTask: (goalId: string, taskId: string) => void;
  openTwelveWeekCenter: (goalId: string) => void;
  setGoalToDelete: (goalId: string) => void;
}

function GoalCard({
  goal,
  currentPlanCode,
  progress,
  isOverdue,
  isNearDeadline,
  handleToggleTask,
  openTwelveWeekCenter,
  setGoalToDelete,
}: GoalCardProps) {
  const system = goal.twelveWeekSystem;
  const systemCurrentWeek = system ? getTwelveWeekCurrentWeek(system) : null;
  const systemTodayTasks = system ? getTwelveWeekTodayTasks(system) : [];
  const systemTodayOpenTasks = systemTodayTasks.filter((task) => !task.completed);
  const completedTodayCount = systemTodayTasks.filter((t) => t.completed).length;
  const totalTodayCount = systemTodayTasks.length;
  const GoalArchetypeIcon = getGoalArchetypeIcon(system?.goalType ?? goal.category);
  const areaStyle = CATEGORY_STYLES.default;

  return (
    <SpotlightCard
      className={cn(
        "rounded-[18px] border p-5 transition-all duration-300 hover:border-app-accent/30 hover:shadow-app-md bg-app-surface border-app-line relative overflow-hidden",
        progress === 100 && "bg-emerald-50/15 dark:bg-emerald-950/5 border-emerald-500/25 dark:border-emerald-500/15",
      )}
    >
      {/* Nút xóa thùng rác nhỏ ở góc trên bên phải */}
      <button
        type="button"
        className="absolute top-4 right-4 h-8 w-8 rounded-lg text-app-ink-muted hover:text-app-status-error hover:bg-app-status-error/10 transition-colors flex items-center justify-center z-20"
        onClick={() => setGoalToDelete(goal.id)}
        aria-label={`Xóa mục tiêu ${goal.title}`}
      >
        <Trash2 className="h-4.5 w-4.5" />
      </button>

      <div className="grid gap-5 lg:grid-cols-[1fr_1px_240px]">
        {/* Cột trái: Goal Info */}
        <div className="space-y-4 pr-2">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 rounded-xl items-center justify-center shadow-app-sm mt-0.5",
                areaStyle.bg,
                areaStyle.text,
              )}
            >
              <GoalArchetypeIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="font-serif text-lg font-bold text-app-ink leading-snug break-words pr-8">
                {goal.title}
              </h3>
              <p className="text-xs text-app-ink-soft font-semibold">
                {system ? `Tuần ${systemCurrentWeek ?? "-"}/12` : "Mục tiêu thường"} ·{" "}
                <span className={cn("font-bold", areaStyle.text)}>{getLifeAreaLabel(goal.category)}</span>
              </p>
            </div>
          </div>

          {/* Description */}
          {goal.description && (
            <p className="text-xs text-app-ink-soft leading-relaxed line-clamp-2">
              {goal.description}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            <span
              className={cn(
                "border text-[10px] font-bold rounded-full px-2.5 py-0.5 inline-flex items-center gap-1 shadow-app-sm",
                areaStyle.bg,
                areaStyle.border,
                areaStyle.text,
              )}
            >
              {getLifeAreaLabel(goal.category)}
            </span>
            {isNearDeadline && (
              <span className="bg-app-warm-soft border border-app-warm-border text-app-warm text-[10px] font-bold rounded-full px-2.5 py-0.5 shadow-app-sm">
                Sắp đến hạn
              </span>
            )}
            {isOverdue && (
              <span className="bg-app-status-error/10 text-app-status-error border border-app-status-error/20 text-[10px] font-bold rounded-full px-2.5 py-0.5 shadow-app-sm">
                Quá hạn
              </span>
            )}
            {system && (
              <span className="bg-app-bg border border-app-line text-app-ink-soft text-[10px] font-bold rounded-full px-2.5 py-0.5 shadow-app-sm">
                {getPlanLabel(currentPlanCode)}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-app-ink-soft">Tiến độ</span>
              <span className={cn("tabular-nums text-xs", areaStyle.text)}>
                <CountUp value={progress} suffix="%" />
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden" aria-hidden="true">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out",
                  areaStyle.bar,
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Action chính */}
          {system && (
            <div className="pt-1">
              <Button
                type="button"
                className="rounded-lg bg-app-accent text-white hover:bg-app-accent-hover px-4 py-1.5 text-xs font-bold shadow-app-sm transition-all duration-200 inline-flex items-center gap-1.5"
                onClick={() => openTwelveWeekCenter(goal.id)}
              >
                Tiếp tục chu kỳ
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Divider dọc */}
        <div className="hidden lg:block w-px bg-app-line/60 my-1" aria-hidden="true" />

        {/* Cột phải: Tasks hôm nay */}
        <div className="lg:pl-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-app-line/50 pb-1.5 mb-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-app-ink-muted">
                VIỆC HÔM NAY
              </p>
              {system && (
                <span className="text-[10px] font-black tabular-nums text-app-accent">
                  {completedTodayCount}/{totalTodayCount}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {systemTodayOpenTasks.slice(0, 2).map((task) => (
                <div
                  key={task.id}
                  className="group/task flex items-center gap-2.5 rounded-lg border border-app-line/40 bg-app-bg-subtle/30 px-2.5 py-1.5 hover:border-app-accent/20 hover:bg-app-accent-subtle/20 transition-all duration-300"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTask(goal.id, task.id)}
                    className="flex size-4 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface text-white transition-all duration-200 hover:border-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                    aria-label={task.completed ? "Hủy chốt việc" : "Chốt việc"}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="size-4 text-app-accent shrink-0" />
                    ) : (
                      <Circle className="size-3 text-app-ink-muted hover:text-app-accent shrink-0" />
                    )}
                  </button>
                  <span
                    className={cn(
                      "text-xs font-semibold truncate transition-all duration-200",
                      task.completed ? "line-through text-app-ink-muted opacity-70" : "text-app-ink",
                    )}
                  >
                    {task.title}
                  </span>
                </div>
              ))}

              {systemTodayOpenTasks.length === 0 && (
                <p className="text-xs italic leading-relaxed text-app-ink-muted/80 mt-1">
                  Không còn việc chưa chốt hôm nay.
                </p>
              )}
            </div>
          </div>

          {system && (
            <button
              type="button"
              className="group/more mt-2.5 text-app-accent text-xs font-bold hover:text-app-accent-hover transition-colors duration-150 inline-flex items-center gap-0.5 self-start"
              onClick={() => openTwelveWeekCenter(goal.id)}
            >
              <span>Xem toàn bộ</span>
              <ArrowRight className="h-3 w-3 transform transition-transform duration-200 group-hover/more:translate-x-0.5" />
            </button>
          )}
        </div>
      </div>
    </SpotlightCard>
  );
}

interface GoalsSidebarProps {
  todayUncompletedTasks: Array<{
    goalId: string;
    goalTitle: string;
    taskId: string;
    title: string;
    completed: boolean;
  }>;
  needsReviewGoals: Goal[];
  atRiskGoals: Goal[];
  handleToggleTask: (goalId: string, taskId: string) => void;
  openTwelveWeekCenter: (goalId: string) => void;
}

function GoalsSidebar({
  todayUncompletedTasks,
  needsReviewGoals,
  atRiskGoals,
  handleToggleTask,
  openTwelveWeekCenter,
}: GoalsSidebarProps) {
  return (
    <aside className="space-y-6 lg:pt-2">
      {/* Widget 1: Tiêu điểm hôm nay */}
      <div className="rounded-[18px] border border-app-line bg-app-surface p-5 shadow-app-sm">
        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-app-accent mb-3 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-app-accent"></span>
          </span>
          TIÊU ĐIỂM HÔM NAY
        </h3>

        <div className="space-y-3">
          {todayUncompletedTasks.length > 0 ? (
            todayUncompletedTasks.map((task) => (
              <div
                key={task.taskId}
                className="flex items-start gap-2.5 border-b border-app-line/45 pb-2.5 last:border-0 last:pb-0 animate-fadeIn"
              >
                <button
                  type="button"
                  onClick={() => handleToggleTask(task.goalId, task.taskId)}
                  className="flex size-4 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface text-white transition-all duration-200 hover:border-app-accent mt-0.5"
                  aria-label="Chốt việc"
                >
                  <Circle className="size-3 text-app-ink-muted hover:text-app-accent shrink-0" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-app-ink leading-snug break-words">
                    {task.title}
                  </p>
                  <p className="text-[10px] text-app-ink-muted font-bold truncate mt-0.5">
                    {task.goalTitle}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs italic leading-relaxed text-app-ink-muted/80">
              Tuyệt vời! Bạn không còn việc nào chưa chốt hôm nay.
            </p>
          )}
        </div>
      </div>

      {/* Widget 2: Cần đánh giá (Review due) */}
      {needsReviewGoals.length > 0 && (
        <div className="rounded-[18px] border border-app-line bg-amber-50/15 dark:bg-amber-950/5 border-amber-500/25 dark:border-amber-500/15 p-5 shadow-app-sm">
          <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            CẦN ĐÁNH GIÁ TRONG TUẦN
          </h3>
          <div className="space-y-3">
            {needsReviewGoals.map((goal) => (
              <div key={goal.id} className="space-y-1.5">
                <p className="text-xs font-bold text-app-ink leading-snug">{goal.title}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-md border-amber-200 dark:border-amber-900 bg-transparent text-amber-600 dark:text-amber-400 hover:bg-amber-100/30 px-3 text-[10px] font-bold"
                  onClick={() => openTwelveWeekCenter(goal.id)}
                >
                  Mở Review ngay
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Widget 3: Mục tiêu gặp rủi ro */}
      {atRiskGoals.length > 0 && (
        <div className="rounded-[18px] border border-app-line bg-rose-50/15 dark:bg-rose-950/5 border-rose-500/25 dark:border-rose-500/15 p-5 shadow-app-sm">
          <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            GẶP RỦI RO (QUÁ HẠN)
          </h3>
          <div className="space-y-2.5">
            {atRiskGoals.map((goal) => (
              <div key={goal.id} className="flex justify-between items-center gap-2">
                <p className="text-xs font-semibold text-app-ink leading-snug truncate flex-1">{goal.title}</p>
                {goal.twelveWeekSystem && (
                  <button
                    type="button"
                    className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0"
                    onClick={() => openTwelveWeekCenter(goal.id)}
                  >
                    Xem kế hoạch
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Widget Nhắc nhở tĩnh tâm */}
      <div className="rounded-[18px] border border-app-line bg-app-warm-soft/40 dark:bg-neutral-900/20 p-4 shadow-app-sm opacity-90">
        <p className="text-[10px] italic leading-relaxed text-app-ink-soft font-serif">
          “Đừng cố gắng làm mọi thứ. Hãy làm những điều thực sự quan trọng một cách trọn vẹn nhất.”
        </p>
      </div>
    </aside>
  );
}

function GoalTrackerSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-6 px-4 pb-12 pt-8 sm:px-6 lg:px-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải danh sách mục tiêu...</span>
      <Skeleton className="h-40 rounded-[18px] bg-app-line/60" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-20 rounded-[18px] bg-app-line/60" />
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-32 rounded-[18px] bg-app-line/60" />
        ))}
      </div>
    </div>
  );
}

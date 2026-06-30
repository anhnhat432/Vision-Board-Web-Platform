/**
 * GoalTracker — Command Center
 *
 * Concept: Trung tâm điều khiển cá nhân
 * Layout: Status Ticker → Today Command (60%) + Goal Fleet (40%)
 *
 * Signature moment: Today Command — việc cần làm đầu tiên hôm nay.
 */

import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Target,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  GoalEmptyState,
  GoalFilterToolbar,
  type GoalFilterType,
  type SpotlightFocusData,
  TodayCommandCard,
  GoalFleetList,
} from "@/app/components/goals";
import { useOptionalAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import { enqueueStoredMutation } from "@/features/plan12week/persistence/mutationQueue";
import { getPlanLink } from "@/features/plan12week/persistence/planLinkStore";
import { getTwelveWeekClientPlanId } from "@/features/plan12week/persistence/twelveWeekImportPayload";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { getBackendGoalId } from "@/lib/api/goalLinkStore";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import { SpotlightTour, type SpotlightTourStep } from "../components/SpotlightTour";
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
import { Skeleton } from "../components/ui/skeleton";
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
  getTwelveWeekTodayTasks,
  getUserData,
  recomputeGoalProgressFromWeeks,
  saveUserData,
  toggleTwelveWeekTask,
  type UserData,
  updateGoal,
} from "../utils/storage";

const GOALTRACKER_TOUR_STEPS: SpotlightTourStep[] = [
  {
    id: "hero",
    targetId: "goaltracker-hero",
    title: "Trung tâm điều khiển",
    description:
      "Đây là nơi bạn thấy mục tiêu cần hành động nhất hôm nay và quản lý tất cả mục tiêu đang chạy.",
  },
  {
    id: "command",
    targetId: "goaltracker-command",
    title: "Tiêu điểm hôm nay",
    description:
      "Card lớn này cho biết việc quan trọng nhất bạn nên làm ngay. Một hành động duy nhất, rõ ràng.",
  },
  {
    id: "fleet",
    targetId: "goaltracker-fleet",
    title: "Quản lý mục tiêu",
    description:
      "Danh sách bên phải hiển thị tất cả mục tiêu đang chạy. Lọc, tìm kiếm, và tiếp tục chu kỳ từ đây.",
  },
];

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
  const [activeFilter, setActiveFilter] = useState<GoalFilterType>("all");
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

  const focusGoal = useMemo((): SpotlightFocusData | null => {
    const activeGoals = goalsWithMetadata.filter((m) => !m.isCompleted);
    if (activeGoals.length === 0) return null;

    const p1 = activeGoals.find((m) => {
      if (!m.isTwelveWeek || !m.goal.twelveWeekSystem) return false;
      const todayTasks = getTwelveWeekTodayTasks(m.goal.twelveWeekSystem);
      return todayTasks.some((t) => !t.completed);
    });
    if (p1) {
      return {
        goal: p1.goal,
        progress: p1.progress,
        isOverdue: p1.isOverdue,
        isNearDeadline: p1.isNearDeadline,
        isTwelveWeek: p1.isTwelveWeek,
        type: "today_tasks",
      };
    }

    const p2 = activeGoals.find((m) => getGoalExecutionStats(m.goal).reviewDueToday);
    if (p2) {
      return {
        goal: p2.goal,
        progress: p2.progress,
        isOverdue: p2.isOverdue,
        isNearDeadline: p2.isNearDeadline,
        isTwelveWeek: p2.isTwelveWeek,
        type: "review_due",
      };
    }

    const p3 = activeGoals.find((m) => m.isOverdue || m.isNearDeadline);
    if (p3) {
      return {
        goal: p3.goal,
        progress: p3.progress,
        isOverdue: p3.isOverdue,
        isNearDeadline: p3.isNearDeadline,
        isTwelveWeek: p3.isTwelveWeek,
        type: "due_warning",
      };
    }

    const p4 = activeGoals.find((m) => m.isTwelveWeek && m.goal.twelveWeekSystem?.status === "active");
    if (p4) {
      return {
        goal: p4.goal,
        progress: p4.progress,
        isOverdue: p4.isOverdue,
        isNearDeadline: p4.isNearDeadline,
        isTwelveWeek: p4.isTwelveWeek,
        type: "first_active_12week",
      };
    }

    return null;
  }, [goalsWithMetadata]);

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

  // Create a Map for goalsWithMetadata for GoalFleetList
  const goalsMetadataMap = useMemo(() => {
    const map = new Map<string, { progress: number; isOverdue: boolean; isNearDeadline: boolean }>();
    for (const meta of goalsWithMetadata) {
      map.set(meta.goal.id, {
        progress: meta.progress,
        isOverdue: meta.isOverdue,
        isNearDeadline: meta.isNearDeadline,
      });
    }
    return map;
  }, [goalsWithMetadata]);

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

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-[26px] pb-16 sm:px-6 lg:px-9">
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

      {/* Command Center Layout */}
      <div className="space-y-6">
        {/* Hero Banner — Dreamy Command Center */}
        <section
          data-tour-id="goaltracker-hero"
          className="relative rounded-card-lg overflow-hidden"
        >
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/study_desk_corner.png')" }}
            aria-hidden="true"
          />
          {/* Gradient overlay — left opaque, right transparent */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-app-bg via-app-bg/90 to-app-bg/40"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 sm:px-8 py-8 sm:py-10">
            <div className="space-y-2">
              <h1 className="font-serif text-3xl sm:text-4xl font-bold leading-tight text-app-ink">
                Mục tiêu của bạn
              </h1>
              <p className="text-base text-app-ink-soft max-w-md">
                Biến ước mơ thành hành động cụ thể mỗi ngày.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
              <Button
                className="rounded-full bg-app-accent px-6 py-3 text-sm font-bold text-white shadow-app-md hover:bg-app-accent-hover transition-all duration-200 motion-safe:hover:scale-[1.02]"
                onClick={handleStartGuidedGoalFlow}
              >
                <Zap className="h-4 w-4 mr-2" />
                Bắt đầu 12 tuần
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-app-line bg-app-surface/90 backdrop-blur-sm px-5 py-3 text-sm font-semibold text-app-ink hover:bg-app-surface transition-colors duration-200"
                onClick={handleStartDirectGoalFlow}
              >
                <Plus className="h-4 w-4 mr-2" />
                Tạo nhanh
              </Button>
            </div>
          </div>
        </section>

        {/* Status Ticker — compact KPI strip */}
        <StatusTicker
          totalGoals={summary.totalGoals}
          completedGoals={summary.completedGoals}
          completedTasks={summary.completedTasks}
          totalTasks={summary.totalTasks}
          activeSystems={summary.activeSystems}
          needsAttention={summary.needsAttention}
        />

        {/* Main: 2-column layout — Command + Fleet */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start"
          data-tour-id="goaltracker-main"
        >
          {/* Left: Today Command */}
          <div data-tour-id="goaltracker-command">
            <TodayCommandCard
              focusData={focusGoal}
              openTwelveWeekCenter={openTwelveWeekCenter}
              handleToggleTask={handleToggleTask}
              onStartGuidedGoalFlow={handleStartGuidedGoalFlow}
            />
          </div>

          {/* Right: Goal Fleet */}
          <div data-tour-id="goaltracker-fleet" className="space-y-3">
            {!hasGoals ? (
              <GoalEmptyState
                onStartGuidedGoalFlow={handleStartGuidedGoalFlow}
                onStartDirectGoalFlow={handleStartDirectGoalFlow}
              />
            ) : (
              <>
                <GoalFilterToolbar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  counts={filterCounts}
                />
                {filteredGoalsWithMetadata.length === 0 ? (
                  <div className="text-center py-6 rounded-card border border-dashed border-app-line bg-app-surface/50">
                    <p className="text-sm text-app-ink-soft">
                      {searchQuery.trim()
                        ? `Không tìm thấy mục tiêu nào khớp với "${searchQuery}"`
                        : "Không tìm thấy mục tiêu nào phù hợp với bộ lọc hiện tại."}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3 border-app-line bg-app-surface text-app-accent hover:bg-app-accent-soft font-bold rounded-lg px-4 py-2 text-sm"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveFilter("all");
                      }}
                    >
                      Xóa tìm kiếm & bộ lọc
                    </Button>
                  </div>
                ) : (
                  <GoalFleetList
                    twelveWeekGoals={displayTwelveWeekGoals}
                    simpleGoals={displayStandardGoals}
                    goalsWithMetadata={goalsMetadataMap}
                    currentPlanCode={currentPlanCode}
                    handleToggleTask={handleToggleTask}
                    openTwelveWeekCenter={openTwelveWeekCenter}
                    setGoalToDelete={setGoalToDelete}
                  />
                )}
              </>
            )}
          </div>
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

/* ─── Status Ticker — Pulse Bar ─── */
interface StatusTickerProps {
  totalGoals: number;
  completedGoals: number;
  completedTasks: number;
  totalTasks: number;
  activeSystems: number;
  needsAttention: number;
}

function StatusTicker({
  totalGoals,
  completedGoals,
  completedTasks,
  totalTasks,
  activeSystems,
  needsAttention,
}: StatusTickerProps) {
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card bg-app-accent-subtle/40 px-5 py-3.5"
      data-tour-id="goaltracker-summary"
    >
      {/* Goals count */}
      <div className="flex items-center gap-2.5">
        <Target className="h-4 w-4 text-app-accent shrink-0" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-app-ink tabular-nums leading-none">
            {totalGoals}
          </span>
          <span className="text-xs text-app-ink-soft">
            mục tiêu
          </span>
        </div>
        {completedGoals > 0 && (
          <span className="text-xs font-medium text-app-status-success">
            {completedGoals} xong
          </span>
        )}
      </div>

      <span className="h-5 w-px bg-app-accent/15" aria-hidden="true" />

      {/* Tasks progress */}
      <div className="flex items-center gap-2.5">
        <CheckCircle2 className="h-4 w-4 text-app-accent shrink-0" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-app-ink tabular-nums leading-none">
            {completionRate}%
          </span>
          <span className="text-xs text-app-ink-soft">
            hoàn thành
          </span>
        </div>
        <span className="text-xs text-app-ink-muted tabular-nums">
          ({completedTasks}/{totalTasks})
        </span>
      </div>

      <span className="h-5 w-px bg-app-accent/15" aria-hidden="true" />

      {/* Active systems */}
      <div className="flex items-center gap-2.5">
        <Zap className="h-4 w-4 text-app-accent shrink-0" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-app-ink tabular-nums leading-none">
            {activeSystems}
          </span>
          <span className="text-xs text-app-ink-soft">
            chu kỳ chạy
          </span>
        </div>
      </div>

      {/* Needs attention */}
      {needsAttention > 0 && (
        <>
          <span className="h-5 w-px bg-app-accent/15" aria-hidden="true" />
          <div className="flex items-center gap-2 rounded-full bg-app-status-warning/10 px-3 py-1">
            <AlertTriangle className="h-3.5 w-3.5 text-app-status-warning shrink-0" />
            <span className="text-xs font-bold text-app-status-warning tabular-nums">
              {needsAttention}
            </span>
            <span className="text-xs font-medium text-app-status-warning/80">
              cần chú ý
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Skeleton ─── */
function GoalTrackerSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1200px] space-y-4 px-4 pb-16 pt-[26px] sm:px-6 lg:px-9"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải danh sách mục tiêu...</span>
      <Skeleton className="h-16 rounded-card bg-app-line/60" />
      <Skeleton className="h-10 rounded-card bg-app-line/60" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        <Skeleton className="h-56 rounded-card-lg bg-app-line/60" />
        <div className="space-y-3">
          <Skeleton className="h-10 rounded-control bg-app-line/60" />
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-20 rounded-card bg-app-line/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
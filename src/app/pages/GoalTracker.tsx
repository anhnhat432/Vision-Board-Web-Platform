import { AlertTriangle, ArrowRight, Award, CheckCircle2, Circle, Lock, Mail, MailOpen, Plus, RotateCcw, Search, Target, Trash2, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
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
  type TwelveWeekSystem,
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

const completedGoalStyle = `
  @keyframes completedBorderGlow {
    0%, 100% {
      border-color: rgba(16, 185, 129, 0.35);
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.08), inset 0 0 4px rgba(16, 185, 129, 0.02);
    }
    50% {
      border-color: rgba(52, 211, 153, 0.7);
      box-shadow: 0 0 20px rgba(52, 211, 153, 0.22), inset 0 0 6px rgba(52, 211, 153, 0.04);
    }
  }
  .completed-goal-glow {
    animation: completedBorderGlow 4s infinite ease-in-out;
  }
  .perspective-1000 {
    perspective: 1000px;
  }
  .preserve-3d {
    transform-style: preserve-3d;
  }
  .backface-hidden {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  .rotate-y-180 {
    transform: rotateY(180deg);
  }
  .card-transition {
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
`;

interface GoalCompletionDetails {
  completedAtStr: string;
  completedTasks: number;
  totalTasks: number;
}

const getGoalCompletionDetails = (goal: Goal): GoalCompletionDetails => {
  const stats = getGoalExecutionStats(goal);
  let latestDate: Date | null = null;

  if (goal.twelveWeekSystem) {
    for (const task of goal.twelveWeekSystem.taskInstances) {
      if (task.completed && task.completedAt) {
        try {
          const d = new Date(task.completedAt);
          if (!Number.isNaN(d.getTime())) {
            if (!latestDate || d > latestDate) {
              latestDate = d;
            }
          }
        } catch {}
      }
    }
  } else {
    for (const task of goal.tasks) {
      if (task.completed && task.lastModifiedAt) {
        try {
          const d = new Date(task.lastModifiedAt);
          if (!Number.isNaN(d.getTime())) {
            if (!latestDate || d > latestDate) {
              latestDate = d;
            }
          }
        } catch {}
      }
    }
  }

  let completedAtStr = "Vừa hoàn thành";
  if (latestDate) {
    const day = String(latestDate.getDate()).padStart(2, "0");
    const month = String(latestDate.getMonth() + 1).padStart(2, "0");
    const year = latestDate.getFullYear();
    completedAtStr = `${day}/${month}/${year}`;
  }

  return {
    completedAtStr,
    completedTasks: stats.completed,
    totalTasks: stats.total,
  };
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

      {/* Grid Layout 2 Cột trên Desktop, 1 Cột trên Mobile */}
      <div className="grid gap-8 lg:grid-cols-[1fr_300px] lg:gap-10">
        {/* Cột chính bên trái */}
        <div className="space-y-8 lg:space-y-10">
          {/* Hero Section gọn gàng & chuyên nghiệp */}
          <div
            data-tour-id="goaltracker-hero"
            className="rounded-[18px] border border-app-line/80 bg-gradient-to-br from-white via-white to-app-accent-soft/20 dark:from-neutral-950 dark:via-neutral-950 dark:to-app-accent-soft/5 p-6 sm:p-8 relative overflow-hidden shadow-app-sm"
          >
            {/* Soft glow decoration */}
            <div className="absolute right-0 top-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-app-accent/5 blur-3xl pointer-events-none" />
            
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center relative z-10">
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-app-accent flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-app-accent"></span>
                  </span>
                  MỤC TIÊU
                </p>
                <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-app-ink sm:text-4xl">
                  Hành trình mục tiêu
                </h1>
                <p className="text-sm leading-relaxed text-app-ink-soft max-w-xl font-sans">
                  Tập trung vào những gì cốt lõi nhất. Chia nhỏ mục tiêu lớn thành các chu kỳ 12 tuần để hành động đều đặn.
                </p>
              </div>

              {/* CTAs ở Hero section */}
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
                <Button
                  className="bg-app-accent text-white rounded-lg px-5 py-3 text-sm font-bold hover:bg-app-accent-hover transition-all duration-200 shadow-app-sm hover:shadow-app-md hover:scale-[1.01] inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                  onClick={handleStartGuidedGoalFlow}
                >
                  <Zap className="h-4.5 w-4.5" />
                  Bắt đầu chu kỳ 12 tuần
                </Button>
                <Button
                  variant="outline"
                  className="rounded-lg border border-app-line bg-app-surface text-app-ink hover:bg-app-bg px-5 py-3 text-sm font-bold transition-all duration-200 shadow-app-sm hover:shadow-app-md hover:scale-[1.01] inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                  onClick={handleStartGuidedGoalFlow}
                >
                  <Plus className="h-4.5 w-4.5" />
                  Thiết lập mục tiêu
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

          {/* Search + Filter Container dạng Toolbar sạch sẽ */}
          <div className="rounded-[18px] border border-app-line/75 bg-app-surface p-4 shadow-app-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            {/* Search Input */}
            <div className="relative w-full lg:w-96">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-app-ink-muted" />
              <input
                type="search"
                placeholder="Tìm theo tên hoặc mô tả mục tiêu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-app-line bg-app-bg pl-11 pr-4 py-2.5 text-sm text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/20 focus:border-app-accent transition-all duration-200"
              />
            </div>

            {/* Filter Chips */}
            <div className="w-full lg:w-auto overflow-x-auto">
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
                      className="bg-app-accent text-white hover:bg-app-accent-hover font-bold shadow-app-sm hover:scale-[1.01] transition-all px-6 py-2.5 rounded-lg text-sm"
                      onClick={handleStartGuidedGoalFlow}
                    >
                      Bắt đầu chu kỳ 12 tuần →
                    </Button>
                    <Button
                      variant="outline"
                      className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg px-6 py-2.5 rounded-lg font-bold text-sm"
                      onClick={handleStartGuidedGoalFlow}
                    >
                      Thiết lập mục tiêu
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="space-y-8">
                {displayTwelveWeekGoals.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-baseline justify-between border-b border-app-line/50 pb-2.5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                          CHU KỲ 12 TUẦN
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-normal text-app-ink">
                          Mục tiêu đang chạy
                        </h2>
                        <p className="mt-1 text-xs text-app-ink-muted font-bold">
                          {displayTwelveWeekGoals.length} mục tiêu
                        </p>
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
                    <div className="flex items-baseline justify-between border-b border-app-line/50 pb-2.5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                          MỤC TIÊU THƯỜNG
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-normal text-app-ink">
                          {displayStandardGoals.length} mục tiêu thường
                        </h2>
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
      title: "Mục tiêu",
      value: totalGoals,
      note: `${completedGoals} hoàn thành`,
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
      title: "Chu kỳ",
      value: activeSystems,
      note: "đang chạy",
      icon: Zap,
      colorClass: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30",
    },
    {
      title: "Cần chú ý",
      value: needsAttention,
      note: "quá hạn / review",
      icon: AlertTriangle,
      colorClass: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch" data-tour-id="goaltracker-summary">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="h-full rounded-[18px] border border-app-line/70 bg-app-surface p-5 flex items-center justify-between gap-4 shadow-app-sm hover:border-app-accent/20 hover:shadow-app-md transition-all duration-300"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-[0.05em] text-app-ink-soft">
                {item.title}
              </p>
              <p className="mt-1.5 font-serif text-2xl sm:text-3xl font-black text-app-ink tabular-nums leading-none">
                {item.value}
              </p>
              <p className="mt-2 text-xs font-medium text-app-ink-muted leading-tight">
                {item.note}
              </p>
            </div>
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-app-sm", item.colorClass)}>
              <Icon className="h-4.5 w-4.5" />
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
    <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 max-w-full lg:justify-end">
      {chips.map((chip) => {
        const isActive = activeFilter === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => setActiveFilter(chip.id)}
            className={cn(
              "px-3.5 py-1.5 text-xs font-bold rounded-full border transition-all duration-200 flex items-center gap-2 shadow-app-sm shrink-0",
              isActive
                ? "bg-app-accent text-white border-app-accent"
                : "bg-app-bg text-app-ink-soft border-app-line hover:border-app-accent/25 hover:bg-app-surface",
            )}
          >
            <span>{chip.label}</span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-bold tabular-nums",
              isActive
                ? "bg-white/20 text-white"
                : "bg-app-line text-app-ink-soft",
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

  const [isFlipped, setIsFlipped] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const completionDetails = useMemo(() => getGoalCompletionDetails(goal), [goal]);

  const glowClass = progress === 100
    ? (prefersReducedMotion 
        ? "border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.1)] bg-emerald-50/15 dark:bg-emerald-950/5" 
        : "completed-goal-glow bg-emerald-50/15 dark:bg-emerald-950/5 border-emerald-500/25 dark:border-emerald-500/15")
    : "bg-app-surface border-app-line/70";

  return (
    <div className="perspective-1000 w-full relative">
      <div className={cn(
        "preserve-3d card-transition w-full relative",
        isFlipped ? "rotate-y-180" : ""
      )}>
        {/* FRONT SIDE */}
        <div className="backface-hidden w-full">
          <SpotlightCard className={cn("rounded-[18px] border p-5 sm:p-6 transition-all duration-300 hover:border-app-accent/30 hover:shadow-app-md", glowClass)}>
            {/* Nút xóa thùng rác nhỏ ở góc trên bên phải, visually quieter */}
            <button
              type="button"
              className="absolute top-4 right-4 h-7.5 w-7.5 rounded-lg text-app-ink-muted/30 hover:text-app-status-error hover:bg-app-status-error/5 transition-all duration-200 flex items-center justify-center z-20"
              onClick={() => setGoalToDelete(goal.id)}
              aria-label={`Xóa mục tiêu ${goal.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <div className="grid gap-6 lg:grid-cols-[1fr_1px_280px] lg:gap-8">
              {/* Cột trái: Goal Info */}
              <div className="space-y-3.5 pr-2">
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 rounded-xl items-center justify-center shadow-app-sm mt-0.5",
                      areaStyle.bg,
                      areaStyle.text,
                    )}
                  >
                    <GoalArchetypeIcon className="h-5.5 w-5.5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-serif text-lg md:text-xl font-bold text-app-ink leading-snug break-words pr-8 line-clamp-3">
                      {goal.title}
                    </h3>
                    <p className="text-xs text-app-ink-soft font-semibold">
                      {system ? `Tuần ${systemCurrentWeek ?? "-"}/12` : "Mục tiêu thường"} ·{" "}
                      <span className={cn("font-bold", areaStyle.text)}>{getLifeAreaLabel(goal.category)}</span>
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <span
                    className={cn(
                      "border text-xs font-bold rounded-full px-3 py-0.5 inline-flex items-center gap-1 shadow-app-sm",
                      areaStyle.bg,
                      areaStyle.border,
                      areaStyle.text,
                    )}
                  >
                    {getLifeAreaLabel(goal.category)}
                  </span>
                  {isNearDeadline && (
                    <span className="bg-app-warm-soft border border-app-warm-border text-app-warm text-xs font-bold rounded-full px-3 py-0.5 shadow-app-sm">
                      Sắp đến hạn
                    </span>
                  )}
                  {isOverdue && (
                    <span className="bg-app-status-error/10 text-app-status-error border border-app-status-error/20 text-xs font-bold rounded-full px-3 py-0.5 shadow-app-sm">
                      Quá hạn
                    </span>
                  )}
                  {system && (
                    <span className="bg-app-bg border border-app-line text-app-ink-soft text-xs font-bold rounded-full px-3 py-0.5 shadow-app-sm">
                      {getPlanLabel(currentPlanCode)}
                    </span>
                  )}
                </div>

                {/* Streak Heatmap (chỉ cho mục tiêu 12 tuần) */}
                {system && (
                  <div className="pt-1">
                    <StreakHeatmap system={system} />
                  </div>
                )}

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-app-ink-soft">Tiến độ</span>
                    <span className={cn("tabular-nums text-sm", areaStyle.text)}>
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
                <div className="pt-1.5 flex flex-wrap items-center gap-3">
                  {system && (
                    <Button
                      type="button"
                      className="rounded-lg bg-app-accent text-white hover:bg-app-accent-hover px-4 py-2 text-xs sm:text-sm font-bold shadow-app-sm transition-all duration-200 inline-flex items-center gap-1.5 h-9"
                      onClick={() => openTwelveWeekCenter(goal.id)}
                    >
                      Tiếp tục chu kỳ
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  {system ? (
                    <FutureSelfLetter goalId={goal.id} progress={progress} system={system} />
                  ) : null}
                  {progress === 100 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFlipped(true)}
                      className="rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50/50 dark:border-emerald-900/40 dark:text-emerald-400 px-3.5 py-2 text-xs font-bold transition-all h-9 flex items-center gap-1.5"
                      aria-pressed={isFlipped}
                    >
                      <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Vinh danh
                    </Button>
                  )}
                </div>
              </div>

              {/* Divider dọc */}
              <div className="hidden lg:block w-px bg-app-line/60 my-1" aria-hidden="true" />

              {/* Cột phải: Tasks hôm nay */}
              <div className="lg:pl-2 flex flex-col justify-between min-w-0 pt-0.5">
                <div>
                  <div className="flex items-center justify-between border-b border-app-line/50 pb-2 mb-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-app-ink-muted">
                      Việc hôm nay
                    </p>
                    {system && (
                      <span className="text-xs font-black tabular-nums text-app-accent">
                        {completedTodayCount}/{totalTodayCount}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {systemTodayOpenTasks.slice(0, 2).map((task) => (
                      <div
                        key={task.id}
                        className="group/task flex items-center gap-2.5 rounded-lg border border-app-line/40 bg-app-bg-subtle/30 px-3 py-2 hover:border-app-accent/20 hover:bg-app-accent-subtle/20 transition-all duration-300"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleTask(goal.id, task.id)}
                          className="flex size-4.5 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface text-white transition-all duration-200 hover:border-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                          aria-label={task.completed ? "Hủy chốt việc" : "Chốt việc"}
                        >
                          {task.completed ? (
                            <CheckCircle2 className="size-4.5 text-app-accent shrink-0" />
                          ) : (
                            <Circle className="size-3.5 text-app-ink-muted hover:text-app-accent shrink-0" />
                          )}
                        </button>
                        <span
                          className={cn(
                            "text-sm font-medium truncate transition-all duration-200",
                            task.completed ? "line-through text-app-ink-muted opacity-70" : "text-app-ink",
                          )}
                        >
                          {task.title}
                        </span>
                      </div>
                    ))}

                    {systemTodayOpenTasks.length === 0 && (
                      <p className="text-xs italic leading-relaxed text-app-ink-muted/70 mt-1 pl-1 font-sans">
                        Không có việc hôm nay.
                      </p>
                    )}
                  </div>
                </div>

                {system && (
                  <button
                    type="button"
                    className="group/more mt-3 text-app-accent text-xs sm:text-sm font-bold hover:text-app-accent-hover transition-colors duration-150 inline-flex items-center gap-0.5 self-start"
                    onClick={() => openTwelveWeekCenter(goal.id)}
                  >
                    <span>Xem toàn bộ</span>
                    <ArrowRight className="h-3 w-3 transform transition-transform duration-200 group-hover/more:translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>
          </SpotlightCard>
        </div>

        {/* BACK SIDE */}
        <div className="backface-hidden rotate-y-180 absolute inset-0 w-full h-full z-10">
          <SpotlightCard className={cn("h-full rounded-[18px] border p-5 sm:p-6 bg-gradient-to-br from-amber-50/15 via-app-surface to-emerald-50/10 dark:from-amber-950/5 dark:via-neutral-950 dark:to-emerald-950/5 shadow-app-lg flex flex-col justify-between overflow-y-auto", progress === 100 && (prefersReducedMotion ? "border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.1)]" : "completed-goal-glow"))}>
            <div className="space-y-4">
              {/* Certificate Header */}
              <div className="flex items-center gap-3 border-b border-app-line pb-3">
                <div className="flex h-10 w-10 shrink-0 rounded-xl items-center justify-center bg-amber-500/10 text-amber-500 shadow-sm">
                  <Award className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">
                    Thành tích xuất sắc
                  </h4>
                  <p className="text-sm font-semibold text-app-ink-soft">
                    Mục tiêu đã hoàn thành
                  </p>
                </div>
              </div>

              {/* Goal Title & Completion Metadata */}
              <div className="space-y-2">
                <h3 className="font-serif text-lg sm:text-xl font-bold text-app-ink leading-snug break-words line-clamp-3">
                  {goal.title}
                </h3>
                
                <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                  <div className="bg-app-bg/50 rounded-lg p-2.5 border border-app-line/40">
                    <p className="text-app-ink-muted font-medium">Hoàn thành ngày</p>
                    <p className="mt-1 font-bold text-app-ink text-sm">{completionDetails.completedAtStr}</p>
                  </div>
                  <div className="bg-app-bg/50 rounded-lg p-2.5 border border-app-line/40">
                    <p className="text-app-ink-muted font-medium">Nhiệm vụ đã chốt</p>
                    <p className="mt-1 font-bold text-emerald-600 dark:text-emerald-400 text-sm tabular-nums">
                      {completionDetails.completedTasks}/{completionDetails.totalTasks} việc
                    </p>
                  </div>
                </div>
              </div>

              {/* Encouragement message */}
              <p className="text-sm italic leading-relaxed text-app-ink-soft bg-emerald-50/15 dark:bg-emerald-950/5 border border-emerald-500/10 rounded-xl p-3 font-serif">
                “Bạn đã biến một mục tiêu lớn thành kết quả cụ thể. Hãy ghi nhận nỗ lực này.”
              </p>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-app-line/50 flex flex-wrap gap-2.5 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFlipped(false)}
                className="rounded-lg border border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg px-4 py-2 text-xs sm:text-sm font-bold transition-all h-9 flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Quay lại mục tiêu
              </Button>
              {system && (
                <Button
                  size="sm"
                  onClick={() => openTwelveWeekCenter(goal.id)}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs sm:text-sm font-bold transition-all h-9 flex items-center gap-1.5"
                >
                  Mở chu kỳ
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </SpotlightCard>
        </div>
      </div>
    </div>
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
  const isSidebarEmpty = todayUncompletedTasks.length === 0 && needsReviewGoals.length === 0 && atRiskGoals.length === 0;

  return (
    <aside className="space-y-6 lg:space-y-8 lg:pt-2">
      {isSidebarEmpty ? (
        /* Widget Daily Overview tuyệt đẹp khi rỗng */
        <div className="rounded-[18px] border border-app-line bg-app-surface p-6 shadow-app-sm text-center py-10 space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shadow-sm">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-app-ink">Mọi thứ đang đi đúng hướng!</h4>
            <p className="text-xs text-app-ink-soft leading-relaxed px-2">
              Không có mục tiêu nào cần chú ý khẩn cấp hay việc chưa hoàn thành hôm nay. Hãy giữ vững nhịp độ tuyệt vời này.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Widget 1: Tiêu điểm hôm nay */}
          <div className="rounded-[18px] border border-app-line bg-app-surface p-5 shadow-app-sm">
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-app-accent mb-3.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-app-accent"></span>
              </span>
              Tiêu điểm hôm nay
            </h3>

            <div className="space-y-3">
              {todayUncompletedTasks.length > 0 ? (
                todayUncompletedTasks.map((task) => (
                  <div
                    key={task.taskId}
                    className="flex items-start gap-2.5 border-b border-app-line/45 pb-3 last:border-0 last:pb-0"
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
                      <p className="text-sm font-semibold text-app-ink leading-snug break-words">
                        {task.title}
                      </p>
                      <p className="text-xs text-app-ink-muted font-bold truncate mt-1">
                        {task.goalTitle}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-app-ink-muted/80 italic leading-relaxed font-sans">
                  Tuyệt vời! Bạn không còn việc nào chưa chốt hôm nay.
                </p>
              )}
            </div>
          </div>

          {/* Widget 2: Cần đánh giá (Review due) */}
          {needsReviewGoals.length > 0 && (
            <div className="rounded-[18px] border border-app-line bg-amber-50/15 dark:bg-amber-950/5 border-amber-500/25 dark:border-amber-500/15 p-5 shadow-app-sm">
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-amber-600 dark:text-amber-400 mb-3.5 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Cần đánh giá trong tuần
              </h3>
              <div className="space-y-4">
                {needsReviewGoals.map((goal) => (
                  <div key={goal.id} className="space-y-2">
                    <p className="text-sm font-bold text-app-ink leading-snug">{goal.title}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-md border-amber-200 dark:border-amber-900 bg-transparent text-amber-600 dark:text-amber-400 hover:bg-amber-100/30 px-3.5 text-xs font-bold"
                      onClick={() => openTwelveWeekCenter(goal.id)}
                    >
                      Mở Review ngay
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Widget 3: Mục tiêu gặp rủi ro (Quá hạn) */}
          {atRiskGoals.length > 0 && (
            <div className="rounded-[18px] border border-app-line bg-rose-50/15 dark:bg-rose-950/5 border-rose-500/25 dark:border-rose-500/15 p-5 shadow-app-sm">
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-rose-600 dark:text-rose-400 mb-3.5 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                Gặp rủi ro (Quá hạn)
              </h3>
              <div className="space-y-3">
                {atRiskGoals.map((goal) => (
                  <div key={goal.id} className="flex justify-between items-center gap-2">
                    <p className="text-sm font-semibold text-app-ink leading-snug truncate flex-1">{goal.title}</p>
                    {goal.twelveWeekSystem && (
                      <button
                        type="button"
                        className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0"
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
        </>
      )}

      {/* Widget Nhắc nhở tĩnh tâm */}
      <div className="rounded-[18px] border border-app-line bg-app-warm-soft/40 dark:bg-neutral-900/20 p-4 shadow-app-sm opacity-90">
        <p className="text-xs italic leading-relaxed text-app-ink-soft font-serif font-medium">
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

// -------------------------------------------------------------
// STREAK HEATMAP & FUTURE SELF CAPSULE FOR GOAL COMMAND CENTER
// -------------------------------------------------------------

interface StreakHeatmapProps {
  system: TwelveWeekSystem;
}

const parseDateStr = (str: string) => {
  const [year, month, day] = str.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const r = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${r}`;
};

const formatDayLabel = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

function StreakHeatmap({ system }: StreakHeatmapProps) {
  const startDate = useMemo(() => {
    try {
      return parseDateStr(system.startDate);
    } catch {
      return new Date();
    }
  }, [system.startDate]);

  const weeks = useMemo(() => {
    const weeksList: Array<Array<{
      dateStr: string;
      total: number;
      completed: number;
      colorClass: string;
      label: string;
    }>> = [];

    const tasksMap = new Map<string, { total: number; completed: number }>();
    for (const task of system.taskInstances) {
      if (!task.scheduledDate) continue;
      const current = tasksMap.get(task.scheduledDate) || { total: 0, completed: 0 };
      current.total += 1;
      if (task.completed) {
        current.completed += 1;
      }
      tasksMap.set(task.scheduledDate, current);
    }

    for (let w = 0; w < 12; w++) {
      const days: Array<{
        dateStr: string;
        total: number;
        completed: number;
        colorClass: string;
        label: string;
      }> = [];

      for (let d = 0; d < 7; d++) {
        const dayIdx = w * 7 + d;
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + dayIdx);
        const dateKey = formatDateStr(targetDate);
        const stats = tasksMap.get(dateKey) || { total: 0, completed: 0 };

        let colorClass = "bg-slate-100 dark:bg-neutral-800/40 border border-transparent";
        if (stats.total > 0) {
          if (stats.completed === stats.total) {
            colorClass = "bg-emerald-500 border border-emerald-600/10";
          } else if (stats.completed > 0) {
            colorClass = "bg-emerald-300 border border-emerald-400/10";
          } else {
            colorClass = "bg-rose-100/80 border border-rose-200/20 dark:bg-rose-950/20 dark:border-rose-900/10";
          }
        }

        const formattedDate = formatDayLabel(dateKey);
        const label = stats.total > 0 
          ? `${formattedDate}: Chốt ${stats.completed}/${stats.total} việc`
          : `${formattedDate}: Không có việc lên lịch`;

        days.push({
          dateStr: dateKey,
          total: stats.total,
          completed: stats.completed,
          colorClass,
          label,
        });
      }
      weeksList.push(days);
    }
    return weeksList;
  }, [startDate, system.taskInstances]);

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between text-xs font-bold text-app-ink-soft">
        <span>Nhịp độ hành động</span>
        <span className="text-xs text-app-ink-muted font-normal font-sans">Hover xem chi tiết</span>
      </div>
      
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
        {/* Nhãn hàng Thứ 2 - CN */}
        <div className="flex flex-col justify-between h-[96px] text-[9px] font-bold text-app-ink-muted pr-1 select-none leading-none pt-0.5 pb-0.5">
          <span>T2</span>
          <span>T4</span>
          <span>T6</span>
          <span>CN</span>
        </div>

        {/* Cột tuần */}
        <div className="flex gap-1">
          {weeks.map((weekDays) => (
            <div key={`week-${weekDays[0].dateStr}`} className="flex flex-col gap-1">
              {weekDays.map((day) => (
                <div key={day.dateStr} className="relative group flex justify-center">
                  <div 
                    className={cn(
                      "w-3 h-3 rounded-[2.5px] transition-all duration-150 cursor-pointer hover:scale-110", 
                      day.colorClass
                    )} 
                  />
                  {/* Custom CSS Tooltip */}
                  <div className="absolute bottom-full mb-1.5 hidden group-hover:block z-30 bg-neutral-900 dark:bg-neutral-800 text-white text-[10px] font-sans rounded px-2 py-1 whitespace-nowrap shadow-md pointer-events-none transform -translate-y-0.5 border border-neutral-800/80 leading-normal">
                    {day.label}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-800" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface FutureSelfLetterProps {
  goalId: string;
  progress: number;
  system?: TwelveWeekSystem;
}

function FutureSelfLetter({ goalId, progress, system }: FutureSelfLetterProps) {
  const [letterText, setLetterText] = useState<string | null>(null);
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [isReadOpen, setIsReadOpen] = useState(false);
  const [tempText, setTempText] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(`future_letter_${goalId}`);
    setLetterText(saved);
  }, [goalId]);

  const handleOpenWrite = () => {
    setTempText(letterText || "");
    setIsReadOpen(false);
    setIsWriteOpen(true);
  };

  const handleSave = () => {
    if (!tempText.trim()) {
      localStorage.removeItem(`future_letter_${goalId}`);
      setLetterText(null);
      toast.info("Đã xóa thư nháp.");
    } else {
      localStorage.setItem(`future_letter_${goalId}`, tempText);
      setLetterText(tempText);
      toast.success("Bức thư gửi tương lai đã được niêm phong!");
    }
    setIsWriteOpen(false);
  };

  const isUnlocked = useMemo(() => {
    if (progress === 100) return true;
    if (!system) return false;
    
    if (system.currentWeek >= 12) return true;
    try {
      const today = new Date();
      const end = new Date(system.endDate);
      if (today > end) return true;
    } catch {}
    
    return false;
  }, [progress, system]);

  const handleReadClick = () => {
    if (!isUnlocked) {
      toast.info("Thư đang được niêm phong 🔒", {
        description: "Đạt 100% tiến độ hoặc hoàn thành tuần 12 để mở.",
      });
      return;
    }
    setIsReadOpen(true);
  };

  if (!letterText) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenWrite}
          className="rounded-lg border border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg px-3.5 py-2 text-xs font-bold transition-all inline-flex items-center gap-1.5 h-9"
        >
          <Mail className="h-4 w-4 text-app-accent" />
          Viết thư tuần 12
        </Button>

        <Dialog open={isWriteOpen} onOpenChange={setIsWriteOpen}>
          <DialogContent className="max-w-lg p-5 sm:p-6 bg-app-surface border border-app-line rounded-[18px] shadow-app-lg">
            <DialogHeader className="space-y-1.5 text-left border-b border-app-line/45 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-app-accent shrink-0" />
                <DialogTitle className="font-serif text-lg font-bold text-app-ink">
                  Gửi tôi ở tuần thứ 12
                </DialogTitle>
              </div>
            </DialogHeader>
            <DialogDescription className="text-sm text-app-ink-soft leading-relaxed font-sans mt-2">
              Viết một vài dòng nhắn nhủ, cam kết hoặc khích lệ bản thân lúc này. Bức thư sẽ được khóa lại và chỉ mở ra khi bạn đạt 100% tiến độ hoặc hoàn thành chu kỳ 12 tuần.
            </DialogDescription>

            <div className="pt-2">
              <textarea
                className="w-full min-h-[160px] rounded-xl border border-app-line bg-app-bg p-3.5 text-sm text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/25 resize-none transition-all"
                placeholder="Gửi bản thân thân mến ở tuần 12..."
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                maxLength={500}
              />
            </div>
            
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 font-sans mt-3">
              <span className="text-xs sm:text-sm text-app-ink-muted w-full sm:w-auto text-left font-medium">
                {tempText.length}/500 ký tự
              </span>
              <div className="flex gap-2.5 w-full sm:w-auto justify-end shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWriteOpen(false)}
                  className="rounded-lg border border-app-line bg-app-surface text-app-ink hover:bg-app-bg h-9 px-4 py-2 font-bold text-xs sm:text-sm"
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="rounded-lg bg-app-accent text-white hover:bg-app-accent-hover font-bold h-9 px-4 py-2 text-xs sm:text-sm"
                >
                  Niêm phong thư
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={isUnlocked ? () => setIsReadOpen(true) : handleReadClick}
        className={cn(
          "rounded-lg border px-3.5 py-2 text-xs font-bold transition-all inline-flex items-center gap-1.5 h-9",
          isUnlocked
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/75 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400"
            : "border-amber-200 bg-amber-50/70 text-amber-700 hover:bg-amber-100/70 dark:border-amber-900/40 dark:bg-amber-950/10 dark:text-amber-400"
        )}
      >
        {isUnlocked ? (
          <>
            <MailOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Đọc thư
          </>
        ) : (
          <>
            <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            Thư tuần 12 (Khóa)
          </>
        )}
      </button>

      {/* Dialog Đọc thư */}
      <Dialog open={isReadOpen} onOpenChange={setIsReadOpen}>
        <DialogContent className="max-w-lg p-5 sm:p-6 bg-app-surface border border-app-line rounded-[18px] shadow-app-lg">
          <DialogHeader className="space-y-1.5 text-left border-b border-app-line pb-3">
            <div className="flex items-center gap-2">
              <MailOpen className="h-5 w-5 text-emerald-600 shrink-0" />
              <DialogTitle className="font-serif text-lg font-bold text-app-ink">
                Thư gửi từ quá khứ
              </DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-app-ink-soft font-sans mt-2">
            Bức thư bạn tự tay viết khi bắt đầu hành trình chinh phục mục tiêu này.
          </DialogDescription>

          <div className="bg-app-warm-soft/40 dark:bg-neutral-900/40 rounded-xl p-4 border border-app-line/60 my-2">
            <p className="text-sm italic leading-relaxed text-app-ink whitespace-pre-wrap font-serif">
              “{letterText}”
            </p>
          </div>

          <DialogFooter className="flex flex-row justify-between items-center gap-3 font-sans w-full mt-2">
            <button
              type="button"
              onClick={handleOpenWrite}
              className="text-xs sm:text-sm text-app-accent hover:underline font-bold"
            >
              Chỉnh sửa thư
            </button>
            <Button
              size="sm"
              onClick={() => setIsReadOpen(false)}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 py-2 text-xs sm:text-sm"
            >
              Tuyệt vời
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Chỉnh sửa khi đã có thư */}
      <Dialog open={isWriteOpen} onOpenChange={setIsWriteOpen}>
        <DialogContent className="max-w-lg p-5 sm:p-6 bg-app-surface border border-app-line rounded-[18px] shadow-app-lg">
          <DialogHeader className="space-y-1.5 text-left border-b border-app-line/45 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-app-accent shrink-0" />
              <DialogTitle className="font-serif text-lg font-bold text-app-ink">
                Chỉnh sửa thư gửi tuần 12
              </DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-app-ink-soft leading-relaxed font-sans mt-2">
            Chỉnh sửa hoặc xóa bức thư gửi cho chính bạn ở cuối hành trình mục tiêu.
          </DialogDescription>

          <div className="pt-2">
            <textarea
              className="w-full min-h-[160px] rounded-xl border border-app-line bg-app-bg p-3.5 text-sm text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/25 resize-none transition-all"
              placeholder="Gửi bản thân thân mến..."
              value={tempText}
              onChange={(e) => setTempText(e.target.value)}
              maxLength={500}
            />
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 font-sans mt-3">
            <span className="text-xs sm:text-sm text-app-ink-muted w-full sm:w-auto text-left font-medium">
              {tempText.length}/500 ký tự
            </span>
            <div className="flex gap-2.5 w-full sm:w-auto justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWriteOpen(false)}
                className="rounded-lg border border-app-line bg-app-surface text-app-ink hover:bg-app-bg h-9 px-4 py-2 font-bold text-xs sm:text-sm"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="rounded-lg bg-app-accent text-white hover:bg-app-accent-hover font-bold h-9 px-4 py-2 text-xs sm:text-sm"
              >
                Lưu thay đổi
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

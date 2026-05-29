import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useOptionalAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import { enqueueStoredMutation } from "@/features/plan12week/persistence/mutationQueue";
import { getPlanLink } from "@/features/plan12week/persistence/planLinkStore";
import { getTwelveWeekClientPlanId } from "@/features/plan12week/persistence/twelveWeekImportPayload";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { getBackendGoalId } from "@/lib/api/goalLinkStore";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import { AlertTriangle, CheckCircle2, Circle, Plus, Search, Target, Trash2, Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";

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
import { getGoalArchetypeIcon } from "../components/illustrations";
import { EmptyState } from "@/app/components/states/EmptyState";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import { SpotlightCard } from "../components/ui/spotlight-card";
import { soundService } from "../services/soundService";
import { Skeleton } from "../components/ui/skeleton";
import { cn } from "../components/ui/utils";
import { useBackendProgressOverlayMap } from "../hooks/useBackendProgressOverlay";
import { usePlanEntitlements } from "../hooks/usePlanEntitlements";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { celebrateSpark, celebrateSpotlight } from "../utils/experience";
import { hasReachedLimit } from "../utils/feature-entitlements";
import {
  APP_STORAGE_KEYS,
  type UserData,
  type Goal,
  calculateGoalProgress,
  clearGoalPlanningDrafts,
  deleteGoal as deleteLocalGoal,
  getCalendarDayDifference,
  getGoalExecutionStats,
  getLifeAreaLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTodayTasks,
  getUserData,
  recomputeGoalProgressFromWeeks,
  saveUserData,
  toggleTwelveWeekTask,
  updateGoal,
} from "../utils/storage";
import { isRealMode, shouldEnable12WeekGoalTombstoneSync } from "../utils/app-mode";
import { getPlanLabel } from "../utils/twelve-week-premium";

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Sức khoẻ": {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-100 dark:border-emerald-900/30",
  },
  "Sự nghiệp": {
    bg: "bg-teal-50 dark:bg-teal-950/30",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-100 dark:border-teal-900/30",
  },
  "Mối quan hệ": {
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-100 dark:border-green-900/30",
  },
  "Tinh thần": {
    bg: "bg-lime-50 dark:bg-lime-950/30",
    text: "text-lime-600 dark:text-lime-400",
    border: "border-lime-100 dark:border-lime-900/30",
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
  const hasGoals = effectiveGoals.length > 0;
  const hasRealLifeBalance =
    viewUserData.onboardingCompleted && viewUserData.currentWheelOfLife.some((area) => area.score > 0);
  const goalFlowStartHref = hasRealLifeBalance ? "/life-insight" : "/onboarding";
  const twelveWeekGoals = useMemo(
    () => effectiveGoals.filter((goal) => Boolean(goal.twelveWeekSystem)),
    [effectiveGoals],
  );
  const standardGoals = useMemo(() => effectiveGoals.filter((goal) => !goal.twelveWeekSystem), [effectiveGoals]);

  const filteredTwelveWeekGoals = useMemo(() => {
    if (!searchQuery.trim()) return twelveWeekGoals;
    const q = searchQuery.toLowerCase();
    return twelveWeekGoals.filter((g) => g.title.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q));
  }, [twelveWeekGoals, searchQuery]);

  const filteredStandardGoals = useMemo(() => {
    if (!searchQuery.trim()) return standardGoals;
    const q = searchQuery.toLowerCase();
    return standardGoals.filter((g) => g.title.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q));
  }, [standardGoals, searchQuery]);

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

  const summary = {
    totalGoals: effectiveGoals.length,
    completedGoals: effectiveGoals.filter((goal) => calculateGoalProgress(goal) === 100).length,
    completedTasks: effectiveGoals.reduce((sum, goal) => sum + getGoalExecutionStats(goal).completed, 0),
    totalTasks: effectiveGoals.reduce((sum, goal) => sum + getGoalExecutionStats(goal).total, 0),
    activeSystems: effectiveGoals.filter((goal) => Boolean(goal.twelveWeekSystem)).length,
    dueSoon: effectiveGoals.filter((goal) => {
      const daysLeft = getCalendarDayDifference(goal.deadline);
      return calculateGoalProgress(goal) < 100 && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
    }).length,
    overdue: effectiveGoals.filter((goal) => {
      const daysLeft = getCalendarDayDifference(goal.deadline);
      return calculateGoalProgress(goal) < 100 && daysLeft !== null && daysLeft < 0;
    }).length,
    reviewDue: effectiveGoals.filter((goal) => getGoalExecutionStats(goal).reviewDueToday).length,
  };

  const completionRate = summary.totalTasks > 0 ? Math.round((summary.completedTasks / summary.totalTasks) * 100) : 0;
  const overviewItems = [
    {
      title: "Mục tiêu",
      value: summary.totalGoals,
      note: `${summary.completedGoals} đã hoàn thành`,
      icon: Target,
    },
    {
      title: "Việc",
      value: `${summary.completedTasks}/${summary.totalTasks}`,
      note: `${completionRate}% đã chốt`,
      icon: CheckCircle2,
    },
    {
      title: "12 tuần",
      value: summary.activeSystems,
      note: "chu kỳ đang chạy",
      icon: Zap,
    },
    {
      title: "Cần chú ý",
      value: summary.reviewDue + summary.overdue + summary.dueSoon,
      note: "review, quá hạn, sắp hạn",
      icon: AlertTriangle,
    },
  ];

  const renderGoalCard = (goal: UserData["goals"][number]) => {
    const progress = calculateGoalProgress(goal);
    const system = goal.twelveWeekSystem;
    const daysLeft = getCalendarDayDifference(goal.deadline);
    const isOverdue = daysLeft !== null && daysLeft < 0 && progress < 100;
    const isNearDeadline = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
    const systemCurrentWeek = system ? getTwelveWeekCurrentWeek(system) : null;
    const systemTodayOpenTasks = system ? getTwelveWeekTodayTasks(system).filter((task) => !task.completed) : [];
    const systemTodayTasks = system ? getTwelveWeekTodayTasks(system) : [];
    const completedTodayCount = systemTodayTasks.filter((t) => t.completed).length;
    const totalTodayCount = systemTodayTasks.length;
    const GoalArchetypeIcon = getGoalArchetypeIcon(system?.goalType ?? goal.category);

    const areaStyle = CATEGORY_STYLES[goal.category] ?? {
      bg: "bg-app-accent-soft text-app-accent",
      border: "border-app-accent/15",
      text: "text-app-accent",
    };

    return (
      <SpotlightCard
        key={goal.id}
        className={cn(
          "rounded-[18px] border p-5 md:p-6 overflow-hidden transition-all duration-300 hover:border-app-accent/30 hover:shadow-app-md",
          progress === 100
            ? "bg-emerald-50/15 dark:bg-emerald-950/5 border-emerald-500/25 dark:border-emerald-500/15"
            : "bg-app-surface border-app-line"
        )}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_1px_minmax(220px,1fr)]">
          {/* Cột trái — Goal summary */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex h-11 w-11 shrink-0 rounded-xl bg-app-accent-soft text-app-accent items-center justify-center mt-0.5 shadow-app-sm">
                  <GoalArchetypeIcon className="h-5.5 w-5.5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif text-lg font-bold text-app-ink leading-snug break-words group-hover:text-app-accent transition-colors duration-200">
                      {goal.title}
                    </h3>
                  </div>
                  <p className="text-xs text-app-ink-soft font-semibold">
                    {system ? `Tuần ${systemCurrentWeek ?? "-"}/12` : "Mục tiêu thường"} · <span className="text-app-accent font-bold">{getLifeAreaLabel(goal.category)}</span>
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-app-ink-muted hover:text-app-status-error hover:bg-app-status-error/10 transition-colors"
                onClick={() => setGoalToDelete(goal.id)}
                aria-label={`Xóa mục tiêu ${goal.title}`}
              >
                <Trash2 className="h-4.5 w-4.5" />
              </Button>
            </div>

            {/* Metadata pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className={`border text-xs font-bold rounded-full px-3 py-1 inline-flex items-center gap-1.5 shadow-app-sm ${areaStyle.bg} ${areaStyle.border} ${areaStyle.text}`}>
                <GoalArchetypeIcon className="h-3.5 w-3.5" />
                {getLifeAreaLabel(goal.category)}
              </span>
              {isNearDeadline && (
                <span className="bg-app-warm-soft border border-app-warm-border text-app-warm text-xs font-bold rounded-full px-3 py-1 shadow-app-sm">
                  Sắp đến hạn
                </span>
              )}
              {isOverdue && (
                <span className="bg-app-status-error/10 text-app-status-error border border-app-status-error/20 text-xs font-bold rounded-full px-3 py-1 shadow-app-sm">
                  Quá hạn
                </span>
              )}
              {system && (
                <span className="bg-app-bg border border-app-line text-app-ink-soft text-xs font-bold rounded-full px-3 py-1 shadow-app-sm">
                  {getPlanLabel(currentPlanCode)}
                </span>
              )}
            </div>

            {/* Progress block */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-app-ink-soft">Tiến độ</span>
                <span className="text-app-accent tabular-nums text-[13px]">
                  <CountUp value={progress} suffix="%" />
                </span>
              </div>
              <div className="h-2 rounded-full bg-app-accent-soft/60 overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full bg-gradient-to-r from-app-accent/80 to-app-accent transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Action row */}
            <div className="flex gap-2.5 pt-1">
              {system && (
                <Button
                  variant="outline"
                  className="rounded-lg border border-app-line bg-app-surface text-app-accent hover:bg-app-accent-soft px-4 py-2 text-xs font-bold transition-all duration-200"
                  onClick={() => openTwelveWeekCenter(goal.id)}
                >
                  Mở kế hoạch
                </Button>
              )}
              <Button
                variant="ghost"
                className="text-app-ink-muted hover:text-app-status-error hover:bg-app-status-error/10 text-xs font-bold px-3 py-2 rounded-lg transition-all duration-200"
                onClick={() => setGoalToDelete(goal.id)}
              >
                Xóa mục tiêu
              </Button>
            </div>
          </div>

          {/* Đường chia dọc trên desktop */}
          <div className="hidden lg:block w-px bg-app-line/60 my-2 animate-pulse" aria-hidden="true" />

          {/* Cột phải — Today tasks preview */}
          <div className="lg:pl-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-app-line/50 pb-2 mb-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-app-ink-muted">VIỆC HÔM NAY</p>
                <span className="text-xs font-extrabold tabular-nums text-app-accent">
                  {completedTodayCount}/{totalTodayCount}
                </span>
              </div>
              <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
                {systemTodayOpenTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="group/task flex items-center gap-3 rounded-lg border border-app-line/40 bg-app-bg-subtle/30 px-3 py-2 hover:border-app-accent/20 hover:bg-app-accent-subtle/20 transition-all duration-300">
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
                      className={`text-xs font-semibold line-clamp-1 transition-all duration-200 ${task.completed ? "line-through text-app-ink-muted opacity-70" : "text-app-ink"}`}
                    >
                      {task.title}
                    </span>
                  </div>
                ))}
                {systemTodayOpenTasks.length === 0 && (
                  <p className="text-xs italic leading-relaxed text-app-ink-muted/80 mt-2 pl-1">
                    Hôm nay chưa có việc mới. Hãy giữ nhịp độ hoặc mở kế hoạch để thêm cam kết.
                  </p>
                )}
              </div>
            </div>
            {system && (
              <button
                type="button"
                className="group/more mt-3 text-app-accent text-xs font-bold hover:text-app-accent-hover transition-colors duration-150 inline-flex items-center gap-0.5 self-start"
                onClick={() => openTwelveWeekCenter(goal.id)}
              >
                <span>Xem tất cả</span>
                <ArrowRight className="h-3 w-3 transform transition-transform duration-200 group-hover/more:translate-x-0.5" />
              </button>
            )}
          </div>
        </div>
      </SpotlightCard>
    );
  };

  return (
    <div className="stack-section mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 lg:px-8">
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

      {/* Grid Layout 2 Cột trên Desktop */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:gap-8">
        {/* Cột chính bên trái */}
        <div className="space-y-8">
          <div 
            data-tour-id="goaltracker-hero" 
            className="rounded-[18px] border border-app-line bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-emerald-100/30 dark:from-neutral-900 dark:via-emerald-950/10 dark:to-neutral-950 p-6 md:p-8 relative overflow-hidden shadow-app-sm hover:shadow-app-md transition-all duration-300"
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-app-accent/10 blur-3xl pointer-events-none" />
            <div className="grid gap-6 md:grid-cols-[1fr_240px] md:items-end relative z-10">
              <div className="space-y-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-app-accent flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-app-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-app-accent"></span>
                  </span>
                  MỤC TIÊU
                </p>
                <h1 className="font-serif text-3xl font-medium leading-tight tracking-normal text-app-ink sm:text-4xl">
                  Hành trình mục tiêu
                </h1>
                <p className="text-sm leading-relaxed text-app-ink-soft max-w-xl font-sans">
                  Tập trung vào những gì cốt lõi nhất. Chia nhỏ mục tiêu lớn thành các chu kỳ 12 tuần hành động đều đặn để tạo ra sự chuyển dịch thực sự.
                </p>
              </div>
              <div className="text-left md:text-right border-l md:border-l-0 border-app-line pl-4 md:pl-0 opacity-70">
                <p className="font-serif text-xs italic text-app-accent leading-relaxed">
                  “Những bước chân nhỏ bé đi đúng hướng sẽ đưa bạn đi rất xa.”
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-96 shadow-app-sm rounded-lg">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
              <input
                type="search"
                placeholder="Tìm theo tên hoặc mô tả..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-app-line bg-app-surface pl-10 pr-3.5 py-2.5 text-sm text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/30 focus:border-app-accent transition-all duration-200"
              />
            </div>
            <Button
              className="bg-app-accent text-white rounded-lg px-4 py-2.5 text-sm font-bold hover:bg-app-accent-hover transition-all duration-200 shadow-app-sm hover:shadow-app-md hover:scale-[1.02] inline-flex items-center gap-2"
              onClick={handleStartGuidedGoalFlow}
              disabled={hasReachedLimit(viewUserData, "maxActiveGoals")}
            >
              <Plus className="h-4 w-4" />
              Mục tiêu mới
            </Button>
          </div>

          <div data-tour-id="goaltracker-goals" className="space-y-6">
            {hasGoals && (
              <div className="border-b border-app-line pb-3 mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">Danh sách</p>
                <h2 className="mt-1 font-serif text-2xl font-medium tracking-normal text-app-ink">Mục tiêu của bạn</h2>
              </div>
            )}
            {!hasGoals ? (
              <EmptyState
                variant="card"
                icon={<Target className="h-10 w-10" />}
                title="Chưa có mục tiêu"
                description="Bắt đầu bằng chu kỳ 12 tuần đầu tiên — hoặc tạo mục tiêu thường nếu bạn chưa sẵn sàng."
                actions={
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <Button className="bg-app-accent text-white hover:bg-app-accent" onClick={handleStartGuidedGoalFlow}>
                      Bắt đầu chu kỳ 12 tuần →
                    </Button>
                    <Button
                      variant="outline"
                      className="border-app-line bg-app-surface text-app-ink hover:bg-app-bg"
                      onClick={handleStartGuidedGoalFlow}
                    >
                      Tạo mục tiêu thường
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="stack-section mt-6 space-y-8">
                {filteredTwelveWeekGoals.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-baseline justify-between border-b border-app-line/50 pb-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                          CHU KỲ 12 TUẦN
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-normal text-app-ink">Mục tiêu đang chạy</h2>
                        <p className="mt-1 text-xs text-app-ink-muted font-semibold">{filteredTwelveWeekGoals.length} mục tiêu</p>
                      </div>
                    </div>
                    <div className="stack-stack mt-4 space-y-4">
                      {filteredTwelveWeekGoals.map((goal) => (
                        <div key={goal.id}>{renderGoalCard(goal)}</div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredStandardGoals.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-baseline justify-between border-b border-app-line/50 pb-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">
                          MỤC TIÊU THƯỜNG
                        </p>
                        <h2 className="mt-1 font-serif text-xl font-bold tracking-normal text-app-ink">
                          {filteredStandardGoals.length} mục tiêu
                        </h2>
                      </div>
                    </div>
                    <div className="stack-stack mt-4 space-y-4">
                      {filteredStandardGoals.map((goal) => (
                        <div key={goal.id}>{renderGoalCard(goal)}</div>
                      ))}
                    </div>
                  </div>
                )}

                {searchQuery.trim() && filteredTwelveWeekGoals.length === 0 && filteredStandardGoals.length === 0 && (
                  <EmptyState
                    variant="dashed"
                    title="Không tìm thấy mục tiêu"
                    description={`Không tìm thấy mục tiêu nào khớp với "${searchQuery}"`}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar bên phải */}
        <aside className="space-y-6 lg:pt-2">
          <div data-tour-id="goaltracker-summary" className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            {overviewItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[18px] border border-app-line bg-gradient-to-b from-app-surface to-app-bg-subtle/40 p-4 relative overflow-hidden shadow-app-sm hover:border-app-accent/20 hover:shadow-app-md transition-all duration-300">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-app-ink-muted">{item.title}</p>
                      <p className="mt-2 font-serif text-3xl font-extrabold text-app-ink tabular-nums leading-none">
                        {typeof item.value === "number" ? <CountUp value={item.value} /> : item.value}
                      </p>
                      <p className="mt-2 text-[10px] font-semibold text-app-ink-muted">{item.note}</p>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent shadow-app-sm">
                      <Icon className="h-4.5 w-4.5 animate-pulse" />
                    </div>
                  </div>
                  {item.title === "Việc" && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-app-line/20 overflow-hidden" aria-hidden="true">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-app-accent transition-all duration-500 ease-out" style={{ width: `${completionRate}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Widget Nhắc nhở tĩnh tâm - Glassmorphism */}
          <div className="rounded-[18px] border border-white/40 dark:border-neutral-800/40 bg-white/70 dark:bg-neutral-900/60 p-5 shadow-app-sm backdrop-blur-md transition-all duration-300 hover:shadow-app-md">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-app-ink-muted mb-3 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-app-accent"></span>
              </span>
              NHẮC NHỞ TĨNH TÂM
            </h3>
            <p className="text-xs italic leading-relaxed text-app-ink-soft font-serif">
              “Đừng cố gắng làm mọi thứ. Hãy làm những điều thực sự quan trọng một cách trọn vẹn nhất.”
            </p>
            <div className="mt-4 pt-3 border-t border-app-line/60 flex items-center justify-between text-[10px] font-bold text-app-ink-muted">
              <span>Hôm nay</span>
              <span>·</span>
              <span>Chậm rãi & tập trung</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
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

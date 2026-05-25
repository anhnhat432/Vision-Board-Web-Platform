import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useOptionalAutoCloudSyncContext } from "@/features/plan12week/hooks/AutoCloudSyncProvider";
import { enqueueStoredMutation } from "@/features/plan12week/persistence/mutationQueue";
import { getPlanLink } from "@/features/plan12week/persistence/planLinkStore";
import { getTwelveWeekClientPlanId } from "@/features/plan12week/persistence/twelveWeekImportPayload";
import { isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { getBackendGoalId } from "@/lib/api/goalLinkStore";
import { useOptionalAuthContext } from "@/lib/auth/AuthContext";
import { AlertTriangle, CheckCircle2, Plus, Search, Target, Trash2, Zap } from "lucide-react";
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
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import { LoadingSpinner } from "../components/ui/loading-spinner";
import { useBackendProgressOverlayMap } from "../hooks/useBackendProgressOverlay";
import { usePlanEntitlements } from "../hooks/usePlanEntitlements";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { celebrateSpark, celebrateSpotlight } from "../utils/experience";
import { hasReachedLimit } from "../utils/feature-entitlements";
import {
  APP_STORAGE_KEYS,
  type UserData,
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

export function GoalTracker() {
  const { userData, reloadUserData } = useSyncedUserData();
  const authContext = useOptionalAuthContext();
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  if (!userData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
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
        } else {
          celebrateSpark({ x: 0.82, y: 0.14 });
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
        tasks: latestGoal.tasks.map((task) =>
          task.id === taskId ? { ...task, completed: nextCompleted, lastModifiedAt: now } : task,
        ),
      });
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
      } else {
        celebrateSpark({ x: 0.82, y: 0.14 });
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
    // Optimistic local update so the card disappears immediately without
    // waiting for the next render cycle (useEffect[userData] lag).
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
    const GoalArchetypeIcon = getGoalArchetypeIcon(system?.goalType ?? goal.category);

    return (
      <div key={goal.id} className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6 overflow-hidden">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,1fr)]">
          {/* Cột trái — Goal summary */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 rounded-lg bg-app-accent-soft text-app-accent items-center justify-center">
                  <GoalArchetypeIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-medium text-app-ink leading-snug break-words">{goal.title}</h3>
                  <p className="text-xs text-app-ink-muted mt-1">
                    Tuần {systemCurrentWeek ?? "-"}/12 · {getLifeAreaLabel(goal.category)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-app-ink-muted hover:text-[color:var(--color-danger-fg)]"
                onClick={() => setGoalToDelete(goal.id)}
                aria-label={`Xóa mục tiêu ${goal.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Metadata pills */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="bg-app-bg border border-app-line text-app-ink-soft text-xs rounded-full px-2.5 py-0.5">
                {getLifeAreaLabel(goal.category)}
              </span>
              {isNearDeadline && (
                <span className="bg-app-warm-soft text-app-warm text-xs rounded-full px-2.5 py-0.5">
                  Sắp đến hạn
                </span>
              )}
              {isOverdue && (
                <span className="bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)] border border-[color:var(--color-danger-border)] text-xs rounded-full px-2.5 py-0.5">
                  Quá hạn
                </span>
              )}
              {system && (
                <span className="bg-app-bg border border-app-line text-app-ink-soft text-xs rounded-full px-2.5 py-0.5">
                  {getPlanLabel(currentPlanCode)}
                </span>
              )}
            </div>

            {/* Progress block */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-app-ink-soft">Tiến độ</span>
                <span className="font-medium text-app-ink">
                  <CountUp value={progress} suffix="%" />
                </span>
              </div>
              <div className="h-2 rounded-full bg-app-accent-soft overflow-hidden mt-1">
                <div className="h-full bg-app-accent" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Action row */}
            <div className="mt-4 flex gap-2">
              {system && (
                <Button
                  variant="outline"
                  className="rounded-lg border border-app-line bg-app-surface text-app-accent hover:bg-app-accent-soft px-3 py-1.5 text-sm font-medium"
                  onClick={() => openTwelveWeekCenter(goal.id)}
                >
                  Mở kế hoạch
                </Button>
              )}
              <Button
                variant="ghost"
                className="text-app-ink-muted hover:text-[color:var(--color-danger-fg)] text-sm px-3"
                onClick={() => setGoalToDelete(goal.id)}
              >
                Xóa
              </Button>
            </div>
          </div>

          {/* Cột phải — Today tasks preview */}
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">VIỆC HÔM NAY</p>
              <span className="text-xs text-app-ink-muted">
                {systemTodayOpenTasks.filter((t) => !t.completed).length}/{systemTodayOpenTasks.length}
              </span>
            </div>
            <div className="mt-2 space-y-1 max-h-[100px] overflow-y-auto">
              {systemTodayOpenTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-2.5 py-1.5">
                  <input
                    type="checkbox"
                    checked={task.completed || false}
                    onChange={() => handleToggleTask(goal.id, task.id)}
                    className="size-4 rounded border-[1.5px] border-[#C8C2B6] bg-app-surface data-[state=checked]:bg-app-accent data-[state=checked]:border-app-accent"
                  />
                  <span
                    className={`text-sm line-clamp-1 ${task.completed ? "line-through text-app-ink-muted" : "text-app-ink"}`}
                  >
                    {task.title}
                  </span>
                </div>
              ))}
              {systemTodayOpenTasks.length === 0 && (
                <p className="text-xs text-app-ink-muted">Không có việc nào hôm nay</p>
              )}
            </div>
            {system && (
              <button
                type="button"
                className="mt-2 text-app-accent text-xs hover:underline"
                onClick={() => openTwelveWeekCenter(goal.id)}
              >
                Xem tất cả →
              </button>
            )}
          </div>
        </div>
      </div>
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
              className="bg-[color:var(--color-danger-fg)] hover:bg-[color:var(--color-danger-fg)]"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div data-tour-id="goaltracker-hero">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">MỤC TIÊU</p>
          <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-tight text-app-ink">
            Mục tiêu của bạn
          </h1>
          <p className="mt-2 text-sm text-app-ink-soft max-w-2xl">
            Theo dõi tiến độ tất cả mục tiêu hiện tại và cũ.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
              <input
                type="search"
                placeholder="Tìm theo tên hoặc mô tả..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-app-line bg-app-surface pl-10 pr-3.5 py-2.5 text-sm text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/30 focus:border-app-accent"
              />
            </div>
            <Button
              className="bg-app-accent text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#284f45] inline-flex items-center gap-2"
              onClick={handleStartGuidedGoalFlow}
              disabled={hasReachedLimit(viewUserData, "maxActiveGoals")}
            >
              <Plus className="h-4 w-4" />
              Mục tiêu mới
            </Button>
          </div>
        </div>
      </div>

      <div data-tour-id="goaltracker-summary" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {overviewItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="surface-raised rounded-xl border border-app-line bg-app-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">{item.title}</p>
                  <p className="mt-2 font-serif text-3xl font-medium text-app-ink tabular-nums">
                    {typeof item.value === "number" ? <CountUp value={item.value} /> : item.value}
                  </p>
                  <p className="mt-1 text-xs text-app-ink-muted">{item.note}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-app-bg text-app-accent">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div data-tour-id="goaltracker-goals">
        {hasGoals && (
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">Danh sách</p>
            <h2 className="mt-1 font-serif text-2xl font-medium text-app-ink">Mục tiêu của bạn</h2>
          </div>
        )}
        {!hasGoals ? (
          <div className="surface-empty rounded-2xl border border-dashed border-app-line bg-app-bg/50 p-8 text-center mt-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
              <Target className="h-10 w-10" />
            </div>
            <h2 className="mt-4 font-serif text-2xl font-medium text-app-ink">Chưa có mục tiêu</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-app-ink-soft">
              Bắt đầu bằng chu kỳ 12 tuần đầu tiên — hoặc tạo mục tiêu thường nếu bạn chưa sẵn sàng.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button className="bg-app-accent text-white hover:bg-[#284f45]" onClick={handleStartGuidedGoalFlow}>
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
          </div>
        ) : (
          <div className="stack-section mt-8">
            {filteredTwelveWeekGoals.length > 0 && (
              <div className="mb-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
                      CHU KỲ 12 TUẦN
                    </p>
                    <h2 className="mt-1 font-serif text-xl font-medium text-app-ink">Mục tiêu đang chạy</h2>
                    <p className="mt-1 text-xs text-app-ink-muted">{filteredTwelveWeekGoals.length} mục tiêu</p>
                  </div>
                </div>
                <div className="stack-stack mt-4 space-y-3">
                  {filteredTwelveWeekGoals.map((goal) => (
                    <div key={goal.id}>{renderGoalCard(goal)}</div>
                  ))}
                </div>
              </div>
            )}

            {filteredStandardGoals.length > 0 && (
              <div className="mt-8">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
                      MỤC TIÊU THƯỜNG
                    </p>
                    <h2 className="mt-1 font-serif text-xl font-medium text-app-ink">
                      {filteredStandardGoals.length} mục tiêu
                    </h2>
                  </div>
                </div>
                <div className="stack-stack mt-4 space-y-3">
                  {filteredStandardGoals.map((goal) => (
                    <div key={goal.id}>{renderGoalCard(goal)}</div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery.trim() && filteredTwelveWeekGoals.length === 0 && filteredStandardGoals.length === 0 && (
              <p className="py-12 text-center text-sm text-app-ink-muted">
                Không tìm thấy mục tiêu nào khớp với "{searchQuery}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

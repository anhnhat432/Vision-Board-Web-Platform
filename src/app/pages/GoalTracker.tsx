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
import { getGoalArchetypeIcon, MountainMoonIllustration } from "../components/illustrations";
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
  getLifeAreaLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTodayTasks,
  getUserData,
  type PricingPlanCode,
  recomputeGoalProgressFromWeeks,
  saveUserData,
  toggleTwelveWeekTask,
  type UserData,
  updateGoal,
} from "../utils/storage";
import {
  completedGoalStyle,
  type FocusGoalData,
  type GoalMetadata,
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

      <div className="space-y-[18px]">
        {/* HERO + FOCUS RAIL */}
        <section className="grid gap-[18px] lg:grid-cols-[1fr_320px]">
          {/* Hero Section */}
          <section
            data-tour-id="goaltracker-hero"
            className="relative grid overflow-hidden rounded-[var(--app-radius-card-lg)] border border-app-line bg-app-surface p-6 sm:p-[30px_32px] shadow-[var(--app-shadow-card)] lg:grid-cols-[minmax(0,1fr)_190px] lg:items-center lg:gap-6 dark:border-app-line/70 dark:bg-app-surface"
          >
            <div className="min-w-0">
              <div className="mb-3.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-app-accent" />
                Mục tiêu
              </div>
              <h1 className="font-serif text-[clamp(26px,3vw,36px)] font-extrabold leading-[1.04] tracking-[-0.02em] text-app-ink">
                Hành trình mục tiêu
              </h1>
              <p className="mt-3 max-w-[46ch] text-sm leading-[1.55] text-app-ink-soft">
                Tập trung vào những gì cốt lõi nhất. Chia nhỏ mục tiêu lớn thành các chu kỳ 12 tuần để hành động đều
                đặn.
              </p>
              <div className="mt-5 flex flex-col flex-wrap gap-2.5 sm:flex-row">
                <Button
                  className="inline-flex h-auto items-center justify-center gap-[9px] rounded-full bg-app-accent px-5 py-3 text-[13.5px] font-bold text-white shadow-[var(--app-shadow-sm)] transition-all duration-200 hover:bg-app-accent-hover sm:w-auto"
                  onClick={handleStartGuidedGoalFlow}
                >
                  <Zap className="h-4 w-4" />
                  Bắt đầu chu kỳ 12 tuần
                </Button>
                <Button
                  variant="outline"
                  className="inline-flex h-auto items-center justify-center gap-2 rounded-full border border-app-line/14 bg-app-surface px-5 py-3 text-[13.5px] font-semibold text-app-ink shadow-none transition-all duration-200 hover:bg-app-bg sm:w-auto dark:border-app-line dark:bg-app-surface"
                  onClick={handleStartDirectGoalFlow}
                >
                  <Plus className="h-4 w-4" />
                  Tạo nhanh mục tiêu
                </Button>
              </div>
            </div>
            <div className="relative mt-6 min-h-[170px] overflow-hidden rounded-2xl lg:mt-0 lg:h-full">
              <img
                src="/vision_board_detail.png"
                alt="Bản đồ tầm nhìn và mục tiêu"
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.85] dark:contrast-[1.05]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-app-accent/10 to-transparent" />
            </div>
          </section>

          {/* Focus Rail bên phải */}
          <div className="flex flex-col gap-[14px]">
            {/* Tiêu điểm hôm nay mini */}
            <div className="rounded-[18px] border border-app-line bg-app-surface p-5 shadow-[0_16px_36px_-28px_rgba(23,21,15,0.3)]">
              <div className="flex items-center gap-2 mb-3.5">
                <span className="w-1.5 h-1.5 rounded-full bg-app-accent shrink-0" />
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-app-accent">
                  Tiêu điểm hôm nay
                </p>
              </div>
              {focusGoal ? (
                (() => {
                  const { goal, isTwelveWeek } = focusGoal;
                  const system = goal.twelveWeekSystem;
                  const firstOpenTask =
                    isTwelveWeek && system
                      ? getTwelveWeekTodayTasks(system).find((t) => !t.completed) || null
                      : null;
                  return (
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full border-2 border-app-line/60 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        {firstOpenTask ? (
                          <>
                            <span
                              className="goaltracker-visual-text block text-[13.5px] font-semibold leading-[1.35] text-app-ink line-clamp-2"
                              data-visual-text={firstOpenTask.title}
                            />
                            <span
                              className="goaltracker-visual-text mt-1 block text-[11.5px] text-app-ink-muted line-clamp-1"
                              data-visual-text={goal.title}
                            />
                          </>
                        ) : (
                          <>
                            <span
                              className="goaltracker-visual-text block text-[13.5px] font-semibold leading-[1.35] text-app-ink line-clamp-2"
                              data-visual-text={goal.title}
                            />
                            <p className="text-xs text-app-ink-muted mt-1">
                              {isTwelveWeek && system
                                ? `Tuần ${getTwelveWeekCurrentWeek(system)}/12 · ${getLifeAreaLabel(goal.category)}`
                                : getLifeAreaLabel(goal.category)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs text-app-ink-muted italic">Không có tiêu điểm hành động cần xử lý.</p>
              )}
            </div>

            {/* Quote card */}
            <div className="rounded-[18px] bg-app-ink px-[22px] py-[20px] text-white relative overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(circle at 80% 0%, rgba(198,242,78,0.16), transparent 60%)",
                }}
              />
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C6F24E"
                strokeWidth="2"
                className="relative mb-2.5"
                aria-hidden="true"
              >
                <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
              </svg>
              <p className="relative font-serif italic text-[13.5px] leading-[1.5] text-app-bg">
                Đừng cố gắng làm mọi thứ. Hãy làm những điều thực sự quan trọng một cách trọn vẹn nhất.
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

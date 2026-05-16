import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Plus,
  Search,
  Target,
  Trash2,
  Zap,
} from "lucide-react";
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
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { CountUp } from "../components/ui/count-up";
import { EmptyGoalIllustration, EmptyHintArrow, getGoalArchetypeIcon } from "../components/illustrations";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import { Input } from "../components/ui/input";
import { LoadingSpinner } from "../components/ui/loading-spinner";
import { PageHero } from "../components/layout/PageHero";
import { SectionBlock } from "../components/layout/SectionBlock";
import { Progress } from "../components/ui/progress";
import { Reveal } from "../components/ui/reveal";
import { useBackendProgressOverlayMap } from "../hooks/useBackendProgressOverlay";
import { usePlanEntitlements } from "../hooks/usePlanEntitlements";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { celebrateSpark, celebrateSpotlight } from "../utils/experience";
import { FREE_TIER_LIMITS, getFreeTierUsage, hasReachedLimit } from "../utils/feature-entitlements";
import {
  APP_STORAGE_KEYS,
  LIFE_AREAS,
  type UserData,
  calculateGoalProgress,
  clearGoalPlanningDrafts,
  deleteGoal,
  formatCalendarDate,
  getCalendarDayDifference,
  getGoalExecutionStats,
  getLifeAreaLabel,
  getReviewDayLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTacticCount,
  getTwelveWeekTasksForWeek,
  getTwelveWeekTodayTasks,
  getTwelveWeekWeekRange,
  getUserData,
  isTwelveWeekReviewDueToday,
  recomputeGoalProgressFromWeeks,
  saveUserData,
  toggleTwelveWeekTask,
  updateGoal,
} from "../utils/storage";
import { generateId } from "../utils/storage-types";
import { getPlanLabel } from "../utils/twelve-week-premium";

const formatDeadline = (deadline: string) => {
  const formatted = formatCalendarDate(deadline);
  if (formatted !== "--") return formatted;

  const date = new Date(deadline);
  return Number.isNaN(date.getTime()) ? "Chưa có hạn" : date.toLocaleDateString("vi-VN");
};

const getSystemStatusLabel = (status?: string) => {
  if (status === "paused") return "Tạm dừng";
  if (status === "completed") return "Đã hoàn tất";
  return "Đang chạy";
};

export function GoalTracker() {
  const { userData, reloadUserData } = useSyncedUserData();
  const [newTask, setNewTask] = useState("");
  const [addingTaskToGoalId, setAddingTaskToGoalId] = useState<string | null>(null);
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
      newTask={newTask}
      setNewTask={setNewTask}
      addingTaskToGoalId={addingTaskToGoalId}
      setAddingTaskToGoalId={setAddingTaskToGoalId}
      goalToDelete={goalToDelete}
      setGoalToDelete={setGoalToDelete}
      onReload={reloadUserData}
    />
  );
}

function GoalTrackerContent({
  userData,
  newTask,
  setNewTask,
  addingTaskToGoalId,
  setAddingTaskToGoalId,
  goalToDelete,
  setGoalToDelete,
  onReload,
}: {
  userData: UserData;
  newTask: string;
  setNewTask: (value: string) => void;
  addingTaskToGoalId: string | null;
  setAddingTaskToGoalId: (value: string | null) => void;
  goalToDelete: string | null;
  setGoalToDelete: (value: string | null) => void;
  onReload: () => void;
}) {
  const navigate = useNavigate();
  const reload = onReload;
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
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

  const { currentPlanCode, hasPremiumReviewInsights } = usePlanEntitlements(viewUserData);

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
  const goalLimitUsage = getFreeTierUsage(viewUserData, "maxActiveGoals");
  const shouldShowFreeGoalLimit = currentPlanCode === "FREE" && Number.isFinite(FREE_TIER_LIMITS.maxActiveGoals);
  const hasRealLifeBalance = viewUserData.onboardingCompleted && viewUserData.currentWheelOfLife.some((area) => area.score > 0);
  const goalFlowStartHref = hasRealLifeBalance ? "/life-insight" : "/onboarding";
  const goalFlowStartLabel = hasRealLifeBalance ? "Tạo mục tiêu từ góc nhìn" : "Bắt đầu Cân bằng cuộc sống";
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

  const handleAddTask = (goalId: string) => {
    if (!newTask.trim()) return;

    const goal = viewUserData.goals.find((item) => item.id === goalId);
    if (!goal) return;

    if (goal.twelveWeekSystem) {
      toast.info("Chu kỳ 12 tuần được quản lý ở trung tâm 12 tuần.", {
        description: "Phần việc hằng ngày, check-in và review tuần đều nằm trong cùng một flow.",
      });
      openTwelveWeekCenter(goalId);
      return;
    }

    const now = Date.now();
    updateGoal(goalId, {
      tasks: [...goal.tasks, { id: generateId("task"), title: newTask.trim(), completed: false, lastModifiedAt: now }],
    });

    setNewTask("");
    setAddingTaskToGoalId(null);
    reload();
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

  const handleDeleteTask = (goalId: string, taskId: string) => {
    const goal = viewUserData.goals.find((item) => item.id === goalId);
    if (!goal) return;

    if (goal.twelveWeekSystem) {
      toast.info("Việc của chu kỳ 12 tuần nên xử lý ở trung tâm 12 tuần.", {
        description: "Màn này chỉ giữ phần tổng quan và điều hướng.",
      });
      openTwelveWeekCenter(goalId);
      return;
    }

    updateGoal(goalId, { tasks: goal.tasks.filter((task) => task.id !== taskId) });
    reload();
  };

  const handleConfirmDeleteGoal = () => {
    if (!goalToDelete) return;
    const snapshot = getUserData();
    deleteGoal(goalToDelete);
    setGoalToDelete(null);
    reload();
    toast.success("Mục tiêu đã được xóa.", {
      action: {
        label: "Hoàn tác",
        onClick: () => {
          saveUserData(snapshot);
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
  const priority = summary.reviewDue
    ? {
        icon: CalendarDays,
        eyebrow: "Ưu tiên hôm nay",
        title: "Chốt review tuần trước",
        note: "Có chu kỳ cần review. Chốt lại tuần cũ sẽ giúp tuần sau rõ hơn.",
        tone: "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)]",
        cta: "Mở 12 tuần",
      }
    : summary.overdue
      ? {
          icon: AlertTriangle,
          eyebrow: "Cần xử lý",
          title: `${summary.overdue} mục tiêu quá hạn`,
          note: "Nhìn nhóm này trước để quyết định giữ, chỉnh hoặc dừng.",
          tone: "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)]",
          cta: "Xem mục tiêu",
        }
      : summary.dueSoon
        ? {
            icon: Clock3,
            eyebrow: "Sắp đến hạn",
            title: `${summary.dueSoon} mục tiêu trong 7 ngày tới`,
            note: "Kiểm tra việc kế tiếp để tránh nước rút quá muộn.",
            tone: "border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]",
            cta: "Xem mục tiêu",
          }
        : twelveWeekGoals.length
          ? {
              icon: Zap,
              eyebrow: "Đang chạy tốt",
              title: "Tiếp tục chu kỳ 12 tuần",
              note: "Mở trung tâm 12 tuần để tick việc, check-in và review đúng nhịp.",
              tone: "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)]",
              cta: "Mở 12 tuần",
            }
          : {
              icon: Target,
              eyebrow: "Bắt đầu",
              title: "Tạo mục tiêu đầu tiên",
              note: "Đi từ Cân bằng cuộc sống để mục tiêu không bị viết vội hoặc quá rộng.",
              tone: "border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]",
              cta: goalFlowStartLabel,
            };
  const PriorityIcon = priority.icon;
  const handlePriorityAction = () => {
    if (priority.cta === "Xem mục tiêu" && hasGoals) {
      document.querySelector('[data-tour-id="goaltracker-goals"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (twelveWeekGoals[0]) {
      openTwelveWeekCenter(twelveWeekGoals[0].id);
      return;
    }

    handleStartGuidedGoalFlow();
  };
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
    const execution = getGoalExecutionStats(goal);
    const system = goal.twelveWeekSystem;
    const areaMeta = LIFE_AREAS.find((area) => area.name === goal.category);
    const daysLeft = getCalendarDayDifference(goal.deadline);
    const isOverdue = daysLeft !== null && daysLeft < 0 && progress < 100;
    const standardNextTask = !system ? (goal.tasks.find((task) => !task.completed) ?? null) : null;
    const systemCurrentWeek = system ? getTwelveWeekCurrentWeek(system) : null;
    const systemWeekRange = system && systemCurrentWeek ? getTwelveWeekWeekRange(system, systemCurrentWeek) : null;
    const systemReviewDueToday = Boolean(system && isTwelveWeekReviewDueToday(system));
    const systemTodayOpenTasks = system ? getTwelveWeekTodayTasks(system).filter((task) => !task.completed) : [];
    const GoalArchetypeIcon = getGoalArchetypeIcon(system?.goalType ?? goal.category);
    const nextSystemTask =
      systemTodayOpenTasks[0] ??
      (system && systemCurrentWeek
        ? (getTwelveWeekTasksForWeek(system, systemCurrentWeek).find((task) => !task.completed) ?? null)
        : null);

    return (
      <Card key={goal.id} className="overflow-hidden">
        <CardContent className="grid gap-[var(--space-stack)] p-5 sm:p-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
          <div className="rounded-[var(--r-card)] gradient-brand p-5 text-primary-foreground">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge className="text-white" style={{ backgroundColor: areaMeta?.color ?? "#7c3aed" }}>
                  {progress}%
                </Badge>
                <GoalArchetypeIcon className="h-7 w-7 text-white/80" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-[var(--r-tile)] text-white/60 hover:bg-white/10 hover:text-[color:var(--color-danger-bg)]"
                onClick={() => setGoalToDelete(goal.id)}
                aria-label={`Xóa mục tiêu ${goal.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <h3 className="mt-4 line-clamp-2 break-words text-2xl font-bold">{goal.title}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-7 text-white/68">
              {goal.description || "Chưa có mô tả ngắn cho mục tiêu này."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-white/12 bg-white/10 text-white">
                {getLifeAreaLabel(goal.category)}
              </Badge>
              {system && (
                <Badge variant="outline" className="border-white/12 bg-white/10 text-white">
                  12 tuần
                </Badge>
              )}
              {system && (
                <Badge variant="outline" className="border-white/12 bg-white/10 text-white">
                  Gói {getPlanLabel(currentPlanCode)}
                </Badge>
              )}
            </div>
            <div className="mt-[var(--space-stack)]">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-white/60">Tiến độ</span>
                <span className="font-semibold text-white">
                  <CountUp value={progress} suffix="%" />
                </span>
              </div>
              <Progress value={progress} className="h-2.5 bg-white/16" />
            </div>
            <div className="mt-[var(--space-stack)] stack-tight text-sm text-white/72">
              <div className={`flex items-center gap-2 ${isOverdue ? "text-[color:var(--color-warning-bg)]" : ""}`}>
                {isOverdue ? <AlertTriangle className="h-4 w-4" /> : <CalendarDays className="h-4 w-4 text-white/45" />}
                <span>
                  {daysLeft === null
                    ? "Chưa có ngày đích"
                    : isOverdue
                      ? `Quá hạn ${Math.abs(daysLeft)} ngày`
                      : progress === 100
                        ? "Đã hoàn thành"
                        : `${daysLeft} ngày còn lại`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-white/45" />
                <span>Ngày đích: {formatDeadline(goal.deadline)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-white/45" />
                <span>
                  {execution.completed}/{execution.total} việc đã chốt
                </span>
              </div>
            </div>
            <div className="mt-2 grid gap-2 lg:hidden">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-white/12 bg-white/10 text-white hover:bg-white/18"
                aria-expanded={expandedGoals.has(goal.id)}
                onClick={() =>
                  setExpandedGoals((prev) => {
                    const next = new Set(prev);
                    if (next.has(goal.id)) next.delete(goal.id);
                    else next.add(goal.id);
                    return next;
                  })
                }
              >
                {expandedGoals.has(goal.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {expandedGoals.has(goal.id) ? "Ẩn chi tiết" : "Xem chi tiết"}
              </Button>
              {system && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-card text-foreground hover:bg-[color:var(--muted)]"
                  onClick={() => openTwelveWeekCenter(goal.id)}
                >
                  <Zap className="h-4 w-4" />
                  Mở 12 tuần
                </Button>
              )}
            </div>
          </div>
          <div className={`${expandedGoals.has(goal.id) ? "block" : "hidden"} lg:block`}>
            {system ? (
              <div className="stack-stack">
                <div
                  className={`rounded-[var(--r-card)] border p-5 ${
                    systemReviewDueToday
                      ? "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)]"
                      : "border-white/10 gradient-brand text-primary-foreground"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.18em] ${systemReviewDueToday ? "text-[color:var(--color-warning-fg)]" : "text-white/60"}`}
                  >
                    Đi tiếp từ đây
                  </p>
                  <p className={`mt-[var(--space-inline)] text-xl font-semibold ${systemReviewDueToday ? "text-foreground" : "text-white"}`}>
                    {systemReviewDueToday
                      ? "Chốt review tuần"
                      : nextSystemTask
                        ? nextSystemTask.title
                        : "Hôm nay không còn việc mở"}
                  </p>
                  <p className={`mt-2 text-sm leading-7 ${systemReviewDueToday ? "text-muted-foreground" : "text-white/72"}`}>
                    {systemReviewDueToday
                      ? `Tuần ${systemCurrentWeek ?? system.currentWeek} đã đến lúc khóa lại. Chốt review trước để tuần sau vào nhịp gọn hơn.`
                      : nextSystemTask
                        ? `${systemTodayOpenTasks.length} việc đang mở hôm nay. ${
                            nextSystemTask.isCore
                              ? "Hãy bắt đầu từ việc cốt lõi này trước."
                              : "Đây là việc tùy chọn nếu bạn còn sức."
                          }`
                        : systemWeekRange
                          ? `Tuần ${systemCurrentWeek}/${system.totalWeeks} đang khá gọn (${formatCalendarDate(systemWeekRange.start)} - ${formatCalendarDate(systemWeekRange.end)}).`
                          : "Mở trung tâm 12 tuần để xem lại hàng việc và nhịp tuần hiện tại."}
                  </p>
                  {nextSystemTask && !systemReviewDueToday && (
                    <div className="mt-4 flex items-center gap-3 rounded-[var(--r-tile)] border border-white/12 bg-white/10 px-4 py-3">
                      <Checkbox
                        checked={nextSystemTask.completed}
                        onCheckedChange={() => handleToggleTask(goal.id, nextSystemTask.id)}
                        aria-label={`Đánh dấu việc ${nextSystemTask.title}`}
                        className="border-white/50 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-foreground"
                      />
                      <span className="flex-1 text-sm font-semibold text-white">{nextSystemTask.title}</span>
                    </div>
                  )}
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Button className="w-full sm:w-auto" onClick={() => openTwelveWeekCenter(goal.id)}>
                      <Zap className="h-4 w-4" />
                      Mở trung tâm 12 tuần
                    </Button>
                    <Button
                      variant="outline"
                      className={`w-full sm:w-auto ${
                        systemReviewDueToday
                          ? "border-[color:var(--color-warning-border)] bg-white text-[color:var(--color-warning-fg)] hover:bg-[color:var(--color-warning-bg)]"
                          : "border-white/12 bg-white/10 text-white hover:bg-white/16"
                      }`}
                      onClick={() => navigate("/journal")}
                    >
                      Mở nhật ký tuần
                    </Button>
                  </div>
                </div>

                <div className="rounded-[var(--r-card)] border border-[color:var(--color-info-border)] bg-white/78 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-info-fg)]">
                        Chu kỳ 12 tuần
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">Bức tranh nhanh của chu kỳ đang chạy</p>
                      {systemWeekRange && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatCalendarDate(systemWeekRange.start)} - {formatCalendarDate(systemWeekRange.end)}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]">
                      {getSystemStatusLabel(system.status)}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={
                        hasPremiumReviewInsights
                          ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)]"
                          : "border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]"
                      }
                    >
                      {hasPremiumReviewInsights ? "Góc nhìn review đã mở" : "Góc nhìn review đang khóa"}
                    </Badge>
                    {!hasPremiumReviewInsights && (
                      <Badge variant="outline" className="border-border bg-white text-muted-foreground">
                        Mở Plus để review rõ hơn
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-[var(--r-tile)] border border-white/80 bg-muted p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tuần</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {execution.currentWeek ?? system.currentWeek}
                        <span className="text-muted-foreground">/{system.totalWeeks}</span>
                      </p>
                    </div>
                    <div className="rounded-[var(--r-tile)] border border-white/80 bg-muted p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tiến độ tuần</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {execution.weekCompletion?.percent ?? 0}%
                      </p>
                    </div>
                    <div className="rounded-[var(--r-tile)] border border-white/80 bg-muted p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tactic</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{getTwelveWeekTacticCount(system)}</p>
                    </div>
                    <div className="rounded-[var(--r-tile)] border border-white/80 bg-muted p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Review</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {execution.reviewDueToday
                          ? "Đến hạn hôm nay"
                          : system.reviewDay
                            ? getReviewDayLabel(system.reviewDay)
                            : "Chưa chọn"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[var(--r-card)] border border-white/60 bg-white/80 p-5">
                <div className="flex justify-end">
                  <div className="sr-only" aria-hidden="true">
                    <p className="text-lg font-semibold text-foreground">Danh sách việc</p>
                    <p className="text-sm text-muted-foreground">Bẻ nhỏ mục tiêu thành những bước đủ rõ để làm tiếp.</p>
                  </div>
                  <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                    {goal.tasks.length} việc
                  </Badge>
                </div>
                <div className="mt-4 stack-tight">
                  {goal.tasks.length === 0 ? (
                    <div className="rounded-[var(--r-card)] border border-dashed border-border bg-muted px-5 py-7 text-center text-sm text-muted-foreground">
                      Chưa có việc nào. Hãy thêm bước đầu tiên để biến mục tiêu này thành hành động cụ thể.
                    </div>
                  ) : (
                    goal.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="group flex items-center gap-3 rounded-[var(--r-tile)] border border-white/70 bg-muted px-4 py-3"
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => handleToggleTask(goal.id, task.id)}
                          aria-label={`Đánh dấu việc ${task.title}`}
                        />
                        <span
                          className={`flex-1 text-sm ${task.completed ? "text-muted-foreground line-through" : "text-muted-foreground"}`}
                        >
                          {task.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 rounded-[var(--r-tile)] opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                          onClick={() => handleDeleteTask(goal.id, task.id)}
                          aria-label={`Xóa việc ${task.title}`}
                        >
                          <Trash2 className="h-4 w-4 text-[color:var(--color-danger-fg)]" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 rounded-[var(--r-card)] border border-border bg-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Việc kế tiếp</p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {standardNextTask
                      ? standardNextTask.title
                      : goal.tasks.length === 0
                        ? "Thêm bước đầu tiên"
                        : "Mọi việc hiện tại đã xong"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {standardNextTask
                      ? "Bắt đầu từ đúng việc này trước rồi mới mở thêm phần khác."
                      : goal.tasks.length === 0
                        ? "Chỉ cần một việc đầu tiên là mục tiêu sẽ bớt mơ hồ hơn nhiều."
                        : "Nếu muốn đi tiếp, hãy thêm việc mới cho chặng kế tiếp."}
                  </p>
                </div>
                <div className="mt-4 stack-tight border-t border-border pt-4">
                  {addingTaskToGoalId === goal.id ? (
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <Input
                        id={`new-task-${goal.id}`}
                        placeholder="Nhập việc tiếp theo..."
                        aria-label={`Việc mới cho mục tiêu ${goal.title}`}
                        value={newTask}
                        onChange={(event) => setNewTask(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleAddTask(goal.id);
                        }}
                        autoFocus
                      />
                      <Button variant="secondary" onClick={() => handleAddTask(goal.id)}>Thêm</Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAddingTaskToGoalId(null);
                          setNewTask("");
                        }}
                      >
                        Hủy
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => setAddingTaskToGoalId(goal.id)}>
                      <Plus className="h-4 w-4" />
                      Thêm việc
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="stack-section pb-12">
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
            <AlertDialogAction onClick={handleConfirmDeleteGoal} className="bg-[color:var(--color-danger-fg)] hover:bg-[color:var(--color-danger-fg)]">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div data-tour-id="goaltracker-hero">
        <PageHero
          titleAs={1}
          density="compact"
          className="page-enter"
          eyebrow="Mục tiêu"
          eyebrowIcon={<Target className="h-3.5 w-3.5" />}
          title={
            <>
              Mục tiêu và <span className="text-gradient-vibrant">bước tiếp theo</span>.
            </>
          }
          description={
            <>
              Xem nhanh mục tiêu, hạn chót và nơi cần mở tiếp. Việc hằng ngày của chu kỳ 12 tuần vẫn nằm trong
              trung tâm 12 tuần.
              {shouldShowFreeGoalLimit ? (
                <span className="mt-2 inline-flex rounded-[var(--r-pill)] border border-[color:var(--border)] bg-[color:var(--muted)] px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {goalLimitUsage.current}/{goalLimitUsage.limit} mục tiêu Free
                </span>
              ) : null}
            </>
          }
          primaryCta={
            <Button
              data-tour-id="goaltracker-create-goal"
              glow
              className="w-full sm:w-auto"
              onClick={handleStartGuidedGoalFlow}
            >
              <Target className="h-4 w-4" />
              {hasGoals ? "Tạo mục tiêu mới" : goalFlowStartLabel}
            </Button>
          }
          secondaryCta={
            twelveWeekGoals[0] ? (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => openTwelveWeekCenter(twelveWeekGoals[0].id)}
              >
                <Zap className="h-4 w-4" />
                Mở 12 tuần
              </Button>
            ) : undefined
          }
          aside={
            <div
              data-tour-id="goaltracker-start-card"
              className={`flex h-full flex-col gap-3 rounded-[var(--r-tile)] border p-4 shadow-[var(--shadow-1)] ${priority.tone}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-card/80">
                  <PriorityIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-75">{priority.eyebrow}</p>
                  <p className="mt-1 text-base font-semibold leading-6">{priority.title}</p>
                </div>
              </div>
              <p className="text-[13px] leading-6 opacity-80">{priority.note}</p>
              <Button className="mt-auto w-full" variant="outline" onClick={handlePriorityAction}>
                {priority.cta}
              </Button>
            </div>
          }
        />
      </div>

      <Card data-tour-id="goaltracker-summary" className="overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {overviewItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-[var(--r-tile)] border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-3 sm:px-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.title}</p>
                      <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
                        {typeof item.value === "number" ? <CountUp value={item.value} /> : item.value}
                      </p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r-control)] bg-card text-[color:var(--tone-shell-primary)]">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div data-tour-id="goaltracker-goals">
        {hasGoals && (
          <div className="mb-5 rounded-[var(--r-control)] border border-border bg-white/92 p-4 shadow-lg sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Danh sách</p>
                <h2 className="mt-1 text-xl font-bold tracking-normal text-foreground">Mục tiêu của bạn</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Chu kỳ 12 tuần nằm trước, mục tiêu thường nằm sau để bạn biết việc nào cần mở đúng trung tâm.
                </p>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Tìm mục tiêu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-[var(--r-control)] border border-border bg-white py-3 pl-11 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none transition-colors transition-shadow duration-150 focus:border-[color:var(--color-info-border)] focus:ring-2 focus:ring-ring/40"
                />
              </div>
            </div>
          </div>
        )}
        {!hasGoals ? (
          <Reveal delay={0.04}>
            <Card
              data-testid="goaltracker-fresh-empty-state"
              data-tour-id="goaltracker-empty-state"
              className="relative overflow-hidden"
            >
              <CardContent className="p-10 text-center lg:p-14">
                <EmptyGoalIllustration className="mx-auto mb-4 w-44 text-violet-500 sm:w-56" />
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[var(--r-control)] bg-[color:var(--color-info-bg)] text-[color:var(--color-info-fg)]">
                  <Target className="h-10 w-10" />
                </div>
                <h2 className="mt-6 text-3xl font-bold text-foreground">
                  Chưa có mục tiêu nào trong không gian làm việc của bạn
                </h2>
                <p className="mx-auto mt-[var(--space-inline)] max-w-2xl text-base text-muted-foreground">
                  Bắt đầu bằng Cân bằng cuộc sống để có dữ liệu thật, sau đó chọn Góc nhìn cuộc sống, viết mục tiêu
                  SMART, kiểm tra tính khả thi rồi mới tạo chu kỳ 12 tuần.
                </p>
                <EmptyHintArrow className="pointer-events-none absolute bottom-28 right-[18%] hidden h-10 w-10 text-fuchsia-500 opacity-65 sm:block" />
                <Button className="mt-8 w-full sm:w-auto" onClick={handleStartGuidedGoalFlow}>
                  <Target className="h-4 w-4" />
                  {goalFlowStartLabel}
                </Button>
                <div className="mx-auto mt-8 grid max-w-lg gap-3 text-left sm:grid-cols-3">
                  {[
                    { icon: Target, label: "Chấm Cân bằng cuộc sống" },
                    { icon: CheckCircle2, label: "Chọn Góc nhìn cuộc sống" },
                    { icon: Zap, label: "SMART + 12 tuần" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 rounded-[var(--r-control)] border border-[color:var(--color-info-border)] bg-white/80 px-4 py-3 text-sm text-muted-foreground"
                    >
                      <item.icon className="h-4 w-4 text-[color:var(--color-info-fg)]" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Reveal>
        ) : (
          <Reveal delay={0.04} className="stack-section">
            {filteredTwelveWeekGoals.length > 0 && (
              <SectionBlock
                title="Chu kỳ 12 tuần đang chạy"
                description="Nhóm này nên được nhìn trước vì việc hằng ngày và review đều nằm ở đây."
                className="[&>div:first-child]:flex [&>div:first-child]:flex-wrap [&>div:first-child]:items-center [&>div:first-child]:justify-between [&>div:first-child]:gap-[var(--space-inline)] [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground"
                data-tour-id="goaltracker-priority-section"
              >
                <div className="flex justify-end">
                  <div className="sr-only" aria-hidden="true">
                    <h2 className="text-2xl font-bold text-foreground">Chu kỳ 12 tuần đang chạy</h2>
                    <p className="text-sm text-muted-foreground">
                      Nhóm này nên được nhìn trước vì việc hằng ngày và review đều nằm ở đây.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-[var(--r-pill)] border-[color:var(--color-info-border)] bg-[color:var(--color-info-bg)] px-4 py-2 text-[color:var(--color-info-fg)]"
                  >
                    {filteredTwelveWeekGoals.length} chu kỳ
                  </Badge>
                </div>
                <div className="stack-stack">
                  {filteredTwelveWeekGoals.map((goal) => (
                    <div key={goal.id}>{renderGoalCard(goal)}</div>
                  ))}
                </div>
              </SectionBlock>
            )}

            {filteredStandardGoals.length > 0 && (
              <SectionBlock
                title="Mục tiêu thường"
                description="Những mục tiêu chưa vào chu kỳ 12 tuần, phù hợp để theo dõi theo dạng danh sách việc."
                className="[&>div:first-child]:flex [&>div:first-child]:flex-wrap [&>div:first-child]:items-center [&>div:first-child]:justify-between [&>div:first-child]:gap-[var(--space-inline)] [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground"
                data-tour-id="goaltracker-standard-section"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Mục tiêu thường</h2>
                    <p className="text-sm text-muted-foreground">
                      Những mục tiêu chưa vào chu kỳ 12 tuần, phù hợp để theo dõi theo dạng danh sách việc.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-[var(--r-pill)] border-white/70 bg-white/72 px-4 py-2 text-muted-foreground"
                  >
                    {filteredStandardGoals.length} mục tiêu
                  </Badge>
                </div>
                <div className="stack-stack">
                  {filteredStandardGoals.map((goal) => (
                    <div key={goal.id}>{renderGoalCard(goal)}</div>
                  ))}
                </div>
              </SectionBlock>
            )}

            {searchQuery.trim() && filteredTwelveWeekGoals.length === 0 && filteredStandardGoals.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Không tìm thấy mục tiêu nào khớp với "{searchQuery}"
              </p>
            )}
          </Reveal>
        )}
      </div>
    </div>
  );
}

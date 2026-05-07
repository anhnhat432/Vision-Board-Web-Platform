import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
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
import { Input } from "../components/ui/input";
import { LoadingSpinner } from "../components/ui/loading-spinner";
import { ProductVisual } from "../components/visuals/ProductVisual";
import { Progress } from "../components/ui/progress";
import { Reveal } from "../components/ui/reveal";
import { useBackendProgressOverlayMap } from "../hooks/useBackendProgressOverlay";
import { usePlanEntitlements } from "../hooks/usePlanEntitlements";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { celebrateSpark, celebrateSpotlight } from "../utils/experience";
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
  saveUserData,
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
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const { currentPlanCode, hasPremiumReviewInsights } = usePlanEntitlements(userData);

  const goals = useMemo(
    () =>
      [...userData.goals].sort((left, right) => {
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
    [userData.goals],
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

        const effectiveSystem = backendSystemsByGoalId.get(goal.id);
        if (!effectiveSystem) return goal;

        return {
          ...goal,
          twelveWeekSystem: effectiveSystem,
        };
      }),
    [backendSystemsByGoalId, goals],
  );
  const hasGoals = effectiveGoals.length > 0;
  const hasRealLifeBalance = userData.onboardingCompleted && userData.currentWheelOfLife.some((area) => area.score > 0);
  const goalFlowStartHref = hasRealLifeBalance ? "/life-insight" : "/onboarding";
  const goalFlowStartLabel = hasRealLifeBalance ? "Tạo mục tiêu từ insight" : "Bắt đầu Life Balance";
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

  const reload = onReload;

  const openTwelveWeekCenter = (goalId: string) => {
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, goalId);
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, goalId);
    navigate("/12-week-system");
  };

  const handleStartGuidedGoalFlow = () => {
    clearGoalPlanningDrafts();
    navigate(goalFlowStartHref);
  };

  const handleAddTask = (goalId: string) => {
    if (!newTask.trim()) return;

    const goal = userData.goals.find((item) => item.id === goalId);
    if (!goal) return;

    if (goal.twelveWeekSystem) {
      toast.info("Chu kỳ 12 tuần được quản lý ở trung tâm 12 tuần.", {
        description: "Phần việc hằng ngày, check-in và review tuần đều nằm trong cùng một flow.",
      });
      openTwelveWeekCenter(goalId);
      return;
    }

    updateGoal(goalId, {
      tasks: [...goal.tasks, { id: generateId("task"), title: newTask.trim(), completed: false }],
    });

    setNewTask("");
    setAddingTaskToGoalId(null);
    reload();
  };

  const handleToggleTask = (goalId: string, taskId: string) => {
    const goal = userData.goals.find((item) => item.id === goalId);
    if (!goal) return;

    if (goal.twelveWeekSystem) {
      toast.info("Hãy tick việc này trong trung tâm 12 tuần.", {
        description: "Màn Mục tiêu giờ chỉ giữ vai trò tổng quan cho các chu kỳ 12 tuần.",
      });
      openTwelveWeekCenter(goalId);
      return;
    }

    const previousProgress = calculateGoalProgress(goal);
    const taskWasCompleted = Boolean(goal.tasks.find((task) => task.id === taskId)?.completed);

    updateGoal(goalId, {
      tasks: goal.tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)),
    });

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
    const goal = userData.goals.find((item) => item.id === goalId);
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
        tone: "border-amber-200 bg-amber-50 text-amber-900",
        cta: "Mở 12 tuần",
      }
    : summary.overdue
      ? {
          icon: AlertTriangle,
          eyebrow: "Cần xử lý",
          title: `${summary.overdue} mục tiêu quá hạn`,
          note: "Nhìn nhóm này trước để quyết định giữ, chỉnh hoặc dừng.",
          tone: "border-red-200 bg-red-50 text-red-900",
          cta: "Xem mục tiêu",
        }
      : summary.dueSoon
        ? {
            icon: Clock3,
            eyebrow: "Sắp đến hạn",
            title: `${summary.dueSoon} mục tiêu trong 7 ngày tới`,
            note: "Kiểm tra việc kế tiếp để tránh nước rút quá muộn.",
            tone: "border-sky-200 bg-sky-50 text-sky-900",
            cta: "Xem mục tiêu",
          }
        : twelveWeekGoals.length
          ? {
              icon: Zap,
              eyebrow: "Đang chạy tốt",
              title: "Tiếp tục chu kỳ 12 tuần",
              note: "Mở trung tâm 12 tuần để tick việc, check-in và review đúng nhịp.",
              tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
              cta: "Mở 12 tuần",
            }
          : {
              icon: Target,
              eyebrow: "Bắt đầu",
              title: "Tạo mục tiêu đầu tiên",
              note: "Đi từ Life Balance để mục tiêu không bị viết vội hoặc quá rộng.",
              tone: "border-violet-200 bg-violet-50 text-violet-900",
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
    const nextSystemTask =
      systemTodayOpenTasks[0] ??
      (system && systemCurrentWeek
        ? (getTwelveWeekTasksForWeek(system, systemCurrentWeek).find((task) => !task.completed) ?? null)
        : null);

    return (
      <Card key={goal.id} className="flow-panel overflow-hidden">
        <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
          <div className="rounded-[26px] gradient-dark p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <Badge className="text-white" style={{ backgroundColor: areaMeta?.color ?? "#7c3aed" }}>
                {progress}%
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-2xl text-white/60 hover:bg-white/10 hover:text-red-300"
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
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-white/60">Tiến độ</span>
                <span className="font-semibold text-white">
                  <CountUp value={progress} suffix="%" />
                </span>
              </div>
              <Progress value={progress} className="h-2.5 bg-white/16" />
            </div>
            <div className="mt-5 space-y-3 text-sm text-white/72">
              <div className={`flex items-center gap-2 ${isOverdue ? "text-red-300" : ""}`}>
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
                  size="sm"
                  className="hero-cta w-full bg-white text-slate-900 hover:bg-white/92"
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
              <div className="space-y-4">
                <div
                  className={`rounded-[26px] border p-5 ${
                    systemReviewDueToday
                      ? "border-amber-200 bg-amber-50/92"
                      : "border-slate-900/10 gradient-dark-indigo text-white"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.18em] ${systemReviewDueToday ? "text-amber-700" : "text-white/60"}`}
                  >
                    Đi tiếp từ đây
                  </p>
                  <p className={`mt-3 text-xl font-semibold ${systemReviewDueToday ? "text-slate-950" : "text-white"}`}>
                    {systemReviewDueToday
                      ? "Chốt review tuần"
                      : nextSystemTask
                        ? nextSystemTask.title
                        : "Hôm nay không còn việc mở"}
                  </p>
                  <p className={`mt-2 text-sm leading-7 ${systemReviewDueToday ? "text-slate-600" : "text-white/72"}`}>
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
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Button className="w-full sm:w-auto" onClick={() => openTwelveWeekCenter(goal.id)}>
                      <Zap className="h-4 w-4" />
                      Mở trung tâm 12 tuần
                    </Button>
                    <Button
                      variant="outline"
                      className={`w-full sm:w-auto ${
                        systemReviewDueToday
                          ? "border-amber-200 bg-white text-amber-800 hover:bg-amber-100"
                          : "border-white/12 bg-white/10 text-white hover:bg-white/16"
                      }`}
                      onClick={() => navigate("/journal")}
                    >
                      Mở nhật ký tuần
                    </Button>
                  </div>
                </div>

                <div className="rounded-[26px] border border-violet-200/70 bg-white/78 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                        Chu kỳ 12 tuần
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">Bức tranh nhanh của chu kỳ đang chạy</p>
                      {systemWeekRange && (
                        <p className="mt-1 text-sm text-slate-500">
                          {formatCalendarDate(systemWeekRange.start)} - {formatCalendarDate(systemWeekRange.end)}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                      {getSystemStatusLabel(system.status)}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={
                        hasPremiumReviewInsights
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-violet-200 bg-violet-50 text-violet-700"
                      }
                    >
                      {hasPremiumReviewInsights ? "Insight review đã mở" : "Insight review đang khóa"}
                    </Badge>
                    {!hasPremiumReviewInsights && (
                      <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                        Mở Plus để review rõ hơn
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-[20px] border border-white/80 bg-slate-50/88 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Tuần</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {execution.currentWeek ?? system.currentWeek}
                        <span className="text-slate-400">/{system.totalWeeks}</span>
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-white/80 bg-slate-50/88 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Tiến độ tuần</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">
                        {execution.weekCompletion?.percent ?? 0}%
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-white/80 bg-slate-50/88 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Tactic</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{getTwelveWeekTacticCount(system)}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/80 bg-slate-50/88 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Review</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
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
              <div className="rounded-[26px] border border-white/60 bg-white/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">Danh sách việc</p>
                    <p className="text-sm text-slate-500">Bẻ nhỏ mục tiêu thành những bước đủ rõ để làm tiếp.</p>
                  </div>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                    {goal.tasks.length} việc
                  </Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {goal.tasks.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-7 text-center text-sm text-slate-500">
                      Chưa có việc nào. Hãy thêm bước đầu tiên để biến mục tiêu này thành hành động cụ thể.
                    </div>
                  ) : (
                    goal.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="group flex items-center gap-3 rounded-[20px] border border-white/70 bg-slate-50/82 px-4 py-3"
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => handleToggleTask(goal.id, task.id)}
                          aria-label={`Đánh dấu việc ${task.title}`}
                        />
                        <span
                          className={`flex-1 text-sm ${task.completed ? "text-slate-400 line-through" : "text-slate-700"}`}
                        >
                          {task.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-2xl opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                          onClick={() => handleDeleteTask(goal.id, task.id)}
                          aria-label={`Xóa việc ${task.title}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/82 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Việc kế tiếp</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {standardNextTask
                      ? standardNextTask.title
                      : goal.tasks.length === 0
                        ? "Thêm bước đầu tiên"
                        : "Mọi việc hiện tại đã xong"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {standardNextTask
                      ? "Bắt đầu từ đúng việc này trước rồi mới mở thêm phần khác."
                      : goal.tasks.length === 0
                        ? "Chỉ cần một việc đầu tiên là mục tiêu sẽ bớt mơ hồ hơn nhiều."
                        : "Nếu muốn đi tiếp, hãy thêm việc mới cho chặng kế tiếp."}
                  </p>
                </div>
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
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
                      <Button onClick={() => handleAddTask(goal.id)}>Thêm</Button>
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
    <div className="flow-shell space-y-5 pb-12">
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
            <AlertDialogAction onClick={handleConfirmDeleteGoal} className="bg-red-600 hover:bg-red-700">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card data-tour-id="goaltracker-hero" className="flow-panel overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div data-tour-id="goaltracker-start-card" className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <Target className="h-3.5 w-3.5" />
                Mục tiêu
              </div>
              <div className="max-w-3xl">
                <h1 className="break-words text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">
                  Mục tiêu và bước tiếp theo.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  Xem nhanh mục tiêu, hạn chót và nơi cần mở tiếp. Việc hằng ngày của chu kỳ 12 tuần vẫn nằm trong
                  trung tâm 12 tuần.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                <Button
                  data-tour-id="goaltracker-create-goal"
                  className="col-span-2 w-full sm:w-auto"
                  onClick={handleStartGuidedGoalFlow}
                >
                  <Target className="h-4 w-4" />
                  {hasGoals ? "Tạo mục tiêu mới" : goalFlowStartLabel}
                </Button>
                {twelveWeekGoals[0] && (
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => openTwelveWeekCenter(twelveWeekGoals[0].id)}>
                    <Zap className="h-4 w-4" />
                    Mở 12 tuần
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <ProductVisual variant="execution" className="min-h-[170px]" />
              <div className={`rounded-lg border p-4 shadow-[0_16px_42px_-34px_rgba(15,23,42,0.34)] ${priority.tone}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/75">
                    <PriorityIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">{priority.eyebrow}</p>
                    <p className="mt-2 text-lg font-semibold leading-6">{priority.title}</p>
                    <p className="mt-2 text-sm leading-6 opacity-75">{priority.note}</p>
                  </div>
                </div>
                <Button className="mt-4 w-full" variant="outline" onClick={handlePriorityAction}>
                  {priority.cta}
                </Button>
              </div>
            </div>
          </div>

          <div data-tour-id="goaltracker-summary" className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {overviewItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50/75 px-3 py-3 sm:px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{item.title}</p>
                      <p className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
                        {typeof item.value === "number" ? <CountUp value={item.value} /> : item.value}
                      </p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{item.note}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div data-tour-id="goaltracker-goals">
        {hasGoals && (
          <div className="mb-5 rounded-lg border border-slate-200 bg-white/92 p-4 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.28)] sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Danh sách</p>
                <h2 className="mt-1 text-xl font-bold tracking-normal text-slate-950">Mục tiêu của bạn</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Chu kỳ 12 tuần nằm trước, mục tiêu thường nằm sau để bạn biết việc nào cần mở đúng trung tâm.
                </p>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Tìm mục tiêu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-colors transition-shadow duration-150 focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
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
              className="flow-panel overflow-hidden"
            >
              <CardContent className="p-10 text-center lg:p-14">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                  <Target className="h-10 w-10" />
                </div>
                <h2 className="mt-6 text-3xl font-bold text-slate-900">Chưa có mục tiêu nào trong workspace của bạn</h2>
                <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500">
                  Bắt đầu bằng Life Balance để có dữ liệu thật, sau đó chọn Life Insight, viết SMART goal, kiểm tra
                  feasibility rồi mới tạo chu kỳ 12 tuần.
                </p>
                <Button className="mt-8 w-full sm:w-auto" onClick={handleStartGuidedGoalFlow}>
                  <Target className="h-4 w-4" />
                  {goalFlowStartLabel}
                </Button>
                <div className="mx-auto mt-8 grid max-w-lg gap-3 text-left sm:grid-cols-3">
                  {[
                    { icon: Target, label: "Chấm Life Balance" },
                    { icon: CheckCircle2, label: "Chọn Life Insight" },
                    { icon: Zap, label: "SMART + 12 tuần" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-white/80 px-4 py-3 text-sm text-slate-600"
                    >
                      <item.icon className="h-4 w-4 text-indigo-500" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Reveal>
        ) : (
          <Reveal delay={0.04} className="space-y-8">
            {filteredTwelveWeekGoals.length > 0 && (
              <section data-tour-id="goaltracker-priority-section" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Chu kỳ 12 tuần đang chạy</h2>
                    <p className="text-sm text-slate-500">
                      Nhóm này nên được nhìn trước vì việc hằng ngày và review đều nằm ở đây.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full border-violet-200 bg-violet-50 px-4 py-2 text-violet-700"
                  >
                    {filteredTwelveWeekGoals.length} chu kỳ
                  </Badge>
                </div>
                <div className="space-y-5">
                  <AnimatePresence>
                    {filteredTwelveWeekGoals.map((goal) => (
                      <motion.div
                        key={goal.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.25 }}
                      >
                        {renderGoalCard(goal)}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {filteredStandardGoals.length > 0 && (
              <section data-tour-id="goaltracker-standard-section" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Mục tiêu thường</h2>
                    <p className="text-sm text-slate-500">
                      Những mục tiêu chưa vào chu kỳ 12 tuần, phù hợp để theo dõi theo dạng danh sách việc.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="rounded-full border-white/70 bg-white/72 px-4 py-2 text-slate-600"
                  >
                    {filteredStandardGoals.length} mục tiêu
                  </Badge>
                </div>
                <div className="space-y-5">
                  <AnimatePresence>
                    {filteredStandardGoals.map((goal) => (
                      <motion.div
                        key={goal.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.25 }}
                      >
                        {renderGoalCard(goal)}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {searchQuery.trim() && filteredTwelveWeekGoals.length === 0 && filteredStandardGoals.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-500">
                Không tìm thấy mục tiêu nào khớp với "{searchQuery}"
              </p>
            )}
          </Reveal>
        )}
      </div>
    </div>
  );
}

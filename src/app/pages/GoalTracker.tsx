import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Crown, Plus, Target, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { CountUp } from "../components/ui/count-up";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import { Reveal } from "../components/ui/reveal";
import {
  celebrateSpark,
  celebrateSpotlight,
} from "../utils/experience";
import {
  APP_STORAGE_KEYS,
  LIFE_AREAS,
  type PricingPlanCode,
  UserData,
  calculateGoalProgress,
  clearGoalPlanningDrafts,
  deleteGoal,
  formatCalendarDate,
  getCalendarDayDifference,
  getCurrentEntitlementKeys,
  getCurrentPlan,
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
  updateGoal,
} from "../utils/storage";
import { trackPaywallCtaClicked } from "../utils/monetization-analytics";
import {
  getEntitlementLabel,
  getPlanDefinition,
  getPlanLabel,
  type PremiumFeatureContext,
} from "../utils/twelve-week-premium";

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
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<PremiumFeatureContext>("plan");
  const [recommendedPlan, setRecommendedPlan] = useState<Exclude<PricingPlanCode, "FREE">>("PLUS");
  const [newTask, setNewTask] = useState("");
  const [addingTaskToGoalId, setAddingTaskToGoalId] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  useEffect(() => {
    setUserData(getUserData());
  }, []);

  if (!userData) return null;

  const reload = () => setUserData(getUserData());
  const openUpgradeDialog = (
    context: PremiumFeatureContext,
    planCode: Exclude<PricingPlanCode, "FREE"> = "PLUS",
  ) => {
    trackPaywallCtaClicked({
      goalId: twelveWeekGoals[0]?.id,
      context,
      source: "goal_tracker",
      currentPlan: currentPlanCode,
      recommendedPlan: planCode,
      targetPlan: planCode,
      placement: "goal_tracker_plan_card",
    });
    setUpgradeContext(context);
    setRecommendedPlan(planCode);
    setIsUpgradeDialogOpen(true);
  };
  const currentPlanCode = getCurrentPlan(userData);
  const currentPlanDefinition = getPlanDefinition(currentPlanCode);
  const entitlementKeys = getCurrentEntitlementKeys(userData);
  const hasPremiumReviewInsights = entitlementKeys.includes("premium_review_insights");
  const premiumStatusItems = [
    "premium_templates",
    "premium_review_insights",
    "priority_reminders",
    "advanced_analytics",
  ] as const;

  const openTwelveWeekCenter = (goalId: string) => {
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, goalId);
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, goalId);
    navigate("/12-week-system");
  };

  const handleStartGuidedGoalFlow = () => {
    clearGoalPlanningDrafts();
    navigate("/life-insight");
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
      tasks: [...goal.tasks, { id: `task_${Date.now()}`, title: newTask.trim(), completed: false }],
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

    setUserData(afterData);
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
    deleteGoal(goalToDelete);
    setGoalToDelete(null);
    reload();
  };

  const summary = {
    totalGoals: userData.goals.length,
    completedGoals: userData.goals.filter((goal) => calculateGoalProgress(goal) === 100).length,
    completedTasks: userData.goals.reduce((sum, goal) => sum + getGoalExecutionStats(goal).completed, 0),
    totalTasks: userData.goals.reduce((sum, goal) => sum + getGoalExecutionStats(goal).total, 0),
    activeSystems: userData.goals.filter((goal) => Boolean(goal.twelveWeekSystem)).length,
    dueSoon: userData.goals.filter((goal) => {
      const daysLeft = getCalendarDayDifference(goal.deadline);
      return calculateGoalProgress(goal) < 100 && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
    }).length,
    overdue: userData.goals.filter((goal) => {
      const daysLeft = getCalendarDayDifference(goal.deadline);
      return calculateGoalProgress(goal) < 100 && daysLeft !== null && daysLeft < 0;
    }).length,
    reviewDue: userData.goals.filter((goal) => getGoalExecutionStats(goal).reviewDueToday).length,
  };

  const goals = [...userData.goals].sort((left, right) => {
    const leftProgress = calculateGoalProgress(left);
    const rightProgress = calculateGoalProgress(right);

    if ((leftProgress === 100) !== (rightProgress === 100)) {
      return leftProgress === 100 ? 1 : -1;
    }

    const leftDays = getCalendarDayDifference(left.deadline) ?? Number.MAX_SAFE_INTEGER;
    const rightDays = getCalendarDayDifference(right.deadline) ?? Number.MAX_SAFE_INTEGER;
    if (leftDays !== rightDays) return leftDays - rightDays;

    return left.title.localeCompare(right.title, "vi");
  });

  const twelveWeekGoals = goals.filter((goal) => Boolean(goal.twelveWeekSystem));
  const standardGoals = goals.filter((goal) => !goal.twelveWeekSystem);

  const summaryCards = [
    {
      title: "Mục tiêu đang theo",
      value: summary.totalGoals,
      note: "đang cần được giữ nhịp",
      icon: Target,
      cardClass:
        "border-0 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(30,41,59,0.94)_100%)] text-white shadow-[0_28px_65px_-38px_rgba(15,23,42,0.62)]",
      iconClass: "bg-white/10 text-white",
      titleClass: "text-white/56",
      noteClass: "text-white/68",
    },
    {
      title: "Việc đã chốt",
      value: summary.completedTasks,
      note: `trên tổng số ${summary.totalTasks}`,
      icon: CheckCircle2,
      cardClass:
        "border-0 bg-[linear-gradient(180deg,_rgba(236,253,245,0.95)_0%,_rgba(209,250,229,0.82)_100%)] shadow-[0_24px_55px_-34px_rgba(5,150,105,0.18)]",
      iconClass: "bg-white/80 text-emerald-700",
      titleClass: "text-slate-500",
      noteClass: "text-slate-600",
    },
    {
      title: "Sắp đến hạn",
      value: summary.dueSoon,
      note: "mục tiêu trong 7 ngày tới",
      icon: Clock3,
      cardClass:
        "border-0 bg-[linear-gradient(180deg,_rgba(254,243,199,0.95)_0%,_rgba(253,230,138,0.82)_100%)] shadow-[0_24px_55px_-34px_rgba(217,119,6,0.18)]",
      iconClass: "bg-white/80 text-amber-700",
      titleClass: "text-slate-500",
      noteClass: "text-slate-600",
    },
    {
      title: "Chu kỳ 12 tuần",
      value: summary.activeSystems,
      note: "đang chạy theo hệ thống",
      icon: Zap,
      cardClass:
        "border-0 bg-[linear-gradient(180deg,_rgba(219,234,254,0.95)_0%,_rgba(191,219,254,0.82)_100%)] shadow-[0_24px_55px_-34px_rgba(37,99,235,0.2)]",
      iconClass: "bg-white/80 text-sky-700",
      titleClass: "text-slate-500",
      noteClass: "text-slate-600",
    },
  ];

  const renderGoalCard = (goal: UserData["goals"][number]) => {
    const progress = calculateGoalProgress(goal);
    const execution = getGoalExecutionStats(goal);
    const system = goal.twelveWeekSystem;
    const areaMeta = LIFE_AREAS.find((area) => area.name === goal.category);
    const daysLeft = getCalendarDayDifference(goal.deadline);
    const isOverdue = daysLeft !== null && daysLeft < 0 && progress < 100;
    const standardNextTask = !system ? goal.tasks.find((task) => !task.completed) ?? null : null;
    const systemCurrentWeek = system ? getTwelveWeekCurrentWeek(system) : null;
    const systemWeekRange = system && systemCurrentWeek ? getTwelveWeekWeekRange(system, systemCurrentWeek) : null;
    const systemReviewDueToday = Boolean(system && isTwelveWeekReviewDueToday(system));
    const systemTodayOpenTasks = system ? getTwelveWeekTodayTasks(system).filter((task) => !task.completed) : [];
    const nextSystemTask =
      systemTodayOpenTasks[0] ??
      (system && systemCurrentWeek ? getTwelveWeekTasksForWeek(system, systemCurrentWeek).find((task) => !task.completed) ?? null : null);

    return (
      <Card
        key={goal.id}
        className={`overflow-hidden border-0 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.22)] ${system ? "bg-[linear-gradient(180deg,_rgba(238,242,255,0.95)_0%,_rgba(224,231,255,0.84)_100%)]" : "bg-[linear-gradient(180deg,_rgba(226,232,240,0.94)_0%,_rgba(203,213,225,0.82)_100%)]"}`}
      >
        <CardContent className="grid gap-5 p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-[26px] bg-[linear-gradient(135deg,_rgba(15,23,42,0.98)_0%,_rgba(30,41,59,0.94)_100%)] p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <Badge className="text-white" style={{ backgroundColor: areaMeta?.color ?? "#7c3aed" }}>{progress}%</Badge>
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
            <h3 className="mt-4 text-2xl font-bold">{goal.title}</h3>
            <p className="mt-2 text-sm leading-7 text-white/68">{goal.description || "Chưa có mô tả ngắn cho mục tiêu này."}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-white/12 bg-white/10 text-white">{getLifeAreaLabel(goal.category)}</Badge>
              {system && <Badge variant="outline" className="border-white/12 bg-white/10 text-white">Chu kỳ 12 tuần</Badge>}
              {system && <Badge variant="outline" className="border-white/12 bg-white/10 text-white">Gói {getPlanLabel(currentPlanCode)}</Badge>}
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-white/60">Tiến độ</span>
                <span className="font-semibold text-white"><CountUp value={progress} suffix="%" /></span>
              </div>
              <Progress value={progress} className="h-2.5 bg-white/16" />
            </div>
            <div className="mt-5 space-y-3 text-sm text-white/72">
              <div className={`flex items-center gap-2 ${isOverdue ? "text-red-300" : ""}`}>
                {isOverdue ? <AlertTriangle className="h-4 w-4" /> : <CalendarDays className="h-4 w-4 text-white/45" />}
                <span>{daysLeft === null ? "Chưa có ngày đích" : isOverdue ? `Quá hạn ${Math.abs(daysLeft)} ngày` : progress === 100 ? "Đã hoàn thành" : `${daysLeft} ngày còn lại`}</span>
              </div>
              <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-white/45" /><span>Ngày đích: {formatDeadline(goal.deadline)}</span></div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-white/45" /><span>{execution.completed}/{execution.total} việc đã chốt</span></div>
            </div>
          </div>
          {system ? (
            <div className="space-y-4">
              <div
                className={`rounded-[26px] border p-5 ${
                  systemReviewDueToday
                    ? "border-amber-200 bg-amber-50/92"
                    : "border-slate-900/10 bg-[linear-gradient(135deg,_rgba(15,23,42,0.96)_0%,_rgba(49,46,129,0.9)_100%)] text-white"
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${systemReviewDueToday ? "text-amber-700" : "text-white/60"}`}>
                  Đi tiếp từ đây
                </p>
                <p className={`mt-3 text-xl font-semibold ${systemReviewDueToday ? "text-slate-950" : "text-white"}`}>
                  {systemReviewDueToday ? "Chốt review tuần" : nextSystemTask ? nextSystemTask.title : "Hôm nay không còn việc mở"}
                </p>
                <p className={`mt-2 text-sm leading-7 ${systemReviewDueToday ? "text-slate-600" : "text-white/72"}`}>
                  {systemReviewDueToday
                    ? `Tuần ${systemCurrentWeek ?? system.currentWeek} đã đến lúc khóa lại. Chốt review trước để tuần sau vào nhịp gọn hơn.`
                    : nextSystemTask
                      ? `${systemTodayOpenTasks.length} việc đang mở hôm nay. ${
                          nextSystemTask.isCore ? "Hãy bắt đầu từ việc cốt lõi này trước." : "Đây là việc tùy chọn nếu bạn còn sức."
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
                        : "border-white/12 bg-white text-slate-900 hover:bg-white/92"
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
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Chu kỳ 12 tuần</p>
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
                  <Badge variant="outline" className={hasPremiumReviewInsights ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-violet-200 bg-violet-50 text-violet-700"}>
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
                    <p className="mt-2 text-2xl font-bold text-slate-900">{execution.weekCompletion?.percent ?? 0}%</p>
                  </div>
                  <div className="rounded-[20px] border border-white/80 bg-slate-50/88 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Tactic</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{getTwelveWeekTacticCount(system)}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/80 bg-slate-50/88 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Review</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {execution.reviewDueToday ? "Đến hạn hôm nay" : system.reviewDay ? getReviewDayLabel(system.reviewDay) : "Chưa chọn"}
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
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{goal.tasks.length} việc</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {goal.tasks.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-7 text-center text-sm text-slate-500">
                    Chưa có việc nào. Hãy thêm bước đầu tiên để biến mục tiêu này thành hành động cụ thể.
                  </div>
                ) : (
                  goal.tasks.map((task) => (
                    <div key={task.id} className="group flex items-center gap-3 rounded-[20px] border border-white/70 bg-slate-50/82 px-4 py-3">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleToggleTask(goal.id, task.id)}
                        aria-label={`Đánh dấu việc ${task.title}`}
                      />
                      <span className={`flex-1 text-sm ${task.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
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
                  {standardNextTask ? standardNextTask.title : goal.tasks.length === 0 ? "Thêm bước đầu tiên" : "Mọi việc hiện tại đã xong"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {standardNextTask
                    ? "Bắt đầu từ đúng việc này trước rồi mới mở thêm phần khác."
                    : goal.tasks.length === 0
                      ? "Chỉ cần một việc đầu tiên là mục tiêu sẽ bớt mơ hồ hơn nhiều."
                      : "Nếu muốn đi tiếp, hãy thêm việc mới cho chặng kế tiếp."}
                </p>
              </div>
              <div className="mt-4">
                {addingTaskToGoalId === goal.id ? (
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <Input
                      placeholder="Nhập việc tiếp theo..."
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
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      <UpgradePaywallDialog
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        context={upgradeContext}
        currentPlan={currentPlanCode}
        goalId={twelveWeekGoals[0]?.id}
        recommendedPlan={recommendedPlan}
        source="goal_tracker"
        onCheckoutComplete={reload}
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
            <AlertDialogAction onClick={handleConfirmDeleteGoal} className="bg-red-600 hover:bg-red-700">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="hero-surface overflow-hidden border-0 text-white">
        <CardContent className="relative p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />
          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_360px]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                <Target className="h-4 w-4" />
                Không gian mục tiêu
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                  Giữ mục tiêu ở mức dễ nhìn, còn nhịp thực thi thì đi vào đúng flow của từng ngày.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                  Màn này giúp bạn nhìn tổng quan mục tiêu, hạn chót và tiến độ. Nếu một mục tiêu đã gắn với chu kỳ 12 tuần, việc hằng ngày, check-in và review sẽ được gom về trung tâm 12 tuần để đỡ rối hơn.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  Gói {getPlanLabel(currentPlanCode)}
                </Badge>
                <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                  {entitlementKeys.length}/4 quyền premium đang mở
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button className="w-full bg-white text-slate-900 hover:bg-white/92 sm:w-auto" onClick={handleStartGuidedGoalFlow}>
                  <Target className="h-4 w-4" />
                  Tạo mục tiêu
                </Button>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-white/70">
                Từ bây giờ, mọi mục tiêu mới đều đi qua cùng một flow: insight trước, SMART sau,
                rồi mới tới feasibility và hệ 12 tuần.
              </p>
            </div>
            <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">Nhìn nhanh</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[24px] border border-white/10 bg-black/12 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">Mục tiêu đang theo</p>
                  <p className="mt-2 text-3xl font-bold text-white"><CountUp value={summary.totalGoals} /></p>
                  <p className="mt-1 text-sm text-white/68">{summary.completedGoals} đã hoàn thành</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/12 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">Việc đã chốt</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    <CountUp value={summary.completedTasks} />
                    <span className="text-white/68">/{summary.totalTasks}</span>
                  </p>
                  <p className="mt-1 text-sm text-white/68">trên toàn bộ mục tiêu</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/12 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">Chu kỳ 12 tuần</p>
                  <p className="mt-2 text-3xl font-bold text-white"><CountUp value={summary.activeSystems} /></p>
                  <p className="mt-1 text-sm text-white/68">đang chạy lúc này</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Reveal>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className={item.cardClass}>
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div>
                    <CardDescription className={item.titleClass}>{item.title}</CardDescription>
                    <CardTitle className="mt-2 text-4xl"><CountUp value={item.value} /></CardTitle>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className={`text-sm ${item.noteClass}`}>{item.note}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Reveal>

      <Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className={
              summary.reviewDue > 0
                ? "border-0 bg-[linear-gradient(180deg,_rgba(254,243,199,0.96)_0%,_rgba(253,230,138,0.84)_100%)] shadow-[0_24px_55px_-34px_rgba(217,119,6,0.2)]"
                : "border-0 bg-[linear-gradient(180deg,_rgba(226,232,240,0.92)_0%,_rgba(203,213,225,0.8)_100%)] shadow-[0_24px_55px_-34px_rgba(15,23,42,0.18)]"
            }
          >
            <CardHeader className="pb-2">
              <CardDescription>Review tuần</CardDescription>
              <CardTitle className="text-3xl"><CountUp value={summary.reviewDue} /></CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                {summary.reviewDue > 0 ? "Có chu kỳ đến hạn chốt review hôm nay." : "Hiện chưa có review nào đến hạn."}
              </p>
            </CardContent>
          </Card>

          <Card
            className={
              summary.overdue > 0
                ? "border-0 bg-[linear-gradient(180deg,_rgba(254,226,226,0.96)_0%,_rgba(254,242,242,0.88)_100%)] shadow-[0_24px_55px_-34px_rgba(220,38,38,0.18)]"
                : "border-0 bg-[linear-gradient(180deg,_rgba(226,232,240,0.92)_0%,_rgba(203,213,225,0.8)_100%)] shadow-[0_24px_55px_-34px_rgba(15,23,42,0.18)]"
            }
          >
            <CardHeader className="pb-2">
              <CardDescription>Mục tiêu quá hạn</CardDescription>
              <CardTitle className="text-3xl"><CountUp value={summary.overdue} /></CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                {summary.overdue > 0 ? "Đây là nhóm nên nhìn trước để tránh trễ kéo dài." : "Hiện chưa có mục tiêu nào quá hạn."}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-[linear-gradient(180deg,_rgba(219,234,254,0.94)_0%,_rgba(191,219,254,0.82)_100%)] shadow-[0_24px_55px_-34px_rgba(37,99,235,0.18)]">
            <CardHeader className="pb-2">
              <CardDescription>Sắp đến hạn</CardDescription>
              <CardTitle className="text-3xl"><CountUp value={summary.dueSoon} /></CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">Mục tiêu sẽ đến ngày đích trong 7 ngày tới.</p>
            </CardContent>
          </Card>
        </div>
      </Reveal>

      <Reveal>
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,_rgba(49,46,129,0.96)_0%,_rgba(76,29,149,0.92)_100%)] text-white shadow-[0_28px_70px_-38px_rgba(76,29,149,0.42)]">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Gói và quyền 12 tuần</p>
                  <p className="mt-2 text-2xl font-bold text-white">Bạn đang ở gói {getPlanLabel(currentPlanCode)}</p>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/74">{currentPlanDefinition.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {premiumStatusItems.map((key) => {
                  const isUnlocked = entitlementKeys.includes(key);

                  return (
                    <Badge
                      key={key}
                      variant="outline"
                      className={
                        isUnlocked
                          ? "border-emerald-200/70 bg-emerald-50 text-emerald-900"
                          : "border-white/15 bg-white/8 text-white/72"
                      }
                    >
                      {isUnlocked ? "Đang mở" : "Đang khóa"} · {getEntitlementLabel(key)}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 rounded-[26px] border border-white/12 bg-white/8 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/56">Đi tiếp với gói hiện tại</p>
              <p className="text-lg font-semibold text-white">
                {currentPlanCode === "FREE"
                  ? "Free đủ để bạn chạy một chu kỳ. Mở Plus khi bạn muốn bớt loay hoay lúc setup và review tốt hơn mỗi tuần."
                  : "Plus đang giúp bạn bắt đầu nhanh hơn, giữ nhịp đều hơn và biết tuần sau nên chỉnh gì."}
              </p>
              <div className="grid gap-2">
                {currentPlanCode === "FREE" ? (
                  <>
                    <Button className="bg-white text-slate-900 hover:bg-white/92" onClick={() => openUpgradeDialog("plan", "PLUS")}>
                      Mở Plus để đỡ loay hoay hơn
                    </Button>
                    <Button variant="outline" className="border-white/15 bg-white/10 text-white hover:bg-white/16" onClick={() => navigate(twelveWeekGoals.length > 0 ? "/12-week-system?tab=settings" : "/life-insight")}>
                      Xem Free đang có gì
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" className="border-white/15 bg-white/10 text-white hover:bg-white/16" onClick={() => navigate(twelveWeekGoals.length > 0 ? "/12-week-system?tab=settings" : "/life-insight")}>
                    Quản lý gói và quyền
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {userData.goals.length === 0 ? (
        <Reveal delay={0.04}>
          <Card className="overflow-hidden border-0 bg-[linear-gradient(180deg,_rgba(238,242,255,0.95)_0%,_rgba(224,231,255,0.84)_100%)] shadow-[0_28px_70px_-38px_rgba(99,102,241,0.18)]">
            <CardContent className="p-10 text-center lg:p-14">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-violet-50 text-violet-700">
                <Target className="h-10 w-10" />
              </div>
              <h2 className="mt-6 text-3xl font-bold text-slate-900">Chưa có mục tiêu nào trong workspace của bạn</h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500">
                Hãy tạo mục tiêu đầu tiên để bắt đầu một hệ thống theo dõi rõ ràng hơn: có hạn chót, có việc cụ thể, có nhịp tiến độ và có chỗ để thấy mình đang đi tới đâu.
              </p>
              <Button className="mt-8 w-full sm:w-auto" onClick={handleStartGuidedGoalFlow}>
                <Target className="h-4 w-4" />
                Tạo mục tiêu
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      ) : (
        <Reveal delay={0.04} className="space-y-8">
          {twelveWeekGoals.length > 0 && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Chu kỳ 12 tuần đang chạy</h2>
                  <p className="text-sm text-slate-500">Nhóm này nên được nhìn trước vì việc hằng ngày và review đều nằm ở đây.</p>
                </div>
                <Badge variant="outline" className="rounded-full border-violet-200 bg-violet-50 px-4 py-2 text-violet-700">
                  {twelveWeekGoals.length} chu kỳ
                </Badge>
              </div>
              <div className="space-y-5">{twelveWeekGoals.map((goal) => renderGoalCard(goal))}</div>
            </section>
          )}

          {standardGoals.length > 0 && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Mục tiêu thường</h2>
                  <p className="text-sm text-slate-500">Những mục tiêu chưa vào chu kỳ 12 tuần, phù hợp để theo dõi theo dạng danh sách việc.</p>
                </div>
                <Badge variant="outline" className="rounded-full border-white/70 bg-white/72 px-4 py-2 text-slate-600">
                  {standardGoals.length} mục tiêu
                </Badge>
              </div>
              <div className="space-y-5">{standardGoals.map((goal) => renderGoalCard(goal))}</div>
            </section>
          )}
        </Reveal>
      )}
    </div>
  );
}


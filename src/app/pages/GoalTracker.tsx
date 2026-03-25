import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  LayoutGrid,
  Plus,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { CountUp } from "../components/ui/count-up";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Reveal } from "../components/ui/reveal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  celebrateAchievementUnlock,
  celebrateSpark,
  celebrateSpotlight,
  getAchievementCelebrationCopy,
  getUnlockedAchievements,
} from "../utils/experience";
import {
  LIFE_AREAS,
  UserData,
  addGoal,
  calculateGoalProgress,
  deleteGoal,
  formatCalendarDate,
  getCalendarDayDifference,
  getLifeAreaLabel,
  getReviewDayLabel,
  getUserData,
  updateGoal,
} from "../utils/storage";

function formatDeadline(deadline: string) {
  const formattedDeadline = formatCalendarDate(deadline);
  if (formattedDeadline !== "--") return formattedDeadline;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "Chưa có hạn";
  return date.toLocaleDateString("vi-VN");
}

export function GoalTracker() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    category: "",
    title: "",
    description: "",
    deadline: "",
  });
  const [newTask, setNewTask] = useState("");
  const [addingTaskToGoalId, setAddingTaskToGoalId] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = getUserData();
    setUserData(data);
  };

  const handleAddGoal = () => {
    if (!newGoal.category || !newGoal.title || !newGoal.deadline) return;

    const beforeData = userData ?? getUserData();

    addGoal({
      ...newGoal,
      tasks: [],
    });

    const afterData = getUserData();
    const unlockedAchievements = getUnlockedAchievements(
      beforeData.achievements,
      afterData.achievements,
    );
    const achievementCopy = getAchievementCelebrationCopy(unlockedAchievements);

    celebrateSpotlight({ x: 0.82, y: 0.14 });
    if (achievementCopy) {
      window.setTimeout(() => {
        celebrateAchievementUnlock({ x: 0.5, y: 0.16 });
      }, 160);
    }

    toast.success("Mục tiêu mới đã vào guồng.", {
      description:
        achievementCopy?.title
          ? `${achievementCopy.title}. ${achievementCopy.description}`
          : "Giờ mình có thể chia nhỏ nó thành các bước thật rõ để tiến đều mỗi ngày.",
    });

    setNewGoal({ category: "", title: "", description: "", deadline: "" });
    setIsAddingGoal(false);
    setUserData(afterData);
  };

  const handleAddTask = (goalId: string) => {
    if (!newTask.trim()) return;

    const goal = userData?.goals.find((item) => item.id === goalId);
    if (!goal) return;

    const updatedTasks = [
      ...goal.tasks,
      {
        id: `task_${Date.now()}`,
        title: newTask.trim(),
        completed: false,
      },
    ];

    updateGoal(goalId, { tasks: updatedTasks });
    setNewTask("");
    setAddingTaskToGoalId(null);
    loadData();
  };

  const handleToggleTask = (goalId: string, taskId: string) => {
    const goal = userData?.goals.find((item) => item.id === goalId);
    if (!goal) return;

    const previousProgress = calculateGoalProgress(goal);
    const updatedTasks = goal.tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task,
    );

    updateGoal(goalId, { tasks: updatedTasks });

    const taskWasCompleted = !goal.tasks.find((task) => task.id === taskId)?.completed;
    const afterData = getUserData();
    const refreshedGoal = afterData.goals.find((item) => item.id === goalId);
    const refreshedProgress = refreshedGoal ? calculateGoalProgress(refreshedGoal) : previousProgress;
    const goalJustCompleted = previousProgress < 100 && refreshedProgress === 100;
    const unlockedAchievements = getUnlockedAchievements(
      userData?.achievements ?? [],
      afterData.achievements,
    );
    const achievementCopy = getAchievementCelebrationCopy(unlockedAchievements);

    if (taskWasCompleted) {
      if (goalJustCompleted) {
        celebrateSpotlight({ x: 0.82, y: 0.14 });
      } else {
        celebrateSpark({ x: 0.82, y: 0.14 });
      }

      if (achievementCopy) {
        window.setTimeout(() => {
          celebrateAchievementUnlock({ x: 0.5, y: 0.16 });
        }, 140);
      }

      toast.success(
        goalJustCompleted ? "Goal vừa cán mốc 100%." : "Đã chốt xong thêm một bước nhỏ.",
        {
          description:
            achievementCopy?.title
              ? `${achievementCopy.title}. ${achievementCopy.description}`
              : goalJustCompleted
                ? "Đây là khoảnh khắc rất đẹp: một mục tiêu đã đi trọn hành trình."
                : "Nhịp tiến bộ thường được xây từ những lần hoàn thành rất nhỏ như thế này.",
        },
      );
    }

    setUserData(afterData);
  };

  const handleDeleteTask = (goalId: string, taskId: string) => {
    const goal = userData?.goals.find((item) => item.id === goalId);
    if (!goal) return;

    updateGoal(goalId, {
      tasks: goal.tasks.filter((task) => task.id !== taskId),
    });
    loadData();
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoalToDelete(goalId);
  };

  const confirmDeleteGoal = () => {
    if (!goalToDelete) return;
    deleteGoal(goalToDelete);
    setGoalToDelete(null);
    loadData();
  };

  const getDaysUntilDeadline = (deadline: string) => getCalendarDayDifference(deadline);

  if (!userData) return null;

  const completedGoalsCount = userData.goals.filter(
    (goal) => calculateGoalProgress(goal) === 100,
  ).length;
  const totalTasks = userData.goals.reduce((sum, goal) => sum + goal.tasks.length, 0);
  const completedTasks = userData.goals.reduce(
    (sum, goal) => sum + goal.tasks.filter((task) => task.completed).length,
    0,
  );
  const activeSystemCount = userData.goals.filter((goal) => Boolean(goal.twelveWeekSystem)).length;
  const dueSoonCount = userData.goals.filter((goal) => {
    const progress = calculateGoalProgress(goal);
    const daysLeft = getDaysUntilDeadline(goal.deadline);
    return progress < 100 && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  }).length;

  const goalsByCategory = userData.goals.reduce((acc, goal) => {
    if (!acc[goal.category]) acc[goal.category] = [];
    acc[goal.category].push(goal);
    return acc;
  }, {} as Record<string, typeof userData.goals>);

  const sortedCategories = Object.keys(goalsByCategory).sort((a, b) => {
    const aIndex = LIFE_AREAS.findIndex((area) => area.name === a);
    const bIndex = LIFE_AREAS.findIndex((area) => area.name === b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div className="space-y-8 pb-12">
      <AlertDialog open={Boolean(goalToDelete)} onOpenChange={(open) => { if (!open) setGoalToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa mục tiêu này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Mục tiêu và toàn bộ nhiệm vụ liên quan sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGoal} className="bg-red-600 hover:bg-red-700">
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
                Goal Tracker Workspace
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                  Biến mục tiêu thành nhịp thực thi rõ ràng, có thể nhìn thấy và đo được mỗi ngày.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                  Từ mỗi mục tiêu, bạn có thể bẻ nhỏ thành nhiệm vụ, theo dõi tiến độ, gắn với
                  hệ 12 tuần và giữ cho hành trình luôn tiến về phía trước thay vì dừng lại ở ý định.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-white/18 bg-white text-slate-900 hover:bg-white/92"
                    >
                      <Plus className="h-4 w-4" />
                      Mục tiêu mới
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Tạo mục tiêu mới</DialogTitle>
                      <DialogDescription>
                        Xác định một mục tiêu đủ rõ, sau đó bạn có thể tiếp tục chia nhỏ thành nhiệm vụ.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Danh mục</Label>
                        <Select
                          value={newGoal.category}
                          onValueChange={(value) => setNewGoal({ ...newGoal, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn một lĩnh vực cuộc sống" />
                          </SelectTrigger>
                          <SelectContent>
                            {LIFE_AREAS.map((area) => (
                              <SelectItem key={area.name} value={area.name}>
                                {getLifeAreaLabel(area.name)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Tên mục tiêu</Label>
                        <Input
                          placeholder="Ví dụ: Hoàn thiện portfolio và nộp 20 đơn ứng tuyển"
                          value={newGoal.title}
                          onChange={(event) =>
                            setNewGoal({ ...newGoal, title: event.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Mô tả</Label>
                        <Textarea
                          rows={4}
                          placeholder="Điều gì khiến mục tiêu này quan trọng với bạn?"
                          value={newGoal.description}
                          onChange={(event) =>
                            setNewGoal({ ...newGoal, description: event.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Hạn chót</Label>
                        <Input
                          type="date"
                          value={newGoal.deadline}
                          onChange={(event) =>
                            setNewGoal({ ...newGoal, deadline: event.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <Button onClick={handleAddGoal}>Tạo mục tiêu</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                Tình trạng hiện tại
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {[
                  {
                    label: "Mục tiêu đang theo dõi",
                    value: <CountUp value={userData.goals.length} />,
                    note: `${completedGoalsCount} đã hoàn thành`,
                  },
                  {
                    label: "Tác vụ hoàn tất",
                    value: (
                      <>
                        <CountUp value={completedTasks} />
                        <span className="text-white/68">/{totalTasks}</span>
                      </>
                    ),
                    note: "trên toàn bộ mục tiêu",
                  },
                  {
                    label: "Hệ 12 tuần hoạt động",
                    value: <CountUp value={activeSystemCount} />,
                    note: "đang gắn với goal",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-white/10 bg-black/12 px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-white/55">{item.label}</p>
                    <p className="mt-2 text-3xl font-bold text-white">{item.value}</p>
                    <p className="mt-1 text-sm text-white/68">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Reveal>
        <div className="stagger-hover-grid grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Mục tiêu mở",
            value: userData.goals.length,
            note: "đang cần được nuôi tiến độ",
            icon: LayoutGrid,
            color: "from-violet-500/18 to-fuchsia-500/10 text-violet-700",
          },
          {
            title: "Nhiệm vụ hoàn thành",
            value: completedTasks,
            note: `trên tổng số ${totalTasks}`,
            icon: CheckCircle2,
            color: "from-emerald-500/18 to-teal-500/10 text-emerald-700",
          },
          {
            title: "Sắp đến hạn",
            value: dueSoonCount,
            note: "mục tiêu trong 7 ngày tới",
            icon: Clock3,
            color: "from-amber-500/18 to-orange-500/10 text-amber-700",
          },
          {
            title: "Có hệ 12 tuần",
            value: activeSystemCount,
            note: "goal đang chạy theo system",
            icon: Zap,
            color: "from-sky-500/18 to-cyan-500/10 text-sky-700",
          },
        ].map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index }}
            >
              <Card className="relative overflow-hidden">
                <div
                  className={`absolute inset-x-5 top-0 h-20 rounded-b-[28px] bg-gradient-to-br ${item.color} blur-2xl`}
                />
                <CardHeader className="relative flex flex-row items-start justify-between pb-3">
                  <div>
                    <CardDescription>{item.title}</CardDescription>
                    <CardTitle className="mt-2 text-4xl">
                      <CountUp value={item.value} />
                    </CardTitle>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-sm text-slate-500">{item.note}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        </div>
      </Reveal>

      {userData.goals.length === 0 ? (
        <Reveal delay={0.04}>
          <Card className="overflow-hidden">
          <CardContent className="p-10 text-center lg:p-14">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-violet-50 text-violet-700">
              <Target className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-slate-900">
              Chưa có mục tiêu nào trong workspace của bạn
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500">
              Hãy tạo mục tiêu đầu tiên để bắt đầu một hệ thống theo dõi rõ ràng hơn: có hạn chót,
              có task, có nhịp tiến độ và có chỗ để thấy mình đang đi tới đâu.
            </p>
            <Button className="mt-8" onClick={() => setIsAddingGoal(true)}>
              <Plus className="h-4 w-4" />
              Tạo mục tiêu đầu tiên
            </Button>
          </CardContent>
          </Card>
        </Reveal>
      ) : (
        <Reveal delay={0.04} className="space-y-8">
          {sortedCategories.map((category, categoryIndex) => {
            const goals = goalsByCategory[category];
            const areaMeta = LIFE_AREAS.find((area) => area.name === category);

            return (
              <motion.section
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + categoryIndex * 0.05 }}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full shadow-[0_0_0_8px_rgba(255,255,255,0.7)]"
                      style={{ backgroundColor: areaMeta?.color }}
                    />
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        {getLifeAreaLabel(category)}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {goals.length} mục tiêu đang được theo dõi trong lĩnh vực này.
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="rounded-full border-white/70 bg-white/72 px-4 py-2 text-slate-600"
                  >
                    {goals.length} goal
                  </Badge>
                </div>

                <div className="space-y-5">
                  {goals.map((goal, index) => {
                    const progress = calculateGoalProgress(goal);
                    const daysLeft = getDaysUntilDeadline(goal.deadline);
                    const hasDeadline = daysLeft !== null;
                    const isOverdue = hasDeadline && daysLeft < 0;
                    const isCompleted = progress === 100;
                    const supportSystem = goal.twelveWeekSystem || goal.twelveWeekPlan;
                    const reviewDay =
                      goal.twelveWeekSystem?.reviewDay ?? goal.twelveWeekPlan?.reviewDay ?? "";
                    const currentWeek =
                      goal.twelveWeekSystem?.currentWeek ?? goal.twelveWeekPlan?.currentWeek ?? 0;
                    const totalWeeks =
                      goal.twelveWeekSystem?.totalWeeks ?? goal.twelveWeekPlan?.totalWeeks ?? 0;
                    const weeklyActions =
                      goal.twelveWeekSystem?.weeklyActions ?? goal.twelveWeekPlan?.weeklyActions ?? [];

                    return (
                      <motion.div
                        key={goal.id}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * index }}
                      >
                        <Card className="overflow-hidden">
                          <CardContent className="p-6 lg:p-7">
                            <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                              <div className="rounded-[28px] bg-[linear-gradient(180deg,_rgba(248,250,252,0.94)_0%,_rgba(241,245,249,0.84)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                                <div className="flex items-start justify-between gap-3">
                                  <div
                                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-white"
                                    style={{ backgroundColor: areaMeta?.color ?? "#7c3aed" }}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                      <Circle className="h-4 w-4" />
                                    )}
                                    {progress}%
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 rounded-2xl text-slate-500 hover:text-red-600"
                                    onClick={() => handleDeleteGoal(goal.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="mt-5 space-y-3">
                                  <div>
                                    <h3 className="text-2xl font-bold text-slate-900">{goal.title}</h3>
                                    <p className="mt-2 text-sm leading-7 text-slate-500">
                                      {goal.description || "Chưa có mô tả chi tiết cho mục tiêu này."}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    <Badge
                                      variant="outline"
                                      className="rounded-full border-white/80 bg-white px-3 py-1.5 text-slate-600"
                                    >
                                      {getLifeAreaLabel(goal.category)}
                                    </Badge>
                                    {supportSystem && (
                                      <Badge
                                        variant="outline"
                                        className="rounded-full border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-700"
                                      >
                                        Hệ 12 tuần
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-5">
                                  <div className="mb-2 flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Tiến độ</span>
                                    <span className="font-semibold text-slate-900">
                                      <CountUp value={progress} suffix="%" />
                                    </span>
                                  </div>
                                  <Progress value={progress} className="h-2.5" />
                                </div>

                                <div className="mt-5 space-y-3 text-sm text-slate-600">
                                  <div className={`flex items-center gap-2 ${isOverdue && !isCompleted ? "text-red-600 font-semibold" : ""}`}>
                                    {isOverdue && !isCompleted ? (
                                      <AlertTriangle className="h-4 w-4 text-red-500" />
                                    ) : (
                                      <CalendarDays className="h-4 w-4 text-slate-400" />
                                    )}
                                    <span>
                                      {isOverdue && !isCompleted
                                        ? `Quá hạn ${Math.abs(daysLeft)} ngày`
                                        : isCompleted
                                          ? "Đã hoàn thành"
                                          : `${daysLeft} ngày còn lại`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock3 className="h-4 w-4 text-slate-400" />
                                    <span>Hạn chót: {formatDeadline(goal.deadline)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-slate-400" />
                                    <span>
                                      {goal.tasks.filter((task) => task.completed).length}/{goal.tasks.length} nhiệm vụ hoàn tất
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                {supportSystem && (
                                  <div className="rounded-[26px] border border-violet-200/70 bg-[linear-gradient(135deg,_rgba(245,243,255,0.95)_0%,_rgba(238,242,255,0.92)_100%)] p-5 shadow-[0_20px_44px_-34px_rgba(109,40,217,0.42)]">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">
                                          Nhịp 12 tuần
                                        </p>
                                        <h4 className="mt-2 text-lg font-semibold text-slate-900">
                                          {goal.twelveWeekSystem
                                            ? "System đang hoạt động"
                                            : "Plan 12 tuần đã gắn vào goal"}
                                        </h4>
                                      </div>
                                      {reviewDay && (
                                        <Badge
                                          variant="outline"
                                          className="rounded-full border-violet-200 bg-white px-3 py-1.5 text-violet-700"
                                        >
                                          Review: {getReviewDayLabel(reviewDay)}
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                                      <div className="rounded-[20px] border border-white/80 bg-white/88 p-4">
                                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                                          Tuần hiện tại
                                        </p>
                                        <p className="mt-2 text-2xl font-bold text-slate-900">
                                          <CountUp value={currentWeek} />
                                          <span className="text-slate-400">/{totalWeeks}</span>
                                        </p>
                                      </div>
                                      <div className="rounded-[20px] border border-white/80 bg-white/88 p-4">
                                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                                          Weekly actions
                                        </p>
                                        <p className="mt-2 text-2xl font-bold text-slate-900">
                                          <CountUp value={weeklyActions.length} />
                                        </p>
                                      </div>
                                      <div className="rounded-[20px] border border-white/80 bg-white/88 p-4">
                                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                                          Trạng thái
                                        </p>
                                        <p className="mt-2 text-sm font-semibold text-slate-900">
                                          {isCompleted ? "Đã hoàn thành" : "Đang tiến hành"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="rounded-[26px] border border-white/70 bg-white/72 p-5 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.28)]">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <h4 className="text-lg font-semibold text-slate-900">
                                        Danh sách nhiệm vụ
                                      </h4>
                                      <p className="text-sm text-slate-500">
                                        Bẻ nhỏ mục tiêu thành những bước có thể hoàn tất thật sự.
                                      </p>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="rounded-full border-white/80 bg-slate-50 px-3 py-1.5 text-slate-600"
                                    >
                                      {goal.tasks.length} tasks
                                    </Badge>
                                  </div>

                                  <div className="mt-5 space-y-3">
                                    {goal.tasks.length === 0 ? (
                                      <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-7 text-center">
                                        <p className="text-sm text-slate-500">
                                          Chưa có nhiệm vụ nào. Hãy thêm bước đầu tiên để biến mục tiêu này thành hành động cụ thể.
                                        </p>
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
                                          />
                                          <span
                                            className={`flex-1 text-sm ${
                                              task.completed ? "text-slate-400 line-through" : "text-slate-700"
                                            }`}
                                          >
                                            {task.title}
                                          </span>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-2xl opacity-0 transition-opacity group-hover:opacity-100"
                                            onClick={() => handleDeleteTask(goal.id, task.id)}
                                          >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                          </Button>
                                        </div>
                                      ))
                                    )}
                                  </div>

                                  <div className="mt-5">
                                    {addingTaskToGoalId === goal.id ? (
                                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                                        <Input
                                          placeholder="Nhập nhiệm vụ tiếp theo..."
                                          value={newTask}
                                          onChange={(event) => setNewTask(event.target.value)}
                                          onKeyDown={(event) =>
                                            event.key === "Enter" && handleAddTask(goal.id)
                                          }
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
                                      <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => setAddingTaskToGoalId(goal.id)}
                                      >
                                        <Plus className="h-4 w-4" />
                                        Thêm nhiệm vụ
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            );
          })}
        </Reveal>
      )}
    </div>
  );
}

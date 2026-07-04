import {
  calculateGoalProgress,
  getCalendarDayDifference,
  type Goal,
  getGoalExecutionStats,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTasksForWeek,
  getTwelveWeekTodayTasks,
  type TwelveWeekSystem,
} from "@/app/utils/storage";
import type {
  FocusGoalData,
  GoalCompletionDetails,
  GoalMetadata,
  HealthStatus,
  WeeklyQuestDetails,
} from "./types";

export const getGoalCompletionDetails = (goal: Goal): GoalCompletionDetails => {
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

export const getGoalHealthStatus = (
  goal: Goal,
  progress: number,
  isOverdue: boolean,
  isNearDeadline: boolean,
): HealthStatus => {
  const stats = getGoalExecutionStats(goal);

  if (progress === 100) {
    return {
      label: "Hoàn thành ✨",
      bgClass:
        "bg-app-status-success/10 text-app-status-success border border-app-status-success/30",
    };
  }
  if (isOverdue) {
    return {
      label: "Cần chỉnh nhịp 🌊",
      bgClass:
        "bg-app-status-warning/10 text-app-status-warning border border-app-status-warning/30",
    };
  }
  if (stats.reviewDueToday) {
    return {
      label: "Đến ngày review 📋",
      bgClass:
        "bg-app-status-warning/10 text-app-status-warning border border-app-status-warning/30",
    };
  }
  if (isNearDeadline) {
    return {
      label: "Sắp đến hạn ⏳",
      bgClass:
        "bg-app-status-warning/10 text-app-status-warning border border-app-status-warning/30",
    };
  }
  return {
    label: "Đang đi đều 🌱",
    bgClass: "bg-app-status-info/10 text-app-status-info border border-app-status-info/30",
  };
};

export const getTodayFocusGoal = (goalsWithMetadata: GoalMetadata[]): FocusGoalData | null => {
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
};

export const getWeeklyQuestDetails = (system: TwelveWeekSystem): WeeklyQuestDetails => {
  const currentWeek = getTwelveWeekCurrentWeek(system);
  const weekTasks = getTwelveWeekTasksForWeek(system, currentWeek);
  const activeTasks = weekTasks.filter((t) => !t.skipped);
  const uniqueScheduledDays = Array.from(
    new Set(activeTasks.map((t) => t.scheduledDate).filter(Boolean)),
  );
  const completedDays = uniqueScheduledDays.filter((date) =>
    activeTasks.some((t) => t.scheduledDate === date && t.completed),
  ).length;
  const targetDays = Math.min(3, uniqueScheduledDays.length);

  return {
    completedDays,
    targetDays,
    hasSchedule: uniqueScheduledDays.length > 0,
  };
};

export const parseDateStr = (str: string) => {
  const [year, month, day] = str.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const formatDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const r = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${r}`;
};

export const formatDayLabel = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

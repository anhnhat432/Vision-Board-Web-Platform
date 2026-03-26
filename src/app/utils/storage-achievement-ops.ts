import {
  formatDateInputValue,
  getCalendarDateKey,
  getCalendarDayIndex,
  parseCalendarDate,
} from "./storage-date-utils";
import { getGoalExecutionStats } from "./storage-twelve-week";
import type { Achievement, Goal, UserData } from "./storage-types";
import { generateId } from "./storage-types";

function calculateGoalProgress(goal: Goal): number {
  const execution = getGoalExecutionStats(goal);
  if (execution.total === 0) return 0;
  return Math.round((execution.completed / execution.total) * 100);
}

export function addAchievementToData(
  data: UserData,
  achievement: Omit<Achievement, "id" | "earnedAt">,
  earnedAt = new Date().toISOString(),
): boolean {
  if (data.achievements.some((item) => item.title === achievement.title)) {
    return false;
  }

  data.achievements.push({
    ...achievement,
    id: generateId("achievement"),
    earnedAt,
  });

  return true;
}

export function checkAchievementsInData(data: UserData, referenceDate = new Date()): boolean {
  let didAddAchievement = false;

  const addIfEligible = (achievement: Omit<Achievement, "id" | "earnedAt">) => {
    didAddAchievement = addAchievementToData(data, achievement) || didAddAchievement;
  };

  if (data.goals.length === 1) {
    addIfEligible({
      title: "First Step",
      description: "Tạo mục tiêu đầu tiên của bạn",
      icon: "Target",
    });
  }

  if (data.goals.length === 5) {
    addIfEligible({
      title: "Goal Setter",
      description: "Tạo 5 mục tiêu",
      icon: "Trophy",
    });
  }

  const completedGoals = data.goals.filter((goal) => calculateGoalProgress(goal) === 100);
  if (completedGoals.length === 1) {
    addIfEligible({
      title: "Achiever",
      description: "Hoàn thành mục tiêu đầu tiên của bạn",
      icon: "Award",
    });
  }

  if (completedGoals.length === 5) {
    addIfEligible({
      title: "Master Achiever",
      description: "Hoàn thành 5 mục tiêu",
      icon: "Crown",
    });
  }

  if (data.visionBoards.length === 1) {
    addIfEligible({
      title: "Visionary",
      description: "Tạo bảng tầm nhìn đầu tiên của bạn",
      icon: "Sparkles",
    });
  }

  if (data.reflections.length === 1) {
    addIfEligible({
      title: "Reflective Mind",
      description: "Viết nhật ký phản tư đầu tiên của bạn",
      icon: "BookOpen",
    });
  }

  const todayKey = formatDateInputValue(referenceDate);
  const distinctReflectionDates = Array.from(
    new Set(
      data.reflections
        .map((reflection) => getCalendarDateKey(reflection.date))
        .filter((dateKey): dateKey is string => typeof dateKey === "string" && dateKey <= todayKey),
    ),
  ).sort();

  let longestStreak = 0;
  let currentStreak = 0;
  let previousDayIndex: number | null = null;

  distinctReflectionDates.forEach((dateKey) => {
    const currentDate = parseCalendarDate(dateKey);
    if (!currentDate) return;

    const currentDayIndex = getCalendarDayIndex(currentDate);
    currentStreak =
      previousDayIndex !== null && currentDayIndex === previousDayIndex + 1
        ? currentStreak + 1
        : 1;
    previousDayIndex = currentDayIndex;
    longestStreak = Math.max(longestStreak, currentStreak);
  });

  if (longestStreak >= 30) {
    addIfEligible({
      title: "Dedicated",
      description: "30 ngày duy trì viết nhật ký phản tư",
      icon: "Flame",
    });
  }

  return didAddAchievement;
}

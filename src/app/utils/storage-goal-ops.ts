import { formatDateInputValue } from "./storage-date-utils";
import {
  getCycleEndDate,
  getDefaultScoreboard,
  getStartOfWeek,
  migrateLegacyPlanToSystem,
  syncWeeklyPlans,
} from "./storage-twelve-week";
import type { Goal, LifeArea, UserData } from "./storage-types";

export function upgradeLegacyGoalToSystemInData(data: UserData, goalId: string): boolean {
  const goalIndex = data.goals.findIndex((goal) => goal.id === goalId);
  if (goalIndex === -1) return false;

  const goal = data.goals[goalIndex];
  if (!goal.twelveWeekPlan || goal.twelveWeekSystem) return false;

  data.goals[goalIndex] = migrateLegacyPlanToSystem(goal);
  return true;
}

export function updateWheelOfLifeInData(
  data: UserData,
  areas: LifeArea[],
  createdAt = new Date().toISOString(),
): void {
  data.currentWheelOfLife = areas;
  data.wheelOfLifeHistory.push({
    date: createdAt,
    areas: [...areas],
  });
  data.onboardingCompleted = true;
  data.isHydratedFromDemo = false;
}

export function addGoalToData(
  data: UserData,
  goal: Omit<Goal, "id" | "createdAt">,
  createdAt = new Date().toISOString(),
): string {
  const newGoal: Goal = {
    ...goal,
    id: `goal_${Date.now()}`,
    createdAt,
  };
  data.goals.push(newGoal);
  return newGoal.id;
}

export function updateGoalInData(data: UserData, goalId: string, updates: Partial<Goal>): boolean {
  const goalIndex = data.goals.findIndex((goal) => goal.id === goalId);
  if (goalIndex === -1) return false;

  data.goals[goalIndex] = { ...data.goals[goalIndex], ...updates };
  return true;
}

export function resetTwelveWeekGoalCycleInData(
  data: UserData,
  goalId: string,
  referenceDate = new Date(),
): boolean {
  const goalIndex = data.goals.findIndex((goal) => goal.id === goalId);
  if (goalIndex === -1) return false;

  const goal = data.goals[goalIndex];
  const system = goal.twelveWeekSystem;
  if (!system) return false;

  const nextStartDate = getStartOfWeek(referenceDate, system.weekStartsOn ?? "Monday");
  const nextEndDate = getCycleEndDate(nextStartDate, system.totalWeeks || 12);

  data.reflections = data.reflections.filter(
    (reflection) => !(reflection.entryType === "weekly-review" && reflection.linkedGoalId === goalId),
  );

  data.goals[goalIndex] = {
    ...goal,
    twelveWeekSystem: {
      ...system,
      startDate: formatDateInputValue(nextStartDate),
      endDate: formatDateInputValue(nextEndDate),
      currentWeek: 1,
      status: "active",
      reentryCount: 0,
      taskInstances: [],
      dailyCheckIns: [],
      weeklyReviews: [],
      scoreboard: getDefaultScoreboard(system.totalWeeks || 12),
      weeklyPlans: syncWeeklyPlans(
        system.weeklyPlans,
        system.totalWeeks || 12,
        system.week12Outcome,
      ).map((plan) => ({
        ...plan,
        completed: false,
      })),
    },
  };

  return true;
}

export function deleteGoalFromData(data: UserData, goalId: string): void {
  data.goals = data.goals.filter((goal) => goal.id !== goalId);
}

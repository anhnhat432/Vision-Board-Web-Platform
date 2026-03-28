import type { Plan12Week, Week } from "../types/planTypes";

export interface Generate12WeekPlanInput {
  id: string;
  goal_statement: string;
}

function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyWeek(weekNumber: number): Week {
  return {
    weekNumber,
    focus: "",
    expectedOutput: "",
    tasks: [],
    leadMetrics: [],
  };
}

export function generate12WeekPlan(goal: Generate12WeekPlanInput): Plan12Week {
  return {
    id: createId(),
    vision: goal.goal_statement,
    smartGoalId: goal.id,
    startDate: new Date().toISOString(),
    weeks: Array.from({ length: 12 }, (_, index) => createEmptyWeek(index + 1)),
  };
}


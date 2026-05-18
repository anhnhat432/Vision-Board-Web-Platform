/**
 * Build assistant context from localStorage.
 *
 * Reads user data through public storage APIs and surfaces a minimal
 * snapshot for the AI assistant to work with. Falls back to defaults
 * when storage is empty or malformed — never throws.
 */

import { getUserData } from "@/app/utils/storage";
import { getActiveTwelveWeekGoal, getTwelveWeekCurrentWeek, getTwelveWeekTodayTasks } from "@/app/utils/storage-twelve-week";
import type { Goal, TwelveWeekTaskInstance } from "@/app/utils/storage-types";

export interface AssistantContext {
  currentWeek: number | null;
  weeksTotal: number;
  goals: Array<{
    id: string;
    title: string;
    progress: number;
  }>;
  todayTasks: Array<{
    id: string;
    title: string;
    done: boolean;
  }>;
  lastReflectionDate: string | null;
}

/**
 * Build context from localStorage.
 *
 * Defaults:
 *   - currentWeek: null (no active 12-week goal)
 *   - weeksTotal: 12
 *   - goals: []
 *   - todayTasks: []
 *   - lastReflectionDate: null
 */
export function buildAssistantContext(referenceDate = new Date()): AssistantContext {
  try {
    const data = getUserData();

    if (!data?.goals || data.goals.length === 0) {
      return {
        currentWeek: null,
        weeksTotal: 12,
        goals: [],
        todayTasks: [],
        lastReflectionDate: null,
      };
    }

    // Active goal
    const activeGoal = getActiveTwelveWeekGoal(data.goals);

    if (!activeGoal?.twelveWeekSystem) {
      // Has goals but no 12-week system
      return {
        currentWeek: null,
        weeksTotal: 12,
        goals: data.goals.map((g: Goal) => ({
          id: g.id,
          title: g.title,
          progress: calculateGoalProgress(g),
        })),
        todayTasks: [],
        lastReflectionDate: data.reflections && data.reflections.length > 0 ? data.reflections[0].date : null,
      };
    }

    const system = activeGoal.twelveWeekSystem;
    const currentWeek = getTwelveWeekCurrentWeek(system, referenceDate);
    const todayTasks = getTwelveWeekTodayTasks(system, referenceDate);

    return {
      currentWeek,
      weeksTotal: system.totalWeeks || 12,
      goals: data.goals.map((g: Goal) => ({
        id: g.id,
        title: g.title,
        progress: calculateGoalProgress(g),
      })),
      todayTasks: todayTasks.map((task: TwelveWeekTaskInstance) => ({
        id: task.id,
        title: task.title,
        done: task.completed,
      })),
      lastReflectionDate: data.reflections && data.reflections.length > 0 ? data.reflections[0].date : null,
    };
  } catch {
    // Storage read error → safe defaults
    return {
      currentWeek: null,
      weeksTotal: 12,
      goals: [],
      todayTasks: [],
      lastReflectionDate: null,
    };
  }
}

/**
 * Calculate goal progress as percentage (0-100).
 *
 * Uses task completion ratio if tasks exist, otherwise 0.
 */
function calculateGoalProgress(goal: Goal): number {
  if (!goal.tasks || goal.tasks.length === 0) return 0;

  const completed = goal.tasks.filter((t) => t.completed).length;
  return Math.round((completed / goal.tasks.length) * 100);
}
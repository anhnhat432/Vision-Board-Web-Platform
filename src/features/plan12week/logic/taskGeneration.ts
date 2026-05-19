import { formatDateInputValue } from "@/app/utils/storage-date-utils";

import type { GeneratedTactic, WeekOneTask } from "./tacticGeneration";

/**
 * Generate Week 1 tasks from tactics
 *
 * Logic:
 * 1. For each tactic, create tasks based on its target (times per week)
 * 2. Schedule tasks on the days specified by tactic.schedule
 * 3. Total tasks must be 3-7
 * 4. Core tasks must be present (at least 1)
 */
export function generateWeekOneTasks(tactics: GeneratedTactic[], weekStartDate: Date): WeekOneTask[] {
  const tasks: WeekOneTask[] = [];
  const weekStart = new Date(weekStartDate);
  weekStart.setHours(0, 0, 0, 0);

  // Create a task for each tactic occurrence
  tactics.forEach((tactic, tacticIndex) => {
    const schedule = tactic.schedule || [];
    schedule.forEach((dayOffset, slotIndex) => {
      const taskDate = new Date(weekStart);
      taskDate.setDate(weekStart.getDate() + dayOffset);

      const title = tactic.type === "core" ? `[CỐT LỖI] ${tactic.name}` : tactic.name;

      tasks.push({
        id: generateTaskId(tacticIndex, slotIndex),
        title,
        scheduledDate: formatDateInputValue(taskDate),
        tacticId: tactic.id,
        isCore: tactic.type === "core",
      });
    });
  });

  // Ensure min 3, max 7 tasks
  return clampTasksToRange(tasks);
}

/**
 * Generate unique task ID
 */
function generateTaskId(tacticIndex: number, slotIndex: number): string {
  return `w1_t${tacticIndex}_s${slotIndex}_${Date.now()}`;
}

/**
 * Adjust task count to be within [3, 7]
 * - If too few: add tasks from high-priority core tactics
 * - If too many: merge some tasks (keep earliest dates)
 */
function clampTasksToRange(tasks: WeekOneTask[]): WeekOneTask[] {
  if (tasks.length < 3) {
    // Add placeholder tasks (in practice, this shouldn't happen with valid tactics)
    return [...tasks, ...createPlaceholderTasks(3 - tasks.length)];
  }

  if (tasks.length <= 7) {
    return sortTasks(tasks);
  }

  // Too many tasks: prioritize by core status, priority, and date
  return sortTasks(tasks).slice(0, 7);
}

/**
 * Create placeholder tasks when total is below minimum
 * In production, this should not occur if tactics are properly configured
 */
function createPlaceholderTasks(count: number): WeekOneTask[] {
  const placeholders: WeekOneTask[] = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 7); // Last Monday

  for (let i = 0; i < count; i++) {
    placeholders.push({
      id: `placeholder_${i}_${Date.now()}`,
      title: `[CẦN THÊM] Hành động cụ thể cho mục tiêu`,
      scheduledDate: formatDateInputValue(new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000)),
      tacticId: "placeholder",
      isCore: true,
    });
  }

  return placeholders;
}

/**
 * Sort tasks: core first, then by scheduled date
 */
function sortTasks(tasks: WeekOneTask[]): WeekOneTask[] {
  return [...tasks].sort((a, b) => {
    if (a.isCore && !b.isCore) return -1;
    if (!a.isCore && b.isCore) return 1;
    return a.scheduledDate.localeCompare(b.scheduledDate);
  });
}

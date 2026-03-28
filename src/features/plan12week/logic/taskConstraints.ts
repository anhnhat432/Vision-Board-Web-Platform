const MIN_RECOMMENDED_TASKS = 3;
const MAX_RECOMMENDED_TASKS = 5;

export function getWeeklyTaskWarning(taskCount: number): string | null {
  if (taskCount > MAX_RECOMMENDED_TASKS) {
    return "Khuyen nghi moi tuan chi nen co 3-5 task. Ban dang vuot qua 5 task.";
  }

  return null;
}

export function isTaskCountInRecommendedRange(taskCount: number): boolean {
  return taskCount >= MIN_RECOMMENDED_TASKS && taskCount <= MAX_RECOMMENDED_TASKS;
}


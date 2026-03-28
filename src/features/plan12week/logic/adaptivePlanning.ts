function normalizeTaskCount(taskCount: number): number {
  if (!Number.isFinite(taskCount) || taskCount < 0) return 0;
  return Math.round(taskCount);
}

export function generateAdaptiveSuggestion(score: number, taskCount: number): string {
  const safeTaskCount = normalizeTaskCount(taskCount);

  if (score >= 85) {
    return "Execution is excellent. Increase challenge slightly next week.";
  }

  if (score >= 60) {
    return "Execution is on track. Keep the current weekly plan.";
  }

  if (score >= 40) {
    return safeTaskCount > 0
      ? `Execution is at risk. Reduce weekly tasks from ${safeTaskCount} to a lighter load.`
      : "Execution is at risk. Reduce weekly tasks to a lighter load.";
  }

  return "Execution is critical. Simplify the plan and focus on 1 key task.";
}

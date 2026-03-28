export type ExecutionStatus =
  | "excellent_execution"
  | "on_track"
  | "at_risk"
  | "critical";

export function interpretExecutionScore(score: number): ExecutionStatus {
  if (score >= 85) return "excellent_execution";
  if (score >= 60) return "on_track";
  if (score >= 40) return "at_risk";
  return "critical";
}

export function generateExecutionSuggestion(score: number): string {
  const status = interpretExecutionScore(score);

  switch (status) {
    case "excellent_execution":
      return "Execution is strong. Consider increasing difficulty next week.";
    case "on_track":
      return "Execution is stable. Keep the current weekly plan.";
    case "at_risk":
      return "Execution is slipping. Reduce weekly tasks to regain consistency.";
    case "critical":
    default:
      return "Execution is critical. Simplify the plan and focus on one key task.";
  }
}

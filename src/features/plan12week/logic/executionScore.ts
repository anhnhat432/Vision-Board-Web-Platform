import type { Task } from "../types/planTypes";

export interface LagMetric {
  target: string | number;
  currentValue: string | number;
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function parseMetricNumber(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateLeadScore(tasks: Task[]): number {
  if (tasks.length === 0) return 0;

  const completedTasks = tasks.filter((task) => task.status === "done").length;
  return Math.round((completedTasks / tasks.length) * 100);
}

export const calculateExecutionScore = calculateLeadScore;

export function calculateLagScore(lagMetric: LagMetric, weekNumber: number, totalWeeks: number): number {
  const target = parseMetricNumber(lagMetric.target);
  const currentValue = parseMetricNumber(lagMetric.currentValue);

  if (target <= 0 || totalWeeks <= 0) return 0;

  const clampedWeekNumber = Math.min(Math.max(weekNumber, 0), totalWeeks);
  const clampedExpectedSoFar = (clampedWeekNumber / totalWeeks) * target;
  if (clampedExpectedSoFar <= 0) return 0;

  return clampPercentage((currentValue / clampedExpectedSoFar) * 100);
}

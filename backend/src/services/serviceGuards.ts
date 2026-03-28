import type { PlanEntity } from "../repositories/mongo/MongoPlanRepository";
import type { MetricEntity } from "../repositories/mongo/MongoMetricRepository";
import type { TaskEntity } from "../repositories/mongo/MongoTaskRepository";
import type { WeekEntity } from "../repositories/mongo/MongoWeekRepository";
import type { MongoMetricRepository } from "../repositories/mongo/MongoMetricRepository";
import type { MongoPlanRepository } from "../repositories/mongo/MongoPlanRepository";
import type { MongoTaskRepository } from "../repositories/mongo/MongoTaskRepository";
import type { MongoWeekRepository } from "../repositories/mongo/MongoWeekRepository";
import { ApiError } from "../utils/apiError";

export async function requirePlanOwnership(
  planRepository: MongoPlanRepository,
  userId: string,
  planId: string,
): Promise<PlanEntity> {
  const plan = await planRepository.getPlanById(planId);
  if (!plan) {
    throw new ApiError(404, "Plan not found.");
  }

  if (plan.userId !== userId) {
    throw new ApiError(403, "You do not have access to this plan.");
  }

  return plan;
}

export async function requireWeekOwnership(
  planRepository: MongoPlanRepository,
  weekRepository: MongoWeekRepository,
  userId: string,
  weekId: string,
): Promise<WeekEntity> {
  const week = await weekRepository.getWeekById(weekId);
  if (!week) {
    throw new ApiError(404, "Week not found.");
  }

  await requirePlanOwnership(planRepository, userId, week.planId);
  return week;
}

export async function requireTaskOwnership(
  planRepository: MongoPlanRepository,
  weekRepository: MongoWeekRepository,
  taskRepository: MongoTaskRepository,
  userId: string,
  taskId: string,
): Promise<TaskEntity> {
  const task = await taskRepository.getTaskById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found.");
  }

  await requireWeekOwnership(planRepository, weekRepository, userId, task.weekId);
  return task;
}

export async function requireMetricOwnership(
  planRepository: MongoPlanRepository,
  weekRepository: MongoWeekRepository,
  metricRepository: MongoMetricRepository,
  userId: string,
  metricId: string,
): Promise<MetricEntity> {
  const metric = await metricRepository.getMetricById(metricId);
  if (!metric) {
    throw new ApiError(404, "Metric not found.");
  }

  await requireWeekOwnership(planRepository, weekRepository, userId, metric.weekId);
  return metric;
}

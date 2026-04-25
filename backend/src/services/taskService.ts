import { MongoPlanRepository } from "../repositories/mongo/MongoPlanRepository";
import {
  MongoTaskRepository,
  type TaskStatus,
} from "../repositories/mongo/MongoTaskRepository";
import { MongoWeekRepository } from "../repositories/mongo/MongoWeekRepository";
import { ApiError } from "../utils/apiError";
import { requireTaskOwnership, requireWeekOwnership } from "./serviceGuards";

export interface AddTaskPayload {
  title: string;
  status?: TaskStatus;
  scheduledDate?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  status?: TaskStatus;
  scheduledDate?: string;
}

const VALID_TASK_STATUSES: TaskStatus[] = ["todo", "doing", "done"];

function isPayloadRecord(payload: unknown): payload is Record<string, unknown> {
  return Boolean(payload) && typeof payload === "object" && !Array.isArray(payload);
}

function validateTaskStatus(value: unknown): TaskStatus | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !VALID_TASK_STATUSES.includes(value as TaskStatus)) {
    throw new ApiError(400, "Invalid task status. Use todo, doing, or done.");
  }

  return value as TaskStatus;
}

function validateTaskTitle(value: unknown, required: boolean): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, required ? "Task title is required." : "Task title must be a string.");
  }

  const title = value.trim();
  if (!title) {
    throw new ApiError(400, "Task title cannot be empty.");
  }

  return title;
}

function validateOptionalDate(value: unknown, fieldName: string): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `${fieldName} must be a valid ISO date string.`);
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf())) {
    throw new ApiError(400, `${fieldName} must be a valid ISO date string.`);
  }

  return parsed;
}

function validateAddTaskPayload(payload: unknown): { title: string; status?: TaskStatus; scheduledDate?: Date } {
  if (!isPayloadRecord(payload)) {
    throw new ApiError(400, "Request body must be an object.");
  }

  return {
    title: validateTaskTitle(payload.title, true) ?? "",
    status: validateTaskStatus(payload.status),
    scheduledDate: validateOptionalDate(payload.scheduledDate, "scheduledDate"),
  };
}

function validateUpdateTaskPayload(payload: unknown): { title?: string; status?: TaskStatus; scheduledDate?: Date } {
  if (!isPayloadRecord(payload)) {
    throw new ApiError(400, "Request body must be an object.");
  }

  const updates = {
    title: validateTaskTitle(payload.title, false),
    status: validateTaskStatus(payload.status),
    scheduledDate: validateOptionalDate(payload.scheduledDate, "scheduledDate"),
  };

  if (updates.title === undefined && updates.status === undefined && updates.scheduledDate === undefined) {
    throw new ApiError(400, "Provide at least one task field to update.");
  }

  return updates;
}

class TaskService {
  constructor(
    private readonly planRepository: MongoPlanRepository,
    private readonly weekRepository: MongoWeekRepository,
    private readonly taskRepository: MongoTaskRepository,
  ) {}

  async addTaskToWeek(userId: string, weekId: string, payload: AddTaskPayload) {
    await requireWeekOwnership(this.planRepository, this.weekRepository, userId, weekId);
    const task = validateAddTaskPayload(payload);

    return this.taskRepository.addTask({
      weekId,
      title: task.title,
      status: task.status ?? "todo",
      scheduledDate: task.scheduledDate,
    });
  }

  async updateTask(userId: string, taskId: string, payload: UpdateTaskPayload) {
    await requireTaskOwnership(
      this.planRepository,
      this.weekRepository,
      this.taskRepository,
      userId,
      taskId,
    );
    const updates = validateUpdateTaskPayload(payload);

    return this.taskRepository.updateTask(taskId, {
      title: updates.title,
      status: updates.status,
      scheduledDate: updates.scheduledDate,
    });
  }

  async updateTaskStatus(userId: string, taskId: string, status: TaskStatus) {
    return this.updateTask(userId, taskId, { status });
  }

  async deleteTask(userId: string, taskId: string) {
    await requireTaskOwnership(
      this.planRepository,
      this.weekRepository,
      this.taskRepository,
      userId,
      taskId,
    );

    return this.taskRepository.deleteTask(taskId);
  }
}

const planRepository = new MongoPlanRepository();
const weekRepository = new MongoWeekRepository();
const taskRepository = new MongoTaskRepository();

export const taskService = new TaskService(planRepository, weekRepository, taskRepository);

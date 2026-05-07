import type { Request, Response } from "express";

import { taskService } from "../services/taskService";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import { ConflictError } from "../utils/conflictError";
import { requireAuthUser } from "./controllerHelpers";

export async function addTask(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const task = await taskService.addTaskToWeek(user.uid, req.params.weekId, req.body ?? {});
  res.status(201).json(successResponse(task));
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const body = req.body ?? {};
  const status = body.status as "todo" | "doing" | "done" | undefined;
  const title = typeof body.title === "string" ? body.title.trim() : undefined;
  const scheduledDate = typeof body.scheduledDate === "string" ? body.scheduledDate : undefined;
  const baseRevision =
    typeof body.baseRevision === "number" && Number.isInteger(body.baseRevision) && body.baseRevision >= 0
      ? body.baseRevision
      : undefined;

  if (status && !["todo", "doing", "done"].includes(status)) {
    throw new ApiError(400, "Invalid task status. Use todo, doing, or done.");
  }

  if (body.title !== undefined && !title) {
    throw new ApiError(400, "Task title cannot be empty.");
  }

  if (scheduledDate !== undefined && !Number.isFinite(new Date(scheduledDate).valueOf())) {
    throw new ApiError(400, "Invalid scheduledDate.");
  }

  if (!status && title === undefined && scheduledDate === undefined && baseRevision === undefined) {
    throw new ApiError(400, "Provide at least one task field to update.");
  }

  try {
    const task = await taskService.updateTask(user.uid, req.params.taskId, {
      status,
      title,
      scheduledDate,
      baseRevision,
    });
    res.status(200).json(successResponse(task));
  } catch (error) {
    if (error instanceof ConflictError) {
      res.status(409).json({
        success: false,
        conflict: true,
        message: error.message,
        currentRevision: error.currentRevision,
        serverUpdatedAt: error.serverUpdatedAt.toISOString(),
      });
      return;
    }
    throw error;
  }
}

export async function removeTask(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  await taskService.deleteTask(user.uid, req.params.taskId);
  res.status(200).json(successResponse({ deleted: true }));
}

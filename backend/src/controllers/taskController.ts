import type { Request, Response } from "express";

import { taskService } from "../services/taskService";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

export async function addTask(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const task = await taskService.addTaskToWeek(user.uid, req.params.weekId, req.body ?? {});
  res.status(201).json(successResponse(task));
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const status = req.body?.status as "todo" | "doing" | "done" | undefined;

  if (!status || !["todo", "doing", "done"].includes(status)) {
    throw new ApiError(400, "Invalid task status. Use todo, doing, or done.");
  }

  const task = await taskService.updateTaskStatus(
    user.uid,
    req.params.taskId,
    status,
  );
  res.status(200).json(successResponse(task));
}

export async function removeTask(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  await taskService.deleteTask(user.uid, req.params.taskId);
  res.status(200).json(successResponse({ deleted: true }));
}

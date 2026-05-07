import { Router } from "express";

import { addTask, removeTask, updateTask } from "../controllers/taskController";
import { validateJsonObjectBody, validateObjectIdParam } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const taskRoutes = Router();

taskRoutes.post(
  "/weeks/:weekId/tasks",
  validateObjectIdParam("weekId"),
  validateJsonObjectBody,
  asyncHandler(addTask),
);
taskRoutes.patch(
  "/tasks/:taskId",
  validateObjectIdParam("taskId"),
  validateJsonObjectBody,
  asyncHandler(updateTask),
);
taskRoutes.delete("/tasks/:taskId", validateObjectIdParam("taskId"), asyncHandler(removeTask));

export { taskRoutes };

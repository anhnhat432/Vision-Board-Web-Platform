import { Router } from "express";

import { addTask, removeTask, updateTask } from "../controllers/taskController";
import { asyncHandler } from "../utils/asyncHandler";

const taskRoutes = Router();

taskRoutes.post("/weeks/:weekId/tasks", asyncHandler(addTask));
taskRoutes.patch("/tasks/:taskId", asyncHandler(updateTask));
taskRoutes.delete("/tasks/:taskId", asyncHandler(removeTask));

export { taskRoutes };

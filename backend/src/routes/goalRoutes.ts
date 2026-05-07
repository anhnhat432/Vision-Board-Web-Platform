import { Router } from "express";

import {
  createGoal,
  deleteGoal,
  getGoalById,
  getGoals,
  updateGoal,
} from "../controllers/goalController";
import { validateJsonObjectBody, validateObjectIdParam } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const goalRoutes = Router();

goalRoutes.post("/goals", validateJsonObjectBody, asyncHandler(createGoal));
goalRoutes.get("/goals", asyncHandler(getGoals));
goalRoutes.get("/goals/:id", validateObjectIdParam("id", "goalId"), asyncHandler(getGoalById));
goalRoutes.patch(
  "/goals/:id",
  validateObjectIdParam("id", "goalId"),
  validateJsonObjectBody,
  asyncHandler(updateGoal),
);
goalRoutes.delete("/goals/:id", validateObjectIdParam("id", "goalId"), asyncHandler(deleteGoal));

export { goalRoutes };

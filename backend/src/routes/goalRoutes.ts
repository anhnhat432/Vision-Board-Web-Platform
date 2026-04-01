import { Router } from "express";

import {
  createGoal,
  deleteGoal,
  getGoalById,
  getGoals,
  updateGoal,
} from "../controllers/goalController";
import { asyncHandler } from "../utils/asyncHandler";

const goalRoutes = Router();

goalRoutes.post("/goals", asyncHandler(createGoal));
goalRoutes.get("/goals", asyncHandler(getGoals));
goalRoutes.get("/goals/:id", asyncHandler(getGoalById));
goalRoutes.patch("/goals/:id", asyncHandler(updateGoal));
goalRoutes.delete("/goals/:id", asyncHandler(deleteGoal));

export { goalRoutes };

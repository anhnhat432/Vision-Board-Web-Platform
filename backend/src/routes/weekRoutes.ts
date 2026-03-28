import { Router } from "express";

import {
  getWeeksForPlan,
  patchWeek,
  submitWeekReview,
} from "../controllers/weekController";
import { asyncHandler } from "../utils/asyncHandler";

const weekRoutes = Router();

weekRoutes.get("/plans/:planId/weeks", asyncHandler(getWeeksForPlan));
weekRoutes.patch("/weeks/:weekId", asyncHandler(patchWeek));
weekRoutes.post("/weeks/:weekId/review", asyncHandler(submitWeekReview));

export { weekRoutes };

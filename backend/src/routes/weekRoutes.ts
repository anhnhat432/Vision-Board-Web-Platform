import { Router } from "express";

import {
  getWeeksForPlan,
  patchWeek,
  submitWeekReview,
} from "../controllers/weekController";
import { validateJsonObjectBody, validateObjectIdParam } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const weekRoutes = Router();

weekRoutes.get(
  "/plans/:planId/weeks",
  validateObjectIdParam("planId"),
  asyncHandler(getWeeksForPlan),
);
weekRoutes.patch(
  "/weeks/:weekId",
  validateObjectIdParam("weekId"),
  validateJsonObjectBody,
  asyncHandler(patchWeek),
);
weekRoutes.post(
  "/weeks/:weekId/review",
  validateObjectIdParam("weekId"),
  validateJsonObjectBody,
  asyncHandler(submitWeekReview),
);

export { weekRoutes };

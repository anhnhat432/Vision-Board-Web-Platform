import { Router } from "express";

import { createPlan, deletePlan, getPlanById, getPlans, updatePlan } from "../controllers/planController";
import { validateJsonObjectBody, validateObjectIdParam } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const planRoutes = Router();

planRoutes.post("/plans", validateJsonObjectBody, asyncHandler(createPlan));
planRoutes.get("/plans", asyncHandler(getPlans));
planRoutes.patch(
  "/plans/:id",
  validateObjectIdParam("id", "planId"),
  validateJsonObjectBody,
  asyncHandler(updatePlan),
);
planRoutes.get("/plans/:id", validateObjectIdParam("id", "planId"), asyncHandler(getPlanById));
planRoutes.delete("/plans/:id", validateObjectIdParam("id", "planId"), asyncHandler(deletePlan));

export { planRoutes };

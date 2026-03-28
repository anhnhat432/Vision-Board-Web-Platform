import { Router } from "express";

import { createPlan, getPlanById, getPlans } from "../controllers/planController";
import { asyncHandler } from "../utils/asyncHandler";

const planRoutes = Router();

planRoutes.post("/plans", asyncHandler(createPlan));
planRoutes.get("/plans", asyncHandler(getPlans));
planRoutes.get("/plans/:id", asyncHandler(getPlanById));

export { planRoutes };

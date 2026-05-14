import express, { Router } from "express";

import { bulkSyncPlan } from "../controllers/planBulkSyncController";
import { planBulkSyncRateLimiter } from "../middleware/rateLimiters";
import { validateJsonObjectBody, validateObjectIdParam } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const planBulkSyncRoutes = Router();

planBulkSyncRoutes.use(express.json({ limit: "1mb" }));

planBulkSyncRoutes.post(
  "/plans/:planId/bulk-sync",
  planBulkSyncRateLimiter,
  validateObjectIdParam("planId"),
  validateJsonObjectBody,
  asyncHandler(bulkSyncPlan),
);

export { planBulkSyncRoutes };

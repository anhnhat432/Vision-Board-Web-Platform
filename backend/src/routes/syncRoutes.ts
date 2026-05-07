import express, { Router } from "express";

import {
  deleteTwelveWeekWorkspace,
  exportTwelveWeekWorkspace,
  importTwelveWeekWorkspace,
  pullTwelveWeekWorkspace,
  submitTwelveWeekMutations,
  validateTwelveWeekImport,
} from "../controllers/syncController";
import { validateJsonObjectBody } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const syncRoutes = Router();

/**
 * Sync routes enforce a tighter body size limit (1 MB) than the global app
 * limit. This prevents oversized payloads on the sync API surface while
 * allowing other CRUD routes to accept larger bodies if needed.
 */
syncRoutes.use(express.json({ limit: "1mb" }));

syncRoutes.post(
  "/sync/12-week/import",
  validateJsonObjectBody,
  asyncHandler(importTwelveWeekWorkspace),
);
syncRoutes.post(
  "/sync/12-week/import/validate",
  validateJsonObjectBody,
  asyncHandler(validateTwelveWeekImport),
);
syncRoutes.post(
  "/sync/12-week/mutations",
  validateJsonObjectBody,
  asyncHandler(submitTwelveWeekMutations),
);
syncRoutes.get("/sync/12-week/pull", asyncHandler(pullTwelveWeekWorkspace));
syncRoutes.get("/sync/12-week/workspace/export", asyncHandler(exportTwelveWeekWorkspace));
syncRoutes.delete("/sync/12-week/workspace", asyncHandler(deleteTwelveWeekWorkspace));

export { syncRoutes };

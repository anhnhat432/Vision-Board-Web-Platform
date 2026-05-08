import { Router } from "express";

import { getAdminOverview, sendExpiringBillingReminders } from "../controllers/adminController";
import { requireAdmin } from "../middleware/requireAdmin";
import { validateOptionalJsonObjectBody } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const adminRoutes = Router();

adminRoutes.get("/admin/overview", asyncHandler(requireAdmin), asyncHandler(getAdminOverview));
adminRoutes.post(
  "/admin/billing/reminders/expiring",
  asyncHandler(requireAdmin),
  validateOptionalJsonObjectBody,
  asyncHandler(sendExpiringBillingReminders),
);

export { adminRoutes };

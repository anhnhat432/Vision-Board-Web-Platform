import { Router } from "express";

import {
  completePaymentOrderManually,
  getAdminOverview,
  sendExpiringBillingReminders,
} from "../controllers/adminController";
import { requireAdmin } from "../middleware/requireAdmin";
import { validateOptionalJsonObjectBody, validateOrderIdParam } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const adminRoutes = Router();

adminRoutes.get("/admin/overview", asyncHandler(requireAdmin), asyncHandler(getAdminOverview));
adminRoutes.post(
  "/admin/billing/reminders/expiring",
  asyncHandler(requireAdmin),
  validateOptionalJsonObjectBody,
  asyncHandler(sendExpiringBillingReminders),
);
adminRoutes.post(
  "/admin/billing/payment-orders/:orderId/complete",
  asyncHandler(requireAdmin),
  validateOrderIdParam,
  validateOptionalJsonObjectBody,
  asyncHandler(completePaymentOrderManually),
);

export { adminRoutes };

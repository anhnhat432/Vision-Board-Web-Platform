import { Router } from "express";

import {
  completePaymentOrderManually,
  getAdminPaymentOrders,
  getAdminOverview,
  sendExpiringBillingReminders,
} from "../controllers/adminController";
import {
  completeAdminRefundRequest,
  getAdminRefundRequests,
  rejectAdminRefundRequest,
} from "../controllers/refundController";
import { requireAdmin } from "../middleware/requireAdmin";
import { validateOptionalJsonObjectBody, validateOrderIdParam } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const adminRoutes = Router();

adminRoutes.get("/admin/overview", asyncHandler(requireAdmin), asyncHandler(getAdminOverview));
adminRoutes.get("/admin/billing/payment-orders", asyncHandler(requireAdmin), asyncHandler(getAdminPaymentOrders));
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
adminRoutes.get("/admin/billing/refund-requests", asyncHandler(requireAdmin), asyncHandler(getAdminRefundRequests));
adminRoutes.post(
  "/admin/billing/refund-requests/:requestId/complete",
  asyncHandler(requireAdmin),
  validateOptionalJsonObjectBody,
  asyncHandler(completeAdminRefundRequest),
);
adminRoutes.post(
  "/admin/billing/refund-requests/:requestId/reject",
  asyncHandler(requireAdmin),
  validateOptionalJsonObjectBody,
  asyncHandler(rejectAdminRefundRequest),
);

export { adminRoutes };

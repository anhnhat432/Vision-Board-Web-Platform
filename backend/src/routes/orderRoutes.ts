import { Router } from "express";

import {
  adminGetOrder,
  adminGetOrders,
  adminExportOrders,
  adminUpdateOrder,
  adminUpdateOrderStatus,
  cancelOrder,
  createKitPaymentSession,
  createOrder,
  getOrderById,
  getOrders,
} from "../controllers/orderController";
import { classifyAdminPhysicalOrderController } from "../controllers/adminOperationalClassificationController";
import { requireEmailVerified } from "../middleware/authMiddlewareCore";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  validateAdminOperationalClassificationBody,
  validateJsonObjectBody,
  validateObjectIdParam,
} from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";
import { auditedAdminAction, getOperationalClassificationFailureAuditPayload } from "./adminRoutes";


const orderRoutes = Router();

// User-scoped routes
orderRoutes.post("/orders", requireEmailVerified, validateJsonObjectBody, asyncHandler(createOrder));

orderRoutes.get("/orders", asyncHandler(getOrders));
orderRoutes.get("/orders/:id", validateObjectIdParam("id", "orderId"), asyncHandler(getOrderById));
orderRoutes.patch("/orders/:id/cancel", validateObjectIdParam("id", "orderId"), asyncHandler(cancelOrder));
orderRoutes.post(
  "/orders/:id/payment-session",
  requireEmailVerified,
  validateObjectIdParam("id", "orderId"),
  asyncHandler(createKitPaymentSession),
);

// Admin-only routes
orderRoutes.get("/admin/orders", asyncHandler(requireAdmin), asyncHandler(adminGetOrders));
orderRoutes.get("/admin/orders/export", asyncHandler(requireAdmin), asyncHandler(adminExportOrders));
orderRoutes.get(
  "/admin/orders/:id",
  asyncHandler(requireAdmin),
  validateObjectIdParam("id", "orderId"),
  asyncHandler(adminGetOrder),
);
orderRoutes.patch(
  "/admin/orders/:id/operational-classification",
  auditedAdminAction({
    action: "changeAdminOperationalClassification",
    target: "physical_order_operational_classification",
    getTargetId: (req) => req.params.id,
    getAuditPayload: getOperationalClassificationFailureAuditPayload,
    validators: [validateObjectIdParam("id", "orderId"), validateAdminOperationalClassificationBody],
    handler: classifyAdminPhysicalOrderController,
    logSuccess: false,
  }),
);
orderRoutes.patch(
  "/admin/orders/:id/status",
  auditedAdminAction({
    action: "adminUpdateOrderStatus",
    target: "physical_order",
    getTargetId: (req) => req.params.id,
    validators: [validateObjectIdParam("id", "orderId"), validateJsonObjectBody],
    handler: adminUpdateOrderStatus,
  }),
);
orderRoutes.patch(
  "/admin/orders/:id",
  auditedAdminAction({
    action: "adminUpdateOrder",
    target: "physical_order",
    getTargetId: (req) => req.params.id,
    validators: [validateObjectIdParam("id", "orderId"), validateJsonObjectBody],
    handler: adminUpdateOrder,
  }),
);


export { orderRoutes };

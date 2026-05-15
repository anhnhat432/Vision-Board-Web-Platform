import { Router } from "express";

import {
  adminGetOrders,
  adminUpdateOrderStatus,
  cancelOrder,
  createOrder,
  getOrderById,
  getOrders,
} from "../controllers/orderController";
import { requireEmailVerified } from "../middleware/authMiddlewareCore";
import { requireAdmin } from "../middleware/requireAdmin";
import { validateJsonObjectBody, validateObjectIdParam } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";
import { auditedAdminAction } from "./adminRoutes";


const orderRoutes = Router();

// User-scoped routes
orderRoutes.post("/orders", requireEmailVerified, validateJsonObjectBody, asyncHandler(createOrder));

orderRoutes.get("/orders", asyncHandler(getOrders));
orderRoutes.get("/orders/:id", validateObjectIdParam("id", "orderId"), asyncHandler(getOrderById));
orderRoutes.patch("/orders/:id/cancel", validateObjectIdParam("id", "orderId"), asyncHandler(cancelOrder));

// Admin-only routes
orderRoutes.get("/admin/orders", asyncHandler(requireAdmin), asyncHandler(adminGetOrders));
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


export { orderRoutes };

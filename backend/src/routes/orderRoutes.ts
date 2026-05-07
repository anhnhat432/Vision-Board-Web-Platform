import { Router } from "express";

import {
  adminGetOrders,
  adminUpdateOrderStatus,
  cancelOrder,
  createOrder,
  getOrderById,
  getOrders,
} from "../controllers/orderController";
import { requireAdmin } from "../middleware/requireAdmin";
import { validateJsonObjectBody, validateObjectIdParam } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const orderRoutes = Router();

// User-scoped routes
orderRoutes.post("/orders", validateJsonObjectBody, asyncHandler(createOrder));
orderRoutes.get("/orders", asyncHandler(getOrders));
orderRoutes.get("/orders/:id", validateObjectIdParam("id", "orderId"), asyncHandler(getOrderById));
orderRoutes.patch("/orders/:id/cancel", validateObjectIdParam("id", "orderId"), asyncHandler(cancelOrder));

// Admin-only routes
orderRoutes.get("/admin/orders", asyncHandler(requireAdmin), asyncHandler(adminGetOrders));
orderRoutes.patch(
  "/admin/orders/:id/status",
  asyncHandler(requireAdmin),
  validateObjectIdParam("id", "orderId"),
  validateJsonObjectBody,
  asyncHandler(adminUpdateOrderStatus),
);

export { orderRoutes };

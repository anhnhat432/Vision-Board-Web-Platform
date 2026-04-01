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
import { asyncHandler } from "../utils/asyncHandler";

const orderRoutes = Router();

// User-scoped routes
orderRoutes.post("/orders", asyncHandler(createOrder));
orderRoutes.get("/orders", asyncHandler(getOrders));
orderRoutes.get("/orders/:id", asyncHandler(getOrderById));
orderRoutes.patch("/orders/:id/cancel", asyncHandler(cancelOrder));

// Admin-only routes
orderRoutes.get("/admin/orders", asyncHandler(requireAdmin), asyncHandler(adminGetOrders));
orderRoutes.patch(
  "/admin/orders/:id/status",
  asyncHandler(requireAdmin),
  asyncHandler(adminUpdateOrderStatus),
);

export { orderRoutes };

import { Router } from "express";

import {
  createDiscount,
  deleteDiscount,
  getActiveSaleEventInfo,
  getCouponUsages,
  listDiscounts,
  updateDiscount,
  validateCouponHandler,
} from "../controllers/discountController";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  billingCheckoutRateLimiter,
} from "../middleware/rateLimiters";
import {
  validateJsonObjectBody,
  validateObjectIdParam,
} from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const discountRoutes = Router();
const publicDiscountRoutes = Router();

publicDiscountRoutes.post(
  "/billing/validate-coupon",
  billingCheckoutRateLimiter,
  validateJsonObjectBody,
  asyncHandler(validateCouponHandler),
);

publicDiscountRoutes.get(
  "/billing/active-sale-event",
  billingCheckoutRateLimiter,
  asyncHandler(getActiveSaleEventInfo),
);

const validateDiscountIdParam = validateObjectIdParam("id", "discountId");

discountRoutes.get(
  "/admin/discounts",
  asyncHandler(requireAdmin),
  asyncHandler(listDiscounts),
);

discountRoutes.post(
  "/admin/discounts",
  asyncHandler(requireAdmin),
  validateJsonObjectBody,
  asyncHandler(createDiscount),
);

discountRoutes.put(
  "/admin/discounts/:id",
  asyncHandler(requireAdmin),
  validateDiscountIdParam,
  validateJsonObjectBody,
  asyncHandler(updateDiscount),
);

discountRoutes.delete(
  "/admin/discounts/:id",
  asyncHandler(requireAdmin),
  validateDiscountIdParam,
  asyncHandler(deleteDiscount),
);

discountRoutes.get(
  "/admin/discounts/:id/usages",
  asyncHandler(requireAdmin),
  validateDiscountIdParam,
  asyncHandler(getCouponUsages),
);

export { discountRoutes, publicDiscountRoutes };

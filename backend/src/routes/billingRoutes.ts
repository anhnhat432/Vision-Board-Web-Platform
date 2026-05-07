import { Router } from "express";

import { cancelSubscription, createCheckoutSession, createCustomerPortal, getEntitlement } from "../controllers/billingController";
import { getCheckoutInfo, getOrderStatus, getPaymentHistory } from "../controllers/orderStatusController";
import { billingCheckoutRateLimiter, billingStatusRateLimiter } from "../middleware/rateLimiters";
import {
  validateCheckoutSessionInput,
  validateCustomerPortalInput,
  validateOptionalJsonObjectBody,
  validateOrderIdParam,
} from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const billingRoutes = Router();

billingRoutes.get("/billing/entitlement", billingStatusRateLimiter, asyncHandler(getEntitlement));
billingRoutes.post(
  "/billing/checkout-session",
  billingCheckoutRateLimiter,
  validateCheckoutSessionInput,
  asyncHandler(createCheckoutSession),
);
billingRoutes.post(
  "/billing/customer-portal",
  billingCheckoutRateLimiter,
  validateCustomerPortalInput,
  asyncHandler(createCustomerPortal),
);
billingRoutes.post(
  "/billing/subscription/cancel",
  billingCheckoutRateLimiter,
  validateOptionalJsonObjectBody,
  asyncHandler(cancelSubscription),
);
billingRoutes.get(
  "/billing/order-status/:orderId",
  billingStatusRateLimiter,
  validateOrderIdParam,
  asyncHandler(getOrderStatus),
);
billingRoutes.get("/billing/payment-history", billingStatusRateLimiter, asyncHandler(getPaymentHistory));
billingRoutes.get("/billing/checkout-info", billingStatusRateLimiter, asyncHandler(getCheckoutInfo));

export { billingRoutes };

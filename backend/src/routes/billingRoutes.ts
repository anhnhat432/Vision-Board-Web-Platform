import { Router } from "express";

import {
  cancelSubscription,
  createCheckoutSession,
  createCustomerPortal,
  createPublicCheckoutSession,
  getEntitlement,
} from "../controllers/billingController";
import {
  getCheckoutInfo,
  getOrderStatus,
  getPaymentHistory,
  getPublicOrderStatus,
  resendPaymentReceipt,
} from "../controllers/orderStatusController";
import { createBillingRefundRequest } from "../controllers/refundController";
import { requireEmailVerified } from "../middleware/authMiddlewareCore";
import { billingCheckoutRateLimiter, billingStatusRateLimiter } from "../middleware/rateLimiters";
import {
  validateCheckoutSessionInput,
  validateCustomerPortalInput,
  validateOptionalJsonObjectBody,
  validateOrderIdParam,
  validatePublicCheckoutSessionInput,
} from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const billingRoutes = Router();
const publicBillingRoutes = Router();

publicBillingRoutes.post(
  "/billing/public-checkout-session",
  billingCheckoutRateLimiter,
  validatePublicCheckoutSessionInput,
  asyncHandler(createPublicCheckoutSession),
);
publicBillingRoutes.get(
  "/billing/public-order-status/:orderId",
  billingStatusRateLimiter,
  validateOrderIdParam,
  asyncHandler(getPublicOrderStatus),
);
publicBillingRoutes.get("/billing/checkout-info", billingStatusRateLimiter, asyncHandler(getCheckoutInfo));

billingRoutes.get("/billing/entitlement", billingStatusRateLimiter, asyncHandler(getEntitlement));
billingRoutes.post(
  "/billing/checkout-session",
  billingCheckoutRateLimiter,
  requireEmailVerified,
  validateCheckoutSessionInput,
  asyncHandler(createCheckoutSession),
);
billingRoutes.post(
  "/billing/orders",
  billingCheckoutRateLimiter,
  requireEmailVerified,
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
billingRoutes.post(
  "/billing/orders/:orderId/resend-receipt",
  billingCheckoutRateLimiter,
  validateOrderIdParam,
  asyncHandler(resendPaymentReceipt),
);
billingRoutes.post(
  "/billing/orders/:orderId/refund-request",
  billingCheckoutRateLimiter,
  requireEmailVerified,
  validateOrderIdParam,
  validateOptionalJsonObjectBody,
  asyncHandler(createBillingRefundRequest),
);

export { billingRoutes, publicBillingRoutes };

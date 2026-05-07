import { Router } from "express";

import { cancelSubscription, createCheckoutSession, createCustomerPortal, getEntitlement } from "../controllers/billingController";
import { getCheckoutInfo, getOrderStatus } from "../controllers/orderStatusController";
import { billingCheckoutRateLimiter, billingStatusRateLimiter } from "../middleware/rateLimiters";
import { asyncHandler } from "../utils/asyncHandler";

const billingRoutes = Router();

billingRoutes.get("/billing/entitlement", billingStatusRateLimiter, asyncHandler(getEntitlement));
billingRoutes.post("/billing/checkout-session", billingCheckoutRateLimiter, asyncHandler(createCheckoutSession));
billingRoutes.post("/billing/customer-portal", billingCheckoutRateLimiter, asyncHandler(createCustomerPortal));
billingRoutes.post("/billing/subscription/cancel", billingCheckoutRateLimiter, asyncHandler(cancelSubscription));
billingRoutes.get("/billing/order-status/:orderId", billingStatusRateLimiter, asyncHandler(getOrderStatus));
billingRoutes.get("/billing/checkout-info", billingStatusRateLimiter, asyncHandler(getCheckoutInfo));

export { billingRoutes };

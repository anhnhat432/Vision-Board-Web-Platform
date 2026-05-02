import { Router } from "express";

import { cancelSubscription, createCheckoutSession, createCustomerPortal, getEntitlement } from "../controllers/billingController";
import { asyncHandler } from "../utils/asyncHandler";

const billingRoutes = Router();

billingRoutes.get("/billing/entitlement", asyncHandler(getEntitlement));
billingRoutes.post("/billing/checkout-session", asyncHandler(createCheckoutSession));
billingRoutes.post("/billing/customer-portal", asyncHandler(createCustomerPortal));
billingRoutes.post("/billing/subscription/cancel", asyncHandler(cancelSubscription));

export { billingRoutes };

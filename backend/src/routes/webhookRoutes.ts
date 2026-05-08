/**
 * Webhook Routes
 *
 * These routes are mounted BEFORE auth middleware because
 * webhooks come from payment providers, not authenticated users.
 * Signature verification is the security gate.
 */

import { Router } from "express";

import { getCassoWebhookHealth, handleCassoWebhook } from "../controllers/cassoWebhookController";
import { handleWebhook } from "../controllers/webhookController";
import { validateCassoWebhookPayload, validateWebhookProviderParam } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const webhookRoutes = Router();

// Casso-specific webhook (matches PaymentOrders by bank transfer description)
webhookRoutes.get("/billing/webhook/casso/health", asyncHandler(getCassoWebhookHealth));
webhookRoutes.get("/webhook/casso/health", asyncHandler(getCassoWebhookHealth));
webhookRoutes.post(
  "/billing/webhook/casso",
  validateCassoWebhookPayload,
  asyncHandler(handleCassoWebhook),
);
webhookRoutes.post(
  "/webhook/casso",
  validateCassoWebhookPayload,
  asyncHandler(handleCassoWebhook),
);
// Generic provider webhook (PayOS, VNPay, mock, etc.)
webhookRoutes.post(
  "/billing/webhook/:provider",
  validateWebhookProviderParam,
  asyncHandler(handleWebhook),
);

export { webhookRoutes };

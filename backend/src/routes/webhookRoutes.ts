/**
 * Webhook Routes
 *
 * These routes are mounted BEFORE auth middleware because
 * webhooks come from payment providers, not authenticated users.
 * Signature verification is the security gate.
 */

import { Router, type RequestHandler } from "express";

import { getCassoWebhookHealth, handleCassoWebhook } from "../controllers/cassoWebhookController";
import { getPayosWebhookHealth, handlePayosWebhook } from "../controllers/payosWebhookController";
import { handleWebhook } from "../controllers/webhookController";
import { cassoWebhookLimiter, payosWebhookLimiter, webhookRateLimiter } from "../middleware/rateLimiters";
import { validateCassoWebhookPayload, validateWebhookProviderParam } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const webhookRoutes = Router();

function setWebhookProvider(provider: string): RequestHandler {
  return (req, _res, next) => {
    req.params.provider = provider;
    next();
  };
}

// Casso-specific webhook (matches PaymentOrders by bank transfer description)
webhookRoutes.get("/billing/webhook/casso/health", asyncHandler(getCassoWebhookHealth));
webhookRoutes.get("/webhook/casso/health", asyncHandler(getCassoWebhookHealth));
webhookRoutes.post(
  "/billing/webhook/casso",
  cassoWebhookLimiter,
  validateCassoWebhookPayload,
  asyncHandler(handleCassoWebhook),
);
webhookRoutes.post(
  "/webhook/casso",
  cassoWebhookLimiter,
  validateCassoWebhookPayload,
  asyncHandler(handleCassoWebhook),
);
webhookRoutes.post(
  "/webhooks/casso",
  cassoWebhookLimiter,
  validateCassoWebhookPayload,
  asyncHandler(handleCassoWebhook),
);
// PayOS-specific webhook (matches local PaymentOrders by PayOS orderCode/paymentLinkId/description)
webhookRoutes.get("/billing/webhook/payos/health", asyncHandler(getPayosWebhookHealth));
webhookRoutes.get("/webhook/payos/health", asyncHandler(getPayosWebhookHealth));
webhookRoutes.get("/webhooks/payos/health", asyncHandler(getPayosWebhookHealth));
webhookRoutes.post(
  "/webhooks/payos",
  payosWebhookLimiter,
  asyncHandler(handlePayosWebhook),
);
webhookRoutes.post(
  "/billing/webhook/payos",
  payosWebhookLimiter,
  asyncHandler(handlePayosWebhook),
);
// Generic provider webhook (VNPay, mock, etc.)
webhookRoutes.post(
  "/billing/webhook/:provider",
  webhookRateLimiter,
  validateWebhookProviderParam,
  asyncHandler(handleWebhook),
);
webhookRoutes.post(
  "/webhooks/:provider",
  webhookRateLimiter,
  validateWebhookProviderParam,
  asyncHandler(handleWebhook),
);

export { webhookRoutes };

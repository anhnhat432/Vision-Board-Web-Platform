/**
 * Webhook Routes
 *
 * These routes are mounted BEFORE auth middleware because
 * webhooks come from payment providers, not authenticated users.
 * Signature verification is the security gate.
 */

import { Router } from "express";

import { handleCassoWebhook } from "../controllers/cassoWebhookController";
import { handleWebhook } from "../controllers/webhookController";
import { asyncHandler } from "../utils/asyncHandler";

const webhookRoutes = Router();

// Casso-specific webhook (matches PaymentOrders by bank transfer description)
webhookRoutes.post("/billing/webhook/casso", asyncHandler(handleCassoWebhook));
// Generic provider webhook (PayOS, VNPay, mock, etc.)
webhookRoutes.post("/billing/webhook/:provider", asyncHandler(handleWebhook));

export { webhookRoutes };

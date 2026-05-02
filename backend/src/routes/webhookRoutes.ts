/**
 * Webhook Routes
 *
 * These routes are mounted BEFORE auth middleware because
 * webhooks come from payment providers, not authenticated users.
 * Signature verification is the security gate.
 */

import { Router } from "express";

import { handleWebhook } from "../controllers/webhookController";
import { asyncHandler } from "../utils/asyncHandler";

const webhookRoutes = Router();

webhookRoutes.post("/billing/webhook/:provider", asyncHandler(handleWebhook));

export { webhookRoutes };

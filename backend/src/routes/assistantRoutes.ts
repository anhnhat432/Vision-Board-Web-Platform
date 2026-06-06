/**
 * Assistant Routes.
 *
 * POST /api/assistant/chat
 * POST /api/assistant/chat/stream (SSE streaming)
 * POST /api/ai/assistant
 * POST /api/ai/assistant/stream (structured SSE streaming)
 */

import { Router } from "express";
import multer from "multer";
import {
  chatController,
  streamChatController,
  aiAssistantController,
  aiAssistantStreamController,
  assistantTelemetryController,
  assistantTelemetryOverviewController,
  assistantAlertsController,
  transcribeController,
} from "../controllers/assistantController";
import { assistantRateLimiter } from "../middleware/rateLimiters";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /assistant/chat - non-streaming fallback
router.post("/assistant/chat", assistantRateLimiter, chatController);

// POST /assistant/chat/stream - SSE streaming
router.post("/assistant/chat/stream", assistantRateLimiter, streamChatController);

// POST /ai/assistant - Phase 3 structured assistant route
router.post("/ai/assistant", assistantRateLimiter, aiAssistantController);

// POST /ai/assistant/stream - structured assistant route with Groq SSE streaming
router.post("/ai/assistant/stream", assistantRateLimiter, aiAssistantStreamController);

// POST /ai/assistant/telemetry - G4: nhận event observability redacted từ frontend
router.post("/ai/assistant/telemetry", assistantRateLimiter, assistantTelemetryController);

// GET /ai/assistant/telemetry/overview - G4/G5: dashboard vận hành (admin-only)
router.get(
  "/ai/assistant/telemetry/overview",
  asyncHandler(requireAdmin),
  asyncHandler(assistantTelemetryOverviewController),
);

// GET /ai/assistant/alerts - GĐ5: alert vận hành theo SLO (admin-only)
router.get(
  "/ai/assistant/alerts",
  asyncHandler(requireAdmin),
  asyncHandler(assistantAlertsController),
);

// POST /assistant/transcribe - Transcribe speech audio to text
router.post("/assistant/transcribe", assistantRateLimiter, upload.single("file"), transcribeController);

export { router as assistantRoutes };

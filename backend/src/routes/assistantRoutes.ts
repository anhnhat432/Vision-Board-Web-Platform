/**
 * Assistant Routes.
 *
 * POST /api/assistant/chat
 * POST /api/assistant/chat/stream (SSE streaming)
 */

import { Router } from "express";
import { chatController, streamChatController } from "../controllers/assistantController";
import { assistantRateLimiter } from "../middleware/rateLimiters";

const router = Router();

// POST /assistant/chat - non-streaming fallback
router.post("/assistant/chat", assistantRateLimiter, chatController);

// POST /assistant/chat/stream - SSE streaming
router.post("/assistant/chat/stream", assistantRateLimiter, streamChatController);

export { router as assistantRoutes };

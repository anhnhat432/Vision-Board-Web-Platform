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
  transcribeController,
} from "../controllers/assistantController";
import { assistantRateLimiter } from "../middleware/rateLimiters";

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

// POST /assistant/transcribe - Transcribe speech audio to text
router.post("/assistant/transcribe", assistantRateLimiter, upload.single("file"), transcribeController);

export { router as assistantRoutes };

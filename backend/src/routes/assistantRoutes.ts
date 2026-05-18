/**
 * Assistant Routes.
 *
 * POST /api/assistant/chat
 */

import { Router } from "express";
import { chatController } from "../controllers/assistantController";
import { assistantRateLimiter } from "../middleware/rateLimiters";

const router = Router();

// POST /assistant/chat
router.post("/assistant/chat", assistantRateLimiter, chatController);

export { router as assistantRoutes };

/**
 * Assistant Routes.
 *
 * POST /api/assistant/chat
 * POST /api/assistant/chat/stream (SSE streaming)
 * POST /api/ai/assistant
 * POST /api/ai/assistant/stream (structured SSE streaming)
 */

import { type RequestHandler, Router } from "express";
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
import { ApiError } from "../utils/apiError";

const router = Router();
const MAX_TRANSCRIBE_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TRANSCRIBE_MIME_TYPES = new Set([
  "audio/webm",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/opus",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: MAX_TRANSCRIBE_FILE_BYTES },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_TRANSCRIBE_MIME_TYPES.has(file.mimetype)) {
      cb(new ApiError(400, "Định dạng file âm thanh không được hỗ trợ.", undefined, "ASSISTANT_INVALID_AUDIO_TYPE"));
      return;
    }
    cb(null, true);
  },
});

const uploadTranscribeMiddleware: RequestHandler = (req, res, next) => {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        next(new ApiError(413, "File âm thanh quá lớn. Giới hạn tối đa là 10MB.", undefined, "ASSISTANT_FILE_TOO_LARGE"));
        return;
      }
      next(new ApiError(400, `Upload error: ${err.message}`, undefined, "ASSISTANT_UPLOAD_ERROR"));
      return;
    }
    if (err) {
      next(err as Error);
      return;
    }
    next();
  });
};

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
router.post("/assistant/transcribe", assistantRateLimiter, uploadTranscribeMiddleware, transcribeController);

export { router as assistantRoutes };

import type { Request, Response } from "express";
import {
  processAssistantRequest,
  processAssistantRequestStream,
  type AssistantRequest,
  validateAssistantRequest,
} from "../services/assistantService";
import {
  processAIAssistantRequest,
  processAIAssistantRequestStream,
  type AIAssistantRequest,
} from "../services/aiAssistantService";
import { transcribeAudio } from "../services/groqAssistantProvider";
import { errorResponse, successResponse } from "../utils/apiResponse";

function withErrorCode(message: string, errorCode: string) {
  const payload = errorResponse(message);
  return { ...payload, errorCode };
}

function getProviderStatus(errorCode: string): number {
  if (errorCode === "ASSISTANT_PROVIDER_NOT_CONFIGURED") return 503;
  if (errorCode === "ASSISTANT_PROVIDER_TIMEOUT") return 504;
  return 502;
}

function getAiProviderStatus(errorCode: string): number {
  if (errorCode === "AI_PROVIDER_NOT_CONFIGURED" || errorCode === "ASSISTANT_PROVIDER_NOT_CONFIGURED") return 503;
  if (errorCode === "ASSISTANT_PROVIDER_TIMEOUT") return 504;
  return 400;
}

function validateAIAssistantBody(body: any):
  | { request: AIAssistantRequest }
  | { error: { message: string; errorCode: string } } {
  const { message, context, mode, history } = body;

  if (typeof message !== "string" || !message.trim()) {
    return { error: { message: "Tin nhắn không hợp lệ.", errorCode: "AI_INVALID_MESSAGE" } };
  }

  if (!context || typeof context !== "object") {
    return { error: { message: "Dữ liệu ngữ cảnh không hợp lệ.", errorCode: "AI_INVALID_CONTEXT" } };
  }

  if (mode !== "demo" && mode !== "real") {
    return { error: { message: "Chế độ ứng dụng không hợp lệ.", errorCode: "AI_INVALID_MODE" } };
  }

  return {
    request: {
      message,
      context,
      mode,
      history,
    },
  };
}

function writeSseEvent(res: Response, event: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export async function chatController(req: Request, res: Response) {
  const validation = validateAssistantRequest(req.body);

  if (!validation.valid || validation.error) {
    return res.status(400).json(
      withErrorCode(
        validation.error?.message ?? "Yêu cầu không hợp lệ.",
        validation.error?.errorCode ?? "ASSISTANT_INVALID_REQUEST",
      ),
    );
  }

  try {
    const result = await processAssistantRequest(req.body as AssistantRequest);

    if ("errorCode" in result) {
      return res.status(getProviderStatus(result.errorCode)).json(
        withErrorCode(result.message, result.errorCode),
      );
    }

    return res.json(successResponse(result));
  } catch (error) {
    console.error("[assistant] Unexpected error:", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json(
      withErrorCode("Đã xảy ra lỗi khi xử lý yêu cầu.", "ASSISTANT_INTERNAL_ERROR"),
    );
  }
}

export async function streamChatController(req: Request, res: Response) {
  const validation = validateAssistantRequest(req.body);

  if (!validation.valid || validation.error) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    return res.write(`data: ${JSON.stringify({
      type: "error",
      message: validation.error?.message ?? "Yêu cầu không hợp lệ.",
      errorCode: validation.error?.errorCode ?? "ASSISTANT_INVALID_REQUEST",
    })}\n\n`);
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const abortController = new AbortController();
  req.on("close", () => abortController.abort());

  const onDelta = (text: string) => {
    res.write(`data: ${JSON.stringify({ type: "delta", text })}\n\n`);
  };

  try {
    const error = await processAssistantRequestStream(req.body as AssistantRequest, onDelta);

    if (error) {
      res.write(`data: ${JSON.stringify({
        type: "error",
        message: error.message,
        errorCode: error.errorCode,
      })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error) {
    console.error("[assistant] Stream error:", error instanceof Error ? error.name : "UnknownError");
    res.write(`data: ${JSON.stringify({
      type: "error",
      message: "Đã xảy ra lỗi khi xử lý yêu cầu.",
      errorCode: "ASSISTANT_INTERNAL_ERROR",
    })}\n\n`);
    res.end();
  }
}

export async function aiAssistantController(req: Request, res: Response) {
  const { message, context, mode, history } = req.body;

  // Validate request
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json(
      withErrorCode("Tin nhắn không hợp lệ.", "AI_INVALID_MESSAGE"),
    );
  }

  if (!context || typeof context !== "object") {
    return res.status(400).json(
      withErrorCode("Dữ liệu ngữ cảnh không hợp lệ.", "AI_INVALID_CONTEXT"),
    );
  }

  if (mode !== "demo" && mode !== "real") {
    return res.status(400).json(
      withErrorCode("Chế độ ứng dụng không hợp lệ.", "AI_INVALID_MODE"),
    );
  }

  try {
    const requestData: AIAssistantRequest = {
      message,
      context,
      mode,
      history,
    };

    const result = await processAIAssistantRequest(requestData);

    if ("errorCode" in result) {
      const status = getAiProviderStatus(result.errorCode);
      return res.status(status).json(
        withErrorCode(result.message, result.errorCode),
      );
    }

    return res.json(successResponse(result));
  } catch (error) {
    console.error("[ai-assistant] Unexpected error:", error instanceof Error ? error.name : "UnknownError");
    return res.status(500).json(
      withErrorCode("Đã xảy ra lỗi hệ thống khi xử lý yêu cầu.", "AI_INTERNAL_ERROR"),
    );
  }
}

export async function aiAssistantStreamController(req: Request, res: Response) {
  const validation = validateAIAssistantBody(req.body);

  if ("error" in validation) {
    return res.status(400).json(
      withErrorCode(validation.error.message, validation.error.errorCode),
    );
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const abortController = new AbortController();
  let closed = false;
  req.on("close", () => {
    closed = true;
    abortController.abort();
  });

  const onDelta = (text: string) => {
    if (!closed && !res.writableEnded) {
      writeSseEvent(res, { type: "delta", text });
    }
  };

  try {
    const error = await processAIAssistantRequestStream(validation.request, onDelta, abortController.signal);

    if (!closed && !res.writableEnded) {
      if (error) {
        writeSseEvent(res, {
          type: "error",
          message: error.message,
          errorCode: error.errorCode,
        });
      }

      writeSseEvent(res, { type: "done" });
      res.end();
    }
  } catch (error) {
    console.error("[ai-assistant] Stream error:", error instanceof Error ? error.name : "UnknownError");
    if (!closed && !res.writableEnded) {
      writeSseEvent(res, {
        type: "error",
        message: "Đã xảy ra lỗi hệ thống khi xử lý yêu cầu.",
        errorCode: "AI_INTERNAL_ERROR",
      });
      res.end();
    }
  }
}

export async function transcribeController(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json(
      withErrorCode("Không tìm thấy file âm thanh để nhận diện.", "ASSISTANT_NO_FILE")
    );
  }

  try {
    const text = await transcribeAudio(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname || "audio.webm"
    );

    return res.json(successResponse({ text }));
  } catch (error: any) {
    console.error("[assistant] Transcribe error:", error instanceof Error ? error.message : error);
    return res.status(500).json(
      withErrorCode(
        error.message || "Đã xảy ra lỗi khi chuyển đổi giọng nói thành văn bản.",
        "ASSISTANT_TRANSCRIBE_ERROR"
      )
    );
  }
}

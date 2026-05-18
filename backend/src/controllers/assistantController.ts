import type { Request, Response } from "express";
import {
  processAssistantRequest,
  processAssistantRequestStream,
  type AssistantRequest,
  validateAssistantRequest,
} from "../services/assistantService";
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

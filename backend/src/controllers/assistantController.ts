import type { Request, Response } from "express";
import {
  processAssistantRequest,
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

import { isDemoMode } from "@/app/utils/app-mode";
import { post } from "@/lib/api/apiClient";
import { mockProvider } from "./assistantEngine";
import type { AssistantContext } from "./buildAssistantContext";
import { sanitizeAssistantContext } from "./sanitizeContext";

export interface AssistantChatRequest {
  message: string;
  context: AssistantContext & { route: string };
}

export interface AssistantChatResponse {
  message: string;
}

export interface AssistantApiError {
  message: string;
  errorCode?: string;
  status?: number;
}

export async function sendAssistantMessage(
  request: AssistantChatRequest,
): Promise<AssistantChatResponse> {
  const sanitizedContext = sanitizeAssistantContext(request.context);

  if (isDemoMode()) {
    const message = await mockProvider.send(request.message, sanitizedContext);
    return { message };
  }

  try {
    return await post<AssistantChatResponse>("/assistant/chat", {
      message: request.message,
      context: sanitizedContext,
    });
  } catch (error) {
    const apiError = error as AssistantApiError;
    throw {
      message: apiError.message || "Không thể kết nối với trợ lý AI.",
      errorCode: apiError.errorCode,
      status: apiError.status,
    };
  }
}

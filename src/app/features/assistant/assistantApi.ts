import { isDemoMode } from "@/app/utils/app-mode";
import { getApiBaseUrl, post } from "@/lib/api/apiClient";
import { mockProvider } from "./assistantEngine";
import type { AssistantContext } from "./buildAssistantContext";
import { sanitizeAssistantContext } from "./sanitizeContext";
import type { ChatHistoryMessage } from "./types";

const MAX_HISTORY = 6;
const MAX_HISTORY_CONTENT = 500;

export interface AssistantChatRequest {
  message: string;
  context: AssistantContext & { route: string };
  history?: ChatHistoryMessage[];
}

export interface AssistantChatResponse {
  message: string;
}

export interface AssistantApiError {
  message: string;
  errorCode?: string;
  status?: number;
}

export interface StreamingAssistantDelta {
  type: "delta";
  text: string;
}

export interface StreamingAssistantDone {
  type: "done";
}

export interface StreamingAssistantError {
  type: "error";
  message: string;
  errorCode: string;
}

export type StreamingAssistantEvent = StreamingAssistantDelta | StreamingAssistantDone | StreamingAssistantError;

function sanitizeHistory(history: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .filter((msg) => msg && typeof msg === "object" && "role" in msg && "content" in msg)
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .filter((msg) => typeof msg.content === "string" && msg.content.trim())
    .slice(-MAX_HISTORY)
    .map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content.trim().slice(0, MAX_HISTORY_CONTENT),
    }));
}

export async function sendAssistantMessage(
  request: AssistantChatRequest,
): Promise<AssistantChatResponse> {
  const sanitizedContext = sanitizeAssistantContext(request.context);
  const sanitizedHistory = sanitizeHistory(request.history);

  if (isDemoMode()) {
    const message = await mockProvider.send(request.message, sanitizedContext, sanitizedHistory);
    return { message };
  }

  try {
    return await post<AssistantChatResponse>("/assistant/chat", {
      message: request.message,
      context: sanitizedContext,
      history: sanitizedHistory,
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

export async function sendAssistantMessageStream(
  request: AssistantChatRequest,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const sanitizedContext = sanitizeAssistantContext(request.context);
  const sanitizedHistory = sanitizeHistory(request.history);

  if (isDemoMode()) {
    // Demo mode: non-streaming, call onDelta once with full response
    const message = await mockProvider.send(request.message, sanitizedContext, sanitizedHistory);
    onDelta(message);
    return;
  }

  const url = `${getApiBaseUrl()}/assistant/chat/stream`;
  const body = {
    message: request.message,
    context: sanitizedContext,
    history: sanitizedHistory,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    throw {
      message: "Không thể kết nối với trợ lý AI.",
      errorCode: "ASSISTANT_CONNECTION_ERROR",
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      if (!event.trim()) continue;

      const line = event.startsWith("data: ") ? event.slice(6) : event;
      if (!line) continue;

      try {
        const parsed = JSON.parse(line) as StreamingAssistantEvent;
        if (parsed.type === "delta") {
          onDelta(parsed.text);
        } else if (parsed.type === "done") {
          return;
        } else if (parsed.type === "error") {
          throw {
            message: parsed.message,
            errorCode: parsed.errorCode,
          };
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }
}

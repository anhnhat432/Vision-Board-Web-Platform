import { isDemoMode } from "@/app/utils/app-mode";
import { getApiBaseUrl, post } from "@/lib/api/apiClient";
import { AuthError, authedFetch } from "@/lib/auth/authedFetch";
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

  let response: Response;
  try {
    response = await authedFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const wrapped = new Error(error.message) as Error & { errorCode?: string; status?: number };
      wrapped.errorCode = "ASSISTANT_AUTH_ERROR";
      wrapped.status = error.status;
      throw wrapped;
    }
    throw error;
  }

  if (!response.ok || !response.body) {
    const err = new Error("Không thể kết nối với trợ lý AI.") as Error & {
      errorCode?: string;
    };
    err.errorCode = "ASSISTANT_CONNECTION_ERROR";
    throw err;
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

      let parsed: StreamingAssistantEvent;
      try {
        parsed = JSON.parse(line) as StreamingAssistantEvent;
      } catch {
        // Skip invalid JSON
        continue;
      }

      if (parsed.type === "delta") {
        onDelta(parsed.text);
      } else if (parsed.type === "done") {
        return;
      } else if (parsed.type === "error") {
        const err = new Error(parsed.message) as Error & { errorCode?: string };
        err.errorCode = parsed.errorCode;
        throw err;
      }
    }
  }
}

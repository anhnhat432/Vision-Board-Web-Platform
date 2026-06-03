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

function createAbortError(): Error & { errorCode: string } {
  const error = new Error("Generation stopped.") as Error & { errorCode: string };
  error.errorCode = "ABORT_ERROR";
  return error;
}

function isAbortError(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "name" in error && (error as { name?: unknown }).name === "AbortError",
  );
}

async function runWithAbort<T>(task: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return task;
  if (signal.aborted) throw createAbortError();

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => reject(createAbortError());
    signal.addEventListener("abort", handleAbort, { once: true });
    task.then(resolve, reject).finally(() => signal.removeEventListener("abort", handleAbort));
  });
}

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

export async function sendAssistantMessage(request: AssistantChatRequest): Promise<AssistantChatResponse> {
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
    const message = await runWithAbort(mockProvider.send(request.message, sanitizedContext, sanitizedHistory), signal);
    onDelta(message);
    return;
  }

  const url = `${getApiBaseUrl()}/ai/assistant`;
  const body = {
    message: request.message,
    context: sanitizedContext,
    history: sanitizedHistory,
    mode: "real",
  };

  let response: Response;
  try {
    response = await authedFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw createAbortError();
    }
    if (error instanceof AuthError) {
      const wrapped = new Error(error.message) as Error & { errorCode?: string; status?: number };
      wrapped.errorCode = "ASSISTANT_AUTH_ERROR";
      wrapped.status = error.status;
      throw wrapped;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const wrapped = new Error("Bạn đang ngoại tuyến. Vui lòng kết nối mạng để sử dụng Trợ lý AI.") as Error & {
        errorCode?: string;
      };
      wrapped.errorCode = "ASSISTANT_OFFLINE";
      throw wrapped;
    }
    const wrapped = new Error("Không thể kết nối với máy chủ (backend unavailable). Vui lòng thử lại sau.") as Error & {
      errorCode?: string;
    };
    wrapped.errorCode = "ASSISTANT_BACKEND_UNAVAILABLE";
    throw wrapped;
  }

  if (!response.ok) {
    let errMessage = "Không thể kết nối với trợ lý AI.";
    let errCode = "ASSISTANT_CONNECTION_ERROR";
    try {
      const errJson = await response.json();
      if (errJson?.message) {
        errMessage = errJson.message;
        errCode = errJson.errorCode || errCode;
      }
    } catch {}

    const err = new Error(errMessage) as Error & { errorCode?: string; status?: number };
    err.errorCode = errCode;
    err.status = response.status;
    throw err;
  }

  const json = await response.json();
  if (json.success && json.data) {
    const { assistantText, proposedActions } = json.data;

    let finalContent = assistantText;
    if (proposedActions && proposedActions.length > 0) {
      for (const action of proposedActions) {
        finalContent += `\n\n\`\`\`action\n${JSON.stringify(action, null, 2)}\n\`\`\``;
      }
    }

    onDelta(finalContent);
  } else {
    const err = new Error(json.message || "Không thể kết nối với trợ lý AI.") as Error & { errorCode?: string };
    err.errorCode = json.errorCode || "ASSISTANT_CONNECTION_ERROR";
    throw err;
  }
}

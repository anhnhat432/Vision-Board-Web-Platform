import { isDemoMode } from "@/app/utils/app-mode";
import { getApiBaseUrl, isApiBaseUrlConfigured, post } from "@/lib/api/apiClient";
import { AuthError, authedFetch } from "@/lib/auth/authedFetch";
import { mockProvider } from "./assistantEngine";
import { getSessionId } from "./assistantObservability";
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

function createAssistantApiError(
  message: string,
  errorCode?: string,
  status?: number,
): Error & {
  errorCode?: string;
  status?: number;
} {
  const error = new Error(message) as Error & { errorCode?: string; status?: number };
  error.errorCode = errorCode;
  error.status = status;
  return error;
}

function createAssistantBackendNotConfiguredError(): Error & { errorCode?: string; status?: number } {
  return createAssistantApiError(
    "Trợ lý AI chưa được cấu hình backend. Vui lòng liên hệ hỗ trợ.",
    "ASSISTANT_BACKEND_NOT_CONFIGURED",
  );
}

function getConfiguredAssistantApiBaseUrl(): string {
  if (!isApiBaseUrlConfigured()) {
    throw createAssistantBackendNotConfiguredError();
  }

  return getApiBaseUrl();
}

function wrapAssistantFetchError(error: unknown): Error & { errorCode?: string; status?: number } {
  if (isAbortError(error)) {
    return createAbortError();
  }
  if (error instanceof AuthError) {
    return createAssistantApiError(error.message, "ASSISTANT_AUTH_ERROR", error.status);
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return createAssistantApiError(
      "Bạn đang ngoại tuyến. Vui lòng kết nối mạng để sử dụng Trợ lý AI.",
      "ASSISTANT_OFFLINE",
    );
  }
  return createAssistantApiError(
    "Không thể kết nối với máy chủ (backend unavailable). Vui lòng thử lại sau.",
    "ASSISTANT_BACKEND_UNAVAILABLE",
  );
}

async function fetchStructuredAssistant(url: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  try {
    return await authedFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    throw wrapAssistantFetchError(error);
  }
}

async function createErrorFromResponse(response: Response): Promise<Error & { errorCode?: string; status?: number }> {
  let errMessage = "Không thể kết nối với trợ lý AI.";
  let errCode = "ASSISTANT_CONNECTION_ERROR";
  try {
    const errJson = await response.json();
    if (errJson?.message) {
      errMessage = errJson.message;
      errCode = errJson.errorCode || errCode;
    }
  } catch {}

  return createAssistantApiError(errMessage, errCode, response.status);
}

function formatStructuredAssistantContent(data: { assistantText?: unknown; proposedActions?: unknown }): string {
  let finalContent = typeof data.assistantText === "string" ? data.assistantText : "";
  if (Array.isArray(data.proposedActions) && data.proposedActions.length > 0) {
    for (const action of data.proposedActions) {
      finalContent += `\n\n\`\`\`action\n${JSON.stringify(action, null, 2)}\n\`\`\``;
    }
  }
  return finalContent;
}

async function sendStructuredAssistantJsonFallback(
  body: unknown,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetchStructuredAssistant(`${getConfiguredAssistantApiBaseUrl()}/ai/assistant`, body, signal);

  if (!response.ok) {
    throw await createErrorFromResponse(response);
  }

  const json = await response.json();
  if (json.success && json.data) {
    onDelta(formatStructuredAssistantContent(json.data));
    return;
  }

  throw createAssistantApiError(
    json.message || "Không thể kết nối với trợ lý AI.",
    json.errorCode || "ASSISTANT_CONNECTION_ERROR",
  );
}

async function readStructuredAssistantSse(response: Response, onDelta: (text: string) => void): Promise<void> {
  if (!response.body) {
    throw createAssistantApiError("Không thể nhận luồng dữ liệu từ trợ lý AI.", "ASSISTANT_STREAM_UNAVAILABLE");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const processEvent = (event: string) => {
    const dataLines = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""));
    if (dataLines.length === 0) return;

    const data = dataLines.join("\n");
    if (data === "[DONE]") return;

    let parsed: StreamingAssistantEvent;
    try {
      parsed = JSON.parse(data) as StreamingAssistantEvent;
    } catch {
      return;
    }

    if (parsed.type === "delta") {
      onDelta(parsed.text);
      return;
    }

    if (parsed.type === "error") {
      throw createAssistantApiError(parsed.message, parsed.errorCode);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    for (const event of events) {
      if (event.trim()) processEvent(event);
    }
  }

  const tail = buffer + decoder.decode();
  if (tail.trim()) processEvent(tail);
}

export async function sendAssistantMessage(request: AssistantChatRequest): Promise<AssistantChatResponse> {
  const sanitizedContext = sanitizeAssistantContext(request.context);
  const sanitizedHistory = sanitizeHistory(request.history);

  if (isDemoMode()) {
    const message = await mockProvider.send(request.message, sanitizedContext, sanitizedHistory);
    return { message };
  }

  try {
    if (!isApiBaseUrlConfigured()) {
      throw createAssistantBackendNotConfiguredError();
    }

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

  const body = {
    message: request.message,
    context: sanitizedContext,
    history: sanitizedHistory,
    mode: "real",
    // G4: gửi sessionId để backend hash 1 chiều cho telemetry (không gửi userId raw).
    sessionId: getSessionId(),
  };

  const streamResponse = await fetchStructuredAssistant(
    `${getConfiguredAssistantApiBaseUrl()}/ai/assistant/stream`,
    body,
    signal,
  );

  if (streamResponse.status === 404 || streamResponse.status === 405) {
    await sendStructuredAssistantJsonFallback(body, onDelta, signal);
    return;
  }

  if (!streamResponse.ok) {
    throw await createErrorFromResponse(streamResponse);
  }

  if (!streamResponse.body) {
    await sendStructuredAssistantJsonFallback(body, onDelta, signal);
    return;
  }

  await readStructuredAssistantSse(streamResponse, onDelta);
}

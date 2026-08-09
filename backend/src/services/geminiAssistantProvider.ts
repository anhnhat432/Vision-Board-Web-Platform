import { env } from "../config/env";
import { redactSensitive } from "../shared/assistantRedaction";
import type { AssistantContext } from "./assistantService";
import { buildSystemPrompt, summarizeContext } from "./assistantPromptUtils";

export interface GeminiRequest {
  system_instruction: {
    parts: Array<{ text: string }>;
  };
  contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    temperature: number;
    maxOutputTokens: number;
    responseMimeType?: "application/json";
  };
}

export interface GeminiResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export interface AssistantProviderResponse {
  message: string;
}

export interface AssistantProviderError {
  message: string;
  errorCode: string;
}

export interface GeminiRequestOptions {
  model?: string;
}

export interface StructuredProviderPromptRequest {
  systemPrompt: string;
  contextMessage: string;
  userMessage: string;
  maxTokens: number;
  temperature: number;
  jsonObject: boolean;
  signal?: AbortSignal;
  model?: string;
}

const GEMINI_TIMEOUT_MS = 30_000;

interface GeminiErrorBody {
  error?: { message?: string; status?: string; code?: number };
}

function redactProviderText(value: string, maxLength: number): string {
  return redactSensitive(value).slice(0, maxLength);
}

function getRedactedProviderMessage(message: string | undefined): string | undefined {
  const redacted = message ? redactProviderText(message, 200).trim() : "";
  return redacted || undefined;
}

async function extractGeminiErrorDetails(response: Response): Promise<{ status: number; body: string; parsed?: GeminiErrorBody }> {
  const status = response.status;
  let body = "";
  let parsed: GeminiErrorBody | undefined;
  try {
    body = await response.text();
    parsed = JSON.parse(body) as GeminiErrorBody;
  } catch {}
  return { status, body: redactProviderText(body, 500), parsed };
}

function isGeminiAuthError(status: number, parsed?: GeminiErrorBody): boolean {
  if (status === 401 || status === 403) return true;
  const providerStatus = parsed?.error?.status?.toLowerCase() ?? "";
  const providerMsg = parsed?.error?.message?.toLowerCase() ?? "";
  return (
    providerStatus === "unauthenticated" ||
    providerStatus === "permission_denied" ||
    providerMsg.includes("api key not valid") ||
    providerMsg.includes("api_key_invalid") ||
    providerMsg.includes("invalid api key")
  );
}

function getGeminiErrorMessage(status: number, parsed?: GeminiErrorBody): AssistantProviderError {
  const providerMsg = getRedactedProviderMessage(parsed?.error?.message);
  if (status === 429) {
    return {
      message: "Trợ lý AI đang quá tải (rate limit). Vui lòng đợi vài giây rồi thử lại.",
      errorCode: "ASSISTANT_PROVIDER_RATE_LIMIT",
    };
  }
  if (isGeminiAuthError(status, parsed)) {
    return {
      message: "Xác thực với dịch vụ AI không thành công. Vui lòng kiểm tra API Key.",
      errorCode: "ASSISTANT_PROVIDER_AUTH_ERROR",
    };
  }
  if (status >= 500) {
    return {
      message: providerMsg
        ? `Dịch vụ AI đang gặp sự cố: ${providerMsg}. Thử lại sau nhé.`
        : "Dịch vụ AI đang gặp sự cố tạm thời. Thử lại sau nhé.",
      errorCode: "ASSISTANT_PROVIDER_SERVER_ERROR",
    };
  }
  return {
    message: providerMsg
      ? `Trợ lý AI gặp lỗi: ${providerMsg}`
      : "Trợ lý AI đang gặp vấn đề. Thử lại sau nhé.",
    errorCode: "ASSISTANT_PROVIDER_ERROR",
  };
}

function getGeminiApiUrl(modelName: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;
}

function buildRequestBody(
  userMessage: string,
  context: AssistantContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): GeminiRequest {
  // Map conversation history to Gemini format
  const mappedHistory = history.map((msg) => {
    const role: "user" | "model" = msg.role === "assistant" ? "model" : "user";
    return { role, parts: [{ text: msg.content }] };
  });

  return {
    system_instruction: {
      parts: [{ text: buildSystemPrompt(context) }],
    },
    contents: [
      ...mappedHistory,
      {
        role: "user",
        parts: [{ text: `${summarizeContext(context)}\n\nNgười dùng hỏi: ${userMessage}` }],
      },
    ],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 420,
    },
  };
}

function buildStructuredPromptRequestBody(request: StructuredProviderPromptRequest): GeminiRequest {
  return {
    system_instruction: {
      parts: [{ text: request.systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: `${request.contextMessage}\n\n${request.userMessage}` }],
      },
    ],
    generationConfig: {
      temperature: request.temperature,
      maxOutputTokens: request.maxTokens,
      ...(request.jsonObject ? { responseMimeType: "application/json" as const } : {}),
    },
  };
}

function extractGeminiText(data: GeminiResponse): string {
  return data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim() ?? "";
}

function getActiveGeminiConfig(): { apiKey: string | undefined; model: string } {
  return {
    apiKey: env.AI_PROVIDER === "gemini" ? (env.AI_API_KEY || env.GEMINI_API_KEY) : env.GEMINI_API_KEY,
    model: env.AI_PROVIDER === "gemini" ? (env.AI_MODEL || env.GEMINI_MODEL) : env.GEMINI_MODEL,
  };
}

async function sendGeminiRequest(
  requestBody: GeminiRequest,
  model: string,
  externalSignal?: AbortSignal,
): Promise<AssistantProviderResponse | AssistantProviderError> {
  const { apiKey } = getActiveGeminiConfig();
  if (!apiKey) {
    return {
      message: "Trợ lý AI hiện chưa được cấu hình. Vui lòng thử lại sau.",
      errorCode: "ASSISTANT_PROVIDER_NOT_CONFIGURED",
    };
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), GEMINI_TIMEOUT_MS);
  const handleExternalAbort = () => abortController.abort();
  externalSignal?.addEventListener("abort", handleExternalAbort, { once: true });

  try {
    const response = await fetch(getGeminiApiUrl(model), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", handleExternalAbort);

    if (!response.ok) {
      const details = await extractGeminiErrorDetails(response);
      console.error("[Gemini] API error:", { model, status: details.status, body: details.body });
      return getGeminiErrorMessage(details.status, details.parsed);
    }

    const data = await response.json() as GeminiResponse;
    const text = extractGeminiText(data);
    if (!text) {
      return {
        message: "Trợ lý chưa có gợi ý phù hợp cho câu hỏi này. Thử hỏi cụ thể hơn nhé.",
        errorCode: "ASSISTANT_PROVIDER_ERROR",
      };
    }
    return { message: text };
  } catch (error) {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", handleExternalAbort);
    if (error instanceof Error && error.name === "AbortError") {
      return {
        message: "Phản hồi từ trợ lý quá lâu. Thử lại nhé.",
        errorCode: "ASSISTANT_PROVIDER_TIMEOUT",
      };
    }
    console.error("[Gemini] Request failed:", error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError");
    return {
      message: "Trợ lý AI đang gặp vấn đề. Thử lại sau nhé.",
      errorCode: "ASSISTANT_PROVIDER_ERROR",
    };
  }
}

export async function sendToGemini(
  userMessage: string,
  context: AssistantContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  options: GeminiRequestOptions = {},
): Promise<AssistantProviderResponse | AssistantProviderError> {
  const { model } = getActiveGeminiConfig();
  const activeModel = options.model?.trim() || model;
  return sendGeminiRequest(buildRequestBody(userMessage, context, history), activeModel);
}

export async function sendPromptToGemini(
  request: StructuredProviderPromptRequest,
): Promise<AssistantProviderResponse | AssistantProviderError> {
  const { model } = getActiveGeminiConfig();
  const activeModel = request.model?.trim() || model;
  return sendGeminiRequest(buildStructuredPromptRequestBody(request), activeModel, request.signal);
}

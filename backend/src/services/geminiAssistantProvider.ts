import { env } from "../config/env";
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

const GEMINI_TIMEOUT_MS = 30_000;

interface GeminiErrorBody {
  error?: { message?: string; status?: string; code?: number };
}

async function extractGeminiErrorDetails(response: Response): Promise<{ status: number; body: string; parsed?: GeminiErrorBody }> {
  const status = response.status;
  let body = "";
  let parsed: GeminiErrorBody | undefined;
  try {
    body = await response.text();
    parsed = JSON.parse(body) as GeminiErrorBody;
  } catch {}
  return { status, body: body.slice(0, 500), parsed };
}

function getGeminiErrorMessage(status: number, parsed?: GeminiErrorBody): AssistantProviderError {
  const providerMsg = parsed?.error?.message?.slice(0, 200);
  if (status === 429) {
    return {
      message: "Trợ lý AI đang quá tải (rate limit). Vui lòng đợi vài giây rồi thử lại.",
      errorCode: "ASSISTANT_PROVIDER_RATE_LIMIT",
    };
  }
  if (status === 401 || status === 403) {
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
      parts: [{ text: buildSystemPrompt() }],
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

function extractGeminiText(data: GeminiResponse): string {
  return data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim() ?? "";
}

export async function sendToGemini(
  userMessage: string,
  context: AssistantContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<AssistantProviderResponse | AssistantProviderError> {
  const activeApiKey = env.AI_PROVIDER === "gemini" ? (env.AI_API_KEY || env.GEMINI_API_KEY) : env.GEMINI_API_KEY;
  const activeModel = env.AI_PROVIDER === "gemini" ? (env.AI_MODEL || env.GEMINI_MODEL) : env.GEMINI_MODEL;

  if (!activeApiKey) {
    return {
      message: "Trợ lý AI hiện chưa được cấu hình. Vui lòng thử lại sau.",
      errorCode: "ASSISTANT_PROVIDER_NOT_CONFIGURED",
    };
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(getGeminiApiUrl(activeModel), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": activeApiKey,
      },
      body: JSON.stringify(buildRequestBody(userMessage, context, history)),
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const details = await extractGeminiErrorDetails(response);
      console.error("[Gemini] API error:", { status: details.status, body: details.body });
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

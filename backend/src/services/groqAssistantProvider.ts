import { env } from "../config/env";
import type { AssistantContext } from "./assistantService";
import { buildSystemPrompt, summarizeContext } from "./assistantPromptUtils";

interface GroqMessage {
  role: "system" | "user";
  content: string;
}

interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  temperature: number;
  max_tokens: number;
}

interface GroqChoice {
  message?: {
    content?: string;
  };
}

interface GroqResponse {
  choices?: GroqChoice[];
}

export interface AssistantProviderResponse {
  message: string;
}

export interface AssistantProviderError {
  message: string;
  errorCode: string;
}

const GROQ_TIMEOUT_MS = 15_000;

function buildRequestBody(userMessage: string, context: AssistantContext): GroqRequest {
  return {
    model: env.GROQ_MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: `${summarizeContext(context)}\n\nNgười dùng hỏi: ${userMessage}` },
    ],
    temperature: 0.5,
    max_tokens: 420,
  };
}

function extractGroqText(data: GroqResponse): string {
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function sendToGroq(
  userMessage: string,
  context: AssistantContext,
): Promise<AssistantProviderResponse | AssistantProviderError> {
  if (!env.GROQ_API_KEY) {
    return {
      message: "Trợ lý AI hiện chưa được cấu hình. Vui lòng thử lại sau.",
      errorCode: "ASSISTANT_PROVIDER_NOT_CONFIGURED",
    };
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), GROQ_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(buildRequestBody(userMessage, context)),
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("[Groq] API error status:", response.status);
      return {
        message: "Trợ lý AI đang gặp vấn đề. Thử lại sau nhé.",
        errorCode: "ASSISTANT_PROVIDER_ERROR",
      };
    }

    const data = await response.json() as GroqResponse;
    const text = extractGroqText(data);

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

    console.error("[Groq] Request failed:", error instanceof Error ? error.name : "UnknownError");
    return {
      message: "Trợ lý AI đang gặp vấn đề. Thử lại sau nhé.",
      errorCode: "ASSISTANT_PROVIDER_ERROR",
    };
  }
}
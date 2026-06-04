import { env } from "../config/env";
import type { AssistantContext } from "./assistantService";
import { buildSystemPrompt, summarizeContext } from "./assistantPromptUtils";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  temperature: number;
  max_tokens: number;
  stream?: boolean;
}

interface GroqChoice {
  message?: {
    content?: string;
  };
  delta?: {
    content?: string;
  };
}

interface GroqResponse {
  choices?: GroqChoice[];
}

interface GroqChunkResponse {
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

function buildRequestBody(
  userMessage: string,
  context: AssistantContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  modelName: string,
): GroqRequest {
  const messages: GroqMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "system", content: summarizeContext(context) },
  ];

  // Add conversation history
  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current user message
  messages.push({ role: "user", content: userMessage });

  return {
    model: modelName,
    messages,
    temperature: 0.5,
    max_tokens: 1000,
  };
}

function extractGroqText(data: GroqChunkResponse): string {
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function extractGroqDelta(data: GroqChunkResponse): string | null {
  return data.choices?.[0]?.delta?.content ?? null;
}

export async function sendToGroqStream(
  userMessage: string,
  context: AssistantContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const activeApiKey = env.AI_PROVIDER === "groq" ? (env.AI_API_KEY || env.GROQ_API_KEY) : env.GROQ_API_KEY;
  const activeModel = env.AI_PROVIDER === "groq" ? (env.AI_MODEL || env.GROQ_MODEL) : env.GROQ_MODEL;

  if (!activeApiKey) {
    throw {
      message: "Trợ lý AI hiện chưa được cấu hình. Vui lòng thử lại sau.",
      errorCode: "ASSISTANT_PROVIDER_NOT_CONFIGURED",
    };
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), GROQ_TIMEOUT_MS);

  // Handle external abort signal
  if (signal) {
    signal.addEventListener("abort", () => abortController.abort());
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${activeApiKey}`,
      },
      body: JSON.stringify({
        ...buildRequestBody(userMessage, context, history, activeModel),
        stream: true,
      }),
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("[Groq] API error status:", response.status);
      throw {
        message: "Trợ lý AI đang gặp vấn đề. Thử lại sau nhé.",
        errorCode: "ASSISTANT_PROVIDER_ERROR",
      };
    }

    if (!response.body) {
      throw {
        message: "Không thể nhận luồng dữ liệu từ trợ lý. Thử lại nhé.",
        errorCode: "ASSISTANT_PROVIDER_ERROR",
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

        const lines = event.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              return;
            }

            try {
              const parsed = JSON.parse(data) as GroqChunkResponse;
              const delta = extractGroqDelta(parsed);
              if (delta) {
                onDelta(delta);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw {
        message: "Phản hồi từ trợ lý quá lâu. Thử lại nhé.",
        errorCode: "ASSISTANT_PROVIDER_TIMEOUT",
      };
    }

    throw error;
  }
}

export async function sendToGroq(
  userMessage: string,
  context: AssistantContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<AssistantProviderResponse | AssistantProviderError> {
  const activeApiKey = env.AI_PROVIDER === "groq" ? (env.AI_API_KEY || env.GROQ_API_KEY) : env.GROQ_API_KEY;
  const activeModel = env.AI_PROVIDER === "groq" ? (env.AI_MODEL || env.GROQ_MODEL) : env.GROQ_MODEL;

  if (!activeApiKey) {
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
        "Authorization": `Bearer ${activeApiKey}`,
      },
      body: JSON.stringify(buildRequestBody(userMessage, context, history, activeModel)),
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
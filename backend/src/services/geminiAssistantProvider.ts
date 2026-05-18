import { env } from "../config/env";
import type { AssistantContext } from "./assistantService";

export interface GeminiRequest {
  system_instruction: {
    parts: Array<{ text: string }>;
  };
  contents: Array<{
    role: "user";
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

const GEMINI_TIMEOUT_MS = 15_000;

function getGeminiApiUrl(): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`;
}

function buildSystemPrompt(): string {
  return `Bạn là trợ lý AI trong ứng dụng Vision Board Web Platform.

Nhiệm vụ:
- Trả lời bằng tiếng Việt.
- Trả lời ngắn gọn, rõ ràng, thực tế, tối đa khoảng 150 từ.
- Chỉ dựa vào context được cung cấp. Nếu thiếu dữ liệu, hãy nói rõ là chưa có đủ dữ liệu.
- Ưu tiên giúp người dùng đi tiếp trong core flow: onboarding, life balance, life insight, SMART goal, feasibility, 12-week plan, weekly execution, reflection.
- Không bịa mục tiêu, task, tiến độ, trạng thái đồng bộ, thanh toán, hoặc tài khoản.
- Không dùng copy demo trong real mode.
- Không đưa lời khuyên y tế, pháp lý, tài chính như chuyên gia.
- Không yêu cầu người dùng chia sẻ thông tin nhạy cảm.

Phong cách:
- Ấm áp, bình tĩnh, cụ thể.
- Nếu có task hôm nay, ưu tiên 1-3 việc quan trọng nhất.`;
}

function summarizeContext(context: AssistantContext): string {
  const goals = context.goals
    .slice(0, 3)
    .map((goal) => `${goal.title || "Mục tiêu chưa đặt tên"} (${goal.progress}%)`)
    .join(", ");
  const tasks = context.todayTasks
    .slice(0, 5)
    .map((task) => `${task.title || "Việc chưa đặt tên"}${task.done ? " (đã xong)" : ""}`)
    .join(", ");

  return [
    "Context người dùng:",
    `- Route: ${context.route}`,
    `- Tuần hiện tại: ${context.currentWeek ?? "Chưa có 12-week plan"} / ${context.weeksTotal}`,
    `- Mục tiêu: ${goals || "Chưa có"}`,
    `- Việc hôm nay: ${tasks || "Chưa có"}`,
    `- Reflection gần nhất: ${context.lastReflectionDate ?? "Chưa có"}`,
  ].join("\n");
}

function buildRequestBody(userMessage: string, context: AssistantContext): GeminiRequest {
  return {
    system_instruction: {
      parts: [{ text: buildSystemPrompt() }],
    },
    contents: [
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
): Promise<AssistantProviderResponse | AssistantProviderError> {
  if (!env.GEMINI_API_KEY) {
    return {
      message: "Trợ lý AI hiện chưa được cấu hình. Vui lòng thử lại sau.",
      errorCode: "ASSISTANT_PROVIDER_NOT_CONFIGURED",
    };
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(getGeminiApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body: JSON.stringify(buildRequestBody(userMessage, context)),
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("[Gemini] API error status:", response.status);
      return {
        message: "Trợ lý AI đang gặp vấn đề. Thử lại sau nhé.",
        errorCode: "ASSISTANT_PROVIDER_ERROR",
      };
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

    console.error("[Gemini] Request failed:", error instanceof Error ? error.name : "UnknownError");
    return {
      message: "Trợ lý AI đang gặp vấn đề. Thử lại sau nhé.",
      errorCode: "ASSISTANT_PROVIDER_ERROR",
    };
  }
}

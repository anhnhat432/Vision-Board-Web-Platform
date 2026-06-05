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

const GROQ_TIMEOUT_MS = 30_000;
const MAX_COMPLETION_TOKENS = 800;

// Rough token estimator: Vietnamese text averages ~3.5 chars/token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

interface GroqErrorBody {
  error?: { message?: string; type?: string; code?: string };
}

async function extractGroqErrorDetails(response: Response): Promise<{ status: number; body: string; parsed?: GroqErrorBody }> {
  const status = response.status;
  let body = "";
  let parsed: GroqErrorBody | undefined;
  try {
    body = await response.text();
    parsed = JSON.parse(body) as GroqErrorBody;
  } catch {}
  return { status, body: body.slice(0, 500), parsed };
}

function getGroqErrorMessage(status: number, parsed?: GroqErrorBody): { message: string; errorCode: string } {
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
  if (status === 413) {
    return {
      message: "Nội dung gửi tới trợ lý quá dài. Vui lòng rút gọn tin nhắn.",
      errorCode: "ASSISTANT_PROVIDER_PAYLOAD_TOO_LARGE",
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

function buildRequestBody(
  userMessage: string,
  context: AssistantContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  modelName: string,
): GroqRequest {
  const systemPrompt = buildSystemPrompt();
  let contextSummary = summarizeContext(context);

  // Estimate total tokens and trim context if needed
  const systemTokens = estimateTokens(systemPrompt);
  const userTokens = estimateTokens(userMessage);
  const historyTokens = history.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
  let contextTokens = estimateTokens(contextSummary);
  const totalInputTokens = systemTokens + contextTokens + historyTokens + userTokens;
  const totalWithCompletion = totalInputTokens + MAX_COMPLETION_TOKENS;

  // If total exceeds a safe budget (5000 tokens for input), trim context
  const MAX_INPUT_BUDGET = 5000;
  if (totalInputTokens > MAX_INPUT_BUDGET) {
    // Trim context to fit within budget
    const availableForContext = Math.max(200, MAX_INPUT_BUDGET - systemTokens - userTokens - historyTokens);
    const maxContextChars = availableForContext * 3.5;
    if (contextSummary.length > maxContextChars) {
      contextSummary = contextSummary.slice(0, Math.floor(maxContextChars)) + "\n[...context trimmed...]";
      console.warn(`[Groq] Context trimmed from ${contextTokens} to ~${availableForContext} estimated tokens (total was ~${totalWithCompletion})`);
    }
  }

  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "system", content: contextSummary },
  ];

  // Add conversation history (limit to last 4 messages to save tokens)
  const trimmedHistory = history.slice(-4);
  for (const msg of trimmedHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current user message
  messages.push({ role: "user", content: userMessage });

  return {
    model: modelName,
    messages,
    temperature: 0.5,
    max_tokens: MAX_COMPLETION_TOKENS,
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
      const details = await extractGroqErrorDetails(response);
      console.error("[Groq Stream] API error:", { status: details.status, body: details.body });
      throw getGroqErrorMessage(details.status, details.parsed);
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
      const details = await extractGroqErrorDetails(response);
      console.error("[Groq] API error:", { status: details.status, body: details.body });
      return getGroqErrorMessage(details.status, details.parsed);
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

    console.error("[Groq] Request failed:", error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError");
    return {
      message: "Trợ lý AI đang gặp vấn đề. Thử lại sau nhé.",
      errorCode: "ASSISTANT_PROVIDER_ERROR",
    };
  }
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
  fileName: string = "audio.webm"
): Promise<string> {
  const isGemini = env.AI_PROVIDER === "gemini";

  if (isGemini) {
    const activeApiKey = env.AI_API_KEY || env.GEMINI_API_KEY;
    if (!activeApiKey) {
      throw new Error("Trợ lý Gemini hiện chưa được cấu hình. Vui lòng thử lại sau.");
    }

    const base64Data = audioBuffer.toString("base64");
    // Sử dụng gemini-2.5-flash làm model chính cho voice transcription vì nó hỗ trợ audio tốt
    const model = env.GEMINI_MODEL || "gemini-2.5-flash";
    const resolvedModel = model.includes("lite") ? "gemini-2.5-flash-lite" : "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${activeApiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                  }
                },
                {
                  text: "Hãy nghe đoạn âm thanh tiếng Việt này và chuyển đổi thành văn bản chính xác nhất. Chỉ trả về kết quả văn bản thô được nhận diện, không thêm bất kỳ giải thích hay bình luận nào khác. Nếu không có tiếng nói hoặc chỉ có im lặng, chỉ trả về chuỗi rỗng."
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        console.error("[Gemini Transcribe] API error:", response.status, errorData);
        throw new Error(errorData.error?.message || `API transcription failed: ${response.status}`);
      }

      const data = await response.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      return text;
    } catch (error: any) {
      console.error("[Gemini Transcribe] Error:", error);
      throw error;
    }
  }

  // Mặc định: Gọi Groq Whisper
  const activeApiKey = env.AI_PROVIDER === "groq" ? (env.AI_API_KEY || env.GROQ_API_KEY) : env.GROQ_API_KEY;

  if (!activeApiKey) {
    throw new Error("Trợ lý Groq hiện chưa được cấu hình. Vui lòng thử lại sau.");
  }

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  formData.append("file", blob, fileName);
  formData.append("model", "whisper-large-v3");
  formData.append("language", "vi");
  formData.append("response_format", "json");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${activeApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Groq Transcribe] API error:", response.status, errorText);
      throw new Error(`API transcription failed: ${response.status}`);
    }

    const data = await response.json() as { text: string };
    return data.text || "";
  } catch (error: any) {
    console.error("[Groq Transcribe] Error:", error);
    throw error;
  }
}
import { env } from "../config/env";
import { VALID_ACTION_TYPES } from "../shared/assistantActionSchema";
import { redactSensitive } from "../shared/assistantRedaction";
import type { AssistantContext } from "./assistantService";
import { buildSystemPrompt, summarizeContext } from "./assistantPromptUtils";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqResponseFormat {
  type: "json_object";
}

interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  temperature: number;
  max_tokens: number;
  stream?: boolean;
  response_format?: GroqResponseFormat;
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

export interface GroqRequestOptions {
  maxTokens?: number;
  temperature?: number;
  repairMode?: boolean;
  /**
   * G3: yêu cầu Groq trả về JSON object (response_format: json_object) cho nhánh action/workflow.
   * Caller chỉ nên bật khi env.AI_ENABLE_STRUCTURED_OUTPUT = true; provider vẫn tự kiểm tra cờ env để an toàn.
   */
  structuredOutput?: boolean;
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

// G7: timeout configurable qua env (default 30s giữ hành vi cũ).
function getGroqTimeoutMs(): number {
  const value = env.AI_GROQ_TIMEOUT_MS;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 30_000;
}
const DEFAULT_COMPLETION_TOKENS = 800;
const COMPLEX_COMPLETION_TOKENS = 1_400;

// G7: retry nhẹ cho 429 (rate limit) với backoff tuyến tính trước khi bỏ cuộc.
function getMaxRetriesOn429(): number {
  const value = env.AI_GROQ_MAX_RETRIES_ON_429;
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 1;
}
function getRetryBaseDelayMs(): number {
  const value = env.AI_GROQ_RETRY_BASE_DELAY_MS;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 500;
}
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

// G3: chỉ bật JSON mode khi cả cờ env lẫn option của caller đều yêu cầu.
export function isStructuredOutputEnabled(options: GroqRequestOptions = {}): boolean {
  return env.AI_ENABLE_STRUCTURED_OUTPUT === true && options.structuredOutput === true;
}

// G3: hợp đồng JSON output cho nhánh action/workflow khi bật structured output.
// Model phải trả về DUY NHẤT 1 JSON object với assistantText (string) + actions (mảng).
// Giữ nguyên 11 action type + shape payload đã có ở schema chung G2.
function buildStructuredOutputInstruction(): string {
  return [
    "STRUCTURED_OUTPUT_MODE",
    "Bạn PHẢI trả lời bằng DUY NHẤT một JSON object hợp lệ (JSON.parse được), không kèm markdown, không kèm văn bản ngoài JSON.",
    "Shape bắt buộc:",
    '{ "assistantText": string, "actions": Array<{ "type": string, "payload": object, "label": string }> }',
    "- assistantText: lời tư vấn ngắn gọn bằng tiếng Việt cho người dùng.",
    "- actions: mảng các action đề xuất; nếu không có action phù hợp thì để mảng rỗng [].",
    "- Không bịa taskId/goalId không có trong context. Khi thiếu dữ liệu, để actions rỗng và hỏi 1 câu làm rõ trong assistantText.",
    `- Chỉ dùng các action type hợp lệ: ${VALID_ACTION_TYPES.join(", ")}.`,
    "- payload phải đúng schema từng action type; không thêm field thừa, không trailing comma, không comment.",
  ].join("\n");
}

// Rough token estimator: Vietnamese text averages ~3.5 chars/token
// G4: export để telemetry tái dùng cùng công thức (token estimate metric).
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

interface GroqErrorBody {
  error?: { message?: string; type?: string; code?: string };
}

function redactProviderText(value: string, maxLength: number): string {
  return redactSensitive(value).slice(0, maxLength);
}

function getRedactedProviderMessage(message: string | undefined): string | undefined {
  const redacted = message ? redactProviderText(message, 200).trim() : "";
  return redacted || undefined;
}

function stringifyRedactedProviderPayload(value: unknown, maxLength = 500): string {
  try {
    return redactProviderText(JSON.stringify(value), maxLength);
  } catch {
    return "[unserializable_provider_payload]";
  }
}

function getSafeErrorLogMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${redactProviderText(error.message, 300)}`;
  }
  return redactProviderText(String(error), 300);
}

function toSafeError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    const redactedMessage = redactProviderText(error.message, 300);
    return redactedMessage === error.message ? error : new Error(redactedMessage);
  }
  return new Error(fallbackMessage);
}

async function extractGroqErrorDetails(response: Response): Promise<{ status: number; body: string; parsed?: GroqErrorBody }> {
  const status = response.status;
  let body = "";
  let parsed: GroqErrorBody | undefined;
  try {
    body = await response.text();
    parsed = JSON.parse(body) as GroqErrorBody;
  } catch {}
  return { status, body: redactProviderText(body, 500), parsed };
}

function getGroqErrorMessage(status: number, parsed?: GroqErrorBody): { message: string; errorCode: string } {
  const providerMsg = getRedactedProviderMessage(parsed?.error?.message);
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

export function getGroqGenerationOptions(
  userMessage: string,
  context: AssistantContext,
  options: GroqRequestOptions = {},
): Required<Pick<GroqRequestOptions, "maxTokens" | "temperature">> {
  if (options.repairMode) {
    return {
      maxTokens: options.maxTokens ?? DEFAULT_COMPLETION_TOKENS,
      temperature: options.temperature ?? 0.1,
    };
  }

  const normalizedText = userMessage
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const route = `${context.route} ${context.pageContext?.route ?? ""} ${context.pageContextHint?.pageType ?? ""}`.toLowerCase();
  const isComplex =
    normalizedText.length > 220 ||
    /12[- ]?week|12 tuan|ke hoach|smart goal|muc tieu smart|feasibility|kha thi|phan tich|chien luoc|reflection|review|tong ket|life insight/.test(normalizedText) ||
    /life-insight|feasibility|smart-goal|12-week|reflection/.test(route);

  return {
    maxTokens: options.maxTokens ?? (isComplex ? COMPLEX_COMPLETION_TOKENS : DEFAULT_COMPLETION_TOKENS),
    temperature: options.temperature ?? (isComplex ? 0.35 : 0.5),
  };
}

function buildRequestBody(
  userMessage: string,
  context: AssistantContext,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  modelName: string,
  options: GroqRequestOptions = {},
): GroqRequest {
  const generationOptions = getGroqGenerationOptions(userMessage, context, options);
  const systemPrompt = buildSystemPrompt(context);
  let contextSummary = summarizeContext(context);

  // Estimate total tokens and trim context if needed
  const systemTokens = estimateTokens(systemPrompt);
  const userTokens = estimateTokens(userMessage);
  const historyTokens = history.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
  let contextTokens = estimateTokens(contextSummary);
  const totalInputTokens = systemTokens + contextTokens + historyTokens + userTokens;
  const totalWithCompletion = totalInputTokens + generationOptions.maxTokens;

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

  // G3: khi bật structured output, thêm system instruction mô tả JSON contract.
  const structuredOutput = isStructuredOutputEnabled(options);
  if (structuredOutput) {
    messages.push({ role: "system", content: buildStructuredOutputInstruction() });
  }

  // Add conversation history (limit to last 4 messages to save tokens)
  const trimmedHistory = history.slice(-4);
  for (const msg of trimmedHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current user message
  messages.push({ role: "user", content: userMessage });

  const requestBody: GroqRequest = {
    model: modelName,
    messages,
    temperature: generationOptions.temperature,
    max_tokens: generationOptions.maxTokens,
  };

  if (structuredOutput) {
    requestBody.response_format = { type: "json_object" };
  }

  return requestBody;
}

function buildStructuredPromptRequestBody(
  request: StructuredProviderPromptRequest,
  modelName: string,
): GroqRequest {
  const body: GroqRequest = {
    model: modelName,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "system", content: request.contextMessage },
      { role: "user", content: request.userMessage },
    ],
    temperature: request.temperature,
    max_tokens: request.maxTokens,
  };
  if (request.jsonObject) {
    body.response_format = { type: "json_object" };
  }
  return body;
}

function getActiveGroqConfig(): { apiKey: string | undefined; model: string } {
  return {
    apiKey: env.AI_PROVIDER === "groq" ? (env.AI_API_KEY || env.GROQ_API_KEY) : env.GROQ_API_KEY,
    model: env.AI_PROVIDER === "groq" ? (env.AI_MODEL || env.GROQ_MODEL) : env.GROQ_MODEL,
  };
}

async function sendGroqRequest(
  requestBody: GroqRequest,
  externalSignal?: AbortSignal,
): Promise<AssistantProviderResponse | AssistantProviderError> {
  const { apiKey } = getActiveGroqConfig();
  if (!apiKey) {
    return {
      message: "Trợ lý AI hiện chưa được cấu hình. Vui lòng thử lại sau.",
      errorCode: "ASSISTANT_PROVIDER_NOT_CONFIGURED",
    };
  }

  const maxRetries = getMaxRetriesOn429();
  let lastRateLimitError: AssistantProviderError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), getGroqTimeoutMs());
    const handleExternalAbort = () => abortController.abort();
    externalSignal?.addEventListener("abort", handleExternalAbort, { once: true });

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", handleExternalAbort);

      if (!response.ok) {
        const details = await extractGroqErrorDetails(response);
        const errorResult = getGroqErrorMessage(details.status, details.parsed);
        if (details.status === 429 && attempt < maxRetries) {
          lastRateLimitError = errorResult;
          console.warn(`[Groq] Rate limited (429), retry ${attempt + 1}/${maxRetries} after backoff`);
          await delay(getRetryBaseDelayMs() * (attempt + 1), externalSignal);
          continue;
        }
        console.error("[Groq] API error:", { status: details.status, body: details.body });
        return errorResult;
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
      externalSignal?.removeEventListener("abort", handleExternalAbort);
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

  return (
    lastRateLimitError ?? {
      message: "Trợ lý AI đang quá tải (rate limit). Vui lòng đợi vài giây rồi thử lại.",
      errorCode: "ASSISTANT_PROVIDER_RATE_LIMIT",
    }
  );
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
  options: GroqRequestOptions = {},
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
  const timeoutId = setTimeout(() => abortController.abort(), getGroqTimeoutMs());

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
        ...buildRequestBody(userMessage, context, history, activeModel, options),
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
  options: GroqRequestOptions = {},
): Promise<AssistantProviderResponse | AssistantProviderError> {
  const { model } = getActiveGroqConfig();
  return sendGroqRequest(buildRequestBody(userMessage, context, history, model, options));
}

export async function sendPromptToGroq(
  request: StructuredProviderPromptRequest,
): Promise<AssistantProviderResponse | AssistantProviderError> {
  const { model } = getActiveGroqConfig();
  const selectedModel = request.model?.trim() || model;
  return sendGroqRequest(buildStructuredPromptRequestBody(request, selectedModel), request.signal);
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
        const providerMessage = getRedactedProviderMessage(errorData.error?.message);
        console.error("[Gemini Transcribe] API error:", response.status, stringifyRedactedProviderPayload(errorData));
        throw new Error(providerMessage || `API transcription failed: ${response.status}`);
      }

      const data = await response.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      return text;
    } catch (error: any) {
      const safeError = toSafeError(error, "Gemini transcription failed.");
      console.error("[Gemini Transcribe] Error:", getSafeErrorLogMessage(safeError));
      throw safeError;
    }
  }

  // Mặc định: Gọi Groq Whisper
  const activeApiKey = env.AI_PROVIDER === "groq" ? (env.AI_API_KEY || env.GROQ_API_KEY) : env.GROQ_API_KEY;

  if (!activeApiKey) {
    throw new Error("Trợ lý Groq hiện chưa được cấu hình. Vui lòng thử lại sau.");
  }

  const formData = new FormData();
  const file = new File([new Uint8Array(audioBuffer)], fileName, { type: mimeType });
  formData.append("file", file);
  formData.append("model", env.GROQ_AUDIO_MODEL || "whisper-large-v3-turbo");
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
      console.error("[Groq Transcribe] API error:", response.status, redactProviderText(errorText, 500));
      throw new Error(`API transcription failed: ${response.status}`);
    }

    const data = await response.json() as { text: string };
    return data.text || "";
  } catch (error: any) {
    const safeError = toSafeError(error, "Groq transcription failed.");
    console.error("[Groq Transcribe] Error:", getSafeErrorLogMessage(safeError));
    throw safeError;
  }
}

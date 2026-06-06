import { env } from "../config/env";
import {
  type AssistantActionType,
  sanitizeActionPayload,
  VALID_ACTION_TYPES,
} from "../shared/assistantActionSchema";
import { sendToGemini } from "./geminiAssistantProvider";
import { estimateTokens, sendToGroq, sendToGroqStream } from "./groqAssistantProvider";
import {
  type AssistantTurnOutcome,
  hashSession,
  recordAssistantTurnTelemetry,
} from "./assistantTelemetry";
import { decideRollout } from "./assistantRollout";
import type { AssistantContext } from "./assistantService";

export interface AssistantAction {
  id: string;
  type: AssistantActionType;
  payload: Record<string, unknown>;
  label: string;
}

export interface AIAssistantRequest {
  message: string;
  context: AssistantContext;
  mode: "demo" | "real";
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  // G4: session id (sẽ được hash 1 chiều ở telemetry, không bao giờ lưu raw).
  sessionId?: string;
}

export interface AIAssistantResponse {
  assistantText: string;
  proposedActions: AssistantAction[];
}

export interface AIAssistantError {
  message: string;
  errorCode: string;
}

interface AIAssistantParseDiagnostics extends AIAssistantResponse {
  actionBlockCount: number;
  invalidActionBlockCount: number;
  // G3: cờ cho biết đã dùng nhánh structured JSON hay fallback regex.
  structuredAttempted: boolean;
  structuredSucceeded: boolean;
  fencedSucceeded: boolean;
}

interface ParseOptions {
  // G3: cho phép parser ưu tiên thử JSON object hợp lệ trước khi rơi về regex action block.
  structured?: boolean;
}

/**
 * G3 metrics: theo dõi hiệu quả structured output vs parser regex cũ.
 * Đây là counters in-memory, redacted (không lưu nội dung), phục vụ đo invalid rate trước/sau.
 */
export interface AssistantParseMetrics {
  structuredParseAttempts: number;
  structuredParseSuccess: number;
  structuredParseFallback: number;
  fencedParseSuccess: number;
  totalActionBlocks: number;
  invalidActionBlocks: number;
  repairTriggered: number;
  repairSucceeded: number;
}

const assistantParseMetrics: AssistantParseMetrics = {
  structuredParseAttempts: 0,
  structuredParseSuccess: 0,
  structuredParseFallback: 0,
  fencedParseSuccess: 0,
  totalActionBlocks: 0,
  invalidActionBlocks: 0,
  repairTriggered: 0,
  repairSucceeded: 0,
};

export function getAssistantParseMetrics(): AssistantParseMetrics {
  return { ...assistantParseMetrics };
}

export function resetAssistantParseMetrics(): void {
  assistantParseMetrics.structuredParseAttempts = 0;
  assistantParseMetrics.structuredParseSuccess = 0;
  assistantParseMetrics.structuredParseFallback = 0;
  assistantParseMetrics.fencedParseSuccess = 0;
  assistantParseMetrics.totalActionBlocks = 0;
  assistantParseMetrics.invalidActionBlocks = 0;
  assistantParseMetrics.repairTriggered = 0;
  assistantParseMetrics.repairSucceeded = 0;
}

/** Tỉ lệ invalid action block trên tổng số block đã quét (0..1). */
export function getInvalidActionBlockRate(metrics: AssistantParseMetrics = assistantParseMetrics): number {
  if (metrics.totalActionBlocks === 0) return 0;
  return metrics.invalidActionBlocks / metrics.totalActionBlocks;
}

const PROVIDER_FALLBACK_ERROR_CODES = new Set([
  "ASSISTANT_PROVIDER_AUTH_ERROR",
  "ASSISTANT_PROVIDER_RATE_LIMIT",
  "ASSISTANT_PROVIDER_TIMEOUT",
  "ASSISTANT_PROVIDER_SERVER_ERROR",
]);
const SMART_MODEL_RETRY_ERROR_CODES = new Set([
  "ASSISTANT_PROVIDER_RATE_LIMIT",
  "ASSISTANT_PROVIDER_TIMEOUT",
  "ASSISTANT_PROVIDER_SERVER_ERROR",
  "ASSISTANT_PROVIDER_ERROR",
]);
const SMART_ASSISTANT_ROUTES = new Set([
  "/life-insight",
  "/feasibility",
  "/smart-goal-setup",
  "/12-week-setup",
  "/12-week-plan-setup",
  "/12-week-plan-overview",
  "/12-week-system",
  "/reflection",
]);

export interface GeminiModelSelection {
  tier: "fast" | "smart";
  primaryModel: string;
  fallbackModel?: string;
  reason: string;
}

function normalizeModelRoutingText(userText: string): string {
  return userText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getGeminiFastModel(): string {
  return env.GEMINI_MODEL || env.AI_MODEL || "gemini-2.5-flash-lite";
}

function getGeminiSmartModel(): string {
  return env.AI_SMART_MODEL || env.GEMINI_SMART_MODEL || "gemini-3.1-flash-lite";
}

function isSimpleFastRequest(normalizedText: string): boolean {
  if (!normalizedText) return true;
  if (/^(hi|hello|hey|hola|alo|chao|xin chao)(\s|$)/.test(normalizedText) && normalizedText.length <= 64) {
    return true;
  }
  if (/\b(tick|mark|done|complete|completed|danh dau)\b/.test(normalizedText) && /\b(task|viec|nhiem vu)\b/.test(normalizedText)) {
    return true;
  }
  if (normalizedText.length <= 140 && normalizedText.includes("hom nay")) {
    return /\b(task|viec|nen lam gi|lam gi|uu tien nao)\b/.test(normalizedText);
  }
  return false;
}

function isSmartRequestByText(normalizedText: string): boolean {
  if (normalizedText.length > 220) return true;
  return [
    "12-week",
    "12 week",
    "12 tuan",
    "ke hoach",
    "lap ke hoach",
    "smart goal",
    "muc tieu smart",
    "feasibility",
    "kha thi",
    "phan tich",
    "chien luoc",
    "roadmap",
    "workflow",
    "quy trinh",
    "nhieu buoc",
    "multi step",
    "uu tien",
    "sap xep",
    "toi uu",
    "reflection",
    "review",
    "tong ket",
    "danh gia",
    "life insight",
  ].some((keyword) => normalizedText.includes(keyword));
}

function isSmartRequestByContext(context: AssistantContext): boolean {
  const route = typeof context.route === "string" ? context.route : "";
  if (SMART_ASSISTANT_ROUTES.has(route)) return true;

  const pageRoute = typeof context.pageContext?.route === "string" ? context.pageContext.route : "";
  if (SMART_ASSISTANT_ROUTES.has(pageRoute)) return true;

  const pageType = typeof context.pageContextHint?.pageType === "string" ? context.pageContextHint.pageType : "";
  return /setup|feasibility|smart|reflection|insight|12/.test(normalizeModelRoutingText(pageType));
}

export function selectGeminiModelForAssistantRequest(
  request: Pick<AIAssistantRequest, "message" | "context">,
): GeminiModelSelection {
  const fastModel = getGeminiFastModel();
  const smartModel = getGeminiSmartModel();
  const normalizedText = normalizeModelRoutingText(request.message);

  if (!smartModel || smartModel === fastModel || isSimpleFastRequest(normalizedText)) {
    return {
      tier: "fast",
      primaryModel: fastModel,
      reason: "fast_request",
    };
  }

  if (isSmartRequestByText(normalizedText) || isSmartRequestByContext(request.context)) {
    return {
      tier: "smart",
      primaryModel: smartModel,
      fallbackModel: fastModel,
      reason: "complex_request",
    };
  }

  return {
    tier: "fast",
    primaryModel: fastModel,
    reason: "default_fast",
  };
}

function normalizeShortUserText(userText: string): string {
  return userText
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/[!?.。！？,，;:]+$/g, "")
    .replace(/\s+/g, " ");
}

function isAssistantIdentityRequest(normalizedText: string): boolean {
  return (
    /^(ban la ai|ban ten gi|tro ly nay la gi|cu la ai|ai la ai)$/.test(normalizedText) ||
    /^(hay\s+)?(tu\s+)?gioi thieu( ve ban| ban than| di)?$/.test(normalizedText) ||
    /^(ban|tro ly|ai|cu) co the lam gi$/.test(normalizedText)
  );
}

export function shouldUseLocalAssistantShortcut(userText: string): boolean {
  const normalized = normalizeShortUserText(userText);
  if (!normalized || normalized.length > 48) return false;
  const normalizedRoutingText = normalizeModelRoutingText(userText);

  if (isAssistantIdentityRequest(normalizedRoutingText)) return true;

  const greetings = new Set([
    "hi",
    "hello",
    "hey",
    "hola",
    "alo",
    "chao",
    "xin chao",
    "chào",
    "xin chào",
    "cu oi",
    "cú ơi",
    "ai oi",
    "ai ơi",
    "bot oi",
    "bot ơi",
    "tro ly oi",
    "trợ lý ơi",
  ]);

  if (greetings.has(normalized)) return true;

  return /^(hi|hello|hey|hola|alo|chao|xin chao|chào|xin chào)(\s+(ban|bạn|cu|cú|bot|ai|oi|ơi))?$/.test(
    normalized,
  );
}

function shouldUseProviderFallback(errorCode: string): boolean {
  return PROVIDER_FALLBACK_ERROR_CODES.has(errorCode);
}

export function formatAIAssistantResponseForStream(response: AIAssistantResponse): string {
  let content = response.assistantText;
  for (const action of response.proposedActions) {
    content += `\n\n\`\`\`action\n${JSON.stringify(action, null, 2)}\n\`\`\``;
  }
  return content;
}

function normalizeStreamingProviderError(error: unknown): AIAssistantError {
  if (error && typeof error === "object" && "errorCode" in error && "message" in error) {
    const providerError = error as { message?: unknown; errorCode?: unknown };
    if (typeof providerError.message === "string" && typeof providerError.errorCode === "string") {
      return {
        message: providerError.message,
        errorCode: providerError.errorCode,
      };
    }
  }

  if (error instanceof Error && error.name === "AbortError") {
    return {
      message: "Phản hồi từ trợ lý quá lâu. Thử lại nhé.",
      errorCode: "ASSISTANT_PROVIDER_TIMEOUT",
    };
  }

  return {
    message: "Trợ lý AI đang gặp vấn đề. Thử lại sau nhé.",
    errorCode: "ASSISTANT_PROVIDER_ERROR",
  };
}

function buildProviderFallbackResponse(
  userText: string,
  ctx: AssistantContext,
  errorCode: string,
): AIAssistantResponse {
  const fallback = getDeterministicFallback(userText, ctx);
  if (errorCode === "ASSISTANT_PROVIDER_AUTH_ERROR") {
    return {
      ...fallback,
      assistantText: `AI nâng cao tạm thời chưa xác thực được, nên mình dùng chế độ nhanh để hỗ trợ trước.\n\n${fallback.assistantText}`.trim(),
    };
  }
  const notice =
    errorCode === "ASSISTANT_PROVIDER_RATE_LIMIT"
      ? "AI nâng cao đang quá tải tạm thời, nên mình dùng chế độ nhanh để hỗ trợ trước."
      : "AI nâng cao đang gặp sự cố tạm thời, nên mình dùng chế độ nhanh để hỗ trợ trước.";

  return {
    ...fallback,
    assistantText: `${notice}\n\n${fallback.assistantText}`.trim(),
  };
}

function buildActionRepairPrompt(originalMessage: string, invalidProviderText: string): string {
  return `REPAIR_ACTION_OUTPUT\nHãy sửa lại câu trả lời trước thành output hợp lệ cho Vision Board Assistant.

Yêu cầu:
- Giữ nguyên ý nghĩa trợ giúp chính bằng tiếng Việt, ngắn gọn.
- Nếu có action, mỗi action phải nằm trong block \`\`\`action riêng.
- JSON action phải parse được bằng JSON.parse: dấu ngoặc kép, không comment, không trailing comma, không markdown trong JSON.
- Không tạo action mới nếu dữ liệu trong câu trả lời trước không đủ schema; khi thiếu dữ liệu, chỉ hỏi 1 câu làm rõ.
- Chỉ dùng các action type hợp lệ: ${VALID_ACTION_TYPES.join(", ")}.

Tin nhắn user ban đầu:
${originalMessage.slice(0, 1000)}

Câu trả lời cần sửa:
${invalidProviderText.slice(0, 2500)}`;
}

async function sendToGeminiWithModelRouting(
  request: AIAssistantRequest,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<{ message: string } | AIAssistantError> {
  const selection = selectGeminiModelForAssistantRequest(request);
  const primaryResult = await sendToGemini(
    request.message.trim(),
    request.context,
    history,
    { model: selection.primaryModel },
  );

  if (
    "errorCode" in primaryResult &&
    selection.tier === "smart" &&
    selection.fallbackModel &&
    selection.fallbackModel !== selection.primaryModel &&
    SMART_MODEL_RETRY_ERROR_CODES.has(primaryResult.errorCode)
  ) {
    console.warn("[ai-assistant] Smart Gemini model unavailable, retrying fast model:", {
      errorCode: primaryResult.errorCode,
      primaryModel: selection.primaryModel,
      fallbackModel: selection.fallbackModel,
    });
    return sendToGemini(
      request.message.trim(),
      request.context,
      history,
      { model: selection.fallbackModel },
    );
  }

  return primaryResult;
}

// G3: validate + sanitize 1 action object (chia sẻ giữa nhánh structured JSON và regex block).
// Trả về AssistantAction hợp lệ hoặc null. Tái dùng sanitizeActionPayload của schema chung G2.
function buildSanitizedAction(json: unknown): AssistantAction | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const candidate = json as Record<string, unknown>;
  if (
    typeof candidate.type !== "string" ||
    !(VALID_ACTION_TYPES as readonly string[]).includes(candidate.type) ||
    typeof candidate.label !== "string" ||
    !candidate.payload ||
    typeof candidate.payload !== "object" ||
    Array.isArray(candidate.payload)
  ) {
    return null;
  }

  const sanitizedPayload = sanitizeActionPayload(
    candidate.type as AssistantActionType,
    candidate.payload as Record<string, unknown>,
  );
  if (!sanitizedPayload) return null;

  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: candidate.type as AssistantActionType,
    payload: sanitizedPayload,
    label: candidate.label.slice(0, 80),
  };
}

// G3: thử parse toàn bộ rawText như 1 JSON object structured ({ assistantText, actions }).
// Chỉ áp dụng khi caller bật structured. Trả về null nếu không phải JSON structured hợp lệ
// để parser rơi về nhánh regex action block cũ.
function tryParseStructuredResponse(rawText: string): {
  assistantText: string;
  proposedActions: AssistantAction[];
  actionBlockCount: number;
  invalidActionBlockCount: number;
} | null {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;

  // Phải có ít nhất một trong hai field hợp đồng để coi là structured response.
  const hasAssistantText = typeof obj.assistantText === "string";
  const hasActions = Array.isArray(obj.actions);
  if (!hasAssistantText && !hasActions) return null;

  const assistantText = hasAssistantText ? (obj.assistantText as string).trim() : "";
  const proposedActions: AssistantAction[] = [];
  let actionBlockCount = 0;
  let invalidActionBlockCount = 0;

  if (hasActions) {
    for (const item of obj.actions as unknown[]) {
      actionBlockCount += 1;
      const action = buildSanitizedAction(item);
      if (action) {
        proposedActions.push(action);
      } else {
        invalidActionBlockCount += 1;
      }
    }
  }

  return { assistantText, proposedActions, actionBlockCount, invalidActionBlockCount };
}

function parseAndValidateAIResponseWithDiagnostics(
  rawText: string,
  options: ParseOptions = {},
): AIAssistantParseDiagnostics {
  // 1. G3: ưu tiên JSON object structured khi caller bật structured output.
  if (options.structured) {
    assistantParseMetrics.structuredParseAttempts += 1;
    const structured = tryParseStructuredResponse(rawText);
    if (structured) {
      assistantParseMetrics.structuredParseSuccess += 1;
      assistantParseMetrics.totalActionBlocks += structured.actionBlockCount;
      assistantParseMetrics.invalidActionBlocks += structured.invalidActionBlockCount;
      return {
        assistantText: structured.assistantText,
        proposedActions: structured.proposedActions,
        actionBlockCount: structured.actionBlockCount,
        invalidActionBlockCount: structured.invalidActionBlockCount,
        structuredAttempted: true,
        structuredSucceeded: true,
        fencedSucceeded: false,
      };
    }
    // Không parse được JSON structured -> rơi về regex (đếm fallback).
    assistantParseMetrics.structuredParseFallback += 1;
  }

  const proposedActions: AssistantAction[] = [];
  const blocksToRemove: string[] = [];
  let actionBlockCount = 0;
  let invalidActionBlockCount = 0;

  const processJson = (jsonStr: string) => {
    actionBlockCount += 1;
    const action = buildSanitizedAction((() => {
      try {
        return JSON.parse(jsonStr.trim());
      } catch {
        return null;
      }
    })());
    if (action) {
      proposedActions.push(action);
      return true;
    }
    invalidActionBlockCount += 1;
    return false;
  };

  // 2. Quét code blocks ```action
  const actionBlockRegex = /```action\n([\s\S]*?)\n```/g;
  let match: RegExpExecArray | null;

  while (true) {
    match = actionBlockRegex.exec(rawText);
    if (match === null) break;
    const isAdded = processJson(match[1]);
    if (isAdded) {
      blocksToRemove.push(match[0]);
    }
  }

  let assistantText = rawText;
  for (const block of blocksToRemove) {
    assistantText = assistantText.replace(block, "");
  }

  // 3. Quét raw action blocks (không có ba nháy ngược)
  const rawActionRegex = /(?:^|\n)(?:action|json)\r?\n(\{[\s\S]*?\})(?=\n|$)/gi;
  let rawMatch: RegExpExecArray | null;
  const rawBlocksToRemove: string[] = [];

  rawActionRegex.lastIndex = 0;
  while (true) {
    rawMatch = rawActionRegex.exec(assistantText);
    if (rawMatch === null) break;
    const isAdded = processJson(rawMatch[1]);
    if (isAdded) {
      rawBlocksToRemove.push(rawMatch[0]);
    }
  }

  for (const block of rawBlocksToRemove) {
    assistantText = assistantText.replace(block, "");
  }

  assistantText = assistantText.trim();

  const fencedSucceeded = proposedActions.length > 0;
  if (options.structured) {
    // Khi structured bật nhưng đã fallback về regex, vẫn cộng dồn block đã quét để đo invalid rate.
    assistantParseMetrics.totalActionBlocks += actionBlockCount;
    assistantParseMetrics.invalidActionBlocks += invalidActionBlockCount;
    if (fencedSucceeded) {
      assistantParseMetrics.fencedParseSuccess += 1;
    }
  }

  return {
    assistantText,
    proposedActions,
    actionBlockCount,
    invalidActionBlockCount,
    structuredAttempted: options.structured === true,
    structuredSucceeded: false,
    fencedSucceeded,
  };
}

export function parseAndValidateAIResponse(rawText: string, options: ParseOptions = {}): AIAssistantResponse {
  const { assistantText, proposedActions } = parseAndValidateAIResponseWithDiagnostics(rawText, options);
  return { assistantText, proposedActions };
}

export function shouldRepairAIResponse(rawText: string, options: ParseOptions = {}): boolean {
  // shouldRepairAIResponse chỉ dùng để quyết định có gọi repair pass hay không;
  // không cộng dồn metrics ở đây để tránh đếm trùng. Dùng nhánh không structured.
  const diagnostics = parseAndValidateAIResponseWithDiagnostics(rawText, { structured: false });
  // Với structured response hợp lệ (JSON object), shouldRepair luôn false (xử lý ở nhánh structured).
  if (options.structured && tryParseStructuredResponse(rawText)) return false;
  return diagnostics.actionBlockCount > 0 && diagnostics.proposedActions.length === 0 && diagnostics.invalidActionBlockCount > 0;
}

function resolveTelemetryRoute(context: AssistantContext): string | undefined {
  if (typeof context.route === "string" && context.route) return context.route;
  if (typeof context.pageContext?.route === "string" && context.pageContext.route) return context.pageContext.route;
  return undefined;
}

function resolveActiveModel(provider: "groq" | "gemini", request: AIAssistantRequest): string {
  if (provider === "groq") {
    return env.AI_MODEL || env.GROQ_MODEL || "";
  }
  return selectGeminiModelForAssistantRequest(request).primaryModel;
}

function estimateTurnTokens(
  request: AIAssistantRequest,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  responseText: string,
): number {
  const historyTokens = history.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
  return estimateTokens(request.message) + historyTokens + estimateTokens(responseText);
}

function shouldUseBufferedGroqResponse(request: AIAssistantRequest): boolean {
  // GĐ5 (Runbook kill-switch): tắt streaming -> ép buffered toàn bộ.
  if (env.AI_ENABLE_STREAMING !== true) return true;

  if (request.context.pendingClarification || request.context.pendingWorkflow) return true;

  const normalizedText = normalizeModelRoutingText(request.message);
  return /\b(tao|them|mark|tick|danh dau|hoan thanh|xong|cap nhat|doi lich|doi ngay|reschedule|lap ke hoach|ke hoach 12|review|tong ket|smart goal|muc tieu|goal|task)\b/.test(
    normalizedText,
  );
}

export function getDeterministicFallback(
  userText: string,
  ctx: AssistantContext,
): AIAssistantResponse {
  const lower = userText.toLowerCase().trim();
  const normalizedRoutingText = normalizeModelRoutingText(userText);

  if (isAssistantIdentityRequest(normalizedRoutingText)) {
    return {
      assistantText:
        "Mình là Trợ lý Cú AI của Vision Board. Mình giúp bạn đi theo luồng chính của sản phẩm: nhìn lại định hướng sống, tạo SMART goal, kiểm tra tính khả thi, lập kế hoạch 12 tuần, chọn việc hôm nay và review tiến độ.\n\nMình có thể gợi ý bước tiếp theo, tóm tắt mục tiêu, đề xuất task, đánh dấu task đã xong khi bạn xác nhận, và nhắc bạn quay lại đúng việc quan trọng nhất.",
      proposedActions: [],
    };
  }

  // 1. Ý định đánh dấu hoàn thành công việc (tick task)
  const isTickIntent =
    (/tick|hoàn thành|xong|đóng|đánh dấu/).test(lower) &&
    (/task|việc|nhiệm vụ|công việc/).test(lower);

  if (isTickIntent) {
    if (ctx.currentWeek === null) {
      return {
        assistantText: "Bạn chưa có kế hoạch 12 tuần nào đang hoạt động, do đó không có công việc nào để hoàn thành. Hãy bắt đầu bằng cách tạo mục tiêu và thiết lập kế hoạch 12 tuần trước nhé.",
        proposedActions: [],
      };
    }

    const openTasks = (ctx.todayTasks || []).filter((t) => !t.done);
    if (openTasks.length === 0) {
      const overdueOpenTasks = (ctx.stuckSignals?.overdueTasks || []);
      if (overdueOpenTasks.length > 0) {
        const taskToDone = overdueOpenTasks[0];
        return {
          assistantText: `Tôi tìm thấy một công việc quá hạn chưa hoàn thành: **"${taskToDone.title}"**. Bạn có muốn đánh dấu hoàn thành công việc này không?\n\nNhấn vào nút **Đồng ý** ở bên dưới để thực hiện.`,
          proposedActions: [{
            id: `act_${Date.now()}_1`,
            type: "mark_task_done",
            payload: { taskId: taskToDone.id, done: true },
            label: `Hoàn thành: ${taskToDone.title}`,
          }],
        };
      }
      return {
        assistantText: "Hiện tại không có công việc nào chưa hoàn thành cho ngày hôm nay để đánh dấu hoàn thành.",
        proposedActions: [],
      };
    }

    const taskToDone = openTasks[0];
    return {
      assistantText: `Tôi thấy công việc chưa hoàn thành hôm nay: **"${taskToDone.title}"**. Bạn có muốn đánh dấu hoàn thành công việc này không?\n\nNhấn vào nút **Đồng ý** ở bên dưới để thực hiện.`,
      proposedActions: [{
        id: `act_${Date.now()}_2`,
        type: "mark_task_done",
        payload: { taskId: taskToDone.id, done: true },
        label: `Hoàn thành: ${taskToDone.title}`,
      }],
    };
  }

  // 2. Ý định tạo mục tiêu mới
  if ((lower.includes("tạo") || lower.includes("thêm")) && (lower.includes("mục tiêu") || lower.includes("goal"))) {
    let goalTitle = "Mục tiêu mới";
    const match = userText.match(/(?:mục tiêu|goal)\s+(.+)/i);
    if (match?.[1]) {
      goalTitle = match[1].trim().replace(/[?.!]/g, "");
    }

    const category = lower.includes("sức khỏe") || lower.includes("thể thao") || lower.includes("tập") ? "health"
                   : lower.includes("học") || lower.includes("thi") || lower.includes("sự nghiệp") || lower.includes("làm") ? "career"
                   : lower.includes("tiền") || lower.includes("tài chính") || lower.includes("mua") ? "finance"
                   : lower.includes("yêu") || lower.includes("bạn") || lower.includes("gia đình") ? "relationships"
                   : "personal";

    return {
      assistantText: `Mình hiểu bạn đang muốn tạo mục tiêu mới: **"${goalTitle}"**.\n\nĐể thực hiện điều này, bạn chỉ cần nhấn vào nút **Đồng ý** ở bên dưới. Mình sẽ tạo nhanh mục tiêu này vào hệ thống của bạn.`,
      proposedActions: [{
        id: `act_${Date.now()}_3`,
        type: "create_goal",
        payload: {
          title: goalTitle,
          category: category,
          description: "Được tạo nhanh từ hội thoại với Trợ lý AI",
        },
        label: `Tạo mục tiêu: ${goalTitle}`,
      }],
    };
  }

  // 3. Fallbacks cho các câu hỏi thông thường
  let text = "";
  if (/\b(hôm nay|today|task|việc)\b/.test(lower)) {
    const tasks = ctx.todayTasks || [];
    if (tasks.length === 0) {
      text = "Bạn chưa có task nào cho hôm nay. Nếu đã có mục tiêu, hãy vào hệ thống 12 tuần để chọn một việc nhỏ có thể làm ngay.";
    } else {
      const lines = tasks.slice(0, 5).map((t) => `- ${t.title}${t.done ? " (đã xong)" : ""}`);
      text = `Ưu tiên danh sách việc hôm nay (${tasks.length} task):\n${lines.join("\n")}`;
    }
  } else if (/\b(tuần|week|progress|tiến độ)\b/.test(lower)) {
    if (ctx.currentWeek === null) {
      text = "Bạn chưa bắt đầu kế hoạch 12 tuần nên chưa có thông tin tiến độ tuần hiện tại.";
    } else {
      text = `Bạn đang ở tuần ${ctx.currentWeek}/${ctx.weeksTotal}. Hãy tập trung hoàn thành các cam kết trong tuần này nhé.`;
    }
  } else if (/\b(mục tiêu|goal)\b/.test(lower)) {
    const goals = ctx.goals || [];
    if (goals.length === 0) {
      text = "Bạn chưa đặt mục tiêu nào. Hãy thiết lập một SMART goal cho chu kỳ 12 tuần tới.";
    } else {
      const lines = goals.map((g) => `- ${g.title} (${g.progress}%)`);
      text = `Mục tiêu hiện tại của bạn:\n${lines.join("\n")}`;
    }
  } else {
    text = "Chào bạn! Mình có thể hỗ trợ bạn xem việc hôm nay, tóm tắt tuần này, quản lý mục tiêu hoặc gợi ý reflection.";
  }

  return {
    assistantText: text,
    proposedActions: [],
  };
}

export async function processAIAssistantRequest(
  request: AIAssistantRequest,
): Promise<AIAssistantResponse | AIAssistantError> {
  const provider = env.AI_PROVIDER;
  const apiKey = env.AI_API_KEY;

  if (shouldUseLocalAssistantShortcut(request.message)) {
    return getDeterministicFallback(request.message, request.context);
  }

  // Nếu AI API key bị thiếu
  if (!apiKey) {
    if (request.mode === "demo") {
      // Chạy mock deterministic
      return getDeterministicFallback(request.message, request.context);
    }
    // Trả lỗi trong real mode
    return {
      message: "Dịch vụ AI chưa được cấu hình. Vui lòng cấu hình API Key để sử dụng trợ lý ở real-mode.",
      errorCode: "AI_PROVIDER_NOT_CONFIGURED",
    };
  }

  // Gửi request thực tế tới AI provider
  const history = request.history || [];

  // G4: telemetry tối thiểu redacted cho mỗi turn gọi provider (latency/error/action/token).
  const turnStartedAt = Date.now();
  const sessionHash = hashSession(request.sessionId);
  const activeModel = resolveActiveModel(provider, request);
  const rollout = decideRollout(request.mode, sessionHash);
  let repairTriggered = false;
  let repairSucceeded = false;
  let structuredSucceeded = false;

  const emitTurn = (
    outcome: AssistantTurnOutcome,
    info: { errorCode?: string; actions?: AssistantAction[]; responseText?: string; structured?: boolean },
  ): void => {
    const actions = info.actions ?? [];
    recordAssistantTurnTelemetry({
      provider,
      model: activeModel,
      route: resolveTelemetryRoute(request.context),
      mode: request.mode,
      latencyMs: Date.now() - turnStartedAt,
      outcome,
      errorCode: info.errorCode,
      actionType: actions[0]?.type,
      actionCount: actions.length,
      structuredAttempted: info.structured === true,
      structuredSucceeded,
      repairTriggered,
      repairSucceeded,
      tokenEstimate: estimateTurnTokens(request, history, info.responseText ?? ""),
      sessionHash,
      source: "non_stream",
      experiment: rollout.experiment,
      variant: rollout.variant,
      inCohort: rollout.inCohort,
    });
  };

  // G3: bật JSON mode (structured output) cho nhánh action/workflow của Groq khi cờ env bật.
  // Caller truyền structuredOutput=true; provider tự kiểm tra env.AI_ENABLE_STRUCTURED_OUTPUT.
  const useStructured =
    provider === "groq" &&
    env.AI_ENABLE_STRUCTURED_OUTPUT === true &&
    shouldUseBufferedGroqResponse(request);

  let result =
    provider === "gemini"
      ? await sendToGeminiWithModelRouting(request, history)
      : await sendToGroq(request.message.trim(), request.context, history, { structuredOutput: useStructured });

  if (!("errorCode" in result) && provider === "groq" && shouldRepairAIResponse(result.message, { structured: useStructured })) {
    console.warn("[ai-assistant] Groq returned invalid action block, retrying repair pass");
    assistantParseMetrics.repairTriggered += 1;
    repairTriggered = true;
    // Repair pass dùng fenced action block (không structured) để tái dùng prompt repair hiện có.
    const repairResult = await sendToGroq(
      buildActionRepairPrompt(request.message.trim(), result.message),
      request.context,
      history,
      { maxTokens: 900, temperature: 0.1, repairMode: true },
    );
    if (!("errorCode" in repairResult)) {
      const repaired = parseAndValidateAIResponseWithDiagnostics(repairResult.message);
      if (!shouldRepairAIResponse(repairResult.message) && repaired.proposedActions.length > 0) {
        assistantParseMetrics.repairSucceeded += 1;
        repairSucceeded = true;
        // Repair output là fenced block thường -> parse không structured ở dưới.
        const repairedResponse = parseAndValidateAIResponse(repairResult.message);
        emitTurn("success", {
          actions: repairedResponse.proposedActions,
          responseText: repairResult.message,
          structured: useStructured,
        });
        return repairedResponse;
      }
    }
  }

  if ("errorCode" in result) {
    // Trả lỗi từ provider
    const err = result as { message: string; errorCode: string };
    if (shouldUseProviderFallback(err.errorCode)) {
      console.warn("[ai-assistant] Provider unavailable, using deterministic fallback:", err.errorCode);
      const fallback = buildProviderFallbackResponse(request.message, request.context, err.errorCode);
      emitTurn("fallback", {
        errorCode: err.errorCode,
        actions: fallback.proposedActions,
        responseText: fallback.assistantText,
        structured: useStructured,
      });
      return fallback;
    }

    emitTurn("error", { errorCode: err.errorCode, structured: useStructured });
    return {
      message: err.message,
      errorCode: err.errorCode,
    };
  }

  // Phân tích và validate schema proposed actions từ kết quả LLM.
  // Khi structured bật, parser ưu tiên JSON object hợp lệ rồi fallback regex.
  const diagnostics = parseAndValidateAIResponseWithDiagnostics(result.message, { structured: useStructured });
  structuredSucceeded = diagnostics.structuredSucceeded;
  emitTurn("success", {
    actions: diagnostics.proposedActions,
    responseText: result.message,
    structured: useStructured,
  });
  return { assistantText: diagnostics.assistantText, proposedActions: diagnostics.proposedActions };
}

export async function processAIAssistantRequestStream(
  request: AIAssistantRequest,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void | AIAssistantError> {
  const provider = env.AI_PROVIDER;
  const apiKey = env.AI_API_KEY;

  if (shouldUseLocalAssistantShortcut(request.message)) {
    onDelta(formatAIAssistantResponseForStream(getDeterministicFallback(request.message, request.context)));
    return;
  }

  if (!apiKey) {
    if (request.mode === "demo") {
      onDelta(formatAIAssistantResponseForStream(getDeterministicFallback(request.message, request.context)));
      return;
    }

    return {
      message: "Dịch vụ AI chưa được cấu hình. Vui lòng cấu hình API Key để sử dụng trợ lý ở real-mode.",
      errorCode: "AI_PROVIDER_NOT_CONFIGURED",
    };
  }

  const history = request.history || [];

  if (provider !== "groq" || shouldUseBufferedGroqResponse(request)) {
    // Nhánh buffered đã được đo telemetry bên trong processAIAssistantRequest (source=non_stream).
    const result = await processAIAssistantRequest(request);
    if ("errorCode" in result) return result;
    onDelta(formatAIAssistantResponseForStream(result));
    return;
  }

  // G4: telemetry cho nhánh streaming thuần (chat tự do, Groq stream text).
  const turnStartedAt = Date.now();
  const sessionHash = hashSession(request.sessionId);
  const activeModel = resolveActiveModel(provider, request);
  const rollout = decideRollout(request.mode, sessionHash);
  let streamedText = "";

  const emitStreamTurn = (outcome: AssistantTurnOutcome, errorCode?: string): void => {
    recordAssistantTurnTelemetry({
      provider,
      model: activeModel,
      route: resolveTelemetryRoute(request.context),
      mode: request.mode,
      latencyMs: Date.now() - turnStartedAt,
      outcome,
      errorCode,
      actionType: undefined,
      actionCount: 0,
      structuredAttempted: false,
      structuredSucceeded: false,
      repairTriggered: false,
      repairSucceeded: false,
      tokenEstimate: estimateTurnTokens(request, history, streamedText),
      sessionHash,
      source: "stream",
      experiment: rollout.experiment,
      variant: rollout.variant,
      inCohort: rollout.inCohort,
    });
  };

  try {
    let hasDelta = false;
    await sendToGroqStream(
      request.message.trim(),
      request.context,
      history,
      (delta) => {
        hasDelta = true;
        streamedText += delta;
        onDelta(delta);
      },
      signal,
    );

    if (!hasDelta) {
      emitStreamTurn("error", "ASSISTANT_PROVIDER_ERROR");
      return {
        message: "Trợ lý chưa có gợi ý phù hợp cho câu hỏi này. Thử hỏi cụ thể hơn nhé.",
        errorCode: "ASSISTANT_PROVIDER_ERROR",
      };
    }

    emitStreamTurn("success");
  } catch (error) {
    const err = normalizeStreamingProviderError(error);
    if (shouldUseProviderFallback(err.errorCode)) {
      console.warn("[ai-assistant] Groq stream unavailable, using deterministic fallback:", err.errorCode);
      const fallback = buildProviderFallbackResponse(request.message, request.context, err.errorCode);
      streamedText = fallback.assistantText;
      emitStreamTurn("fallback", err.errorCode);
      onDelta(formatAIAssistantResponseForStream(fallback));
      return;
    }

    emitStreamTurn("error", err.errorCode);
    return err;
  }
}

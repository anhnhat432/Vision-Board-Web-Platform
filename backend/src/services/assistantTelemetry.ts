import { createHash } from "node:crypto";
import { env } from "../config/env";

/**
 * G4: Telemetry tối thiểu, redacted cho assistant (ưu tiên Groq real-mode).
 *
 * Nguyên tắc:
 * - KHÔNG lưu raw prompt, raw message, raw secret/token/API key/email.
 * - Chỉ lưu metadata an toàn: provider/model/route/mode/latency/errorCode/actionType,
 *   cờ structured/repair, token estimate, session hash (one-way).
 * - Store in-memory dạng ring buffer, phục vụ đọc nhanh latency/error theo route.
 */

export type AssistantTurnOutcome = "success" | "fallback" | "error";

export interface AssistantTurnTelemetry {
  provider: string;
  model: string;
  route: string;
  mode: "demo" | "real";
  latencyMs: number;
  outcome: AssistantTurnOutcome;
  errorCode?: string;
  actionType?: string;
  actionCount: number;
  structuredAttempted: boolean;
  structuredSucceeded: boolean;
  repairTriggered: boolean;
  repairSucceeded: boolean;
  tokenEstimate: number;
  sessionHash?: string;
  source: "non_stream" | "stream";
  // GĐ5 (Rollout/A-B): experiment + variant + cohort flag để phân tích A/B theo turn.
  experiment?: string;
  variant?: string;
  inCohort?: boolean;
  createdAt: string;
}

/** Sự kiện observability redacted nhận từ frontend (chỉ field an toàn). */
export interface ClientAssistantTelemetryEvent {
  type: string;
  route?: string;
  actionType?: string;
  workflowType?: string;
  nudgeType?: string;
  success?: boolean;
  latencyMs?: number;
  errorCode?: string;
  sessionHash?: string;
  createdAt: string;
}

const MAX_TURN_EVENTS = 1000;
const MAX_CLIENT_EVENTS = 1000;

const turnTelemetryStore: AssistantTurnTelemetry[] = [];
const clientTelemetryStore: ClientAssistantTelemetryEvent[] = [];

// --- Redaction helpers (regex key/bearer/email + long random token) ---

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const BEARER_RE = /bearer\s+[A-Za-z0-9._\-]+/gi;
const KEY_VALUE_RE =
  /(api[_-]?key|secret|password|token|private[_-]?key|credentials)\s*[:=]\s*[^\s,]+/gi;
const KEY_NAME_RE =
  /\b[\w-]*(?:api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|password|private[_\s-]?key)[\w-]*\b/gi;
const LONG_TOKEN_RE = /\b[A-Za-z0-9_\-]{24,}\b/g;

/**
 * GĐ5 (Secret-leak alert): ghi nhận thời điểm redaction SECRET/TOKEN thực sự kích hoạt khi sanitize telemetry.
 *
 * Chỉ đếm các pattern đáng báo động (bearer/key:value/key-name/long token), KHÔNG đếm email
 * vì email trong free text là phổ biến và lành tính (tránh latch alert critical vĩnh viễn).
 * Lưu timestamp trong ring buffer để alert đánh giá theo cửa sổ thời gian và tự lành (self-heal).
 */
const MAX_REDACTION_HITS = 1000;
const redactionHitTimestamps: number[] = [];

function recordSecretRedactionHit(): void {
  redactionHitTimestamps.push(Date.now());
  if (redactionHitTimestamps.length > MAX_REDACTION_HITS) {
    redactionHitTimestamps.splice(0, redactionHitTimestamps.length - MAX_REDACTION_HITS);
  }
}

/**
 * Số lần secret/token bị redaction. windowMs > 0 chỉ đếm hit trong cửa sổ thời gian gần đây
 * (alert tự lành khi hit cũ trôi ra ngoài cửa sổ). windowMs <= 0 đếm toàn bộ hit còn giữ.
 */
export function getRedactionHitCount(windowMs?: number): number {
  if (!windowMs || windowMs <= 0) return redactionHitTimestamps.length;
  const cutoff = Date.now() - windowMs;
  let count = 0;
  for (const t of redactionHitTimestamps) {
    if (t >= cutoff) count += 1;
  }
  return count;
}

export function resetRedactionHitCount(): void {
  redactionHitTimestamps.length = 0;
}

/**
 * Redact chuỗi tự do (route, free text) trước khi lưu telemetry.
 * Thứ tự quan trọng: email -> bearer -> key:value -> key-name -> long token.
 * Chỉ ghi nhận secret-leak hit khi pattern secret/token (không phải email) thực sự che được dữ liệu.
 */
export function redactTelemetryString(input: string): string {
  if (!input) return input;
  const afterEmail = input.replace(EMAIL_RE, "[EMAIL_REDACTED]");
  const afterSecret = afterEmail
    .replace(BEARER_RE, "[REDACTED]")
    .replace(KEY_VALUE_RE, "$1: [REDACTED]")
    .replace(KEY_NAME_RE, "[REDACTED]")
    .replace(LONG_TOKEN_RE, "[REDACTED]");
  if (afterSecret !== afterEmail) recordSecretRedactionHit();
  return afterSecret;
}

/**
 * Redact cho field enum/controlled (type, actionType, errorCode, model...).
 * KHÔNG áp dụng LONG_TOKEN_RE vì các giá trị này thường > 24 ký tự liền nhau hợp lệ
 * (vd "assistant_message_received", "ASSISTANT_PROVIDER_RATE_LIMIT") và không phải secret.
 * Vẫn chặn email/bearer/api-key nếu lỡ bị nhồi vào.
 */
function redactEnumField(input: string): string {
  if (!input) return input;
  const afterEmail = input.replace(EMAIL_RE, "[EMAIL_REDACTED]");
  const afterSecret = afterEmail
    .replace(BEARER_RE, "[REDACTED]")
    .replace(KEY_VALUE_RE, "$1: [REDACTED]")
    .replace(KEY_NAME_RE, "[REDACTED]");
  if (afterSecret !== afterEmail) recordSecretRedactionHit();
  return afterSecret;
}

/**
 * Hash một chiều session id để không bao giờ lưu raw session/user id.
 * Trả về undefined nếu không có session id.
 */
export function hashSession(sessionId: string | null | undefined): string | undefined {
  const trimmed = typeof sessionId === "string" ? sessionId.trim() : "";
  if (!trimmed) return undefined;
  return createHash("sha256").update(trimmed).digest("hex").slice(0, 16);
}

function isTelemetryEnabled(): boolean {
  return env.AI_ENABLE_TELEMETRY === true;
}

function sanitizeRoute(route: string | undefined): string {
  if (!route) return "";
  return redactTelemetryString(route).slice(0, 120);
}

function sanitizeShortField(value: string | undefined, max = 80): string | undefined {
  if (!value) return undefined;
  return redactEnumField(value).slice(0, max);
}

// --- Turn telemetry (server-side, mỗi lượt gọi provider) ---

export function recordAssistantTurnTelemetry(
  entry: Omit<AssistantTurnTelemetry, "createdAt" | "route"> & { route: string | undefined },
): void {
  if (!isTelemetryEnabled()) return;

  const safe: AssistantTurnTelemetry = {
    provider: entry.provider,
    model: sanitizeShortField(entry.model) ?? "",
    route: sanitizeRoute(entry.route),
    mode: entry.mode,
    latencyMs: Number.isFinite(entry.latencyMs) ? Math.max(0, Math.round(entry.latencyMs)) : 0,
    outcome: entry.outcome,
    errorCode: sanitizeShortField(entry.errorCode),
    actionType: sanitizeShortField(entry.actionType),
    actionCount: Number.isFinite(entry.actionCount) ? Math.max(0, entry.actionCount) : 0,
    structuredAttempted: entry.structuredAttempted,
    structuredSucceeded: entry.structuredSucceeded,
    repairTriggered: entry.repairTriggered,
    repairSucceeded: entry.repairSucceeded,
    tokenEstimate: Number.isFinite(entry.tokenEstimate) ? Math.max(0, Math.round(entry.tokenEstimate)) : 0,
    sessionHash: entry.sessionHash,
    source: entry.source,
    experiment: sanitizeShortField(entry.experiment, 60),
    variant: sanitizeShortField(entry.variant, 60),
    inCohort: entry.inCohort,
    createdAt: new Date().toISOString(),
  };

  turnTelemetryStore.push(safe);
  if (turnTelemetryStore.length > MAX_TURN_EVENTS) {
    turnTelemetryStore.splice(0, turnTelemetryStore.length - MAX_TURN_EVENTS);
  }
}

export function getAssistantTurnTelemetry(): AssistantTurnTelemetry[] {
  return [...turnTelemetryStore];
}

export function resetAssistantTurnTelemetry(): void {
  turnTelemetryStore.length = 0;
  redactionHitTimestamps.length = 0;
}

// --- Client telemetry (event observability đẩy từ frontend) ---

const ALLOWED_CLIENT_EVENT_FIELDS = new Set([
  "type",
  "route",
  "actionType",
  "workflowType",
  "nudgeType",
  "success",
  "latencyMs",
  "errorCode",
  "sessionId",
  "sessionHash",
  "createdAt",
]);

/**
 * Chuẩn hóa + redact 1 event observability từ frontend.
 * Bỏ mọi field không nằm trong allowlist (đặc biệt là metadata raw).
 * Trả về null nếu event không hợp lệ.
 */
export function normalizeClientAssistantEvent(raw: unknown): ClientAssistantTelemetryEvent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.type !== "string" || !obj.type.trim()) return null;

  const event: ClientAssistantTelemetryEvent = {
    type: sanitizeShortField(obj.type, 60) ?? "unknown",
    createdAt:
      typeof obj.createdAt === "string" && obj.createdAt.trim()
        ? obj.createdAt
        : new Date().toISOString(),
  };

  if (typeof obj.route === "string") event.route = sanitizeRoute(obj.route);
  if (typeof obj.actionType === "string") event.actionType = sanitizeShortField(obj.actionType);
  if (typeof obj.workflowType === "string") event.workflowType = sanitizeShortField(obj.workflowType);
  if (typeof obj.nudgeType === "string") event.nudgeType = sanitizeShortField(obj.nudgeType);
  if (typeof obj.success === "boolean") event.success = obj.success;
  if (typeof obj.latencyMs === "number" && Number.isFinite(obj.latencyMs)) {
    event.latencyMs = Math.max(0, Math.round(obj.latencyMs));
  }
  if (typeof obj.errorCode === "string") event.errorCode = sanitizeShortField(obj.errorCode);

  // Session: ưu tiên sessionHash đã hash; nếu nhận sessionId raw thì hash lại tại server.
  if (typeof obj.sessionHash === "string" && obj.sessionHash.trim()) {
    event.sessionHash = sanitizeShortField(obj.sessionHash, 64);
  } else if (typeof obj.sessionId === "string") {
    event.sessionHash = hashSession(obj.sessionId);
  }

  return event;
}

export function recordClientAssistantEvents(rawEvents: unknown[]): number {
  if (!isTelemetryEnabled()) return 0;
  if (!Array.isArray(rawEvents)) return 0;

  let accepted = 0;
  for (const raw of rawEvents.slice(0, 100)) {
    const normalized = normalizeClientAssistantEvent(raw);
    if (!normalized) continue;
    clientTelemetryStore.push(normalized);
    accepted += 1;
  }

  if (clientTelemetryStore.length > MAX_CLIENT_EVENTS) {
    clientTelemetryStore.splice(0, clientTelemetryStore.length - MAX_CLIENT_EVENTS);
  }
  return accepted;
}

export function getClientAssistantEvents(): ClientAssistantTelemetryEvent[] {
  return [...clientTelemetryStore];
}

export function resetClientAssistantEvents(): void {
  clientTelemetryStore.length = 0;
}

// (Lưu allowlist để tham chiếu/test; tránh field thừa lọt vào store.)
export { ALLOWED_CLIENT_EVENT_FIELDS };

// --- Summaries: latency/error theo route ---

export interface RouteTelemetrySummary {
  route: string;
  count: number;
  errorCount: number;
  fallbackCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.ceil((p / 100) * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)];
}

export function summarizeAssistantTelemetryByRoute(): RouteTelemetrySummary[] {
  const byRoute = new Map<string, { latencies: number[]; errorCount: number; fallbackCount: number }>();

  for (const turn of turnTelemetryStore) {
    const key = turn.route || "(unknown)";
    const bucket = byRoute.get(key) ?? { latencies: [], errorCount: 0, fallbackCount: 0 };
    bucket.latencies.push(turn.latencyMs);
    if (turn.outcome === "error") bucket.errorCount += 1;
    if (turn.outcome === "fallback") bucket.fallbackCount += 1;
    byRoute.set(key, bucket);
  }

  const summaries: RouteTelemetrySummary[] = [];
  for (const [route, bucket] of byRoute.entries()) {
    const sorted = [...bucket.latencies].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    summaries.push({
      route,
      count: sorted.length,
      errorCount: bucket.errorCount,
      fallbackCount: bucket.fallbackCount,
      avgLatencyMs: sorted.length > 0 ? Math.round(sum / sorted.length) : 0,
      p95LatencyMs: percentile(sorted, 95),
    });
  }

  return summaries.sort((a, b) => b.count - a.count);
}

// --- Dashboard overview: provider health + quality proxy + cost ---

/** Provider health: volume, latency, lỗi/fallback/timeout/rate-limit theo provider+model. */
export interface ProviderHealthSummary {
  provider: string;
  model: string;
  count: number;
  errorCount: number;
  fallbackCount: number;
  timeoutCount: number;
  rateLimitCount: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  errorRate: number; // 0-100
  fallbackRate: number; // 0-100
}

/** Quality proxy từ client events: feedback, action acceptance/success, clarification resolution. */
export interface QualityProxySummary {
  feedbackTotal: number;
  feedbackHelpful: number;
  feedbackNotHelpful: number;
  helpfulRate: number; // 0-100
  actionsProposed: number;
  actionsExecuted: number;
  actionsVerified: number;
  actionsFailed: number;
  actionAcceptanceRate: number; // executed/proposed, 0-100
  actionSuccessRate: number; // verified/executed, 0-100
  clarificationsCreated: number;
  clarificationsResolved: number;
  clarificationResolutionRate: number; // 0-100
}

/** Cost/token proxy theo provider+model (token estimate, không phải số tiền thật). */
export interface CostSummary {
  provider: string;
  model: string;
  turns: number;
  totalTokenEstimate: number;
  avgTokenEstimate: number;
}

/** Structured output + repair effectiveness. */
export interface ParseRepairSummary {
  structuredAttempted: number;
  structuredSucceeded: number;
  structuredSuccessRate: number; // 0-100
  repairTriggered: number;
  repairSucceeded: number;
  repairSuccessRate: number; // 0-100
}

export interface AssistantTelemetryOverview {
  turnCount: number;
  clientEventCount: number;
  providerHealth: ProviderHealthSummary[];
  byRoute: RouteTelemetrySummary[];
  quality: QualityProxySummary;
  cost: CostSummary[];
  parseRepair: ParseRepairSummary;
  experiments: ExperimentVariantSummary[];
  generatedAt: string;
}

function rate(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function isTimeoutCode(errorCode?: string): boolean {
  return typeof errorCode === "string" && errorCode.toUpperCase().includes("TIMEOUT");
}

function isRateLimitCode(errorCode?: string): boolean {
  if (typeof errorCode !== "string") return false;
  const upper = errorCode.toUpperCase();
  return upper.includes("RATE_LIMIT") || upper.includes("RATE-LIMIT") || upper.includes("429");
}

export function summarizeAssistantProviderHealth(): ProviderHealthSummary[] {
  const byKey = new Map<
    string,
    {
      provider: string;
      model: string;
      latencies: number[];
      errorCount: number;
      fallbackCount: number;
      timeoutCount: number;
      rateLimitCount: number;
    }
  >();

  for (const turn of turnTelemetryStore) {
    const key = `${turn.provider}::${turn.model}`;
    const bucket =
      byKey.get(key) ?? {
        provider: turn.provider,
        model: turn.model,
        latencies: [],
        errorCount: 0,
        fallbackCount: 0,
        timeoutCount: 0,
        rateLimitCount: 0,
      };
    bucket.latencies.push(turn.latencyMs);
    if (turn.outcome === "error") bucket.errorCount += 1;
    if (turn.outcome === "fallback") bucket.fallbackCount += 1;
    if (isTimeoutCode(turn.errorCode)) bucket.timeoutCount += 1;
    if (isRateLimitCode(turn.errorCode)) bucket.rateLimitCount += 1;
    byKey.set(key, bucket);
  }

  const out: ProviderHealthSummary[] = [];
  for (const bucket of byKey.values()) {
    const sorted = [...bucket.latencies].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const count = sorted.length;
    out.push({
      provider: bucket.provider,
      model: bucket.model,
      count,
      errorCount: bucket.errorCount,
      fallbackCount: bucket.fallbackCount,
      timeoutCount: bucket.timeoutCount,
      rateLimitCount: bucket.rateLimitCount,
      avgLatencyMs: count > 0 ? Math.round(sum / count) : 0,
      p50LatencyMs: percentile(sorted, 50),
      p95LatencyMs: percentile(sorted, 95),
      errorRate: rate(bucket.errorCount, count),
      fallbackRate: rate(bucket.fallbackCount, count),
    });
  }

  return out.sort((a, b) => b.count - a.count);
}

export function summarizeAssistantQualityProxy(): QualityProxySummary {
  let feedbackHelpful = 0;
  let feedbackNotHelpful = 0;
  let actionsProposed = 0;
  let actionsExecuted = 0;
  let actionsVerified = 0;
  let actionsFailed = 0;
  let clarificationsCreated = 0;
  let clarificationsResolved = 0;

  for (const ev of clientTelemetryStore) {
    switch (ev.type) {
      case "assistant_feedback_submitted":
        // success=true coi là helpful (thumbs up), false là not helpful.
        if (ev.success === true) feedbackHelpful += 1;
        else if (ev.success === false) feedbackNotHelpful += 1;
        break;
      case "assistant_action_proposed":
        actionsProposed += 1;
        break;
      case "assistant_action_executed":
        actionsExecuted += 1;
        break;
      case "assistant_action_verified":
        actionsVerified += 1;
        break;
      case "assistant_action_failed":
        actionsFailed += 1;
        break;
      case "assistant_clarification_created":
        clarificationsCreated += 1;
        break;
      case "assistant_clarification_resolved":
        clarificationsResolved += 1;
        break;
    }
  }

  const feedbackTotal = feedbackHelpful + feedbackNotHelpful;

  return {
    feedbackTotal,
    feedbackHelpful,
    feedbackNotHelpful,
    helpfulRate: rate(feedbackHelpful, feedbackTotal),
    actionsProposed,
    actionsExecuted,
    actionsVerified,
    actionsFailed,
    actionAcceptanceRate: rate(actionsExecuted, actionsProposed),
    actionSuccessRate: rate(actionsVerified, actionsExecuted),
    clarificationsCreated,
    clarificationsResolved,
    clarificationResolutionRate: rate(clarificationsResolved, clarificationsCreated),
  };
}

export function summarizeAssistantCost(): CostSummary[] {
  const byKey = new Map<string, { provider: string; model: string; turns: number; totalToken: number }>();

  for (const turn of turnTelemetryStore) {
    const key = `${turn.provider}::${turn.model}`;
    const bucket = byKey.get(key) ?? { provider: turn.provider, model: turn.model, turns: 0, totalToken: 0 };
    bucket.turns += 1;
    bucket.totalToken += turn.tokenEstimate;
    byKey.set(key, bucket);
  }

  const out: CostSummary[] = [];
  for (const bucket of byKey.values()) {
    out.push({
      provider: bucket.provider,
      model: bucket.model,
      turns: bucket.turns,
      totalTokenEstimate: bucket.totalToken,
      avgTokenEstimate: bucket.turns > 0 ? Math.round(bucket.totalToken / bucket.turns) : 0,
    });
  }

  return out.sort((a, b) => b.totalTokenEstimate - a.totalTokenEstimate);
}

/**
 * GĐ5 (Cost-USD alert): tổng token estimate của các turn trong cửa sổ thời gian gần đây.
 * windowMs > 0 chỉ cộng turn có createdAt trong cửa sổ (chi phí có mốc thời gian rõ ràng, dễ đặt ngưỡng).
 * windowMs <= 0 cộng toàn bộ turn còn giữ trong ring buffer.
 */
export function sumTokenEstimateWithinWindow(windowMs?: number): number {
  if (!windowMs || windowMs <= 0) {
    return turnTelemetryStore.reduce((sum, turn) => sum + turn.tokenEstimate, 0);
  }
  const cutoff = Date.now() - windowMs;
  let total = 0;
  for (const turn of turnTelemetryStore) {
    if (Date.parse(turn.createdAt) >= cutoff) total += turn.tokenEstimate;
  }
  return total;
}

export function summarizeAssistantParseRepair(): ParseRepairSummary {
  let structuredAttempted = 0;
  let structuredSucceeded = 0;
  let repairTriggered = 0;
  let repairSucceeded = 0;

  for (const turn of turnTelemetryStore) {
    if (turn.structuredAttempted) structuredAttempted += 1;
    if (turn.structuredSucceeded) structuredSucceeded += 1;
    if (turn.repairTriggered) repairTriggered += 1;
    if (turn.repairSucceeded) repairSucceeded += 1;
  }

  return {
    structuredAttempted,
    structuredSucceeded,
    structuredSuccessRate: rate(structuredSucceeded, structuredAttempted),
    repairTriggered,
    repairSucceeded,
    repairSuccessRate: rate(repairSucceeded, repairTriggered),
  };
}

/**
 * GĐ5 (Rollout/A-B): tổng hợp turn theo experiment+variant để so sánh A/B.
 */
export interface ExperimentVariantSummary {
  experiment: string;
  variant: string;
  turns: number;
  errorCount: number;
  fallbackCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number; // 0-100
  avgTokenEstimate: number;
}

export function summarizeAssistantExperiments(): ExperimentVariantSummary[] {
  const byKey = new Map<
    string,
    {
      experiment: string;
      variant: string;
      latencies: number[];
      errorCount: number;
      fallbackCount: number;
      totalToken: number;
    }
  >();

  for (const turn of turnTelemetryStore) {
    const experiment = turn.experiment ?? "";
    if (!experiment) continue;
    const variant = turn.variant ?? "control";
    const key = `${experiment}::${variant}`;
    const bucket =
      byKey.get(key) ?? {
        experiment,
        variant,
        latencies: [],
        errorCount: 0,
        fallbackCount: 0,
        totalToken: 0,
      };
    bucket.latencies.push(turn.latencyMs);
    if (turn.outcome === "error") bucket.errorCount += 1;
    if (turn.outcome === "fallback") bucket.fallbackCount += 1;
    bucket.totalToken += turn.tokenEstimate;
    byKey.set(key, bucket);
  }

  const out: ExperimentVariantSummary[] = [];
  for (const bucket of byKey.values()) {
    const sorted = [...bucket.latencies].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    out.push({
      experiment: bucket.experiment,
      variant: bucket.variant,
      turns: count,
      errorCount: bucket.errorCount,
      fallbackCount: bucket.fallbackCount,
      avgLatencyMs: count > 0 ? Math.round(sum / count) : 0,
      p95LatencyMs: percentile(sorted, 95),
      errorRate: rate(bucket.errorCount, count),
      avgTokenEstimate: count > 0 ? Math.round(bucket.totalToken / count) : 0,
    });
  }

  return out.sort((a, b) => b.turns - a.turns);
}

/**
 * Tổng hợp toàn bộ overview để phục vụ dashboard/đọc nhanh.
 * Trả lời được: model nào lỗi, route nào chất lượng thấp, action nào fail nhiều, token/cost bao nhiêu.
 */
export function getAssistantTelemetryOverview(): AssistantTelemetryOverview {
  return {
    turnCount: turnTelemetryStore.length,
    clientEventCount: clientTelemetryStore.length,
    providerHealth: summarizeAssistantProviderHealth(),
    byRoute: summarizeAssistantTelemetryByRoute(),
    quality: summarizeAssistantQualityProxy(),
    cost: summarizeAssistantCost(),
    parseRepair: summarizeAssistantParseRepair(),
    experiments: summarizeAssistantExperiments(),
    generatedAt: new Date().toISOString(),
  };
}

import { isRealMode } from "@/app/utils/app-mode";
import { getApiBaseUrl, isApiBaseUrlConfigured } from "@/lib/api/apiClient";
import { authedFetch } from "@/lib/auth/authedFetch";
import { type AssistantEvent, type AssistantEventType, setAssistantEventSink } from "./assistantObservability";

/**
 * G4: Forwarder gửi event observability (đã redacted) lên backend telemetry.
 *
 * Nguyên tắc:
 * - Chỉ gửi ở real-mode + signed-in + online. Demo-mode không gọi protected backend.
 * - Offline: giữ buffer trong bộ nhớ, flush lại khi online trở lại.
 * - Chỉ gửi field an toàn (allowlist), KHÔNG gửi metadata raw/messageId/userId raw.
 * - Backend nhận sessionId rồi tự hash; FE gửi sessionId (đã là id ẩn danh per-session).
 * - Best-effort: lỗi gửi không bao giờ phá vỡ local logging.
 */

const TELEMETRY_PATH = "/ai/assistant/telemetry";
const FLUSH_DEBOUNCE_MS = 4000;
const MAX_BATCH = 25;
const MAX_BUFFER = 200;

// Các event đáng đẩy lên server (turn-level + outcome quan trọng).
const FORWARDED_EVENT_TYPES = new Set<AssistantEventType>([
  "assistant_message_sent",
  "assistant_message_received",
  "assistant_action_proposed",
  "assistant_action_executed",
  "assistant_action_verified",
  "assistant_action_failed",
  "assistant_workflow_completed",
  "assistant_workflow_failed",
  "assistant_feedback_submitted",
  "assistant_nudge_shown",
  "assistant_nudge_dismissed",
]);

export interface RedactedTelemetryEvent {
  type: string;
  route?: string;
  actionType?: string;
  workflowType?: string;
  nudgeType?: string;
  success?: boolean;
  latencyMs?: number;
  errorCode?: string;
  sessionId?: string;
  createdAt: string;
}

let buffer: RedactedTelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let onlineListenerBound = false;
let started = false;

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function canForward(): boolean {
  return isRealMode() && isApiBaseUrlConfigured();
}

/**
 * Chuyển AssistantEvent (local) thành payload telemetry redacted, chỉ giữ field an toàn.
 * KHÔNG forward metadata (có thể chứa label/payload), messageId, hay userId raw.
 */
function toRedactedEvent(event: AssistantEvent): RedactedTelemetryEvent {
  return {
    type: event.type,
    route: event.route,
    actionType: event.actionType,
    workflowType: event.workflowType,
    nudgeType: event.nudgeType,
    success: event.success,
    latencyMs: event.latencyMs,
    errorCode: event.errorCode,
    sessionId: event.sessionId,
    createdAt: event.createdAt,
  };
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushTelemetry();
  }, FLUSH_DEBOUNCE_MS);
}

export async function flushTelemetry(): Promise<void> {
  if (!canForward() || !isOnline() || buffer.length === 0) return;

  const batch = buffer.slice(0, MAX_BATCH);
  try {
    const response = await authedFetch(`${getApiBaseUrl()}${TELEMETRY_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
    });

    if (response.ok) {
      // Chỉ loại các event đã gửi thành công khỏi buffer.
      buffer = buffer.slice(batch.length);
      // Còn dư thì lên lịch flush tiếp.
      if (buffer.length > 0) scheduleFlush();
    }
    // Lỗi non-ok: giữ buffer, thử lại lần sau (không spam ngay).
  } catch {
    // Offline/backend lỗi: giữ buffer, flush khi online trở lại.
  }
}

function enqueue(event: AssistantEvent): void {
  if (!canForward()) return;
  if (!FORWARDED_EVENT_TYPES.has(event.type)) return;

  buffer.push(toRedactedEvent(event));
  if (buffer.length > MAX_BUFFER) {
    // Giữ các event mới nhất, bỏ event cũ để tránh phình bộ nhớ.
    buffer = buffer.slice(buffer.length - MAX_BUFFER);
  }

  if (isOnline()) {
    scheduleFlush();
  }
}

/**
 * Bật forwarder: đăng ký sink vào observability + lắng nghe online để flush buffer.
 * An toàn khi gọi nhiều lần (idempotent). Ở demo-mode sẽ không gửi gì.
 */
export function startAssistantTelemetryForwarding(): void {
  if (started) return;
  started = true;

  setAssistantEventSink(enqueue);

  if (typeof window !== "undefined" && !onlineListenerBound) {
    onlineListenerBound = true;
    window.addEventListener("online", () => {
      void flushTelemetry();
    });
    // Flush sót lại trước khi rời trang (best-effort).
    window.addEventListener("beforeunload", () => {
      void flushTelemetry();
    });
  }
}

/** Tắt forwarder (chủ yếu phục vụ test/cleanup). */
export function stopAssistantTelemetryForwarding(): void {
  setAssistantEventSink(null);
  started = false;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

/** Chỉ dùng cho test: đọc/đặt lại buffer hiện tại. */
export function __getTelemetryBufferForTest(): RedactedTelemetryEvent[] {
  return [...buffer];
}

export function __resetTelemetryForTest(): void {
  buffer = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  started = false;
  setAssistantEventSink(null);
}

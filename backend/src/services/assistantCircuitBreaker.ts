import { env } from "../config/env";

/**
 * G7 (Reliability): circuit breaker đơn giản cho provider AI (Groq).
 *
 * Mục tiêu: khi provider lỗi transient liên tiếp (429/5xx/timeout), tạm thời
 * chặn request mới trong một khoảng cooldown để tránh spam provider đang nghẽn
 * và để caller rơi nhanh về deterministic fallback, giữ UX real-mode mượt.
 *
 * Nguyên tắc:
 * - In-memory, per-process (đủ cho 1 backend instance; multi-instance mỗi
 *   instance tự giữ trạng thái riêng — chấp nhận được cho mục tiêu chống spam).
 * - States: closed (bình thường) -> open (đang chặn) -> half_open (thử lại 1 lần).
 * - Chỉ đếm lỗi transient; lỗi auth/config KHÔNG tính vào breaker (đó là lỗi cấu hình).
 */

export type CircuitState = "closed" | "open" | "half_open";

interface CircuitBreakerSnapshot {
  state: CircuitState;
  consecutiveFailures: number;
  openedAt: number | null;
  /** Còn bao nhiêu ms tới khi được phép thử lại (chỉ có ý nghĩa khi open). */
  retryAfterMs: number;
}

const TRANSIENT_ERROR_CODES = new Set([
  "ASSISTANT_PROVIDER_RATE_LIMIT",
  "ASSISTANT_PROVIDER_TIMEOUT",
  "ASSISTANT_PROVIDER_SERVER_ERROR",
]);

interface BreakerInternalState {
  consecutiveFailures: number;
  openedAt: number | null;
  halfOpenInFlight: boolean;
}

const state: BreakerInternalState = {
  consecutiveFailures: 0,
  openedAt: null,
  halfOpenInFlight: false,
};

function failureThreshold(): number {
  const value = env.AI_GROQ_CIRCUIT_FAILURE_THRESHOLD;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 4;
}

function cooldownMs(): number {
  const value = env.AI_GROQ_CIRCUIT_COOLDOWN_MS;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 30000;
}

export function isTransientProviderErrorCode(errorCode: string | undefined): boolean {
  return errorCode !== undefined && TRANSIENT_ERROR_CODES.has(errorCode);
}

/** Trạng thái hiện tại của circuit (đã tính tới cooldown đã trôi). */
export function getCircuitState(now: number = Date.now()): CircuitState {
  if (state.openedAt === null) return "closed";
  if (now - state.openedAt >= cooldownMs()) return "half_open";
  return "open";
}

/**
 * Caller hỏi trước khi gọi provider: có được phép thử không?
 * - closed: cho phép.
 * - half_open: cho phép đúng 1 request thăm dò; các request song song khác bị chặn.
 * - open: chặn.
 */
export function canRequest(now: number = Date.now()): boolean {
  const current = getCircuitState(now);
  if (current === "closed") return true;
  if (current === "open") return false;

  // half_open: chỉ cho 1 request thăm dò.
  if (state.halfOpenInFlight) return false;
  state.halfOpenInFlight = true;
  return true;
}

/** Ghi nhận 1 turn thành công -> reset breaker. */
export function recordSuccess(): void {
  state.consecutiveFailures = 0;
  state.openedAt = null;
  state.halfOpenInFlight = false;
}

/**
 * Ghi nhận 1 lỗi. Chỉ lỗi transient mới đẩy breaker tới open.
 * Lỗi non-transient (auth/config) được bỏ qua để không che giấu lỗi cấu hình.
 */
export function recordFailure(errorCode: string | undefined, now: number = Date.now()): void {
  state.halfOpenInFlight = false;

  if (!isTransientProviderErrorCode(errorCode)) {
    return;
  }

  state.consecutiveFailures += 1;
  if (state.consecutiveFailures >= failureThreshold()) {
    state.openedAt = now;
  }
}

export function getCircuitSnapshot(now: number = Date.now()): CircuitBreakerSnapshot {
  const current = getCircuitState(now);
  const retryAfterMs =
    current === "open" && state.openedAt !== null ? Math.max(0, cooldownMs() - (now - state.openedAt)) : 0;
  return {
    state: current,
    consecutiveFailures: state.consecutiveFailures,
    openedAt: state.openedAt,
    retryAfterMs,
  };
}

/** Reset toàn bộ trạng thái breaker (dùng cho test). */
export function resetCircuitBreaker(): void {
  state.consecutiveFailures = 0;
  state.openedAt = null;
  state.halfOpenInFlight = false;
}

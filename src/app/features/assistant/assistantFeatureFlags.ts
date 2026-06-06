/**
 * Phase 1 / G-series: feature flags kill-switch cho assistant (frontend).
 *
 * Mục tiêu: cho phép tắt nhanh các lớp tốn chi phí/rủi ro của assistant mà không
 * cần đổi code (memory, retrieval, proactive nudge). Tất cả default BẬT để giữ
 * nguyên hành vi hiện tại; chỉ tắt khi incident hoặc khi muốn giảm tải.
 *
 * Quy ước: đặt VITE_AI_ENABLE_*=0 (hoặc false/no/off) để TẮT. Thiếu giá trị => bật.
 * Không phá demo mode: các flag chỉ gate tính năng phụ trợ, không chạm core flow.
 */

function isFlagEnabled(value: string | undefined, defaultValue = true): boolean {
  if (typeof value !== "string") return defaultValue;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "") return defaultValue;
  return !(trimmed === "0" || trimmed === "false" || trimmed === "no" || trimmed === "off");
}

const ENABLE_MEMORY = isFlagEnabled(import.meta.env.VITE_AI_ENABLE_MEMORY);
const ENABLE_RETRIEVAL = isFlagEnabled(import.meta.env.VITE_AI_ENABLE_RETRIEVAL);
const ENABLE_PROACTIVE_NUDGE = isFlagEnabled(import.meta.env.VITE_AI_ENABLE_PROACTIVE_NUDGE);

/** Assistant memory (capture + summarize + retrieval memory candidates). Default ON. */
export function isAssistantMemoryEnabled(): boolean {
  return ENABLE_MEMORY;
}

/** Retrieval knowledge từ dữ liệu local của user. Default ON. */
export function isAssistantRetrievalEnabled(): boolean {
  return ENABLE_RETRIEVAL;
}

/** Proactive nudge (gợi ý chủ động). Default ON. */
export function isAssistantProactiveNudgeEnabled(): boolean {
  return ENABLE_PROACTIVE_NUDGE;
}

/**
 * Giai đoạn 1: Redaction helper DÙNG CHUNG cho frontend và backend.
 *
 * Mục tiêu: gộp các bản `redactSensitive` đang bị nhân bản rải rác (assistant memory,
 * retrieval, observability, conversation state, workflow, sanitizeContext, backend
 * assistantService) về MỘT nguồn duy nhất để không lệch regex giữa các nơi.
 *
 * Module này KHÔNG import gì khác để tránh import vòng (vd memory <-> observability)
 * và để frontend dùng được qua alias `@shared/assistantRedaction`.
 *
 * Nguyên tắc:
 * - Chỉ THÊM khả năng che (superset), không nới lỏng so với bản đầy đủ nhất trước đây.
 * - Thứ tự thay thế quan trọng: email -> bearer -> key:value -> key-name -> long token -> key word.
 * - Không bao giờ giữ lại raw secret/token/API key/email trong output.
 */

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const BEARER_RE = /bearer\s+[A-Za-z0-9._\-]+/gi;
// key: value / key=value (có thể có dấu nháy bao quanh value)
const KEY_VALUE_RE =
  /\b(api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|password|token|private[_\s-]?key|credentials)\b\s*[:=]\s*["']?[^"'\s,;]+/gi;
// tên biến/khóa có chứa từ nhạy cảm (vd myApiKeyValue, db_password_prod)
const KEY_NAME_RE =
  /\b[\w-]*(?:api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|password|token|private[_\s-]?key)[\w-]*\b/gi;
// token ngẫu nhiên entropy cao (>=20 ký tự) cần có ĐỦ chữ HOA + thường + số.
// Yêu cầu mix-case + digit để che secret thật (JWT, base64 key...) nhưng KHÔNG che
// các ID nội bộ snake_case kiểu "assistant_feedback_123_abc" hay "wf_123_xyz" (thường + số, không HOA).
const LONG_TOKEN_RE =
  /\b(?=[A-Za-z0-9_-]{20,}\b)(?=[A-Za-z0-9_-]*[a-z])(?=[A-Za-z0-9_-]*[A-Z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]+\b/g;
// từ khóa nhạy cảm đứng một mình
const KEY_WORD_RE =
  /\b(api[_\s-]?key|access[_\s-]?token|refresh[_\s-]?token|secret|password|token|private[_\s-]?key|credentials)\b/gi;

/**
 * Che thông tin nhạy cảm trong chuỗi tự do (chat input, memory, retrieval, workflow summary, log).
 * Đây là nguồn duy nhất cho redaction phía assistant; không tạo bản sao cục bộ ở nơi khác.
 */
export function redactSensitive(text: string): string {
  if (!text) return text;
  return text
    .replace(EMAIL_RE, "[EMAIL_REDACTED]")
    .replace(BEARER_RE, "[REDACTED]")
    .replace(KEY_VALUE_RE, "$1: [REDACTED]")
    .replace(KEY_NAME_RE, "[REDACTED]")
    .replace(LONG_TOKEN_RE, "[REDACTED]")
    .replace(KEY_WORD_RE, "[REDACTED]");
}
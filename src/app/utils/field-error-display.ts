/**
 * Adapter mỏng ở lớp UI cho inline validation của form Core_Flow (Onboarding,
 * SMART Goal Setup, Feasibility Check — Req 13.1, 13.2, 13.3).
 *
 * Toàn bộ quyết định hợp lệ/không hợp lệ đi qua pure helper
 * `resolveFieldValidationState`. Adapter chỉ bổ sung phần thuộc *lớp trình bày*:
 * - gating hiển thị (chỉ hiện lỗi sau khi field bị blur, đang có nội dung, hoặc
 *   người dùng đã cố submit) để lỗi xuất hiện/gỡ bỏ đúng theo tương tác;
 * - cho phép override thông báo theo từng `kind` rule để giữ nguyên copy cụ thể
 *   sẵn có của từng màn hình mà vẫn nêu rõ điều kiện field cần đạt (Req 13.2).
 *
 * Không side effect, không đọc/ghi storage.
 */
import { type FieldRule, resolveFieldValidationState } from "./form-validation-state";

export interface FieldErrorDisplayOptions {
  /** field đã mất tiêu điểm (blur) ít nhất một lần */
  touched?: boolean;
  /** field đang có nội dung người dùng nhập (hiện lỗi sớm khi đang gõ) */
  hasContent?: boolean;
  /** buộc hiển thị lỗi (ví dụ người dùng đã bấm submit) */
  forceShow?: boolean;
  /** override thông báo theo `kind` rule bị vi phạm để giữ copy cụ thể của màn hình */
  messages?: Partial<Record<FieldRule["kind"], string>>;
}

export interface FieldErrorDisplay {
  /** field hợp lệ theo toàn bộ rule hay không */
  valid: boolean;
  /** kind rule đầu tiên bị vi phạm, null khi hợp lệ */
  violated: FieldRule["kind"] | null;
  /**
   * Thông báo nên hiển thị cạnh field: chuỗi khi cần hiện lỗi (đã qua gating),
   * `null` khi hợp lệ hoặc chưa đến lúc hiện. Đây là giá trị dùng cho slot lỗi.
   */
  message: string | null;
  /** true khi nên hiển thị lỗi (dùng cho `aria-invalid`, describedby...). */
  showError: boolean;
}

/**
 * Phân giải trạng thái hiển thị lỗi cho một field.
 *
 * Trước tiên gọi `resolveFieldValidationState(value, rules)` để lấy trạng thái
 * loại trừ lẫn nhau (valid ↔ message). Sau đó áp gating hiển thị và override
 * thông báo. Khi hợp lệ luôn trả `message: null`, `showError: false`.
 */
export function resolveFieldErrorDisplay(
  value: string,
  rules: readonly FieldRule[],
  options: FieldErrorDisplayOptions = {},
): FieldErrorDisplay {
  const state = resolveFieldValidationState(value, rules);

  if (state.valid) {
    return { valid: true, violated: null, message: null, showError: false };
  }

  const shouldShow = Boolean(options.touched || options.hasContent || options.forceShow);
  const overridden = state.violated ? options.messages?.[state.violated] : undefined;
  const displayMessage = overridden ?? state.message;

  return {
    valid: false,
    violated: state.violated,
    message: shouldShow ? displayMessage : null,
    showError: shouldShow,
  };
}

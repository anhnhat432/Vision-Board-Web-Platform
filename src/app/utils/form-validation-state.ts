/**
 * Pure helper phân giải trạng thái hợp lệ của một field trong form Core_Flow
 * (Onboarding, SMART Goal Setup, Feasibility Check).
 *
 * Chỉ suy luận từ `value` và `rules`. Helper này KHÔNG import storage,
 * KHÔNG đọc/ghi localStorage, KHÔNG side effect — nhằm giữ nó thuần (pure) để
 * test được bằng property-based testing (Req 13.1, 13.2, 13.3).
 */

/**
 * Một điều kiện hợp lệ áp lên giá trị field. Đúng một trong bốn loại loại trừ
 * lẫn nhau, ánh xạ về ba nhóm điều kiện người dùng nhìn thấy: bắt buộc
 * (`required`), độ dài (`minLength` / `maxLength`), và định dạng (`pattern`).
 */
export type FieldRule =
  | { kind: "required" }
  | { kind: "minLength"; value: number }
  | { kind: "maxLength"; value: number }
  | { kind: "pattern"; regex: RegExp; label: string };

export interface FieldValidationState {
  valid: boolean;
  /** null khi hợp lệ; ngược lại thông báo nêu rõ điều kiện field cần đạt (Req 13.2). */
  message: string | null;
  /** Rule đầu tiên bị vi phạm (để test/telemetry), null khi hợp lệ. */
  violated: FieldRule["kind"] | null;
}

/**
 * Kiểm tra một rule đơn có được thoả bởi `value` hay không.
 *
 * - `required`: giá trị sau khi trim phải khác rỗng.
 * - `minLength` / `maxLength`: độ dài chuỗi nằm trong khoảng cho phép.
 * - `pattern`: chuỗi khớp `regex`.
 */
function satisfiesRule(value: string, rule: FieldRule): boolean {
  switch (rule.kind) {
    case "required":
      return value.trim().length > 0;
    case "minLength":
      return value.length >= rule.value;
    case "maxLength":
      return value.length <= rule.value;
    case "pattern":
      return rule.regex.test(value);
  }
}

/**
 * Thông báo lỗi cụ thể theo từng loại rule, nêu rõ điều kiện field cần đạt
 * (Req 13.2): giá trị bắt buộc, độ dài cho phép, hoặc định dạng hợp lệ.
 */
function messageForRule(rule: FieldRule): string {
  switch (rule.kind) {
    case "required":
      return "Trường này là bắt buộc, vui lòng nhập giá trị.";
    case "minLength":
      return `Cần nhập tối thiểu ${rule.value} ký tự.`;
    case "maxLength":
      return `Chỉ cho phép tối đa ${rule.value} ký tự.`;
    case "pattern":
      return `Định dạng chưa hợp lệ, cần ${rule.label}.`;
  }
}

/**
 * Đánh giá `value` theo `rules` theo thứ tự; trả về đúng một trạng thái loại
 * trừ lẫn nhau (Req 13.1, 13.2, 13.3):
 * - hợp lệ khi `value` thoả toàn bộ `rules`: `{ valid: true, message: null, violated: null }`
 * - không hợp lệ khi vi phạm ít nhất một rule: `valid === false`, `message` là
 *   thông báo cụ thể của **rule đầu tiên bị vi phạm**, và `violated` khớp `kind`
 *   của rule đó.
 *
 * Không tồn tại input cho ra trạng thái vừa hợp lệ vừa có message. Hàm thuần:
 * không side-effect, không đọc storage.
 */
export function resolveFieldValidationState(
  value: string,
  rules: readonly FieldRule[],
): FieldValidationState {
  for (const rule of rules) {
    if (!satisfiesRule(value, rule)) {
      return {
        valid: false,
        message: messageForRule(rule),
        violated: rule.kind,
      };
    }
  }

  return { valid: true, message: null, violated: null };
}

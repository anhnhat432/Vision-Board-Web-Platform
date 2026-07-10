/**
 * Trạng thái trình bày cho thao tác lưu form.
 * Đúng một trong bốn giá trị loại trừ lẫn nhau (Req 13.4).
 */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Input đã tính cho `resolveSaveStatus`. Các trường được lớp UI phân giải sẵn:
 * timing (300ms hiển thị "đang lưu", tối thiểu 2s giữ "đã lưu") do lớp UI điều
 * khiển bằng timer — helper này chỉ ánh xạ trạng thái, không sở hữu timing.
 */
export interface SaveStatusInput {
  /** thao tác lưu đang diễn ra */
  saving: boolean;
  /** lần lưu gần nhất thất bại (Req 13.7) */
  errored: boolean;
  /** đang trong cửa sổ giữ "đã lưu" tối thiểu 2s (Req 13.5) */
  savedHoldActive: boolean;
}

/**
 * Phân giải trạng thái Save_Status.
 *
 * Trả về đúng một trạng thái loại trừ lẫn nhau (Req 13.4) theo thứ tự ưu tiên
 * `error > saving > saved > idle`:
 * - `error` khi `errored` (Req 13.7)
 * - ngược lại `saving` khi `saving`
 * - ngược lại `saved` khi `savedHoldActive` (còn trong cửa sổ giữ — Req 13.5)
 * - ngược lại `idle`
 *
 * Hàm thuần: chỉ ánh xạ từ input đã phân giải, không side effect, không đọc
 * storage; timing do lớp UI điều khiển.
 */
export function resolveSaveStatus(input: SaveStatusInput): SaveStatus {
  if (input.errored) {
    return "error";
  }

  if (input.saving) {
    return "saving";
  }

  if (input.savedHoldActive) {
    return "saved";
  }

  return "idle";
}

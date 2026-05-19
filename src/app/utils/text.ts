/**
 * Capitalize first character of each word in a Vietnamese name.
 * Examples:
 *   "nhật" → "Nhật"
 *   "anh nhật" → "Anh Nhật"
 *   "NGUYỄN VĂN A" → "Nguyễn Văn A"
 *   "" → ""
 */
export function capitalizeVietnameseName(value: string): string {
  if (!value) return value;
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase("vi") + word.slice(1))
    .join(" ");
}

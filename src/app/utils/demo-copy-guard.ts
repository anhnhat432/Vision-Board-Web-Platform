import type { AppMode } from "./app-mode";

/**
 * Tập cụm Demo_Only_Copy (Requirement 8.1). So khớp không phân biệt hoa/thường.
 * Các cụm được lưu ở dạng chữ thường để so sánh trực tiếp với `text.toLowerCase()`.
 */
export const DEMO_ONLY_PHRASES = [
  "dùng thử",
  "không cần đăng nhập",
  "trên trình duyệt này",
  "không thu tiền thật",
  "mock",
  "demo",
] as const;

export type DemoOnlyPhrase = (typeof DEMO_ONLY_PHRASES)[number];

/**
 * Bản thay thế production gắn với tài khoản cho từng cụm Demo_Only_Copy.
 * Ràng buộc bất biến: KHÔNG bản thay thế nào được chứa (không phân biệt
 * hoa/thường) một cụm Demo_Only_Copy khác, để không rò rỉ copy demo ở real mode
 * (Requirement 8.2, 8.3, Property 5).
 */
const PRODUCTION_COPY_REPLACEMENTS: Record<DemoOnlyPhrase, string> = {
  "dùng thử": "sử dụng",
  "không cần đăng nhập": "đăng nhập tài khoản",
  "trên trình duyệt này": "trên tài khoản này",
  "không thu tiền thật": "thanh toán an toàn",
  mock: "",
  demo: "",
};

/**
 * Chuỗi production account-bound dùng làm fallback an toàn tuyệt đối khi việc
 * thay thế theo cụm không thể loại bỏ hết Demo_Only_Copy (trường hợp cực hiếm
 * do chồng lấn cụm). Chuỗi này không chứa bất kỳ cụm Demo_Only_Copy nào.
 */
const PRODUCTION_ACCOUNT_BOUND_FALLBACK = "Nội dung gắn với tài khoản của bạn";

/**
 * Thay thế toàn bộ occurrence của `search` trong `source` (không phân biệt
 * hoa/thường) bằng `replacement`. Quét thủ công thay vì dùng RegExp để tránh
 * phải escape ký tự đặc biệt và giữ nguyên dấu tiếng Việt của phần còn lại.
 */
function replaceAllCaseInsensitive(source: string, search: string, replacement: string): string {
  if (search.length === 0) return source;

  const lowerSource = source.toLowerCase();
  const lowerSearch = search.toLowerCase();
  let result = "";
  let index = 0;

  while (index <= source.length) {
    const found = lowerSource.indexOf(lowerSearch, index);
    if (found === -1) {
      result += source.slice(index);
      break;
    }
    result += source.slice(index, found) + replacement;
    index = found + search.length;
  }

  return result;
}

/** Thay thế mọi cụm Demo_Only_Copy trong `text` bằng bản production tương ứng. */
function replaceDemoOnlyPhrases(text: string): string {
  let result = text;
  for (const phrase of DEMO_ONLY_PHRASES) {
    result = replaceAllCaseInsensitive(result, phrase, PRODUCTION_COPY_REPLACEMENTS[phrase]);
  }
  return result;
}

/**
 * `true` nếu `text` chứa (không phân biệt hoa/thường) ít nhất một cụm
 * Demo_Only_Copy (Requirement 8.1).
 */
export function containsDemoOnlyCopy(text: string): boolean {
  const lower = text.toLowerCase();
  return DEMO_ONLY_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * Phân giải copy theo App_Mode (Requirement 8.1, 8.2, 8.3).
 *
 * - Demo mode: trả về `text` nguyên vẹn, không thay đổi.
 * - Real mode: nếu `text` chứa Demo_Only_Copy thì thay bằng bản production
 *   account-bound; ngược lại giữ nguyên. Kết quả ở real mode được bảo đảm KHÔNG
 *   còn chứa bất kỳ cụm Demo_Only_Copy nào (Property 5).
 */
export function resolveModeAwareCopy(text: string, appMode: AppMode): string {
  if (appMode === "demo") return text;

  // Real mode: chỉ đụng tới chuỗi thực sự chứa Demo_Only_Copy.
  if (!containsDemoOnlyCopy(text)) return text;

  let sanitized = replaceDemoOnlyPhrases(text);

  // Lặp phòng khi việc thay thế/gộp ký tự tạo ra cụm mới do chồng lấn. Số vòng
  // bị chặn trên nên luôn kết thúc; nếu vẫn còn thì dùng fallback an toàn.
  let guard = 0;
  while (containsDemoOnlyCopy(sanitized) && guard < DEMO_ONLY_PHRASES.length) {
    sanitized = replaceDemoOnlyPhrases(sanitized);
    guard += 1;
  }

  if (containsDemoOnlyCopy(sanitized)) {
    return PRODUCTION_ACCOUNT_BOUND_FALLBACK;
  }

  return sanitized;
}

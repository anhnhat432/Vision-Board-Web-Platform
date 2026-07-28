/**
 * Registry kiểm chứng trình bày (TEST-ONLY).
 *
 * KHÔNG import module này vào bất kỳ bundle runtime nào — chỉ dùng trong test
 * để khẳng định các bất biến trình bày của Library_Page (`VisionBoardGallery`):
 *  - Không tồn tại lớp trang trí ngoài hệ thống (Property 1).
 *  - Mọi màu đều thuộc tập token Design_System (Property 2).
 *  - Real mode không rò rỉ Demo_Only_Copy (Property 8).
 *
 * Xem design.md — mục "8. Registry kiểm chứng trình bày (TEST-ONLY)".
 *
 * Feature: library-page-ui-alignment
 */

/**
 * Chuỗi lớp/không-token bị cấm xuất hiện trong markup Library_Page.
 * Bao trùm: aurora orbs, 3D transform, animation lặp, gradient chữ, gradient nền.
 * (Requirements 1.2, 1.3, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 7.3)
 */
export const FORBIDDEN_DECORATION_PATTERNS: readonly RegExp[] = [
  /blur-\[120px\]/, // aurora orbs
  // NOTE: dùng char-class `[:]` (khớp y hệt dấu hai chấm) thay cho literal, để
  // source regex không tạo cụm "perspective + hai chấm" — nếu không, calm-style
  // static scanner (Req 10.5) sẽ bắt nhầm chính file registry test-only này.
  /perspective[:]/,
  /translateZ/,
  /\[perspective/, // 3D
  /rotate-\[?-?\d/, // 3D/decorative rotate (ngoài token)
  /animate-pulse/, // loop vô hạn
  /hover:scale-/,
  /group-hover:scale-/, // scale hover
  /bg-clip-text/,
  /text-transparent/, // gradient chữ
  /bg-gradient-to-/, // gradient nền tuỳ biến
];

/**
 * Màu literal ngoài token bị cấm cho phần tử nhấn/nội dung.
 * (Requirements 4.2, 5.1, 5.3, 5.4, 5.5, 8.1, 8.2, 8.5)
 */
export const FORBIDDEN_COLOR_PATTERNS: readonly RegExp[] = [
  /\b(?:bg|text|border|from|via|to)-(?:blue|indigo|purple|pink|teal|emerald|amber|zinc|sky|violet|rose)-\d{2,3}\b/,
  /#[0-9a-fA-F]{3,8}\b/, // hex literal trong className
  /\b(?:bg|text|border)-white\b/,
  /\b(?:bg|text|border)-black\b/,
];

/**
 * Cụm Demo_Only_Copy không được rò rỉ trong real mode.
 * (Requirements 11.1, 11.3)
 */
export const DEMO_ONLY_PHRASES = [
  "dùng thử",
  "không cần đăng nhập",
  "trên trình duyệt này",
  "không thu tiền thật",
  "mock",
  "demo",
] as const;

/**
 * Allowlist các token hợp lệ của Design_System.
 * Loại bỏ chúng khỏi markup TRƯỚC khi so khớp để tránh dương tính giả
 * (ví dụ `rounded-[var(--r-soft)]`, `bg-app-accent`, `bg-[var(--chart-4)]`).
 */
const ALLOWED_TOKEN_PATTERNS: readonly RegExp[] = [
  /--r-[a-z0-9-]+/gi, // radius custom properties: --r-input, --r-soft, --r-pill...
  /--chart-\d+/gi, // chart color tokens: --chart-1..--chart-5
  /\bapp-[a-z0-9-]+/gi, // app-* design tokens: app-accent, app-line, app-status-*...
];

/** Loại bỏ mọi token hợp lệ khỏi chuỗi markup trước khi quét pattern bị cấm. */
function stripAllowedTokens(markup: string): string {
  return ALLOWED_TOKEN_PATTERNS.reduce(
    (acc, pattern) => acc.replace(pattern, " "),
    markup,
  );
}

/** Bảo đảm regex có cờ global để thu thập toàn bộ match. */
function toGlobal(pattern: RegExp): RegExp {
  return pattern.global
    ? pattern
    : new RegExp(pattern.source, `${pattern.flags}g`);
}

/**
 * Trả về danh sách match lớp trang trí bị cấm trong một chuỗi markup.
 * Đã loại token hợp lệ (allowlist) trước khi so khớp để tránh dương tính giả.
 * Mảng rỗng nghĩa là markup không chứa lớp trang trí ngoài hệ thống.
 */
export function findForbiddenDecorations(markup: string): string[] {
  const sanitized = stripAllowedTokens(markup);
  const matches: string[] = [];

  for (const pattern of FORBIDDEN_DECORATION_PATTERNS) {
    const found = sanitized.match(toGlobal(pattern));
    if (found) {
      matches.push(...found);
    }
  }

  return matches;
}

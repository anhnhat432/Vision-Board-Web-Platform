/**
 * Property-Based Test — Property 10: Thời lượng transition dùng chung trong [150ms, 500ms].
 *
 * Feature: global-ui-upgrade, Property 10: Thời lượng transition dùng chung trong [150ms, 500ms].
 *
 * "For any token thời lượng --duration-* dùng cho transition/animation dùng chung,
 *  giá trị resolve nằm trong khoảng [150ms, 500ms]."
 *
 * Validates: Requirements 8.2
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - Nguồn token: `src/styles/theme.css` (nơi khai báo motion scale `--duration-*`
 *     và `--ease-*`). Tái sử dụng `token-parser.ts` (`parseTokens` + `resolveToken`)
 *     — cùng bộ helper với các property khác — parse khối `:root` của theme.css ở
 *     light mode (thời lượng motion là giá trị không đổi theo mode).
 *   - Với mỗi token `--duration-*`: resolve về literal cuối cùng, parse thành số ms
 *     và kiểm 150 ≤ value ≤ 500.
 *
 * Dải [150ms, 500ms] xuất phát từ Requirement 8.2: transition dùng chung phải đủ
 * nhanh để không gây trì hoãn nhưng đủ chậm để cảm nhận được là chuyển động mượt.
 *
 * Generator: chọn một duration token BẤT KỲ từ tập `--duration-*` phát hiện được
 * trong theme.css, `fc.assert(..., { numRuns: 100 })`. Test thuần — chỉ I/O đọc
 * file một lần ở module scope.
 *
 * Ý nghĩa thất bại: nếu test fail, dấu hiệu một token `--duration-*` bị đặt ra
 * ngoài dải [150ms, 500ms] (vi phạm Requirement 8.2) — cần chỉnh lại giá trị trong
 * theme.css, giữ nguyên tên token.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseTokens, resolveToken, type TokenSet } from "./token-parser";

const PROPERTY_TAG =
  "Feature: global-ui-upgrade, Property 10: Thời lượng transition dùng chung trong [150ms, 500ms]";

/** Cận dưới/cận trên của thời lượng transition dùng chung (Requirement 8.2). */
const MIN_DURATION_MS = 150;
const MAX_DURATION_MS = 500;

// ─────────────────────────────────────────────────────────────
// Chuẩn bị dữ liệu (đọc một lần ở module scope — pure, test-time)
// ─────────────────────────────────────────────────────────────

/**
 * Motion scale (`--duration-*`) được khai báo trong `theme.css` (không phải
 * `tokens.css`), nên đọc trực tiếp file đó rồi parse.
 *
 * theme.css mở đầu bằng at-statement `@custom-variant dark (&:is(.dark *));`.
 * Vì statement này không có `{...}` riêng, nó bị `parseTokens` gộp vào selector
 * của khối `:root` liền sau — chuỗi selector khi đó chứa ".dark" nên khối `:root`
 * bị hiểu nhầm là dark override và bị bỏ ở light mode. Loại bỏ mọi at-statement
 * đứng độc lập (kết thúc bằng `;`, không phải khối `{}`) trước khi parse để khối
 * `:root` được phân định đúng. (Cùng pattern với global-property-9-line-height.)
 */
const rawThemeCss: string = readFileSync(resolve(process.cwd(), "src/styles/theme.css"), "utf8");
const themeCss: string = rawThemeCss.replace(/@[a-z-]+[^;{}]*;/gi, "");
const tokenSet: TokenSet = parseTokens(themeCss, { mode: "light" });

/** Mọi tên token thời lượng `--duration-*` phát hiện được trong theme.css. */
const DURATION_TOKENS: string[] = [...tokenSet.keys()]
  .filter((name) => name.startsWith("--duration-"))
  .sort();

/**
 * Resolve token thời lượng về số mili-giây. Trả NaN nếu không phân giải được.
 * Chấp nhận đơn vị `ms` (ví dụ `240ms`) hoặc `s` (ví dụ `0.24s`).
 */
function resolveDurationMs(name: string): number {
  const resolved = resolveToken(name, tokenSet);
  if (!resolved.isNonEmpty) {
    return Number.NaN;
  }
  const value = resolved.resolvedValue.trim();
  const match = /^(-?[\d.]+)\s*(ms|s)$/i.exec(value);
  if (!match) {
    return Number.NaN;
  }
  const magnitude = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  return unit === "s" ? magnitude * 1000 : magnitude;
}

// ─────────────────────────────────────────────────────────────
// Property 10
// ─────────────────────────────────────────────────────────────

describe("Property 10 — Thời lượng transition dùng chung trong [150ms, 500ms] (task 3.5)", () => {
  it("theme.css có khai báo ít nhất một token --duration-* (sanity)", () => {
    expect(DURATION_TOKENS.length, "không tìm thấy token --duration-* nào trong theme.css").toBeGreaterThan(0);
  });

  it(`${PROPERTY_TAG} — mọi --duration-* resolve trong [${MIN_DURATION_MS}ms, ${MAX_DURATION_MS}ms]`, () => {
    fc.assert(
      fc.property(fc.constantFrom(...DURATION_TOKENS), (name) => {
        // Bất biến (Req 8.2): thời lượng transition dùng chung phải nằm trong
        // dải [150ms, 500ms].
        const value = resolveDurationMs(name);
        expect(Number.isNaN(value), `${name} không phân giải được về giá trị thời lượng`).toBe(false);
        expect(value).toBeGreaterThanOrEqual(MIN_DURATION_MS);
        expect(value).toBeLessThanOrEqual(MAX_DURATION_MS);
      }),
      { numRuns: 100 },
    );
  });

  it("liệt kê tường minh thời lượng từng --duration-* — deterministic enumeration", () => {
    const violations: string[] = [];
    for (const name of DURATION_TOKENS) {
      const value = resolveDurationMs(name);
      if (Number.isNaN(value) || value < MIN_DURATION_MS || value > MAX_DURATION_MS) {
        violations.push(`${name} = ${value}ms (ngoài [${MIN_DURATION_MS}, ${MAX_DURATION_MS}])`);
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Có ${violations.length} token --duration-* vi phạm dải [${MIN_DURATION_MS}ms, ${MAX_DURATION_MS}ms] (Req 8.2):\n  - ${violations.join("\n  - ")}`,
      );
    }
  });
});

/**
 * Property-Based Test — Property 8: Thang typography đơn điệu.
 *
 * Feature: global-ui-upgrade, Property 8: Thang typography đơn điệu.
 *
 * "For any cặp bậc typography liền kề (tier_n, tier_n+1) theo thứ tự
 *  xs → sm → base → lg → xl → 2xl → 3xl → 4xl → 5xl → display,
 *  giá trị --text-<tier_n> ≤ --text-<tier_n+1> (thang không đảo bậc)."
 *
 * Validates: Requirements 3.1
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - Nguồn token: `src/styles/theme.css` (nơi khai báo thang typography
 *     `--text-*`). Tái sử dụng `token-parser.ts` (`parseTokens` + `resolveToken`)
 *     — cùng bộ helper với các property khác — parse khối `:root` của theme.css
 *     ở light mode (kích thước font là giá trị không đổi theo mode).
 *   - Với mỗi cặp bậc liền kề: resolve `--text-<tier_n>` và `--text-<tier_n+1>`
 *     về literal cuối cùng, parse thành số (mọi bậc dùng chung đơn vị `rem`) rồi
 *     kiểm value(tier_n) ≤ value(tier_n+1).
 *
 * theme.css mở đầu bằng at-statement `@custom-variant dark (&:is(.dark *));`.
 * Vì statement này không có `{...}` riêng, nó bị `parseTokens` gộp vào selector
 * của khối `:root` liền sau — chuỗi selector khi đó chứa ".dark" nên khối `:root`
 * bị hiểu nhầm là dark override và bị bỏ ở light mode. Loại bỏ mọi at-statement
 * đứng độc lập (kết thúc bằng `;`, không phải khối `{}`) trước khi parse để khối
 * `:root` được phân định đúng (cùng pattern với Property 9).
 *
 * Generator: chọn một chỉ số cặp liền kề BẤT KỲ trong thang,
 * `fc.assert(..., { numRuns: 100 })`. Test thuần — chỉ I/O đọc file một lần ở
 * module scope.
 *
 * Ý nghĩa thất bại: nếu test fail, dấu hiệu thang typography bị đảo bậc (một bậc
 * lớn hơn có giá trị nhỏ hơn bậc kề dưới) — vi phạm Requirement 3.1, cần chỉnh
 * lại giá trị trong theme.css, giữ nguyên tên token.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseTokens, resolveToken, type TokenSet } from "./token-parser";

const PROPERTY_TAG = "Feature: global-ui-upgrade, Property 8: Thang typography đơn điệu";

/**
 * Thứ tự bậc typography từ nhỏ đến lớn (Requirement 3.1). Thang phải đơn điệu
 * không giảm theo đúng thứ tự này.
 */
const TYPE_TIERS = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "display"] as const;
type TypeTier = (typeof TYPE_TIERS)[number];

// ─────────────────────────────────────────────────────────────
// Chuẩn bị dữ liệu (đọc một lần ở module scope — pure, test-time)
// ─────────────────────────────────────────────────────────────

const rawThemeCss: string = readFileSync(resolve(process.cwd(), "src/styles/theme.css"), "utf8");
const themeCss: string = rawThemeCss.replace(/@[a-z-]+[^;{}]*;/gi, "");
const tokenSet: TokenSet = parseTokens(themeCss, { mode: "light" });

/** Tên token kích thước font của một bậc typography. */
function sizeTokenName(tier: TypeTier): string {
  return `--text-${tier}`;
}

/** Resolve token kích thước về số (đơn vị rem, đồng nhất toàn thang). NaN nếu không phân giải được. */
function resolveSize(tier: TypeTier): number {
  const name = sizeTokenName(tier);
  const resolved = resolveToken(name, tokenSet);
  if (!resolved.isNonEmpty) {
    return Number.NaN;
  }
  return Number.parseFloat(resolved.resolvedValue);
}

// ─────────────────────────────────────────────────────────────
// Property 8
// ─────────────────────────────────────────────────────────────

describe("Property 8 — Thang typography đơn điệu (task 3.2)", () => {
  it("theme.css có khai báo token kích thước cho mọi bậc typography (sanity)", () => {
    for (const tier of TYPE_TIERS) {
      const name = sizeTokenName(tier);
      expect(tokenSet.has(name), `thiếu token ${name} trong theme.css`).toBe(true);
    }
  });

  it(`${PROPERTY_TAG} — mọi cặp bậc liền kề không đảo (value(tier_n) ≤ value(tier_n+1))`, () => {
    // Generator: chọn chỉ số cặp liền kề bất kỳ trong [0, TYPE_TIERS.length - 2].
    fc.assert(
      fc.property(fc.integer({ min: 0, max: TYPE_TIERS.length - 2 }), (index) => {
        const lower = TYPE_TIERS[index];
        const upper = TYPE_TIERS[index + 1];
        const lowerValue = resolveSize(lower);
        const upperValue = resolveSize(upper);

        expect(Number.isNaN(lowerValue), `${sizeTokenName(lower)} không phân giải được`).toBe(false);
        expect(Number.isNaN(upperValue), `${sizeTokenName(upper)} không phân giải được`).toBe(false);

        // Bất biến (Req 3.1): thang không đảo bậc — bậc kề trên ≥ bậc kề dưới.
        expect(upperValue).toBeGreaterThanOrEqual(lowerValue);
      }),
      { numRuns: 100 },
    );
  });

  it("liệt kê tường minh mọi cặp bậc liền kề — deterministic enumeration", () => {
    const violations: string[] = [];
    for (let i = 0; i < TYPE_TIERS.length - 1; i++) {
      const lower = TYPE_TIERS[i];
      const upper = TYPE_TIERS[i + 1];
      const lowerValue = resolveSize(lower);
      const upperValue = resolveSize(upper);
      if (Number.isNaN(lowerValue) || Number.isNaN(upperValue) || upperValue < lowerValue) {
        violations.push(`${sizeTokenName(lower)} (${lowerValue}) > ${sizeTokenName(upper)} (${upperValue})`);
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Có ${violations.length} cặp bậc typography đảo thứ tự (Req 3.1):\n  - ${violations.join("\n  - ")}`,
      );
    }
  });
});

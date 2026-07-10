/**
 * Property-Based Test — Property 9: Line-height văn bản nội dung ≥ 1.45.
 *
 * Feature: global-ui-upgrade, Property 9: Line-height văn bản nội dung ≥ 1.45.
 *
 * "For any bậc typography dành cho văn bản nội dung (body: base, sm), giá trị
 *  --text-<tier>--line-height ≥ 1.45 (để dấu tiếng Việt không chồng lấn)."
 *
 * Validates: Requirements 3.2
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - Nguồn token: `src/styles/theme.css` (nơi khai báo thang typography
 *     `--text-*` và các token line-height `--text-*--line-height`). Tái sử dụng
 *     `token-parser.ts` (`parseTokens` + `resolveToken`) — cùng bộ helper với các
 *     property khác — parse khối `:root` của theme.css ở light mode (line-height
 *     là giá trị không đổi theo mode).
 *   - Với mỗi body tier ∈ {base, sm}: resolve `--text-<tier>--line-height` về
 *     literal cuối cùng, parse thành số và kiểm ≥ 1.45.
 *
 * Ngưỡng 1.45 xuất phát từ Requirement 3.2: dấu tiếng Việt (dấu nặng/sắc chồng
 * lên nguyên âm có mũ) cần đủ không gian dọc để không chồng lấn dòng kế tiếp.
 *
 * Generator: chọn một body tier BẤT KỲ từ {base, sm}, `fc.assert(..., { numRuns: 100 })`.
 * Test thuần — chỉ I/O đọc file một lần ở module scope.
 *
 * Ý nghĩa thất bại: nếu test fail, dấu hiệu một token line-height của body tier
 * bị hạ xuống dưới 1.45 (vi phạm Requirement 3.2) — cần nâng lại giá trị trong
 * theme.css, giữ nguyên tên token.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseTokens, resolveToken, type TokenSet } from "./token-parser";

const PROPERTY_TAG = "Feature: global-ui-upgrade, Property 9: Line-height văn bản nội dung ≥ 1.45";

/** Ngưỡng line-height tối thiểu cho văn bản nội dung (Requirement 3.2). */
const MIN_BODY_LINE_HEIGHT = 1.45;

/** Các bậc typography dành cho văn bản nội dung (body). */
const BODY_TIERS = ["base", "sm"] as const;
type BodyTier = (typeof BODY_TIERS)[number];

// ─────────────────────────────────────────────────────────────
// Chuẩn bị dữ liệu (đọc một lần ở module scope — pure, test-time)
// ─────────────────────────────────────────────────────────────

/**
 * Thang typography (`--text-*`) và line-height tokens được khai báo trong
 * `theme.css` (không phải `tokens.css`), nên đọc trực tiếp file đó rồi parse.
 *
 * theme.css mở đầu bằng at-statement `@custom-variant dark (&:is(.dark *));`.
 * Vì statement này không có `{...}` riêng, nó bị `parseTokens` gộp vào selector
 * của khối `:root` liền sau — chuỗi selector khi đó chứa ".dark" nên khối `:root`
 * bị hiểu nhầm là dark override và bị bỏ ở light mode. Loại bỏ mọi at-statement
 * đứng độc lập (kết thúc bằng `;`, không phải khối `{}`) trước khi parse để khối
 * `:root` được phân định đúng.
 */
const rawThemeCss: string = readFileSync(resolve(process.cwd(), "src/styles/theme.css"), "utf8");
const themeCss: string = rawThemeCss.replace(/@[a-z-]+[^;{}]*;/gi, "");
const tokenSet: TokenSet = parseTokens(themeCss, { mode: "light" });

/** Tên token line-height của một body tier. */
function lineHeightTokenName(tier: BodyTier): string {
  return `--text-${tier}--line-height`;
}

/** Resolve token line-height về số. Trả NaN nếu không phân giải được. */
function resolveLineHeight(tier: BodyTier): number {
  const name = lineHeightTokenName(tier);
  const resolved = resolveToken(name, tokenSet);
  if (!resolved.isNonEmpty) {
    return Number.NaN;
  }
  return Number.parseFloat(resolved.resolvedValue);
}

// ─────────────────────────────────────────────────────────────
// Property 9
// ─────────────────────────────────────────────────────────────

describe("Property 9 — Line-height văn bản nội dung ≥ 1.45 (task 3.3)", () => {
  it("theme.css có khai báo token line-height cho mọi body tier (sanity)", () => {
    for (const tier of BODY_TIERS) {
      const name = lineHeightTokenName(tier);
      expect(tokenSet.has(name), `thiếu token ${name} trong theme.css`).toBe(true);
    }
  });

  it(`${PROPERTY_TAG} — mọi body tier có line-height ≥ ${MIN_BODY_LINE_HEIGHT}`, () => {
    fc.assert(
      fc.property(fc.constantFrom<BodyTier>(...BODY_TIERS), (tier) => {
        // Bất biến (Req 3.2): line-height của văn bản nội dung ≥ 1.45 để dấu
        // tiếng Việt không chồng lấn.
        const value = resolveLineHeight(tier);
        expect(Number.isNaN(value), `${lineHeightTokenName(tier)} không phân giải được`).toBe(false);
        expect(value).toBeGreaterThanOrEqual(MIN_BODY_LINE_HEIGHT);
      }),
      { numRuns: 100 },
    );
  });

  it("liệt kê tường minh line-height từng body tier — deterministic enumeration", () => {
    const violations: string[] = [];
    for (const tier of BODY_TIERS) {
      const value = resolveLineHeight(tier);
      if (Number.isNaN(value) || value < MIN_BODY_LINE_HEIGHT) {
        violations.push(`${lineHeightTokenName(tier)} = ${value} (< ${MIN_BODY_LINE_HEIGHT})`);
      }
    }
    if (violations.length > 0) {
      throw new Error(
        `Có ${violations.length} body tier vi phạm ngưỡng line-height ≥ ${MIN_BODY_LINE_HEIGHT} (Req 3.2):\n  - ${violations.join("\n  - ")}`,
      );
    }
  });
});

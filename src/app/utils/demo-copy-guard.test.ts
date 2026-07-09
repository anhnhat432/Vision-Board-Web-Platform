/**
 * Property-Based Test — Property 5: Copy theo mode không rò rỉ Demo_Only_Copy
 * trong real mode (task 2.8).
 *
 * "For any chuỗi `text`, khi `appMode === "real"` thì
 *  `resolveModeAwareCopy(text, "real")` không chứa (không phân biệt hoa/thường)
 *  bất kỳ cụm nào trong `DEMO_ONLY_PHRASES`; khi `appMode === "demo"` thì
 *  `resolveModeAwareCopy(text, "demo")` trả về chuỗi gốc không đổi."
 *
 * Validates: Requirements 8.1, 8.2
 *
 * Generator: sinh chuỗi bất kỳ, đồng thời chèn ngẫu nhiên các cụm
 * `DEMO_ONLY_PHRASES` (với casing ngẫu nhiên) xen kẽ những đoạn văn bản tự do
 * để ép input đi vào nhánh sanitize của real mode. `numRuns: 100`.
 */

// Feature: core-flow-ui-upgrade, Property 5

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  containsDemoOnlyCopy,
  DEMO_ONLY_PHRASES,
  resolveModeAwareCopy,
} from "./demo-copy-guard";

/**
 * Sinh một cụm Demo_Only_Copy với casing ngẫu nhiên (upper/lower/nguyên bản)
 * để kiểm chứng ràng buộc so khớp không phân biệt hoa/thường.
 */
const demoPhraseArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom(...DEMO_ONLY_PHRASES),
    fc.constantFrom<"lower" | "upper" | "asis">("lower", "upper", "asis"),
  )
  .map(([phrase, mode]) => {
    if (mode === "upper") return phrase.toUpperCase();
    if (mode === "lower") return phrase.toLowerCase();
    return phrase;
  });

/**
 * Sinh chuỗi hỗn hợp: nối các đoạn văn bản tự do với cụm demo được chèn ngẫu
 * nhiên. Nhiều mẫu sẽ chứa Demo_Only_Copy (buộc real mode phải sanitize), một
 * số mẫu không chứa (kiểm tra nhánh giữ nguyên).
 */
const mixedTextArb: fc.Arbitrary<string> = fc
  .array(fc.oneof(fc.string(), demoPhraseArb), { minLength: 0, maxLength: 8 })
  .map((parts) => parts.join(" "));

describe("Property 5 — Copy theo mode không rò rỉ Demo_Only_Copy trong real mode (task 2.8)", () => {
  it("real mode không rò rỉ Demo_Only_Copy; demo mode giữ nguyên chuỗi gốc", () => {
    fc.assert(
      fc.property(mixedTextArb, (text) => {
        // Real mode: kết quả KHÔNG chứa bất kỳ cụm Demo_Only_Copy nào.
        const real = resolveModeAwareCopy(text, "real");
        expect(containsDemoOnlyCopy(real)).toBe(false);

        // Demo mode: trả về chuỗi gốc, không đổi.
        const demo = resolveModeAwareCopy(text, "demo");
        expect(demo).toBe(text);
      }),
      { numRuns: 100 },
    );
  });
});

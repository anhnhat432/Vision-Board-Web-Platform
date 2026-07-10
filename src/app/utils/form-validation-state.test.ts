/**
 * Property-Based Test — Property 7: Trạng thái hợp lệ của field loại trừ lẫn
 * nhau và thông báo nêu đúng điều kiện (task 15.2).
 *
 * "For any `value` (kể cả rỗng / whitespace / quá dài) và tổ hợp `rules` bất kỳ,
 *  `resolveFieldValidationState`:
 *   - trả về đúng MỘT trạng thái loại trừ lẫn nhau giữa hợp lệ và thông báo:
 *     `valid === true` ⇔ `message === null` ⇔ `violated === null` (Req 13.1);
 *   - khi không hợp lệ, `violated` khớp `kind` của **rule đầu tiên bị vi phạm**
 *     theo thứ tự duyệt, và `message` là thông báo cụ thể của rule đó, nêu rõ
 *     điều kiện field cần đạt (Req 13.2);
 *   - khi hợp lệ, mọi rule đều được thoả (Req 13.3)."
 *
 * Validates: Requirements 13.1, 13.2, 13.3
 *
 * Generator: fast-check sinh `value` phủ các biên (rỗng, whitespace, chuỗi dài)
 * và tổ hợp `rules` ngẫu nhiên trên toàn bộ bốn loại rule, `{ numRuns: 100 }`.
 * Pure test — không render DOM, không import React, không đọc storage, không
 * sửa product code.
 */

// Feature: core-flow-ui-upgrade, Property 7

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  type FieldRule,
  resolveFieldValidationState,
} from "./form-validation-state";

const PROPERTY_TAG =
  "Feature: core-flow-ui-upgrade, Property 7: Trạng thái hợp lệ của field loại trừ lẫn nhau và thông báo nêu đúng điều kiện";

/**
 * Generator sinh `value` phủ toàn không gian đầu vào và các biên cần thử:
 * chuỗi tuỳ ý, chuỗi rỗng, chuỗi chỉ whitespace, và chuỗi rất dài.
 */
const valueArb: fc.Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.constant(""),
  fc.constantFrom(" ", "   ", "\t", "\n", " \t \n "),
  fc.string({ minLength: 200, maxLength: 400 }),
);

/**
 * Generator sinh một `FieldRule` bất kỳ trên cả bốn loại loại trừ lẫn nhau.
 */
const ruleArb: fc.Arbitrary<FieldRule> = fc.oneof(
  fc.constant<FieldRule>({ kind: "required" }),
  fc
    .integer({ min: 0, max: 50 })
    .map<FieldRule>((value) => ({ kind: "minLength", value })),
  fc
    .integer({ min: 0, max: 50 })
    .map<FieldRule>((value) => ({ kind: "maxLength", value })),
  fc.constantFrom<FieldRule>(
    { kind: "pattern", regex: /^\d+$/, label: "chỉ chứa chữ số" },
    { kind: "pattern", regex: /@/, label: "chứa ký tự @" },
    { kind: "pattern", regex: /^[a-z]+$/i, label: "chỉ chứa chữ cái" },
  ),
);

const rulesArb: fc.Arbitrary<readonly FieldRule[]> = fc.array(ruleArb, {
  maxLength: 6,
});

/**
 * Mô hình tham chiếu độc lập: một rule được thoả hay không, viết tách khỏi
 * implementation để property so khớp là kiểm chứng thực sự.
 */
function satisfies(value: string, rule: FieldRule): boolean {
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

/** Rule đầu tiên bị vi phạm theo thứ tự duyệt, hoặc -1 nếu tất cả đều thoả. */
function firstViolatedIndex(
  value: string,
  rules: readonly FieldRule[],
): number {
  return rules.findIndex((rule) => !satisfies(value, rule));
}

describe("Property 7 — resolveFieldValidationState (task 15.2)", () => {
  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(valueArb, rulesArb, (value, rules) => {
        const result = resolveFieldValidationState(value, rules);
        const violatedIndex = firstViolatedIndex(value, rules);

        // Req 13.1 & 13.3: loại trừ lẫn nhau valid ↔ message ↔ violated.
        if (violatedIndex === -1) {
          // Mọi rule đều thoả → hợp lệ, không message, không violated.
          expect(result.valid).toBe(true);
          expect(result.message).toBeNull();
          expect(result.violated).toBeNull();
        } else {
          // Có rule bị vi phạm → không hợp lệ, có message, có violated.
          expect(result.valid).toBe(false);
          expect(result.message).not.toBeNull();
          expect(result.violated).not.toBeNull();

          // Req 13.2: violated khớp rule đầu tiên bị vi phạm, message nêu rõ
          // điều kiện của đúng rule đó.
          const firstViolatedRule = rules[violatedIndex];
          expect(result.violated).toBe(firstViolatedRule.kind);
        }

        // Bất biến loại trừ lẫn nhau tổng quát: valid ⇔ message === null.
        expect(result.valid).toBe(result.message === null);
        expect(result.valid).toBe(result.violated === null);
      }),
      { numRuns: 100 },
    );
  });
});

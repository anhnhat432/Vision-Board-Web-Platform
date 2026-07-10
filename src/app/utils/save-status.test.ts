/**
 * Property-Based Test — Property 8: Trạng thái lưu form phân giải duy nhất theo
 * đúng thứ tự ưu tiên (task 15.4).
 *
 * "For any `SaveStatusInput` bất kỳ, `resolveSaveStatus` trả về đúng MỘT trạng
 *  thái loại trừ lẫn nhau trong tập {idle, saving, saved, error} (Req 13.4)
 *  theo thứ tự ưu tiên `error > saving > saved > idle`:
 *    error khi errored (Req 13.7);
 *    ngược lại saving khi saving;
 *    ngược lại saved khi savedHoldActive (còn trong cửa sổ giữ tối thiểu 2s — Req 13.5);
 *    ngược lại idle."
 *
 * Validates: Requirements 13.4, 13.5
 *
 * Generator: fast-check sinh `SaveStatusInput` ngẫu nhiên trên toàn không gian
 * input (mọi tổ hợp saving × errored × savedHoldActive), `{ numRuns: 100 }`.
 * Pure test — không render DOM, không import React, không dùng timer, không
 * sửa product code.
 */

// Feature: core-flow-ui-upgrade, Property 8

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  resolveSaveStatus,
  type SaveStatus,
  type SaveStatusInput,
} from "./save-status";

const PROPERTY_TAG =
  "Feature: core-flow-ui-upgrade, Property 8: Trạng thái lưu form phân giải duy nhất theo đúng thứ tự ưu tiên";

const VALID_STATUSES: ReadonlyArray<SaveStatus> = [
  "idle",
  "saving",
  "saved",
  "error",
];

/**
 * Generator sinh toàn bộ không gian `SaveStatusInput`. Dùng `fc.boolean` cho
 * mỗi cờ để chạm mọi nhánh phân giải với `numRuns: 100`.
 */
const saveStatusInputArb: fc.Arbitrary<SaveStatusInput> = fc.record({
  saving: fc.boolean(),
  errored: fc.boolean(),
  savedHoldActive: fc.boolean(),
});

/**
 * Mô hình tham chiếu độc lập cho trạng thái mong đợi theo acceptance criteria.
 * Viết tách khỏi implementation để property so khớp là kiểm chứng thực sự.
 */
function expectedStatus(input: SaveStatusInput): SaveStatus {
  // Ưu tiên: error > saving > saved > idle.
  if (input.errored) return "error"; // Req 13.7
  if (input.saving) return "saving";
  if (input.savedHoldActive) return "saved"; // Req 13.5
  return "idle";
}

describe("Property 8 — resolveSaveStatus (task 15.4)", () => {
  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(saveStatusInputArb, (input) => {
        const result = resolveSaveStatus(input);

        // Req 13.4: đúng một trạng thái loại trừ lẫn nhau, hợp lệ.
        expect(VALID_STATUSES).toContain(result);

        // Req 13.4, 13.5: đúng thứ tự ưu tiên error > saving > saved > idle.
        expect(result).toBe(expectedStatus(input));
      }),
      { numRuns: 100 },
    );
  });
});

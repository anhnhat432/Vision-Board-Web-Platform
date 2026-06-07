/**
 * Property-Based Test — Property 6: Ánh xạ Sync_State → status token là đơn ánh
 * (task 5.2).
 *
 * "For any hai giá trị `Sync_State` khác nhau trong {synced, syncing, offline,
 *  error}, status token được ánh xạ tới là khác nhau; do đó ảnh của ánh xạ gồm
 *  đúng 4 token màu phân biệt, không trùng lặp."
 *
 * Validates: Requirements 8.3
 *
 * Nguồn dữ liệu:
 *   - `SYNC_STATE_TOKEN` thực (record 4 giá trị) export từ
 *     `src/features/plan12week/pages/12WeekSystem/helpers.ts` (task 5.1).
 *   - KHÔNG tự định nghĩa lại token mapping trong file test — kiểm chứng đối tượng
 *     thật để bất kỳ thay đổi nào trong helpers đều được phát hiện.
 *
 * Generator: chọn cặp `Sync_State` BẤT KỲ (`fc.constantFrom(...)`), `numRuns ≥ 100`.
 *
 * Mô hình kiểm chứng:
 *   1) Đơn ánh (injective): a ≠ b ⇒ SYNC_STATE_TOKEN[a] ≠ SYNC_STATE_TOKEN[b].
 *   2) |ảnh| = 4: tập giá trị token có đúng 4 phần tử phân biệt.
 *   3) Mỗi token là chuỗi non-empty (sanity, tăng độ tin cậy của ánh xạ).
 *
 * Pure test — không phụ thuộc DOM/render, không I/O ngoài import module.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  SYNC_STATE_TOKEN,
  type SyncState,
} from "@/features/plan12week/pages/12WeekSystem/helpers";

const PROPERTY_TAG =
  "Feature: ux-ui-upgrade, Property 6: Ánh xạ Sync_State → status token là đơn ánh";

/** 4 giá trị Sync_State được khai báo trong design (Section 3 — Sync State Indicator). */
const SYNC_STATES: ReadonlyArray<SyncState> = ["synced", "syncing", "offline", "error"];

describe("Property 6 — Ánh xạ Sync_State → status token là đơn ánh (task 5.2)", () => {
  it("SYNC_STATE_TOKEN có đầy đủ 4 khóa và mỗi token là chuỗi non-empty", () => {
    // Sanity: domain đúng tập 4 nhãn theo design.
    expect(new Set(Object.keys(SYNC_STATE_TOKEN))).toEqual(new Set(SYNC_STATES));
    for (const state of SYNC_STATES) {
      const token = SYNC_STATE_TOKEN[state];
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    }
  });

  it("|ảnh của ánh xạ| = 4 (4 token màu phân biệt, không trùng lặp)", () => {
    const image = new Set(Object.values(SYNC_STATE_TOKEN));
    expect(image.size).toBe(4);
  });

  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(
        fc.constantFrom<SyncState>(...SYNC_STATES),
        fc.constantFrom<SyncState>(...SYNC_STATES),
        (a, b) => {
          // Đơn ánh: hai Sync_State khác nhau ⇒ hai token khác nhau (Req 8.3).
          if (a !== b) {
            expect(SYNC_STATE_TOKEN[a]).not.toBe(SYNC_STATE_TOKEN[b]);
          } else {
            // Ràng buộc xác định: cùng input ⇒ cùng output (deterministic).
            expect(SYNC_STATE_TOKEN[a]).toBe(SYNC_STATE_TOKEN[b]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

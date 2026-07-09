/**
 * Property-Based Test — Property 2: Sync indicator phân giải một trạng thái
 * duy nhất với đúng thứ tự ưu tiên (task 2.4).
 *
 * "For any `SyncIndicatorInput` bất kỳ, `resolveSyncIndicatorStatus`:
 *  - trả về `null` khi `appMode === "demo"` HOẶC `signedIn === false`
 *    (Sync_Status_Indicator không hiển thị — Req 6.8);
 *  - ngược lại trả về đúng MỘT trạng thái loại trừ lẫn nhau trong tập
 *    {synced, syncing, offline, error} (Req 6.1) theo thứ tự ưu tiên
 *    `offline > error > syncing > synced`:
 *      offline khi networkStatus === "offline" (Req 6.4);
 *      ngược lại error khi timedOutOrErrored (Req 6.5);
 *      ngược lại syncing khi syncing (Req 6.2);
 *      ngược lại synced (Req 6.3)."
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.8
 *
 * Generator: fast-check sinh `SyncIndicatorInput` ngẫu nhiên trên toàn không
 * gian input (mọi tổ hợp appMode × signedIn × networkStatus × syncing ×
 * timedOutOrErrored × lastSyncSucceeded), `{ numRuns: 100 }`. Pure test —
 * không render DOM, không import React, không gọi sync, không sửa product code.
 */

// Feature: core-flow-ui-upgrade, Property 2

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  resolveSyncIndicatorStatus,
  type SyncIndicatorInput,
  type SyncIndicatorStatus,
} from "./sync-indicator-status";

const PROPERTY_TAG =
  "Feature: core-flow-ui-upgrade, Property 2: Sync indicator phân giải một trạng thái duy nhất với đúng thứ tự ưu tiên";

const VALID_STATUSES: ReadonlyArray<SyncIndicatorStatus> = [
  "synced",
  "syncing",
  "offline",
  "error",
];

/**
 * Generator sinh toàn bộ không gian `SyncIndicatorInput`. Dùng `fc.constantFrom`
 * cho các trường union/boolean để chạm mọi nhánh phân giải với `numRuns: 100`.
 */
const syncIndicatorInputArb: fc.Arbitrary<SyncIndicatorInput> = fc.record({
  appMode: fc.constantFrom<SyncIndicatorInput["appMode"]>("real", "demo"),
  signedIn: fc.boolean(),
  networkStatus: fc.constantFrom<SyncIndicatorInput["networkStatus"]>(
    "online",
    "offline",
    "unknown",
  ),
  syncing: fc.boolean(),
  timedOutOrErrored: fc.boolean(),
  lastSyncSucceeded: fc.boolean(),
});

/**
 * Mô hình tham chiếu độc lập cho trạng thái mong đợi theo acceptance criteria.
 * Viết tách khỏi implementation để property so khớp là kiểm chứng thực sự.
 */
function expectedStatus(input: SyncIndicatorInput): SyncIndicatorStatus | null {
  // Req 6.8: demo mode hoặc chưa đăng nhập → không hiển thị indicator.
  if (input.appMode === "demo" || !input.signedIn) {
    return null;
  }
  // Ưu tiên: offline > error > syncing > synced.
  if (input.networkStatus === "offline") return "offline"; // Req 6.4
  if (input.timedOutOrErrored) return "error"; // Req 6.5
  if (input.syncing) return "syncing"; // Req 6.2
  return "synced"; // Req 6.3
}

describe("Property 2 — resolveSyncIndicatorStatus (task 2.4)", () => {
  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(syncIndicatorInputArb, (input) => {
        const result = resolveSyncIndicatorStatus(input);

        // Req 6.8: không hiển thị khi demo mode hoặc chưa đăng nhập.
        if (input.appMode === "demo" || input.signedIn === false) {
          expect(result).toBeNull();
          return;
        }

        // Req 6.1: đúng một trạng thái loại trừ lẫn nhau (không null, hợp lệ).
        expect(result).not.toBeNull();
        expect(VALID_STATUSES).toContain(result);

        // Req 6.2–6.5: đúng thứ tự ưu tiên offline > error > syncing > synced.
        expect(result).toBe(expectedStatus(input));
      }),
      { numRuns: 100 },
    );
  });
});

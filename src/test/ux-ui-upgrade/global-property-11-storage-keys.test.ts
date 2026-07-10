/**
 * Property-Based Test — Property 11: Bảo toàn key localStorage.
 *
 * Feature: global-ui-upgrade, Property 11: Bảo toàn key localStorage.
 *
 * "For any storage key có trong baseline, key đó vẫn tồn tại nguyên vẹn trong
 *  hệ hiện tại (không đổi tên, không thay đổi hình dạng dữ liệu đã lưu); không
 *  có thay đổi nào của nâng cấp UI làm biến mất hoặc đổi tên một storage key
 *  baseline."
 *
 * Validates: Requirements 9.4
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - Baseline (TRƯỚC nâng cấp): đọc qua `readUnifiedBaseline()` từ
 *     `baseline.ts` (task 1.1), phần `storageKeys` lấy từ snapshot đã commit
 *     `__snapshots__/storage-keys.baseline.json`. Baseline bất biến trừ khi
 *     storage surface thay đổi CÓ CHỦ Ý.
 *   - Current (SAU nâng cấp): re-derive bằng `collectStorageKeys()` trên cây
 *     mã nguồn `src/` hiện tại (xem `storage-keys-scan.ts` cho 3 pattern scan).
 *   - Bất biến (Requirement 9.4): baseline ⊆ current (SUPERSET check). Nâng cấp
 *     UI KHÔNG được xóa hoặc đổi tên key baseline; việc thêm key mới ngoài
 *     phạm vi UI-upgrade không làm property này fail (Property 11 chỉ ràng buộc
 *     "bảo toàn" các key baseline, khác với đẳng thức tuyệt đối).
 *
 * Generator: chọn một storage key bất kỳ từ baseline (`fc.constantFrom`),
 * `numRuns: 100`. Test thuần — không render DOM, chỉ I/O đọc file ở module
 * scope (đã đọc một lần khi build danh sách).
 *
 * Ý nghĩa thất bại: nếu test này fail, dấu hiệu hoặc:
 *   (a) một storage key baseline đã bị đổi tên/xóa (vi phạm Requirement 9.4),
 *       hoặc
 *   (b) baseline cần regenerate CÓ CHỦ Ý qua `writeUnifiedBaseline()` (cần kèm
 *       ghi chú lý do trong PR).
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { readUnifiedBaseline } from "./baseline";
import { collectStorageKeys } from "./storage-keys-scan";

const PROPERTY_TAG = "Feature: global-ui-upgrade, Property 11: Bảo toàn key localStorage";

// ─────────────────────────────────────────────────────────────
// Chuẩn bị dữ liệu (đọc một lần ở module scope — pure, test-time)
// ─────────────────────────────────────────────────────────────

const unifiedBaseline = readUnifiedBaseline();
const baseline: ReadonlySet<string> = new Set(unifiedBaseline.storageKeys.keys);
const current: ReadonlySet<string> = collectStorageKeys();

/** Danh sách key baseline, sort ổn định cho generator xác định. */
const baselineKeys: ReadonlyArray<string> = [...baseline].sort();

/** Phần tử có trong tập A nhưng KHÔNG có trong tập B. */
function difference(a: ReadonlySet<string>, b: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const k of a) {
    if (!b.has(k)) out.push(k);
  }
  return out.sort();
}

// ─────────────────────────────────────────────────────────────
// Property 11
// ─────────────────────────────────────────────────────────────

describe("Property 11 — Bảo toàn key localStorage (task 1.2)", () => {
  it("baseline snapshot có dữ liệu để sinh mẫu (sanity)", () => {
    expect(unifiedBaseline.storageKeys.keyCount).toBe(unifiedBaseline.storageKeys.keys.length);
    expect(baseline.size).toBeGreaterThanOrEqual(50);
    // Đảm bảo current cũng quét ra dữ liệu — tránh property tầm thường nếu
    // scanner trả về tập rỗng do bug walking.
    expect(current.size).toBeGreaterThanOrEqual(50);
    expect(baselineKeys.length).toBeGreaterThan(0);
  });

  it("một số storage key cốt lõi của codebase phải được bảo toàn (sanity)", () => {
    // Spot-check chọn lọc — các key trung tâm của storage surface không bao
    // giờ được đổi tên trong đợt nâng cấp UI (global-ui-upgrade).
    for (const required of [
      "visionboard_user_data",
      "firebase_id_token",
      "offline-banner-dismissed",
      "selected_focus_area",
    ]) {
      expect(baseline.has(required)).toBe(true);
      expect(current.has(required)).toBe(true);
    }
  });

  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(fc.constantFrom(...baselineKeys), (key) => {
        // Bất biến (Req 9.4): mọi key baseline vẫn tồn tại trong hệ hiện tại
        // (baseline ⊆ current — superset check). Nâng cấp UI không được xóa
        // hoặc đổi tên bất kỳ key baseline nào.
        expect(current.has(key)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("không có key baseline bị xóa hoặc đổi tên trong hệ hiện tại (deterministic enumeration)", () => {
    const removed = difference(baseline, current);

    if (removed.length > 0) {
      const lines: string[] = [];
      lines.push(`Có ${removed.length} storage key baseline bị XÓA/ĐỔI TÊN so với hệ hiện tại (vi phạm Req 9.4):`);
      for (const k of removed) lines.push(`  - ${JSON.stringify(k)}`);
      lines.push("");
      lines.push("Nếu thay đổi là CÓ CHỦ Ý (rename/refactor storage surface), regenerate baseline:");
      lines.push("  writeUnifiedBaseline() trong src/test/ux-ui-upgrade/baseline.ts");

      throw new Error(lines.join("\n"));
    }
  });
});

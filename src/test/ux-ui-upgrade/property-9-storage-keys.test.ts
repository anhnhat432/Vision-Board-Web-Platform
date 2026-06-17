/**
 * Property-Based Test — Property 9: Bất biến tập storage key (task 10.1).
 *
 * "For any Token_Value được tinh chỉnh trong đợt nâng cấp, tập tên các storage
 *  key sau đợt nâng cấp BẰNG ĐÚNG (equality) tập tên storage key trước đợt
 *  nâng cấp — không thêm, không đổi tên, không xóa key nào."
 *
 * Validates: Requirements 10.1
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - Baseline (TRƯỚC nâng cấp): `__snapshots__/storage-keys.baseline.json`
 *     được sinh một lần qua `writeStorageKeysBaseline()`. File baseline được
 *     commit và bất biến trừ khi storage surface thay đổi có chủ ý.
 *   - Current (SAU nâng cấp): re-derive bằng `collectStorageKeys()` trên cây
 *     mã nguồn `src/` hiện tại (xem `storage-keys-scan.ts` cho 3 pattern
 *     scan).
 *   - Bất biến tập = baseline ⊆ current ∧ current ⊆ baseline (equality of
 *     sets). Property test sinh phần tử tùy ý từ `baseline ∪ current` rồi
 *     khẳng định phần tử đó nằm trong CẢ HAI tập.
 *
 * Generator: chọn một storage key bất kỳ từ `baseline ∪ current` (`fc.constantFrom`),
 * `numRuns ≥ 100`. Test thuần — không render DOM, chỉ I/O đọc file ở module
 * scope (đã đọc một lần khi build danh sách).
 *
 * Phạm vi đợt nâng cấp & ý nghĩa thất bại:
 *   - Đợt nâng cấp UX/UI là visual refresh ở mức design token — KHÔNG được
 *     thêm/đổi/xóa storage key. Nếu test này fail, dấu hiệu hoặc:
 *       (a) ai đó đã đổi storage surface (vi phạm Requirement 10.1), hoặc
 *       (b) baseline cần regenerate có chủ ý qua
 *           `npx vite-node scripts/write-storage-keys-baseline.mts` (cần kèm
 *           ghi chú lý do trong PR).
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { collectStorageKeys, readStorageKeysBaseline } from "./storage-keys-scan";

const PROPERTY_TAG = "Feature: ux-ui-upgrade, Property 9: Bất biến tập storage key";

// ─────────────────────────────────────────────────────────────
// Chuẩn bị dữ liệu (đọc một lần ở module scope — pure, test-time)
// ─────────────────────────────────────────────────────────────

const baselineSnapshot = readStorageKeysBaseline();
const baseline: ReadonlySet<string> = new Set(baselineSnapshot.keys);
const current: ReadonlySet<string> = collectStorageKeys();

/** Hợp baseline ∪ current để generator có cơ hội bắt cả "thiếu" và "thừa". */
const union: ReadonlyArray<string> = [...new Set<string>([...baseline, ...current])].sort();

/** Phần tử có trong tập A nhưng KHÔNG có trong tập B. */
function difference(a: ReadonlySet<string>, b: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const k of a) {
    if (!b.has(k)) out.push(k);
  }
  return out.sort();
}

// ─────────────────────────────────────────────────────────────
// Property 9
// ─────────────────────────────────────────────────────────────

describe("Property 9 — Bất biến tập storage key (task 10.1)", () => {
  it("baseline snapshot có dữ liệu để sinh mẫu (sanity)", () => {
    expect(baselineSnapshot.keyCount).toBe(baselineSnapshot.keys.length);
    expect(baseline.size).toBeGreaterThanOrEqual(50);
    // Đảm bảo current cũng đã quét ra dữ liệu — tránh property tầm thường nếu
    // scanner trả về tập rỗng do bug walking.
    expect(current.size).toBeGreaterThanOrEqual(50);
    expect(union.length).toBeGreaterThan(0);
  });

  it("một số storage key cốt lõi của codebase phải nằm trong baseline (sanity)", () => {
    // Spot-check chọn lọc — các key trung tâm của storage surface không bao
    // giờ được đổi tên trong đợt visual refresh.
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
      fc.property(fc.constantFrom(...union), (key) => {
        // Bất biến (Req 10.1): mọi key trong union phải nằm trong CẢ baseline
        // VÀ current — tương đương baseline = current (equality of sets).
        expect(baseline.has(key)).toBe(true);
        expect(current.has(key)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("không có key bị thêm hoặc bị xóa so với baseline (deterministic enumeration)", () => {
    const added = difference(current, baseline);
    const removed = difference(baseline, current);

    if (added.length > 0 || removed.length > 0) {
      const lines: string[] = [];
      if (added.length > 0) {
        lines.push(`Có ${added.length} storage key MỚI so với baseline (vi phạm Req 10.1):`);
        for (const k of added) lines.push(`  + ${JSON.stringify(k)}`);
      }
      if (removed.length > 0) {
        lines.push(`Có ${removed.length} storage key bị XÓA so với baseline (vi phạm Req 10.1):`);
        for (const k of removed) lines.push(`  - ${JSON.stringify(k)}`);
      }
      lines.push("");
      lines.push("Nếu thay đổi là CÓ CHỦ Ý (rename/refactor storage surface), regenerate baseline:");
      lines.push("  npx vite-node scripts/write-storage-keys-baseline.mts");

      throw new Error(lines.join("\n"));
    }
  });
});

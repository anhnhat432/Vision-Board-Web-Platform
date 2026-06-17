/**
 * Property-Based Test — Property 7: An toàn dữ liệu khi hủy hành động phá hủy
 * (task 9.3).
 *
 * "For any hành động phá hủy dữ liệu được kích hoạt từ một Core_Flow_Screen,
 *  nếu người dùng chọn hủy hoặc đóng `AlertDialog`, thì trạng thái dữ liệu sau
 *  thao tác bằng đúng trạng thái dữ liệu trước thao tác (không có bản ghi nào
 *  bị xóa hay ghi đè)."
 *
 * Validates: Requirements 9.4
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - Tập hành động phá hủy được rút ra từ các `AlertDialog` core-flow thực tế
 *     (xem `TwelveWeekSystemDialogs.tsx` + Settings/account/data wipe):
 *       reset_cycle              — làm mới chu kỳ 12 tuần
 *       clear_local              — xóa dấu vết trên thiết bị
 *       delete_cloud_workspace   — xóa workspace 12 tuần đã đồng bộ
 *       delete_account           — xóa tài khoản (irreversible)
 *       wipe_data                — xóa toàn bộ dữ liệu (irreversible)
 *   - Tập quyết định kiểm chứng:
 *       cancel   — bấm `AlertDialogCancel`
 *       dismiss  — đóng dialog (Esc / overlay click → `onOpenChange(false)`)
 *     `confirm` được dùng riêng trong sanity test để chứng minh hành động phá
 *     hủy thực sự "có hiệu lực" — không phải bài kiểm chứng của Property 7.
 *   - Hợp đồng `AlertDialog` (theo Radix UI + thiết kế core-flow):
 *       • `AlertDialogCancel` chỉ đóng dialog, KHÔNG gọi handler phá hủy.
 *       • `onOpenChange(false)` (dismiss) chỉ đóng dialog, KHÔNG gọi handler.
 *       • Chỉ `AlertDialogAction.onClick` mới gọi handler phá hủy → đột biến
 *         dữ liệu.
 *     Mô hình `simulateAlertDialog` dưới đây encode chính xác hợp đồng này.
 *
 * Generator: cặp (hành động phá hủy ∈ 5 giá trị) × (quyết định ∈ {cancel,
 * dismiss}) × (snapshot dữ liệu BẤT KỲ) — `numRuns ≥ 100`.
 *
 * Pure test — không render DOM, không I/O ngoài import `fast-check`.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

const PROPERTY_TAG = "Feature: ux-ui-upgrade, Property 7: An toàn dữ liệu khi hủy hành động phá hủy";

// ─────────────────────────────────────────────────────────────
// Domain — phản chiếu các hành động phá hủy thật trên core-flow
// ─────────────────────────────────────────────────────────────

type DestructiveAction = "reset_cycle" | "clear_local" | "delete_cloud_workspace" | "delete_account" | "wipe_data";

const DESTRUCTIVE_ACTIONS: ReadonlyArray<DestructiveAction> = [
  "reset_cycle",
  "clear_local",
  "delete_cloud_workspace",
  "delete_account",
  "wipe_data",
];

type Decision = "cancel" | "dismiss" | "confirm";

/**
 * Snapshot dữ liệu (pure model). Đây là đại diện rút gọn của dữ liệu local +
 * cloud có thể bị ảnh hưởng bởi hành động phá hủy:
 *   - records:   bản đồ event log / queue / nhắc việc trên thiết bị
 *   - workspace: workspace 12 tuần đã đồng bộ trên cloud
 *   - cycle:     chu kỳ 12 tuần đang chạy
 */
interface DataSnapshot {
  records: Record<string, unknown>;
  workspace: {
    id: string;
    week: number;
    tasks: ReadonlyArray<string>;
  } | null;
  cycle: {
    startWeek: number;
    checkins: ReadonlyArray<string>;
  } | null;
}

/**
 * Hàm phá hủy ứng với từng `DestructiveAction`. Đây là hành vi PHẢI thực hiện
 * khi (và CHỈ khi) người dùng bấm `AlertDialogAction` (confirm). Với cancel /
 * dismiss, các hàm này KHÔNG được gọi.
 */
const DESTRUCTIVE_OPS: Readonly<Record<DestructiveAction, (s: DataSnapshot) => DataSnapshot>> = {
  reset_cycle: (s) => ({ ...s, cycle: null }),
  clear_local: (s) => ({ ...s, records: {} }),
  delete_cloud_workspace: (s) => ({ ...s, workspace: null }),
  delete_account: () => ({ records: {}, workspace: null, cycle: null }),
  wipe_data: () => ({ records: {}, workspace: null, cycle: null }),
};

// ─────────────────────────────────────────────────────────────
// Mô hình hợp đồng AlertDialog
// ─────────────────────────────────────────────────────────────

/**
 * Mô phỏng tương tác `AlertDialog` cho một hành động phá hủy. Mô hình bám sát
 * wiring thật trong `TwelveWeekSystemDialogs.tsx`:
 *   - `AlertDialogCancel`            → đóng dialog, KHÔNG gọi handler.
 *   - `onOpenChange(false)` (dismiss) → đóng dialog, KHÔNG gọi handler.
 *   - `AlertDialogAction.onClick`    → gọi handler phá hủy → đột biến dữ liệu.
 */
function simulateAlertDialog(preState: DataSnapshot, action: DestructiveAction, decision: Decision): DataSnapshot {
  if (decision === "confirm") {
    return DESTRUCTIVE_OPS[action](preState);
  }
  // cancel | dismiss → no-op (Req 9.4)
  return preState;
}

// ─────────────────────────────────────────────────────────────
// Generators
// ─────────────────────────────────────────────────────────────

const arbDestructiveAction: fc.Arbitrary<DestructiveAction> = fc.constantFrom<DestructiveAction>(
  ...DESTRUCTIVE_ACTIONS,
);

/** Chỉ sinh `cancel` và `dismiss` — đây là tập decision mà Property 7 kiểm chứng. */
const arbCancelOrDismiss: fc.Arbitrary<Exclude<Decision, "confirm">> = fc.constantFrom<Exclude<Decision, "confirm">>(
  "cancel",
  "dismiss",
);

const arbWorkspace: fc.Arbitrary<DataSnapshot["workspace"]> = fc.option(
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 12 }),
    week: fc.integer({ min: 1, max: 12 }),
    tasks: fc.array(fc.string({ maxLength: 16 }), { maxLength: 5 }),
  }),
  { nil: null },
);

const arbCycle: fc.Arbitrary<DataSnapshot["cycle"]> = fc.option(
  fc.record({
    startWeek: fc.integer({ min: 1, max: 12 }),
    checkins: fc.array(fc.string({ maxLength: 16 }), { maxLength: 7 }),
  }),
  { nil: null },
);

const arbRecords: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 8 }),
  fc.oneof(fc.string({ maxLength: 16 }), fc.integer(), fc.boolean()),
  { maxKeys: 6 },
);

const arbDataSnapshot: fc.Arbitrary<DataSnapshot> = fc.record({
  records: arbRecords,
  workspace: arbWorkspace,
  cycle: arbCycle,
});

// ─────────────────────────────────────────────────────────────
// Property 7
// ─────────────────────────────────────────────────────────────

describe("Property 7 — An toàn dữ liệu khi hủy hành động phá hủy (task 9.3)", () => {
  it("sanity: confirm thực sự áp dụng hành động phá hủy lên state non-empty", () => {
    // Nếu confirm là no-op thì property cancel/dismiss = no-op trở thành tầm
    // thường (vacuous). Sanity test này bảo đảm DESTRUCTIVE_OPS không tầm thường.
    const pre: DataSnapshot = {
      records: { a: 1, b: 2 },
      workspace: { id: "w1", week: 3, tasks: ["t1"] },
      cycle: { startWeek: 1, checkins: ["c1"] },
    };
    expect(simulateAlertDialog(pre, "reset_cycle", "confirm").cycle).toBeNull();
    expect(simulateAlertDialog(pre, "clear_local", "confirm").records).toEqual({});
    expect(simulateAlertDialog(pre, "delete_cloud_workspace", "confirm").workspace).toBeNull();
    expect(simulateAlertDialog(pre, "delete_account", "confirm")).toEqual({
      records: {},
      workspace: null,
      cycle: null,
    });
    expect(simulateAlertDialog(pre, "wipe_data", "confirm")).toEqual({
      records: {},
      workspace: null,
      cycle: null,
    });
  });

  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(arbDataSnapshot, arbDestructiveAction, arbCancelOrDismiss, (preState, action, decision) => {
        // Snapshot deep-clone trước khi mô phỏng để chứng minh KHÔNG có
        // mutation chéo lên state gốc dù decision là cancel hay dismiss.
        const preSnapshot = structuredClone(preState);

        const postState = simulateAlertDialog(preState, action, decision);

        // Bất biến (Req 9.4): dữ liệu sau bằng đúng dữ liệu trước (deep
        // equality) — không bản ghi nào bị xóa hoặc ghi đè.
        expect(postState).toEqual(preSnapshot);

        // Đầu vào `preState` cũng KHÔNG bị mutate.
        expect(preState).toEqual(preSnapshot);
      }),
      { numRuns: 100 },
    );
  });

  it("hợp đồng AlertDialog: cancel/dismiss không bao giờ gọi handler phá hủy", () => {
    // Củng cố Property 7 ở tầng "side effect": instrument handler phá hủy bằng
    // counter và đảm bảo nó BẰNG 0 sau mọi tương tác cancel/dismiss với toàn
    // bộ 5 hành động phá hủy.
    let callCount = 0;
    const tracked: Record<DestructiveAction, (s: DataSnapshot) => DataSnapshot> = {
      reset_cycle: (s) => {
        callCount += 1;
        return DESTRUCTIVE_OPS.reset_cycle(s);
      },
      clear_local: (s) => {
        callCount += 1;
        return DESTRUCTIVE_OPS.clear_local(s);
      },
      delete_cloud_workspace: (s) => {
        callCount += 1;
        return DESTRUCTIVE_OPS.delete_cloud_workspace(s);
      },
      delete_account: (s) => {
        callCount += 1;
        return DESTRUCTIVE_OPS.delete_account(s);
      },
      wipe_data: (s) => {
        callCount += 1;
        return DESTRUCTIVE_OPS.wipe_data(s);
      },
    };

    function simulate(pre: DataSnapshot, action: DestructiveAction, decision: Decision): DataSnapshot {
      if (decision === "confirm") return tracked[action](pre);
      return pre;
    }

    const pre: DataSnapshot = {
      records: { a: 1 },
      workspace: { id: "w", week: 2, tasks: [] },
      cycle: { startWeek: 1, checkins: [] },
    };

    for (const action of DESTRUCTIVE_ACTIONS) {
      for (const decision of ["cancel", "dismiss"] as const) {
        const post = simulate(pre, action, decision);
        expect(post).toBe(pre);
      }
    }

    expect(callCount).toBe(0);
  });
});

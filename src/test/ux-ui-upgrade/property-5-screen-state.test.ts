/**
 * Property-Based Test — Property 5: Máy trạng thái màn hình — loại trừ lẫn nhau
 * và retry (task 6.4).
 *
 * "For any chuỗi sự kiện tải dữ liệu áp lên một Core_Flow_Screen, `ScreenDataState`
 *  tại mọi thời điểm luôn là **đúng một** trong {loading, empty, error, ready}
 *  (không bao giờ có hai trạng thái cùng hiển thị); và for any trạng thái `error`,
 *  kích hoạt `retry()` luôn chuyển hệ về trạng thái `loading`."
 *
 * Validates: Requirements 7.7, 7.5
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - Domain trạng thái rút từ design.md:
 *       type ScreenDataState =
 *         | { kind: "loading" }
 *         | { kind: "empty" }
 *         | { kind: "error"; retry: () => void }
 *         | { kind: "ready"; data: unknown };
 *   - Sự kiện áp lên màn hình:
 *       start_load            — bắt đầu (hoặc khởi động lại) việc tải dữ liệu
 *       load_success_with_data — tải xong, có bản ghi → ready
 *       load_success_empty    — tải xong, không có bản ghi → empty (Req 7.2)
 *       load_failure          — tải thất bại → error kèm retry (Req 7.3)
 *       timeout               — quá ngưỡng 30s khi đang loading → error (Req 7.6)
 *       retry                 — kích hoạt control thử lại từ trạng thái error
 *                               → loading (Req 7.5)
 *   - Quy ước transition (suy ra trực tiếp từ requirements.md §7):
 *       • Trạng thái khởi tạo của Core_Flow_Screen là "loading" (đang tải lần đầu).
 *       • Sự kiện kết thúc tải (success/failure/timeout) chỉ có nghĩa khi đang
 *         "loading"; áp lên trạng thái khác là no-op (tôn trọng invariant 7.7,
 *         tránh tạo ra "hai trạng thái cùng lúc").
 *       • `retry` chỉ có nghĩa từ "error" (Req 7.5); áp ngoài "error" là no-op.
 *       • `start_load` luôn đưa về "loading" (refetch hợp lệ ở mọi trạng thái).
 *
 * Generator: chuỗi sự kiện độ dài tuỳ ý từ tập 6 sự kiện trên (`fc.array`),
 * `numRuns ≥ 100`. Pure test — không render DOM, không I/O.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

const PROPERTY_TAG = "Feature: ux-ui-upgrade, Property 5: Máy trạng thái màn hình — loại trừ lẫn nhau và retry";

// ─────────────────────────────────────────────────────────────
// Domain types — phản chiếu chính xác `ScreenDataState` từ design.md
// ─────────────────────────────────────────────────────────────

type ScreenDataState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "error"; retry: () => void }
  | { kind: "ready"; data: unknown };

type ScreenStateKind = ScreenDataState["kind"];

const ALL_KINDS: ReadonlyArray<ScreenStateKind> = ["loading", "empty", "error", "ready"];

type LoadEvent =
  | { type: "start_load" }
  | { type: "load_success_with_data"; data: unknown }
  | { type: "load_success_empty" }
  | { type: "load_failure" }
  | { type: "timeout" }
  | { type: "retry" };

// ─────────────────────────────────────────────────────────────
// State machine thuần
// ─────────────────────────────────────────────────────────────

/** Trạng thái khởi tạo: Core_Flow_Screen luôn bắt đầu bằng việc tải dữ liệu. */
function initialState(): ScreenDataState {
  return { kind: "loading" };
}

/** Hàm retry no-op cho biến variant `error` — biến thể được kiểm chứng riêng. */
function noopRetry(): void {
  /* intentionally empty — kích hoạt được kiểm chứng ở tầng sự kiện */
}

/**
 * Reducer thuần: (state, event) → newState.
 *
 * Sự kiện không hợp lệ ở trạng thái hiện tại được coi là **no-op** (giữ nguyên
 * state). Quyết định này tôn trọng Requirement 7.7 — không bao giờ phát sinh
 * trạng thái lai (ví dụ "ready" + "error" cùng lúc).
 */
function transition(state: ScreenDataState, event: LoadEvent): ScreenDataState {
  switch (event.type) {
    case "start_load":
      // Bắt đầu (hoặc khởi động lại) tải — hợp lệ ở mọi trạng thái.
      return { kind: "loading" };
    case "load_success_with_data":
      return state.kind === "loading" ? { kind: "ready", data: event.data } : state;
    case "load_success_empty":
      return state.kind === "loading" ? { kind: "empty" } : state;
    case "load_failure":
      return state.kind === "loading" ? { kind: "error", retry: noopRetry } : state;
    case "timeout":
      // Req 7.6 — quá 30s khi đang tải → error kèm hành động thử lại.
      return state.kind === "loading" ? { kind: "error", retry: noopRetry } : state;
    case "retry":
      // Req 7.5 — chỉ có ý nghĩa từ "error"; luôn dẫn về "loading".
      return state.kind === "error" ? { kind: "loading" } : state;
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers kiểm chứng invariant
// ─────────────────────────────────────────────────────────────

/**
 * Mutual exclusion: state khớp với **đúng một** nhãn trong ALL_KINDS, và các
 * trường dữ liệu chỉ tương ứng với nhãn đó (không tồn tại "hai trạng thái cùng
 * hiển thị" ở mức kiểu dữ liệu).
 */
function isExactlyOneKind(state: ScreenDataState): boolean {
  let matched = 0;
  for (const k of ALL_KINDS) {
    if (state.kind === k) matched += 1;
  }
  if (matched !== 1) return false;

  // Kiểm tra ràng buộc shape theo từng variant — đảm bảo discriminant không lẫn.
  switch (state.kind) {
    case "loading":
    case "empty":
      return Object.keys(state).length === 1; // chỉ có `kind`
    case "error":
      return typeof state.retry === "function" && Object.keys(state).length === 2;
    case "ready":
      return "data" in state && Object.keys(state).length === 2;
  }
}

// ─────────────────────────────────────────────────────────────
// Generators
// ─────────────────────────────────────────────────────────────

const loadEventArb: fc.Arbitrary<LoadEvent> = fc.oneof(
  fc.constant<LoadEvent>({ type: "start_load" }),
  fc.anything().map<LoadEvent>((data) => ({ type: "load_success_with_data", data })),
  fc.constant<LoadEvent>({ type: "load_success_empty" }),
  fc.constant<LoadEvent>({ type: "load_failure" }),
  fc.constant<LoadEvent>({ type: "timeout" }),
  fc.constant<LoadEvent>({ type: "retry" }),
);

// ─────────────────────────────────────────────────────────────
// Property 5
// ─────────────────────────────────────────────────────────────

describe("Property 5 — Máy trạng thái màn hình (task 6.4)", () => {
  it("trạng thái khởi tạo là loading và thoả mutual exclusion (sanity)", () => {
    const state = initialState();
    expect(state.kind).toBe("loading");
    expect(isExactlyOneKind(state)).toBe(true);
  });

  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(fc.array(loadEventArb, { maxLength: 64 }), (events) => {
        let state: ScreenDataState = initialState();
        // (1) Mutual exclusion ở trạng thái khởi tạo (Req 7.7).
        expect(isExactlyOneKind(state)).toBe(true);
        expect(ALL_KINDS).toContain(state.kind);

        for (const event of events) {
          const before = state;
          const next = transition(state, event);

          // (1) Mutual exclusion ở MỌI bước (Req 7.7).
          expect(isExactlyOneKind(next)).toBe(true);
          expect(ALL_KINDS).toContain(next.kind);

          // (2) Bất biến retry: từ "error", `retry` luôn chuyển về "loading"
          //     (Req 7.5).
          if (event.type === "retry" && before.kind === "error") {
            expect(next.kind).toBe("loading");
          }

          state = next;
        }
      }),
      { numRuns: 100 },
    );
  });

  it("với mọi trạng thái error đạt được, bước retry kế tiếp luôn dẫn về loading (Req 7.5)", () => {
    fc.assert(
      fc.property(fc.array(loadEventArb, { maxLength: 32 }), (events) => {
        let state: ScreenDataState = initialState();
        for (const event of events) {
          state = transition(state, event);
        }
        if (state.kind === "error") {
          const next = transition(state, { type: "retry" });
          expect(next.kind).toBe("loading");
          expect(isExactlyOneKind(next)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});

import { act, renderHook } from "@testing-library/react";
import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveScreenStateKind,
  SCREEN_DATA_STATE_TIMEOUT_MS,
  type ScreenLoadStatus,
  type ScreenStateKind,
  type UseScreenDataStateOptions,
  useScreenDataState,
} from "./useScreenDataState";

describe("resolveScreenStateKind", () => {
  it("ưu tiên error khi status là error hoặc đã timeout", () => {
    expect(resolveScreenStateKind("error", false, false)).toBe("error");
    expect(resolveScreenStateKind("loading", false, true)).toBe("error");
    expect(resolveScreenStateKind("ready", true, true)).toBe("error");
  });

  it("trả loading khi đang tải và chưa timeout", () => {
    expect(resolveScreenStateKind("loading", false, false)).toBe("loading");
  });

  it("phân biệt empty và ready khi tải xong", () => {
    expect(resolveScreenStateKind("ready", true, false)).toBe("empty");
    expect(resolveScreenStateKind("ready", false, false)).toBe("ready");
  });

  // Feature: core-flow-ui-upgrade, Property 1: Máy trạng thái màn hình loại trừ lẫn nhau
  // Validates: Requirements 5.3, 5.5, 5.6
  it("luôn trả về đúng một trạng thái theo thứ tự ưu tiên error > loading > empty > ready", () => {
    const allKinds: ScreenStateKind[] = ["loading", "empty", "error", "ready"];
    const statusArb = fc.constantFrom<ScreenLoadStatus>("loading", "ready", "error");

    fc.assert(
      fc.property(statusArb, fc.boolean(), fc.boolean(), (status, isEmpty, timedOut) => {
        const kind = resolveScreenStateKind(status, isEmpty, timedOut);

        // Kết quả phải là một trong bốn trạng thái hợp lệ (không có trạng thái "rỗng").
        expect(allKinds).toContain(kind);

        // Trạng thái kỳ vọng suy ra độc lập theo đặc tả (không trùng logic hàm).
        let expected: ScreenStateKind;
        if (status === "error" || timedOut) {
          expected = "error";
        } else if (status === "loading") {
          expected = "loading";
        } else if (isEmpty) {
          expected = "empty";
        } else {
          expected = "ready";
        }
        expect(kind).toBe(expected);

        // Loại trừ lẫn nhau: đúng một trạng thái khớp, không có hai trạng thái cùng đúng.
        const matched = allKinds.filter((candidate) => candidate === kind);
        expect(matched).toHaveLength(1);
      }),
      { numRuns: 100 },
    );
  });
});

describe("useScreenDataState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("trả đúng một trạng thái cho mỗi đầu vào (mutual exclusion)", () => {
    const { result, rerender } = renderHook((props) => useScreenDataState(props), {
      initialProps: { status: "loading", isEmpty: false } as UseScreenDataStateOptions,
    });
    expect(result.current.kind).toBe("loading");

    rerender({ status: "ready", isEmpty: true });
    expect(result.current.kind).toBe("empty");

    rerender({ status: "ready", isEmpty: false });
    expect(result.current.kind).toBe("ready");

    rerender({ status: "error", isEmpty: false });
    expect(result.current.kind).toBe("error");
  });

  it("chuyển sang error sau khi quá ngưỡng timeout 30s", () => {
    const { result } = renderHook(() => useScreenDataState({ status: "loading" }));

    expect(result.current.kind).toBe("loading");
    expect(result.current.timedOut).toBe(false);

    act(() => {
      vi.advanceTimersByTime(SCREEN_DATA_STATE_TIMEOUT_MS);
    });

    expect(result.current.timedOut).toBe(true);
    expect(result.current.kind).toBe("error");
  });

  it("không timeout nếu tải xong trước ngưỡng", () => {
    const { result, rerender } = renderHook((props) => useScreenDataState(props), {
      initialProps: { status: "loading", isEmpty: false } as UseScreenDataStateOptions,
    });

    act(() => {
      vi.advanceTimersByTime(SCREEN_DATA_STATE_TIMEOUT_MS - 1);
    });
    rerender({ status: "ready", isEmpty: false });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(result.current.timedOut).toBe(false);
    expect(result.current.kind).toBe("ready");
  });

  it("retry gọi onRetry, gỡ chốt timeout và quay về loading", () => {
    const onRetry = vi.fn();
    const { result, rerender } = renderHook((props) => useScreenDataState(props), {
      initialProps: { status: "loading", onRetry } as UseScreenDataStateOptions,
    });

    act(() => {
      vi.advanceTimersByTime(SCREEN_DATA_STATE_TIMEOUT_MS);
    });
    expect(result.current.kind).toBe("error");

    act(() => {
      result.current.retry();
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    // Vẫn còn ở status "loading" nhưng chốt timeout đã gỡ → quay về loading.
    expect(result.current.timedOut).toBe(false);
    expect(result.current.kind).toBe("loading");

    // Bộ đếm timeout được tái khởi động: lại quá ngưỡng → error.
    act(() => {
      vi.advanceTimersByTime(SCREEN_DATA_STATE_TIMEOUT_MS);
    });
    expect(result.current.kind).toBe("error");

    // Đảm bảo rerender giữ nguyên hành vi (dependency ổn định).
    rerender({ status: "loading", onRetry });
    expect(result.current.kind).toBe("error");
  });
});

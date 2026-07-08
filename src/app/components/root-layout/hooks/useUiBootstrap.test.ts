import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WARM_PREFETCH_ROUTE_PATHS, prefetchRoute } from "../navConfig";
import { useWarmPrefetch } from "./useUiBootstrap";

vi.mock("../navConfig", () => ({
  WARM_PREFETCH_ROUTE_PATHS: ["/12-week-system", "/goals"],
  prefetchRoute: vi.fn(),
}));

describe("useWarmPrefetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(prefetchRoute).mockClear();
    Object.defineProperty(window.navigator, "connection", {
      configurable: true,
      value: { saveData: false, effectiveType: "4g" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not schedule route prefetch when disabled", () => {
    renderHook(() => useWarmPrefetch({ enabled: false }));

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(prefetchRoute).not.toHaveBeenCalled();
  });

  it("prefetches warm routes when enabled", () => {
    renderHook(() => useWarmPrefetch({ enabled: true }));

    act(() => {
      vi.advanceTimersByTime(901);
    });

    for (const path of WARM_PREFETCH_ROUTE_PATHS) {
      expect(prefetchRoute).toHaveBeenCalledWith(path);
    }
  });
});

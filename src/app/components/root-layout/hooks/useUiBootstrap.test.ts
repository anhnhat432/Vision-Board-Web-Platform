import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const navConfigMock = vi.hoisted(() => ({
  prefetchRoute: vi.fn(),
}));

vi.mock("../navConfig", () => ({
  WARM_PREFETCH_ROUTE_PATHS: ["/goals", "/life-balance"],
  prefetchRoute: navConfigMock.prefetchRoute,
}));

import { useWarmPrefetch } from "./useUiBootstrap";

describe("useWarmPrefetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navConfigMock.prefetchRoute.mockReset();

    Object.defineProperty(window, "requestIdleCallback", {
      configurable: true,
      value: vi.fn((callback: IdleRequestCallback) => {
        callback({
          didTimeout: false,
          timeRemaining: () => 50,
        });
        return 1;
      }),
    });
    Object.defineProperty(window, "cancelIdleCallback", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(window, "requestIdleCallback");
    Reflect.deleteProperty(window, "cancelIdleCallback");
  });

  test("does not prefetch workspace routes when disabled", () => {
    renderHook(() => useWarmPrefetch(false));

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(window.requestIdleCallback).not.toHaveBeenCalled();
    expect(navConfigMock.prefetchRoute).not.toHaveBeenCalled();
  });

  test("prefetches warm workspace routes after idle when enabled", () => {
    renderHook(() => useWarmPrefetch(true));

    act(() => {
      vi.advanceTimersByTime(899);
    });
    expect(navConfigMock.prefetchRoute).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(navConfigMock.prefetchRoute).toHaveBeenCalledTimes(2);
    expect(navConfigMock.prefetchRoute).toHaveBeenNthCalledWith(1, "/goals");
    expect(navConfigMock.prefetchRoute).toHaveBeenNthCalledWith(2, "/life-balance");
  });

  test("does not prefetch heavy routes on low-core devices", () => {
    Object.defineProperty(window.navigator, "hardwareConcurrency", {
      configurable: true,
      value: 4,
    });

    renderHook(() => useWarmPrefetch(true));

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(window.requestIdleCallback).not.toHaveBeenCalled();
    expect(navConfigMock.prefetchRoute).not.toHaveBeenCalled();
  });
});

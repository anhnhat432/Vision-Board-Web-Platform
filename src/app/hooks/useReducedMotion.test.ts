import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useReducedMotion } from "./useReducedMotion";

interface MockMediaQueryList {
  matches: boolean;
  addEventListener: (event: "change", handler: (e: MediaQueryListEvent) => void) => void;
  removeEventListener: (event: "change", handler: (e: MediaQueryListEvent) => void) => void;
  trigger: (matches: boolean) => void;
}

function createMockMediaQuery(initial: boolean): MockMediaQueryList {
  const handlers = new Set<(e: MediaQueryListEvent) => void>();
  const mq: MockMediaQueryList = {
    matches: initial,
    addEventListener: (_event, handler) => {
      handlers.add(handler);
    },
    removeEventListener: (_event, handler) => {
      handlers.delete(handler);
    },
    trigger: (matches) => {
      mq.matches = matches;
      handlers.forEach((handler) => {
        handler({ matches } as MediaQueryListEvent);
      });
    },
  };
  return mq;
}

describe("useReducedMotion", () => {
  let mq: MockMediaQueryList;

  beforeEach(() => {
    mq = createMockMediaQuery(false);
    vi.stubGlobal("matchMedia", () => mq);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when user has not requested reduced motion", () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when user has requested reduced motion at mount", () => {
    mq.matches = true;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("updates when the OS preference changes after mount", () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      mq.trigger(true);
    });

    expect(result.current).toBe(true);
  });

  it("removes its listener on unmount", () => {
    const { unmount } = renderHook(() => useReducedMotion());
    const removeSpy = vi.spyOn(mq, "removeEventListener");

    unmount();

    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith("change", expect.any(Function));
  });
});

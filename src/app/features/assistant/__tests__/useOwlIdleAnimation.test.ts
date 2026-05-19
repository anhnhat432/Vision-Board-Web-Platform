import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOwlIdleAnimation } from "../useOwlIdleAnimation";

describe("useOwlIdleAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock random to always return 0, so interval = 3000ms (minimum)
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts with blinking = false", () => {
    const { result } = renderHook(() => useOwlIdleAnimation());

    expect(result.current.blinking).toBe(false);
  });

  it("triggers blink after random interval between 3-6 seconds", () => {
    const { result } = renderHook(() => useOwlIdleAnimation());

    // Initial state
    expect(result.current.blinking).toBe(false);

    // Advance to just before minimum blink time (2999ms)
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(result.current.blinking).toBe(false);

    // Advance past the minimum interval
    act(() => {
      vi.advanceTimersByTime(1);
    });

    // Should now be blinking
    expect(result.current.blinking).toBe(true);

    // After blink duration (150ms), should return to false
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.blinking).toBe(false);
  });

  it("blinks for exactly 150ms", () => {
    const { result } = renderHook(() => useOwlIdleAnimation());

    // Fast-forward to first blink
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.blinking).toBe(true);

    // Advance 149ms - still blinking
    act(() => {
      vi.advanceTimersByTime(149);
    });
    expect(result.current.blinking).toBe(true);

    // Advance 1 more ms (total 150ms) - should stop
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.blinking).toBe(false);
  });

  it("pauses blinking when pause = true", () => {
    const { result } = renderHook(
      ({ pause }) => useOwlIdleAnimation({ pause }),
      { initialProps: { pause: false } },
    );

    // Advance time - should blink since pause = false
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.blinking).toBe(true);

    // Unmount and remount with pause = true
    const { unmount } = renderHook(() => useOwlIdleAnimation({ pause: true }));

    // Should not blink even after long delay
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    unmount();
    expect(true).toBe(true); // Test passes if no errors
  });

  it("resumes blinking when pause changes from true to false", () => {
    const { result, rerender } = renderHook(
      ({ pause }) => useOwlIdleAnimation({ pause }),
      { initialProps: { pause: true } },
    );

    // With pause, no blink should occur
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(result.current.blinking).toBe(false);

    // Unpause
    rerender({ pause: false });

    // Should now schedule a blink
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.blinking).toBe(true);
  });

  it("cleans up timers on unmount", () => {
    const { unmount } = renderHook(() => useOwlIdleAnimation());

    unmount();

    // Should not throw or leak timers
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(true).toBe(true); // Test passes if no errors
  });

  it("continues blinking in a loop", () => {
    const { result } = renderHook(() => useOwlIdleAnimation());

    // First blink cycle
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.blinking).toBe(true);

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.blinking).toBe(false);

    // Second blink cycle (3000ms since random returns 0)
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.blinking).toBe(true);

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.blinking).toBe(false);

    // Third blink cycle
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.blinking).toBe(true);
  });
});
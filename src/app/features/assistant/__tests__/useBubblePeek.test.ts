import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_PEEKS_PER_SESSION, PEEK_DURATION, PEEK_INTERVAL_MIN, PEEK_PHRASES, useBubblePeek } from "../useBubblePeek";

vi.mock("react-router", () => ({
  useLocation: () => ({
    pathname: "/",
  }),
}));

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function triggerPeek() {
  advance(PEEK_INTERVAL_MIN);
}

function hidePeek() {
  advance(PEEK_DURATION);
}

describe("useBubblePeek", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows a random phrase after the scheduled interval", () => {
    const { result } = renderHook(() => useBubblePeek({ pause: false }));

    expect(result.current.peek.active).toBe(false);

    triggerPeek();

    expect(result.current.peek.active).toBe(true);
    expect(PEEK_PHRASES).toContain(result.current.peek.text);
  });

  it("auto-hides after peek duration", () => {
    const { result } = renderHook(() => useBubblePeek({ pause: false }));

    triggerPeek();
    expect(result.current.peek.active).toBe(true);

    hidePeek();

    expect(result.current.peek.active).toBe(false);
  });

  it("stops after max peeks per session", () => {
    const { result } = renderHook(() => useBubblePeek({ pause: false }));

    for (let index = 0; index < MAX_PEEKS_PER_SESSION; index += 1) {
      triggerPeek();
      expect(result.current.peek.active).toBe(true);
      hidePeek();
      expect(result.current.peek.active).toBe(false);
    }

    advance(PEEK_INTERVAL_MIN * 2);

    expect(result.current.peek.active).toBe(false);
  });

  it("does not schedule while paused", () => {
    const { result } = renderHook(() => useBubblePeek({ pause: true }));

    advance(PEEK_INTERVAL_MIN * 2 + PEEK_DURATION);

    expect(result.current.peek.active).toBe(false);
    expect(result.current.peek.text).toBe("");
  });

  it("resets count so peeks can trigger again", () => {
    const { result } = renderHook(() => useBubblePeek({ pause: false }));

    for (let index = 0; index < MAX_PEEKS_PER_SESSION; index += 1) {
      triggerPeek();
      hidePeek();
    }

    advance(PEEK_INTERVAL_MIN * 2);
    expect(result.current.peek.active).toBe(false);

    act(() => {
      result.current.resetPeekCount();
    });
    triggerPeek();

    expect(result.current.peek.active).toBe(true);
    expect(PEEK_PHRASES).toContain(result.current.peek.text);
  });

  it("does not repeat the same phrase twice in a row", () => {
    const { result } = renderHook(() => useBubblePeek({ pause: false }));

    triggerPeek();
    const firstPhrase = result.current.peek.text;
    hidePeek();
    triggerPeek();

    expect(result.current.peek.text).not.toBe(firstPhrase);
  });
});

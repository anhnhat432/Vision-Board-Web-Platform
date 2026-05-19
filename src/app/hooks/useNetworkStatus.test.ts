import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNetworkStatus } from "@/app/hooks/useNetworkStatus";

describe("useNetworkStatus", () => {
  let originalOnLine: boolean;
  const listeners = new Map<string, Set<EventListener>>();

  beforeEach(() => {
    originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });

    listeners.clear();
    vi.spyOn(window, "addEventListener").mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)?.add(listener as EventListener);
      },
    );
    vi.spyOn(window, "removeEventListener").mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.get(type)?.delete(listener as EventListener);
      },
    );

    vi.useFakeTimers();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", { value: originalOnLine, writable: true, configurable: true });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function fireEvent(type: "online" | "offline") {
    Object.defineProperty(navigator, "onLine", { value: type === "online", writable: true, configurable: true });
    for (const listener of listeners.get(type) ?? []) {
      listener(new Event(type));
    }
  }

  it("reports initial online status from navigator.onLine", () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.status).toBe("online");
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it("reports initial offline status when navigator is offline", () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.status).toBe("offline");
    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it("transitions to offline when the browser fires offline event", () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);

    act(() => fireEvent("offline"));

    expect(result.current.status).toBe("offline");
    expect(result.current.isOffline).toBe(true);
  });

  it("transitions back to online when the browser fires online event", () => {
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOffline).toBe(true);

    act(() => fireEvent("online"));

    expect(result.current.status).toBe("online");
    expect(result.current.isOnline).toBe(true);
  });

  it("calls onReconnect after debounce delay when coming back online", () => {
    const onReconnect = vi.fn();
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    renderHook(() => useNetworkStatus({ onReconnect, reconnectDebounceMs: 3000 }));

    // Go online
    act(() => fireEvent("online"));
    expect(onReconnect).not.toHaveBeenCalled();

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("does not call onReconnect if going offline again before debounce fires", () => {
    const onReconnect = vi.fn();
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    renderHook(() => useNetworkStatus({ onReconnect, reconnectDebounceMs: 3000 }));

    act(() => fireEvent("online"));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => fireEvent("offline"));

    // Advance way past debounce
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it("cancels reconnect timer on unmount", () => {
    const onReconnect = vi.fn();
    Object.defineProperty(navigator, "onLine", { value: false, writable: true, configurable: true });
    const { unmount } = renderHook(() => useNetworkStatus({ onReconnect, reconnectDebounceMs: 3000 }));

    act(() => fireEvent("online"));
    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it("removes event listeners on unmount", () => {
    const { unmount } = renderHook(() => useNetworkStatus());

    expect(listeners.get("online")?.size).toBeGreaterThan(0);
    expect(listeners.get("offline")?.size).toBeGreaterThan(0);

    unmount();

    expect(listeners.get("online")?.size ?? 0).toBe(0);
    expect(listeners.get("offline")?.size ?? 0).toBe(0);
  });
});

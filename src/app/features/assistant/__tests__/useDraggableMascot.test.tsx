import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDraggableMascot } from "../useDraggableMascot";

describe("useDraggableMascot", () => {
  const mockInnerWidth = 1200;
  const mockInnerHeight = 800;
  const mascotSize = 64;
  const minGap = 8;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  function mockWindowSize(width: number, height: number) {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: height,
    });
  }

  it("initializes at bottom-right by default", () => {
    mockWindowSize(mockInnerWidth, mockInnerHeight);

    const { result } = renderHook(() => useDraggableMascot());

    const expectedX = mockInnerWidth - mascotSize - minGap;
    const expectedY = mockInnerHeight - mascotSize - minGap;

    expect(result.current.position.x).toBe(expectedX);
    expect(result.current.position.y).toBe(expectedY);
    expect(result.current.isDragging).toBe(false);
    expect(result.current.wasDragged).toBe(false);
  });

  it("loads position from localStorage", () => {
    mockWindowSize(mockInnerWidth, mockInnerHeight);
    const storedPosition = { x: 100, y: 200 };

    localStorage.setItem("assistant.mascot.position", JSON.stringify(storedPosition));

    const { result } = renderHook(() => useDraggableMascot());

    expect(result.current.position.x).toBe(100);
    expect(result.current.position.y).toBe(200);
  });

  it("falls back to default when localStorage is invalid", () => {
    mockWindowSize(mockInnerWidth, mockInnerHeight);

    localStorage.setItem("assistant.mascot.position", "invalid json");

    const { result } = renderHook(() => useDraggableMascot());

    const expectedX = mockInnerWidth - mascotSize - minGap;
    const expectedY = mockInnerHeight - mascotSize - minGap;

    expect(result.current.position.x).toBe(expectedX);
    expect(result.current.position.y).toBe(expectedY);
  });

  it("constrains position within viewport bounds", () => {
    mockWindowSize(mockInnerWidth, mockInnerHeight);

    const { result } = renderHook(() => useDraggableMascot());

    const minPos = minGap;
    const maxPos = mockInnerWidth - mascotSize - minGap;

    expect(result.current.position.x).toBeGreaterThanOrEqual(minPos);
    expect(result.current.position.y).toBeGreaterThanOrEqual(minPos);
    expect(result.current.position.x).toBeLessThanOrEqual(maxPos);
    expect(result.current.position.y).toBeLessThanOrEqual(mockInnerHeight - mascotSize - minGap);
  });

  it("handles short click without dragging", () => {
    mockWindowSize(mockInnerWidth, mockInnerHeight);

    const { result } = renderHook(() => useDraggableMascot());

    const initialX = result.current.position.x;
    const initialY = result.current.position.y;

    const button = {
      getBoundingClientRect: () =>
        ({
          left: initialX,
          top: initialY,
          width: mascotSize,
          height: mascotSize,
          x: initialX,
          y: initialY,
          right: initialX + mascotSize,
          bottom: initialY + mascotSize,
        }) as DOMRect,
      setPointerCapture: vi.fn(),
    } as unknown as HTMLButtonElement;

    const initialEvent = {
      preventDefault: vi.fn(),
      clientX: initialX + 32,
      clientY: initialY + 32,
      pointerId: 1,
      currentTarget: button,
      target: button,
      nativeEvent: { pointerId: 1 },
    } as unknown as React.PointerEvent<HTMLButtonElement>;

    act(() => {
      result.current.handlePointerDown(initialEvent);
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.position.x).toBe(initialX);
    expect(result.current.position.y).toBe(initialY);
  });

  it("updates position on drag and saves to localStorage", async () => {
    mockWindowSize(mockInnerWidth, mockInnerHeight);
    localStorage.setItem("assistant.mascot.position", JSON.stringify({ x: 100, y: 100 }));

    const { result } = renderHook(() => useDraggableMascot());

    const initialX = result.current.position.x;
    const initialY = result.current.position.y;

    const button = {
      getBoundingClientRect: () =>
        ({
          left: initialX,
          top: initialY,
          width: mascotSize,
          height: mascotSize,
          x: initialX,
          y: initialY,
          right: initialX + mascotSize,
          bottom: initialY + mascotSize,
        }) as DOMRect,
      setPointerCapture: vi.fn(),
    } as unknown as HTMLButtonElement;

    const downEvent = {
      preventDefault: vi.fn(),
      clientX: initialX + 32,
      clientY: initialY + 32,
      pointerId: 1,
      currentTarget: button,
      target: button,
      nativeEvent: { pointerId: 1 },
    } as unknown as React.PointerEvent<HTMLButtonElement>;

    act(() => {
      result.current.handlePointerDown(downEvent);
    });

    // Allow event listeners to be registered
    await new Promise((resolve) => setTimeout(resolve, 10));

    const moveEvent = new PointerEvent("pointermove", {
      clientX: initialX + 32 + 50,
      clientY: initialY + 32 + 50,
      bubbles: true,
    });

    act(() => {
      document.dispatchEvent(moveEvent);
    });

    // Wait for isDragging state to update
    await waitFor(() => {
      expect(result.current.isDragging).toBe(true);
    });

    const upEvent = new PointerEvent("pointerup", {
      clientX: initialX + 32 + 50,
      clientY: initialY + 32 + 50,
      bubbles: true,
    });

    act(() => {
      document.dispatchEvent(upEvent);
    });

    expect(result.current.isDragging).toBe(false);
    expect(result.current.position.x).toBe(initialX + 50);
    expect(result.current.position.y).toBe(initialY + 50);

    await waitFor(
      () => {
        const saved = JSON.parse(localStorage.getItem("assistant.mascot.position") || "{}");
        expect(saved.x).toBe(initialX + 50);
        expect(saved.y).toBe(initialY + 50);
      },
      { timeout: 500 },
    );
  });

  it("constrains position when dragged beyond viewport", () => {
    mockWindowSize(mockInnerWidth, mockInnerHeight);

    const { result } = renderHook(() => useDraggableMascot());

    const initialX = result.current.position.x;
    const initialY = result.current.position.y;

    const button = {
      getBoundingClientRect: () =>
        ({
          left: initialX,
          top: initialY,
          width: mascotSize,
          height: mascotSize,
          x: initialX,
          y: initialY,
          right: initialX + mascotSize,
          bottom: initialY + mascotSize,
        }) as DOMRect,
      setPointerCapture: vi.fn(),
    } as unknown as HTMLButtonElement;

    const downEvent = {
      preventDefault: vi.fn(),
      clientX: initialX + 32,
      clientY: initialY + 32,
      pointerId: 1,
      currentTarget: button,
      nativeEvent: { pointerId: 1 },
    } as unknown as React.PointerEvent<HTMLButtonElement>;

    act(() => {
      result.current.handlePointerDown(downEvent);
    });

    const moveEvent = new PointerEvent("pointermove", {
      clientX: mockInnerWidth + 100,
      clientY: mockInnerHeight + 100,
      bubbles: true,
    });

    act(() => {
      document.dispatchEvent(moveEvent);
    });

    const maxPos = mockInnerWidth - mascotSize - minGap;
    expect(result.current.position.x).toBeLessThanOrEqual(maxPos);
    expect(result.current.position.y).toBeLessThanOrEqual(mockInnerHeight - mascotSize - minGap);
    expect(result.current.position.x).toBeGreaterThanOrEqual(minGap);
    expect(result.current.position.y).toBeGreaterThanOrEqual(minGap);
  });

  it("handles resize and re-constrains position", async () => {
    const largeWidth = 2000;
    const largeHeight = 1500;
    const smallWidth = 400;
    const smallHeight = 300;

    mockWindowSize(largeWidth, largeHeight);

    const { result } = renderHook(() => useDraggableMascot());

    const _initialX = result.current.position.x;

    mockWindowSize(smallWidth, smallHeight);

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => {
      expect(result.current.position.x).toBeLessThanOrEqual(smallWidth - mascotSize - minGap);
      expect(result.current.position.y).toBeLessThanOrEqual(smallHeight - mascotSize - minGap);
    });

    expect(result.current.position.x).toBeGreaterThanOrEqual(minGap);
    expect(result.current.position.y).toBeGreaterThanOrEqual(minGap);
  });

  it("sets wasDragged true after significant drag", async () => {
    mockWindowSize(mockInnerWidth, mockInnerHeight);

    const { result } = renderHook(() => useDraggableMascot());

    const initialX = result.current.position.x;
    const initialY = result.current.position.y;

    const button = {
      getBoundingClientRect: () =>
        ({
          left: initialX,
          top: initialY,
          width: mascotSize,
          height: mascotSize,
          x: initialX,
          y: initialY,
          right: initialX + mascotSize,
          bottom: initialY + mascotSize,
        }) as DOMRect,
      setPointerCapture: vi.fn(),
    } as unknown as HTMLButtonElement;

    const downEvent = {
      preventDefault: vi.fn(),
      clientX: initialX + 32,
      clientY: initialY + 32,
      pointerId: 1,
      currentTarget: button,
      nativeEvent: { pointerId: 1 },
    } as unknown as React.PointerEvent<HTMLButtonElement>;

    act(() => {
      result.current.handlePointerDown(downEvent);
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const moveEvent = new PointerEvent("pointermove", {
      clientX: initialX + 32 + 50,
      clientY: initialY + 32 + 50,
      bubbles: true,
    });

    act(() => {
      document.dispatchEvent(moveEvent);
    });

    await waitFor(() => {
      expect(result.current.isDragging).toBe(true);
    });

    const upEvent = new PointerEvent("pointerup", {
      clientX: initialX + 32 + 50,
      clientY: initialY + 32 + 50,
      bubbles: true,
    });

    act(() => {
      document.dispatchEvent(upEvent);
    });

    expect(result.current.wasDragged).toBe(true);
  });

  it("does not drag on movement under 5px threshold", () => {
    mockWindowSize(mockInnerWidth, mockInnerHeight);

    const { result } = renderHook(() => useDraggableMascot());

    const initialX = result.current.position.x;
    const initialY = result.current.position.y;

    const button = {
      getBoundingClientRect: () =>
        ({
          left: initialX,
          top: initialY,
          width: mascotSize,
          height: mascotSize,
          x: initialX,
          y: initialY,
          right: initialX + mascotSize,
          bottom: initialY + mascotSize,
        }) as DOMRect,
      setPointerCapture: vi.fn(),
    } as unknown as HTMLButtonElement;

    const downEvent = {
      preventDefault: vi.fn(),
      clientX: initialX + 32,
      clientY: initialY + 32,
      pointerId: 1,
      currentTarget: button,
      nativeEvent: { pointerId: 1 },
    } as unknown as React.PointerEvent<HTMLButtonElement>;

    act(() => {
      result.current.handlePointerDown(downEvent);
    });

    const smallMoveEvent = new PointerEvent("pointermove", {
      clientX: initialX + 32 + 3,
      clientY: initialY + 32 + 3,
      bubbles: true,
    });

    document.dispatchEvent(smallMoveEvent);

    expect(result.current.isDragging).toBe(false);
    expect(result.current.position.x).toBe(initialX);
    expect(result.current.position.y).toBe(initialY);
  });
});

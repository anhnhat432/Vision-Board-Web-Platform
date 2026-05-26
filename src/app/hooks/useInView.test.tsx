import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useInView } from "./useInView";

type ObserverCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;

interface MockObserver {
  callback: ObserverCallback;
  observed: Set<Element>;
  trigger: (target: Element, isIntersecting: boolean) => void;
}

const observers: MockObserver[] = [];

class IntersectionObserverMock {
  callback: ObserverCallback;
  observed = new Set<Element>();

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    const ref: MockObserver = {
      callback,
      observed: this.observed,
      trigger: (target, isIntersecting) => {
        this.callback([{ isIntersecting, target }]);
      },
    };
    observers.push(ref);
  }

  observe(target: Element) {
    this.observed.add(target);
  }
  unobserve(target: Element) {
    this.observed.delete(target);
  }
  disconnect() {
    this.observed.clear();
  }
}

function Probe({
  onUpdate,
  options,
}: {
  onUpdate: (inView: boolean) => void;
  options?: Parameters<typeof useInView>[0];
}) {
  const { ref, inView } = useInView<HTMLDivElement>(options);
  // surface inView to test via onUpdate callback
  useEffect(() => {
    onUpdate(inView);
  }, [inView, onUpdate]);
  return <div ref={ref} data-testid="target" />;
}

describe("useInView", () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts as not in view, becomes true on first intersection", () => {
    const updates: boolean[] = [];
    const { getByTestId } = render(<Probe onUpdate={(v) => updates.push(v)} />);

    expect(updates[updates.length - 1]).toBe(false);

    act(() => {
      observers[0].trigger(getByTestId("target"), true);
    });

    expect(updates[updates.length - 1]).toBe(true);
  });

  it("stops observing after first hit when once=true (default)", () => {
    const updates: boolean[] = [];
    const { getByTestId } = render(<Probe onUpdate={(v) => updates.push(v)} />);
    const target = getByTestId("target");

    act(() => {
      observers[0].trigger(target, true);
    });
    expect(observers[0].observed.has(target)).toBe(false);
  });

  it("toggles back to false when once=false and element leaves view", () => {
    const updates: boolean[] = [];
    const { getByTestId } = render(
      <Probe onUpdate={(v) => updates.push(v)} options={{ once: false }} />,
    );
    const target = getByTestId("target");

    act(() => {
      observers[0].trigger(target, true);
    });
    expect(updates[updates.length - 1]).toBe(true);

    act(() => {
      observers[0].trigger(target, false);
    });
    expect(updates[updates.length - 1]).toBe(false);
  });

  it("returns true immediately when IntersectionObserver is not available (SSR fallback)", () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("IntersectionObserver", undefined);

    const updates: boolean[] = [];
    render(<Probe onUpdate={(v) => updates.push(v)} />);

    expect(updates[updates.length - 1]).toBe(true);
  });
});

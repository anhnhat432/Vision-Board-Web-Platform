import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();

  document.querySelectorAll("[data-radix-focus-guard]").forEach((node) => {
    node.remove();
  });
  document.body.removeAttribute("data-scroll-locked");
  document.body.style.removeProperty("pointer-events");
});

// jsdom does not implement AbortSignal used by motion-dom addEventListener
const _origAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: boolean | AddEventListenerOptions,
) {
  if (options && typeof options === "object" && "signal" in options) {
    const { signal, ...rest } = options;
    return _origAddEventListener.call(this, type, listener, rest);
  }
  return _origAddEventListener.call(this, type, listener, options);
};

// jsdom does not implement URL.createObjectURL / revokeObjectURL
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "blob:mock";
}
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = () => {};
}

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

Object.defineProperty(window, "scrollTo", {
  writable: true,
  configurable: true,
  value: () => {},
});

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly scrollMargin = "0px";
  readonly thresholds = [0];

  disconnect(): void {}

  observe(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve(): void {}
}

Object.defineProperty(globalThis, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

class MockResizeObserver implements ResizeObserver {
  disconnect(): void {}

  observe(): void {}

  unobserve(): void {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

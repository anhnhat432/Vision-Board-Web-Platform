import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OfflineBanner } from "./OfflineBanner";

const SESSION_KEY = "offline-banner-dismissed";

describe("OfflineBanner", () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    originalOnLine = navigator.onLine;
    setNetworkStatus(true);
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.clear();
    }
  });

  afterEach(() => {
    setNetworkStatus(originalOnLine);
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.clear();
    }
  });

  function setNetworkStatus(isOnline: boolean) {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: isOnline,
      writable: true,
    });
  }

  function dispatchNetworkEvent(type: "online" | "offline") {
    setNetworkStatus(type === "online");
    act(() => {
      window.dispatchEvent(new Event(type));
    });
  }

  it("stays hidden while the browser is online", () => {
    render(<OfflineBanner />);

    expect(screen.queryByText(/Bạn đang ngoại tuyến/i)).not.toBeInTheDocument();
  });

  it("shows an offline warning with a dismiss action", () => {
    setNetworkStatus(false);

    render(<OfflineBanner />);

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Bạn đang ngoại tuyến");
    fireEvent.click(screen.getByRole("button", { name: "Tắt thông báo" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("uses the status token utility class instead of primitive palette colors", () => {
    setNetworkStatus(false);

    render(<OfflineBanner />);

    const banner = screen.getByRole("status");
    expect(banner.className).toContain("bg-app-status-error");
    expect(banner.className).not.toMatch(/\bbg-red-\d+\b/);

    const dismissButton = screen.getByRole("button", { name: "Tắt thông báo" });
    expect(dismissButton.className).toContain("hover:bg-app-status-error/90");
    expect(dismissButton.className).not.toMatch(/\bhover:bg-red-\d+\b/);
  });

  it("persists dismissal under the unchanged sessionStorage key", () => {
    setNetworkStatus(false);

    render(<OfflineBanner />);

    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tắt thông báo" }));
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBe("1");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows again after a new offline transition", () => {
    setNetworkStatus(false);
    render(<OfflineBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Tắt thông báo" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    dispatchNetworkEvent("online");
    dispatchNetworkEvent("offline");

    expect(screen.getByRole("status")).toHaveTextContent("Bạn đang ngoại tuyến");
  });
});

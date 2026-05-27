import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OfflineBanner } from "./OfflineBanner";

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

    expect(screen.getByRole("status")).toHaveTextContent("Bạn đang ngoại tuyến");
    fireEvent.click(screen.getByRole("button", { name: "Tắt thông báo" }));
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

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PAGE_TOUR_SEEN_STORAGE_PREFIX } from "../utils/storage-constants";
import { startPageTour, usePageTour } from "./usePageTour";

function seenKey(tourName: string) {
  return `${PAGE_TOUR_SEEN_STORAGE_PREFIX}${tourName}`;
}

function PageTourHarness({ tourName }: { tourName: string }) {
  const { isTourOpen, setIsTourOpen, startTour } = usePageTour(tourName);

  return (
    <div>
      <p data-testid="tour-state">{isTourOpen ? "open" : "closed"}</p>
      <button type="button" onClick={() => startTour({ force: true })}>
        Mở lại tour
      </button>
      <button type="button" onClick={() => setIsTourOpen(false)}>
        Đóng tour
      </button>
    </div>
  );
}

describe("usePageTour", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("consumes a pending first-run tour request and does not auto-open it again", async () => {
    startPageTour("dashboard");

    render(<PageTourHarness tourName="dashboard" />);

    await waitFor(() => {
      expect(screen.getByTestId("tour-state")).toHaveTextContent("open");
    });
    expect(localStorage.getItem(seenKey("dashboard"))).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Đóng tour" }));
    expect(screen.getByTestId("tour-state")).toHaveTextContent("closed");

    act(() => {
      startPageTour("dashboard");
    });

    expect(screen.getByTestId("tour-state")).toHaveTextContent("closed");

    fireEvent.click(screen.getByRole("button", { name: "Mở lại tour" }));
    await waitFor(() => {
      expect(screen.getByTestId("tour-state")).toHaveTextContent("open");
    });
  });

  it("drops stale pending tour requests so old route events do not surprise users later", () => {
    vi.useFakeTimers();
    startPageTour("old-dashboard");

    act(() => {
      vi.advanceTimersByTime(8_500);
    });

    render(<PageTourHarness tourName="old-dashboard" />);

    expect(screen.getByTestId("tour-state")).toHaveTextContent("closed");
    expect(localStorage.getItem(seenKey("old-dashboard"))).toBeNull();
  });
});

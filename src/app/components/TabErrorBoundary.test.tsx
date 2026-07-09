import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const monitoringMock = vi.hoisted(() => ({
  captureFrontendException: vi.fn(),
}));

vi.mock("@/lib/monitoring/sentry", () => ({
  captureFrontendException: monitoringMock.captureFrontendException,
}));

import { TabErrorBoundary } from "./TabErrorBoundary";

function ThrowingTab({ message }: { message: string }): never {
  throw new Error(message);
}

function stringifyBoundaryConsoleCalls(calls: unknown[][]): string {
  return calls
    .filter((args) => String(args[0]).startsWith("TabErrorBoundary caught"))
    .map((args) =>
      args
        .map((arg) => {
          if (arg instanceof Error) return arg.message;
          if (typeof arg === "object") return JSON.stringify(arg);
          return String(arg);
        })
        .join(" "),
    )
    .join("\n");
}

describe("TabErrorBoundary", () => {
  afterEach(() => {
    monitoringMock.captureFrontendException.mockReset();
    vi.restoreAllMocks();
  });

  it("keeps raw tab exception details out of the fallback UI, boundary console log, and monitoring context", () => {
    const rawSecret = "password=CorrectHorseBatteryStaple";
    const rawEmail = "buyer@example.test";
    const rawHost = "internal-db.local";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <TabErrorBoundary fallbackTitle="Tab Hôm nay gặp lỗi">
        <ThrowingTab message={`fetch failed for ${rawEmail} at ${rawHost} with ${rawSecret}`} />
      </TabErrorBoundary>,
    );

    expect(screen.getByText("Tab Hôm nay gặp lỗi")).toBeInTheDocument();
    expect(screen.getByText("Phần này không tải được. Hãy thử lại.")).toBeInTheDocument();
    const visibleText = document.body.textContent ?? "";
    expect(visibleText).not.toContain(rawSecret);
    expect(visibleText).not.toContain(rawEmail);
    expect(visibleText).not.toContain(rawHost);

    const boundaryLog = stringifyBoundaryConsoleCalls(consoleError.mock.calls);
    expect(boundaryLog).not.toContain(rawSecret);
    expect(boundaryLog).not.toContain(rawEmail);
    expect(boundaryLog).not.toContain(rawHost);

    expect(monitoringMock.captureFrontendException).toHaveBeenCalledTimes(1);
    const [, monitoringContext] = monitoringMock.captureFrontendException.mock.calls[0];
    const serializedContext = JSON.stringify(monitoringContext);
    expect(serializedContext).toContain("TabErrorBoundary");
    expect(serializedContext).not.toContain(rawSecret);
    expect(serializedContext).not.toContain(rawEmail);
    expect(serializedContext).not.toContain(rawHost);
  });

  it("keeps retry behavior by resetting the boundary state", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let shouldThrow = true;
    function RecoverableTab() {
      if (shouldThrow) {
        throw new Error("temporary tab crash");
      }

      return <div>Tab content recovered</div>;
    }

    render(
      <TabErrorBoundary>
        <RecoverableTab />
      </TabErrorBoundary>,
    );

    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(screen.getByText("Tab content recovered")).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
  });
});

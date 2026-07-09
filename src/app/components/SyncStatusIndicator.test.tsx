import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SYNC_STATUS } from "@/app/utils/user-facing-copy";
import { SyncStatusIndicator } from "./SyncStatusIndicator";

describe("SyncStatusIndicator", () => {
  it("renders the retry control on error and calls onRetry when clicked (Req 6.6, 6.7)", () => {
    const onRetry = vi.fn();
    render(<SyncStatusIndicator status="error" onRetry={onRetry} />);

    // Trạng thái error hiển thị nhãn error và control "Thử lại" (Req 6.6).
    expect(screen.getByText(SYNC_STATUS.error)).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: /Thử lại/ });
    expect(retryButton).toBeInTheDocument();

    // Kích hoạt control thử lại → onRetry được gọi (Req 6.7).
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render the retry control on error when onRetry is not provided", () => {
    render(<SyncStatusIndicator status="error" />);

    expect(screen.getByText(SYNC_STATUS.error)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders nothing when status is null (demo mode / not signed in — Req 6.8)", () => {
    const { container } = render(<SyncStatusIndicator status={null} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["synced", SYNC_STATUS.synced],
    ["syncing", SYNC_STATUS.syncing],
    ["offline", SYNC_STATUS.offline],
  ] as const)(
    "renders the %s label without a retry control (Req 6.1)",
    (status, label) => {
      render(<SyncStatusIndicator status={status} onRetry={vi.fn()} />);

      expect(screen.getByText(label)).toBeInTheDocument();
      // Chỉ trạng thái error mới có control thử lại.
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      // Trạng thái không phải error dùng role="status" (Req 6.1).
      expect(screen.getByRole("status")).toHaveAttribute(
        "data-sync-status",
        status,
      );
    },
  );

  it("exposes the resolved status via data attribute and testId", () => {
    render(<SyncStatusIndicator status="error" testId="sync-indicator" />);

    const indicator = screen.getByTestId("sync-indicator");
    expect(indicator).toHaveAttribute("data-sync-status", "error");
    // Trạng thái error dùng role="alert" (Req 6.6).
    expect(indicator).toHaveAttribute("role", "alert");
  });
});

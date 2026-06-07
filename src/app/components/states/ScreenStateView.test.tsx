import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmptyState } from "./EmptyState";
import { ScreenStateView } from "./ScreenStateView";

describe("ScreenStateView", () => {
  const empty = <EmptyState title="Chưa có dữ liệu" testId="empty-node" />;

  it("chỉ render khung loading khi state là loading", () => {
    render(
      <ScreenStateView state="loading" empty={empty}>
        <p>nội dung thật</p>
      </ScreenStateView>,
    );

    expect(document.querySelector('[data-screen-state="loading"]')).not.toBeNull();
    expect(screen.queryByText("nội dung thật")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-node")).not.toBeInTheDocument();
  });

  it("chỉ render empty-state khi state là empty", () => {
    render(
      <ScreenStateView state="empty" empty={empty}>
        <p>nội dung thật</p>
      </ScreenStateView>,
    );

    expect(screen.getByTestId("empty-node")).toBeInTheDocument();
    expect(screen.queryByText("nội dung thật")).not.toBeInTheDocument();
  });

  it("render khối lỗi dùng chung kèm control thử lại khi state là error", () => {
    const onRetry = vi.fn();
    render(
      <ScreenStateView state="error" empty={empty} onRetry={onRetry}>
        <p>nội dung thật</p>
      </ScreenStateView>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("nội dung thật")).not.toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /Thử lại/i });
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("không render nút thử lại khi không có onRetry", () => {
    render(
      <ScreenStateView state="error" empty={empty}>
        <p>nội dung thật</p>
      </ScreenStateView>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Thử lại/i })).not.toBeInTheDocument();
  });

  it("render nội dung thật khi state là ready", () => {
    render(
      <ScreenStateView state="ready" empty={empty}>
        <p>nội dung thật</p>
      </ScreenStateView>,
    );

    expect(screen.getByText("nội dung thật")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-node")).not.toBeInTheDocument();
  });
});

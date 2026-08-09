import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AvailableNextWeekHandoffPreview, NextWeekHandoffPreview } from "@/features/plan12week/logic";

import {
  WeeklyReviewNextWeekHandoff,
  type WeeklyReviewNextWeekHandoffResult,
} from "./WeeklyReviewNextWeekHandoff";

function makePreview(overrides: Partial<AvailableNextWeekHandoffPreview> = {}): AvailableNextWeekHandoffPreview {
  return {
    status: "available",
    reviewedWeekNumber: 4,
    nextWeekNumber: 5,
    currentPriority: "Focus 5",
    proposedPriority: "Ship portfolio",
    priorityWillChange: true,
    workloadDecision: "reduce slightly",
    currentLoadPreference: "balanced",
    proposedLoadPreference: "lighter",
    affectedOptionalTaskCount: 2,
    workloadWillChange: true,
    ...overrides,
  };
}

function appliedResult(syncStatus: "synced" | "pending" = "synced"): WeeklyReviewNextWeekHandoffResult {
  return {
    status: "applied",
    syncStatus,
  };
}

describe("WeeklyReviewNextWeekHandoff", () => {
  it("shows exact effects and can decline without invoking plan mutation", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<WeeklyReviewNextWeekHandoff preview={makePreview()} onConfirm={onConfirm} />);

    expect(screen.getByText("Review đã lưu. Kế hoạch tuần sau chưa thay đổi.")).toBeInTheDocument();
    expect(screen.getByText("Focus 5")).toBeInTheDocument();
    expect(screen.getByText("Ship portfolio")).toBeInTheDocument();
    expect(screen.getByText(/2 việc tùy chọn/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /giữ kế hoạch hiện tại/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("Review đã lưu. Kế hoạch tuần sau được giữ nguyên.")).toBeInTheDocument();
  });

  it("requires preview selection and a final confirmation before applying once", async () => {
    const user = userEvent.setup();
    let resolveApply: ((result: WeeklyReviewNextWeekHandoffResult) => void) | undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<WeeklyReviewNextWeekHandoffResult>((resolve) => {
          resolveApply = resolve;
        }),
    );
    render(<WeeklyReviewNextWeekHandoff preview={makePreview()} onConfirm={onConfirm} />);

    expect(screen.getByRole("checkbox", { name: /đổi tiêu điểm tuần 5/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /giảm tải tùy chọn/i })).toBeChecked();
    await user.click(screen.getByRole("button", { name: /xác nhận thay đổi tuần sau/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Ship portfolio");
    const confirmButton = screen.getByRole("button", { name: /áp dụng đã chọn/i });
    await user.dblClick(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({ applyPriority: true, applyWorkload: true });
    expect(confirmButton).toBeDisabled();

    resolveApply?.(appliedResult("synced"));
    expect(await screen.findByText("Review đã lưu. Thay đổi tuần sau đã được áp dụng.")).toBeInTheDocument();
  });

  it("reports review-saved partial success and supports retry after local plan apply failure", async () => {
    const user = userEvent.setup();
    const onConfirm = vi
      .fn<() => Promise<WeeklyReviewNextWeekHandoffResult>>()
      .mockResolvedValueOnce({ status: "failed", reason: "local_save_failed" })
      .mockResolvedValueOnce(appliedResult("synced"));
    render(<WeeklyReviewNextWeekHandoff preview={makePreview()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: /xác nhận thay đổi tuần sau/i }));
    await user.click(screen.getByRole("button", { name: /áp dụng đã chọn/i }));

    expect(
      await screen.findByText("Review đã lưu. Thay đổi kế hoạch tuần sau chưa áp dụng được."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /thử áp dụng lại/i }));
    await user.click(screen.getByRole("button", { name: /áp dụng đã chọn/i }));

    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Review đã lưu. Thay đổi tuần sau đã được áp dụng.")).toBeInTheDocument();
  });

  it("reports local apply success with pending cloud sync truthfully", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(appliedResult("pending"));
    render(<WeeklyReviewNextWeekHandoff preview={makePreview()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: /xác nhận thay đổi tuần sau/i }));
    await user.click(screen.getByRole("button", { name: /áp dụng đã chọn/i }));

    expect(
      await screen.findByText(
        "Thay đổi đã áp dụng trên thiết bị này. Máy chủ chưa xác nhận và sẽ tự đồng bộ khi sẵn sàng.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps applied closure when the same reviewed week rerenders with the updated plan", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(appliedResult("synced"));
    const { rerender } = render(<WeeklyReviewNextWeekHandoff preview={makePreview()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: /xác nhận thay đổi tuần sau/i }));
    await user.click(screen.getByRole("button", { name: /áp dụng đã chọn/i }));
    expect(await screen.findByText("Review đã lưu. Thay đổi tuần sau đã được áp dụng.")).toBeInTheDocument();

    rerender(
      <WeeklyReviewNextWeekHandoff
        preview={makePreview({ currentPriority: "Ship portfolio", priorityWillChange: false })}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText("Review đã lưu. Thay đổi tuần sau đã được áp dụng.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /xác nhận thay đổi tuần sau/i })).not.toBeInTheDocument();
  });

  it("closes immediately when the next-week plan already matches and there is no workload effect", () => {
    const onConfirm = vi.fn();
    render(
      <WeeklyReviewNextWeekHandoff
        preview={makePreview({
          currentPriority: "Ship portfolio",
          priorityWillChange: false,
          workloadDecision: "keep same",
          proposedLoadPreference: "balanced",
          affectedOptionalTaskCount: 0,
          workloadWillChange: false,
        })}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText("Review đã lưu. Kế hoạch tuần sau đã khớp với lựa chọn của bạn.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /xác nhận thay đổi tuần sau/i })).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it.each<[NextWeekHandoffPreview, RegExp]>([
    [
      { status: "unavailable", reviewedWeekNumber: 12, nextWeekNumber: null, reason: "final_week" },
      /đây là tuần cuối/i,
    ],
    [
      { status: "unavailable", reviewedWeekNumber: 3, nextWeekNumber: 4, reason: "historical_review" },
      /review lịch sử/i,
    ],
  ])("renders closure without apply controls when handoff is unavailable", (preview, expectedCopy) => {
    const onConfirm = vi.fn();
    render(<WeeklyReviewNextWeekHandoff preview={preview} onConfirm={onConfirm} />);

    expect(screen.getByText(expectedCopy)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /áp dụng/i })).not.toBeInTheDocument();
  });
});

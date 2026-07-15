import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import type { NavigateFunction } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { TwelveWeekSystemNotices } from "./TwelveWeekSystemNotices";

type NoticeProps = ComponentProps<typeof TwelveWeekSystemNotices>;

function makeProps(overrides: Partial<NoticeProps> = {}): NoticeProps {
  return {
    navigate: vi.fn() as unknown as NavigateFunction,
    handleTabChange: vi.fn(),
    setActiveTab: vi.fn(),
    activePlanCode: "FREE",
    shouldShowWeeklyReviewBanner: true,
    handleSnoozeWeeklyReview: vi.fn(),
    hasIncompletePlanStructure: true,
    planHasNoLeadMetrics: true,
    planHasNoTasks: false,
    hasBackendSyncIssue: true,
    backendSyncIssueMessage: "Mất kết nối mạng",
    isBackendSyncing: false,
    handleRunOutboxSync: vi.fn(),
    activeTriggers: [],
    dismissedTriggerKind: null,
    setDismissedTriggerKind: vi.fn(),
    handleOpenUpgradeDialog: vi.fn(),
    ...overrides,
  };
}

function renderNotices(overrides: Partial<NoticeProps> = {}) {
  return render(<TwelveWeekSystemNotices {...makeProps(overrides)} />);
}

describe("TwelveWeekSystemNotices", () => {
  it("shows only the sync notice when every notice is active", () => {
    renderNotices();

    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByText("Chưa sao lưu được dữ liệu đám mây")).toBeInTheDocument();
    expect(screen.queryByText("Đến lúc chốt review tuần")).not.toBeInTheDocument();
    expect(screen.queryByText("Chu kỳ chưa đầy đủ cấu trúc")).not.toBeInTheDocument();
  });

  it("falls through from review to incomplete plan and then rescue", () => {
    const { rerender } = renderNotices({ hasBackendSyncIssue: false });
    expect(screen.getByText("Đến lúc chốt review tuần")).toBeInTheDocument();

    rerender(
      <TwelveWeekSystemNotices
        {...makeProps({ hasBackendSyncIssue: false, shouldShowWeeklyReviewBanner: false })}
      />,
    );
    expect(screen.getByText("Chu kỳ chưa đầy đủ cấu trúc")).toBeInTheDocument();

    rerender(
      <TwelveWeekSystemNotices
        {...makeProps({
          hasBackendSyncIssue: false,
          shouldShowWeeklyReviewBanner: false,
          hasIncompletePlanStructure: false,
          activeTriggers: [
            {
              kind: "missed_checkin",
              severity: "watch",
              headline: "Quay lại bằng một việc nhỏ",
              detail: "Chọn một hành động ngắn để nối lại nhịp.",
              surfacedAt: "2026-07-15T00:00:00.000Z",
            },
          ],
        })}
      />,
    );
    expect(screen.getByText("Quay lại bằng một việc nhỏ")).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });
});

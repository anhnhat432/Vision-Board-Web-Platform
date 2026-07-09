import { render, screen } from "@testing-library/react";
import type { NavigateFunction } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { TwelveWeekSystemNotices } from "./TwelveWeekSystemNotices";

function renderNotices() {
  render(
    <TwelveWeekSystemNotices
      navigate={vi.fn() as unknown as NavigateFunction}
      handleTabChange={vi.fn()}
      setActiveTab={vi.fn()}
      activePlanCode="FREE"
      shouldShowWeeklyReviewBanner={true}
      handleSnoozeWeeklyReview={vi.fn()}
      hasIncompletePlanStructure={true}
      planHasNoLeadMetrics={true}
      planHasNoTasks={false}
      hasBackendSyncIssue={true}
      backendSyncIssueMessage="Mất kết nối mạng"
      isBackendSyncing={false}
      handleRunOutboxSync={vi.fn()}
      activeTriggers={[]}
      dismissedTriggerKind={null}
      setDismissedTriggerKind={vi.fn()}
      handleOpenUpgradeDialog={vi.fn()}
    />,
  );
}

describe("TwelveWeekSystemNotices", () => {
  it("does not nest duplicate alert regions for dashboard notices", () => {
    renderNotices();

    expect(screen.getAllByRole("alert")).toHaveLength(3);
  });
});

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { listStoredPendingMutations } from "@/features/plan12week/persistence/mutationQueue";
import { readGoal, renderAppRoute, resetTestStorage, seedTwelveWeekGoal } from "@/test/app-flow-helpers";
import { WEEKLY_REVIEW_SNOOZE_STORAGE_KEY } from "./12WeekSystem";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const REVIEW_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const BANNER_TITLE = "Đến lúc chốt review tuần";
const TWENTY_THREE_HOURS_MS = 23 * 60 * 60 * 1000;

function getTodayReviewDay() {
  return REVIEW_DAYS[new Date().getDay()];
}

describe("12WeekSystem weekly review banner", () => {
  beforeEach(() => {
    resetTestStorage();
    localStorage.removeItem(WEEKLY_REVIEW_SNOOZE_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("opens the weekly review form without saving an empty review", async () => {
    const user = userEvent.setup();
    const { goalId } = seedTwelveWeekGoal({ reviewDay: getTodayReviewDay() });

    renderAppRoute("/12-week-system");

    const banner = (await screen.findByText(BANNER_TITLE)).closest('[role="alert"]');
    expect(banner).toBeInstanceOf(HTMLElement);
    if (!(banner instanceof HTMLElement)) throw new Error("Weekly review banner alert was not rendered.");
    expect(within(banner).queryByRole("button", { name: "Đã đánh giá xong tuần này" })).not.toBeInTheDocument();
    await user.click(within(banner).getByRole("button", { name: "Mở review tuần" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Mở tab Tuần" })).toHaveAttribute("aria-selected", "true");
    });
    expect(screen.queryByText(BANNER_TITLE)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xem việc hôm nay" })).toBeInTheDocument();
    const review = readGoal(goalId).twelveWeekSystem?.weeklyReviews.find((item) => item.weekNumber === 1);
    expect(review).toBeUndefined();

    const pendingReviewMutation = listStoredPendingMutations(null).find(
      (item) => item.kind === "weekly_review_upserted" && item.goalId === goalId,
    );
    expect(pendingReviewMutation).toBeUndefined();
  });

  it("snoozes the review banner for 24 hours", async () => {
    const user = userEvent.setup();
    seedTwelveWeekGoal({ reviewDay: getTodayReviewDay() });

    const firstRender = renderAppRoute("/12-week-system");

    expect(await screen.findByText(BANNER_TITLE)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Nhắc lại sau 24h" }));

    await waitFor(() => {
      expect(screen.queryByText(BANNER_TITLE)).not.toBeInTheDocument();
    });
    const snoozeUntil = Number(localStorage.getItem(WEEKLY_REVIEW_SNOOZE_STORAGE_KEY));
    expect(snoozeUntil).toBeGreaterThan(Date.now() + TWENTY_THREE_HOURS_MS);

    firstRender.ui.unmount();
    renderAppRoute("/12-week-system");

    await screen.findByText("Ship flow 12 tuần");
    expect(screen.queryByText(BANNER_TITLE)).not.toBeInTheDocument();
  });

  it("shows the review banner after snooze expires", async () => {
    seedTwelveWeekGoal({ reviewDay: getTodayReviewDay() });
    localStorage.setItem(WEEKLY_REVIEW_SNOOZE_STORAGE_KEY, String(Date.now() - 1000));

    renderAppRoute("/12-week-system");

    expect(await screen.findByText(BANNER_TITLE)).toBeInTheDocument();
  });

  it("renders setup success as a keyboard-dismissible dialog", async () => {
    const user = userEvent.setup();
    seedTwelveWeekGoal({ title: "Accessible success goal" });
    localStorage.setItem("show_12week_setup_success", "true");

    renderAppRoute("/12-week-system");

    const dialog = await screen.findByRole("dialog", { name: /Thiết lập kế hoạch thành công/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByText("Accessible success goal")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Bắt đầu hành động hôm nay/i })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Thiết lập kế hoạch thành công/i })).not.toBeInTheDocument();
    });
  });

  it("renders the compact cockpit shell without the full core-flow progress", async () => {
    seedTwelveWeekGoal({ reviewDay: "Wednesday" });

    renderAppRoute("/12-week-system");

    expect(await screen.findByTestId("twelve-week-command-bar")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Tiến độ đường chính" })).not.toBeInTheDocument();

    const cockpitNavigation = screen.getByRole("navigation", { name: "Điều hướng hệ 12 tuần" });
    expect(cockpitNavigation).toHaveClass("sticky");
    expect(within(cockpitNavigation).getByRole("tablist")).toHaveClass("grid", "grid-cols-4");
    expect(screen.getByTestId("twelve-week-notice-slot")).toBeInTheDocument();
  });
});

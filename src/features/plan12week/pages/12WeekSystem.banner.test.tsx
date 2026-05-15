import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

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

  it("marks the current weekly review completed and hides the banner", async () => {
    const user = userEvent.setup();
    const { goalId } = seedTwelveWeekGoal({ reviewDay: getTodayReviewDay() });

    renderAppRoute("/12-week-system");

    expect(await screen.findByText(BANNER_TITLE)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Đã đánh giá xong tuần này" }));

    await waitFor(() => {
      expect(screen.queryByText(BANNER_TITLE)).not.toBeInTheDocument();
    });
    const review = readGoal(goalId).twelveWeekSystem?.weeklyReviews.find((item) => item.weekNumber === 1);
    expect(review?.reviewCompleted).toBe(true);
    expect(Number.isFinite(Date.parse(review?.lastReviewAt ?? ""))).toBe(true);
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
});

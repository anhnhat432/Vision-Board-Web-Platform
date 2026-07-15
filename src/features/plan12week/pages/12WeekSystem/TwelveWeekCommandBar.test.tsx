import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import type { Goal, TwelveWeekSystem } from "@/app/utils/storage-types";

import { TwelveWeekCommandBar } from "./TwelveWeekCommandBar";

const system: TwelveWeekSystem = {
  goalType: "Project Completion",
  vision12Week: "Ra mắt portfolio",
  lagMetric: { name: "Đơn chất lượng", unit: "đơn", target: "20", currentValue: "4" },
  leadIndicators: [],
  milestones: { week4: "Draft", week8: "Publish", week12: "Apply" },
  successEvidence: "20 đơn chất lượng",
  reviewDay: "Sunday",
  week12Outcome: "Portfolio live",
  startDate: "2026-05-25",
  endDate: "2026-08-16",
  timezone: "Asia/Ho_Chi_Minh",
  weekStartsOn: "Monday",
  status: "active",
  currentWeek: 8,
  totalWeeks: 12,
  weeklyPlans: [],
  taskInstances: [],
  dailyCheckIns: [],
  weeklyReviews: [],
  scoreboard: [],
};

const goal = {
  id: "goal_1",
  category: "Career",
  title: "Ra mắt portfolio mới và nộp 20 đơn ứng tuyển chất lượng",
  description: "",
  deadline: "2026-08-16",
  tasks: [],
  createdAt: "2026-05-25T00:00:00.000Z",
  twelveWeekSystem: system,
} satisfies Goal;

function renderBar(overrides: Partial<ComponentProps<typeof TwelveWeekCommandBar>> = {}) {
  const props: ComponentProps<typeof TwelveWeekCommandBar> = {
    activeGoal: goal,
    system,
    activePlanCode: "FREE",
    currentWeek: 8,
    syncBadgeClassName: "border-app-accent/20 bg-app-accent-soft text-app-accent",
    syncBadgeLabel: "Đã đồng bộ",
    weekCompletion: { completed: 3, total: 5, percent: 60 },
    todayCompletedCount: 1,
    todayRemainingCount: 2,
    reviewDueToday: false,
    onPrimaryAction: vi.fn(),
    onOpenGoals: vi.fn(),
    onExit: vi.fn(),
    onRenameGoal: vi.fn(),
    ...overrides,
  };

  render(<TwelveWeekCommandBar {...props} />);
  return props;
}

describe("TwelveWeekCommandBar", () => {
  it("owns the page heading and exposes cycle, week, and today progress", () => {
    renderBar();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ra mắt portfolio");
    expect(screen.getByLabelText("Tiến độ chu kỳ: tuần 8 trên 12")).toBeInTheDocument();
    expect(screen.getByLabelText("Tiến độ tuần này: 60%")).toBeInTheDocument();
    expect(screen.getByLabelText("Việc hôm nay: hoàn thành 1 trên 3")).toBeInTheDocument();
  });

  it("keeps sync, exit, guide, goal switcher, and primary actions reachable", async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    const onPrimaryAction = vi.fn();
    const onOpenGoals = vi.fn();
    renderBar({
      onExit,
      onPrimaryAction,
      onOpenGoals,
      guideControl: <button type="button">Cách dùng</button>,
      goalSwitcher: <button type="button">Đổi mục tiêu</button>,
    });

    const bar = screen.getByTestId("twelve-week-command-bar");
    expect(within(bar).getByRole("status")).toHaveTextContent("Đã đồng bộ");
    expect(within(bar).getByRole("button", { name: "Cách dùng" })).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Đổi mục tiêu" })).toBeInTheDocument();

    await user.click(within(bar).getByRole("button", { name: "Thoát cockpit" }));
    await user.click(within(bar).getByRole("button", { name: "Xem việc hôm nay" }));
    await user.click(within(bar).getByRole("button", { name: "Mở mục tiêu" }));

    expect(onExit).toHaveBeenCalledOnce();
    expect(onPrimaryAction).toHaveBeenCalledOnce();
    expect(onOpenGoals).toHaveBeenCalledOnce();
  });

  it("uses a compact responsive surface instead of the retired gradient hero", () => {
    renderBar();

    const bar = screen.getByTestId("twelve-week-command-bar");
    expect(bar).toHaveClass("rounded-[22px]", "px-4", "py-4", "sm:px-6", "sm:py-5");
    expect(bar).not.toHaveClass("bg-gradient-to-br", "text-white");
  });
});

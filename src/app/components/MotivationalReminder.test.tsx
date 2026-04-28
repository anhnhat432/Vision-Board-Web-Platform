import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MotivationalReminder } from "./MotivationalReminder";

const storageMock = vi.hoisted(() => ({
  getInAppReminders: vi.fn(),
  getRandomMotivationalQuote: vi.fn(() => "Keep going."),
}));

vi.mock("../utils/storage", () => ({
  getInAppReminders: storageMock.getInAppReminders,
  getRandomMotivationalQuote: storageMock.getRandomMotivationalQuote,
}));

const dueReminder = {
  id: "reminder_tasks_goal_1_2026-04-28",
  title: "2 việc đang đợi trong hôm nay",
  description: "Tập trung vào việc đầu tiên.",
  href: "/12-week-system",
  kind: "tasks" as const,
  goalId: "goal_1",
};

function renderReminder(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MotivationalReminder />
    </MemoryRouter>,
  );
}

describe("MotivationalReminder", () => {
  beforeEach(() => {
    localStorage.clear();
    storageMock.getInAppReminders.mockReturnValue([dueReminder]);
    storageMock.getRandomMotivationalQuote.mockClear();
  });

  it("shows a due reminder when the user is away from the target route", async () => {
    renderReminder("/");

    expect(await screen.findByText(dueReminder.title)).toBeInTheDocument();
    expect(screen.getByText(dueReminder.description)).toBeInTheDocument();
  });

  it("does not cover the destination page with the same reminder", () => {
    renderReminder("/12-week-system");

    expect(screen.queryByText(dueReminder.title)).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(localStorage.getItem("last_reminder_date")).toBeNull();
  });
});

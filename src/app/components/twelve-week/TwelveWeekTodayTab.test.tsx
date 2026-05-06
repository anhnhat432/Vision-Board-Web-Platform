import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TwelveWeekTodayTab } from "./TwelveWeekTodayTab";
import type { TwelveWeekTaskInstance, TwelveWeekSystem, UniversalDailyCheckIn } from "@/app/utils/storage-types";
import type { ComponentProps } from "react";

type TodayTabProps = ComponentProps<typeof TwelveWeekTodayTab>;

function makeTask(overrides: Partial<TwelveWeekTaskInstance> = {}): TwelveWeekTaskInstance {
  return {
    id: overrides.id ?? "task_1",
    weekNumber: overrides.weekNumber ?? 1,
    scheduledDate: overrides.scheduledDate ?? "2026-05-02",
    title: overrides.title ?? "Viết draft 800 từ",
    leadIndicatorName: overrides.leadIndicatorName ?? "Viết blog",
    isCore: overrides.isCore ?? true,
    completed: overrides.completed ?? false,
    completedAt: overrides.completedAt,
    tacticId: overrides.tacticId,
    rescheduledFrom: overrides.rescheduledFrom,
  };
}

function makeSystem(): TwelveWeekSystem {
  return {
    goalType: "Habit Building",
    vision12Week: "Vision",
    lagMetric: { name: "Số bài blog", unit: "bài", target: "12", currentValue: "0" },
    leadIndicators: [],
    milestones: { week4: "", week8: "", week12: "" },
    successEvidence: "",
    reviewDay: "Sunday",
    week12Outcome: "",
    startDate: "2026-04-27",
    endDate: "2026-07-19",
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    currentWeek: 1,
    totalWeeks: 12,
    weeklyPlans: [],
    taskInstances: [],
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: [],
  };
}

function makeProps(overrides: Partial<TodayTabProps> = {}): TodayTabProps {
  const todayQueue = overrides.todayQueue ?? [makeTask()];
  const firstPriorityTask =
    overrides.firstPriorityTask !== undefined ? overrides.firstPriorityTask : (todayQueue[0] ?? null);

  const { todayQueue: _omitQueue, firstPriorityTask: _omitPrimary, ...rest } = overrides;
  void _omitQueue;
  void _omitPrimary;

  return {
    system: makeSystem(),
    currentWeek: overrides.currentWeek ?? 3,
    currentWeekRange: overrides.currentWeekRange ?? { start: "2026-04-27", end: "2026-05-03" },
    currentPlanFocus: overrides.currentPlanFocus ?? "",
    reviewDueToday: false,
    reviewStatusLabel: "",
    currentWeekScoreValue: 0,
    weekCompletion: { completed: 0, total: 5, percent: 0 },
    coreTacticCount: 1,
    optionalTacticCount: 0,
    missedTasks: [],
    currentWeekTasksCount: todayQueue.filter((task) => !task.completed).length,
    todayDateKey: "2026-05-02",
    todayCompletedCount: todayQueue.filter((task) => task.completed).length,
    todayRemainingCount: todayQueue.filter((task) => !task.completed).length,
    overdueOpenCount: 0,
    optionalOpenThisWeekCount: 0,
    hasPlanTasks: todayQueue.length > 0,
    hasLeadMetrics: true,
    secondaryTodayTasks: [],
    hasSmartRescue: false,
    rescuePlanSummary: null,
    dailyMood: "steady",
    dailyNote: "",
    latestCheckIn: null,
    onReentry: vi.fn(),
    onApplyRecommendedReentry: vi.fn(),
    onOpenSmartRescue: vi.fn(),
    onToggleTask: vi.fn(),
    onDailyMoodChange: vi.fn(),
    onDailyNoteChange: vi.fn(),
    onSaveCheckIn: vi.fn(),
    ...rest,
    todayQueue,
    firstPriorityTask,
  };
}

describe("TwelveWeekTodayTab — primary task hero", () => {
  it("renders 'Việc quan trọng nhất hôm nay' headline when there is an open primary task", () => {
    render(<TwelveWeekTodayTab {...makeProps()} />);
    expect(screen.getByTestId("today-primary-hero")).toBeInTheDocument();
    expect(screen.getByText(/Việc quan trọng nhất hôm nay/i)).toBeInTheDocument();
  });

  it("displays the primary task title and lead indicator name in the hero", () => {
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [makeTask({ title: "Viết draft 800 từ", leadIndicatorName: "Viết blog" })],
        })}
      />,
    );
    const hero = screen.getByTestId("today-primary-hero");
    expect(hero).toHaveTextContent("Viết draft 800 từ");
    expect(hero).toHaveTextContent("Viết blog");
  });

  it("shows the 'hôm nay đã đủ' messaging in the hero", () => {
    render(<TwelveWeekTodayTab {...makeProps()} />);
    expect(screen.getByText(/Chỉ cần xong việc này là hôm nay đã đủ/i)).toBeInTheDocument();
  });

  it("does not render the hero when there is no primary task", () => {
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [],
          firstPriorityTask: null,
        })}
      />,
    );
    expect(screen.queryByTestId("today-primary-hero")).toBeNull();
  });

  it("does not render the hero when the primary task is already completed", () => {
    const completed = makeTask({ completed: true });
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [completed],
          firstPriorityTask: completed,
        })}
      />,
    );
    expect(screen.queryByTestId("today-primary-hero")).toBeNull();
  });
});

describe("TwelveWeekTodayTab — overdue rescue copy", () => {
  it("shows rescue guidance text in hero when primary task is overdue", () => {
    const overdueTask = makeTask({ scheduledDate: "2026-04-30" });
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [overdueTask],
          firstPriorityTask: overdueTask,
          todayDateKey: "2026-05-02",
        })}
      />,
    );
    const hero = screen.getByTestId("today-primary-hero");
    expect(hero).toHaveTextContent(/đang trễ/i);
    expect(hero).toHaveTextContent(/phiên bản gọn nhất/i);
  });

  it("uses non-overdue copy when primary task is scheduled for today", () => {
    render(<TwelveWeekTodayTab {...makeProps()} />);
    const hero = screen.getByTestId("today-primary-hero");
    expect(hero).toHaveTextContent(/việc lặp lại/i);
    expect(hero).not.toHaveTextContent(/phiên bản gọn nhất/i);
  });
});

describe("TwelveWeekTodayTab — empty Today state", () => {
  it("offers 'Mở tab Tuần' CTA when there are no tasks today but the plan has tasks", async () => {
    const onOpenWeekTab = vi.fn();
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [],
          firstPriorityTask: null,
          hasPlanTasks: true,
          reviewDueToday: true,
          onOpenWeekTab,
        })}
      />,
    );

    const cta = screen.getByRole("button", { name: /Mở tab Tuần/i });
    await userEvent.click(cta);
    expect(onOpenWeekTab).toHaveBeenCalledTimes(1);
  });

  it("offers Setup CTA when plan has no tasks at all", async () => {
    const onNavigateToSetup = vi.fn();
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [],
          firstPriorityTask: null,
          hasPlanTasks: false,
          hasLeadMetrics: false,
          onNavigateToSetup,
        })}
      />,
    );

    const cta = screen.getByRole("button", { name: /Đi tới Setup/i });
    await userEvent.click(cta);
    expect(onNavigateToSetup).toHaveBeenCalledTimes(1);
  });

  it("renders 'Mở Setup để chỉnh' when plan has lead metrics but no tasks", () => {
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [],
          firstPriorityTask: null,
          hasPlanTasks: false,
          hasLeadMetrics: true,
          onNavigateToSetup: vi.fn(),
        })}
      />,
    );
    expect(screen.getByRole("button", { name: /Mở Setup để chỉnh/i })).toBeInTheDocument();
  });
});

describe("TwelveWeekTodayTab — completion nudge & check-in", () => {
  it("shows the 'Việc chính đã xong' nudge when primary task is completed", () => {
    const completed = makeTask({ completed: true });
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [completed],
          firstPriorityTask: completed,
          todayCompletedCount: 1,
        })}
      />,
    );
    expect(screen.getByTestId("today-primary-done-nudge")).toBeInTheDocument();
  });

  it("does not show the completion nudge when primary task is still open", () => {
    render(<TwelveWeekTodayTab {...makeProps()} />);
    expect(screen.queryByTestId("today-primary-done-nudge")).toBeNull();
  });

  it("renders cleaner check-in description (no duplicate 'tick việc' instruction)", () => {
    render(<TwelveWeekTodayTab {...makeProps()} />);
    // New copy is short and doesn't duplicate the tick instruction
    expect(screen.getByText(/Chọn năng lượng và ghi 1 ý ngắn/i)).toBeInTheDocument();
    expect(screen.queryByText(/Tick việc, chọn năng lượng/i)).toBeNull();
  });

  it("calls onToggleTask when user toggles a task in the queue", async () => {
    const onToggleTask = vi.fn();
    render(<TwelveWeekTodayTab {...makeProps({ onToggleTask })} />);
    const checkbox = screen.getAllByRole("checkbox")[0];
    await userEvent.click(checkbox);
    expect(onToggleTask).toHaveBeenCalled();
  });

  it("calls onSaveCheckIn when 'Lưu check-in hôm nay' button is clicked", async () => {
    const onSaveCheckIn = vi.fn();
    render(<TwelveWeekTodayTab {...makeProps({ onSaveCheckIn })} />);
    const buttons = screen.getAllByRole("button", { name: /Lưu check-in hôm nay/i });
    await userEvent.click(buttons[0]);
    expect(onSaveCheckIn).toHaveBeenCalledTimes(1);
  });
});

describe("TwelveWeekTodayTab — rescue mode nudge", () => {
  const baseStatus = {
    severity: "gentle" as const,
    triggers: ["overdue-tasks"] as Array<
      | "overdue-tasks"
      | "no-completion-streak"
      | "missed-checkins"
      | "low-week-completion-near-end"
      | "weekly-review-missed"
    >,
    daysSinceLastCompletion: null,
    daysSinceLastCheckIn: null,
    daysRemainingInWeek: 2,
  };

  it("does not render the rescue nudge when severity is 'none'", () => {
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          rescueStatus: {
            severity: "none",
            triggers: [],
            daysSinceLastCompletion: null,
            daysSinceLastCheckIn: null,
            daysRemainingInWeek: null,
          },
        })}
      />,
    );
    expect(screen.queryByTestId("today-rescue-nudge")).toBeNull();
  });

  it("does not render the rescue nudge when rescueStatus is omitted (backwards compat)", () => {
    render(<TwelveWeekTodayTab {...makeProps()} />);
    expect(screen.queryByTestId("today-rescue-nudge")).toBeNull();
  });

  it("renders the rescue nudge when severity is gentle", () => {
    render(<TwelveWeekTodayTab {...makeProps({ rescueStatus: { ...baseStatus } })} />);
    const nudge = screen.getByTestId("today-rescue-nudge");
    expect(nudge).toBeInTheDocument();
    expect(nudge).toHaveAttribute("data-rescue-severity", "gentle");
  });

  it("shows at least one suggestion in the rescue nudge", () => {
    render(<TwelveWeekTodayTab {...makeProps({ rescueStatus: { ...baseStatus } })} />);
    const list = screen.getByTestId("today-rescue-suggestions");
    expect(list).toBeInTheDocument();
    expect(list.children.length).toBeGreaterThan(0);
    expect(list.children.length).toBeLessThanOrEqual(3);
  });

  it("does not display any raw task title inside the rescue nudge", () => {
    const taskTitle = "Viết draft 800 từ";
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [makeTask({ title: taskTitle })],
          rescueStatus: { ...baseStatus },
        })}
      />,
    );
    const nudge = screen.getByTestId("today-rescue-nudge");
    expect(nudge.textContent ?? "").not.toContain(taskTitle);
  });

  it("invokes onPickTinyTask when the user clicks the 'pick-one-tiny-task' suggestion", async () => {
    const onPickTinyTask = vi.fn();
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          rescueStatus: { ...baseStatus },
          onPickTinyTask,
        })}
      />,
    );
    const li = screen
      .getByTestId("today-rescue-suggestions")
      .querySelector('[data-suggestion-id="pick-one-tiny-task"]') as HTMLElement | null;
    expect(li).not.toBeNull();
    const button = li!.querySelector("button");
    const safeButton = button as HTMLElement;
    expect(safeButton).not.toBeNull();
    await userEvent.click(safeButton);
    expect(onPickTinyTask).toHaveBeenCalledTimes(1);
  });

  it("preserves task toggling when the rescue nudge is rendered", async () => {
    const onToggleTask = vi.fn();
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          rescueStatus: { ...baseStatus },
          onToggleTask,
        })}
      />,
    );
    const checkbox = screen.getAllByRole("checkbox")[0];
    await userEvent.click(checkbox);
    expect(onToggleTask).toHaveBeenCalled();
  });
});

describe("TwelveWeekTodayTab — first week emphasis", () => {
  it("shows 'Việc đầu tiên của tuần 1' headline when currentWeek === 1", () => {
    render(<TwelveWeekTodayTab {...makeProps({ currentWeek: 1 })} />);
    expect(screen.getByText(/Việc đầu tiên của tuần 1/i)).toBeInTheDocument();
  });

  it("renders the first-week encouragement line when currentWeek === 1", () => {
    render(<TwelveWeekTodayTab {...makeProps({ currentWeek: 1 })} />);
    expect(screen.getByTestId("today-first-week-encouragement")).toBeInTheDocument();
    expect(screen.getByTestId("today-first-week-encouragement")).toHaveTextContent(/Bắt đầu nhỏ/i);
  });

  it("does not render the first-week encouragement when currentWeek > 1", () => {
    render(<TwelveWeekTodayTab {...makeProps({ currentWeek: 5 })} />);
    expect(screen.queryByTestId("today-first-week-encouragement")).toBeNull();
  });

  it("keeps the standard hero headline when currentWeek > 1", () => {
    render(<TwelveWeekTodayTab {...makeProps({ currentWeek: 5 })} />);
    expect(screen.getByText(/Việc quan trọng nhất hôm nay/i)).toBeInTheDocument();
    expect(screen.queryByText(/Việc đầu tiên của tuần 1/i)).toBeNull();
  });

  it("continues to support task toggling on first-week plans", async () => {
    const onToggleTask = vi.fn();
    render(<TwelveWeekTodayTab {...makeProps({ currentWeek: 1, onToggleTask })} />);
    const checkbox = screen.getAllByRole("checkbox")[0];
    await userEvent.click(checkbox);
    expect(onToggleTask).toHaveBeenCalled();
  });
});

describe("TwelveWeekTodayTab — overdue task actions", () => {
  it("does not render rescue actions for an on-time task", () => {
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [makeTask({ id: "task_a", scheduledDate: "2026-05-02" })],
          todayDateKey: "2026-05-02",
          onRescheduleTaskWithinWeek: vi.fn(),
          onRescheduleTaskToNextWeek: vi.fn(),
          onSkipNonCoreTask: vi.fn(),
        })}
      />,
    );
    expect(screen.queryByTestId("overdue-actions-task_a")).toBeNull();
  });

  it("renders the 3 rescue action buttons for an overdue non-core task", () => {
    const overdue = makeTask({
      id: "task_overdue",
      scheduledDate: "2026-04-30",
      isCore: false,
    });
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [overdue],
          firstPriorityTask: overdue,
          todayDateKey: "2026-05-02",
          onRescheduleTaskWithinWeek: vi.fn(),
          onRescheduleTaskToNextWeek: vi.fn(),
          onSkipNonCoreTask: vi.fn(),
        })}
      />,
    );
    const actions = screen.getByTestId("overdue-actions-task_overdue");
    expect(actions).toBeInTheDocument();
    expect(actions.querySelector('[data-action="reschedule-within-week"]')).not.toBeNull();
    expect(actions.querySelector('[data-action="reschedule-next-week"]')).not.toBeNull();
    expect(actions.querySelector('[data-action="skip-non-core"]')).not.toBeNull();
  });

  it("hides the skip button for overdue core tasks (no accidental skip)", () => {
    const overdueCore = makeTask({
      id: "task_core",
      scheduledDate: "2026-04-30",
      isCore: true,
    });
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [overdueCore],
          firstPriorityTask: overdueCore,
          todayDateKey: "2026-05-02",
          onRescheduleTaskWithinWeek: vi.fn(),
          onRescheduleTaskToNextWeek: vi.fn(),
          onSkipNonCoreTask: vi.fn(),
        })}
      />,
    );
    const actions = screen.getByTestId("overdue-actions-task_core");
    expect(actions.querySelector('[data-action="skip-non-core"]')).toBeNull();
    expect(screen.getByTestId("overdue-core-note-task_core")).toHaveTextContent(
      /Việc cốt lõi không thể bỏ/i,
    );
  });

  it("invokes onRescheduleTaskWithinWeek with the task id when clicked", async () => {
    const onRescheduleTaskWithinWeek = vi.fn();
    const overdue = makeTask({
      id: "task_overdue",
      scheduledDate: "2026-04-30",
      isCore: false,
    });
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [overdue],
          firstPriorityTask: overdue,
          todayDateKey: "2026-05-02",
          onRescheduleTaskWithinWeek,
          onRescheduleTaskToNextWeek: vi.fn(),
          onSkipNonCoreTask: vi.fn(),
        })}
      />,
    );
    const button = screen
      .getByTestId("overdue-actions-task_overdue")
      .querySelector('[data-action="reschedule-within-week"]') as HTMLButtonElement;
    await userEvent.click(button);
    expect(onRescheduleTaskWithinWeek).toHaveBeenCalledWith("task_overdue");
  });

  it("invokes onRescheduleTaskToNextWeek with the task id when clicked", async () => {
    const onRescheduleTaskToNextWeek = vi.fn();
    const overdue = makeTask({
      id: "task_overdue",
      scheduledDate: "2026-04-30",
      isCore: false,
    });
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [overdue],
          firstPriorityTask: overdue,
          todayDateKey: "2026-05-02",
          onRescheduleTaskToNextWeek,
          onSkipNonCoreTask: vi.fn(),
        })}
      />,
    );
    const button = screen
      .getByTestId("overdue-actions-task_overdue")
      .querySelector('[data-action="reschedule-next-week"]') as HTMLButtonElement;
    await userEvent.click(button);
    expect(onRescheduleTaskToNextWeek).toHaveBeenCalledWith("task_overdue");
  });

  it("invokes onSkipNonCoreTask with the task id when clicked", async () => {
    const onSkipNonCoreTask = vi.fn();
    const overdue = makeTask({
      id: "task_overdue",
      scheduledDate: "2026-04-30",
      isCore: false,
    });
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [overdue],
          firstPriorityTask: overdue,
          todayDateKey: "2026-05-02",
          onSkipNonCoreTask,
        })}
      />,
    );
    const button = screen
      .getByTestId("overdue-actions-task_overdue")
      .querySelector('[data-action="skip-non-core"]') as HTMLButtonElement;
    await userEvent.click(button);
    expect(onSkipNonCoreTask).toHaveBeenCalledWith("task_overdue");
  });

  it("does not render any action buttons when no callbacks are provided (backwards compat)", () => {
    const overdue = makeTask({
      id: "task_overdue",
      scheduledDate: "2026-04-30",
      isCore: false,
    });
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [overdue],
          firstPriorityTask: overdue,
          todayDateKey: "2026-05-02",
        })}
      />,
    );
    expect(screen.queryByTestId("overdue-actions-task_overdue")).toBeNull();
  });

  it("preserves the existing complete checkbox toggle on overdue task rows", async () => {
    const onToggleTask = vi.fn();
    const overdue = makeTask({
      id: "task_overdue",
      scheduledDate: "2026-04-30",
      isCore: false,
    });
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [overdue],
          firstPriorityTask: overdue,
          todayDateKey: "2026-05-02",
          onToggleTask,
          onRescheduleTaskWithinWeek: vi.fn(),
          onRescheduleTaskToNextWeek: vi.fn(),
          onSkipNonCoreTask: vi.fn(),
        })}
      />,
    );
    const checkbox = screen.getAllByRole("checkbox")[0];
    await userEvent.click(checkbox);
    expect(onToggleTask).toHaveBeenCalledWith("task_overdue", true);
  });
});

describe("TwelveWeekTodayTab — preserves existing markers", () => {
  it("still renders 'Hàng việc hôm nay' card title (existing e2e tests rely on this)", () => {
    render(<TwelveWeekTodayTab {...makeProps()} />);
    expect(screen.getByText("Hàng việc hôm nay")).toBeInTheDocument();
  });

  it("does not duplicate the primary task title between hero and queue", () => {
    render(<TwelveWeekTodayTab {...makeProps()} />);
    const occurrences = screen.getAllByText("Viết draft 800 từ");
    // Once in hero, once in queue card — exactly 2
    expect(occurrences).toHaveLength(2);
  });

  it("does not duplicate the lead indicator name copy on mobile (single hero hint, single queue line)", () => {
    render(<TwelveWeekTodayTab {...makeProps()} />);
    const occurrences = screen.getAllByText(/Viết blog/);
    // Hero (interpolated string) + queue (single <p> line) = 2 occurrences max
    expect(occurrences.length).toBeLessThanOrEqual(2);
  });
});

// Basic smoke type: ensure UniversalDailyCheckIn shape stays compatible
const _checkInSample: UniversalDailyCheckIn = {
  date: "2026-05-02",
  didWorkToday: true,
  whichLeadIndicatorWorkedOn: "",
  amountDone: "",
  outputCreated: "",
  obstacleOrIssue: "",
  dailySelfRating: 0,
  optionalNote: "",
  mood: "steady",
};
void _checkInSample;

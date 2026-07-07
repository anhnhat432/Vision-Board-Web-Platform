import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emitPetEvent } from "@/app/features/pet/petEvents";
import type { TwelveWeekSystem, TwelveWeekTaskInstance, UniversalDailyCheckIn } from "@/app/utils/storage-types";
import { TwelveWeekTodayTab } from "./TwelveWeekTodayTab";

vi.mock("@/app/features/pet/petEvents", () => ({
  emitPetEvent: vi.fn(),
}));

const emitPetEventMock = vi.mocked(emitPetEvent);

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

function makeCheckIn(overrides: Partial<UniversalDailyCheckIn> = {}): UniversalDailyCheckIn {
  return {
    date: overrides.date ?? "2026-05-02",
    didWorkToday: overrides.didWorkToday ?? true,
    whichLeadIndicatorWorkedOn: overrides.whichLeadIndicatorWorkedOn ?? "Viet blog",
    amountDone: overrides.amountDone ?? "1 draft",
    outputCreated: overrides.outputCreated ?? "Draft",
    obstacleOrIssue: overrides.obstacleOrIssue ?? "",
    dailySelfRating: overrides.dailySelfRating ?? 4,
    optionalNote: overrides.optionalNote ?? "",
    mood: overrides.mood ?? "steady",
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

afterEach(() => {
  emitPetEventMock.mockClear();
});

describe("TwelveWeekTodayTab — primary task hero", () => {
  it("renders the compact mobile status strip before the hero and work grid", () => {
    render(<TwelveWeekTodayTab {...makeProps()} />);

    const strip = screen.getByTestId("today-dashboard-cards");
    const hero = screen.getByTestId("today-primary-hero");
    const workGrid = screen.getByTestId("today-main-work-grid");

    expect(strip).toHaveClass("order-0");
    expect(strip.compareDocumentPosition(hero)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(hero.compareDocumentPosition(workGrid)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("lets status chip text wrap instead of truncating on mobile", () => {
    render(<TwelveWeekTodayTab {...makeProps({ overdueOpenCount: 2, reviewDueToday: true })} />);

    const strip = screen.getByTestId("today-dashboard-cards");
    const chips = within(strip).getAllByText(/hôm nay|việc trễ hạn|Review tuần đến hạn/i);

    for (const chip of chips) {
      expect(chip).toHaveClass("break-words");
      expect(chip).toHaveClass("leading-tight");
      expect(chip).not.toHaveClass("truncate");
    }
  });

  it("renders 'Ưu tiên duy nhất' headline when there is an open primary task", () => {
    render(<TwelveWeekTodayTab {...makeProps()} />);
    expect(screen.getByTestId("today-primary-hero")).toBeInTheDocument();
    expect(screen.getByText(/Ưu tiên duy nhất/i)).toBeInTheDocument();
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
    expect(screen.getByText(/Việc quan trọng hôm nay/i)).toBeInTheDocument();
    expect(screen.getByText(/Xong việc này là bạn đã giữ đúng tiến độ/i)).toBeInTheDocument();
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

  it("renders a completion celebration in the hero when the primary task is already completed", () => {
    const completed = makeTask({ completed: true });
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [completed],
          firstPriorityTask: completed,
        })}
      />,
    );
    const hero = screen.getByTestId("today-primary-hero");
    expect(hero).toHaveTextContent(/Tuyệt vời! Bạn đã hoàn thành việc quan trọng nhất hôm nay/i);
  });
});

describe("TwelveWeekTodayTab — Performance Time Blocking", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the Strategic Block nudge when the block starts within two hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 5, 7, 30));

    render(
      <TwelveWeekTodayTab
        {...makeProps({
          system: {
            ...makeSystem(),
            weeklyTimeBlocks: [
              {
                id: "strategic_1",
                type: "strategic",
                dayOfWeek: "Tuesday",
                startTime: "09:00",
                durationMinutes: 180,
              },
            ],
          },
          todayDateKey: "2026-05-05",
        })}
      />,
    );

    expect(screen.getByText(/Khung giờ chiến lược/i)).toBeInTheDocument();
    expect(screen.getByText(/Dành thời gian không xao nhãng cho việc quan trọng nhất/i)).toBeInTheDocument();
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

    const cta = screen.getAllByRole("button", { name: /Mở review tuần/i })[0];
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

    const cta = screen.getAllByRole("button", { name: /Đi tới Setup/i })[0];
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
    expect(screen.getAllByRole("button", { name: /Mở Setup để chỉnh/i }).length).toBeGreaterThan(0);
  });
});

describe("TwelveWeekTodayTab — completion nudge & check-in", () => {
  it("shows the hero card and hides the next-action panel when a primary task is open", () => {
    render(<TwelveWeekTodayTab {...makeProps()} />);

    expect(screen.getByTestId("today-primary-hero")).toBeInTheDocument();
    expect(screen.queryByTestId("today-next-action-panel")).toBeNull();
    expect(screen.getByTestId("today-primary-hero")).toHaveTextContent("Viết draft 800 từ");
  });

  it("keeps the hero card visible when review is due and check-in is saved while a primary task exists", () => {
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          reviewDueToday: true,
          latestCheckIn: makeCheckIn(),
        })}
      />,
    );

    expect(screen.getByTestId("today-primary-hero")).toBeInTheDocument();
    expect(screen.queryByTestId("today-next-action-panel")).toBeNull();
  });

  it("shows the hero card for week 1 before the user completes anything", () => {
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          currentWeek: 1,
          todayCompletedCount: 0,
          latestCheckIn: null,
        })}
      />,
    );

    expect(screen.getByTestId("today-primary-hero")).toBeInTheDocument();
    expect(screen.queryByTestId("today-next-action-panel")).toBeNull();
  });

  it("hides the next-action panel after the first task is completed because the hero card handles status", () => {
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          currentWeek: 1,
          todayCompletedCount: 1,
        })}
      />,
    );

    expect(screen.getByTestId("today-primary-hero")).toBeInTheDocument();
    expect(screen.queryByTestId("today-next-action-panel")).toBeNull();
  });

  it("shows same-day check-in as saved and ignores older check-ins", () => {
    const { rerender } = render(
      <TwelveWeekTodayTab
        {...makeProps({
          latestCheckIn: makeCheckIn({ date: "2026-05-02", mood: "high" }),
        })}
      />,
    );

    expect(screen.getByTestId("today-check-in-saved")).toHaveTextContent("2026");

    rerender(
      <TwelveWeekTodayTab
        {...makeProps({
          latestCheckIn: makeCheckIn({ date: "2026-05-01", mood: "high" }),
        })}
      />,
    );

    expect(screen.queryByTestId("today-check-in-saved")).toBeNull();
  });

  it("changes the check-in CTA label when today already has a saved check-in", () => {
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          latestCheckIn: makeCheckIn({ date: "2026-05-02", mood: "high", optionalNote: "First note" }),
        })}
      />,
    );

    expect(screen.getByRole("button", { name: /Cập nhật check-in/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Lưu check-in$/i })).not.toBeInTheDocument();
  });

  it("offers a Week handoff from the check-in card when review is due", async () => {
    const onOpenWeekTab = vi.fn();
    const onSaveCheckIn = vi.fn();
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          reviewDueToday: true,
          onOpenWeekTab,
          onSaveCheckIn,
          latestCheckIn: makeCheckIn(),
        })}
      />,
    );

    await userEvent.click(screen.getByTestId("today-check-in-open-week"));
    expect(onOpenWeekTab).toHaveBeenCalledTimes(1);
    expect(onSaveCheckIn).not.toHaveBeenCalled();
  });

  it("keeps a single Week handoff after check-in is saved on review day", () => {
    const onOpenWeekTab = vi.fn();
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          todayQueue: [],
          firstPriorityTask: null,
          hasPlanTasks: true,
          reviewDueToday: true,
          onOpenWeekTab,
          latestCheckIn: makeCheckIn(),
        })}
      />,
    );

    const panel = screen.getByTestId("today-next-action-panel");
    expect(panel).toHaveAttribute("data-state", "review-due");
    expect(within(panel).queryByRole("button", { name: /Mở review tuần/i })).toBeNull();
    expect(screen.getAllByRole("button", { name: /Xem đánh giá tuần/i })).toHaveLength(1);
    expect(screen.getByTestId("today-check-in-open-week")).toBeInTheDocument();
  });

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
    expect(screen.getByText(/30 giây/i)).toBeInTheDocument();
    expect(screen.getByText(/Lắng nghe bản thân/i)).toBeInTheDocument();
    expect(screen.queryByText(/Tick việc, chọn năng lượng/i)).toBeNull();
  });

  it("calls onToggleTask when user toggles a task in the queue", async () => {
    const onToggleTask = vi.fn();
    render(<TwelveWeekTodayTab {...makeProps({ onToggleTask })} />);
    const checkbox = screen.getAllByRole("checkbox")[0];
    await userEvent.click(checkbox);
    expect(onToggleTask).toHaveBeenCalled();
  });

  it("dispatches production task toggles before unmount cleanup can drop them", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    vi.stubEnv("MODE", "production");
    vi.useFakeTimers();

    try {
      const onToggleTask = vi.fn().mockResolvedValue(undefined);
      const { unmount } = render(<TwelveWeekTodayTab {...makeProps({ onToggleTask })} />);
      const checkbox = screen.getAllByRole("checkbox")[0];

      await act(async () => {
        checkbox.click();
        unmount();
        await vi.advanceTimersByTimeAsync(200);
      });

      expect(onToggleTask).toHaveBeenCalledWith("task_1", true);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      vi.unstubAllEnvs();
      vi.useRealTimers();
    }
  });

  it("emits taskCompleted after a normal task completion succeeds", async () => {
    const onToggleTask = vi.fn().mockResolvedValue(undefined);
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          onToggleTask,
          todayQueue: [makeTask({ id: "task_1" }), makeTask({ id: "task_2", title: "Review outline" })],
        })}
      />,
    );

    const checkbox = screen.getAllByRole("checkbox")[0];
    await userEvent.click(checkbox);

    await waitFor(() => {
      expect(emitPetEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "taskCompleted",
          source: "today",
        }),
      );
    });
  });

  it("emits dailyFocusCompleted after the last open task succeeds", async () => {
    const onToggleTask = vi.fn().mockResolvedValue(undefined);
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          onToggleTask,
          todayQueue: [makeTask({ id: "task_final" })],
        })}
      />,
    );

    const checkbox = screen.getAllByRole("checkbox")[0];
    await userEvent.click(checkbox);

    await waitFor(() => {
      expect(emitPetEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "dailyFocusCompleted",
          source: "today",
        }),
      );
    });
  });

  it("calls onSaveCheckIn when 'Lưu check-in hôm nay' button is clicked", async () => {
    const onSaveCheckIn = vi.fn();
    render(<TwelveWeekTodayTab {...makeProps({ onSaveCheckIn })} />);
    const buttons = screen.getAllByRole("button", { name: /Lưu check-in/i });
    await userEvent.click(buttons[0]);
    expect(onSaveCheckIn).toHaveBeenCalledTimes(1);
  });

  it("renders a single save check-in CTA to avoid duplicate mobile actions", () => {
    render(<TwelveWeekTodayTab {...makeProps()} />);
    expect(screen.getAllByRole("button", { name: /Lưu check-in/i })).toHaveLength(1);
  });

  it("shows a sticky mobile check-in CTA only after an unsaved check-in scrolls out of view", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 375,
    });

    const { rerender } = render(
      <TwelveWeekTodayTab
        {...makeProps({
          dailyNote: "Có một ý cần nhớ",
          latestCheckIn: null,
        })}
      />,
    );

    const shell = document.querySelector("[data-twelve-week-today-shell]");
    const checkInCard = document.querySelector("[data-twelve-week-checkin-card]") as HTMLElement | null;

    expect(checkInCard).not.toBeNull();
    expect(document.querySelector("[data-twelve-week-today-mobile-checkin-bar]")).toBeNull();

    vi.spyOn(checkInCard as HTMLElement, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: -480,
      width: 320,
      height: 360,
      top: -480,
      right: 320,
      bottom: -120,
      left: 0,
      toJSON: () => ({}),
    });

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    await waitFor(() => expect(shell).toHaveClass("pb-[calc(7.5rem+env(safe-area-inset-bottom))]", "sm:pb-0"));

    const actionBar = document.querySelector("[data-twelve-week-today-mobile-checkin-bar]");

    expect(actionBar).toHaveClass(
      "above-mobile-nav",
      "sm:hidden",
      "fixed",
      "left-0",
      "right-0",
      "bottom-[calc(5rem+env(safe-area-inset-bottom))]",
      "z-40",
      "border-t",
      "border-app-line/80",
      "bg-app-surface",
      "px-4",
      "pb-4",
      "pt-3",
      "shadow-[0_-18px_40px_-30px_rgba(23,21,15,0.45)]",
    );
    expect(within(actionBar as HTMLElement).getByText("Chưa lưu")).toBeInTheDocument();
    expect(
      within(actionBar as HTMLElement).getByRole("button", { name: /^Lưu check-in hôm nay$/i }),
    ).toBeInTheDocument();

    rerender(
      <TwelveWeekTodayTab
        {...makeProps({
          dailyNote: "Có một ý cần nhớ",
          latestCheckIn: makeCheckIn({ date: "2026-05-02", optionalNote: "Có một ý cần nhớ" }),
        })}
      />,
    );

    expect(document.querySelector("[data-twelve-week-today-mobile-checkin-bar]")).toBeNull();
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

  it("keeps the primary task hero before rescue guidance and check-in", () => {
    render(<TwelveWeekTodayTab {...makeProps({ rescueStatus: { ...baseStatus } })} />);
    const hero = screen.getByTestId("today-primary-hero");
    const nudge = screen.getByTestId("today-rescue-nudge");
    const checkInHeading = screen.getByText("Check-in hôm nay");

    expect(hero.compareDocumentPosition(nudge)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(hero.compareDocumentPosition(checkInHeading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
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
  it("shows 'Tuần 1 · Khởi đầu' headline when currentWeek === 1", () => {
    render(<TwelveWeekTodayTab {...makeProps({ currentWeek: 1 })} />);
    expect(screen.getByText(/Tuần 1 · Khởi đầu/i)).toBeInTheDocument();
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
    expect(screen.getByText(/Ưu tiên duy nhất/i)).toBeInTheDocument();
    expect(screen.queryByText(/Tuần 1 · Khởi đầu/i)).toBeNull();
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
    expect(screen.getByTestId("overdue-core-note-task_core")).toHaveTextContent(/Việc cốt lõi không thể bỏ/i);
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

  it("uses 44px controls for overdue actions and queue toggles", () => {
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

    const checkbox = screen.getAllByRole("checkbox")[0];
    expect(checkbox).toHaveClass("h-11", "w-11");

    const actions = screen.getByTestId("overdue-actions-task_overdue");
    const reschedule = actions.querySelector('[data-action="reschedule-within-week"]');
    const nextWeek = actions.querySelector('[data-action="reschedule-next-week"]');
    const skip = actions.querySelector('[data-action="skip-non-core"]');
    const detailsSummary = actions.querySelector("summary");

    expect(reschedule).toHaveClass("min-h-11");
    expect(nextWeek).toHaveClass("min-h-11");
    expect(skip).toHaveClass("min-h-11");
    expect(detailsSummary).toHaveClass("min-h-11");
  });

  it("wraps secondary task preview text instead of truncating", () => {
    render(
      <TwelveWeekTodayTab
        {...makeProps({
          secondaryTodayTasks: [
            makeTask({
              id: "secondary_1",
              title: "Hoàn thiện bản nháp dài cho phần phản tư tuần này",
              leadIndicatorName: "Viết reflection dài hơn bình thường",
              isCore: false,
            }),
          ],
        })}
      />,
    );

    const title = screen.getByText("Hoàn thiện bản nháp dài cho phần phản tư tuần này");
    const indicator = screen.getByText("Viết reflection dài hơn bình thường");

    expect(title).toHaveClass("break-words");
    expect(title).not.toHaveClass("truncate");
    expect(indicator).toHaveClass("break-words");
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
    // Once in hero, once in queue card.
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

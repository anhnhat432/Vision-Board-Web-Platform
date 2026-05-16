import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { vi } from "vitest";

vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

import {
  APP_STORAGE_KEYS,
  formatDateInputValue,
  getCurrentEntitlementKeys,
  getCurrentPlan,
  isCalendarDateKeyOnOrAfter,
  getUserData,
} from "@/app/utils/storage";
import { startCheckoutFlow } from "@/app/utils/production";
import { listStoredPendingMutations } from "@/features/plan12week/persistence/mutationQueue";
import {
  readGoal,
  renderAppRoute,
  resetTestStorage,
  seedPendingSetupContext,
  seedTwelveWeekGoal,
  updateUserData,
} from "@/test/app-flow-helpers";

const INTEGRATION_TEST_TIMEOUT_MS = 20_000;

function makeCycleReview(weekNumber: number, leadScore: number) {
  return {
    weekNumber,
    leadCompletionPercent: leadScore,
    lagProgressValue: String(weekNumber * 8),
    biggestOutputThisWeek: `Output tuần ${weekNumber}`,
    mainObstacle: weekNumber % 2 === 0 ? "Bỏ lỡ review cuối tuần" : "",
    nextWeekPriority: weekNumber === 12 ? "Tiếp tục ship mỗi sáng" : `Cam kết tuần ${weekNumber + 1}`,
    workloadDecision: "keep same" as const,
    reviewCompleted: true,
    progressScore: 7,
    disciplineScore: 7,
    focusScore: 7,
    improvementScore: 7,
    outputQualityScore: 7,
    completedLeadIndicators: 2,
    leadScore,
    commitmentsKept: ["Giữ nhịp việc cốt lõi"],
    commitmentsMissed: weekNumber % 2 === 0 ? ["Bỏ lỡ review cuối tuần"] : [],
    insights: `Insight tuần ${weekNumber}`,
    nextWeekCommitments: weekNumber === 12 ? ["Tiếp tục ship mỗi sáng"] : [`Cam kết tuần ${weekNumber + 1}`],
    executionScore: leadScore,
    reflection: `Insight tuần ${weekNumber}`,
    adjustments: weekNumber === 12 ? "Tiếp tục ship mỗi sáng" : `Cam kết tuần ${weekNumber + 1}`,
  };
}

function getPrimaryButton(name: string | RegExp) {
  const [button] = screen.getAllByRole("button", { name });
  expect(button).toBeInTheDocument();
  return button;
}

async function openWeeklyReviewDetails(_user: ReturnType<typeof userEvent.setup>) {
  await screen.findByTestId("wam-section-next-commitments");
}

async function typeWamReview(
  user: ReturnType<typeof userEvent.setup>,
  input: { insights: string; nextWeekCommitments: string },
) {
  await openWeeklyReviewDetails(user);
  const insightsInput = document.querySelector("#weekly-insights");
  const commitmentsInput = document.querySelector("#weekly-next-commitments");
  expect(insightsInput).toBeInTheDocument();
  expect(commitmentsInput).toBeInTheDocument();
  await user.type(insightsInput as HTMLElement, input.insights);
  await user.type(commitmentsInput as HTMLElement, `${input.nextWeekCommitments}{Enter}`);
}

async function confirmEarlyReviewIfPrompted(user: ReturnType<typeof userEvent.setup>) {
  const action = screen.queryByRole("button", { name: /vẫn lưu sớm/i });
  if (action) await user.click(action);
}

describe("12-week core flows", () => {
  beforeEach(() => {
    resetTestStorage();
    window.confirm = vi.fn(() => true);
  });

  it("creates a 12-week system from setup and routes into the command center", async () => {
    seedPendingSetupContext();
    updateUserData((data) => {
      data.aspirationalVision = {
        id: "vision_3y_1",
        horizonYears: 3,
        summary: "Ba năm tới tôi có một sản phẩm ổn định và nhịp làm việc bền vững.",
        lifeAreas: [],
        createdAt: "2026-05-09T00:00:00.000Z",
        updatedAt: "2026-05-09T00:00:00.000Z",
      };
    });
    const { router } = renderAppRoute("/12-week-setup");
    const user = userEvent.setup();

    await screen.findByRole("heading", { name: "Mục tiêu 12 tuần" });
    expect(screen.getByText(/Kế hoạch 12 tuần này phục vụ tầm nhìn 3 năm:/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tiếp →" }));

    const tacticInputs = await screen.findAllByLabelText("Tên việc");
    await user.clear(tacticInputs[0]);
    await user.type(tacticInputs[0], "Ship phần việc cốt lõi");
    await user.clear(tacticInputs[1]);
    await user.type(tacticInputs[1], "Review cuối ngày");

    await user.click(screen.getByRole("button", { name: "Tiếp →" }));
    await user.click(screen.getByRole("button", { name: "Tiếp →" }));
    await user.click(screen.getByRole("button", { name: "Lưu kế hoạch" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/12-week-system");
    });

    await screen.findByText("Nhịp 12 tuần");

    const data = getUserData();
    const createdSystem = data.goals[0]?.twelveWeekSystem;
    const weekOneTasks = createdSystem?.taskInstances.filter((task) => task.weekNumber === 1) ?? [];
    const todayKey = formatDateInputValue(new Date());

    expect(data.goals).toHaveLength(1);
    expect(createdSystem).toBeDefined();
    expect(data.goals[0]?.aspirationalVisionId).toBe("vision_3y_1");
    expect(weekOneTasks.length).toBeGreaterThan(0);
    expect(weekOneTasks.every((task) => isCalendarDateKeyOnOrAfter(task.scheduledDate, todayKey))).toBe(true);
    expect(localStorage.getItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId)).toBe(data.goals[0]?.id);

    const snapshotMutation = listStoredPendingMutations(null).find((item) => item.kind === "plan_snapshot_updated");
    expect(snapshotMutation).toEqual(
      expect.objectContaining({ kind: "plan_snapshot_updated", goalId: data.goals[0]?.id }),
    );
    if (snapshotMutation?.kind === "plan_snapshot_updated") {
      expect(snapshotMutation.payload.reason).toBe("setup");
      expect(snapshotMutation.payload.clientPlanId).toBe(`${data.goals[0]?.id}:12-week-system`);
      expect(snapshotMutation.payload.system.vision12Week).toBe(createdSystem?.vision12Week);
      expect(snapshotMutation.payload.system.weeklyPlans.length).toBe(createdSystem?.weeklyPlans.length);
      expect("taskInstances" in snapshotMutation.payload.system).toBe(false);
      expect("dailyCheckIns" in snapshotMutation.payload.system).toBe(false);
      expect("weeklyReviews" in snapshotMutation.payload.system).toBe(false);
      expect("dailyReminderTime" in snapshotMutation.payload.system).toBe(false);
    }

    const leadMetricMutations = listStoredPendingMutations(null).filter((item) => item.kind === "lead_metric_upserted");
    expect(leadMetricMutations.length).toBeGreaterThan(0);
    if (leadMetricMutations[0]?.kind === "lead_metric_upserted") {
      expect(leadMetricMutations[0].payload.reason).toBe("setup");
      expect(leadMetricMutations[0].payload.clientPlanId).toBe(`${data.goals[0]?.id}:12-week-system`);
      expect(leadMetricMutations[0].payload.clientMetricId).toContain(":metric:");
      expect(leadMetricMutations[0].payload.weeklyTarget).toBeGreaterThanOrEqual(0);
    }
  }, INTEGRATION_TEST_TIMEOUT_MS);

  it("shows a soft 3-year vision prompt in 12-week setup without blocking the flow", async () => {
    seedPendingSetupContext();

    renderAppRoute("/12-week-setup");

    await screen.findByRole("heading", { name: "Mục tiêu 12 tuần" });
    expect(
      screen.getByText("Đặt mục tiêu 12 tuần. Phương pháp gốc khuyên gắn với tầm nhìn 3 năm."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Điền 2 phút →" })).toHaveAttribute("href", "/vision");
    expect(screen.getByRole("button", { name: "Bỏ qua" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tiếp →" })).toBeEnabled();
  }, 10_000);

  it("sends corrupt saved feasibility results back to feasibility with a clear toast", async () => {
    seedPendingSetupContext();
    localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityResult, "{xxx");
    const toastSpy = vi.spyOn(toast, "error");
    const { router } = renderAppRoute("/12-week-setup");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/feasibility");
    });
    expect(toastSpy).toHaveBeenCalledWith("Kết quả kiểm tra tính khả thi cũ không đọc được, làm lại nhanh");
    expect(localStorage.getItem(APP_STORAGE_KEYS.pendingFeasibilityResult)).toBeNull();
  }, 10_000);

  it("carries the SMART metric unit into the 12-week lag metric preview", async () => {
    seedPendingSetupContext();
    localStorage.setItem(
      APP_STORAGE_KEYS.pendingSmartGoal,
      JSON.stringify({
        focusArea: "Career",
        specific: {
          goal_statement: "Tăng sức bền bằng cách hoàn thành nhiều lần push-ups hơn.",
        },
        measurable: {
          metric_name: "Push-ups",
          metric_unit: "reps",
          baseline_value: 20,
          target_value: 60,
        },
        achievable: {
          weekly_time_commitment_hours: 4,
          required_skills: [],
          support_resources: [],
        },
        relevant: {
          motivation_reason: "Tôi muốn cơ thể khoẻ hơn.",
        },
        time_bound: {
          target_weeks: 12,
        },
        created_at: "2026-05-09T00:00:00.000Z",
      }),
    );

    renderAppRoute("/12-week-setup");

    expect(await screen.findByText("Push-ups (reps)")).toBeInTheDocument();
  }, 10_000);

  it("shows a clear next action when no 12-week plan exists", async () => {
    renderAppRoute("/12-week-system");

    await screen.findByRole("heading", { name: "Bạn chưa có hệ thống 12 tuần" });
    expect(screen.getByText("Chưa có chu kỳ đang chạy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạo mục tiêu 12 tuần" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mở mục tiêu đã có" })).toBeInTheDocument();
  });

  it("explains what is missing when a 12-week plan has no tasks or metrics", async () => {
    const { goalId } = seedTwelveWeekGoal();
    updateUserData((data) => {
      const goal = data.goals.find((item) => item.id === goalId);
      if (!goal?.twelveWeekSystem) return;

      goal.twelveWeekSystem.leadIndicators = [];
      goal.twelveWeekSystem.taskInstances = [];
      goal.twelveWeekSystem.lagMetric.name = "";
    });

    renderAppRoute("/12-week-system");

    await screen.findByText("Chu kỳ này chưa có việc hoặc chỉ số đủ rõ");
    expect(screen.getByText("Chưa có việc nào trong chu kỳ này")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạo lại chu kỳ" })).toBeInTheDocument();
  });

  it("persists task completion from the today queue", async () => {
    const { goalId } = seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    const taskListCard = (await screen.findByText("Hàng việc hôm nay")).closest("[data-slot='card']");
    expect(taskListCard).not.toBeNull();

    const checkbox = within(taskListCard as HTMLElement).getAllByRole("checkbox")[0];
    await user.click(checkbox);

    let completedTaskId: string | null = null;
    await waitFor(() => {
      const completedTask = readGoal(goalId).twelveWeekSystem?.taskInstances.find((item) => item.completed);
      expect(completedTask).toBeDefined();
      completedTaskId = completedTask?.id ?? null;
    });

    const pendingMutations = listStoredPendingMutations(null);
    const taskMutation = pendingMutations.find((item) => item.kind === "task_completed_changed");
    const leadMetricMutation = pendingMutations.find((item) => item.kind === "lead_metric_upserted");
    expect(taskMutation).toEqual(expect.objectContaining({ kind: "task_completed_changed", goalId }));
    expect(leadMetricMutation).toEqual(expect.objectContaining({ kind: "lead_metric_upserted", goalId }));
    if (taskMutation?.kind === "task_completed_changed") {
      expect(taskMutation.payload.clientTaskId).toBe(completedTaskId);
      expect(taskMutation.payload.completed).toBe(true);
      expect(taskMutation.payload.completedAt).toBeTruthy();
    }
    if (leadMetricMutation?.kind === "lead_metric_upserted") {
      expect(leadMetricMutation.payload.reason).toBe("task_progress");
      expect(leadMetricMutation.payload.currentValue).toBeGreaterThan(0);
    }
    expect(getUserData().eventLog.some((event) => event.type === "12_week_task_completed")).toBe(true);
  });

  it("shows the 12-week sections as top-level tabs on the command center", async () => {
    seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");

    const tablist = await screen.findByRole("tablist", { name: /Điều hướng hệ 12 tuần/i });
    expect(within(tablist).getByRole("tab", { name: /Hôm nay/i })).toHaveAttribute("aria-selected", "true");
    expect(within(tablist).getByRole("tab", { name: /Tuần/i })).toBeInTheDocument();
    expect(within(tablist).getByRole("tab", { name: /Tiến độ/i })).toBeInTheDocument();
    expect(within(tablist).getByRole("tab", { name: /Cài đặt/i })).toBeInTheDocument();
  });

  it(
    "renders the cycle review panel instead of the task list when the cycle reaches week 13",
    async () => {
      const { goalId } = seedTwelveWeekGoal();
      updateUserData((data) => {
        const goal = data.goals.find((item) => item.id === goalId);
        if (!goal?.twelveWeekSystem) return;
        goal.twelveWeekSystem.currentWeek = 13;
        goal.twelveWeekSystem.status = "active";
        goal.twelveWeekSystem.lagMetric = {
          ...goal.twelveWeekSystem.lagMetric,
          target: "100",
          currentValue: "92",
        };
        goal.twelveWeekSystem.weeklyReviews = Array.from({ length: 12 }, (_, index) =>
          makeCycleReview(index + 1, index % 3 === 0 ? 90 : 70),
        );
      });

      renderAppRoute("/12-week-system");

      expect(await screen.findByRole("heading", { name: "Cycle 12 tuần đã kết thúc" })).toBeInTheDocument();
      expect(screen.getByTestId("cycle-review-panel")).toBeInTheDocument();
      expect(screen.queryByText("Hàng việc hôm nay")).not.toBeInTheDocument();

      await waitFor(() => {
        expect(readGoal(goalId).twelveWeekSystem?.status).toBe("completed");
      });
    },
    INTEGRATION_TEST_TIMEOUT_MS,
  );

  it(
    "starts a new cycle from the cycle review panel without creating a new goal",
    async () => {
      const { goalId } = seedTwelveWeekGoal();
      updateUserData((data) => {
        const goal = data.goals.find((item) => item.id === goalId);
        if (!goal?.twelveWeekSystem) return;
        goal.twelveWeekSystem.currentWeek = 13;
        goal.twelveWeekSystem.status = "active";
        goal.twelveWeekSystem.weeklyReviews = Array.from({ length: 12 }, (_, index) =>
          makeCycleReview(index + 1, index % 2 === 0 ? 90 : 70),
        );
        data.aspirationalVision = {
          id: "vision_3y_1",
          horizonYears: 3,
          summary: "Ba năm tới tôi sống khỏe và làm việc sâu hơn.",
          lifeAreas: [],
          createdAt: "2026-05-09T00:00:00.000Z",
          updatedAt: "2026-05-09T00:00:00.000Z",
        };
        goal.twelveWeekSystem.taskInstances = goal.twelveWeekSystem.taskInstances.map((task) => ({
          ...task,
          completed: true,
          completedAt: new Date().toISOString(),
        }));
      });

      const { router } = renderAppRoute("/12-week-system");
      const user = userEvent.setup();

      await screen.findByRole("heading", { name: "Cycle 12 tuần đã kết thúc" });
      expect(screen.getByText("Chu kỳ này đã đưa bạn gần hơn với tầm nhìn 3 năm chưa?")).toBeInTheDocument();
      await user.type(screen.getByLabelText("Bài học lớn nhất 1"), "Tiếp tục giữ review cuối tuần.");
      await user.click(screen.getByRole("button", { name: "Lưu báo cáo cycle" }));

      await waitFor(() => {
        const reflection = getUserData().reflections.find(
          (item) => item.entryType === "cycleReview" && item.linkedGoalId === goalId,
        );
        expect(reflection?.content).toContain("Tiếp tục giữ review cuối tuần.");
        expect(reflection?.finalLagPercent).toEqual(expect.any(Number));
      });

      await user.click(screen.getByRole("button", { name: "Bắt đầu cycle mới" }));

      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/12-week-setup");
      });

      const goal = readGoal(goalId);
      const nextSystem = goal.twelveWeekSystem;
      expect(getUserData().goals).toHaveLength(1);
      expect(nextSystem?.cycleNumber).toBe(2);
      expect(nextSystem?.status).toBe("active");
      expect(nextSystem?.currentWeek).toBe(1);
      expect(nextSystem?.weeklyReviews).toHaveLength(0);
      expect(nextSystem?.dailyCheckIns).toHaveLength(0);
      expect(nextSystem?.taskInstances.every((task) => !task.completed)).toBe(true);
      expect(localStorage.getItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId)).toBe(goalId);

      const pendingDraft = JSON.parse(localStorage.getItem(APP_STORAGE_KEYS.pending12WeekSetupDraft) ?? "{}");
      expect(pendingDraft.successEvidence).toContain("Tiếp tục ship mỗi sáng");
    },
    INTEGRATION_TEST_TIMEOUT_MS,
  );

  it("compacts repeated task toggles to the latest queued state", async () => {
    const { goalId } = seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    await screen.findAllByRole("checkbox");
    const getFirstCheckbox = () => screen.getAllByRole("checkbox")[0];
    const firstCheckboxLabel = getFirstCheckbox().getAttribute("aria-label") ?? "";
    await user.click(getFirstCheckbox());
    let toggledTaskId: string | null = null;
    await waitFor(() => {
      const completedTask = readGoal(goalId).twelveWeekSystem?.taskInstances.find((item) => item.completed);
      expect(completedTask).toBeDefined();
      toggledTaskId = completedTask?.id ?? null;
    });

    await user.click(await screen.findByRole("checkbox", { name: firstCheckboxLabel }));

    let reopenedTaskId: string | null = null;
    await waitFor(() => {
      const system = readGoal(goalId).twelveWeekSystem;
      const reopenedTask = system?.taskInstances.find((item) => item.id === toggledTaskId);
      expect(reopenedTask?.completed).toBe(false);
      reopenedTaskId = reopenedTask?.id ?? null;
    });

    const pendingMutations = listStoredPendingMutations(null);
    const taskMutation = pendingMutations.find((item) => item.kind === "task_completed_changed");
    const leadMetricMutation = pendingMutations.find((item) => item.kind === "lead_metric_upserted");
    expect(taskMutation?.supersedes).toHaveLength(1);
    expect(leadMetricMutation?.supersedes).toHaveLength(1);
    if (taskMutation?.kind === "task_completed_changed") {
      expect(taskMutation.payload.clientTaskId).toBe(reopenedTaskId);
      expect(taskMutation.payload.completed).toBe(false);
      expect(taskMutation.payload.completedAt).toBeUndefined();
    }
    if (leadMetricMutation?.kind === "lead_metric_upserted") {
      expect(leadMetricMutation.payload.currentValue).toBe(0);
    }
  });

  it("saves a daily check-in from the Today tab", async () => {
    const { goalId } = seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    const taskListCard = (await screen.findByText("Hàng việc hôm nay")).closest("[data-slot='card']");
    expect(taskListCard).not.toBeNull();

    await user.click(within(taskListCard as HTMLElement).getAllByRole("checkbox")[0]);
    await user.type(screen.getByLabelText("Note tùy chọn"), "Mai bắt đầu từ việc này trước.");
    await user.click(getPrimaryButton("Lưu check-in hôm nay"));

    await waitFor(() => {
      const system = readGoal(goalId).twelveWeekSystem;
      const checkIn = system?.dailyCheckIns[0];
      const completedCount = system?.taskInstances.filter((item) => item.completed).length ?? 0;
      expect(checkIn?.optionalNote).toBe("Mai bắt đầu từ việc này trước.");
      expect(checkIn?.didWorkToday).toBe(true);
      expect(completedCount).toBeGreaterThan(0);
    });

    const pendingMutations = listStoredPendingMutations(null);
    const dailyMutation = pendingMutations.find((item) => item.kind === "daily_check_in_upserted");
    expect(dailyMutation).toEqual(expect.objectContaining({ kind: "daily_check_in_upserted", goalId }));
    if (dailyMutation?.kind === "daily_check_in_upserted") {
      expect(dailyMutation.payload.date).toBe(formatDateInputValue(new Date()));
      expect(dailyMutation.payload.clientPlanId).toBe(`${goalId}:12-week-system`);
      expect(dailyMutation.payload.clientWeekId).toBe(`${goalId}:week:${dailyMutation.payload.weekNumber}`);
      expect(dailyMutation.payload.checkIn.didWorkToday).toBe(true);
    }
  });

  it("shows tactic commitment reminders in Today and Weekly Review", async () => {
    const { goalId } = seedTwelveWeekGoal();
    updateUserData((data) => {
      const goal = data.goals.find((item) => item.id === goalId);
      const system = goal?.twelveWeekSystem;
      if (!system) return;

      system.currentWeek = 2;
      system.leadIndicators[0] = {
        ...system.leadIndicators[0],
        commitment: {
          want: "Tôi muốn ship đều vì đây là lời hứa với chính mình.",
          cost: "Dành sáng thứ Hai cho deep work.",
          means: "Mở task đầu tiên trước 9h.",
          tradeoff: "Giảm họp phụ.",
          reward: "Một buổi nghỉ chủ động.",
          filledAt: "2026-05-09T00:00:00.000Z",
        },
      };
      system.weeklyReviews = [
        {
          ...makeCycleReview(1, 90),
          nextWeekCommitments: [system.leadIndicators[0].name],
          adjustments: system.leadIndicators[0].name,
        },
      ];
    });

    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    expect(await screen.findAllByText("« Tôi muốn ship đều vì đây là lời hứa với chính mình. »")).not.toHaveLength(0);

    await user.click(screen.getByRole("tab", { name: "Mở tab Tuần" }));

    const commitmentsSection = await screen.findByTestId("wam-section-commitments");
    expect(commitmentsSection).toHaveTextContent("Tôi muốn ship đều vì đây là lời hứa với chính mình.");
  }, INTEGRATION_TEST_TIMEOUT_MS);

  it("compacts repeated daily check-ins for the same day to the latest queued payload", async () => {
    const { goalId } = seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    const noteInput = await screen.findByRole("textbox", { name: /note/i });
    await user.type(noteInput, "First local check-in.");
    await user.click(getPrimaryButton(/check-in/i));

    await waitFor(() => {
      expect(readGoal(goalId).twelveWeekSystem?.dailyCheckIns[0]?.optionalNote).toBe("First local check-in.");
      expect(readGoal(goalId).twelveWeekSystem?.dailyCheckIns[0]?.updatedCount).toBe(1);
    });

    await user.clear(noteInput);
    await user.type(noteInput, "Latest local check-in.");
    await user.click(getPrimaryButton(/check-in/i));

    await waitFor(() => {
      const checkIns = readGoal(goalId).twelveWeekSystem?.dailyCheckIns ?? [];
      expect(checkIns[0]?.optionalNote).toBe("Latest local check-in.");
      expect(checkIns[0]?.updatedCount).toBe(2);
      expect(checkIns[1]?.optionalNote).toBe("First local check-in.");
      expect(checkIns).toHaveLength(2);
    });

    const dailyMutations = listStoredPendingMutations(null).filter((item) => item.kind === "daily_check_in_upserted");
    expect(dailyMutations).toHaveLength(1);
    expect(dailyMutations[0].supersedes).toHaveLength(1);
    if (dailyMutations[0].kind === "daily_check_in_upserted") {
      expect(dailyMutations[0].payload.checkIn.optionalNote).toBe("Latest local check-in.");
      expect(dailyMutations[0].payload.clientPlanId).toBe(`${goalId}:12-week-system`);
    }
  }, INTEGRATION_TEST_TIMEOUT_MS);

  it(
    "keeps only the five latest daily check-in entries after the seventh same-day save",
    async () => {
      const { goalId } = seedTwelveWeekGoal();
      const todayKey = formatDateInputValue(new Date());
      updateUserData((data) => {
        const goal = data.goals.find((item) => item.id === goalId);
        if (!goal?.twelveWeekSystem) return;

        goal.twelveWeekSystem.dailyCheckIns = Array.from({ length: 6 }, (_, index) => {
          const version = 6 - index;
          return {
            date: todayKey,
            didWorkToday: true,
            whichLeadIndicatorWorkedOn: "Ship một phần việc cốt lõi",
            amountDone: "1/2 việc",
            outputCreated: "",
            obstacleOrIssue: "",
            dailySelfRating: 3,
            optionalNote: `Local check-in ${version}`,
            mood: "steady",
            updatedCount: version,
          };
        });
      });
      renderAppRoute("/12-week-system");
      const user = userEvent.setup();

      const noteInput = await screen.findByRole("textbox", { name: /note/i });
      await user.clear(noteInput);
      await user.type(noteInput, "Local check-in 7");
      await user.click(getPrimaryButton(/check-in/i));

      let checkInNotes: string[] = [];
      await waitFor(() => {
        const checkInsForToday =
          readGoal(goalId).twelveWeekSystem?.dailyCheckIns.filter((item) => item.date === todayKey) ?? [];
        expect(checkInsForToday).toHaveLength(5);
        checkInNotes = checkInsForToday.map((item) => item.optionalNote);
      });
      expect(checkInNotes).toEqual([
        "Local check-in 7",
        "Local check-in 6",
        "Local check-in 5",
        "Local check-in 4",
        "Local check-in 3",
      ]);
    },
    INTEGRATION_TEST_TIMEOUT_MS,
  );

  it(
    "keeps daily execution state when a weekly review is submitted after check-in",
    async () => {
      const { goalId } = seedTwelveWeekGoal();
      renderAppRoute("/12-week-system");
      const user = userEvent.setup();

      const taskListCard = (await screen.findByText("Hàng việc hôm nay")).closest("[data-slot='card']");
      expect(taskListCard).not.toBeNull();

      await user.click(within(taskListCard as HTMLElement).getAllByRole("checkbox")[0]);
      await user.type(screen.getByLabelText("Note tùy chọn"), "Giữ task đã tick khi review tuần.");
      await user.click(getPrimaryButton("Lưu check-in hôm nay"));
      await user.click(screen.getByRole("tab", { name: "Mở tab Tuần" }));
      await typeWamReview(user, {
        insights: "Chốt được một việc thật.",
        nextWeekCommitments: "Giữ nhịp execution.",
      });
      await user.click(getPrimaryButton("Chốt review tuần này"));
      await confirmEarlyReviewIfPrompted(user);

      await waitFor(() => {
        const system = readGoal(goalId).twelveWeekSystem;
        const completedCount = system?.taskInstances.filter((item) => item.completed).length ?? 0;
        expect(completedCount).toBeGreaterThan(0);
        expect(system?.dailyCheckIns[0]?.optionalNote).toBe("Giữ task đã tick khi review tuần.");
        expect(system?.weeklyReviews).toHaveLength(1);
      });
    },
    INTEGRATION_TEST_TIMEOUT_MS,
  );

  it(
    "submits the weekly review and writes the linked journal entry",
    async () => {
      const { goalId } = seedTwelveWeekGoal();
      renderAppRoute("/12-week-system");
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: "Mở tab Tuần" }));
      await typeWamReview(user, {
        insights: "Bị phân tán vì đổi context.",
        nextWeekCommitments: "Chốt xong command center trước.",
      });
      await user.click(getPrimaryButton("Chốt review tuần này"));
      await confirmEarlyReviewIfPrompted(user);

      await waitFor(() => {
        const system = readGoal(goalId).twelveWeekSystem;
        expect(system?.weeklyReviews).toHaveLength(1);
      });

      const data = getUserData();
      const reflection = data.reflections.find(
        (item) => item.entryType === "weekly-review" && item.linkedGoalId === goalId,
      );

      expect(reflection).toBeDefined();
      expect(reflection?.content).toContain("Bị phân tán vì đổi context.");

      const weeklyMutation = listStoredPendingMutations(null).find((item) => item.kind === "weekly_review_upserted");
      const review = readGoal(goalId).twelveWeekSystem?.weeklyReviews[0];
      expect(weeklyMutation).toEqual(expect.objectContaining({ kind: "weekly_review_upserted", goalId }));
      if (weeklyMutation?.kind === "weekly_review_upserted") {
        expect(weeklyMutation.payload.clientPlanId).toBe(`${goalId}:12-week-system`);
        expect(weeklyMutation.payload.clientWeekId).toBe(`${goalId}:week:${weeklyMutation.payload.weekNumber}`);
        expect(weeklyMutation.payload.executionScore).toEqual(expect.any(Number));
        expect(weeklyMutation.payload.review.reviewCompleted).toBe(true);
        expect(weeklyMutation.payload.review.biggestOutputThisWeek).toBe(review?.biggestOutputThisWeek);
        expect(weeklyMutation.payload.review.mainObstacle).toBe(review?.mainObstacle);
        expect(weeklyMutation.payload.review.nextWeekPriority).toBe(review?.nextWeekPriority);
      }
    },
    INTEGRATION_TEST_TIMEOUT_MS,
  );

  it(
    "saves WAM fields and shows the post-save summary card",
    async () => {
      const { goalId } = seedTwelveWeekGoal();
      renderAppRoute("/12-week-system");
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: "Mở tab Tuần" }));
      await typeWamReview(user, {
        insights: "Giữ buổi review thứ Năm.",
        nextWeekCommitments: "Hoàn thành module sync trước thứ Tư.",
      });
      await user.click(getPrimaryButton("Chốt review tuần này"));
      await confirmEarlyReviewIfPrompted(user);

      await waitFor(() => {
        const review = readGoal(goalId).twelveWeekSystem?.weeklyReviews[0];
        expect(review?.insights).toBe("Giữ buổi review thứ Năm.");
        expect(review?.nextWeekCommitments).toContain("Hoàn thành module sync trước thứ Tư.");
        expect(review?.reviewCompleted).toBe(true);
      });

      expect(await screen.findByTestId("weekly-review-summary")).toBeInTheDocument();
      expect(screen.getByTestId("weekly-score-interpretation")).toBeInTheDocument();
    },
    INTEGRATION_TEST_TIMEOUT_MS,
  );

  it(
    "loads a legacy review without keep/reduce fields without breaking the form",
    async () => {
      const { goalId } = seedTwelveWeekGoal();
      updateUserData((data) => {
        const goal = data.goals.find((item) => item.id === goalId);
        if (!goal?.twelveWeekSystem) return;
        goal.twelveWeekSystem.weeklyReviews = [
          {
            weekNumber: 1,
            leadCompletionPercent: 60,
            lagProgressValue: "Legacy progress",
            biggestOutputThisWeek: "Legacy output",
            mainObstacle: "Legacy obstacle",
            nextWeekPriority: "Legacy priority",
            workloadDecision: "keep same",
            reviewCompleted: true,
            progressScore: 6,
            disciplineScore: 6,
            focusScore: 7,
            improvementScore: 6,
            outputQualityScore: 6,
            completedLeadIndicators: 3,
          },
        ];
      });

      renderAppRoute("/12-week-system");
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: "Mở tab Tuần" }));
      await openWeeklyReviewDetails(user);

      // Existing legacy fields should hydrate the WAM form
      expect(await screen.findByDisplayValue("Legacy output")).toBeInTheDocument();
      expect(screen.getByLabelText("Cam kết: Legacy priority")).toBeInTheDocument();

      // Old optional obstacle field is no longer rendered in the WAM form.
      expect(screen.queryByDisplayValue("Legacy obstacle")).toBeNull();

      // Summary card still renders since reviewCompleted === true
      expect(screen.getByTestId("weekly-review-summary")).toBeInTheDocument();
    },
    INTEGRATION_TEST_TIMEOUT_MS,
  );

  it(
    "compacts repeated weekly reviews for the same week to the latest queued payload",
    async () => {
      const { goalId } = seedTwelveWeekGoal();
      renderAppRoute("/12-week-system");
      const user = userEvent.setup();

      await user.click(screen.getByRole("tab", { name: "Mở tab Tuần" }));
      await typeWamReview(user, {
        insights: "First weekly insight.",
        nextWeekCommitments: "First priority.",
      });
      await user.click(getPrimaryButton("Chốt review tuần này"));
      await confirmEarlyReviewIfPrompted(user);

      await waitFor(() => {
        expect(readGoal(goalId).twelveWeekSystem?.weeklyReviews[0]?.insights).toBe("First weekly insight.");
      });

      const insightsInput = document.querySelector("#weekly-insights");
      const commitmentsInput = document.querySelector("#weekly-next-commitments");
      expect(insightsInput).toBeInTheDocument();
      expect(commitmentsInput).toBeInTheDocument();
      await user.clear(insightsInput as HTMLElement);
      await user.type(insightsInput as HTMLElement, "Latest weekly insight.");
      await user.click(screen.getByRole("button", { name: "Xóa cam kết: First priority." }));
      await user.type(commitmentsInput as HTMLElement, "Latest priority.{Enter}");
      await user.click(getPrimaryButton("Chốt review tuần này"));
      await confirmEarlyReviewIfPrompted(user);

      await waitFor(() => {
        expect(readGoal(goalId).twelveWeekSystem?.weeklyReviews[0]?.insights).toBe("Latest weekly insight.");
      });

      const weeklyMutations = listStoredPendingMutations(null).filter((item) => item.kind === "weekly_review_upserted");
      expect(weeklyMutations).toHaveLength(1);
      expect(weeklyMutations[0].supersedes).toHaveLength(1);
      if (weeklyMutations[0].kind === "weekly_review_upserted") {
        expect(weeklyMutations[0].payload.review.insights).toBe("Latest weekly insight.");
        expect(weeklyMutations[0].payload.review.nextWeekPriority).toBe("Latest priority.");
        expect(weeklyMutations[0].payload.executionScore).toEqual(expect.any(Number));
      }
    },
    INTEGRATION_TEST_TIMEOUT_MS,
  );

  it("completes trial checkout without exposing restore controls in settings", async () => {
    const { goalId } = seedTwelveWeekGoal();
    const checkout = await startCheckoutFlow({
      planCode: "PLUS",
      context: "review",
      goalId,
      source: "paywall_dialog",
      recommendedPlan: "PLUS",
    });

    expect(checkout.status).toBe("redirect_required");
    expect(checkout.checkoutUrl).toBeTruthy();

    const checkoutUrl = new URL(checkout.checkoutUrl ?? "", "http://localhost");
    const checkoutRender = renderAppRoute(`${checkoutUrl.pathname}${checkoutUrl.search}`);
    const user = userEvent.setup();

    await screen.findByText("Thanh toán dùng thử");
    await user.click(screen.getByRole("button", { name: /Xác nhận mở gói/i }));

    await waitFor(() => {
      expect(getCurrentPlan()).toBe("PLUS");
    });
    expect(getCurrentEntitlementKeys()).toContain("premium_review_insights");

    checkoutRender.ui.unmount();

    updateUserData((data) => {
      data.subscription = null;
      data.entitlements = [];
    });

    expect(getCurrentPlan()).toBe("FREE");

    renderAppRoute("/12-week-system?tab=settings");
    await screen.findByText("Cài đặt mục tiêu", {}, { timeout: 10_000 });
    expect(screen.queryByText("Thiết bị, dữ liệu và đồng bộ")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Khôi phục quyền Plus" })).not.toBeInTheDocument();
    expect(getCurrentPlan()).toBe("FREE");
  });

  it(
    "persists default weekly time blocks from Settings across reload",
    async () => {
      const { goalId } = seedTwelveWeekGoal();
      const firstRender = renderAppRoute("/12-week-system?tab=settings");
      const user = userEvent.setup();

      await screen.findByText("Lịch tuần tham chiếu");
      await user.click(screen.getByRole("button", { name: "Dùng gợi ý mặc định" }));

      await waitFor(() => {
        expect(readGoal(goalId).twelveWeekSystem?.weeklyTimeBlocks).toHaveLength(4);
      });
      expect(screen.getAllByTestId("weekly-time-block-chip")).toHaveLength(4);
      expect(screen.getAllByText("Khung chiến lược").length).toBeGreaterThan(0);

      firstRender.ui.unmount();
      renderAppRoute("/12-week-system?tab=settings");

      await screen.findByText("Lịch tuần tham chiếu");
      expect(screen.getAllByTestId("weekly-time-block-chip")).toHaveLength(4);
    },
    INTEGRATION_TEST_TIMEOUT_MS,
  );
});

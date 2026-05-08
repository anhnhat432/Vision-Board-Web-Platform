import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  APP_STORAGE_KEYS,
  formatDateInputValue,
  getCurrentEntitlementKeys,
  getCurrentPlan,
  getUserData,
} from '@/app/utils/storage';
import { startCheckoutFlow } from '@/app/utils/production';
import { listStoredPendingMutations } from "@/features/plan12week/persistence/mutationQueue";
import {
  readGoal,
  renderAppRoute,
  resetTestStorage,
  seedPendingSetupContext,
  seedTwelveWeekGoal,
  updateUserData,
} from '@/test/app-flow-helpers';

const INTEGRATION_TEST_TIMEOUT_MS = 10_000;

function getPrimaryButton(name: string | RegExp) {
  const [button] = screen.getAllByRole("button", { name });
  expect(button).toBeInTheDocument();
  return button;
}

async function openWeeklyReviewDetails(user: ReturnType<typeof userEvent.setup>) {
  const trigger = await screen.findByRole("button", { name: /Chi tiết review thêm/i });
  if (trigger && trigger.getAttribute("aria-expanded") !== "true") {
    await user.click(trigger);
  }
}

describe("12-week core flows", () => {
  beforeEach(() => {
    resetTestStorage();
  });

  it("creates a 12-week system from setup and routes into the command center", async () => {
    seedPendingSetupContext();
    const { router } = renderAppRoute("/12-week-setup");
    const user = userEvent.setup();

    await screen.findByRole("heading", { name: "Mục tiêu 12 tuần" });
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    const tacticInputs = await screen.findAllByLabelText("Tên việc");
    await user.clear(tacticInputs[0]);
    await user.type(tacticInputs[0], "Ship phần việc cốt lõi");
    await user.clear(tacticInputs[1]);
    await user.type(tacticInputs[1], "Review cuối ngày");

    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await user.click(screen.getByRole("button", { name: "Tạo kế hoạch 12 tuần" }));

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
    expect(weekOneTasks.length).toBeGreaterThan(0);
    expect(weekOneTasks.every((task) => task.scheduledDate >= todayKey)).toBe(true);
    expect(localStorage.getItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId)).toBe(data.goals[0]?.id);

    const snapshotMutation = listStoredPendingMutations(null).find((item) => item.kind === "plan_snapshot_updated");
    expect(snapshotMutation).toEqual(expect.objectContaining({ kind: "plan_snapshot_updated", goalId: data.goals[0]?.id }));
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

  it("compacts repeated daily check-ins for the same day to the latest queued payload", async () => {
    const { goalId } = seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    const noteInput = await screen.findByRole("textbox", { name: /note/i });
    await user.type(noteInput, "First local check-in.");
    await user.click(getPrimaryButton(/check-in/i));

    await waitFor(() => {
      expect(readGoal(goalId).twelveWeekSystem?.dailyCheckIns[0]?.optionalNote).toBe("First local check-in.");
    });

    await user.clear(noteInput);
    await user.type(noteInput, "Latest local check-in.");
    await user.click(getPrimaryButton(/check-in/i));

    await waitFor(() => {
      expect(readGoal(goalId).twelveWeekSystem?.dailyCheckIns[0]?.optionalNote).toBe("Latest local check-in.");
    });

    const dailyMutations = listStoredPendingMutations(null).filter((item) => item.kind === "daily_check_in_upserted");
    expect(dailyMutations).toHaveLength(1);
    expect(dailyMutations[0].supersedes).toHaveLength(1);
    if (dailyMutations[0].kind === "daily_check_in_upserted") {
      expect(dailyMutations[0].payload.checkIn.optionalNote).toBe("Latest local check-in.");
      expect(dailyMutations[0].payload.clientPlanId).toBe(`${goalId}:12-week-system`);
    }
  });

  it("keeps daily execution state when a weekly review is submitted after check-in", async () => {
    const { goalId } = seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    const taskListCard = (await screen.findByText("Hàng việc hôm nay")).closest("[data-slot='card']");
    expect(taskListCard).not.toBeNull();

    await user.click(within(taskListCard as HTMLElement).getAllByRole("checkbox")[0]);
    await user.type(screen.getByLabelText("Note tùy chọn"), "Giữ task đã tick khi review tuần.");
    await user.click(getPrimaryButton("Lưu check-in hôm nay"));
    await user.click(screen.getByRole("button", { name: "Tuần" }));
    await openWeeklyReviewDetails(user);
    await user.type(await screen.findByLabelText("1. Tuần này kết quả lớn nhất là gì?"), "Chốt được một việc thật.");
    await user.type(screen.getByLabelText("5. Ưu tiên số 1 tuần sau là gì?"), "Giữ nhịp execution.");
    await user.click(getPrimaryButton("Chốt review tuần này"));

    await waitFor(() => {
      const system = readGoal(goalId).twelveWeekSystem;
      const completedCount = system?.taskInstances.filter((item) => item.completed).length ?? 0;
      expect(completedCount).toBeGreaterThan(0);
      expect(system?.dailyCheckIns[0]?.optionalNote).toBe("Giữ task đã tick khi review tuần.");
      expect(system?.weeklyReviews).toHaveLength(1);
    });
  }, INTEGRATION_TEST_TIMEOUT_MS);

  it("submits the weekly review and writes the linked journal entry", async () => {
    const { goalId } = seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Tuần" }));
    await openWeeklyReviewDetails(user);
    await user.type(await screen.findByLabelText("1. Tuần này kết quả lớn nhất là gì?"), "Giữ được nhịp ship mỗi ngày.");
    await user.type(screen.getByLabelText("2. Điều gì cản trở nhiều nhất?"), "Bị phân tán vì đổi context.");
    await user.type(screen.getByLabelText("5. Ưu tiên số 1 tuần sau là gì?"), "Chốt xong command center trước.");
    await user.click(getPrimaryButton("Chốt review tuần này"));

    await waitFor(() => {
      const system = readGoal(goalId).twelveWeekSystem;
      expect(system?.weeklyReviews).toHaveLength(1);
    });

    const data = getUserData();
    const reflection = data.reflections.find(
      (item) => item.entryType === "weekly-review" && item.linkedGoalId === goalId,
    );

    expect(reflection).toBeDefined();
    expect(reflection?.content).toContain("Giữ được nhịp ship mỗi ngày.");

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
  }, INTEGRATION_TEST_TIMEOUT_MS);

  
  it("saves keep/reduce tactic fields and shows the post-save summary card", async () => {
    const { goalId } = seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Tuần" }));
    await openWeeklyReviewDetails(user);
    await user.type(
      await screen.findByLabelText("1. Tuần này kết quả lớn nhất là gì?"),
      "Đã ship 1 deliverable nhỏ.",
    );
    await user.type(screen.getByLabelText("3. Việc nào tuần sau nên giữ?"), "Giữ buổi review thứ Năm.");
    await user.type(
      screen.getByLabelText("4. Việc nào nên giảm hoặc bỏ?"),
      "Giảm thời gian họp dài cuối tuần.",
    );
    await user.type(
      screen.getByLabelText("5. Ưu tiên số 1 tuần sau là gì?"),
      "Hoàn thành module sync trước thứ Tư.",
    );
    await user.click(getPrimaryButton("Chốt review tuần này"));

    await waitFor(() => {
      const review = readGoal(goalId).twelveWeekSystem?.weeklyReviews[0];
      expect(review?.keepTactic).toBe("Giữ buổi review thứ Năm.");
      expect(review?.reduceTactic).toBe("Giảm thời gian họp dài cuối tuần.");
      expect(review?.reviewCompleted).toBe(true);
    });

    expect(await screen.findByTestId("weekly-review-summary")).toBeInTheDocument();
    expect(screen.getByTestId("weekly-score-interpretation")).toBeInTheDocument();
  }, INTEGRATION_TEST_TIMEOUT_MS);

  it("loads a legacy review without keep/reduce fields without breaking the form", async () => {
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

    await user.click(screen.getByRole("button", { name: "Tuần" }));
    await openWeeklyReviewDetails(user);

    // Existing legacy fields should hydrate the form
    expect(await screen.findByDisplayValue("Legacy output")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Legacy obstacle")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Legacy priority")).toBeInTheDocument();

    // New keep/reduce fields render empty for legacy reviews
    const keepInput = screen.getByLabelText("3. Việc nào tuần sau nên giữ?") as HTMLTextAreaElement;
    const reduceInput = screen.getByLabelText("4. Việc nào nên giảm hoặc bỏ?") as HTMLTextAreaElement;
    expect(keepInput.value).toBe("");
    expect(reduceInput.value).toBe("");

    // Summary card still renders since reviewCompleted === true
    expect(screen.getByTestId("weekly-review-summary")).toBeInTheDocument();
  }, INTEGRATION_TEST_TIMEOUT_MS);

  it("compacts repeated weekly reviews for the same week to the latest queued payload", async () => {
    const { goalId } = seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Tuần" }));
    await openWeeklyReviewDetails(user);
    const bestInput = await screen.findByLabelText("1. Tuần này kết quả lớn nhất là gì?");
    const obstacleInput = screen.getByLabelText("2. Điều gì cản trở nhiều nhất?");
    const priorityInput = screen.getByLabelText("5. Ưu tiên số 1 tuần sau là gì?");
    await user.type(bestInput, "First weekly output.");
    await user.type(obstacleInput, "First obstacle.");
    await user.type(priorityInput, "First priority.");
    await user.click(getPrimaryButton("Chốt review tuần này"));

    await waitFor(() => {
      expect(readGoal(goalId).twelveWeekSystem?.weeklyReviews[0]?.biggestOutputThisWeek).toBe("First weekly output.");
    });

    await user.clear(bestInput);
    await user.type(bestInput, "Latest weekly output.");
    await user.clear(priorityInput);
    await user.type(priorityInput, "Latest priority.");
    await user.click(getPrimaryButton("Chốt review tuần này"));

    await waitFor(() => {
      expect(readGoal(goalId).twelveWeekSystem?.weeklyReviews[0]?.biggestOutputThisWeek).toBe("Latest weekly output.");
    });

    const weeklyMutations = listStoredPendingMutations(null).filter((item) => item.kind === "weekly_review_upserted");
    expect(weeklyMutations).toHaveLength(1);
    expect(weeklyMutations[0].supersedes).toHaveLength(1);
    if (weeklyMutations[0].kind === "weekly_review_upserted") {
      expect(weeklyMutations[0].payload.review.biggestOutputThisWeek).toBe("Latest weekly output.");
      expect(weeklyMutations[0].payload.review.nextWeekPriority).toBe("Latest priority.");
      expect(weeklyMutations[0].payload.executionScore).toEqual(expect.any(Number));
    }
  });

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

    await screen.findByText("Checkout dùng thử");
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
    await screen.findByText("Cài đặt mục tiêu");
    expect(screen.queryByText("Thiết bị, dữ liệu và đồng bộ")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Khôi phục quyền Plus" })).not.toBeInTheDocument();
    expect(getCurrentPlan()).toBe("FREE");
  });
});

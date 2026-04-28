import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  APP_STORAGE_KEYS,
  formatDateInputValue,
  getCurrentEntitlementKeys,
  getCurrentPlan,
  getUserData,
} from "../utils/storage";
import { startCheckoutFlow } from "../utils/production";
import {
  readGoal,
  renderAppRoute,
  resetTestStorage,
  seedPendingSetupContext,
  seedTwelveWeekGoal,
  updateUserData,
} from "../../test/app-flow-helpers";

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

    const tacticInputs = await screen.findAllByLabelText("Tên tactic");
    await user.clear(tacticInputs[0]);
    await user.type(tacticInputs[0], "Ship phần việc cốt lõi");
    await user.clear(tacticInputs[1]);
    await user.type(tacticInputs[1], "Review cuối ngày");

    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await user.click(screen.getByRole("button", { name: "Tạo hệ thống 12 tuần" }));

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

    await screen.findByText("Chu kỳ này chưa có việc hoặc metric đủ rõ");
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

    await waitFor(() => {
      const completedCount =
        readGoal(goalId).twelveWeekSystem?.taskInstances.filter((item) => item.completed).length ?? 0;
      expect(completedCount).toBeGreaterThan(0);
    });

    expect(getUserData().eventLog.some((event) => event.type === "12_week_task_completed")).toBe(true);
  });

  it("saves a daily check-in from the Today tab", async () => {
    const { goalId } = seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    const taskListCard = (await screen.findByText("Hàng việc hôm nay")).closest("[data-slot='card']");
    expect(taskListCard).not.toBeNull();

    await user.click(within(taskListCard as HTMLElement).getAllByRole("checkbox")[0]);
    await user.type(screen.getByLabelText("Note tùy chọn"), "Mai bắt đầu từ việc này trước.");
    await user.click(screen.getByRole("button", { name: "Lưu check-in hôm nay" }));

    await waitFor(() => {
      const system = readGoal(goalId).twelveWeekSystem;
      const checkIn = system?.dailyCheckIns[0];
      const completedCount = system?.taskInstances.filter((item) => item.completed).length ?? 0;
      expect(checkIn?.optionalNote).toBe("Mai bắt đầu từ việc này trước.");
      expect(checkIn?.didWorkToday).toBe(true);
      expect(completedCount).toBeGreaterThan(0);
    });
  });

  it("keeps daily execution state when a weekly review is submitted after check-in", async () => {
    const { goalId } = seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    const taskListCard = (await screen.findByText("Hàng việc hôm nay")).closest("[data-slot='card']");
    expect(taskListCard).not.toBeNull();

    await user.click(within(taskListCard as HTMLElement).getAllByRole("checkbox")[0]);
    await user.type(screen.getByLabelText("Note tùy chọn"), "Giữ task đã tick khi review tuần.");
    await user.click(screen.getByRole("button", { name: "Lưu check-in hôm nay" }));
    await user.click(screen.getByRole("tab", { name: "Tuần" }));
    await user.type(await screen.findByLabelText("1. Điều gì chạy tốt nhất trong tuần này?"), "Chốt được một việc thật.");
    await user.type(screen.getByLabelText("3. Một ưu tiên duy nhất cho tuần sau là gì?"), "Giữ nhịp execution.");
    await user.click(screen.getByRole("button", { name: "Chốt review tuần này" }));

    await waitFor(() => {
      const system = readGoal(goalId).twelveWeekSystem;
      const completedCount = system?.taskInstances.filter((item) => item.completed).length ?? 0;
      expect(completedCount).toBeGreaterThan(0);
      expect(system?.dailyCheckIns[0]?.optionalNote).toBe("Giữ task đã tick khi review tuần.");
      expect(system?.weeklyReviews).toHaveLength(1);
    });
  });

  it("submits the weekly review and writes the linked journal entry", async () => {
    const { goalId } = seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Tuần" }));
    await user.type(await screen.findByLabelText("1. Điều gì chạy tốt nhất trong tuần này?"), "Giữ được nhịp ship mỗi ngày.");
    await user.type(screen.getByLabelText("2. Điều gì cản trở nhịp của bạn?"), "Bị phân tán vì đổi context.");
    await user.type(screen.getByLabelText("3. Một ưu tiên duy nhất cho tuần sau là gì?"), "Chốt xong command center trước.");
    await user.click(screen.getByRole("button", { name: "Chốt review tuần này" }));

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
  });

  it("completes mock checkout and restores access from settings", async () => {
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

    await screen.findByText("Checkout mô phỏng");
    await user.click(screen.getByRole("button", { name: /Xác nhận mở Plus/i }));

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
    await screen.findByText("Thiết bị, dữ liệu và đồng bộ");
    await user.click(screen.getByRole("button", { name: "Khôi phục giao dịch" }));

    await waitFor(() => {
      expect(getCurrentPlan()).toBe("PLUS");
    });
    expect(getCurrentEntitlementKeys()).toContain("premium_templates");
  });
});

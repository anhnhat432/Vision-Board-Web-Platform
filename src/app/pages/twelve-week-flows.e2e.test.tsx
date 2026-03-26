import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  APP_STORAGE_KEYS,
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
    expect(data.goals).toHaveLength(1);
    expect(data.goals[0]?.twelveWeekSystem).toBeDefined();
    expect(localStorage.getItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId)).toBe(data.goals[0]?.id);
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
      const checkIn = readGoal(goalId).twelveWeekSystem?.dailyCheckIns[0];
      expect(checkIn?.optionalNote).toBe("Mai bắt đầu từ việc này trước.");
      expect(checkIn?.didWorkToday).toBe(true);
    });
  });

  it("submits the weekly review and writes the linked journal entry", async () => {
    const { goalId } = seedTwelveWeekGoal();
    renderAppRoute("/12-week-system");
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Tuần" }));
    await user.type(screen.getByLabelText("1. Điều gì chạy tốt nhất trong tuần này?"), "Giữ được nhịp ship mỗi ngày.");
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

    await screen.findByText("Mock provider checkout");
    await user.click(screen.getByRole("button", { name: /Plus/ }));

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

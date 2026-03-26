import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";

import {
  getCurrentEntitlementKeys,
  getCurrentPlan,
  getUserData,
} from "../utils/storage";
import { startCheckoutFlow } from "../utils/production";
import {
  resetTestStorage,
  seedTwelveWeekGoal,
  updateUserData,
  renderAppRoute,
} from "../../test/app-flow-helpers";
import { BillingPlan } from "./BillingPlan";
import { MockBillingCheckout } from "./MockBillingCheckout";

describe("monetization flows", () => {
  beforeEach(() => {
    resetTestStorage();
  });

  it("BillingPlan page renders current plan and entitlements for free user", async () => {
    const router = createMemoryRouter(
      [{ path: "/billing/plan", element: <BillingPlan /> }],
      { initialEntries: ["/billing/plan"] },
    );
    render(<RouterProvider router={router} />);

    await screen.findByText("Gói & thanh toán");
    expect(screen.getByText("Gói hiện tại")).toBeInTheDocument();
    expect(screen.getByText("Bạn đang dùng gói miễn phí.")).toBeInTheDocument();

    // Should show all 4 entitlement slots, all locked
    expect(screen.getByText("Template premium")).toBeInTheDocument();
    expect(screen.getByText("Nâng cấp")).toBeInTheDocument();
  });

  it("BillingPlan page shows active plan for Plus user", async () => {
    seedTwelveWeekGoal({ planCode: "PLUS" });

    const router = createMemoryRouter(
      [{ path: "/billing/plan", element: <BillingPlan /> }],
      { initialEntries: ["/billing/plan"] },
    );
    render(<RouterProvider router={router} />);

    await screen.findByText("Gói & thanh toán");
    expect(screen.getByText("Bạn đang dùng Plus.")).toBeInTheDocument();
    // Entitlements should show as active
    const activeItems = screen.getAllByText("Đang hoạt động");
    expect(activeItems.length).toBeGreaterThan(0);
  });

  it("paywall dialog opens from BillingPlan upgrade button", async () => {
    const router = createMemoryRouter(
      [{ path: "/billing/plan", element: <BillingPlan /> }],
      { initialEntries: ["/billing/plan"] },
    );
    render(<RouterProvider router={router} />);
    const user = userEvent.setup();

    await screen.findByRole("button", { name: "Nâng cấp lên Plus" });
    await user.click(screen.getByRole("button", { name: "Nâng cấp lên Plus" }));

    // Paywall dialog should open
    await screen.findByRole("dialog");
    expect(screen.getByText(/Plus cho hệ 12 tuần/i)).toBeInTheDocument();
  });

  it("mock checkout flow upgrades user to Plus", async () => {
    const { goalId } = seedTwelveWeekGoal();

    expect(getCurrentPlan()).toBe("FREE");

    const checkout = await startCheckoutFlow({
      planCode: "PLUS",
      context: "plan",
      goalId,
      source: "paywall_dialog",
      recommendedPlan: "PLUS",
    });

    expect(checkout.status).toBe("redirect_required");
    expect(checkout.checkoutUrl).toBeTruthy();

    const checkoutUrl = new URL(checkout.checkoutUrl ?? "", "http://localhost");
    const { ui } = renderAppRoute(`${checkoutUrl.pathname}${checkoutUrl.search}`);
    const user = userEvent.setup();

    await screen.findByText("Checkout mô phỏng");
    await user.click(screen.getByRole("button", { name: /Xác nhận mở Plus/i }));

    await waitFor(() => {
      expect(getCurrentPlan()).toBe("PLUS");
    });

    expect(getCurrentEntitlementKeys()).toContain("premium_templates");
    expect(getCurrentEntitlementKeys()).toContain("premium_review_insights");
    expect(getCurrentEntitlementKeys()).toContain("priority_reminders");
    expect(getCurrentEntitlementKeys()).toContain("advanced_analytics");

    ui.unmount();
  });

  it("entitlement gating: getCurrentPlan returns FREE with no subscription", () => {
    // No subscription set (clean state)
    const data = getUserData();
    expect(data.subscription).toBeNull();
    expect(getCurrentPlan()).toBe("FREE");
    expect(getCurrentEntitlementKeys()).toHaveLength(0);
  });

  it("entitlement gating: Plus user has all 4 entitlement keys", () => {
    seedTwelveWeekGoal({ planCode: "PLUS" });
    expect(getCurrentPlan()).toBe("PLUS");
    const keys = getCurrentEntitlementKeys();
    expect(keys).toContain("premium_templates");
    expect(keys).toContain("premium_review_insights");
    expect(keys).toContain("priority_reminders");
    expect(keys).toContain("advanced_analytics");
  });

  it("paywall: already active plan returns already_active status", async () => {
    seedTwelveWeekGoal({ planCode: "PLUS" });
    expect(getCurrentPlan()).toBe("PLUS");

    const result = await startCheckoutFlow({
      planCode: "PLUS",
      context: "plan",
      source: "paywall_dialog",
    });

    expect(result.status).toBe("already_active");
    expect(result.ok).toBe(true);
  });

  it("BillingPlan plan comparison shows upgrade button only for free user", async () => {
    // Free user
    const router = createMemoryRouter(
      [{ path: "/billing/plan", element: <BillingPlan /> }],
      { initialEntries: ["/billing/plan"] },
    );
    render(<RouterProvider router={router} />);

    await screen.findByText("So sánh các gói");
    // Upgrade button in the plan comparison section
    const upgradeButtons = screen.getAllByRole("button", { name: "Nâng cấp" });
    expect(upgradeButtons.length).toBeGreaterThan(0);
  });

  it("restores Plus entitlements from mock billing account", async () => {
    const { goalId } = seedTwelveWeekGoal();

    // First do a checkout to create the mock account
    const checkout = await startCheckoutFlow({
      planCode: "PLUS",
      context: "plan",
      goalId,
      source: "paywall_dialog",
      recommendedPlan: "PLUS",
    });
    expect(checkout.checkoutUrl).toBeTruthy();
    const checkoutUrl = new URL(checkout.checkoutUrl ?? "", "http://localhost");
    const { ui } = renderAppRoute(`${checkoutUrl.pathname}${checkoutUrl.search}`);
    const user = userEvent.setup();
    await screen.findByText("Checkout mô phỏng");
    await user.click(screen.getByRole("button", { name: /Xác nhận mở Plus/i }));
    await waitFor(() => expect(getCurrentPlan()).toBe("PLUS"));
    ui.unmount();

    // Wipe local subscription/entitlements
    updateUserData((data) => {
      data.subscription = null;
      data.entitlements = [];
    });
    expect(getCurrentPlan()).toBe("FREE");

    // Restore via settings tab in 12WeekSystem
    renderAppRoute("/12-week-system?tab=settings");
    await screen.findByText("Thiết bị, dữ liệu và đồng bộ");
    await user.click(screen.getByRole("button", { name: "Khôi phục giao dịch" }));

    await waitFor(() => {
      expect(getCurrentPlan()).toBe("PLUS");
    });
    expect(getCurrentEntitlementKeys()).toContain("premium_templates");
  });
});

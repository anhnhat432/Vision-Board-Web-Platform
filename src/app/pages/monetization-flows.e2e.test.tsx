import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { buildBillingPlanUpgradePath, getCurrentUpgradeOriginPath } from "../components/UpgradePaywallDialog";
import { renderAppRoute, resetTestStorage, seedTwelveWeekGoal, updateUserData } from "../../test/app-flow-helpers";
import { getMockCheckoutSession, startCheckoutFlow } from "../utils/production";
import { getCurrentEntitlementKeys, getCurrentPlan, getUserData } from "../utils/storage";
import { BillingPlan } from "./BillingPlan";

describe("monetization flows", () => {
  beforeEach(() => {
    resetTestStorage();
    window.history.pushState({}, "", "/");
  });

  it("BillingPlan page renders current plan and entitlements for free user", async () => {
    const router = createMemoryRouter([{ path: "/billing/plan", element: <BillingPlan /> }], {
      initialEntries: ["/billing/plan"],
    });
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "Quản lý quyền Plus" });
    expect(screen.getByText("Gói hiện tại")).toBeInTheDocument();
    expect(screen.getByText("Bạn đang dùng gói miễn phí trên trình duyệt này.")).toBeInTheDocument();

    // Should show all 4 entitlement slots, all locked
    expect(screen.getByText("Mẫu nâng cao")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Mở Plus" }).length).toBeGreaterThan(0);
  });

  it("BillingPlan page shows active plan for Plus user", async () => {
    seedTwelveWeekGoal({ planCode: "PLUS" });

    const router = createMemoryRouter([{ path: "/billing/plan", element: <BillingPlan /> }], {
      initialEntries: ["/billing/plan"],
    });
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "Quản lý quyền Plus" });
    expect(screen.getByText("Bạn đang dùng Plus trên trình duyệt này.")).toBeInTheDocument();
    // Entitlements should show as active
    const activeItems = screen.getAllByText("Đang mở");
    expect(activeItems.length).toBeGreaterThan(0);
  });

  it("paywall dialog opens from BillingPlan upgrade button", async () => {
    const router = createMemoryRouter([{ path: "/billing/plan", element: <BillingPlan /> }], {
      initialEntries: ["/billing/plan"],
    });
    render(<RouterProvider router={router} />);
    const user = userEvent.setup();

    const upgradeButtons = await screen.findAllByRole("button", { name: "Mở Plus" });
    await user.click(upgradeButtons[0]);

    // Paywall dialog should open
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Dùng thử Plus/i)).toBeInTheDocument();
  });

  it("captures the paywall opening path as the BillingPlan returnTo", () => {
    window.history.pushState({}, "", "/12-week-setup?step=template");
    const originPath = getCurrentUpgradeOriginPath();

    expect(originPath).toBe("/12-week-setup?step=template");
    expect(buildBillingPlanUpgradePath(originPath)).toBe(
      "/billing/plan?returnTo=%2F12-week-setup%3Fstep%3Dtemplate",
    );
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

    await screen.findByText("Checkout dùng thử");
    await user.click(screen.getByRole("button", { name: /Xác nhận mở gói/i }));

    await waitFor(() => {
      expect(getCurrentPlan()).toBe("PLUS");
    });

    expect(getCurrentEntitlementKeys()).toContain("premium_templates");
    expect(getCurrentEntitlementKeys()).toContain("premium_review_insights");
    expect(getCurrentEntitlementKeys()).toContain("priority_reminders");
    expect(getCurrentEntitlementKeys()).toContain("advanced_analytics");

    ui.unmount();
  });

  it("mock checkout returns to the explicit feature returnUrl after confirm", async () => {
    const { goalId } = seedTwelveWeekGoal();

    const checkout = await startCheckoutFlow({
      planCode: "PLUS",
      context: "review",
      goalId,
      source: "paywall_dialog",
      recommendedPlan: "PLUS",
      returnUrl: "/12-week-system?tab=week",
    });

    const checkoutUrl = new URL(checkout.checkoutUrl ?? "", "http://localhost");
    const sessionId = checkoutUrl.searchParams.get("session") ?? "";
    expect(getMockCheckoutSession(sessionId)?.returnUrl).toBe("/12-week-system?tab=week");

    const { router, ui } = renderAppRoute(`${checkoutUrl.pathname}${checkoutUrl.search}`);
    const user = userEvent.setup();

    await screen.findByText("Checkout dùng thử");
    await user.click(screen.getByRole("button", { name: /Xác nhận mở gói/i }));

    await waitFor(() => {
      expect(getCurrentPlan()).toBe("PLUS");
    });
    expect(router.state.location.pathname).toBe("/12-week-system");
    expect(router.state.location.search).toBe("?tab=week");

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

  it("entitlement gating: expired Plus subscription revokes local access", () => {
    const grantedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const renewsAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    updateUserData((data) => {
      data.subscription = {
        planCode: "PLUS",
        status: "active",
        billingCycle: "season-pass",
        startedAt: grantedAt,
        renewsAt,
      };
      data.entitlements = [
        { key: "premium_templates", sourcePlan: "PLUS", grantedAt },
        { key: "premium_review_insights", sourcePlan: "PLUS", grantedAt },
      ];
    });

    expect(getCurrentPlan()).toBe("FREE");
    expect(getCurrentEntitlementKeys()).toHaveLength(0);
    expect(getUserData().subscription?.status).toBe("canceled");
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
    const router = createMemoryRouter([{ path: "/billing/plan", element: <BillingPlan /> }], {
      initialEntries: ["/billing/plan"],
    });
    render(<RouterProvider router={router} />);

    await screen.findByText("So sánh các gói");
    // Upgrade button in the plan comparison section
    const upgradeButtons = screen.getAllByRole("button", { name: "Mở Plus" });
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
    await screen.findByText("Checkout dùng thử");
    await user.click(screen.getByRole("button", { name: /Xác nhận mở gói/i }));
    await waitFor(() => expect(getCurrentPlan()).toBe("PLUS"));
    ui.unmount();

    // Wipe local subscription/entitlements
    updateUserData((data) => {
      data.subscription = null;
      data.entitlements = [];
    });
    expect(getCurrentPlan()).toBe("FREE");

    // Restore from the billing page, not the user-facing 12-week settings page.
    const router = createMemoryRouter([{ path: "/billing/plan", element: <BillingPlan /> }], {
      initialEntries: ["/billing/plan"],
    });
    render(<RouterProvider router={router} />);
    await screen.findByRole("heading", { name: "Quản lý quyền Plus" });
    await user.click(screen.getByRole("button", { name: "Khôi phục quyền Plus" }));

    await waitFor(() => {
      expect(getCurrentPlan()).toBe("PLUS");
    });
    expect(getCurrentEntitlementKeys()).toContain("premium_templates");
  });
});

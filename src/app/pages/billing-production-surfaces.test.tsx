import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

function stubRealBillingEnv(
  providerLabel = "Stripe",
  entitlement: {
    planCode: string;
    status: string;
    entitlements: string[];
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  } = {
    planCode: "FREE",
    status: "none",
    entitlements: [],
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  },
) {
  vi.resetModules();
  vi.stubEnv("VITE_APP_MODE", "real");
  vi.stubEnv("VITE_BILLING_PROVIDER_MODE", "api_contract");
  vi.stubEnv("VITE_BILLING_PROVIDER_LABEL", providerLabel);
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
  vi.doMock("@/lib/api/apiClient", () => ({
    apiClient: {
      get: vi.fn((path: string) => {
        if (path === "/billing/entitlement") {
          return Promise.resolve({
            planCode: entitlement.planCode,
            status: entitlement.status,
            entitlements: entitlement.entitlements,
            currentPeriodEnd: entitlement.currentPeriodEnd ?? null,
            cancelAtPeriodEnd: entitlement.cancelAtPeriodEnd ?? false,
          });
        }

        return Promise.resolve({ orders: [] });
      }),
      post: vi.fn().mockResolvedValue({
        checkoutSessionId: "checkout_test",
        checkoutUrl: "https://checkout.example.test/session",
        provider: providerLabel,
        currentEntitlement: {
          planCode: "FREE",
          status: "none",
          entitlements: [],
        },
      }),
    },
    isApiBaseUrlConfigured: () => true,
    toAppError: (error: unknown) => ({
      message: error instanceof Error ? error.message : "Không thể tải dữ liệu.",
    }),
  }));
}

const UI_TEST_TIMEOUT_MS = 10_000;

describe("production billing surfaces", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/api/apiClient");
    localStorage.clear();
  });

  it("renders the active Plus plan with renewal, provider, and subscription management copy", async () => {
    stubRealBillingEnv("Stripe");
    const { BillingPlan } = await import("./BillingPlan");
    const { getUserData, saveUserData } = await import("../utils/storage");

    const data = getUserData();
    const grantedAt = "2026-05-01T00:00:00.000Z";
    data.onboardingCompleted = true;
    data.subscription = {
      planCode: "PLUS",
      status: "active",
      billingCycle: "monthly",
      startedAt: grantedAt,
      renewsAt: "2026-06-01T00:00:00.000Z",
      providerMode: "api_contract",
    };
    data.entitlements = [
      { key: "premium_templates", sourcePlan: "PLUS", grantedAt },
      { key: "premium_review_insights", sourcePlan: "PLUS", grantedAt },
    ];
    saveUserData(data);

    const router = createMemoryRouter([{ path: "/billing/plan", element: <BillingPlan /> }], {
      initialEntries: ["/billing/plan"],
    });
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "Gói hiện tại" });
    expect(screen.getAllByText("Plus").length).toBeGreaterThan(0);
    expect(screen.getByText(/Gia hạn ngày/i)).toHaveTextContent("01/06/2026");
    expect(screen.getByText("Thanh toán qua Stripe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quản lý subscription" })).toBeInTheDocument();
    expect(screen.queryByText(/\(mock\)|mô phỏng/i)).not.toBeInTheDocument();
  }, UI_TEST_TIMEOUT_MS);

  it("shows real provider checkout copy in the upgrade dialog", async () => {
    stubRealBillingEnv("VNPay");
    const { UpgradePaywallDialog } = await import("../components/UpgradePaywallDialog");

    render(
      <UpgradePaywallDialog
        open
        onOpenChange={() => undefined}
        context="plan"
        currentPlan="FREE"
        checkoutMode="checkout"
      />,
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Thanh toán qua VNPay")).toBeInTheDocument();
    expect(within(dialog).getByText(/149\.000/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Nâng cấp Plus" })).toBeInTheDocument();
    expect(within(dialog).queryByText(/mô phỏng|Bản dùng thử/i)).not.toBeInTheDocument();
  }, UI_TEST_TIMEOUT_MS);

  it("redirects mock checkout away from real provider mode", async () => {
    stubRealBillingEnv("Momo");
    const { MockBillingCheckout } = await import("./MockBillingCheckout");

    const router = createMemoryRouter(
      [
        { path: "/billing/mock-checkout", element: <MockBillingCheckout /> },
        { path: "/billing/plan", element: <div data-testid="billing-plan-page">Billing plan</div> },
      ],
      { initialEntries: ["/billing/mock-checkout?session=mock_checkout_test"] },
    );
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/billing/plan");
    });
    expect(await screen.findByTestId("billing-plan-page")).toBeInTheDocument();
  }, UI_TEST_TIMEOUT_MS);

  it("routes the real Plus upgrade CTA to the VietQR checkout page", async () => {
    stubRealBillingEnv("Casso + VietQR");
    const { BillingPlan } = await import("./BillingPlan");
    const user = userEvent.setup();

    const router = createMemoryRouter(
      [
        { path: "/billing/plan", element: <BillingPlan /> },
        { path: "/billing/checkout", element: <div data-testid="vietqr-checkout-page">VietQR checkout</div> },
      ],
      {
        initialEntries: ["/billing/plan"],
      },
    );
    render(<RouterProvider router={router} />);

    await screen.findByRole("heading", { name: "Gói hiện tại" });
    await user.click(screen.getAllByRole("button", { name: "Nâng cấp Plus" })[0]);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/billing/checkout");
    });
    expect(await screen.findByTestId("vietqr-checkout-page")).toBeInTheDocument();
  }, UI_TEST_TIMEOUT_MS);

  it("shows a 12-week plan CTA after a confirmed real checkout return", async () => {
    stubRealBillingEnv("Stripe", {
      planCode: "PLUS",
      status: "active",
      entitlements: ["premium_templates", "premium_review_insights"],
      currentPeriodEnd: "2026-06-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
    });
    const { BillingPlan } = await import("./BillingPlan");

    const router = createMemoryRouter(
      [
        { path: "/billing/plan", element: <BillingPlan /> },
        { path: "/12-week-system", element: <div data-testid="twelve-week-system-page">12-week system</div> },
      ],
      {
        initialEntries: ["/billing/plan?status=success&context=plan"],
      },
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText("Thanh toán đã xác nhận")).toBeInTheDocument();
    const startPlanLink = screen.getByRole("link", { name: "Bắt đầu 12-week plan" });
    expect(startPlanLink).toHaveAttribute("href", "/12-week-system");
  }, UI_TEST_TIMEOUT_MS);
});

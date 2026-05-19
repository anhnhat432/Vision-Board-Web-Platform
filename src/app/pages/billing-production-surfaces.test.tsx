import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, createMemoryRouter, RouterProvider } from "react-router";
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
  paymentHistory: {
    error?: unknown;
    orders?: unknown[];
  } = {},
) {
  vi.resetModules();
  vi.stubEnv("VITE_APP_MODE", "real");
  vi.stubEnv("VITE_BILLING_PROVIDER_MODE", "api_contract");
  vi.stubEnv("VITE_BILLING_PROVIDER_LABEL", providerLabel);
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
  vi.stubEnv("VITE_BILLING_PLUS_MONTHLY_PRICE_VND", "99000");
  vi.stubEnv("VITE_BILLING_PLUS_PRICE_CYCLE_LABEL", "tháng");
  const apiClient = {
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

      if (path.startsWith("/billing/public-order-status/")) {
        return Promise.resolve({
          orderId: "checkout_test",
          status: "pending",
          amount: 99000,
          currency: "VND",
          bankAccount: "123456789",
          bankName: "MB",
          accountName: "DEAR OUR FUTURE",
          qrDataUrl: "https://img.vietqr.io/image/970422-123456789-compact2.png",
          expiresAt: "2099-05-10T10:30:00.000Z",
          completedAt: null,
          createdAt: "2026-05-10T10:00:00.000Z",
        });
      }

      if (path === "/billing/checkout-info") {
        return Promise.resolve({
          amount: 99000,
          currency: "VND",
          billingCycle: "twelve_week",
          provider: providerLabel,
        });
      }

      if (path === "/billing/payment-history") {
        if (paymentHistory.error) return Promise.reject(paymentHistory.error);
        return Promise.resolve({ orders: paymentHistory.orders ?? [] });
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
  };
  vi.doMock("@/lib/api/apiClient", () => ({
    apiClient,
    isApiBaseUrlConfigured: () => true,
    toAppError: (error: unknown) => {
      if (error instanceof Error) return { message: error.message };
      if (error && typeof error === "object") {
        const value = error as {
          message?: string;
          status?: number;
          rateLimited?: boolean;
          retryAfterMs?: number;
        };
        return {
          message: value.message ?? "Không thể tải dữ liệu.",
          status: value.status,
          rateLimited: value.rateLimited,
          retryAfterMs: value.retryAfterMs,
        };
      }
      return { message: "Không thể tải dữ liệu." };
    },
  }));

  return apiClient;
}

const UI_TEST_TIMEOUT_MS = 30_000;

describe("production billing surfaces", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/api/apiClient");
    vi.doUnmock("@/lib/auth/AuthContext");
    localStorage.clear();
  });

  it(
    "renders the active Plus plan with renewal, provider, and subscription management copy",
    async () => {
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
      expect(screen.getByRole("button", { name: "Quản lý gói" })).toBeInTheDocument();
      expect(screen.queryByText(/\(mock\)|mô phỏng/i)).not.toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "localizes payment history rate-limit errors",
    async () => {
      stubRealBillingEnv(
        "Casso + VietQR",
        {
          planCode: "FREE",
          status: "none",
          entitlements: [],
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
        {
          error: {
            message: "Too many requests. Please wait a moment and try again.",
            status: 429,
            rateLimited: true,
            retryAfterMs: 60_000,
          },
        },
      );
      const { BillingPlan } = await import("./BillingPlan");

      const router = createMemoryRouter([{ path: "/billing/plan", element: <BillingPlan /> }], {
        initialEntries: ["/billing/plan"],
      });
      render(<RouterProvider router={router} />);

      expect(await screen.findByText(/Bạn vừa kiểm tra lịch sử thanh toán quá nhanh/i)).toBeInTheDocument();
      expect(screen.queryByText(/Too many requests/i)).not.toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "shows real provider checkout copy in the upgrade dialog",
    async () => {
      stubRealBillingEnv("VNPay");
      const { UpgradePaywallDialog } = await import("../components/UpgradePaywallDialog");

      render(
        <MemoryRouter>
          <UpgradePaywallDialog
            open
            onOpenChange={() => undefined}
            context="plan"
            currentPlan="FREE"
            checkoutMode="checkout"
          />
        </MemoryRouter>,
      );

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("Thanh toán qua VNPay")).toBeInTheDocument();
      expect(within(dialog).getByText(/99\.000\s*₫\s*\/\s*tháng/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/Bạn sẽ chuyển khoản 99\.000 ₫ đến tài khoản ngân hàng/i)).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Tiếp tục thanh toán" })).toBeInTheDocument();
      expect(
        within(dialog).queryByText(/demo|dùng thử miễn phí|thử miễn phí|mô phỏng|Bản dùng thử/i),
      ).not.toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "redirects the legacy checkout route to the payment confirmation page",
    async () => {
      stubRealBillingEnv("Casso + VietQR");
      const { MockBillingCheckout } = await import("./MockBillingCheckout");

      const router = createMemoryRouter(
        [
          { path: "/billing/mock-checkout", element: <MockBillingCheckout /> },
          { path: "/billing/confirm", element: <div data-testid="billing-confirm-page">Confirm checkout</div> },
        ],
        { initialEntries: ["/billing/mock-checkout?session=legacy_checkout_test"] },
      );
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/billing/confirm");
      });
      expect(await screen.findByTestId("billing-confirm-page")).toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "routes the real Plus upgrade CTA to the confirmation page",
    async () => {
      stubRealBillingEnv("Casso + VietQR");
      const { BillingPlan } = await import("./BillingPlan");
      const user = userEvent.setup();

      const router = createMemoryRouter(
        [
          { path: "/billing/plan", element: <BillingPlan /> },
          { path: "/billing/confirm", element: <div data-testid="billing-confirm-page">Confirm checkout</div> },
        ],
        {
          initialEntries: ["/billing/plan"],
        },
      );
      render(<RouterProvider router={router} />);

      await screen.findByRole("heading", { name: "Gói hiện tại" });
      await user.click(screen.getAllByRole("button", { name: "Nâng cấp Plus" })[0]);
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText(/99\.000\s*₫\s*\/\s*tháng/i)).toBeInTheDocument();
      expect(within(dialog).queryByText(/demo|dùng thử miễn phí|thử miễn phí/i)).not.toBeInTheDocument();
      await user.click(within(dialog).getByRole("button", { name: "Tiếp tục thanh toán" }));

      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/billing/confirm");
      });
      expect(await screen.findByTestId("billing-confirm-page")).toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "creates a public VietQR checkout session only after confirmation",
    async () => {
      const apiClient = stubRealBillingEnv("Casso + VietQR");
      vi.doMock("@/lib/auth/AuthContext", () => ({
        useAuthContext: () => ({
          user: null,
          authLoading: false,
        }),
      }));
      const { BillingConfirm } = await import("./BillingConfirm");

      const router = createMemoryRouter(
        [
          { path: "/billing/confirm", element: <BillingConfirm /> },
          {
            path: "/billing/checkout/:orderId",
            element: <div data-testid="vietqr-checkout-page">VietQR checkout</div>,
          },
        ],
        {
          initialEntries: ["/billing/confirm"],
        },
      );
      render(<RouterProvider router={router} />);

      expect(await screen.findByRole("heading", { name: "Bạn đang mua gì?" })).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText(/Email sẽ nhận biên nhận/i), "buyer@example.test");
      await userEvent.click(screen.getByRole("checkbox"));
      await userEvent.click(screen.getByRole("button", { name: /Xác nhận và tạo mã QR/i }));

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          "/billing/public-checkout-session",
          expect.objectContaining({
            planCode: "PLUS",
            clientUserId: expect.any(String),
            receiptEmail: "buyer@example.test",
          }),
        );
      });
      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/billing/checkout/checkout_test");
      });
      expect(await screen.findByTestId("vietqr-checkout-page")).toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "shows a 12-week plan CTA after a confirmed real checkout return",
    async () => {
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
      const startPlanLink = screen.getByRole("link", { name: "Bắt đầu kế hoạch 12 tuần" });
      expect(startPlanLink).toHaveAttribute("href", "/12-week-system");
    },
    UI_TEST_TIMEOUT_MS,
  );
});

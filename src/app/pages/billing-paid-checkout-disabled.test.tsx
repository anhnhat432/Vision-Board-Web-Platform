import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the paid-checkout kill-switch (`VITE_BILLING_PAID_CHECKOUT_DISABLED`).
 *
 * The flag is read at module load time, so each test resets modules and
 * stubs the env before importing the component under test.
 */

function stubBillingEnvWithKillSwitch(
  killSwitchValue: string,
  options: {
    authUser?: { uid: string; email: string; emailVerified?: boolean } | null;
    paymentHistoryOrders?: unknown[];
  } = {},
) {
  vi.resetModules();
  vi.stubEnv("VITE_APP_MODE", "real");
  vi.stubEnv("VITE_BILLING_PROVIDER_MODE", "api_contract");
  vi.stubEnv("VITE_BILLING_PROVIDER_LABEL", "Nhà cung cấp thanh toán");
  vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
  vi.stubEnv("VITE_BILLING_PLUS_MONTHLY_PRICE_VND", "99000");
  vi.stubEnv("VITE_BILLING_PLUS_PRICE_CYCLE_LABEL", "tháng");
  vi.stubEnv("VITE_BILLING_SUPPORT_EMAIL", "support@example.test");
  vi.stubEnv("VITE_BILLING_PAID_CHECKOUT_DISABLED", killSwitchValue);

  const apiClient = {
    get: vi.fn((path: string) => {
      if (path === "/billing/entitlement") {
        return Promise.resolve({
          planCode: "FREE",
          status: "none",
          entitlements: [],
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        });
      }
      if (path === "/billing/checkout-info") {
        return Promise.resolve({
          amount: 99000,
          currency: "VND",
          billingCycle: "twelve_week",
          provider: "Nhà cung cấp thanh toán",
        });
      }
      if (path === "/billing/payment-history") {
        return Promise.resolve({ orders: options.paymentHistoryOrders ?? [] });
      }
      if (path.startsWith("/billing/public-order-status/") || path.startsWith("/billing/order-status/")) {
        return Promise.resolve({
          orderId: "VBPEND0001",
          status: "pending",
          amount: 99000,
          currency: "VND",
          bankAccount: "123456789",
          bankName: "MB",
          accountName: "DEAR OUR FUTURE",
          qrDataUrl: "https://checkout.example.test/payment-code.png",
          expiresAt: "2099-05-22T00:30:00.000Z",
          completedAt: null,
          createdAt: "2026-05-22T00:00:00.000Z",
        });
      }
      return Promise.resolve({ orders: [] });
    }),
    post: vi.fn(),
  };

  vi.doMock("@/lib/api/apiClient", () => ({
    apiClient,
    isApiBaseUrlConfigured: () => true,
    toAppError: (error: unknown) => {
      if (error instanceof Error) return { message: error.message };
      return { message: "Không thể tải dữ liệu." };
    },
  }));

  vi.doMock("@/lib/auth/AuthContext", () => ({
    useOptionalAuthContext: () => ({
      user: options.authUser ?? null,
      authLoading: false,
    }),
    useAuthContext: () => ({
      user: options.authUser ?? null,
      authLoading: false,
    }),
  }));

  return apiClient;
}

const UI_TEST_TIMEOUT_MS = 30_000;

describe("paid checkout kill-switch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/api/apiClient");
    vi.doUnmock("@/lib/auth/AuthContext");
    localStorage.clear();
  });

  describe("UpgradePaywallDialog", () => {
    it(
      "disables checkout buttons and shows tạm khóa banner when flag is on",
      async () => {
        stubBillingEnvWithKillSwitch("1");
        const { UpgradePaywallDialog } = await import("../components/UpgradePaywallDialog");

        render(
          <MemoryRouter>
            <UpgradePaywallDialog
              open
              onOpenChange={() => undefined}
              context="plan"
              currentPlan="FREE"
            />
          </MemoryRouter>,
        );

        const dialog = await screen.findByRole("dialog");
        const banner = within(dialog).getByTestId("paid-checkout-disabled-banner");
        expect(banner).toBeInTheDocument();
        expect(banner).toHaveTextContent("Đang hoàn tất tích hợp hệ thống thanh toán mới");
        expect(banner).toHaveTextContent("Quyền hiện có không bị ảnh hưởng");
        expect(banner).toHaveTextContent("mở Plus thủ công");
        const cta = within(dialog).getByTestId("paywall-upgrade-cta-plus");
        expect(cta).toBeDisabled();
        expect(cta).toHaveTextContent("Tạm khóa thanh toán");
      },
      UI_TEST_TIMEOUT_MS,
    );

    it(
      "does not navigate to confirmation when disabled CTA is clicked",
      async () => {
        stubBillingEnvWithKillSwitch("true");
        const { UpgradePaywallDialog } = await import("../components/UpgradePaywallDialog");
        const user = userEvent.setup();

        const router = createMemoryRouter(
          [
            {
              path: "/paywall-test",
              element: (
                <UpgradePaywallDialog open onOpenChange={() => undefined} context="plan" currentPlan="FREE" />
              ),
            },
            { path: "/billing/confirm", element: <div data-testid="billing-confirm-page">Confirm</div> },
          ],
          { initialEntries: ["/paywall-test"] },
        );
        render(<RouterProvider router={router} />);

        const dialog = await screen.findByRole("dialog");
        await user.click(within(dialog).getByTestId("paywall-upgrade-cta-plus"));

        expect(router.state.location.pathname).toBe("/paywall-test");
        expect(screen.queryByTestId("billing-confirm-page")).not.toBeInTheDocument();
      },
      UI_TEST_TIMEOUT_MS,
    );

    it(
      "keeps checkout buttons enabled when flag is off",
      async () => {
        stubBillingEnvWithKillSwitch("0");
        const { UpgradePaywallDialog } = await import("../components/UpgradePaywallDialog");

        render(
          <MemoryRouter>
            <UpgradePaywallDialog
              open
              onOpenChange={() => undefined}
              context="plan"
              currentPlan="FREE"
            />
          </MemoryRouter>,
        );

        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).queryByTestId("paid-checkout-disabled-banner")).not.toBeInTheDocument();
        const cta = within(dialog).getByTestId("paywall-upgrade-cta-plus");
        expect(cta).not.toBeDisabled();
        expect(cta).toHaveTextContent("Tiếp tục thanh toán");
      },
      UI_TEST_TIMEOUT_MS,
    );
  });

  describe("/billing/confirm", () => {
    it(
      "shows banner, disables submit, and never POSTs when flag is on",
      async () => {
        const apiClient = stubBillingEnvWithKillSwitch("true");
        const { BillingConfirm } = await import("./BillingConfirm");

        const router = createMemoryRouter(
          [
            { path: "/billing/confirm", element: <BillingConfirm /> },
            { path: "/billing/checkout/:orderId", element: <div>Checkout</div> },
          ],
          { initialEntries: ["/billing/confirm"] },
        );
        render(<RouterProvider router={router} />);

        expect(await screen.findByRole("heading", { name: "Bạn đang mua gì?" })).toBeInTheDocument();
        const banner = screen.getByTestId("paid-checkout-disabled-banner");
        expect(banner).toBeInTheDocument();
        expect(banner).toHaveTextContent("Đang hoàn tất tích hợp hệ thống thanh toán mới");
        expect(banner).toHaveTextContent("Quyền hiện có không bị ảnh hưởng");
        expect(banner).toHaveTextContent("mở Plus thủ công");

        const submit = screen.getByRole("button", { name: /Tạm khóa thanh toán/i });
        expect(submit).toBeDisabled();

        // User fills email + agreement: button must remain disabled.
        await userEvent.type(screen.getByLabelText(/Email sẽ nhận biên nhận/i), "buyer@example.test");
        await userEvent.click(screen.getByRole("checkbox"));
        expect(screen.getByRole("button", { name: /Tạm khóa thanh toán/i })).toBeDisabled();

        expect(router.state.location.pathname).toBe("/billing/confirm");
        expect(screen.queryByText("Checkout")).not.toBeInTheDocument();

        // No POST should have been issued.
        expect(apiClient.post).not.toHaveBeenCalled();
      },
      UI_TEST_TIMEOUT_MS,
    );
  });

  describe("/billing/checkout/:orderId", () => {
    it(
      "shows lock fallback instead of QR/payment details when flag is on",
      async () => {
        stubBillingEnvWithKillSwitch("true");
        const { BillingCheckoutQR } = await import("./BillingCheckoutQR");

        const router = createMemoryRouter([{ path: "/billing/checkout/:orderId", element: <BillingCheckoutQR /> }], {
          initialEntries: ["/billing/checkout/VBPEND0001"],
        });
        render(<RouterProvider router={router} />);

        const banner = await screen.findByTestId("paid-checkout-disabled-banner");
        expect(banner).toHaveTextContent("Thanh toán đang tạm khóa");
        expect(banner).toHaveTextContent("mở Plus thủ công");
        expect(screen.queryByAltText(/Mã thanh toán tự động/i)).not.toBeInTheDocument();
        expect(screen.queryByText("Thông tin chuyển khoản")).not.toBeInTheDocument();
        expect(screen.queryByText("Tiếp tục thanh toán")).not.toBeInTheDocument();
        expect(router.state.location.pathname).toBe("/billing/checkout/VBPEND0001");
      },
      UI_TEST_TIMEOUT_MS,
    );
  });

  describe("/billing/plan", () => {
    it(
      "shows banner and disables Free→Plus CTA when flag is on",
      async () => {
        stubBillingEnvWithKillSwitch("yes");
        const { BillingPlan } = await import("./BillingPlan");

        const router = createMemoryRouter([{ path: "/billing/plan", element: <BillingPlan /> }], {
          initialEntries: ["/billing/plan"],
        });
        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: "Chọn gói phù hợp với bạn" });
        const banner = screen.getByTestId("paid-checkout-disabled-banner");
        expect(banner).toBeInTheDocument();
        expect(banner).toHaveTextContent("Đang hoàn tất tích hợp hệ thống thanh toán mới");
        expect(banner).toHaveTextContent("Quyền hiện có không bị ảnh hưởng");
        expect(banner).toHaveTextContent("mở Plus thủ công");

        const upgradeCta = screen.getByTestId("billing-plan-upgrade-cta");
        expect(upgradeCta).toBeDisabled();
        expect(upgradeCta).toHaveTextContent("Tạm khóa thanh toán");
      },
      UI_TEST_TIMEOUT_MS,
    );

    it(
      "does not navigate to existing checkout orders when flag is on",
      async () => {
        stubBillingEnvWithKillSwitch("true", {
          authUser: { uid: "billing_user", email: "buyer@example.test", emailVerified: true },
          paymentHistoryOrders: [
            {
              orderId: "VBPEND0001",
              planCode: "PLUS",
              billingCycle: "twelve_week",
              amount: 99000,
              currency: "VND",
              status: "pending",
              provider: "payment_provider",
              createdAt: "2026-05-22T00:00:00.000Z",
              completedAt: null,
              expiresAt: "2099-05-22T00:30:00.000Z",
              receiptSentAt: null,
              refundRequest: null,
            },
          ],
        });
        const { BillingPlan } = await import("./BillingPlan");
        const user = userEvent.setup();

        const router = createMemoryRouter(
          [
            { path: "/billing/plan", element: <BillingPlan /> },
            { path: "/billing/checkout/:orderId", element: <div data-testid="billing-checkout-page">Checkout</div> },
          ],
          {
            initialEntries: ["/billing/plan"],
          },
        );
        render(<RouterProvider router={router} />);

        const orderLabel = await screen.findByText("VBPEND0001");
        const orderRow = orderLabel.closest(".grid");
        expect(orderRow).not.toBeNull();
        const pendingCheckoutButton = within(orderRow as HTMLElement).getByRole("button", {
          name: "Tạm khóa thanh toán",
        });
        expect(pendingCheckoutButton).toBeDisabled();
        await user.click(pendingCheckoutButton);

        expect(router.state.location.pathname).toBe("/billing/plan");
        expect(screen.queryByTestId("billing-checkout-page")).not.toBeInTheDocument();
      },
      UI_TEST_TIMEOUT_MS,
    );

    it(
      "does not open paywall dialog when disabled CTA is force-clicked",
      async () => {
        stubBillingEnvWithKillSwitch("on");
        const { BillingPlan } = await import("./BillingPlan");

        const router = createMemoryRouter(
          [
            { path: "/billing/plan", element: <BillingPlan /> },
            { path: "/billing/confirm", element: <div data-testid="billing-confirm-page">Confirm</div> },
          ],
          {
            initialEntries: ["/billing/plan"],
          },
        );
        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: "Chọn gói phù hợp với bạn" });
        const upgradeCta = screen.getByTestId("billing-plan-upgrade-cta");
        // Browser would block clicks on a disabled button; this asserts UI state directly.
        await waitFor(() => {
          expect(upgradeCta).toBeDisabled();
        });
        await userEvent.click(upgradeCta);
        expect(router.state.location.pathname).toBe("/billing/plan");
        expect(screen.queryByTestId("billing-confirm-page")).not.toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      },
      UI_TEST_TIMEOUT_MS,
    );
  });
});

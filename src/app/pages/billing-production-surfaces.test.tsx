import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";
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
    get: vi.fn(
      (path: string, _options?: { signal?: AbortSignal }): Promise<unknown> => {
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
            qrDataUrl:
              "https://img.vietqr.io/image/970422-123456789-compact2.png",
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
      },
    ),
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

async function findUpgradeDialog() {
  const title = await screen.findByRole("heading", { name: /Mở Plus/i });
  const dialog = title.closest('[role="dialog"]');
  expect(dialog).toBeDefined();
  return dialog as HTMLElement;
}

function stubAuthContext(
  user: { email: string; emailVerified?: boolean; uid?: string } | null,
) {
  const authUser = user
    ? {
        uid: user.uid ?? "billing-test-user",
        email: user.email,
        emailVerified: user.emailVerified ?? true,
      }
    : null;
  const optionalAuthContext = {
    user: authUser,
    userProfile: null,
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
  };

  vi.doMock("@/lib/auth/AuthContext", () => ({
    useOptionalAuthContext: () => optionalAuthContext,
    useAuthContext: () => optionalAuthContext,
  }));
}

describe("production billing surfaces", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/api/apiClient");
    vi.doUnmock("@/lib/auth/AuthContext");
    vi.doUnmock("@/lib/auth/firebase");
    vi.doUnmock("qrcode");
    localStorage.clear();
  });

  it("keeps Casso checkout sessions on the internal QR route", async () => {
    const { getCheckoutRedirectTarget } = await import("./BillingConfirm");

    expect(
      getCheckoutRedirectTarget(
        {
          checkoutSessionId: "VBABCDEFGH",
          checkoutUrl:
            "https://img.vietqr.io/image/970422-123456789-compact2.png",
          provider: "casso",
        },
        "https://dearourfuture.io.vn",
      ),
    ).toEqual({ kind: "internal", path: "/billing/checkout/VBABCDEFGH" });
  });

  it("uses hosted checkout URLs for PayOS sessions", async () => {
    const { getCheckoutRedirectTarget } = await import("./BillingConfirm");

    expect(
      getCheckoutRedirectTarget(
        {
          checkoutSessionId: "VBABCDEFGH",
          checkoutUrl: "https://pay.payos.vn/web/pay/payos_link_created",
          provider: "payos",
        },
        "https://dearourfuture.io.vn",
      ),
    ).toEqual({
      kind: "external",
      url: "https://pay.payos.vn/web/pay/payos_link_created",
    });
  });

  it("renders a visible PayOS QR on the internal checkout page when a PayOS order is opened directly", async () => {
    const apiClient = stubRealBillingEnv("payos");
    stubAuthContext(null);
    vi.doMock("qrcode", () => ({
      toDataURL: vi
        .fn()
        .mockResolvedValue("data:image/png;base64,generated-payos-qr"),
    }));
    apiClient.get.mockImplementation((path: string) => {
      if (path.startsWith("/billing/public-order-status/")) {
        return Promise.resolve({
          orderId: "VBPAYOS001",
          status: "pending",
          amount: 99000,
          currency: "VND",
          provider: "payos",
          checkoutUrl: "https://pay.payos.vn/web/pay/payos_link_created",
          bankAccount: "payos",
          bankName: "970422",
          accountName: "VISION BOARD",
          qrDataUrl: "00020101021238540010A000000727012400069704220110PAYOSRAW",
          expiresAt: "2099-05-10T10:30:00.000Z",
          completedAt: null,
          createdAt: "2026-05-10T10:00:00.000Z",
        });
      }
      return Promise.resolve({ orders: [] });
    });

    const { BillingCheckoutQR } = await import("./BillingCheckoutQR");
    const router = createMemoryRouter(
      [{ path: "/billing/checkout/:orderId", element: <BillingCheckoutQR /> }],
      {
        initialEntries: ["/billing/checkout/VBPAYOS001"],
      },
    );

    render(<RouterProvider router={router} />);

    const qrImage = await screen.findByAltText("Mã thanh toán tự động");
    expect(qrImage).toHaveAttribute(
      "src",
      "data:image/png;base64,generated-payos-qr",
    );
    expect(screen.getByText("MB Bank (970422)")).toBeInTheDocument();
    expect(screen.getByText("STK/Mã nhận PayOS")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Quét QR hoặc mở cổng PayOS để lấy thông tin chuyển khoản chính xác",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Mở PayOS nếu quét không được/i }),
    ).toBeInTheDocument();
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
        renewsAt: "2099-06-01T00:00:00.000Z",
        providerMode: "api_contract",
      };
      data.entitlements = [
        { key: "premium_templates", sourcePlan: "PLUS", grantedAt },
        { key: "premium_review_insights", sourcePlan: "PLUS", grantedAt },
      ];
      saveUserData(data);

      const router = createMemoryRouter(
        [{ path: "/billing/plan", element: <BillingPlan /> }],
        {
          initialEntries: ["/billing/plan"],
        },
      );
      render(<RouterProvider router={router} />);

      await screen.findByRole("heading", { name: "Gói hiện tại" });
      expect(screen.getAllByText("Plus").length).toBeGreaterThan(0);
      expect(screen.getByText(/Gia hạn ngày/i)).toHaveTextContent("01/06/2099");
      expect(screen.getByText("Thanh toán qua Stripe")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Quản lý gói" }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/\(mock\)|mô phỏng/i)).not.toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "cancels Plus at period end through the backend and keeps refund and support paths visible",
    async () => {
      const apiClient = stubRealBillingEnv("Nhà cung cấp thanh toán", {
        planCode: "PLUS",
        status: "active",
        entitlements: ["premium_templates", "premium_review_insights"],
        currentPeriodEnd: "2099-06-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
      });
      stubAuthContext({ email: "plus@example.test", uid: "plus-user" });
      vi.stubEnv("VITE_BILLING_SUPPORT_EMAIL", "billing-support@example.test");
      apiClient.post.mockImplementation((path: string) => {
        if (path === "/billing/subscription/cancel") {
          return Promise.resolve({
            status: "pending_cancel",
            message:
              "Plus sẽ kết thúc vào 01/06/2099. Bạn vẫn dùng gói đến hết chu kỳ hiện tại.",
            currentEntitlement: {
              planCode: "PLUS",
              status: "active",
              entitlements: [
                "premium_templates",
                "premium_review_insights",
              ],
              currentPeriodEnd: "2099-06-01T00:00:00.000Z",
              cancelAtPeriodEnd: true,
            },
          });
        }

        return Promise.resolve({
          checkoutSessionId: "checkout_test",
          checkoutUrl: "https://checkout.example.test/session",
          provider: "Nhà cung cấp thanh toán",
          currentEntitlement: {
            planCode: "FREE",
            status: "none",
            entitlements: [],
          },
        });
      });
      const { BillingPlan } = await import("./BillingPlan");
      const { getUserData, saveUserData } = await import("../utils/storage");
      const grantedAt = "2026-05-01T00:00:00.000Z";
      saveUserData({
        ...getUserData(),
        onboardingCompleted: true,
        subscription: {
          planCode: "PLUS",
          status: "active",
          billingCycle: "monthly",
          startedAt: grantedAt,
          renewsAt: "2099-06-01T00:00:00.000Z",
          providerMode: "api_contract",
        },
        entitlements: [
          { key: "premium_templates", sourcePlan: "PLUS", grantedAt },
          { key: "premium_review_insights", sourcePlan: "PLUS", grantedAt },
        ],
      });
      const user = userEvent.setup();

      const router = createMemoryRouter(
        [{ path: "/billing/plan", element: <BillingPlan /> }],
        {
          initialEntries: ["/billing/plan"],
        },
      );
      render(<RouterProvider router={router} />);

      await screen.findByRole("heading", { name: "Gói hiện tại" });
      await user.click(
        screen.getByRole("button", { name: "Tôi không muốn dùng nữa" }),
      );
      expect(
        await screen.findByText("Hủy Plus vào cuối chu kỳ hiện tại?"),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Hủy gói cuối kỳ" }),
      );

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          "/billing/subscription/cancel",
          {},
        );
      });
      await waitFor(() => {
        expect(
          screen.queryByText("Hủy Plus vào cuối chu kỳ hiện tại?"),
        ).not.toBeInTheDocument();
      });

      const resultBanner = await screen.findByTestId(
        "billing-cancel-at-period-end-result",
      );
      expect(resultBanner).toHaveTextContent(
        "Plus sẽ kết thúc vào 01/06/2099. Bạn vẫn dùng gói đến hết chu kỳ hiện tại.",
      );
      expect(
        screen.getByRole("button", {
          name: "Yêu cầu hoàn tiền cho chu kỳ chưa dùng",
        }),
      ).toBeInTheDocument();
      const supportLinks = screen.getAllByRole("link", {
        name: "billing-support@example.test",
      });
      expect(supportLinks[0]).toHaveAttribute(
        "href",
        "mailto:billing-support@example.test",
      );
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "shows persisted cancel-at-period-end state after a billing page reload",
    async () => {
      stubRealBillingEnv("Nhà cung cấp thanh toán", {
        planCode: "PLUS",
        status: "active",
        entitlements: ["premium_templates", "premium_review_insights"],
        currentPeriodEnd: "2099-06-01T00:00:00.000Z",
        cancelAtPeriodEnd: true,
      });
      stubAuthContext({ email: "plus@example.test", uid: "plus-user" });
      const { BillingPlan } = await import("./BillingPlan");
      const { getUserData, saveUserData } = await import("../utils/storage");
      const grantedAt = "2026-05-01T00:00:00.000Z";
      saveUserData({
        ...getUserData(),
        onboardingCompleted: true,
        subscription: {
          planCode: "PLUS",
          status: "active",
          billingCycle: "monthly",
          startedAt: grantedAt,
          renewsAt: "2099-06-01T00:00:00.000Z",
          cancelAtPeriodEnd: true,
          providerMode: "api_contract",
        },
        entitlements: [
          { key: "premium_templates", sourcePlan: "PLUS", grantedAt },
          { key: "premium_review_insights", sourcePlan: "PLUS", grantedAt },
        ],
      });

      const router = createMemoryRouter(
        [{ path: "/billing/plan", element: <BillingPlan /> }],
        {
          initialEntries: ["/billing/plan"],
        },
      );
      render(<RouterProvider router={router} />);

      await screen.findByRole("heading", { name: "Gói hiện tại" });
      expect(
        await screen.findByTestId("billing-cancel-at-period-end-result"),
      ).toHaveTextContent("Plus sẽ kết thúc vào 01/06/2099");
      expect(screen.getByText("Kết thúc")).toBeInTheDocument();
      expect(screen.getByText("Sẽ kết thúc cuối kỳ")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Tôi không muốn dùng nữa" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: "Yêu cầu hoàn tiền cho chu kỳ chưa dùng",
        }),
      ).toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "updates the billing page to scheduled-cancel state after entitlement sync",
    async () => {
      stubRealBillingEnv("Nhà cung cấp thanh toán", {
        planCode: "PLUS",
        status: "active",
        entitlements: ["premium_templates", "premium_review_insights"],
        currentPeriodEnd: "2099-06-01T00:00:00.000Z",
        cancelAtPeriodEnd: true,
      });
      stubAuthContext({ email: "plus@example.test", uid: "plus-user" });
      const { BillingPlan } = await import("./BillingPlan");
      const { getUserData, saveUserData } = await import("../utils/storage");
      const grantedAt = "2026-05-01T00:00:00.000Z";
      saveUserData({
        ...getUserData(),
        onboardingCompleted: true,
        subscription: {
          planCode: "PLUS",
          status: "active",
          billingCycle: "monthly",
          startedAt: grantedAt,
          renewsAt: "2099-06-01T00:00:00.000Z",
          providerMode: "api_contract",
        },
        entitlements: [
          { key: "premium_templates", sourcePlan: "PLUS", grantedAt },
          { key: "premium_review_insights", sourcePlan: "PLUS", grantedAt },
        ],
      });
      const user = userEvent.setup();

      const router = createMemoryRouter(
        [{ path: "/billing/plan", element: <BillingPlan /> }],
        {
          initialEntries: ["/billing/plan"],
        },
      );
      render(<RouterProvider router={router} />);

      await screen.findByRole("heading", { name: "Gói hiện tại" });
      expect(
        screen.getByRole("button", { name: "Tôi không muốn dùng nữa" }),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Kiểm tra quyền nâng cao" }),
      );

      await waitFor(() => {
        expect(
          screen.getByText("Sẽ kết thúc cuối kỳ"),
        ).toBeInTheDocument();
      });
      expect(
        await screen.findByTestId("billing-cancel-at-period-end-result"),
      ).toHaveTextContent("Plus sẽ kết thúc vào 01/06/2099");
      expect(
        screen.queryByRole("button", { name: "Tôi không muốn dùng nữa" }),
      ).not.toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it("does not unlock local Plus access from checkout-session currentEntitlement", async () => {
    const apiClient = stubRealBillingEnv("casso");
    vi.doMock("@/lib/auth/firebase", () => ({
      getFirebaseAuth: () => ({
        currentUser: {
          uid: "billing-test-user",
          email: "billing-user@example.test",
          emailVerified: true,
        },
      }),
    }));
    apiClient.post.mockResolvedValueOnce({
      checkoutSessionId: "VBNOLOCALUNLOCK",
      checkoutUrl: "https://checkout.example.test/session",
      provider: "casso",
      currentEntitlement: {
        planCode: "PLUS",
        status: "active",
        entitlements: ["premium_templates", "premium_review_insights"],
      },
    });

    const { startCheckoutFlow } = await import("../utils/production");
    const { getCurrentEntitlementKeys, getCurrentPlan, getUserData } =
      await import("../utils/storage");

    expect(getCurrentPlan()).toBe("FREE");

    const result = await startCheckoutFlow({
      planCode: "PLUS",
      context: "plan",
      source: "billing_plan",
      recommendedPlan: "PLUS",
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/billing/checkout-session",
      expect.objectContaining({
        planCode: "PLUS",
        billingCycle: "twelve_week",
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      status: "redirect_required",
      providerMode: "api_contract",
      planCode: "FREE",
      checkoutUrl: "/billing/checkout/VBNOLOCALUNLOCK",
    });
    expect(getCurrentPlan()).toBe("FREE");
    expect(getCurrentEntitlementKeys()).toEqual([]);
    expect(getUserData().subscription).toBeNull();
  });

  it(
    "does not request protected payment history before a user signs in",
    async () => {
      const apiClient = stubRealBillingEnv("casso");
      stubAuthContext(null);
      const { BillingPlan } = await import("./BillingPlan");

      const router = createMemoryRouter(
        [{ path: "/billing/plan", element: <BillingPlan /> }],
        {
          initialEntries: ["/billing/plan"],
        },
      );
      render(<RouterProvider router={router} />);

      await screen.findByRole("heading", { name: "Chọn gói phù hợp với bạn" });
      expect(screen.getByTestId("billing-payment-history")).toHaveAttribute(
        "data-payment-history-state",
        "signed-out",
      );
      expect(
        screen.getByText(
          /Đăng nhập để xem lịch sử thanh toán gắn với tài khoản này/i,
        ),
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(apiClient.get).not.toHaveBeenCalledWith(
          "/billing/payment-history",
        );
      });
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "localizes payment history rate-limit errors",
    async () => {
      stubRealBillingEnv(
        "Nhà cung cấp thanh toán",
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
      stubAuthContext({ email: "billing-user@example.test" });
      const { BillingPlan } = await import("./BillingPlan");

      const router = createMemoryRouter(
        [{ path: "/billing/plan", element: <BillingPlan /> }],
        {
          initialEntries: ["/billing/plan"],
        },
      );
      render(<RouterProvider router={router} />);

      expect(
        await screen.findByText(
          /Bạn vừa kiểm tra lịch sử thanh toán quá nhanh/i,
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Too many requests/i)).not.toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "marks payment history as a retryable error when the request times out",
    async () => {
      vi.useFakeTimers();
      const apiClient = stubRealBillingEnv("Nhà cung cấp thanh toán");
      const originalGet = apiClient.get.getMockImplementation();
      apiClient.get.mockImplementation(
        (path: string, options?: { signal?: AbortSignal }) => {
          if (path === "/billing/payment-history") {
            return new Promise((_resolve, reject) => {
              options?.signal?.addEventListener(
                "abort",
                () =>
                  reject(
                    new DOMException("The operation timed out.", "AbortError"),
                  ),
                { once: true },
              );
            });
          }
          return originalGet?.(path) ?? Promise.resolve({ orders: [] });
        },
      );
      stubAuthContext({ email: "billing-user@example.test" });
      const { PAYMENT_HISTORY_REQUEST_TIMEOUT_MS } =
        await import("@/features/billing/usePaymentHistory");
      const { BillingPlan } = await import("./BillingPlan");

      const router = createMemoryRouter(
        [{ path: "/billing/plan", element: <BillingPlan /> }],
        {
          initialEntries: ["/billing/plan"],
        },
      );
      render(<RouterProvider router={router} />);

      const paymentHistorySection = screen.getByTestId(
        "billing-payment-history",
      );
      expect(paymentHistorySection).toHaveAttribute(
        "data-payment-history-state",
        "loading",
      );

      await act(async () => {
        vi.advanceTimersByTime(PAYMENT_HISTORY_REQUEST_TIMEOUT_MS);
        await Promise.resolve();
      });

      expect(
        screen.getByText(/Không thể tải lịch sử thanh toán sau vài giây/i),
      ).toBeInTheDocument();
      expect(paymentHistorySection).toHaveAttribute(
        "data-payment-history-state",
        "error",
      );
      expect(
        screen.getByRole("button", { name: "Thử lại" }),
      ).toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "shows real provider checkout copy in the upgrade dialog",
    async () => {
      stubRealBillingEnv("VNPay");
      const { UpgradePaywallDialog } =
        await import("../components/UpgradePaywallDialog");

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

      const dialog = await findUpgradeDialog();
      expect(
        within(dialog).getByText("Thanh toán qua VNPay"),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText(/99\.000\s*₫\s*\/\s*tháng/i),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText(
          /Bạn sẽ thanh toán 99\.000 ₫ qua nhà cung cấp thanh toán/i,
        ),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByRole("button", { name: "Tiếp tục thanh toán" }),
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByText(
          /demo|dùng thử miễn phí|thử miễn phí|mô phỏng|Bản dùng thử/i,
        ),
      ).not.toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "redirects the legacy checkout route to the payment confirmation page",
    async () => {
      stubRealBillingEnv("Nhà cung cấp thanh toán");
      const { MockBillingCheckout } = await import("./MockBillingCheckout");

      const router = createMemoryRouter(
        [
          { path: "/billing/mock-checkout", element: <MockBillingCheckout /> },
          {
            path: "/billing/confirm",
            element: (
              <div data-testid="billing-confirm-page">Confirm checkout</div>
            ),
          },
        ],
        {
          initialEntries: [
            "/billing/mock-checkout?session=legacy_checkout_test",
          ],
        },
      );
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/billing/confirm");
      });
      expect(
        await screen.findByTestId("billing-confirm-page"),
      ).toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "routes the real Plus upgrade CTA to the confirmation page",
    async () => {
      stubRealBillingEnv("Nhà cung cấp thanh toán");
      const { BillingPlan } = await import("./BillingPlan");
      const user = userEvent.setup();

      const router = createMemoryRouter(
        [
          { path: "/billing/plan", element: <BillingPlan /> },
          {
            path: "/billing/confirm",
            element: (
              <div data-testid="billing-confirm-page">Confirm checkout</div>
            ),
          },
        ],
        {
          initialEntries: ["/billing/plan"],
        },
      );
      render(<RouterProvider router={router} />);

      await screen.findByRole("heading", { name: "Gói hiện tại" });
      await user.click(
        screen.getAllByRole("button", { name: "Nâng cấp Plus" })[0],
      );
      const dialog = await findUpgradeDialog();
      expect(
        within(dialog).getByText(/99\.000\s*₫\s*\/\s*tháng/i),
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByText(/demo|dùng thử miễn phí|thử miễn phí/i),
      ).not.toBeInTheDocument();
      await user.click(
        within(dialog).getByRole("button", { name: "Tiếp tục thanh toán" }),
      );

      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/billing/confirm");
      });
      expect(
        await screen.findByTestId("billing-confirm-page"),
      ).toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "creates a public payment session only after confirmation",
    async () => {
      const apiClient = stubRealBillingEnv("casso");
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
            element: (
              <div data-testid="payment-checkout-page">Payment checkout</div>
            ),
          },
        ],
        {
          initialEntries: ["/billing/confirm"],
        },
      );
      render(<RouterProvider router={router} />);

      expect(
        await screen.findByRole("heading", { name: "Bạn đang mua gì?" }),
      ).toBeInTheDocument();
      await userEvent.type(
        screen.getByLabelText(/Email sẽ nhận biên nhận/i),
        "buyer@example.test",
      );
      await userEvent.click(screen.getByRole("checkbox"));
      await userEvent.click(
        screen.getByRole("button", { name: /Xác nhận và tạo thanh toán/i }),
      );

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          "/billing/public-checkout-session",
          expect.objectContaining({
            planCode: "PLUS",
            clientUserId: expect.any(String),
            receiptEmail: "buyer@example.test",
            returnUrl: "http://localhost:3000/billing/checkout/__session_id__",
          }),
        );
      });
      await waitFor(() => {
        expect(router.state.location.pathname).toBe(
          "/billing/checkout/checkout_test",
        );
      });
      expect(
        await screen.findByTestId("payment-checkout-page"),
      ).toBeInTheDocument();
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "keeps customer portal reachable for real-mode Plus users",
    async () => {
      const apiClient = stubRealBillingEnv("Nhà cung cấp thanh toán", {
        planCode: "PLUS",
        status: "active",
        entitlements: ["premium_templates", "premium_review_insights"],
        currentPeriodEnd: "2099-06-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
      });
      stubAuthContext({ email: "plus@example.test", uid: "plus-user" });
      apiClient.post.mockImplementation((path: string) => {
        if (path === "/billing/customer-portal") {
          return Promise.resolve({
            supported: true,
            portalUrl: "https://billing.example.test/portal/session",
            provider: "Nhà cung cấp thanh toán",
            message: "Đã tạo liên kết quản lý thanh toán.",
          });
        }

        return Promise.resolve({
          checkoutSessionId: "checkout_test",
          checkoutUrl: "https://checkout.example.test/session",
          provider: "Nhà cung cấp thanh toán",
          currentEntitlement: {
            planCode: "FREE",
            status: "none",
            entitlements: [],
          },
        });
      });
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
      const { BillingPlan } = await import("./BillingPlan");
      const { getUserData, saveUserData } = await import("../utils/storage");
      const grantedAt = "2026-05-01T00:00:00.000Z";
      saveUserData({
        ...getUserData(),
        onboardingCompleted: true,
        subscription: {
          planCode: "PLUS",
          status: "active",
          billingCycle: "monthly",
          startedAt: grantedAt,
          renewsAt: "2099-06-01T00:00:00.000Z",
          providerMode: "api_contract",
        },
        entitlements: [
          { key: "premium_templates", sourcePlan: "PLUS", grantedAt },
          { key: "premium_review_insights", sourcePlan: "PLUS", grantedAt },
        ],
      });
      const user = userEvent.setup();

      const router = createMemoryRouter(
        [{ path: "/billing/plan", element: <BillingPlan /> }],
        {
          initialEntries: ["/billing/plan"],
        },
      );
      render(<RouterProvider router={router} />);

      await screen.findByRole("heading", { name: "Gói hiện tại" });
      const manageButton = await screen.findByRole("button", {
        name: "Quản lý gói",
      });
      expect(manageButton).toBeEnabled();

      await user.click(manageButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          "/billing/customer-portal",
          {
            returnUrl: "http://localhost:3000/billing/plan",
          },
        );
      });
      expect(openSpy).toHaveBeenCalledWith(
        "https://billing.example.test/portal/session",
        "_blank",
        "noopener,noreferrer",
      );
    },
    UI_TEST_TIMEOUT_MS,
  );

  it(
    "keeps support and legal links reachable on the real billing plan page",
    async () => {
      stubRealBillingEnv("NhÃ  cung cáº¥p thanh toÃ¡n");
      vi.stubEnv("VITE_BILLING_SUPPORT_EMAIL", "billing-support@example.test");
      const { BillingPlan } = await import("./BillingPlan");

      const router = createMemoryRouter(
        [{ path: "/billing/plan", element: <BillingPlan /> }],
        {
          initialEntries: ["/billing/plan"],
        },
      );
      render(<RouterProvider router={router} />);

      const supportLinks = await screen.findAllByRole("link", {
        name: "billing-support@example.test",
      });
      expect(supportLinks[0]).toHaveAttribute(
        "href",
        "mailto:billing-support@example.test",
      );
      expect(document.querySelector('a[href="/terms"]')).toBeInTheDocument();
      expect(document.querySelector('a[href="/privacy"]')).toBeInTheDocument();
      expect(document.querySelector('a[href="/refund-policy"]')).toBeInTheDocument();
      expect(document.querySelector('a[href="/billing/faq"]')).toBeInTheDocument();
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
        currentPeriodEnd: "2099-06-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
      });
      const { BillingPlan } = await import("./BillingPlan");

      const router = createMemoryRouter(
        [
          { path: "/billing/plan", element: <BillingPlan /> },
          {
            path: "/12-week-system",
            element: (
              <div data-testid="twelve-week-system-page">12-week system</div>
            ),
          },
        ],
        {
          initialEntries: ["/billing/plan?status=success&context=plan"],
        },
      );
      render(<RouterProvider router={router} />);

      expect(
        await screen.findByText("Thanh toán đã xác nhận"),
      ).toBeInTheDocument();
      const startPlanLink = screen.getByRole("link", {
        name: "Bắt đầu kế hoạch 12 tuần",
      });
      expect(startPlanLink).toHaveAttribute("href", "/12-week-system");
    },
    UI_TEST_TIMEOUT_MS,
  );
});

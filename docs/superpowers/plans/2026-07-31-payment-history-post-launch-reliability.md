# Payment History Post-Launch Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover automatically from one transient payment-history timeout, network failure, or server error without changing payment or entitlement authority.

**Architecture:** Keep retry ownership inside `usePaymentHistory`, where the existing per-request timeout already lives. The hook performs at most two idempotent protected GET attempts, exposes a separate retrying flag, and leaves `BillingPlanPage` responsible only for presentation and the stable DOM state marker.

**Tech Stack:** React 18, TypeScript, Vite 6, Vitest, Testing Library, existing `apiClient` and billing UI monitoring.

## Global Constraints

- Real mode only; demo mode must not call the protected endpoint.
- Do not modify PayOS checkout, webhook, entitlement, refund, cancellation, receipt, or customer-portal behavior.
- Do not modify localStorage keys or stored shapes.
- Retry only the idempotent authenticated GET.
- Do not retry HTTP `401`, `403`, `429`, or other non-transient `4xx` responses.
- Do not log order ids, emails, provider payloads, account data, or exact amounts.
- Keep each attempt at the existing `8_000ms` deadline and cap each load cycle at two attempts.
- Do not change dependencies.

---

### Task 1: Add the transient retry contract with TDD

**Files:**
- Modify: `src/app/pages/billing-production-surfaces.test.tsx:832`
- Modify: `src/features/billing/usePaymentHistory.ts:1`

**Interfaces:**
- Consumes: `apiClient.get<PaymentHistoryResponse>("/billing/payment-history", { signal })`, `toAppError(error)`, and `isBillingNetworkError(error)`.
- Produces: `UsePaymentHistoryResult.isRetryingPaymentHistory: boolean`; at most two GET attempts per `loadPaymentHistory()` cycle.

- [ ] **Step 1: Replace the single-timeout expectation with failing recovery and final-failure tests**

Add a test that keeps the second request pending long enough to observe the retry state, then resolves it:

```tsx
it("automatically retries one timed-out payment history request and recovers", async () => {
  vi.useFakeTimers();
  const apiClient = stubRealBillingEnv("Nhà cung cấp thanh toán");
  const originalGet = apiClient.get.getMockImplementation();
  let paymentHistoryAttempt = 0;
  let resolveRetry: ((value: unknown) => void) | undefined;

  apiClient.get.mockImplementation((path: string, options?: { signal?: AbortSignal }) => {
    if (path !== "/billing/payment-history") {
      return originalGet?.(path) ?? Promise.resolve({ orders: [] });
    }

    paymentHistoryAttempt += 1;
    if (paymentHistoryAttempt === 1) {
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("The operation timed out.", "AbortError")),
          { once: true },
        );
      });
    }

    return new Promise((resolve) => {
      resolveRetry = resolve;
    });
  });

  stubAuthContext({ email: "billing-user@example.test" });
  const { PAYMENT_HISTORY_REQUEST_TIMEOUT_MS } = await import("@/features/billing/usePaymentHistory");
  const { BillingPlan } = await import("./BillingPlan");
  const router = createMemoryRouter([{ path: "/billing/plan", element: <BillingPlan /> }], {
    initialEntries: ["/billing/plan"],
  });
  render(<RouterProvider router={router} />);

  await act(async () => {
    vi.advanceTimersByTime(PAYMENT_HISTORY_REQUEST_TIMEOUT_MS);
    await Promise.resolve();
    await Promise.resolve();
  });

  const section = screen.getByTestId("billing-payment-history");
  expect(section).toHaveAttribute("data-payment-history-state", "retrying");
  expect(screen.getByText(/Đang kết nối lại để tải lịch sử thanh toán/i)).toBeInTheDocument();
  expect(paymentHistoryAttempt).toBe(2);

  await act(async () => {
    resolveRetry?.({
      orders: [
        {
          orderId: "VBRETRY001",
          planCode: "PLUS",
          billingCycle: "twelve_week",
          amount: 99_000,
          currency: "VND",
          status: "completed",
          provider: "payos",
          createdAt: "2026-07-31T00:00:00.000Z",
          completedAt: "2026-07-31T00:01:00.000Z",
          expiresAt: null,
          receiptSentAt: null,
          refundRequest: null,
        },
      ],
    });
    await Promise.resolve();
  });

  expect(section).toHaveAttribute("data-payment-history-state", "ready");
  expect(screen.getByText("VBRETRY001")).toBeInTheDocument();
  expect(screen.queryByText(/Không thể tải lịch sử thanh toán sau vài giây/i)).not.toBeInTheDocument();
});
```

Update the existing timeout test so both attempts abort and the error appears only after advancing both deadlines:

```tsx
expect(apiClient.get.mock.calls.filter(([path]) => path === "/billing/payment-history")).toHaveLength(2);
```

Add parameterized transient recovery coverage:

```tsx
it.each([
  { label: "network error", error: { message: "Network failed", isNetworkError: true } },
  { label: "HTTP 503", error: { message: "Service unavailable", status: 503 } },
])("automatically retries payment history after $label", async ({ error }) => {
  const apiClient = stubRealBillingEnv("Nhà cung cấp thanh toán");
  const originalGet = apiClient.get.getMockImplementation();
  let historyAttempts = 0;
  apiClient.get.mockImplementation((path: string, options?: { signal?: AbortSignal }) => {
    if (path !== "/billing/payment-history") {
      return originalGet?.(path, options) ?? Promise.resolve({ orders: [] });
    }
    historyAttempts += 1;
    return historyAttempts === 1 ? Promise.reject(error) : Promise.resolve({ orders: [] });
  });
  stubAuthContext({ email: "billing-user@example.test" });
  const { BillingPlan } = await import("./BillingPlan");
  const router = createMemoryRouter([{ path: "/billing/plan", element: <BillingPlan /> }], {
    initialEntries: ["/billing/plan"],
  });
  render(<RouterProvider router={router} />);

  await screen.findByText("Chưa có giao dịch nào.");
  expect(screen.getByTestId("billing-payment-history")).toHaveAttribute("data-payment-history-state", "empty");
  expect(historyAttempts).toBe(2);
  expect(screen.queryByText(error.message)).not.toBeInTheDocument();
});
```

Extend the existing `429` localization test with:

```tsx
expect(apiClient.get.mock.calls.filter(([path]) => path === "/billing/payment-history")).toHaveLength(1);
```

Add a parameterized non-transient authorization test:

```tsx
it.each([401, 403])("does not automatically retry payment history HTTP %s", async (status) => {
  const apiClient = stubRealBillingEnv(
    "Nhà cung cấp thanh toán",
    {
      planCode: "FREE",
      status: "none",
      entitlements: [],
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
    { error: { message: "Request rejected", status } },
  );
  stubAuthContext({ email: "billing-user@example.test" });
  const { BillingPlan } = await import("./BillingPlan");
  const router = createMemoryRouter([{ path: "/billing/plan", element: <BillingPlan /> }], {
    initialEntries: ["/billing/plan"],
  });
  render(<RouterProvider router={router} />);

  await screen.findByText("Request rejected");
  expect(apiClient.get.mock.calls.filter(([path]) => path === "/billing/payment-history")).toHaveLength(1);
});
```

- [ ] **Step 2: Run the focused UI test and verify RED**

Run:

```bash
npm run test:ui -- src/app/pages/billing-production-surfaces.test.tsx
```

Expected: the timeout and `503` recovery tests fail because a second automatic request does not exist; the retrying-state assertion fails; the updated final-failure test reaches error after only one timeout. The `401`, `403`, and `429` call-count assertions remain green and protect the non-transient boundary.

- [ ] **Step 3: Implement the minimum two-attempt hook**

In `usePaymentHistory.ts`, import the existing normalization and network classifier:

```ts
import { apiClient, toAppError } from "@/lib/api/apiClient";
import {
  isBillingNetworkError,
  logBillingUiError,
  toastBillingNetworkError,
} from "../../app/utils/billing-ui-monitoring";
```

Extend the result contract and state:

```ts
isRetryingPaymentHistory: boolean;

const [isRetryingPaymentHistory, setIsRetryingPaymentHistory] = useState(false);
```

Use these local helpers:

```ts
const PAYMENT_HISTORY_MAX_ATTEMPTS = 2;

function isTransientPaymentHistoryError(error: unknown, timedOut: boolean): boolean {
  if (timedOut || isBillingNetworkError(error)) return true;
  const appError = toAppError(error);
  return typeof appError.status === "number" && appError.status >= 500;
}
```

Replace the single request with a bounded loop. Create and clear one `AbortController` and timeout per attempt. On the first transient failure, set `isRetryingPaymentHistory` to `true`, call `logBillingUiError` with action `load_payment_history_retry`, and continue. On success, update history and return. On the final failure, preserve the existing timeout, network, localized `429`, and generic error branches. Set `isLoadingPaymentHistory` and `isRetryingPaymentHistory` back to `false` only when the full cycle finishes.

Return the new flag from the hook:

```ts
return {
  paymentHistory,
  setPaymentHistory,
  isLoadingPaymentHistory,
  isRetryingPaymentHistory,
  paymentHistoryError,
  loadPaymentHistory,
};
```

- [ ] **Step 4: Run the focused UI test and verify GREEN**

Run:

```bash
npm run test:ui -- src/app/pages/billing-production-surfaces.test.tsx
```

Expected: all billing production surface tests pass, including one automatic recovery and two-attempt final failure.

- [ ] **Step 5: Commit the retry behavior**

```bash
git add src/features/billing/usePaymentHistory.ts src/app/pages/billing-production-surfaces.test.tsx
git commit -m "fix: retry transient payment history loads"
```

### Task 2: Present the retry state and align production documentation

**Files:**
- Modify: `src/features/billing/BillingPlanPage.tsx:195`
- Modify: `guidelines/CURRENT_PROJECT_STATUS.md:1`
- Modify: `docs/ops/billing-plan-smoke-timeout-follow-up.md:1`

**Interfaces:**
- Consumes: `UsePaymentHistoryResult.isRetryingPaymentHistory`.
- Produces: `data-payment-history-state="retrying"` and account-safe reconnecting copy.

- [ ] **Step 1: Wire the retry state into `BillingPlanPage`**

Destructure the new flag:

```ts
const {
  paymentHistory,
  setPaymentHistory,
  isLoadingPaymentHistory,
  isRetryingPaymentHistory,
  paymentHistoryError,
  loadPaymentHistory,
} = usePaymentHistory(canLoadPaymentHistory);
```

Resolve the stable state marker before the generic loading state:

```ts
: isRetryingPaymentHistory
  ? "retrying"
  : isLoadingPaymentHistory
    ? "loading"
```

Replace the loading message with state-aware copy while keeping the same accessible text container:

```tsx
<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
{isRetryingPaymentHistory
  ? "Đang kết nối lại để tải lịch sử thanh toán..."
  : "Đang tải lịch sử thanh toán..."}
```

- [ ] **Step 2: Update current production truth without changing safe fallback env files**

In `guidelines/CURRENT_PROJECT_STATUS.md`:

- Set `Last reviewed` to `2026-07-31`.
- State that production checkout is live through PayOS and Plus entitlement is active after verified payment.
- Record the reproduced transient first-attempt payment-history timeout and the bounded client retry contract.
- Explain that `.env.production` and `render.yaml` are checked-in safe fallbacks while active Vercel/Render host variables override them.

At the top of `docs/ops/billing-plan-smoke-timeout-follow-up.md`, add a dated post-launch update that preserves the older Casso and kill-switch sections as historical evidence. Do not rewrite old dated decisions as if they were current.

- [ ] **Step 3: Run focused tests and documentation checks**

Run:

```bash
npm run test:ui -- src/app/pages/billing-production-surfaces.test.tsx
git diff --check
rg -n "PayOS|payment-history|host env|safe fallback" guidelines/CURRENT_PROJECT_STATUS.md docs/ops/billing-plan-smoke-timeout-follow-up.md
```

Expected: UI tests pass; no whitespace errors; both current-status documents distinguish live host state from checked-in fallback values.

- [ ] **Step 4: Commit UI and documentation alignment**

```bash
git add src/features/billing/BillingPlanPage.tsx guidelines/CURRENT_PROJECT_STATUS.md docs/ops/billing-plan-smoke-timeout-follow-up.md
git commit -m "docs: align billing status with live PayOS"
```

### Task 3: Run the validation gate

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: the approved spec and Tasks 1-2.
- Produces: automated, spec, safety, and acceptance evidence.

- [ ] **Step 1: Run frontend focused and production-core checks**

```bash
npm run test:ui -- src/app/pages/billing-production-surfaces.test.tsx src/app/pages/billing-paid-checkout-disabled.test.tsx
npm run test:production-core:unit
npm run typecheck
npm run lint
npm run build
```

Expected: every command exits `0`.

- [ ] **Step 2: Run backend contract checks with safe test env**

```powershell
$env:MONGODB_URI='mongodb://127.0.0.1:27017/vision-board-test'
$env:FIREBASE_PROJECT_ID='test-project'
$env:FIREBASE_CLIENT_EMAIL='firebase-test@example.test'
$env:FIREBASE_PRIVATE_KEY='test-private-key'
$env:FRONTEND_ORIGIN='https://example.test'
npm --prefix backend run typecheck
npm --prefix backend run build
node --test backend/dist/tests/billingRoutes.test.js
```

Expected: backend typecheck/build exit `0`; focused billing route tests pass. The values are local test placeholders and must not be committed.

- [ ] **Step 3: Run the security and diff review**

```bash
rg -n "orderId|email|amount|provider" src/features/billing/usePaymentHistory.ts src/app/utils/billing-ui-monitoring.ts
git diff --check
git status --short --branch
git diff origin/main...HEAD --stat
```

Confirm manually:

- retry is limited to the GET endpoint;
- no auth or rate-limit error is retried;
- monitoring does not receive payment identifiers or exact amounts;
- no env files or secrets changed;
- no unrelated 12-week or Dashboard files changed.

- [ ] **Step 4: Record completion evidence**

Append the actual command results to `docs/specs/billing-payment-history-post-launch-reliability.md`, mark only proven acceptance criteria as complete, then commit:

```bash
git add docs/specs/billing-payment-history-post-launch-reliability.md
git commit -m "docs: record payment history reliability evidence"
```

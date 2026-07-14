# Admin UI System Phase 4 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the final cross-Admin hardening pass for reduced motion, accessibility semantics, theme-safe operational feedback, persistent reminder failures, and regression verification without changing Admin business contracts.

**Architecture:** Add one narrow test-only source contract for rules that apply to every Admin route, then resolve each proven finding in focused presentation slices. Existing pages continue to own requests, filters, mutation state, dialogs, request IDs, and stale-data behavior; no new production abstraction is introduced.

**Tech Stack:** React 18, TypeScript, React Router, Tailwind CSS, existing Radix-based UI components, Lucide icons, Vitest, Testing Library, Biome, Vite 6.

## Global Constraints

- Mixed surface: presentation hardening may not change Admin APIs, payloads, request IDs, auth, billing authority, classification semantics, routes, localStorage, sync, or business data.
- Work only in `D:\Projects\Vision-Board-admin-data-classification-spec`; do not touch the dirty primary checkout.
- Use existing `app-*` semantic tokens in light and dark themes.
- Keep every current `/admin/*` route and the real-mode-only Sales Report boundary unchanged.
- Do not add a dependency, universal table abstraction, or new Admin workflow.
- Use TDD: every behavior or regression contract must be observed RED before production code changes.
- Do not run format, autofix, snapshot update, push, PR, or merge commands.
- Authenticated manual visual QA is blocked unless a reusable Firebase Admin session or browser storage state becomes available; do not claim it passed without that evidence.

---

## File Structure

- Create `src/app/components/admin/AdminHardening.contract.test.ts` for narrow cross-Admin source invariants.
- Modify existing Admin pages/components only where the contract reports a finding.
- Create `src/app/components/admin/AdminLayout.test.tsx` for loading live-region semantics.
- Modify `src/app/pages/AdminDashboardPage.test.tsx` and `src/app/pages/AdminDashboardPage.tsx` for persistent reminder transport failures.
- Append the execution record to this plan only after final evidence exists.

### Task 1: Enforce Reduced Motion And Decorative Loader Semantics

**Files:**
- Create: `src/app/components/admin/AdminHardening.contract.test.ts`
- Modify: `src/app/components/admin/AdminLayout.tsx`
- Modify: `src/app/pages/AdminCatalogPage.tsx`
- Modify: `src/app/pages/AdminDashboardPage.tsx`
- Modify: `src/app/pages/AdminDiscountsPage.tsx`
- Modify: `src/app/pages/AdminOrderDetailPage.tsx`
- Modify: `src/app/pages/AdminOrdersPage.tsx`
- Modify: `src/app/pages/AdminPaymentsPage.tsx`
- Modify: `src/app/pages/AdminRefundsPage.tsx`
- Modify: `src/app/pages/AdminSubscriptionsPage.tsx`
- Modify: `src/app/pages/AdminUserDetailPage.tsx`
- Modify: `src/app/pages/AdminUsersPage.tsx`

**Interfaces:**
- Consumes production files named `Admin*.tsx` under `src/app/pages` and `src/app/components/admin`.
- Produces exact file/line findings for reduced-motion and decorative-loader regressions.

- [ ] **Step 1: Create the source scanner and failing motion tests**

Create `AdminHardening.contract.test.ts` with:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const adminComponentDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(adminComponentDir, "../..");

function collectAdminFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectAdminFiles(path);
    if (!entry.name.startsWith("Admin") || !entry.name.endsWith(".tsx")) return [];
    if (entry.name.includes(".test.")) return [];
    return [path];
  });
}

const files = [
  ...collectAdminFiles(resolve(appDir, "pages")),
  ...collectAdminFiles(adminComponentDir),
].sort();

function label(file: string): string {
  return relative(appDir, file).replaceAll("\\", "/");
}

function lineNumber(source: string, index: number): number {
  return source.slice(0, index).split(/\r?\n/).length;
}

function findLineViolations(
  predicate: (line: string) => boolean,
): string[] {
  return files.flatMap((file) =>
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .flatMap((line, index) =>
        predicate(line) ? [`${label(file)}:${index + 1}: ${line.trim()}`] : [],
      ),
  );
}

function findTagViolations(
  pattern: RegExp,
  predicate: (tag: string) => boolean,
): string[] {
  return files.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return Array.from(source.matchAll(pattern)).flatMap((match) => {
      const tag = match[0];
      return predicate(tag)
        ? [`${label(file)}:${lineNumber(source, match.index ?? 0)}: ${tag}`]
        : [];
    });
  });
}

describe("Admin hardening contract", () => {
  it("provides reduced-motion fallbacks for Admin animations and transitions", () => {
    const animationViolations = findLineViolations(
      (line) =>
        /animate-(?:spin|pulse)/.test(line) &&
        !line.includes("motion-reduce:animate-none"),
    );
    const transitionViolations = findLineViolations(
      (line) =>
        /transition-(?:colors|all|\[[^\]]+\])/.test(line) &&
        !line.includes("motion-reduce:transition-none"),
    );

    expect([...animationViolations, ...transitionViolations]).toEqual([]);
  });

  it("hides animated loader icons when visible copy already names the state", () => {
    const violations = findTagViolations(
      /<Loader2\b[^>]*>/g,
      (tag) => tag.includes("animate-spin") && !tag.includes('aria-hidden="true"'),
    );

    expect(violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the contract and verify RED**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminHardening.contract.test.ts
```

Expected: both tests fail and list the audited Admin file/line findings.

- [ ] **Step 3: Apply the minimal motion and loader fixes**

For every finding emitted by the two tests:

```tsx
// Animation
className="... animate-spin ... motion-reduce:animate-none"
className="... animate-pulse ... motion-reduce:animate-none"

// Transition
className="... transition-colors ... motion-reduce:transition-none"

// Decorative loader beside visible copy
<Loader2
  className="... animate-spin ... motion-reduce:animate-none"
  aria-hidden="true"
/>
```

Do not change loading booleans, button disabled state, mutation handlers, text, or request flow. Keep existing `motion-reduce:*` modifiers and add only missing ones.

- [ ] **Step 4: Verify GREEN and existing focused pages**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminHardening.contract.test.ts src/app/pages/AdminDashboardPage.test.tsx src/app/pages/AdminOrdersPage.test.tsx src/app/pages/AdminPaymentsPage.test.tsx src/app/pages/AdminRefundsPage.dialog.test.tsx src/app/pages/AdminSubscriptionsPage.test.tsx src/app/pages/AdminUsersPage.test.tsx
```

Expected: the contract and all touched page tests pass.

- [ ] **Step 5: Commit the motion slice**

```powershell
git add -- src/app/components/admin/AdminHardening.contract.test.ts src/app/components/admin/AdminLayout.tsx src/app/pages/AdminCatalogPage.tsx src/app/pages/AdminDashboardPage.tsx src/app/pages/AdminDiscountsPage.tsx src/app/pages/AdminOrderDetailPage.tsx src/app/pages/AdminOrdersPage.tsx src/app/pages/AdminPaymentsPage.tsx src/app/pages/AdminRefundsPage.tsx src/app/pages/AdminSubscriptionsPage.tsx src/app/pages/AdminUserDetailPage.tsx src/app/pages/AdminUsersPage.tsx
git commit -m "fix(admin): respect reduced motion across routes"
```

### Task 2: Complete Table And Theme Semantics

**Files:**
- Modify: `src/app/components/admin/AdminHardening.contract.test.ts`
- Modify: `src/app/components/admin/AdminLayout.tsx`
- Modify: `src/app/components/admin/AdminOperationalClassificationDialog.tsx`
- Modify: `src/app/components/admin/AdminSidebar.tsx`
- Modify: `src/app/components/admin/sales/AdminSalesRevenueChart.tsx`
- Modify: `src/app/components/admin/sales/AdminSalesReviewDialog.tsx`
- Modify: `src/app/pages/AdminDiscountsPage.tsx`
- Modify: `src/app/pages/AdminEmailHistoryPage.tsx`
- Modify: `src/app/pages/AdminOrderDetailPage.tsx`
- Modify: `src/app/pages/AdminOrdersPage.tsx`
- Modify: `src/app/pages/AdminPaymentsPage.tsx`
- Modify: `src/app/pages/AdminRefundsPage.tsx`
- Modify: `src/app/pages/AdminUserDetailPage.tsx`
- Modify: `src/app/pages/AdminUsersPage.tsx`
- Test: existing focused page/dialog tests for these surfaces.

**Interfaces:**
- Consumes existing `app-status-error`, `app-status-warning`, and `app-status-success` tokens and existing table components.
- Produces complete column-header relationships and theme-safe semantic risk presentation without changing actions.

- [ ] **Step 1: Extend the contract with failing table and semantic-token tests**

Add inside the existing `describe` block:

```ts
  it("gives every Admin column header an explicit scope", () => {
    const violations = findTagViolations(
      /<(?:th|TableHead)\b[^>]*>/g,
      (tag) => !tag.includes('scope="col"'),
    );

    expect(violations).toEqual([]);
  });

  it("does not use the audited single-theme semantic classes", () => {
    const forbidden = [
      "text-rose-200",
      "text-rose-100",
      "text-red-700",
      "text-rose-600",
      "text-rose-500",
      "text-amber-700",
      "text-amber-900",
      "text-amber-300",
      "text-rose-300",
      "border-amber-200",
      "bg-amber-50",
    ];
    const violations = findLineViolations((line) =>
      forbidden.some((className) => line.includes(className)),
    ).filter((finding) => !finding.startsWith("components/admin/AdminStatusBadge.tsx:"));

    expect(violations).toEqual([]);
  });
```

- [ ] **Step 2: Run only the new cases and verify RED**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminHardening.contract.test.ts -t "column header|single-theme"
```

Expected: four header findings and the exact audited theme findings fail.

- [ ] **Step 3: Fix table relationships**

In the discount usage dialog:

```tsx
<Table>
  <TableCaption className="sr-only">Lịch sử sử dụng discount</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead scope="col">Người dùng</TableHead>
      <TableHead scope="col">Đơn hàng</TableHead>
      <TableHead scope="col">Thời gian</TableHead>
    </TableRow>
  </TableHeader>
```

In the Sales Report screen-reader fallback table, keep the caption and add `scope="col"` to all four `<th>` cells.

- [ ] **Step 4: Replace audited semantic palette utilities with application tokens**

Use these exact presentation forms while preserving existing handlers and labels:

```tsx
// Destructive action
className="border-app-status-error/30 bg-app-status-error/10 text-app-status-error hover:bg-app-status-error/20 hover:text-app-status-error"

// Warning callout or status
className="border-app-status-warning/30 bg-app-status-warning/10 text-app-status-warning"

// Error copy
className="text-sm text-app-status-error"

// Success or warning source labels
internal: "text-app-status-warning"
external: "text-app-status-success"
```

Apply the same token intent to Admin access icons, Sidebar logout hover, Order cancellation/delivery timestamps, Email failure text, Users status/error feedback, User Detail destructive hover, and Sales Review validation/error copy. Do not change visible wording or behavior.

- [ ] **Step 5: Verify the contract and focused semantic surfaces**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminHardening.contract.test.ts src/app/components/admin/AdminOperationalClassification.test.tsx src/app/components/admin/AdminSidebar.test.tsx src/app/pages/AdminDiscountsPage.test.tsx src/app/pages/AdminEmailHistoryPage.test.tsx src/app/pages/AdminOrderDetailPage.test.tsx src/app/pages/AdminOrdersPage.test.tsx src/app/pages/AdminPaymentsPage.test.tsx src/app/pages/AdminRefundsPage.dialog.test.tsx src/app/pages/AdminSalesReportPage.test.tsx src/app/pages/AdminUserDetailPage.dialog.test.tsx src/app/pages/AdminUsersPage.test.tsx
```

Expected: all files pass with no contract findings.

- [ ] **Step 6: Commit the theme/table slice**

```powershell
git add -- src/app/components/admin/AdminHardening.contract.test.ts src/app/components/admin/AdminLayout.tsx src/app/components/admin/AdminOperationalClassificationDialog.tsx src/app/components/admin/AdminSidebar.tsx src/app/components/admin/sales/AdminSalesRevenueChart.tsx src/app/components/admin/sales/AdminSalesReviewDialog.tsx src/app/pages/AdminDiscountsPage.tsx src/app/pages/AdminEmailHistoryPage.tsx src/app/pages/AdminOrderDetailPage.tsx src/app/pages/AdminOrdersPage.tsx src/app/pages/AdminPaymentsPage.tsx src/app/pages/AdminRefundsPage.tsx src/app/pages/AdminUserDetailPage.tsx src/app/pages/AdminUsersPage.tsx
git commit -m "fix(admin): align semantic theme and table headers"
```

### Task 3: Announce Admin Loading Gates

**Files:**
- Create: `src/app/components/admin/AdminLayout.test.tsx`
- Modify: `src/app/components/admin/AdminLayout.tsx`

**Interfaces:**
- Consumes existing auth/profile loading branches and `AdminStatusCard`.
- Produces polite status semantics without changing redirects, retries, logout, or role checks.

- [ ] **Step 1: Write failing loading-status tests**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminLayout } from "./AdminLayout";

const auth = vi.hoisted(() => ({ useAuthContext: vi.fn() }));

vi.mock("@/lib/auth/AuthContext", () => ({ useAuthContext: auth.useAuthContext }));

function renderLayout() {
  render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <AdminLayout />
    </MemoryRouter>,
  );
}

describe("AdminLayout status gates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("announces authentication loading as a polite status", () => {
    auth.useAuthContext.mockReturnValue({
      authLoading: true,
      isConfigured: true,
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      user: null,
      userProfile: null,
      userProfileError: null,
      userProfileLoading: false,
    });

    renderLayout();

    expect(screen.getByRole("status")).toHaveTextContent("Đang kiểm tra đăng nhập");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("announces profile loading as a polite status", () => {
    auth.useAuthContext.mockReturnValue({
      authLoading: false,
      isConfigured: true,
      logout: vi.fn(),
      refreshUserProfile: vi.fn(),
      user: { uid: "admin" },
      userProfile: null,
      userProfileError: null,
      userProfileLoading: true,
    });

    renderLayout();

    expect(screen.getByRole("status")).toHaveTextContent("Đang tải quyền quản trị");
  });
});
```

- [ ] **Step 2: Run and verify RED**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminLayout.test.tsx
```

Expected: no `status` role is found.

- [ ] **Step 3: Add opt-in status semantics to `AdminStatusCard`**

Add a boolean `announceStatus` prop to the current inline prop type and apply it only to the two loading branches:

```tsx
function AdminStatusCard({
  action,
  announceStatus = false,
  description,
  icon,
  secondaryAction,
  title,
}: {
  action?: ReactNode;
  announceStatus?: boolean;
  description: string;
  icon: ReactNode;
  secondaryAction?: ReactNode;
  title: string;
}) {
  return (
    <div
      role={announceStatus ? "status" : undefined}
      aria-live={announceStatus ? "polite" : undefined}
      className="flex min-h-screen items-center justify-center bg-app-bg px-4 py-10 text-app-ink"
    >
      <Card
        className="w-full max-w-md border-app-line text-app-ink shadow-lg backdrop-blur"
        style={{ backgroundColor: "var(--app-surface)" }}
      >
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--r-tile)] bg-app-accent-soft text-app-ink">
            {icon}
          </div>
          <h1 className="mt-5 text-xl font-bold text-app-ink">{title}</h1>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-app-ink-soft">{description}</p>
          {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
          {secondaryAction ? <div className="mt-3 flex flex-wrap justify-center gap-3">{secondaryAction}</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
```

Pass `announceStatus` to `Đang kiểm tra đăng nhập` and `Đang tải quyền quản trị`. Do not add it to configuration errors, missing profile, or access denied.

- [ ] **Step 4: Verify GREEN and the route access guard**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminLayout.test.tsx src/app/routes.test.tsx
```

Expected: both loading tests and all route tests pass.

- [ ] **Step 5: Commit the loading semantics**

```powershell
git add -- src/app/components/admin/AdminLayout.tsx src/app/components/admin/AdminLayout.test.tsx
git commit -m "fix(admin): announce loading access states"
```

### Task 4: Persist Dashboard Reminder Failures

**Files:**
- Modify: `src/app/pages/AdminDashboardPage.test.tsx`
- Modify: `src/app/pages/AdminDashboardPage.tsx`

**Interfaces:**
- Consumes `adminSendExpiringBillingReminders({ daysAhead: 7 })`, `AdminFeedbackBanner`, and the existing reminder result summary.
- Produces retryable persistent transport feedback while preserving success/info toasts and overview refresh.

- [ ] **Step 1: Add a controllable toast mock and reminder fixture**

Replace the inline Sonner mock with:

```tsx
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: toastMock }));

const reminderResult = {
  configured: true,
  email: { provider: "resend", configured: true },
  daysAhead: 7,
  windowEnd: "2026-07-21T00:00:00.000Z",
  scanned: 2,
  sent: 1,
  skipped: 0,
  duplicate: 0,
  failed: 1,
};
```

- [ ] **Step 2: Write failing persistent-error and retained-result tests**

```tsx
it("keeps reminder transport failures visible and retries the same request", async () => {
  const user = userEvent.setup();
  adminServiceMock.adminGetOverview.mockResolvedValue({
    ...overview,
    summary: { ...overview.summary, expiringSoonSubscriptions: 2 },
  });
  adminServiceMock.adminSendExpiringBillingReminders
    .mockRejectedValueOnce(new Error("reminder service offline"))
    .mockResolvedValueOnce(reminderResult);

  render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
  await user.click(await screen.findByRole("button", { name: "Gửi email nhắc hạn" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("reminder service offline");
  expect(toastMock.error).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "Thử gửi lại" }));
  expect(adminServiceMock.adminSendExpiringBillingReminders).toHaveBeenNthCalledWith(2, { daysAhead: 7 });
});

it("keeps the previous reminder result when a later run fails", async () => {
  const user = userEvent.setup();
  adminServiceMock.adminGetOverview.mockResolvedValue({
    ...overview,
    summary: { ...overview.summary, expiringSoonSubscriptions: 2 },
  });
  adminServiceMock.adminSendExpiringBillingReminders
    .mockResolvedValueOnce(reminderResult)
    .mockRejectedValueOnce(new Error("second run failed"));

  render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
  const runButton = await screen.findByRole("button", { name: "Gửi email nhắc hạn" });
  await user.click(runButton);
  expect(await screen.findByText(/Lần chạy gần nhất: quét 2, gửi 1/)).toBeInTheDocument();

  await user.click(runButton);
  expect(await screen.findByRole("alert")).toHaveTextContent("second run failed");
  expect(screen.getByText(/Lần chạy gần nhất: quét 2, gửi 1/)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run and verify RED**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminDashboardPage.test.tsx
```

Expected: failure remains toast-only and no retry banner exists.

- [ ] **Step 4: Implement page-owned persistent reminder feedback**

Add:

```tsx
const [reminderError, setReminderError] = useState<string | null>(null);
```

At the start of `handleReminderRun`, clear the error. In the catch, set it and remove the transport-error toast:

```tsx
const handleReminderRun = async () => {
  setReminderError(null);
  setReminderLoading(true);
  try {
    const result = await adminSendExpiringBillingReminders({ daysAhead: 7 });
    setReminderResult(result);
    if (!result.configured) {
      toast.info(
        `Email chưa cấu hình: ${result.email.reason ?? result.email.provider}`,
      );
      return;
    }
    toast.success(
      `Đã gửi ${result.sent} lời nhắc, bỏ qua ${result.duplicate + result.skipped}.`,
    );
    void loadData();
  } catch (err) {
    setReminderError(getErrorMessage(err, "Không thể gửi lời nhắc lúc này."));
  } finally {
    setReminderLoading(false);
  }
};
```

Render immediately after `ReminderBanner`:

```tsx
{reminderError ? (
  <AdminFeedbackBanner
    tone="error"
    summary={
      <div>
        <p className="font-semibold">Không gửi được email nhắc hạn</p>
        <p className="mt-1 font-normal">{reminderError}</p>
      </div>
    }
    action={
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={reminderLoading}
        onClick={() => void handleReminderRun()}
      >
        Thử gửi lại
      </Button>
    }
  />
) : null}
```

- [ ] **Step 5: Verify GREEN and focused Dashboard behavior**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminDashboardPage.test.tsx src/app/components/admin/AdminHardening.contract.test.ts
```

Expected: all Dashboard and hardening contract tests pass without `act(...)` warnings.

- [ ] **Step 6: Commit the feedback slice**

```powershell
git add -- src/app/pages/AdminDashboardPage.tsx src/app/pages/AdminDashboardPage.test.tsx
git commit -m "fix(admin): persist reminder delivery failures"
```

### Task 5: Verify And Record Phase 4

**Files:**
- Verify all Admin UI production/test files changed in Tasks 1-4.
- Modify: `docs/superpowers/plans/2026-07-14-admin-ui-system-phase-4.md`

**Interfaces:**
- Consumes all Phase 4 commits.
- Produces final evidence for the four-phase Admin goal.

- [ ] **Step 1: Run the focused Phase 4 set**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminHardening.contract.test.ts src/app/components/admin/AdminLayout.test.tsx src/app/components/admin/AdminOperationalClassification.test.tsx src/app/components/admin/AdminSidebar.test.tsx src/app/pages/AdminDashboardPage.test.tsx src/app/pages/AdminDiscountsPage.test.tsx src/app/pages/AdminEmailHistoryPage.test.tsx src/app/pages/AdminOrderDetailPage.test.tsx src/app/pages/AdminOrdersPage.test.tsx src/app/pages/AdminPaymentsPage.test.tsx src/app/pages/AdminRefundsPage.dialog.test.tsx src/app/pages/AdminSalesReportPage.test.tsx src/app/pages/AdminSubscriptionsPage.test.tsx src/app/pages/AdminUserDetailPage.dialog.test.tsx src/app/pages/AdminUsersPage.test.tsx
```

Record exact file/test counts and any non-failing warnings.

- [ ] **Step 2: Run final automated gates once**

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
npm.cmd run test:ui -- src/app/routes.test.tsx
```

Expected: every command exits `0`. Record Biome checked-file count, broad test counts, transformed module count, build duration, and route test count. Do not rerun a green broad gate unless code changes afterward.

- [ ] **Step 3: Run scope and diff checks**

```powershell
git -c core.pager=cat diff --check origin/main...HEAD
git -c core.pager=cat diff --check 54bc6a74^ HEAD
git -c core.pager=cat status --short
git -c core.pager=cat diff --name-only 54bc6a74^ HEAD
git -c core.pager=cat log --oneline 54bc6a74^..HEAD
```

Expected: no whitespace errors and no backend, service-contract, package, lockfile, auth, billing, classification, storage, sync, or route changes.

- [ ] **Step 4: Attempt authenticated visual QA only if a reusable session exists**

Verify all Admin list/detail routes at approximately 1440px, 1024px, and 390px in light and dark themes. Check navigation, overflow, action wrapping, long content, keyboard focus, loading, empty, stale-data error, dialogs, semantic risk colors, and reduced motion.

If no reusable authenticated Admin session exists, record the exact blocker and do not claim visual QA passed.

- [ ] **Step 5: Append the execution record and commit it**

Append `Execution Record — 2026-07-14` containing actual commit IDs/messages, every gate result, scope result, known non-failing warnings, and the manual-QA result or blocker.

```powershell
git add -- docs/superpowers/plans/2026-07-14-admin-ui-system-phase-4.md
git commit -m "docs(admin): record phase 4 verification"
```

Do not create an empty documentation commit. The worktree must be clean at the final checkpoint.

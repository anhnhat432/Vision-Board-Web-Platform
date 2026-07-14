# Admin Users UX Clarity Implementation Plan

> **Superseded:** Do not execute this plan independently. Its approved requirements are integrated into `docs/superpowers/specs/2026-07-14-admin-ui-system-phase-1-design.md` and will be replanned with the shared Admin shell.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make operational classification scannable, hide inactive bulk controls, and present classification results as clear accessible feedback.

**Architecture:** Keep the backend and existing classification command flow unchanged. Extend the shared status badge with a neutral tone, move operational classification into its own table column, and extract bulk-result presentation into a focused Admin component so `AdminUsersPage` retains orchestration responsibility.

**Tech Stack:** React 18, TypeScript, React Router, Tailwind CSS, Radix-based existing UI components, Vitest, Testing Library, Biome.

## Global Constraints

- Frontend-only change.
- Do not change classification APIs, persistence, audit semantics, idempotency, request IDs, retry rules, URL filter behaviour, or backend models.
- Do not add dependencies.
- Do not redesign unrelated Admin pages.
- Default real data must be visible but must not look explicitly confirmed.
- Keep raw failed UIDs available without placing an unbounded UID list in the live result sentence.

---

### Task 1: Render Every Operational Classification State

**Files:**
- Modify: `src/app/components/admin/AdminStatusBadge.tsx`
- Modify: `src/app/components/admin/AdminOperationalClassificationBadge.tsx`
- Test: `src/app/components/admin/AdminOperationalClassification.test.tsx`

**Interfaces:**
- Consumes: `AdminOperationalClassificationSummary` from `src/services/adminService.ts`.
- Produces: `AdminStatusBadge` tone `neutral` and `AdminOperationalClassificationBadge` that always renders one visible state.

- [ ] **Step 1: Write the failing default-real badge tests**

Replace the first classification test with assertions that distinguish explicit and fallback real data, then add the legacy-response test:

```tsx
it("distinguishes confirmed and default real classifications", () => {
  const { rerender } = render(
    <AdminOperationalClassificationBadge
      classification={{ effectiveCategory: "real", source: "user" }}
    />,
  );
  expect(screen.getByText("Dữ liệu thật · Đã xác nhận")).toBeInTheDocument();

  rerender(
    <AdminOperationalClassificationBadge
      classification={{ effectiveCategory: "real", source: "default" }}
    />,
  );
  expect(screen.getByText("Dữ liệu thật · Mặc định")).toBeInTheDocument();
  expect(screen.queryByText("Dữ liệu thật · Đã xác nhận")).not.toBeInTheDocument();
});

it("renders a default real state for legacy responses without classification", () => {
  render(<AdminOperationalClassificationBadge classification={undefined} />);
  expect(screen.getByText("Dữ liệu thật · Mặc định")).toBeInTheDocument();
});
```

Keep excluded-category coverage by updating the existing second test:

```tsx
it("renders excluded classification badges and source labels", () => {
  const { rerender } = render(
    <AdminOperationalClassificationBadge
      classification={{ effectiveCategory: "test", source: "user", reason: "test_account" }}
    />,
  );
  expect(screen.getByText("Test")).toBeInTheDocument();

  rerender(
    <AdminOperationalClassificationBadge
      classification={{ effectiveCategory: "internal", source: "user", reason: "internal_team" }}
    />,
  );
  expect(screen.getByText("Nội bộ")).toBeInTheDocument();
  expect(getAdminOperationalClassificationSourceLabel("record")).toBe("Đánh dấu trực tiếp");
});
```

- [ ] **Step 2: Run the focused component test and verify RED**

Run:

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminOperationalClassification.test.tsx
```

Expected: FAIL because default and missing real classifications currently render `null`.

- [ ] **Step 3: Add the neutral badge tone**

Extend `AdminBadgeTone` and both tone maps in `AdminStatusBadge.tsx`:

```tsx
export type AdminBadgeTone =
  | "neutral"
  | "pending"
  | "confirmed"
  | "printing"
  | "shipping"
  | "delivered"
  | "cancelled"
  | "completed"
  | "expired"
  | "rejected"
  | "failed";
```

```tsx
const DOT_CLASS: Record<AdminBadgeTone, string> = {
  neutral: "bg-slate-400",
  pending: "bg-amber-400",
  confirmed: "bg-sky-400",
  printing: "bg-violet-400",
  shipping: "bg-blue-400",
  delivered: "bg-emerald-400",
  cancelled: "bg-rose-400",
  completed: "bg-emerald-400",
  expired: "bg-gray-400",
  rejected: "bg-rose-400",
  failed: "bg-rose-400",
};

const TONE_CLASS: Record<AdminBadgeTone, string> = {
  neutral:
    "bg-app-bg-subtle text-app-ink-soft border-app-line dark:bg-app-bg-subtle dark:text-app-ink-soft dark:border-app-line-strong",
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  confirmed:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
  printing:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
  shipping:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  delivered:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-app-accent-soft dark:text-app-accent dark:border-app-accent/30",
  cancelled:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-app-accent-soft dark:text-app-accent dark:border-app-accent/30",
  expired:
    "bg-gray-50 text-gray-600 border-gray-200 dark:bg-app-bg-subtle dark:text-app-ink-soft dark:border-app-line-strong",
  rejected:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  failed:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
};
```

- [ ] **Step 4: Render the fallback state**

Change the real branch in `AdminOperationalClassificationBadge.tsx`:

```tsx
if (effectiveCategory === "real") {
  return classification?.source === "user" ? (
    <AdminStatusBadge tone="confirmed">Dữ liệu thật · Đã xác nhận</AdminStatusBadge>
  ) : (
    <AdminStatusBadge tone="neutral">Dữ liệu thật · Mặc định</AdminStatusBadge>
  );
}
```

- [ ] **Step 5: Run the focused component test and verify GREEN**

Run:

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminOperationalClassification.test.tsx
```

Expected: component test file passes with the explicit, default, test, and internal states covered.

- [ ] **Step 6: Commit Task 1**

```powershell
git add -- src/app/components/admin/AdminStatusBadge.tsx src/app/components/admin/AdminOperationalClassificationBadge.tsx src/app/components/admin/AdminOperationalClassification.test.tsx
git commit -m "fix(admin): show every user classification state"
```

### Task 2: Make The Users Table And Bulk Controls Scannable

**Files:**
- Modify: `src/app/pages/AdminUsersPage.tsx`
- Test: `src/app/pages/AdminUsersPage.test.tsx`

**Interfaces:**
- Consumes: the always-visible `AdminOperationalClassificationBadge` from Task 1.
- Produces: a six-column users table, accessible filter controls, and a conditional bulk-action panel.

- [ ] **Step 1: Write failing page tests for table structure and inactive bulk state**

Add these assertions to the page test suite:

```tsx
it("shows classification as a dedicated accessible table column", async () => {
  await renderPage();

  expect(await screen.findByRole("table", { name: "Danh sách người dùng" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Trạng thái dữ liệu" })).toHaveAttribute("scope", "col");
  expect(screen.getAllByText("Dữ liệu thật · Mặc định")).toHaveLength(2);
});

it("hides inactive bulk controls and exposes accessible filters", async () => {
  const user = userEvent.setup();
  await renderPage();

  expect(await screen.findByRole("searchbox", { name: "Tìm kiếm người dùng" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Tất cả" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByText(/Đã chọn 0\/100 người dùng/)).not.toBeInTheDocument();

  await user.click(screen.getByRole("checkbox", { name: /u1@example\.test/ }));
  expect(screen.getByText("Đã chọn 1/100 người dùng.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Phân loại 1 người dùng" })).toBeEnabled();
});
```

Update the two navigation-state tests so they assert the zero-selection panel is absent:

```tsx
expect(screen.queryByText("Đã chọn 0/100 người dùng.")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the page test and verify RED**

Run:

```powershell
npm.cmd run test:ui -- src/app/pages/AdminUsersPage.test.tsx
```

Expected: FAIL because the table has no classification column/caption, search is not a searchbox, role buttons have no pressed state, and the zero-selection panel is visible.

- [ ] **Step 3: Improve search and role-filter semantics**

Update the search input:

```tsx
<Input
  type="search"
  name="admin-user-search"
  aria-label="Tìm kiếm người dùng"
  autoComplete="off"
  placeholder="Tìm theo email, tên hoặc UID…"
  value={search}
  onChange={(event) => handleSearch(event.target.value)}
  className="pl-9 rounded-lg bg-app-surface border-app-line/60 transition-colors duration-150"
/>
```

Update the role-filter wrapper and buttons:

```tsx
<div className="flex gap-2" role="group" aria-label="Lọc theo vai trò">
  {(["all", "user", "admin"] as const).map((role) => (
    <Button
      key={role}
      type="button"
      aria-pressed={roleFilter === role}
      variant={roleFilter === role ? "default" : "outline"}
      size="sm"
      className={
        roleFilter === role
          ? "rounded-lg bg-app-accent text-white shadow-sm hover:bg-app-accent-hover"
          : "rounded-lg border-app-line/60 hover:bg-app-accent-soft hover:text-app-ink transition-colors duration-150"
      }
      onClick={() => handleRoleFilter(role)}
    >
      {role === "all" ? "Tất cả" : role === "admin" ? "Admin" : "User"}
    </Button>
  ))}
</div>
```

Rename the export action text to `Xuất CSV`.

- [ ] **Step 4: Hide the inactive bulk panel**

Derive one visibility flag:

```tsx
const showBulkActions = selectedUids.size > 0 || pendingBulk?.viewKey === activeViewKey;
```

Wrap the existing bulk panel:

```tsx
{showBulkActions ? (
  <div className="flex flex-wrap items-center gap-3 rounded-[var(--r-card)] border border-app-line bg-app-bg-subtle/40 p-3">
    <p className="text-sm text-app-ink-soft">
      Đã chọn {selectedUids.size}/{MAX_BULK_SELECTION} người dùng.
    </p>
    <Button
      type="button"
      size="sm"
      disabled={selectedUids.size === 0 || classificationBusy}
      onClick={() => {
        setClassificationError(undefined);
        setClassificationOpen(true);
      }}
    >
      Phân loại {selectedUids.size} người dùng
    </Button>
    {pendingBulk?.viewKey === activeViewKey ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={classificationBusy}
        onClick={retryPendingClassification}
      >
        {retryUnknownCommit ? "Thử lại mục chưa rõ kết quả" : "Thử lại phân loại"}
      </Button>
    ) : null}
    {selectionMessage ? (
      <p role="status" aria-live="polite" className="text-sm text-amber-700">
        {selectionMessage}
      </p>
    ) : null}
  </div>
) : null}
```

- [ ] **Step 5: Move classification into its own table column**

Update the table structure:

```tsx
<table className="w-full text-left text-sm">
  <caption className="sr-only">Danh sách người dùng</caption>
  <thead>
    <tr>
      <th scope="col" className="px-4 py-3">
        <label className="inline-flex min-h-6 min-w-6 items-center justify-center">
          <input
            type="checkbox"
            aria-label="Chọn tất cả người dùng trên trang"
            checked={allVisibleSelected}
            disabled={loading || items.length === 0}
            onChange={toggleVisibleUsers}
          />
        </label>
      </th>
      <th scope="col">Người dùng</th>
      <th scope="col">Trạng thái dữ liệu</th>
      <th scope="col">Vai trò</th>
      <th scope="col">Gói</th>
      <th scope="col">Ngày tạo</th>
    </tr>
  </thead>
```

Remove `AdminOperationalClassificationBadge` from the identity cell and add:

```tsx
<td className="px-4 py-3.5">
  <AdminOperationalClassificationBadge classification={user.operationalClassification} />
</td>
```

Change the empty-state `colSpan` from `5` to `6`, add one classification skeleton cell, and wrap each checkbox in a `min-h-6 min-w-6` inline-flex label to provide a 24px target while retaining the current `aria-label`.

- [ ] **Step 6: Run the page test and verify GREEN**

Run:

```powershell
npm.cmd run test:ui -- src/app/pages/AdminUsersPage.test.tsx
```

Expected: page tests pass with the new column, filter semantics, and conditional selection panel.

- [ ] **Step 7: Commit Task 2**

```powershell
git add -- src/app/pages/AdminUsersPage.tsx src/app/pages/AdminUsersPage.test.tsx
git commit -m "fix(admin): clarify users table controls"
```

### Task 3: Extract Clear Bulk Classification Feedback

**Files:**
- Create: `src/app/components/admin/AdminBulkClassificationFeedback.tsx`
- Create: `src/app/components/admin/AdminBulkClassificationFeedback.test.tsx`
- Modify: `src/app/pages/AdminUsersPage.tsx`
- Modify: `src/app/pages/AdminUsersPage.test.tsx`

**Interfaces:**
- Produces:

```ts
export interface AdminBulkClassificationResult {
  updated: number;
  unchanged: number;
  failed: Array<{ userUid: string; errorCode: string }>;
  transportFailed?: boolean;
}

export interface AdminBulkClassificationFeedbackProps {
  result: AdminBulkClassificationResult;
  onDismiss: () => void;
}
```

- [ ] **Step 1: Write failing component tests for summary, details, and dismissal**

Create `AdminBulkClassificationFeedback.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminBulkClassificationFeedback } from "./AdminBulkClassificationFeedback";

describe("AdminBulkClassificationFeedback", () => {
  it("keeps failed UIDs outside the live summary and exposes expandable details", () => {
    render(
      <AdminBulkClassificationFeedback
        result={{
          updated: 1,
          unchanged: 1,
          failed: [{ userUid: "missing-user", errorCode: "user_not_found" }],
        }}
        onDismiss={() => undefined}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("1 đã cập nhật, 1 không thay đổi, 1 thất bại");
    expect(screen.getByRole("status")).not.toHaveTextContent("missing-user");
    expect(screen.getByText("1 mục thất bại")).toBeInTheDocument();
    expect(screen.getByText("missing-user")).toBeInTheDocument();
  });

  it("dismisses the feedback through a labelled action", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <AdminBulkClassificationFeedback
        result={{ updated: 2, unchanged: 0, failed: [] }}
        onDismiss={onDismiss}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Đóng thông báo kết quả phân loại" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the component test and verify RED**

Run:

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminBulkClassificationFeedback.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the feedback component**

Create the component using `InlineStatusMessage`, existing `Button`, and Lucide `X`:

```tsx
import { X } from "lucide-react";
import { InlineStatusMessage } from "../states";
import { Button } from "../ui/button";

export interface AdminBulkClassificationResult {
  updated: number;
  unchanged: number;
  failed: Array<{ userUid: string; errorCode: string }>;
  transportFailed?: boolean;
}

export interface AdminBulkClassificationFeedbackProps {
  result: AdminBulkClassificationResult;
  onDismiss: () => void;
}

export function AdminBulkClassificationFeedback({
  result,
  onDismiss,
}: AdminBulkClassificationFeedbackProps) {
  const hasFailures = result.failed.length > 0;
  const tone = result.transportFailed ? "error" : hasFailures ? "warning" : "success";
  const summary = result.transportFailed
    ? "Không thể gửi yêu cầu phân loại. Bạn có thể thử lại."
    : `${result.updated} đã cập nhật, ${result.unchanged} không thay đổi, ${result.failed.length} thất bại.`;

  return (
    <div className="space-y-2">
      <InlineStatusMessage tone={tone}>
        <div className="flex min-w-0 items-start gap-3">
          <p className="min-w-0 flex-1">{summary}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            aria-label="Đóng thông báo kết quả phân loại"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </InlineStatusMessage>
      {hasFailures ? (
        <details className="rounded-[var(--r-control)] border border-app-line bg-app-surface px-3.5 py-2.5 text-sm text-app-ink-soft">
          <summary className="cursor-pointer font-medium text-app-ink">{result.failed.length} mục thất bại</summary>
          <ul className="mt-2 space-y-1 break-all">
            {result.failed.map((item) => (
              <li key={`${item.userUid}:${item.errorCode}`}>{item.userUid} · {item.errorCode}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Integrate the component into AdminUsersPage**

Import `AdminBulkClassificationFeedback` and its result type. Remove the page-local `BulkResult` interface, replace the inline result paragraph with:

```tsx
{bulkResult ? (
  <AdminBulkClassificationFeedback
    result={bulkResult}
    onDismiss={() => setBulkResult(null)}
  />
) : null}
```

In the transport catch, keep `bulkResult.transportFailed = true` and call `setClassificationError(undefined)` instead of rendering a duplicate page-level error after the dialog closes.

Update the existing mixed-result page test:

```tsx
expect(screen.getByRole("status")).toHaveTextContent("1 đã cập nhật, 1 không thay đổi, 1 thất bại");
expect(screen.getByRole("status")).not.toHaveTextContent("missing-user");
expect(screen.getByText("missing-user")).toBeInTheDocument();
expect(screen.queryByText(/Đã chọn 0\/100 người dùng/)).not.toBeInTheDocument();
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminBulkClassificationFeedback.test.tsx src/app/components/admin/AdminOperationalClassification.test.tsx src/app/pages/AdminUsersPage.test.tsx
```

Expected: all three focused test files pass, including existing retry and request-ID coverage.

- [ ] **Step 6: Commit Task 3**

```powershell
git add -- src/app/components/admin/AdminBulkClassificationFeedback.tsx src/app/components/admin/AdminBulkClassificationFeedback.test.tsx src/app/pages/AdminUsersPage.tsx src/app/pages/AdminUsersPage.test.tsx
git commit -m "fix(admin): present classification feedback clearly"
```

### Task 4: Verify Frontend Quality Gates

**Files:**
- Verify only; no new production scope.

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: verification evidence for review and integration.

- [ ] **Step 1: Run all focused Admin classification tests**

```powershell
npm.cmd run test:ui -- src/app/components/admin/AdminBulkClassificationFeedback.test.tsx src/app/components/admin/AdminOperationalClassification.test.tsx src/app/pages/AdminUsersPage.test.tsx
```

Expected: all focused test files pass with zero failures.

- [ ] **Step 2: Run typecheck**

```powershell
npm.cmd run typecheck
```

Expected: exit code `0`.

- [ ] **Step 3: Run targeted Biome lint**

```powershell
npx.cmd biome lint src/app/components/admin/AdminBulkClassificationFeedback.tsx src/app/components/admin/AdminBulkClassificationFeedback.test.tsx src/app/components/admin/AdminOperationalClassificationBadge.tsx src/app/components/admin/AdminOperationalClassification.test.tsx src/app/components/admin/AdminStatusBadge.tsx src/app/pages/AdminUsersPage.tsx src/app/pages/AdminUsersPage.test.tsx
```

Expected: exit code `0`, no fixes applied.

- [ ] **Step 4: Run production build**

```powershell
npm.cmd run build
```

Expected: exit code `0`.

- [ ] **Step 5: Review final scope**

```powershell
git diff --check origin/main...HEAD
git status --short
```

Expected: no whitespace errors and only the design, plan, two existing Admin components, one new feedback component/test, and the Admin Users page/test are changed.

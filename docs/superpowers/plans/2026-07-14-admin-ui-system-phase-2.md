# Admin UI System Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Migrate Orders, Payments, Sales Report, Subscriptions, Refunds, and Discounts onto the approved Editorial Operations presentation contract without changing backend, auth, billing, classification, or mutation authority.

**Architecture:** Complete one vertical page checkpoint at a time. Page components continue to own requests, URL state, debounce, request IDs, pagination, dialogs, and mutations; shared Admin components own only labelled layout, data surfaces, status presentation, persistent feedback, and accessible pagination. Add only AdminPagination to the Phase 1 shared layer and compose the existing AdminToolbar, AdminDataPanel, AdminFeedbackBanner, AdminStatusBadge, and AdminEmptyState directly in each page.

**Tech Stack:** React 18, TypeScript, React Router, Tailwind CSS, existing Radix-based UI components, Lucide icons, Vitest, Testing Library, Biome, Vite 6.

## Global Constraints

- Frontend-only Shell work; do not change backend models, API routes, auth, billing authority, entitlement, localStorage, sync, or operational-classification persistence.
- Keep every current /admin/* route and the real-mode-only /admin/reports/sales boundary unchanged.
- Preserve all existing service functions, request payload fields, URL filters, debounce timing, request generations, retry IDs, status transitions, reconciliation, refund, and discount validation rules.
- Keep service calls and server state in their existing page or service module; no shared component may fetch or own URL/query state.
- Preserve local stale-data behavior page by page; Sales Report intentionally clears a report for a failed active-filter request.
- Use existing app-* semantic tokens in light and dark themes.
- Keep desktop operations efficient and retain primary search, filters, pagination, and mutation actions at approximately 390px.
- Tables require a caption, scoped column headers, contained horizontal overflow, right-aligned numeric values, and monospace identifiers.
- Orders and Refunds remain card/list pages; Payments, Sales Report, Subscriptions, and Discounts remain table-led pages.
- Do not add a dependency or create a universal data-table abstraction.
- Do not touch or restore the dirty primary checkout at D:\Projects\Vision Board Web Platform; work only in D:\Projects\Vision-Board-admin-data-classification-spec.

---

## File Structure

### Shared pagination

- Create src/app/components/admin/AdminPagination.tsx: labelled previous/next controls and page metadata only.
- Modify src/app/components/admin/AdminUiPrimitives.test.tsx: cover boundary disabling, disabled request state, labels, and callback values.

### Orders

- Modify src/app/pages/AdminOrdersPage.tsx: labelled toolbar, mobile search, persistent load/export feedback, conditional selection bar, data panel, stacked cards, and shared pagination.
- Modify src/app/pages/AdminOrdersPage.test.tsx: cover toolbar/search semantics, stale rows after refresh failure, conditional selection, and pagination while retaining all existing server/mutation tests.

### Payments

- Modify src/app/pages/AdminPaymentsPage.tsx: labelled toolbar, mobile search, persistent load feedback, accessible data table, and shared pagination.
- Modify src/app/pages/AdminPaymentsPage.test.tsx: cover caption/scoped headers, mobile search binding, stale table retention, and pagination while retaining debounce/classification tests.
- Verify src/app/pages/AdminPaymentsPage.dialog.test.tsx unchanged: protect manual completion and evidence contracts.

### Sales Report

- Modify src/app/components/admin/sales/AdminSalesReportFilters.tsx: render the existing URL-owned filters inside AdminToolbar.
- Modify src/app/components/admin/sales/AdminSalesReportList.tsx: add caption, scoped headers, numeric alignment, and panel-compatible borders without changing desktop/mobile actions.
- Modify src/app/pages/AdminSalesReportPage.tsx: persistent validation/load/export feedback, data panel, and shared pagination.
- Modify src/app/pages/AdminSalesReportPage.test.tsx: cover the labelled filter region, table semantics, feedback actions, and pagination while retaining all request-generation/review/evidence/export tests.

### Subscriptions

- Modify src/app/pages/AdminSubscriptionsPage.tsx: labelled toolbar, accessible filters, persistent error feedback, data panel table, and shared pagination.
- Modify src/app/pages/AdminSubscriptionsPage.test.tsx: cover default real scope, inherited exclusions, caption/scoped headers, stale rows, retry, and pagination.

### Refunds

- Modify src/app/pages/AdminRefundsPage.tsx: persistent load/action feedback, outer data panel, responsive card actions, and restrained recipient-account emphasis.
- Modify src/app/pages/AdminRefundsPage.dialog.test.tsx: cover persistent failed-action feedback while preserving the in-app confirmation and admin-note payload.

### Discounts

- Modify src/app/pages/AdminDiscountsPage.tsx: labelled toolbar/mobile search, page-owned pagination using the existing response contract, accessible table, persistent page/dialog feedback, and unchanged three-step wizard.
- Create src/app/pages/AdminDiscountsPage.test.tsx: cover list payloads, filter page reset, caption/scoped headers, pagination, wizard payload, usage history, and delete confirmation.

---

### Task 1: Add Accessible Shared Admin Pagination

**Files:**
- Create: src/app/components/admin/AdminPagination.tsx
- Modify: src/app/components/admin/AdminUiPrimitives.test.tsx

**Interfaces:**
- Produces AdminPaginationProps with page, totalPages, onPageChange, disabled?, itemLabel?, and className?.
- AdminPagination owns no request, URL, or page state.
- Later tasks pass page-owned callbacks and preserve their existing reset/rebase behavior.

- [ ] **Step 1: Write failing pagination primitive tests**

Extend src/app/components/admin/AdminUiPrimitives.test.tsx with user-event and callback coverage:

~~~tsx
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { AdminPagination } from "./AdminPagination";

it("labels page navigation and emits only the requested adjacent page", async () => {
  const user = userEvent.setup();
  const onPageChange = vi.fn();

  render(
    <AdminPagination
      page={2}
      totalPages={4}
      itemLabel="đơn in"
      onPageChange={onPageChange}
    />,
  );

  expect(screen.getByRole("navigation", { name: "Phân trang đơn in" })).toBeInTheDocument();
  expect(screen.getByText("Trang 2 / 4")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Trang trước" }));
  await user.click(screen.getByRole("button", { name: "Trang sau" }));

  expect(onPageChange.mock.calls).toEqual([[1], [3]]);
});

it("disables pagination at boundaries and while the page request is busy", () => {
  const { rerender } = render(
    <AdminPagination page={1} totalPages={3} onPageChange={() => undefined} />,
  );

  expect(screen.getByRole("button", { name: "Trang trước" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Trang sau" })).toBeEnabled();

  rerender(
    <AdminPagination page={3} totalPages={3} onPageChange={() => undefined} />,
  );

  expect(screen.getByRole("button", { name: "Trang trước" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Trang sau" })).toBeDisabled();

  rerender(
    <AdminPagination page={2} totalPages={3} disabled onPageChange={() => undefined} />,
  );

  expect(screen.getByRole("button", { name: "Trang trước" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Trang sau" })).toBeDisabled();
});
~~~

- [ ] **Step 2: Run the primitive test and verify RED**

~~~powershell
npm.cmd run test:ui -- src/app/components/admin/AdminUiPrimitives.test.tsx
~~~

Expected: FAIL because AdminPagination does not exist.

- [ ] **Step 3: Implement the presentational component**

Create src/app/components/admin/AdminPagination.tsx:

~~~tsx
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "../ui/button";
import { cn } from "../ui/utils";

export interface AdminPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  itemLabel?: string;
  className?: string;
}

export function AdminPagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  itemLabel = "dữ liệu",
  className,
}: AdminPaginationProps) {
  const boundedTotalPages = Math.max(1, totalPages);

  return (
    <nav
      aria-label={"Phân trang " + itemLabel}
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm tabular-nums text-app-ink-muted" aria-live="polite">
        Trang {page} / {boundedTotalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Trang trước"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Trước
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Trang sau"
          disabled={disabled || page >= boundedTotalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Sau
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
~~~

- [ ] **Step 4: Run the primitive test and verify GREEN**

~~~powershell
npm.cmd run test:ui -- src/app/components/admin/AdminUiPrimitives.test.tsx
~~~

Expected: all primitive tests pass.

- [ ] **Step 5: Commit shared pagination**

~~~powershell
git add -- src/app/components/admin/AdminPagination.tsx src/app/components/admin/AdminUiPrimitives.test.tsx
git commit -m "feat(admin): add accessible pagination"
~~~

### Task 2: Migrate Orders To The Editorial Operations Workspace

**Files:**
- Modify: src/app/pages/AdminOrdersPage.tsx
- Modify: src/app/pages/AdminOrdersPage.test.tsx

**Interfaces:**
- Consumes AdminToolbar, AdminDataPanel, AdminFeedbackBanner, and AdminPagination.
- Preserves OrderListView, currentViewRef, request generation, loadOrders, resetListPosition, status transitions, bulk updates, classification request IDs, edit dialog, export payload, and pending-count behavior.

- [ ] **Step 1: Write failing Orders presentation tests**

Add these cases to src/app/pages/AdminOrdersPage.test.tsx:

~~~tsx
it("renders a labelled operations toolbar, mobile search, and accessible data panel", async () => {
  const { AdminOrdersPage } = await import("./AdminOrdersPage");
  renderPage(AdminOrdersPage);

  expect(await screen.findByRole("region", { name: "Bộ lọc đơn in" })).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Tìm kiếm đơn in" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Danh sách đơn in" })).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Phân trang đơn in" })).toBeInTheDocument();
});

it("hides bulk controls until a row is selected", async () => {
  const { AdminOrdersPage } = await import("./AdminOrdersPage");
  renderPage(AdminOrdersPage);

  await screen.findByText("Mặc định dữ liệu thật");
  expect(screen.queryByText("Chọn tất cả")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("checkbox", { name: "Chọn đơn order-1" }));

  expect(screen.getByText("Đã chọn 1/1")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Chọn tất cả đơn trên trang" })).toBeInTheDocument();
});

it("keeps rendered orders visible when a refresh fails", async () => {
  const { AdminOrdersPage } = await import("./AdminOrdersPage");
  orders.adminGetOrders
    .mockResolvedValueOnce(response)
    .mockRejectedValueOnce(new Error("Render timeout"));
  renderPage(AdminOrdersPage);

  expect(await screen.findByText("Nguyen A")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Tải lại" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Render timeout");
  expect(screen.getByText("Nguyen A")).toBeInTheDocument();
});
~~~

Update row checkboxes in existing tests to query their accessible names instead of relying on array position.

- [ ] **Step 2: Run Orders tests and verify RED**

~~~powershell
npm.cmd run test:ui -- src/app/pages/AdminOrdersPage.test.tsx
~~~

Expected: new tests fail for the missing toolbar, mobile search, data panel, shared pagination, conditional bulk bar, row checkbox label, and persistent feedback.

- [ ] **Step 3: Add shared imports and derived presentation state**

Add Search to the Lucide import and add these Admin imports:

~~~tsx
import { ClipboardList, Download, Loader2, Pencil, RefreshCw, Search } from "lucide-react";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminPagination } from "../components/admin/AdminPagination";
import { AdminToolbar } from "../components/admin/AdminToolbar";
~~~

Before the return, derive the display-only state:

~~~tsx
const hasActiveFilters =
  query.trim().length > 0 ||
  statusFilter !== "all" ||
  frameFilter !== "all" ||
  dateFrom.length > 0 ||
  dateTo.length > 0 ||
  operationalScope !== "real";
const showSelectionBar = selectedIds.size > 0 || bulkBusy;
~~~

- [ ] **Step 4: Replace free-floating filters with the labelled toolbar**

Replace the current status/frame/date and operational-scope wrappers with:

~~~tsx
<AdminToolbar
  label="Bộ lọc đơn in"
  meta={counts.all.toLocaleString("vi-VN") + " đơn trong phạm vi hiện tại"}
>
  <div className="relative w-full sm:max-w-md md:hidden">
    <Search
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted"
      aria-hidden="true"
    />
    <Input
      type="search"
      aria-label="Tìm kiếm đơn in"
      autoComplete="off"
      placeholder="Tìm email, mã đơn, họ tên, số điện thoại"
      value={query}
      onChange={(event) => handleSearchChange(event.target.value)}
      className="pl-9"
    />
  </div>
  <Select
    value={statusFilter}
    onValueChange={(value) => {
      resetListPosition();
      setStatusFilter(value as ApiOrderStatus | "all");
    }}
  >
    <SelectTrigger className={adminInput} aria-label="Trạng thái đơn in">
      <SelectValue placeholder="Trạng thái" />
    </SelectTrigger>
    <SelectContent>
      {STATUS_FILTER_ORDER.map((status) => (
        <SelectItem key={status} value={status}>
          {status === "all" ? "Tất cả trạng thái" : ORDER_STATUS_LABELS[status]}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <Select
    value={frameFilter}
    onValueChange={(value) => {
      resetListPosition();
      setFrameFilter(value);
    }}
  >
    <SelectTrigger className={adminInput} aria-label="Khung">
      <SelectValue placeholder="Khung" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Tất cả khung</SelectItem>
      {frameOptions.map((frame) => (
        <SelectItem key={frame} value={frame}>{frame}</SelectItem>
      ))}
    </SelectContent>
  </Select>
  <Input
    type="date"
    value={dateFrom}
    onChange={(event) => {
      resetListPosition();
      setDateFrom(event.target.value);
    }}
    className={adminInput}
    aria-label="Lọc từ ngày"
  />
  <Input
    type="date"
    value={dateTo}
    onChange={(event) => {
      resetListPosition();
      setDateTo(event.target.value);
    }}
    className={adminInput}
    aria-label="Lọc đến ngày"
  />
  <div className="w-full sm:w-56">
    <AdminOperationalScopeFilter
      value={operationalScope}
      onChange={(scope) => {
        resetListPosition();
        setOperationalScope(scope);
      }}
    />
  </div>
</AdminToolbar>
~~~

Keep the existing status-count tablist immediately after the toolbar, including page reset and selected-state semantics. Add motion-reduce:transition-none to its modified transition class.

- [ ] **Step 5: Convert load/export errors to persistent feedback**

Replace the two current error renderers with:

~~~tsx
{error ? (
  <AdminFeedbackBanner
    tone="error"
    summary={
      <div>
        <p className="font-semibold">Không tải được đơn in</p>
        <p className="mt-1 font-normal">{error}</p>
      </div>
    }
    action={
      <Button type="button" variant="outline" size="sm" onClick={() => void loadOrders()}>
        Thử lại
      </Button>
    }
  />
) : null}

{exportError ? (
  <AdminFeedbackBanner
    tone="error"
    summary={exportError}
    action={
      <Button type="button" variant="outline" size="sm" onClick={() => void handleExportCsv()}>
        Thử xuất lại
      </Button>
    }
    onDismiss={() => setExportError(null)}
    dismissLabel="Đóng lỗi xuất đơn in"
  />
) : null}
~~~

Do not clear orders when loadOrders starts or fails.

- [ ] **Step 6: Make selection conditional and label row controls**

Render the bulk block only for showSelectionBar. Use this opening checkbox:

~~~tsx
{showSelectionBar ? (
  <div className="flex flex-wrap items-center gap-2 rounded-[var(--r-card)] border border-app-line bg-app-bg-subtle/50 px-4 py-2.5">
    <label className="flex cursor-pointer select-none items-center gap-2">
      <input
        type="checkbox"
        aria-label="Chọn tất cả đơn trên trang"
        className="h-4 w-4 rounded border-app-line-strong text-app-accent accent-app-accent"
        checked={selectedIds.size === orders.length && orders.length > 0}
        onChange={toggleSelectAll}
      />
      <span className="text-xs text-app-ink-soft">
        Đã chọn {selectedIds.size}/{orders.length}
      </span>
    </label>
    <div className="ml-auto flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs text-app-ink-muted">Chuyển sang:</span>
      {(["confirmed", "printing", "shipping", "delivered"] as ApiOrderStatus[]).map((status) => (
        <Button
          key={status}
          type="button"
          size="sm"
          variant="outline"
          className="h-7 border-app-line/60 bg-app-bg-subtle text-xs text-app-ink-soft hover:bg-app-accent-soft hover:text-app-ink"
          disabled={bulkBusy}
          onClick={() => void handleBulkStatus(status)}
        >
          {ORDER_STATUS_LABELS[status]}
        </Button>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 border-rose-500/30 bg-rose-500/10 text-xs text-rose-700 hover:bg-rose-500/20 dark:text-rose-200"
        disabled={bulkBusy}
        onClick={() => void handleBulkStatus("cancelled")}
      >
        Hủy đơn
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-app-ink-muted"
        disabled={bulkBusy}
        onClick={() => setSelectedIds(new Set())}
      >
        Bỏ chọn
      </Button>
      {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin text-app-ink-muted motion-reduce:animate-none" /> : null}
    </div>
  </div>
) : null}
~~~

Label each row checkbox:

~~~tsx
<input
  type="checkbox"
  aria-label={"Chọn đơn " + order.id}
  className="mt-0.5 h-4 w-4 shrink-0 rounded border-app-line-strong text-app-accent accent-app-accent"
  checked={selectedIds.has(order.id)}
  onChange={() => toggleSelect(order.id)}
/>
~~~

- [ ] **Step 7: Put card states inside AdminDataPanel**

Insert this opening tag immediately before the current loading/empty/list conditional:

~~~tsx
<AdminDataPanel
  title="Danh sách đơn in"
  description="Thông tin khách hàng, cấu hình đơn, phân loại và bước xử lý tiếp theo."
  busy={loading}
  contentClassName="p-3 sm:p-4"
>
~~~

Replace only the current empty-state branch with:

~~~tsx
<AdminEmptyState
  icon={ClipboardList}
  title={hasActiveFilters ? "Không tìm thấy đơn phù hợp" : "Chưa có đơn hàng nào"}
  description={
    hasActiveFilters
      ? "Thử bỏ bộ lọc hoặc thay đổi từ khóa tìm kiếm."
      : "Đơn hàng từ người dùng sẽ xuất hiện ở đây khi có."
  }
/>
~~~

Insert this closing tag immediately after the unchanged populated-list branch:

~~~tsx
</AdminDataPanel>
~~~

Keep the existing four-card skeleton and every populated order field/action. Change each order-card footer to stack on mobile:

~~~tsx
<div className="mt-4 flex flex-col gap-3 border-t border-app-line/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
~~~

Remove the avatar gradient and scale transform:

~~~tsx
<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-bg-subtle text-xs font-bold text-app-accent">
~~~

- [ ] **Step 8: Replace page-owned pagination markup**

~~~tsx
{totalPages > 1 ? (
  <AdminPagination
    page={page}
    totalPages={totalPages}
    disabled={loading}
    itemLabel="đơn in"
    onPageChange={(nextPage) => {
      setSelectedIds(new Set());
      setPage(nextPage);
    }}
  />
) : null}
~~~

- [ ] **Step 9: Run Orders tests and verify GREEN**

~~~powershell
npm.cmd run test:ui -- src/app/pages/AdminOrdersPage.test.tsx
~~~

Expected: all existing and new Orders tests pass, including filtered reloads, page rebasing, direct/inherited classification, active-view status transitions, and bulk updates.

- [ ] **Step 10: Commit Orders**

~~~powershell
git add -- src/app/pages/AdminOrdersPage.tsx src/app/pages/AdminOrdersPage.test.tsx
git commit -m "feat(admin): align orders operations workspace"
~~~

### Task 3: Migrate Payments To An Accessible Dense Table

**Files:**
- Modify: src/app/pages/AdminPaymentsPage.tsx
- Modify: src/app/pages/AdminPaymentsPage.test.tsx
- Verify unchanged: src/app/pages/AdminPaymentsPage.dialog.test.tsx

**Interfaces:**
- Consumes AdminToolbar, AdminDataPanel, AdminFeedbackBanner, and AdminPagination.
- Preserves 300ms search debounce, operational scope, pending sidebar query, page rebasing, manual completion dialog/note, PayOS evidence allowlist, reconciliation, classification request IDs, and non-optimistic reloads.

- [ ] **Step 1: Write failing Payments structure and stale-data tests**

Add to src/app/pages/AdminPaymentsPage.test.tsx:

~~~tsx
it("renders a labelled payment toolbar and accessible table", async () => {
  await renderPage();

  expect(await screen.findByRole("region", { name: "Bộ lọc thanh toán" })).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Tìm kiếm thanh toán" })).toBeInTheDocument();
  const table = screen.getByRole("table", { name: "Danh sách thanh toán tự động" });
  expect(table).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Số tiền" })).toHaveAttribute("scope", "col");
  expect(screen.getByRole("navigation", { name: "Phân trang thanh toán" })).toBeInTheDocument();
});

it("keeps the last safe payment rows after a refresh error", async () => {
  let mainListCalls = 0;
  service.adminListPaymentOrders.mockImplementation(
    (params: { limit?: number; status?: string }) => {
      if (params.limit === 1) {
        return Promise.resolve({ ...response(), total: 3 });
      }
      mainListCalls += 1;
      return mainListCalls === 1
        ? Promise.resolve(response())
        : Promise.reject(new Error("Payment refresh timeout"));
    },
  );

  await renderPage();
  expect(await screen.findByText("VBPAY1")).toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole("button", { name: "Tải lại" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Payment refresh timeout");
  expect(screen.getByText("VBPAY1")).toBeInTheDocument();
});
~~~

- [ ] **Step 2: Run Payments tests and verify RED**

~~~powershell
npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.test.tsx src/app/pages/AdminPaymentsPage.dialog.test.tsx
~~~

Expected: only the new presentation assertions fail; dialog and business-contract tests remain green.

- [ ] **Step 3: Add shared imports and toolbar**

Add Search and TableCaption:

~~~tsx
import { CreditCard, Download, Loader2, RefreshCw, Search } from "lucide-react";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminPagination } from "../components/admin/AdminPagination";
import { AdminToolbar } from "../components/admin/AdminToolbar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
~~~

Replace the separate quick filters, scope wrapper, and count paragraph with:

~~~tsx
<AdminToolbar
  label="Bộ lọc thanh toán"
  meta={"Hiển thị " + items.length.toLocaleString("vi-VN") + " / " + total.toLocaleString("vi-VN") + " đơn"}
>
  <div className="relative w-full sm:max-w-md md:hidden">
    <Search
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted"
      aria-hidden="true"
    />
    <Input
      type="search"
      aria-label="Tìm kiếm thanh toán"
      autoComplete="off"
      placeholder="Tìm mã đơn, email, mã giao dịch"
      value={query}
      onChange={(event) => handleSearchChange(event.target.value)}
      className="pl-9"
    />
  </div>
  <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc nhanh theo trạng thái">
    {PAYMENT_STATUS_FILTERS.map((status) => {
      const active = statusFilter === status;
      return (
        <button
          key={status}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => {
            resetToFirstPage();
            setStatusFilter(status);
          }}
          className={
            "rounded-[var(--r-pill)] border px-3 py-1.5 text-xs font-medium transition-colors motion-reduce:transition-none " +
            (active
              ? "border-app-accent/40 bg-app-accent-soft text-app-accent"
              : "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-accent-soft hover:text-app-ink")
          }
        >
          {status === "all" ? "Tất cả" : PAYMENT_STATUS_LABELS[status]}
        </button>
      );
    })}
  </div>
  <div className="w-full sm:w-56">
    <AdminOperationalScopeFilter
      value={operationalScope}
      onChange={(scope) => {
        resetToFirstPage();
        setOperationalScope(scope);
      }}
    />
  </div>
</AdminToolbar>

<p className="text-sm leading-6 text-app-ink-muted">
  Chỉ bấm <span className="text-app-ink-soft">Mở Plus thủ công</span> sau khi đối chiếu trong cổng thanh toán hoặc app ngân hàng.
  {query ? <span className="ml-1">Đang lọc theo "{query}".</span> : null}
</p>
~~~

- [ ] **Step 4: Use persistent load feedback without clearing safe rows**

~~~tsx
{error ? (
  <AdminFeedbackBanner
    tone="error"
    summary={
      <div>
        <p className="font-semibold">Không tải được dữ liệu thanh toán</p>
        <p className="mt-1 font-normal">{error}</p>
      </div>
    }
    action={
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void loadPayments(debouncedQuery, statusFilter, operationalScope, page)}
      >
        Thử lại
      </Button>
    }
  />
) : null}
~~~

Keep setItems unchanged on load failure.

- [ ] **Step 5: Put the table inside AdminDataPanel and add semantics**

Insert this opening tag immediately before the current loading/empty/table conditional:

~~~tsx
<AdminDataPanel
  title="Danh sách thanh toán tự động"
  description="Đối chiếu số tiền, provider, nguồn tiền, phân loại và hành động an toàn."
  busy={loading}
>
~~~

Replace the loading branch with:

~~~tsx
<div className="flex min-h-[40vh] items-center justify-center" role="status">
  <Loader2 className="h-6 w-6 animate-spin text-app-ink-muted motion-reduce:animate-none" />
  <span className="sr-only">Đang tải thanh toán</span>
</div>
~~~

Wrap the empty state in div className="p-4". Replace the populated Table opening and header with:

~~~tsx
<Table containerClassName="rounded-none border-0 shadow-none" className="text-app-ink-soft">
  <TableCaption className="sr-only">Danh sách thanh toán tự động</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead scope="col">Mã đơn</TableHead>
      <TableHead scope="col">Người dùng</TableHead>
      <TableHead scope="col" className="text-right">Số tiền</TableHead>
      <TableHead scope="col">Trạng thái</TableHead>
      <TableHead scope="col">Phân loại</TableHead>
      <TableHead scope="col">Nguồn tiền</TableHead>
      <TableHead scope="col">Tạo lúc</TableHead>
      <TableHead scope="col" className="text-right">Hành động</TableHead>
    </TableRow>
  </TableHeader>
~~~

Keep the current TableBody and all row actions. Change the amount cell to className="text-right text-app-ink-soft", keep order and transaction IDs monospace, and keep actions right-aligned. Insert this closing tag immediately after the conditional:

~~~tsx
</AdminDataPanel>
~~~

- [ ] **Step 6: Replace page-owned pagination**

~~~tsx
{totalPages > 1 ? (
  <AdminPagination
    page={page}
    totalPages={totalPages}
    disabled={loading}
    itemLabel="thanh toán"
    onPageChange={setPage}
  />
) : null}
~~~

- [ ] **Step 7: Run Payments tests and verify GREEN**

~~~powershell
npm.cmd run test:ui -- src/app/pages/AdminPaymentsPage.test.tsx src/app/pages/AdminPaymentsPage.dialog.test.tsx
~~~

Expected: all Payments tests pass, including debounce, page rebasing, manual completion, PayOS evidence, reconciliation, direct/inherited classification, request-ID protection, and pending counts.

- [ ] **Step 8: Commit Payments**

~~~powershell
git add -- src/app/pages/AdminPaymentsPage.tsx src/app/pages/AdminPaymentsPage.test.tsx
git commit -m "feat(admin): align payments data workspace"
~~~

### Task 4: Align Sales Report Filters, Feedback, Data Panel, And Pagination

**Files:**
- Modify: src/app/components/admin/sales/AdminSalesReportFilters.tsx
- Modify: src/app/components/admin/sales/AdminSalesReportList.tsx
- Modify: src/app/pages/AdminSalesReportPage.tsx
- Modify: src/app/pages/AdminSalesReportPage.test.tsx

**Interfaces:**
- AdminSalesReportFilters keeps SalesReportUrlState, parseSalesReportUrlState, validateSalesReportUrlState, and onChange signatures unchanged.
- AdminSalesReportList keeps item/action callback signatures unchanged.
- AdminSalesReportPage preserves real-mode routing, URL replacement, activeParams, latest-response-wins generation, deliberate report clearing, review request-ID reuse/change behavior, reconciliation, evidence, and server export.

- [ ] **Step 1: Write failing Sales Report presentation tests**

Add to src/app/pages/AdminSalesReportPage.test.tsx:

~~~tsx
it("exposes labelled report filters, a named table, and shared pagination", async () => {
  renderPage();

  expect(await screen.findByRole("region", { name: "Bộ lọc báo cáo kinh doanh" })).toBeInTheDocument();
  const table = screen.getByRole("table", { name: "Giao dịch trong báo cáo kinh doanh" });
  expect(table).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Số tiền" })).toHaveAttribute("scope", "col");
  expect(screen.getByRole("navigation", { name: "Phân trang báo cáo kinh doanh" })).toBeInTheDocument();
});

it("keeps export failure persistent and retries the active export", async () => {
  const user = userEvent.setup();
  adminServiceMock.adminExportSalesReport
    .mockRejectedValueOnce(new Error("Export timeout"))
    .mockResolvedValueOnce({
      blob: new Blob(["orderId"], { type: "text/csv" }),
      filename: "sales-report.csv",
    });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:report") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

  renderPage();
  await screen.findByText("Giao dịch thành công");
  await user.click(screen.getByRole("button", { name: "Xuất CSV" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Export timeout");
  await user.click(screen.getByRole("button", { name: "Thử xuất lại" }));
  await waitFor(() => expect(adminServiceMock.adminExportSalesReport).toHaveBeenCalledTimes(2));
});
~~~

- [ ] **Step 2: Run Sales Report tests and verify RED**

~~~powershell
npm.cmd run test:ui -- src/app/pages/AdminSalesReportPage.test.tsx
~~~

Expected: new tests fail for the missing toolbar region, table caption/scopes, shared pagination, and export retry banner.

- [ ] **Step 3: Render existing filters inside AdminToolbar**

Import AdminToolbar in src/app/components/admin/sales/AdminSalesReportFilters.tsx and replace the outer div:

~~~tsx
<AdminToolbar label="Bộ lọc báo cáo kinh doanh" className="items-start lg:items-end">
  <fieldset>
    <legend className="mb-2 text-sm font-medium text-app-ink">Khoảng thời gian</legend>
    <div className="flex flex-wrap gap-2">
      {([
        ["7d", "7 ngày"],
        ["30d", "30 ngày"],
        ["custom", "Tùy chỉnh"],
      ] as const).map(([range, label]) => (
        <Button
          key={range}
          type="button"
          variant={value.range === range ? "default" : "outline"}
          aria-pressed={value.range === range}
          onClick={() => setRange(range)}
        >
          {label}
        </Button>
      ))}
    </div>
  </fieldset>
  <label htmlFor="sales-report-from" className="grid gap-2 text-sm font-medium text-app-ink">
    Từ ngày
    <Input
      id="sales-report-from"
      type="date"
      value={value.from}
      disabled={value.range !== "custom"}
      onChange={(event) => onChange({ ...value, from: event.target.value, page: 1 })}
    />
  </label>
  <label htmlFor="sales-report-to" className="grid gap-2 text-sm font-medium text-app-ink">
    Đến ngày
    <Input
      id="sales-report-to"
      type="date"
      value={value.to}
      disabled={value.range !== "custom"}
      onChange={(event) => onChange({ ...value, to: event.target.value, page: 1 })}
    />
  </label>
  <label className="grid gap-2 text-sm font-medium text-app-ink">
    Provider
    <select
      value={value.provider}
      className="h-11 rounded-xl border border-app-line bg-app-surface px-3 text-sm text-app-ink"
      onChange={(event) =>
        onChange({
          ...value,
          provider: event.target.value as SalesReportUrlState["provider"],
          page: 1,
        })
      }
    >
      <option value="all">Tất cả</option>
      {availableProviders.map((provider) => (
        <option key={provider} value={provider}>{provider}</option>
      ))}
    </select>
  </label>
</AdminToolbar>
~~~

- [ ] **Step 4: Add table semantics without changing responsive actions**

Import TableCaption in src/app/components/admin/sales/AdminSalesReportList.tsx. Replace the desktop table opening/header:

~~~tsx
<Table containerClassName="rounded-none border-0 shadow-none">
  <TableCaption className="sr-only">Giao dịch trong báo cáo kinh doanh</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead scope="col">Khách hàng</TableHead>
      <TableHead scope="col">Giao dịch</TableHead>
      <TableHead scope="col" className="text-right">Số tiền</TableHead>
      <TableHead scope="col">Đối chiếu</TableHead>
      <TableHead scope="col">Trạng thái KPI</TableHead>
      <TableHead scope="col">Hành động</TableHead>
    </TableRow>
  </TableHeader>
~~~

Change the amount cell to:

~~~tsx
<TableCell className="text-right font-semibold tabular-nums">
  {formatVnd(item.amountVnd)}
</TableCell>
~~~

Keep the complete existing desktop rows, mobile list, SalesKpiStatus, and SalesActions behavior unchanged.

- [ ] **Step 5: Replace validation/load/export messages with AdminFeedbackBanner**

Add AdminDataPanel, AdminFeedbackBanner, and AdminPagination imports in AdminSalesReportPage.tsx. Render:

~~~tsx
{validationError ? (
  <AdminFeedbackBanner tone="error" summary={validationError} />
) : null}

{loadError ? (
  <AdminFeedbackBanner
    tone="error"
    summary={
      <div>
        <p className="font-semibold">Không tải được báo cáo kinh doanh</p>
        <p className="mt-1 font-normal">{loadError}</p>
      </div>
    }
    action={
      <Button type="button" variant="outline" size="sm" onClick={() => void loadReport(activeParams)}>
        Thử lại
      </Button>
    }
  />
) : null}

{exportError ? (
  <AdminFeedbackBanner
    tone="error"
    summary={exportError}
    action={
      <Button type="button" variant="outline" size="sm" onClick={() => void handleExport()}>
        Thử xuất lại
      </Button>
    }
    onDismiss={() => setExportError(null)}
    dismissLabel="Đóng lỗi xuất báo cáo"
  />
) : null}
~~~

Do not alter loadReport setting report to null; the active-filter correctness test must continue to pass.

- [ ] **Step 6: Put review tabs and rows into a labelled data panel**

Keep KPI grid and revenue chart before the following block:

~~~tsx
<AdminDataPanel
  title="Giao dịch trong báo cáo"
  description="Trạng thái KPI hiệu lực sau phân loại tài khoản, duyệt thủ công và hoàn tiền."
  busy={loading}
  actions={
    <div role="tablist" aria-label="Trạng thái KPI hiệu lực" className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.status}
          type="button"
          role="tab"
          aria-selected={state.kpiStatus === tab.status}
          variant={state.kpiStatus === tab.status ? "default" : "outline"}
          onClick={() => updateState({ ...state, kpiStatus: tab.status, page: 1 })}
        >
          {tab.label} ({report.tabCounts[tab.status]})
        </Button>
      ))}
    </div>
  }
  contentClassName="p-3 sm:p-4"
>
  {noQualifyingSales ? (
    <AdminEmptyState
      title="Chưa có giao dịch phù hợp"
      description="Khoảng ngày và provider hiện tại chưa có giao dịch Plus thực đã hoàn tất."
    />
  ) : report.total === 0 ? (
    <AdminEmptyState
      title="Không có giao dịch trong trạng thái này"
      description="Đổi tab hoặc bộ lọc để xem các giao dịch khác."
    />
  ) : (
    <AdminSalesReportList
      items={report.items}
      busyOrderId={busyOrderId}
      onReview={(item) => {
        reviewRequestRef.current = null;
        setReviewError(null);
        setReviewItem(item);
      }}
      onReconcile={(orderId) => void handleReconcile(orderId)}
      onViewEvidence={setEvidenceItem}
    />
  )}
</AdminDataPanel>
~~~

- [ ] **Step 7: Replace Sales Report pagination**

~~~tsx
{report.totalPages > 1 ? (
  <AdminPagination
    page={report.page}
    totalPages={report.totalPages}
    disabled={loading}
    itemLabel="báo cáo kinh doanh"
    onPageChange={(nextPage) => updateState({ ...state, page: nextPage })}
  />
) : null}
~~~

- [ ] **Step 8: Run Sales Report tests and verify GREEN**

~~~powershell
npm.cmd run test:ui -- src/app/pages/AdminSalesReportPage.test.tsx
~~~

Expected: all tests pass, including URL state, date validation, page reset, latest-response-wins, stale-report hiding, request-ID reuse/change, manual inclusion validation, inherited classification, reconciliation, safe evidence, and export.

- [ ] **Step 9: Commit Sales Report**

~~~powershell
git add -- src/app/components/admin/sales/AdminSalesReportFilters.tsx src/app/components/admin/sales/AdminSalesReportList.tsx src/app/pages/AdminSalesReportPage.tsx src/app/pages/AdminSalesReportPage.test.tsx
git commit -m "feat(admin): align sales report workspace"
~~~

### Task 5: Migrate Subscriptions To The Shared Table Contract

**Files:**
- Modify: src/app/pages/AdminSubscriptionsPage.tsx
- Modify: src/app/pages/AdminSubscriptionsPage.test.tsx

**Interfaces:**
- Consumes AdminToolbar, AdminDataPanel, AdminFeedbackBanner, and AdminPagination.
- Preserves default operationalScope="real", server pagination, status/plan payloads, inherited classification labels, and absence of mutation actions.

- [ ] **Step 1: Write failing Subscriptions tests**

Extend the response to totalPages: 2 and add:

~~~tsx
it("renders labelled filters, a named table, and shared pagination", async () => {
  render(<AdminSubscriptionsPage />);

  expect(await screen.findByRole("region", { name: "Bộ lọc subscription" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Trạng thái subscription" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Gói subscription" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Danh sách subscription" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Phân loại" })).toHaveAttribute("scope", "col");
  expect(screen.getByRole("navigation", { name: "Phân trang subscription" })).toBeInTheDocument();
});

it("retains safe subscription rows when refresh fails and retries the same view", async () => {
  const user = userEvent.setup();
  adminServiceMock.adminListSubscriptions
    .mockResolvedValueOnce({ ...response, totalPages: 2 })
    .mockRejectedValueOnce(new Error("Subscription timeout"))
    .mockResolvedValueOnce({ ...response, totalPages: 2 });
  render(<AdminSubscriptionsPage />);

  expect(await screen.findByText("member@example.test")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Tải lại" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Subscription timeout");
  expect(screen.getByText("member@example.test")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Thử lại" }));
  await waitFor(() => expect(adminServiceMock.adminListSubscriptions).toHaveBeenCalledTimes(3));
});
~~~

- [ ] **Step 2: Run Subscriptions tests and verify RED**

~~~powershell
npm.cmd run test:ui -- src/app/pages/AdminSubscriptionsPage.test.tsx
~~~

Expected: new presentation tests fail.

- [ ] **Step 3: Add shared imports and labelled toolbar**

~~~tsx
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminPagination } from "../components/admin/AdminPagination";
import { AdminToolbar } from "../components/admin/AdminToolbar";
~~~

Replace the free filter row with:

~~~tsx
<AdminToolbar
  label="Bộ lọc subscription"
  meta={total.toLocaleString("vi-VN") + " gói đăng ký"}
>
  <Select
    value={statusFilter}
    onValueChange={(value) => {
      setStatusFilter(value);
      setPage(1);
    }}
  >
    <SelectTrigger className="w-44" aria-label="Trạng thái subscription">
      <SelectValue placeholder="Trạng thái" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Tất cả trạng thái</SelectItem>
      <SelectItem value="active">Đang hoạt động</SelectItem>
      <SelectItem value="trialing">Dùng thử</SelectItem>
      <SelectItem value="past_due">Quá hạn</SelectItem>
      <SelectItem value="canceled">Đã hủy</SelectItem>
    </SelectContent>
  </Select>
  <Select
    value={planFilter}
    onValueChange={(value) => {
      setPlanFilter(value);
      setPage(1);
    }}
  >
    <SelectTrigger className="w-36" aria-label="Gói subscription">
      <SelectValue placeholder="Gói" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Tất cả gói</SelectItem>
      <SelectItem value="PLUS">Plus</SelectItem>
      <SelectItem value="FREE">Free</SelectItem>
    </SelectContent>
  </Select>
  <AdminOperationalScopeFilter
    value={operationalScope}
    onChange={(scope) => {
      setOperationalScope(scope);
      setPage(1);
    }}
  />
</AdminToolbar>
~~~

- [ ] **Step 4: Replace error and table wrappers**

Use persistent feedback:

~~~tsx
{error ? (
  <AdminFeedbackBanner
    tone="error"
    summary={
      <div>
        <p className="font-semibold">Không tải được danh sách subscription</p>
        <p className="mt-1 font-normal">{error}</p>
      </div>
    }
    action={
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void load(page, statusFilter, planFilter, operationalScope)}
      >
        Thử lại
      </Button>
    }
  />
) : null}
~~~

Replace adminSurface.card with:

~~~tsx
<AdminDataPanel
  title="Danh sách subscription"
  description="Gói, trạng thái, chu kỳ, thời hạn và phân loại hiệu lực theo tài khoản."
  busy={loading}
  contentClassName="overflow-x-auto"
>
  <table className="w-full min-w-[860px] text-left text-sm">
    <caption className="sr-only">Danh sách subscription</caption>
    <thead>
      <tr className="border-b border-app-line bg-app-bg-subtle">
        <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-app-ink-soft">User</th>
        <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-app-ink-soft">Gói</th>
        <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-app-ink-soft">Trạng thái</th>
        <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-app-ink-soft">Chu kỳ</th>
        <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-app-ink-soft">Hết hạn</th>
        <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-app-ink-soft">Ngày tạo</th>
        <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-app-ink-soft">Phân loại</th>
      </tr>
    </thead>
~~~

Keep the complete current tbody, skeleton rows, empty row, badges, and classification labels. Insert:

~~~tsx
  </table>
</AdminDataPanel>
~~~

after the tbody. Remove the unused adminSurface import and add motion-reduce:transition-none to modified row transitions.

- [ ] **Step 5: Replace pagination**

~~~tsx
{totalPages > 1 ? (
  <AdminPagination
    page={page}
    totalPages={totalPages}
    disabled={loading}
    itemLabel="subscription"
    onPageChange={(nextPage) =>
      void load(nextPage, statusFilter, planFilter, operationalScope)
    }
  />
) : null}
~~~

- [ ] **Step 6: Run Subscriptions tests and verify GREEN**

~~~powershell
npm.cmd run test:ui -- src/app/pages/AdminSubscriptionsPage.test.tsx
~~~

Expected: all tests pass with real scope still default and inherited exclusions unchanged.

- [ ] **Step 7: Commit Subscriptions**

~~~powershell
git add -- src/app/pages/AdminSubscriptionsPage.tsx src/app/pages/AdminSubscriptionsPage.test.tsx
git commit -m "feat(admin): align subscriptions data workspace"
~~~

### Task 6: Migrate Refunds To A Persistent Operational Queue

**Files:**
- Modify: src/app/pages/AdminRefundsPage.tsx
- Modify: src/app/pages/AdminRefundsPage.dialog.test.tsx

**Interfaces:**
- Consumes AdminDataPanel and AdminFeedbackBanner.
- Preserves pending sidebar count, adminListRefundRequests("pending"), complete/reject service calls, default notes, busy state, in-app AlertDialog, server reload, and success toast.

- [ ] **Step 1: Write failing Refunds feedback and layout tests**

Add to src/app/pages/AdminRefundsPage.dialog.test.tsx:

~~~tsx
it("uses a labelled data panel and keeps failed resolve feedback persistent", async () => {
  const user = userEvent.setup();
  adminServiceMock.adminCompleteRefundRequest.mockRejectedValueOnce(new Error("Bank transfer timeout"));
  const { AdminRefundsPage } = await import("./AdminRefundsPage");

  render(
    <MemoryRouter>
      <AdminRefundsPage />
    </MemoryRouter>,
  );

  expect(await screen.findByRole("region", { name: "Yêu cầu hoàn tiền đang chờ" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Đã hoàn tiền" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Xác nhận đã hoàn tiền?" });
  await user.click(within(dialog).getByRole("button", { name: "Xác nhận đã hoàn tiền" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Bank transfer timeout");
  expect(screen.getByRole("alertdialog", { name: "Xác nhận đã hoàn tiền?" })).toBeInTheDocument();
  expect(screen.getByText("VBREF00001")).toBeInTheDocument();
});
~~~

- [ ] **Step 2: Run Refunds tests and verify RED**

~~~powershell
npm.cmd run test:ui -- src/app/pages/AdminRefundsPage.dialog.test.tsx
~~~

Expected: FAIL because the list has no labelled data panel and action errors are toast-only.

- [ ] **Step 3: Add persistent action state**

Add imports:

~~~tsx
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
~~~

Add state:

~~~tsx
const [actionError, setActionError] = useState<string | null>(null);
~~~

Clear old action feedback when a new command opens:

~~~tsx
const openConfirm = (request: AdminRefundRequestSummary, status: RefundActionStatus) => {
  setActionError(null);
  setPending({ request, status });
  setAdminNote(
    status === "completed"
      ? "Đã chuyển khoản hoàn tiền thủ công."
      : "Không đủ điều kiện hoàn tiền.",
  );
};
~~~

Replace the catch branch in confirmResolve:

~~~tsx
} catch (err) {
  setActionError(getErrorMessage(err, "Không thể xử lý yêu cầu hoàn tiền."));
} finally {
  setBusyId(null);
}
~~~

Keep success toast and reload behavior unchanged.

- [ ] **Step 4: Render load/action feedback**

~~~tsx
{error ? (
  <AdminFeedbackBanner
    tone="error"
    summary={
      <div>
        <p className="font-semibold">Không tải được yêu cầu hoàn tiền</p>
        <p className="mt-1 font-normal">{error}</p>
      </div>
    }
    action={
      <Button type="button" variant="outline" size="sm" onClick={() => void loadRefunds()}>
        Thử lại
      </Button>
    }
  />
) : null}

{actionError ? (
  <AdminFeedbackBanner
    tone="error"
    summary={actionError}
    onDismiss={() => setActionError(null)}
    dismissLabel="Đóng lỗi xử lý hoàn tiền"
  />
) : null}
~~~

- [ ] **Step 5: Wrap the queue in AdminDataPanel and stack mobile actions**

Insert this opening tag immediately before the current loading/empty/list conditional:

~~~tsx
<AdminDataPanel
  title="Yêu cầu hoàn tiền đang chờ"
  description="Đối chiếu lý do, tài khoản nhận tiền và ghi chú trước khi xác nhận."
  busy={loading}
  contentClassName="p-3 sm:p-4"
>
~~~

Keep the current loading, empty, and card bodies. Add role="status", an sr-only loading label, and motion-reduce:animate-none to the loading branch. Insert this closing tag immediately after the conditional:

~~~tsx
</AdminDataPanel>
~~~

Use this card header and action layout:

~~~tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
...
<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
~~~

Use neutral editorial surfaces for reason and recipient account:

~~~tsx
<div className="rounded-[var(--r-control)] border border-app-line bg-app-bg-subtle p-3">
  <p className="text-xs font-semibold uppercase tracking-wider text-app-ink-muted">Lý do user</p>
  <p className="mt-1 text-sm leading-6 text-app-ink-soft">{request.reason}</p>
</div>
<div className="rounded-[var(--r-control)] border border-app-status-warning/40 bg-app-surface p-3">
  <p className="text-xs font-semibold uppercase tracking-wider text-app-status-warning">Tài khoản nhận hoàn tiền</p>
  <p className="mt-1 break-words text-sm font-medium leading-6 text-app-ink">{request.refundAccount}</p>
</div>
~~~

Remove the now-unused adminSurface import.

- [ ] **Step 6: Run Refunds tests and verify GREEN**

~~~powershell
npm.cmd run test:ui -- src/app/pages/AdminRefundsPage.dialog.test.tsx
~~~

Expected: both the existing admin-note payload test and the new persistent-error test pass.

- [ ] **Step 7: Commit Refunds**

~~~powershell
git add -- src/app/pages/AdminRefundsPage.tsx src/app/pages/AdminRefundsPage.dialog.test.tsx
git commit -m "feat(admin): align refunds operations queue"
~~~

### Task 7: Migrate Discounts Without Rewriting The Wizard

**Files:**
- Modify: src/app/pages/AdminDiscountsPage.tsx
- Create: src/app/pages/AdminDiscountsPage.test.tsx

**Interfaces:**
- Consumes AdminToolbar, AdminDataPanel, AdminFeedbackBanner, and AdminPagination.
- Preserves adminListDiscounts, adminCreateDiscount, adminUpdateDiscount, adminDeleteDiscount, adminListCouponUsages, every payload field, three wizard steps, preview math, appliesTo safeguard, active toggle, usage dialog, and delete AlertDialog.
- Adds page and totalPages state using the existing AdminDiscountListResponse fields while keeping limit: 100.

- [ ] **Step 1: Create failing Discounts page tests**

Create src/app/pages/AdminDiscountsPage.test.tsx:

~~~tsx
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminSearchProvider } from "../components/admin/AdminSearchContext";

const authMock = vi.hoisted(() => ({ useAuthContext: vi.fn() }));
const service = vi.hoisted(() => ({
  adminCreateDiscount: vi.fn(),
  adminDeleteDiscount: vi.fn(),
  adminListCouponUsages: vi.fn(),
  adminListDiscounts: vi.fn(),
  adminUpdateDiscount: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({ useAuthContext: authMock.useAuthContext }));
vi.mock("@/services/adminService", () => service);
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
  configurable: true,
  value: () => false,
});
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: () => undefined,
});

const discount = {
  _id: "discount-1",
  type: "coupon",
  code: "LAUNCH20",
  name: "Ra mắt Plus",
  discountType: "percentage",
  discountValue: 20,
  minAmount: 99000,
  maxUses: 50,
  usedCount: 3,
  startsAt: "2026-07-01T00:00:00.000Z",
  endsAt: "2026-12-31T00:00:00.000Z",
  appliesTo: ["PLUS"],
  active: true,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const response = {
  items: [discount],
  total: 101,
  page: 1,
  limit: 100,
  totalPages: 2,
};

async function renderPage() {
  const { AdminDiscountsPage } = await import("./AdminDiscountsPage");
  return render(
    <MemoryRouter>
      <AdminSearchProvider>
        <AdminDiscountsPage />
      </AdminSearchProvider>
    </MemoryRouter>,
  );
}

describe("AdminDiscountsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.useAuthContext.mockReturnValue({
      authLoading: false,
      user: { uid: "admin" },
      userProfile: { role: "admin" },
      userProfileLoading: false,
    });
    service.adminListDiscounts.mockResolvedValue(response);
    service.adminCreateDiscount.mockResolvedValue(discount);
    service.adminUpdateDiscount.mockResolvedValue(discount);
    service.adminDeleteDiscount.mockResolvedValue({ status: "deleted" });
    service.adminListCouponUsages.mockResolvedValue({
      items: [{ _id: "usage-1", userId: "user-1", orderId: "order-1", usedAt: "2026-07-10T00:00:00.000Z" }],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  });

  it("loads a paginated list and exposes toolbar/table semantics", async () => {
    await renderPage();

    await waitFor(() =>
      expect(service.adminListDiscounts).toHaveBeenCalledWith({
        q: "",
        type: undefined,
        active: true,
        page: 1,
        limit: 100,
      }),
    );
    expect(screen.getByRole("region", { name: "Bộ lọc giảm giá" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Tìm kiếm giảm giá" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Danh sách discount" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Giảm" })).toHaveAttribute("scope", "col");
    expect(screen.getByRole("navigation", { name: "Phân trang discount" })).toBeInTheDocument();
  });

  it("resets pagination when search or filters change", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole("button", { name: "Trang sau" }));
    await waitFor(() => expect(service.adminListDiscounts).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    ));

    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm kiếm giảm giá" }), {
      target: { value: "launch" },
    });
    await waitFor(() => expect(service.adminListDiscounts).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "launch", page: 1 }),
    ));

    await user.click(screen.getByRole("combobox", { name: "Loại discount" }));
    await user.click(await screen.findByRole("option", { name: "Coupon" }));
    await waitFor(() => expect(service.adminListDiscounts).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "coupon", page: 1 }),
    ));
  });

  it("keeps the three-step create payload unchanged", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole("button", { name: "Tạo mới" }));
    const dialog = screen.getByRole("dialog", { name: "Tạo discount mới" });
    await user.type(within(dialog).getByLabelText("Mã code"), "NEW20");
    await user.type(within(dialog).getByLabelText("Tên hiển thị"), "Ưu đãi mới");
    await user.click(within(dialog).getByRole("button", { name: "Tiếp theo" }));
    await user.click(within(dialog).getByRole("button", { name: "Tiếp theo" }));
    await user.click(within(dialog).getByRole("button", { name: "Tạo discount" }));

    await waitFor(() =>
      expect(service.adminCreateDiscount).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "coupon",
          code: "NEW20",
          name: "Ưu đãi mới",
          discountType: "percentage",
          discountValue: 10,
          appliesTo: ["PLUS", "physical_order"],
        }),
      ),
    );
  });

  it("keeps usage and delete actions inside their existing dialogs", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(await screen.findByRole("button", { name: "Chi tiết" }));
    expect(await screen.findByRole("dialog", { name: "Lịch sử sử dụng: LAUNCH20" })).toHaveTextContent("order-1");
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Xóa" }));
    const alertDialog = await screen.findByRole("alertdialog", { name: "Vô hiệu hóa discount?" });
    await user.click(within(alertDialog).getByRole("button", { name: "Vô hiệu hóa" }));
    await waitFor(() => expect(service.adminDeleteDiscount).toHaveBeenCalledWith("discount-1"));
  });
});
~~~

- [ ] **Step 2: Run Discounts tests and verify RED**

~~~powershell
npm.cmd run test:ui -- src/app/pages/AdminDiscountsPage.test.tsx
~~~

Expected: tests fail because the page omits page state/payload, toolbar/mobile search, table caption/scopes, shared pagination, and form label associations.

- [ ] **Step 3: Add page-owned pagination and stable reset handlers**

Add shared imports and Search:

~~~tsx
import { ArrowLeft, ArrowRight, Loader2, Percent, Plus, RefreshCw, Search, X } from "lucide-react";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminFeedbackBanner } from "../components/admin/AdminFeedbackBanner";
import { AdminPagination } from "../components/admin/AdminPagination";
import { AdminToolbar } from "../components/admin/AdminToolbar";
~~~

Add state:

~~~tsx
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [mutationError, setMutationError] = useState<string | null>(null);
const [formError, setFormError] = useState<string | null>(null);
const [usagesError, setUsagesError] = useState<string | null>(null);
const limit = 100;
~~~

Change the search handler:

~~~tsx
const handleSearchChange = useCallback((next: string) => {
  setPage(1);
  setQuery(next);
}, []);
~~~

Change loadDiscounts:

~~~tsx
const loadDiscounts = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const result = await adminListDiscounts({
      q: query,
      type: typeFilter || undefined,
      active: showInactive ? undefined : true,
      page,
      limit,
    });
    const boundedPages = Math.max(1, result.totalPages);
    if (page > boundedPages) {
      setPage(boundedPages);
      return;
    }
    setItems(result.items);
    setTotal(result.total);
    setPage(result.page);
    setTotalPages(boundedPages);
  } catch (err) {
    setError(getErrorMessage(err, "Không thể tải danh sách giảm giá."));
  } finally {
    setLoading(false);
  }
}, [page, query, showInactive, typeFilter]);
~~~

Remove queryRef, typeRef, and inactiveRef because they are not used by any mutation or request guard.
Remove useRef from the React import after those refs are deleted.

- [ ] **Step 4: Replace the free controls with AdminToolbar**

~~~tsx
<AdminToolbar
  label="Bộ lọc giảm giá"
  meta={total.toLocaleString("vi-VN") + " discount"}
  actions={
    <>
      <Button type="button" onClick={openCreate} disabled={!isAdmin}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Tạo mới
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => void loadDiscounts()} disabled={loading}>
        <RefreshCw
          className={"mr-2 h-4 w-4 " + (loading ? "animate-spin motion-reduce:animate-none" : "")}
          aria-hidden="true"
        />
        Tải lại
      </Button>
    </>
  }
>
  <div className="relative w-full sm:max-w-md md:hidden">
    <Search
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted"
      aria-hidden="true"
    />
    <Input
      type="search"
      aria-label="Tìm kiếm giảm giá"
      autoComplete="off"
      placeholder="Tìm mã, tên discount"
      value={query}
      onChange={(event) => handleSearchChange(event.target.value)}
      className="pl-9"
    />
  </div>
  <Select
    value={typeFilter || "all"}
    onValueChange={(value) => {
      setPage(1);
      setTypeFilter(value === "all" ? "" : value);
    }}
  >
    <SelectTrigger className="w-[160px]" aria-label="Loại discount">
      <SelectValue placeholder="Tất cả loại" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Tất cả loại</SelectItem>
      <SelectItem value="coupon">Coupon</SelectItem>
      <SelectItem value="sale_event">Đợt sale</SelectItem>
    </SelectContent>
  </Select>
  <div className="flex items-center gap-2">
    <Switch
      id="show-inactive"
      checked={showInactive}
      onCheckedChange={(checked) => {
        setPage(1);
        setShowInactive(checked);
      }}
    />
    <Label htmlFor="show-inactive" className="cursor-pointer text-sm text-app-ink-muted">
      Hiện đã tắt
    </Label>
  </div>
</AdminToolbar>
~~~

- [ ] **Step 5: Add persistent page and dialog feedback**

Replace page load error:

~~~tsx
{error ? (
  <AdminFeedbackBanner
    tone="error"
    summary={error}
    action={
      <Button type="button" variant="outline" size="sm" onClick={() => void loadDiscounts()}>
        Thử lại
      </Button>
    }
  />
) : null}

{mutationError ? (
  <AdminFeedbackBanner
    tone="error"
    summary={mutationError}
    onDismiss={() => setMutationError(null)}
    dismissLabel="Đóng lỗi cập nhật discount"
  />
) : null}
~~~

In handleSubmit, setFormError(null) before the request and replace the catch:

~~~tsx
} catch (err) {
  setFormError(getErrorMessage(err, "Không thể lưu discount."));
} finally {
  setSubmitting(false);
}
~~~

Render inside the create/edit dialog before the step body:

~~~tsx
{formError ? (
  <AdminFeedbackBanner
    tone="error"
    summary={formError}
    onDismiss={() => setFormError(null)}
    dismissLabel="Đóng lỗi lưu discount"
  />
) : null}
~~~

For handleToggleActive and confirmDelete, setMutationError(null) before the request and setMutationError(getErrorMessage(...)) in catch. Keep success toast, dialog close, and reload unchanged.

Set formError(null) in openCreate and openEdit, and clear it when the form dialog closes so an old transport error never appears in a new command.

For openUsages, setUsagesError(null) before loading and setUsagesError(getErrorMessage(...)) in catch. Render in the usage dialog:

~~~tsx
{usagesError ? (
  <AdminFeedbackBanner tone="error" summary={usagesError} />
) : null}
~~~

- [ ] **Step 6: Add form label associations required by tests**

Use explicit IDs without changing inputs or validation:

~~~tsx
<Label htmlFor="discount-code">Mã code</Label>
<Input
  id="discount-code"
  value={form.code}
  onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
  placeholder="VD: SUMMER2026"
  disabled={!!editing}
  className="font-mono uppercase"
/>

<Label htmlFor="discount-name">Tên hiển thị</Label>
<Input
  id="discount-name"
  value={form.name}
  onChange={(event) => setForm({ ...form, name: event.target.value })}
  placeholder="VD: Giảm 30% ra mắt"
/>
~~~

Keep every other form field, step, preview, and appliesTo rule unchanged.

- [ ] **Step 7: Put the table in AdminDataPanel and add pagination**

Insert this opening tag immediately before the current loading/error/empty/table rendering:

~~~tsx
<AdminDataPanel
  title="Danh sách discount"
  description="Mã, loại, giá trị, thời gian hiệu lực, lượt dùng và trạng thái."
  busy={loading}
>
~~~

Replace the loading branch with:

~~~tsx
<div className="flex items-center gap-3 p-8 text-app-ink-muted" role="status">
  <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
  <span>Đang tải discount...</span>
</div>
~~~

Wrap the empty state in div className="p-4". Replace the populated Table opening/header with:

~~~tsx
<Table containerClassName="rounded-none border-0 shadow-none">
  <TableCaption className="sr-only">Danh sách discount</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead scope="col">Loại</TableHead>
      <TableHead scope="col">Mã</TableHead>
      <TableHead scope="col">Tên</TableHead>
      <TableHead scope="col" className="text-right">Giảm</TableHead>
      <TableHead scope="col" className="text-right">Đã dùng</TableHead>
      <TableHead scope="col">Hiệu lực</TableHead>
      <TableHead scope="col">Trạng thái</TableHead>
      <TableHead scope="col" className="text-right">Hành động</TableHead>
    </TableRow>
  </TableHeader>
~~~

Keep the complete current TableBody and every action. Insert this closing tag immediately after the conditional:

~~~tsx
</AdminDataPanel>
~~~

Then render the shared pagination after the panel:

~~~tsx
{totalPages > 1 ? (
  <AdminPagination
    page={page}
    totalPages={totalPages}
    disabled={loading}
    itemLabel="discount"
    onPageChange={setPage}
  />
) : null}
~~~

Import TableCaption, right-align discount/usage numeric cells, keep codes monospace, and remove the old total footer because AdminToolbar already displays total.

- [ ] **Step 8: Run Discounts tests and verify GREEN**

~~~powershell
npm.cmd run test:ui -- src/app/pages/AdminDiscountsPage.test.tsx
~~~

Expected: all list, filter reset, pagination, wizard payload, usage, and delete tests pass.

- [ ] **Step 9: Commit Discounts**

~~~powershell
git add -- src/app/pages/AdminDiscountsPage.tsx src/app/pages/AdminDiscountsPage.test.tsx
git commit -m "feat(admin): align discounts management workspace"
~~~

### Task 8: Verify The Complete Phase 2 Surface

**Files:**
- Verify all Phase 2 implementation files.
- Modify docs/superpowers/plans/2026-07-14-admin-ui-system-phase-2.md only to append an execution record after evidence is available.

**Interfaces:**
- Consumes Tasks 1-7.
- Produces the Phase 2 quality gate before Phase 3 begins.

- [ ] **Step 1: Run the complete focused Phase 2 UI set**

~~~powershell
npm.cmd run test:ui -- src/app/components/admin/AdminUiPrimitives.test.tsx src/app/pages/AdminOrdersPage.test.tsx src/app/pages/AdminPaymentsPage.test.tsx src/app/pages/AdminPaymentsPage.dialog.test.tsx src/app/pages/AdminSalesReportPage.test.tsx src/app/pages/AdminSubscriptionsPage.test.tsx src/app/pages/AdminRefundsPage.dialog.test.tsx src/app/pages/AdminDiscountsPage.test.tsx
~~~

Expected: zero failures.

- [ ] **Step 2: Run the frontend typecheck**

~~~powershell
npm.cmd run typecheck
~~~

Expected: exit code 0.

- [ ] **Step 3: Run Biome lint without fixes**

~~~powershell
npm.cmd run lint
~~~

Expected: exit code 0. Do not run format, autofix, or snapshot update commands.

- [ ] **Step 4: Run the broad frontend regression suite**

~~~powershell
npm.cmd run test:run
~~~

Expected: exit code 0. If an unrelated baseline failure appears, compare it with origin/main and record exact evidence before deciding whether it blocks Phase 2.

- [ ] **Step 5: Run the production build**

~~~powershell
npm.cmd run build
~~~

Expected: exit code 0; existing chunk-size warnings are non-blocking only when no new build error appears.

- [ ] **Step 6: Verify route gating**

~~~powershell
npm.cmd run test:ui -- src/app/routes.test.tsx
~~~

Expected: the real-mode Sales Report route remains registered only in real mode and all current Admin routes remain unchanged.

- [ ] **Step 7: Run scope and diff checks**

~~~powershell
git -c core.pager=cat diff --check origin/main...HEAD
git -c core.pager=cat status --short
git -c core.pager=cat diff --name-only origin/main...HEAD
git -c core.pager=cat log --oneline origin/main..HEAD
~~~

Expected:

- no whitespace errors;
- no backend, service-contract, package, lockfile, auth, billing, storage, or sync changes;
- only approved Admin UI/tests and Phase 2 documentation differ;
- worktree is clean after the verification record commit.

- [ ] **Step 8: Perform authenticated manual QA when credentials exist**

Verify each route at approximately 1440px, 1024px, and 390px in light and dark themes:

- /admin/orders
- /admin/payments
- /admin/reports/sales in real mode
- /admin/subscriptions
- /admin/refunds
- /admin/discounts

Check keyboard order, focus visibility, desktop/mobile search, filters, selected tabs, horizontal table containment, card stacking, first/last pagination boundaries, loading, empty, retry, retained stale data, Sales Report stale hiding, dialogs, duplicate-submit protection, mutation feedback, and reduced-motion behavior.

If no authenticated Firebase admin session or reusable storage state exists, record that exact blocker and do not claim manual visual QA passed.

- [ ] **Step 9: Append and commit the Phase 2 execution record**

Append an Execution Record dated 2026-07-14 containing the actual implementation commit IDs/messages and one factual line for each verification command: focused file/test count, typecheck result, Biome checked-file count, broad file/test count, build result, route test count, diff-check result, and either the manual visual QA result or the exact authenticated-session blocker. Do not write template values or unknown counts.

~~~powershell
git add -- docs/superpowers/plans/2026-07-14-admin-ui-system-phase-2.md
git commit -m "docs(admin): record phase 2 verification"
~~~

Do not create an empty documentation commit.

---

## Execution Record — 2026-07-14

### Implementation commits

- `4ac6f92e feat(admin): add accessible pagination`
- `824c63d7 feat(admin): align orders operations workspace`
- `f5450037 feat(admin): align payments data workspace`
- `2b7acb4d feat(admin): align sales report workspace`
- `56d1930f feat(admin): align subscriptions data workspace`
- `5a235be3 feat(admin): align refunds operations queue`
- `54a8b8fd feat(admin): align discounts management workspace`

### Verification evidence

- Focused Phase 2 UI suite: `8` test files and `57` tests passed; exit code `0`.
- Frontend typecheck: `npm.cmd run typecheck` completed with exit code `0` after the final Phase 2 implementation edit.
- Biome lint: `1030` files checked; exit code `0`; no fixes applied. Biome reported one non-blocking `useTemplate` info in `AdminPagination.tsx` and no lint errors.
- Broad frontend regression suite: `138` test files and `1361` tests passed; exit code `0`.
- Production build: `3066` modules transformed and Vite completed successfully in `11.45s`; exit code `0`.
- Route gating: `src/app/routes.test.tsx` passed `17` tests; exit code `0`.
- Scope and diff checks: `git diff --check origin/main...HEAD` and the Phase 2-only diff from `a52f4de1^` both returned no whitespace errors. The Phase 2-only diff contains `17` approved Admin UI, test, and plan files with no backend, service-contract, package, lockfile, auth, billing, storage, or sync changes.
- Test output retained pre-existing non-failing React `act(...)` and `AdminPendingCountsProvider` harness warnings on Admin page suites; all affected tests passed.
- Authenticated manual visual QA was not run because this worktree/session has no authenticated Firebase admin session or reusable browser storage state. No manual visual-QA pass is claimed.

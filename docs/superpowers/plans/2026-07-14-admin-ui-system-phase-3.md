# Admin UI System Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Catalog, Email History, Settings, Audit Logs, Admin Order Detail, and Admin User Detail onto the approved Editorial Operations presentation contract without changing routes, APIs, auth, billing authority, classification semantics, or mutation payloads.

**Architecture:** Complete one page-level vertical slice at a time. Existing pages continue to own fetches, request generations, optimistic updates, route identity, dialogs, and mutations; existing shared Admin components own only labelled layout, status presentation, persistent feedback, accessible tables, and pagination. No new shared abstraction is introduced in Phase 3.

**Tech Stack:** React 18, TypeScript, React Router, Tailwind CSS, existing Radix-based UI components, Lucide icons, Vitest, Testing Library, Biome, Vite 6.

## Global Constraints

- Mixed surface: freeze Catalog, role, subscription, and classification contracts before presentation edits.
- Frontend-only work; do not change backend models, API routes, auth, billing authority, entitlement, localStorage, sync, or service contracts.
- Keep every current `/admin/*` route and the real-mode-only Sales Report boundary unchanged.
- Keep Catalog endpoints, request methods, optimistic rollback, image MIME validation, `2MB` maximum, and `FormData` upload unchanged.
- Keep User Detail role/subscription payloads, classification request IDs, latest-route-wins behavior, and confirmation copy unchanged.
- Keep Order Detail request generations, classification authority, conflict handling, and request-ID reuse unchanged.
- Use existing `app-*` tokens in light and dark themes and respect reduced motion.
- Tables require captions, scoped headers, contained horizontal overflow, right-aligned numeric values, and monospace identifiers.
- Persistent modal errors render inside the active modal so Radix `aria-hidden` behavior does not hide them.
- Do not add a dependency or create a universal detail/table abstraction.
- Work only in `D:\Projects\Vision-Board-admin-data-classification-spec`; do not touch the dirty primary checkout.

---

## File Structure

- Create `src/app/pages/AdminCatalogPage.test.tsx`; modify `src/app/pages/AdminCatalogPage.tsx`.
- Create `src/app/pages/AdminEmailHistoryPage.test.tsx`; modify `src/app/pages/AdminEmailHistoryPage.tsx`.
- Create `src/app/pages/AdminSettingsPage.test.tsx`; modify `src/app/pages/AdminSettingsPage.tsx`.
- Create `src/app/pages/AdminAuditLogsPage.test.tsx`; modify `src/app/pages/AdminAuditLogsPage.tsx`.
- Modify `src/app/pages/AdminOrderDetailPage.test.tsx` and `src/app/pages/AdminOrderDetailPage.tsx`.
- Modify `src/app/pages/AdminUserDetailPage.dialog.test.tsx` and `src/app/pages/AdminUserDetailPage.tsx`.
- Append the execution record to this plan only after final evidence exists.

---

### Task 1: Migrate Catalog Operations

**Files:**
- Create: `src/app/pages/AdminCatalogPage.test.tsx`
- Modify: `src/app/pages/AdminCatalogPage.tsx`

**Interfaces:**
- Consumes existing `buildAdminApiUrl`, `adminFetch`, `authedFetch`, Catalog endpoints, `AdminDataPanel`, `AdminFeedbackBanner`, and table primitives.
- Produces a labelled catalog workspace while preserving price, active-state, and thumbnail mutation contracts.

- [ ] **Step 1: Write failing Catalog tests**

Create hoisted `authedFetch` and `getApiBaseUrl` mocks with this fixture and response helper:

```tsx
const frame = {
  itemId: "frame-oak",
  type: "frame",
  label: "Khung gỗ sồi",
  priceVnd: 99000,
  sortOrder: 1,
  isActive: true,
};

function response(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}
```

Cover these exact behaviors:

```tsx
it("loads the endpoint and exposes labelled tabs, panel, and table", async () => {
  const { AdminCatalogPage } = await import("./AdminCatalogPage");
  render(<AdminCatalogPage />);
  expect(await screen.findByRole("tab", { name: /Khung gỗ/ })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Catalog Khung gỗ" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Danh sách Khung gỗ" })).toBeInTheDocument();
  expect(screen.getByRole("spinbutton", { name: "Giá Khung gỗ sồi" })).toHaveValue(99000);
});

it("rolls back price and active state after failed optimistic requests", async () => {
  api.authedFetch
    .mockResolvedValueOnce(response({ data: [frame] }))
    .mockRejectedValueOnce(new Error("price write failed"))
    .mockRejectedValueOnce(new Error("active write failed"));
  const user = userEvent.setup();
  const { AdminCatalogPage } = await import("./AdminCatalogPage");
  render(<AdminCatalogPage />);
  fireEvent.blur(await screen.findByRole("spinbutton", { name: "Giá Khung gỗ sồi" }), {
    target: { value: "120000" },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("price write failed");
  expect(screen.getByText(/99\.000/)).toBeInTheDocument();
  await user.click(screen.getByRole("switch", { name: "Khung gỗ sồi: đang bán" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("active write failed");
  expect(screen.getByRole("switch", { name: "Khung gỗ sồi: đang bán" })).toBeChecked();
});

it("rejects an invalid thumbnail before upload", async () => {
  const user = userEvent.setup();
  const { AdminCatalogPage } = await import("./AdminCatalogPage");
  render(<AdminCatalogPage />);
  await screen.findByText("Khung gỗ sồi");
  await user.upload(
    screen.getByLabelText("Tải ảnh cho Khung gỗ sồi"),
    new File(["x"], "bad.gif", { type: "image/gif" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("PNG, JPEG hoặc WebP");
  expect(api.authedFetch).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run Catalog tests and verify RED**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminCatalogPage.test.tsx
```

Expected: fail because the page lacks named panels/tables, item-specific field names, and shared feedback.

- [ ] **Step 3: Implement Catalog presentation**

- Import `AdminDataPanel`, `AdminFeedbackBanner`, and `TableCaption`.
- Keep all request helpers, endpoints, methods, payloads, validation, optimistic updates, and rollback code unchanged.
- Render `AdminFeedbackBanner` with retry and dismissal for `error`.
- Render each active tab inside `AdminDataPanel title={"Catalog " + TAB_LABELS[type]}`.
- Add `TableCaption`, `scope="col"`, right-aligned price cells, and monospace item IDs.
- Add `aria-label={`Tải ảnh cho ${item.label}`}` to the hidden file input, `aria-label={`Đổi ảnh ${item.label}`}` to its trigger, and `aria-label={`Giá ${item.label}`}` to the number input.
- Use `role="status"` for initial loading and `motion-reduce:animate-none` on modified spinners.

- [ ] **Step 4: Verify and commit Catalog**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminCatalogPage.test.tsx
npm.cmd run typecheck
.\node_modules\.bin\biome.cmd lint src/app/pages/AdminCatalogPage.tsx src/app/pages/AdminCatalogPage.test.tsx
git add -- src/app/pages/AdminCatalogPage.tsx src/app/pages/AdminCatalogPage.test.tsx
git commit -m "feat(admin): align catalog operations workspace"
```

### Task 2: Migrate Email History

**Files:**
- Create: `src/app/pages/AdminEmailHistoryPage.test.tsx`
- Modify: `src/app/pages/AdminEmailHistoryPage.tsx`

**Interfaces:**
- Consumes `adminListEmailEvents({ page, limit })`, `AdminDataPanel`, `AdminFeedbackBanner`, `AdminPagination`, and `AdminStatusBadge`.
- Produces a named email-event table while preserving `limit: 30` and server-owned pagination.

- [ ] **Step 1: Write failing Email History tests**

Create auth/service mocks and cover:

```tsx
it("loads page one and exposes a named email-event table", async () => {
  await renderPage();
  await waitFor(() => expect(service.adminListEmailEvents).toHaveBeenCalledWith({ page: 1, limit: 30 }));
  expect(screen.getByRole("region", { name: "Email đã xử lý" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Lịch sử email" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Người nhận" })).toHaveAttribute("scope", "col");
  expect(screen.getByRole("navigation", { name: "Phân trang email" })).toBeInTheDocument();
});

it("keeps stale rows after refresh failure and retries the active page", async () => {
  const user = userEvent.setup();
  service.adminListEmailEvents
    .mockResolvedValueOnce(emailResponse)
    .mockRejectedValueOnce(new Error("email history unavailable"))
    .mockResolvedValueOnce(emailResponse);
  await renderPage();
  expect(await screen.findByText("member@example.test")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Tải lại" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("email history unavailable");
  expect(screen.getByText("member@example.test")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Thử lại" }));
  await waitFor(() => expect(service.adminListEmailEvents).toHaveBeenLastCalledWith({ page: 1, limit: 30 }));
});
```

- [ ] **Step 2: Run Email History tests and verify RED**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminEmailHistoryPage.test.tsx
```

- [ ] **Step 3: Implement the shared data workspace**

- Replace `adminSurface` and the native table with `AdminDataPanel` and existing `Table` primitives.
- Add `TableCaption className="sr-only">Lịch sử email</TableCaption>` and scoped headers.
- Use `loading && items.length === 0` for skeletons; keep existing rows visible on refresh and failure.
- Render `AdminFeedbackBanner` outside the panel with retry for the active page.
- Preserve `EMAIL_STATUS_LABELS`, `EMAIL_STATUS_TONES`, endpoint, page, total, totalPages, and `limit: 30`.
- Replace bespoke controls with `AdminPagination itemLabel="email" onPageChange={(next) => void load(next)}`.

- [ ] **Step 4: Verify and commit Email History**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminEmailHistoryPage.test.tsx
npm.cmd run typecheck
.\node_modules\.bin\biome.cmd lint src/app/pages/AdminEmailHistoryPage.tsx src/app/pages/AdminEmailHistoryPage.test.tsx
git add -- src/app/pages/AdminEmailHistoryPage.tsx src/app/pages/AdminEmailHistoryPage.test.tsx
git commit -m "feat(admin): align email history workspace"
```

### Task 3: Migrate Read-Only System Settings

**Files:**
- Create: `src/app/pages/AdminSettingsPage.test.tsx`
- Modify: `src/app/pages/AdminSettingsPage.tsx`

**Interfaces:**
- Consumes `adminGetOverview`, current safe frontend env reads, `AdminDataPanel`, `AdminFeedbackBanner`, and `AdminStatusBadge`.
- Produces a read-only four-panel system status page; no setting mutation is introduced.

- [ ] **Step 1: Write failing Settings tests**

Create auth/service mocks with an overview fixture and cover:

```tsx
it("renders named read-only system panels with explicit status text", async () => {
  renderPage();
  expect(await screen.findByRole("region", { name: "Email Provider" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Payment Provider" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Thông tin ứng dụng" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Nhắc hạn tự động" })).toBeInTheDocument();
  expect(screen.getByText("Đã cấu hình")).toBeInTheDocument();
  expect(screen.queryByText(/cron đang chạy/i)).not.toBeInTheDocument();
});

it("keeps loaded status visible after refresh failure", async () => {
  const user = userEvent.setup();
  service.adminGetOverview.mockResolvedValueOnce(overview).mockRejectedValueOnce(new Error("overview offline"));
  renderPage();
  expect(await screen.findByText("resend")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Tải lại" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("overview offline");
  expect(screen.getByText("resend")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run Settings tests and verify RED**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminSettingsPage.test.tsx
```

- [ ] **Step 3: Implement named status panels**

- Change local `InfoRow.value` from `string` to `ReactNode`; keep its label/value relationship and allow long values to wrap.
- Replace each `adminSurface.card` with `AdminDataPanel` using the existing section title.
- Replace emoji status strings with explicit badges:

```tsx
<InfoRow
  label="Trạng thái"
  value={
    <AdminStatusBadge tone={emailStatus.configured ? "completed" : "failed"}>
      {emailStatus.configured ? "Đã cấu hình" : "Chưa cấu hình"}
    </AdminStatusBadge>
  }
/>
```

- Add `AdminFeedbackBanner` with retry; never clear `emailStatus` or `generatedAt` before refresh.
- Keep `adminGetOverview`, timeout, all safe env reads, and the factual manual-reminder copy unchanged.
- Keep the page read-only; do not add provider or secret controls.

- [ ] **Step 4: Verify and commit Settings**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminSettingsPage.test.tsx
npm.cmd run typecheck
.\node_modules\.bin\biome.cmd lint src/app/pages/AdminSettingsPage.tsx src/app/pages/AdminSettingsPage.test.tsx
git add -- src/app/pages/AdminSettingsPage.tsx src/app/pages/AdminSettingsPage.test.tsx
git commit -m "feat(admin): align system settings status"
```

### Task 4: Migrate Audit Logs

**Files:**
- Create: `src/app/pages/AdminAuditLogsPage.test.tsx`
- Modify: `src/app/pages/AdminAuditLogsPage.tsx`

**Interfaces:**
- Consumes `adminListAuditLogs`, `AdminToolbar`, `AdminDataPanel`, `AdminFeedbackBanner`, `AdminPagination`, and `AdminStatusBadge`.
- Produces labelled filters and safe payload disclosure without changing request parameters.

- [ ] **Step 1: Write failing Audit Log tests**

Create service mocks with two pages and a payload-bearing row. Cover:

```tsx
it("loads existing filter parameters and exposes toolbar/table semantics", async () => {
  await renderPage();
  await waitFor(() => expect(service.adminListAuditLogs).toHaveBeenCalledWith({
    page: 1,
    action: undefined,
    actorUid: undefined,
    limit: 30,
  }));
  expect(screen.getByRole("region", { name: "Bộ lọc audit logs" })).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Lọc theo action" })).toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "Lọc theo actor UID" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Danh sách audit logs" })).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Phân trang audit logs" })).toBeInTheDocument();
});

it("resets page on filters and exposes payload disclosure state", async () => {
  const user = userEvent.setup();
  await renderPage();
  await user.click(await screen.findByRole("button", { name: "Trang sau" }));
  await waitFor(() => expect(service.adminListAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  fireEvent.change(screen.getByRole("searchbox", { name: "Lọc theo action" }), {
    target: { value: "admin.user.role" },
  });
  await waitFor(() => expect(service.adminListAuditLogs).toHaveBeenLastCalledWith(
    expect.objectContaining({ action: "admin.user.role", page: 1 }),
  ));
  const toggle = screen.getByRole("button", { name: "Xem payload admin.user.role" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  await user.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText(/"role": "admin"/)).toBeInTheDocument();
});
```

Add a refresh failure case that verifies the previous action row remains visible and the retry request retains current filters/page.

- [ ] **Step 2: Run Audit Log tests and verify RED**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminAuditLogsPage.test.tsx
```

- [ ] **Step 3: Implement the labelled audit workspace**

- Remove bespoke Chevron pagination imports.
- Wrap both inputs in `AdminToolbar label="Bộ lọc audit logs"`; set `type="search"`, explicit `aria-label`, `autoComplete="off"`, and decorative search icons `aria-hidden="true"`.
- Preserve immediate filter requests and reset them to page 1.
- Update `PayloadPreview` to accept `action`, call `useId()`, and render:

```tsx
<button
  type="button"
  aria-expanded={expanded}
  aria-controls={contentId}
  aria-label={`${expanded ? "Ẩn" : "Xem"} payload ${action}`}
  onClick={() => setExpanded((current) => !current)}
>
  {expanded ? "Thu gọn" : preview}
</button>
{expanded ? <pre id={contentId}>{JSON.stringify(payload, null, 2)}</pre> : null}
```

- Use `AdminDataPanel`, `Table`, `TableCaption`, scoped headers, monospace identifiers, and `AdminStatusBadge` text `Thành công` / `Thất bại`.
- Use `loading && items.length === 0` for skeletons and retain prior rows during refresh/failure.
- Add `AdminFeedbackBanner` retry and `AdminPagination itemLabel="audit logs" onPageChange={handlePageChange}`.
- Preserve `limit: 30`, action/actor params, timeout, payload JSON escaping, and total-page calculation.

- [ ] **Step 4: Verify and commit Audit Logs**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminAuditLogsPage.test.tsx
npm.cmd run typecheck
.\node_modules\.bin\biome.cmd lint src/app/pages/AdminAuditLogsPage.tsx src/app/pages/AdminAuditLogsPage.test.tsx
git add -- src/app/pages/AdminAuditLogsPage.tsx src/app/pages/AdminAuditLogsPage.test.tsx
git commit -m "feat(admin): align audit log workspace"
```

### Task 5: Migrate Admin Order Detail

**Files:**
- Modify: `src/app/pages/AdminOrderDetailPage.test.tsx`
- Modify: `src/app/pages/AdminOrderDetailPage.tsx`

**Interfaces:**
- Consumes existing order-detail request generation and classification logic.
- Produces named detail panels and accessible line-item data without changing any command.

- [ ] **Step 1: Extend Order Detail tests first**

Add a populated line fixture and these cases:

```tsx
it("renders labelled detail panels and an accessible line-item table", async () => {
  orders.adminGetOrder.mockResolvedValue({
    ...order,
    lines: [{
      itemId: "frame-oak",
      type: "frame",
      label: "Khung gỗ sồi",
      qty: 1,
      unitPriceVnd: 99000,
      lineTotalVnd: 99000,
    }],
  });
  const { AdminOrderDetailPage } = await import("./AdminOrderDetailPage");
  renderPage(AdminOrderDetailPage);
  expect(await screen.findByRole("region", { name: "Khách hàng" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Sản phẩm trong đơn" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Sản phẩm trong đơn" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Thành tiền" })).toHaveAttribute("scope", "col");
});

it("shows a labelled retry state when the detail request fails", async () => {
  orders.adminGetOrder.mockRejectedValueOnce(new Error("order detail offline"));
  const { AdminOrderDetailPage } = await import("./AdminOrderDetailPage");
  renderPage(AdminOrderDetailPage);
  expect(await screen.findByRole("alert")).toHaveTextContent("order detail offline");
  expect(screen.getByRole("link", { name: "Quay lại danh sách" })).toHaveAttribute("href", "/admin/orders");
});
```

- [ ] **Step 2: Run Order Detail tests and verify RED**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminOrderDetailPage.test.tsx
```

- [ ] **Step 3: Implement named detail panels**

- Import `AdminDataPanel`, `AdminFeedbackBanner`, and table primitives.
- Keep the back link and `AdminPageHeader` metadata/action.
- Replace each titled `adminSurface.card` with `AdminDataPanel`: customer, shipping, notes, goal snapshot, line items, pricing, timeline, and system metadata.
- Give the line-item table `TableCaption className="sr-only">Sản phẩm trong đơn</TableCaption>` and scoped headers; keep quantities and VND values right-aligned and tabular.
- Use neutral text badges for frame/theme/sticker rather than independent decorative palettes.
- Replace the loading return with `role="status"` and a reduced-motion spinner.
- Replace the custom error card with `AdminFeedbackBanner` and retry.
- Do not edit classification state, refs, payload construction, error-code branches, or dialog props.

- [ ] **Step 4: Verify and commit Order Detail**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminOrderDetailPage.test.tsx
npm.cmd run typecheck
.\node_modules\.bin\biome.cmd lint src/app/pages/AdminOrderDetailPage.tsx src/app/pages/AdminOrderDetailPage.test.tsx
git add -- src/app/pages/AdminOrderDetailPage.tsx src/app/pages/AdminOrderDetailPage.test.tsx
git commit -m "feat(admin): align order detail workspace"
```

### Task 6: Migrate Admin User Detail

**Files:**
- Modify: `src/app/pages/AdminUserDetailPage.dialog.test.tsx`
- Modify: `src/app/pages/AdminUserDetailPage.tsx`

**Interfaces:**
- Consumes existing role, subscription, and classification APIs and route-race protections.
- Produces named detail panels, accessible history tables, and recoverable role/subscription feedback.

- [ ] **Step 1: Extend User Detail tests first**

Add these cases without changing existing role/classification coverage:

```tsx
it("renders named user panels and accessible history tables", async () => {
  const detail = makeUserDetail("user");
  detail.paymentOrders = [{
    orderId: "pay-1",
    planCode: "PLUS",
    amount: 99000,
    status: "completed",
    createdAt: detail.user.createdAt,
  }];
  detail.physicalOrders = [{
    id: "physical-1",
    status: "pending",
    totalVnd: 149000,
    fullName: "User 1",
    createdAt: detail.user.createdAt,
  }];
  adminServiceMock.adminGetUserDetail.mockResolvedValueOnce(detail);
  await renderPage();
  expect(await screen.findByRole("region", { name: "Thông tin cá nhân" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Gói dịch vụ" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Lịch sử thanh toán" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Đơn hàng vật lý" })).toBeInTheDocument();
});

it("keeps role failure visible inside the confirmation dialog", async () => {
  const user = userEvent.setup();
  adminServiceMock.adminUpdateUserRole.mockRejectedValueOnce(new Error("role update failed"));
  await renderPage();
  await user.click(await screen.findByRole("button", { name: /Cấp quyền Admin/ }));
  const dialog = await screen.findByRole("alertdialog", { name: "Cấp quyền Admin?" });
  await user.click(within(dialog).getByRole("button", { name: "Cấp quyền Admin" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("role update failed");
  expect(dialog).toBeInTheDocument();
});

it("keeps subscription failure persistent after the existing dialog closes", async () => {
  const user = userEvent.setup();
  adminServiceMock.adminUpdateUserSubscription.mockRejectedValueOnce(new Error("subscription update failed"));
  await renderPage();
  await user.click(await screen.findByRole("button", { name: "Nâng lên gói Plus" }));
  const dialog = await screen.findByRole("alertdialog", { name: "Nâng lên gói Plus?" });
  await user.click(within(dialog).getByRole("button", { name: "Nâng lên Plus" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("subscription update failed");
});
```

- [ ] **Step 2: Run User Detail tests and verify RED**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminUserDetailPage.dialog.test.tsx
```

- [ ] **Step 3: Implement User Detail presentation and feedback**

Add state:

```tsx
const [roleError, setRoleError] = useState<string | null>(null);
const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
```

- Clear `roleError` when opening or closing a role command; set it in the existing role catch and render `AdminFeedbackBanner` inside `AlertDialogContent`.
- Clear `subscriptionError` in `openSubConfirm`; preserve the existing `setSubConfirmOpen(false)` before the request; set `subscriptionError` in the catch and render its persistent banner below `AdminPageHeader`.
- Keep success toasts and every API payload unchanged.
- Always render `AdminOperationalClassificationBadge`, including default real classification.
- Replace titled cards with `AdminDataPanel`: identity, subscription, goals, payment history, and physical orders.
- Replace goal/payment/order status spans with `AdminStatusBadge` text.
- Replace both history tables with `Table`, `TableCaption`, scoped headers, right-aligned amounts, and monospace IDs.
- Keep role/subscription/classification dialog copy, request refs, and latest-route-wins behavior unchanged.

- [ ] **Step 4: Verify and commit User Detail**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminUserDetailPage.dialog.test.tsx
npm.cmd run typecheck
.\node_modules\.bin\biome.cmd lint src/app/pages/AdminUserDetailPage.tsx src/app/pages/AdminUserDetailPage.dialog.test.tsx
git add -- src/app/pages/AdminUserDetailPage.tsx src/app/pages/AdminUserDetailPage.dialog.test.tsx
git commit -m "feat(admin): align user detail workspace"
```

### Task 7: Verify The Complete Phase 3 Surface

**Files:**
- Verify all Phase 3 implementation files.
- Modify this plan only after evidence is available.

**Interfaces:**
- Consumes Tasks 1-6.
- Produces the Phase 3 quality gate before Phase 4 begins.

- [ ] **Step 1: Run the focused Phase 3 UI set**

```powershell
npm.cmd run test:ui -- src/app/pages/AdminCatalogPage.test.tsx src/app/pages/AdminEmailHistoryPage.test.tsx src/app/pages/AdminSettingsPage.test.tsx src/app/pages/AdminAuditLogsPage.test.tsx src/app/pages/AdminOrderDetailPage.test.tsx src/app/pages/AdminUserDetailPage.dialog.test.tsx
```

Expected: zero failures. Record exact file and test counts.

- [ ] **Step 2: Run final gates once code is stable**

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
npm.cmd run test:ui -- src/app/routes.test.tsx
```

Expected: every command exits `0`. Record Biome checked-file count, broad test counts, transformed module count, build duration, and route test count. Do not run autofix or snapshot updates.

- [ ] **Step 3: Run scope and diff checks**

```powershell
git -c core.pager=cat diff --check origin/main...HEAD
git -c core.pager=cat diff --check f9ab73cd^ HEAD
git -c core.pager=cat status --short
git -c core.pager=cat diff --name-only f9ab73cd^ HEAD
git -c core.pager=cat log --oneline f9ab73cd^..HEAD
```

Expected: no whitespace errors; no backend, service-contract, package, lockfile, auth, billing, storage, or sync changes; only the approved six pages/tests and Phase 3 documentation differ from the Phase 3 base.

- [ ] **Step 4: Perform authenticated manual QA when a reusable session exists**

Verify `/admin/catalog`, `/admin/email-history`, `/admin/settings`, `/admin/audit-logs`, `/admin/orders/:id`, and `/admin/users/:uid` at approximately 1440px, 1024px, and 390px in light and dark themes. Check tabs, filters, pagination, loading, stale-data errors, retry, optimistic rollback, image validation, payload disclosure, back links, tables, dialogs, duplicate-submit protection, route races, keyboard focus, and reduced motion.

If no authenticated Firebase admin session or reusable storage state exists, record that exact blocker and do not claim manual visual QA passed.

- [ ] **Step 5: Append and commit the execution record**

Append `Execution Record — 2026-07-14` with actual implementation commits and factual evidence for every gate, including known non-failing warnings and the manual-QA result or blocker.

```powershell
git add -- docs/superpowers/plans/2026-07-14-admin-ui-system-phase-3.md
git commit -m "docs(admin): record phase 3 verification"
```

Do not create an empty documentation commit. Do not start Phase 4 until this record is committed and the worktree is clean.

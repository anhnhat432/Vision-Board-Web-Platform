# Admin UI Redesign — Dark Dashboard Pro

**Ngày:** 2026-05-23
**Phạm vi:** UI/UX trang `/admin/*` (web). Không đổi backend, business logic, storage, auth.
**Mục tiêu:** Redesign sâu khu vực admin theo phong cách dashboard pro (sidebar trái + topbar nhỏ, theme dark slate-950 thống nhất), tách các page con để mỗi route tập trung một nhiệm vụ.

## 1. Bối cảnh

Hiện trạng admin có 3 vấn đề chính:

1. **Theme mâu thuẫn:** `AdminLayout` dùng dark slate-950 nhưng `AdminOrdersPage` và `AdminCatalogPage` dùng light (slate-50/white). Khi điều hướng giữa header và content, thị giác bị gãy.
2. **Navigation yếu:** chỉ có 2 button text trong header (`Vận hành`, `Catalog`), bị `hidden sm:inline-flex` trên mobile. Không có breadcrumb, không có active state rõ ràng.
3. **`AdminOrdersPage` dài >1260 dòng:** gom 4 việc (overview, đơn in, thanh toán tự động, hoàn tiền) trong một route. Khó scan, khó maintain, khó test.
4. **`AdminCatalogPage` thô:** dùng `<table>` HTML thuần, không có filter/search/stat, trái nhịp với phần còn lại.

## 2. Mục tiêu thiết kế

- Theme dark slate-950 thống nhất ở mọi trang admin.
- Navigation chính dùng sidebar trái 240px + topbar 56px.
- Tách `AdminOrdersPage` thành 4 trang con: Dashboard (tổng quan), Orders (đơn in), Payments (thanh toán tự động), Refunds (hoàn tiền).
- `AdminCatalogPage` dùng `Table` component dark, tabs giữ nguyên, thêm hover/sticky.
- Không thay đổi state logic, không thêm dependency, không động vào backend hay flow nghiệp vụ.

## 3. Cấu trúc file

```
src/app/components/admin/
  AdminLayout.tsx              ← refactor: sidebar + topbar + outlet, status cards dark
  AdminSidebar.tsx             ← MỚI: brand + nav items + user footer
  AdminTopbar.tsx              ← MỚI: breadcrumb slot + (mobile) burger mở Sheet
  AdminPageHeader.tsx          ← MỚI: title + description + actions chuẩn
  AdminStatCard.tsx            ← MỚI: thay SummaryCard inline (dark)
  AdminStatusBadge.tsx         ← MỚI: badge cho order/payment/refund (dark)
  AdminEmptyState.tsx          ← MỚI: empty placeholder dark dùng chung

src/app/pages/
  AdminDashboardPage.tsx       ← MỚI: stat cards, banner nhắc hạn, 2 list ngắn, preview 5 đơn mới
  AdminOrdersPage.tsx          ← refactor: chỉ list đơn in + filters + status chips
  AdminPaymentsPage.tsx        ← MỚI: tách "Thanh toán tự động" thành route riêng
  AdminRefundsPage.tsx         ← MỚI: tách "Hoàn tiền" thành route riêng
  AdminCatalogPage.tsx         ← refactor: dùng Table component, Switch thay button toggle
```

## 4. Routing

`/admin` redirect → `/admin/dashboard`.

| Route               | Component                | Vai trò                                      |
|---------------------|--------------------------|----------------------------------------------|
| `/admin/dashboard`  | `AdminDashboardPage`     | Tổng quan: stat cards, reminder, 2 list ngắn |
| `/admin/orders`     | `AdminOrdersPage`        | Quản lý đơn in vision board                  |
| `/admin/payments`   | `AdminPaymentsPage`      | Đối chiếu thanh toán tự động                 |
| `/admin/refunds`    | `AdminRefundsPage`       | Duyệt yêu cầu hoàn tiền                      |
| `/admin/catalog`    | `AdminCatalogPage`       | Quản lý catalog đơn kit                      |

## 5. AdminLayout

- Container: `min-h-screen bg-slate-950 text-slate-100`.
- Sidebar `w-60` (240px), `lg:` trở lên hiển thị cố định; mobile ẩn, mở qua `Sheet` (đã có `src/app/components/ui/sheet.tsx`).
- Topbar `h-14` (56px), sticky top-0, `bg-slate-950/92 backdrop-blur border-b border-white/10`.
- Outlet: `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6`.
- Toàn bộ guard hiện có (`authLoading`, `isConfigured`, `userProfile.role !== "admin"`...) giữ nguyên, chỉ cập nhật `AdminStatusCard` để dùng tokens chung.

### AdminSidebar

```
┌──────────────────┐
│  ◆ Admin         │   brand row
│  email@…         │
├──────────────────┤
│  • Dashboard     │   nav items, active = bg-white/10 text-white
│  • Đơn hàng      │   idle = text-slate-400 hover:bg-white/5
│  • Thanh toán    │
│  • Hoàn tiền     │
│  • Catalog       │
├──────────────────┤
│  [Đăng xuất]     │   footer pinned bottom
└──────────────────┘
```

- Item shape: `{ to, label, icon, badge? }`. Badge dùng số lượng pending (refunds chờ, đơn pending) khi có dữ liệu, ẩn khi 0.
- Active state suy từ `useLocation()`, match prefix.

### AdminTopbar

- Trái: breadcrumb đơn cấp (ví dụ `Admin / Đơn hàng`). Trên mobile: nút burger mở sidebar Sheet, ẩn breadcrumb.
- Phải: search input (placeholder `Tìm đơn, email...`) — phần thực sự thực thi search sẽ ở từng page; topbar chỉ là entry point cho future, lần này stub UI nhưng wire để focus vào input ở page hiện tại nếu có.
- Lưu ý: nếu wire search là chưa khả thi gọn, để là input disabled với tooltip `Sắp tới` — không phá vỡ thẩm mỹ.

## 6. AdminDashboardPage

- Page header: `Tổng quan vận hành` + mô tả ngắn.
- Stat grid 4 cột (`xl:grid-cols-4 sm:grid-cols-2`): Tổng user, Plus đang dùng, Doanh thu, Đơn thanh toán. Dùng `AdminStatCard`.
- Reminder banner: gửi email nhắc hạn 7 ngày. Style dark `bg-cyan-500/10 border-cyan-500/30`.
- 2 cột (lg): "Thanh toán gần đây" và "User mới" (dùng data sẵn từ `adminGetOverview`).
- Preview "Đơn in mới nhất" 5 dòng + nút `Xem tất cả →` link tới `/admin/orders`.

`AdminStatCard`:
```
bg-white/[0.03] border border-white/10 rounded-[var(--r-card)]
icon wrapper: size 10 bg-cyan-500/10 text-cyan-300 rounded-[var(--r-tile)]
label: text-sm text-slate-400
value: text-2xl font-bold text-white
detail: text-xs text-slate-500
hover: bg-white/[0.05]
```

## 7. AdminOrdersPage

- Page header: `Đơn in vision board · {count} đơn · {pending} chờ xác nhận`. Action: `Tải lại`.
- Filter row: search input (email/mã đơn), select status, select khung. Status filter là client-side trên `orders` đã load.
- Status chips: `Tất cả N · Chờ N · Xác nhận N · …` — bấm filter nhanh.
- List order card (giữ logic hiện tại):
  - `bg-white/[0.03] border-white/10`
  - Header text white, meta text-slate-400
  - Note box: `bg-white/5 border-white/10`
  - Status badge: dùng `AdminStatusBadge`
  - Actions giữ hành vi `OrderActions` cũ (transition + cancel)

### AdminStatusBadge mapping (dark)

| Status     | Class                                                    |
|------------|----------------------------------------------------------|
| pending    | `bg-amber-500/15 text-amber-200 border-amber-500/30`     |
| confirmed  | `bg-sky-500/15 text-sky-200 border-sky-500/30`           |
| printing   | `bg-violet-500/15 text-violet-200 border-violet-500/30`  |
| shipping   | `bg-blue-500/15 text-blue-200 border-blue-500/30`        |
| delivered  | `bg-emerald-500/15 text-emerald-200 border-emerald-500/30` |
| cancelled  | `bg-rose-500/15 text-rose-200 border-rose-500/30`        |

Mapping cho payment status và refund status dùng cùng palette (pending=amber, completed=emerald, expired/rejected=slate/rose, failed=rose).

## 8. AdminPaymentsPage

- Page header + action `Tải lại`.
- Filters: search query, select status, status pills.
- Bảng dùng `Table` component (`src/app/components/ui/table.tsx`) với header sticky, row hover `bg-white/5`.
- Cột: Mã đơn (mono), Email, Số tiền (formatVnd), Status (badge), Tạo lúc (formatDate), Hành động (`Mở Plus thủ công` mở `AlertDialog` cũ).
- Logic `loadPaymentOrders`, `confirmManualCompletePayment`, `pendingManualPaymentOrderId`, `manualPaymentNote` giữ nguyên — chỉ chuyển từ JSX cũ sang JSX mới.

## 9. AdminRefundsPage

- Page header: `Hoàn tiền · {pendingCount} đang chờ`. Action `Tải lại`.
- List card thay vì bảng (vì mỗi item có nhiều text dài: lý do, tài khoản nhận, ghi chú).
- Card dark:
  - Top row: mã đơn (mono) + status badge.
  - Meta: email · createdAt.
  - Box `Lý do user`: `bg-white/5 border-white/10`.
  - Box `Tài khoản nhận hoàn tiền`: `bg-amber-500/10 border-amber-500/30 text-amber-100` (giữ độ nổi bật cũ).
  - Footer actions: `[Đã hoàn tiền]` (primary), `[Từ chối]` (outline destructive).
- Logic `loadRefundRequests`, `confirmResolveRefundRequest`, `pendingRefundAction` giữ nguyên.

## 10. AdminCatalogPage

- Page header: `Catalog đơn kit` + mô tả.
- Tabs giữ 3 tab `frame / theme / sticker` (Tabs component sẵn có).
- Mỗi tab: dùng `Table` component dark thay cho `<table>` thuần.
- Cột: Ảnh (48×48 + nút Đổi ảnh), Item ID (mono nhỏ), Tên, Giá (input + format), Trạng thái (`Switch` Bật/Ẩn).
- Logic: `updatePrice`, `toggleActive`, `uploadThumbnail`, `ALLOWED_THUMBNAIL_MIMES`, `MAX_THUMBNAIL_BYTES`, optimistic UI giữ nguyên 100%.
- Switch thay button text: dễ nhìn, tránh nhầm "Đang bán" là button.
- Error banner dark: `bg-rose-500/10 text-rose-200 border-rose-500/30`.

## 11. Design tokens dùng chung (dark)

```ts
// đặt trong src/app/components/admin/tokens.ts
export const adminSurface = {
  card: "bg-white/[0.03] border border-white/10 rounded-[var(--r-card)]",
  cardHover: "hover:bg-white/[0.05] transition-colors",
  muted: "bg-white/5 border border-white/10 rounded-[var(--r-control)]",
  divider: "border-white/10",
};

export const adminText = {
  hi: "text-white",
  body: "text-slate-200",
  muted: "text-slate-400",
  dim: "text-slate-500",
};

export const adminInput =
  "bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/40";
```

Tận dụng các CSS var có sẵn (`--r-card`, `--r-tile`, `--r-pill`, `--r-control`, `--space-inline`).

## 12. Trách nhiệm và biên giới

- **AdminLayout**: routing guard, render sidebar + topbar + outlet. Không biết gì về data của page con.
- **AdminSidebar**: nav items, active state, badge count nếu có. Nhận `pendingCounts` qua prop hoặc context (lần này hard-code list, badge để pha sau).
- **AdminTopbar**: breadcrumb từ route, mobile burger. Search là stub UI lần này.
- **AdminDashboardPage**: gọi `adminGetOverview`, hiển thị tóm tắt. Không quản lý mutation.
- **AdminOrdersPage**: gọi `adminGetOrders`, transition status. Không quản lý payment/refund.
- **AdminPaymentsPage**: gọi `adminListPaymentOrders`, `adminCompletePaymentOrderManually`. Không động đến đơn in.
- **AdminRefundsPage**: gọi `adminListRefundRequests`, `adminCompleteRefundRequest`, `adminRejectRefundRequest`.
- **AdminCatalogPage**: gọi catalog endpoints, update giá/ảnh/trạng thái.
- **AdminStatusBadge / AdminStatCard / AdminPageHeader / AdminEmptyState**: pure presentational.

## 13. Edge cases & error handling

- Loading: thay vì plain text, dùng skeleton dark ngắn (4 stat cards skeleton + 1 list skeleton).
- Empty: dùng `AdminEmptyState` với icon Lucide + text + (optional) action.
- Error tải data: banner dark `bg-rose-500/10 text-rose-200 border-rose-500/30` với nút `Thử lại`.
- Mobile (<lg): sidebar ẩn, topbar có burger; bảng `Table` overflow-x-auto, card list giữ stack.
- Mất internet/Render cold start: timeout 18s như cũ, hiển thị error banner.

## 14. Verification

- `npm run typecheck`
- `npm run lint`
- `npm run test:run` — `AdminOrdersPage.dialogs.test.tsx` cần xanh; nếu test bám vào class light cụ thể, cập nhật selector. Không đổi hành vi dialog.
- `npm run build`
- QA tay với Playwright MCP: chụp `/admin/dashboard`, `/admin/orders`, `/admin/payments`, `/admin/refunds`, `/admin/catalog` ở 1280×800 và 375×812.

## 15. Phạm vi không làm

- Không thay đổi backend, route auth, billing, entitlement, storage.
- Không thêm dependency.
- Không sửa flow nghiệp vụ (status transitions, refund actions, catalog API).
- Search topbar lần này stub UI, không wire thực sự.
- Không có dark mode toggle: admin luôn dark.

## 16. Risks

- Test `AdminOrdersPage.dialogs.test.tsx` có thể fail nếu test selector dựa vào class light → cần đọc và cập nhật selector.
- Việc tách 1 page thành 4 page yêu cầu update router config (nơi register `/admin` routes). Đây là điểm dễ miss → cần liệt kê rõ trong plan.
- Một số state trong `AdminOrdersPage` hiện tại được share giữa overview/orders/payments/refunds (ví dụ `loadAdminData` gọi cả overview + orders). Khi tách trang, mỗi page tự load phần của mình — cần đảm bảo không gây gọi API thừa khi user duyệt qua nhiều trang.

# Kế Hoạch Nâng Cấp Trang Admin

**Ngày:** 2026-06-21
**Trạng thái:** Đã duyệt, sẵn sàng triển khai

## Tổng Quan

Bốn yêu cầu từ người dùng:

1. **Nâng gói bằng tay** - Admin có thể nâng/hạ gói subscription cho user
2. **Thông tin giao hàng** - Hiển thị địa chỉ giao hàng trong danh sách đơn
3. **Chỉnh sửa đơn hàng** - Admin sửa được thông tin đơn hàng
4. **Set ảnh** - Hiển thị danh sách theme ảnh đã chọn (không chỉ đếm số)

## Chi Tiết Từng Bước

### 1. Backend: API Nâng/Hạ Gói

- **File:** `backend/src/controllers/adminController.ts`
- **Hàm mới:** `updateAdminUserSubscription`
- **Route:** `PATCH /admin/users/:uid/subscription`
- **File route:** `backend/src/routes/adminRoutes.ts`
- **Payload:** `{ planCode: "PLUS" | "FREE", billingCycle?: string }`
- **Logic:** PLUS → gọi `billingService.upsertSubscriptionFromProviderEvent({ provider: "manual" })`; FREE → huỷ subscription hiện tại
- **Audit:** Dùng `auditedAdminAction` wrapper

### 2. Frontend Service: adminUpdateUserSubscription

- **File:** `src/services/adminService.ts`
- **Thêm:** interface `AdminUpdateSubscriptionPayload`, hàm `adminUpdateUserSubscription`

### 3. Frontend UI: Nút Nâng/Hạ Gói

- **File:** `src/app/pages/AdminUserDetailPage.tsx`
- **Vị trí:** Trong Subscription Card (dòng ~146)
- **UI:** Nút "Nâng lên Plus" (accent) hoặc "Hạ về Free" (muted + AlertDialog confirm)

### 4. Hiển Thị Địa Chỉ Giao Hàng

- **File:** `src/app/pages/AdminOrdersPage.tsx`
- **Vị trí:** Trong grid thông tin đơn hàng (dòng ~326)
- **Thay đổi:** Thêm dòng `Địa chỉ: {shippingAddress.line1}, {shippingAddress.city}`

### 5. Backend: API Sửa Đơn Hàng

- **File:** `backend/src/controllers/orderController.ts`
- **Hàm mới:** `adminUpdateOrder`
- **Route:** `PATCH /admin/orders/:id`
- **File route:** `backend/src/routes/orderRoutes.ts`
- **Payload:** `{ fullName?, email?, phone?, shippingAddress?, note?, adminNote? }`
- **Giới hạn:** Không sửa lines, totalVnd, discount (ảnh hưởng tiền bạc)

### 6. Frontend Service: adminUpdateOrder

- **File:** `src/services/orderService.ts`
- **Thêm:** interface `AdminUpdateOrderPayload`, hàm `adminUpdateOrder`

### 7. Frontend UI: Dialog Chỉnh Sửa Đơn Hàng

- **File:** `src/app/pages/AdminOrdersPage.tsx`
- **UI:** Nút "Sửa" (icon Pencil) → Dialog với form các trường được phép sửa
- **Components:** Dùng Radix `Dialog` hoặc `AlertDialog`

### 8. Hiển Thị Danh Sách Theme Ảnh

- **File:** `src/app/pages/AdminOrdersPage.tsx`
- **Vị trí:** Dòng ~337, thay `Số set ảnh: {themeCount}` bằng danh sách tên theme

### 9. Verify

```bash
npm run typecheck && npm run lint && npm run build
npm --prefix backend run typecheck && npm --prefix backend run build
```

## Sơ Đồ

```
1. Nâng gói     BE → FE Service → FE UI (AdminUserDetailPage)
2. Giao hàng    FE UI only (dữ liệu đã có sẵn trong ApiOrder)
3. Sửa đơn      BE → FE Service → FE UI (Dialog trong AdminOrdersPage)
4. Set ảnh      FE UI only (dữ liệu đã có trong order.lines)
```

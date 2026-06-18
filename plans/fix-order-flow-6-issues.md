# Plan: Sửa 6 vấn đề flow đặt đơn kit

Ngày: 2026-06-18 | Mode: architect → code

---

## Tổng quan flow hiện tại

```
OrderPage → chọn khung → chọn theme → sticker → shipping → notes → [ĐẶT ĐƠN]
→ validateOrderDraft → createLocalOrder (localStorage) → createOrder (POST /orders)
→ saveOrderLink → navigate /order-status/:id
```

---

## Fix #1 🔴 — Backend fail bị nuốt im lặng

**File:** `src/features/order/pages/OrderPage.tsx`

**Hiện tại (L159-165):**

```ts
try {
  const backendOrder = await createOrder(payload);
  saveOrderLink(order.id, backendOrder.id);
} catch {
  // offline: fall through to local-only status page
}
navigate(`/order-status/${order.id}`);
```

**Sửa thành:**

```ts
let backendError: string | null = null;

try {
  const backendOrder = await createOrder(payload);
  saveOrderLink(order.id, backendOrder.id);
} catch (err: unknown) {
  // Lưu lỗi để hiển thị cho user, KHÔNG navigate ngay
  backendError = extractApiErrorMessage(err);
  // Vẫn save local order nhưng đánh dấu cần retry
}

if (backendError) {
  setSubmitError(backendError);
  // Cho user chọn: thử lại hoặc xem đơn local
} else {
  navigate(`/order-status/${order.id}`);
}
```

**Thêm helper (dùng chung với Fix #5):**

```ts
function extractApiErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Không thể kết nối máy chủ. Vui lòng thử lại.";
}
```

**State cần thêm:** `backendError` (string | null)

**UI hiển thị lỗi (dưới nút Đặt đơn, cả desktop + mobile):**

```tsx
{
  submitError && (
    <div className="mt-3 space-y-2">
      <p className="text-sm text-destructive">{submitError}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => navigate(`/order-status/${order.id}`)}
        >
          Xem đơn local
        </Button>
        <Button onClick={handleSubmit}>Thử lại</Button>
      </div>
    </div>
  );
}
```

---

## Fix #2 🔴 — Email verify bị chặn 403

**File:** `src/features/order/pages/OrderPage.tsx`

**Hiện tại:** Không kiểm tra email verification trước khi submit → backend trả 403.

**Nguyên tắc:** Chỉ check trong `isRealMode()`. Demo mode không có Firebase auth, `emailVerified` mặc định `true` để không block flow demo.

**Sửa:** Thêm check sớm trước khi gọi `createOrder`:

```ts
import { isRealMode } from "@/app/utils/app-mode";
import { useAuthContext } from "@/lib/auth/AuthContext";

// Trong component:
const { user } = useAuthContext();
const emailVerified = isRealMode() ? (user?.emailVerified ?? false) : true;

// Trong handleSubmit, trước createOrder (sau validation OK):
if (!emailVerified) {
  setSubmitError(
    "Email của bạn chưa được xác thực. Vui lòng kiểm tra hộp thư và xác thực email trước khi đặt đơn.",
  );
  setSubmitting(false);
  return;
}
```

**Lưu ý:** Sử dụng pattern `isRealMode() ? (user?.emailVerified ?? false) : true` để:

- Demo mode: luôn coi email đã verify → không block flow
- Real mode: `user?.emailVerified` từ Firebase Auth → `?? false` đảm bảo an toàn khi user chưa đăng nhập

---

## Fix #3 🟡 — Thiếu bước thanh toán

**Phân tích:** Flow hiện tại tạo đơn thẳng "pending" không qua payment. Cần tích hợp Casso/PayOS checkout.

**File:** `src/features/order/pages/OrderPage.tsx`

**Plan:**

1. Sau khi backend `createOrder` thành công → redirect đến checkout page (giống billing flow)
2. Sử dụng `startCheckoutFlow` từ `@/app/utils/production` hoặc billing provider
3. Order page cần nhận `planCode` hoặc xác định thanh toán qua kit order API

**Cần confirm với PM:** Kit order có thanh toán qua Casso/PayOS không? Hay kit order là đơn hàng vật lý (in ấn + ship), thanh toán riêng?

**Nếu kit order là đơn hàng in ấn:**

- Tạo checkout session với amount = totalVnd
- Redirect user đến trang thanh toán
- Webhook callback cập nhật trạng thái đơn

**Nếu chưa rõ requirement:** Để lại // TODO, không implement vội.

---

## Fix #4 🟡 — Thiếu dialog xác nhận trước khi đặt đơn

**File:** `src/features/order/pages/OrderPage.tsx`

**Plan:** Dùng `AlertDialog` hiện có của project từ [`alert-dialog.tsx`](src/app/components/ui/alert-dialog.tsx:1):

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";

// State:
const [showConfirmDialog, setShowConfirmDialog] = useState(false);

// Flow mới trong handleSubmit:
// 1. Validation OK
// 2. Email verified OK (nếu real mode)
// 3. → setShowConfirmDialog(true) (KHÔNG submit ngay)
// 4. User nhấn "Xác nhận đặt đơn" → gọi phần còn lại của handleSubmit
// 5. User nhấn "Xem lại" → đóng dialog

// Hàm mới: handleConfirmSubmit() chứa logic tạo order + gọi backend
// handleSubmit() chỉ validate + show dialog
```

**Nội dung dialog:**

| Thành phần  | Text                                                        |
| ----------- | ----------------------------------------------------------- |
| Title       | "Xác nhận đặt đơn"                                          |
| Description | Hiển thị tóm tắt: khung, theme, sticker, tổng tiền, địa chỉ |
| Cancel      | "Xem lại"                                                   |
| Action      | "Xác nhận đặt đơn"                                          |

---

## Fix #5 🟡 — Không có retry mechanism

**File:** `src/features/order/pages/OrderPage.tsx`

**Plan:** Đã gộp vào Fix #1 ở trên. Code retry UI đã được mô tả trong Fix #1.

**Chi tiết retry:** Khi user nhấn "Thử lại":

- Gọi lại `handleSubmit()` → flow đầy đủ (validate → confirm dialog → createOrder)
- Payload được build lại từ state hiện tại (an toàn vì state không thay đổi)
- Local order đã được tạo từ lần đầu, không tạo lại (dùng `order.id` đã có)

**Edge case:** Nếu user thay đổi draft sau khi backend fail lần đầu → retry sẽ dùng draft mới → tạo local order mới. OK vì đơn cũ vẫn tồn tại trong localStorage.

---

## Fix #6 🟢 — Shipping cost hardcoded 0

**File:** `src/features/order/lib/pricing.ts`

**Plan:** Thêm config shipping cost:

```ts
// pricing.ts
const SHIPPING_COST_VND = 0; // TODO: cấu hình sau khi có bảng giá vận chuyển

export function calcShipping(_draft: OrderDraft): number {
  return SHIPPING_COST_VND;
}
```

Backend cũng hardcode `shippingVnd = 0` trong [`orderService.ts:187`](backend/src/services/orderService.ts:187). Cần sync cả 2 nếu thay đổi.

---

## Implementation Order

| Thứ tự | Fix                                         | Files                                                                                   | Risk | Status   |
| ------ | ------------------------------------------- | --------------------------------------------------------------------------------------- | ---- | -------- |
| 1      | #1 + #5: Backend fail không bị nuốt + retry | `OrderPage.tsx`                                                                         | Thấp | ✅ Done  |
| 2      | #2: Check email verify trước submit         | `OrderPage.tsx`                                                                         | Thấp | ✅ Done  |
| 3      | #4: Dialog xác nhận trước đặt đơn           | `OrderPage.tsx`                                                                         | Thấp | ✅ Done  |
| 4      | #6: Shipping config                         | `pricing.ts` + `orderService.ts`                                                        | Thấp | ✅ Done  |
| 5      | Cập nhật test                               | `OrderPage.test.tsx`                                                                    | Thấp | ✅ Done  |
| —      | #3: Tích hợp thanh toán                     | [`OrderStatusPage.tsx:994`](src/app/pages/OrderStatusPage.tsx:994) → `/billing/confirm` | —    | ✅ Đã có |

### Ghi chú về Fix #3

Thanh toán kit order đã tích hợp sẵn trong [`OrderStatusPage`](src/app/pages/OrderStatusPage.tsx:994):

- Khi đơn ở trạng thái `pending`, hiển thị card "Thanh toán đơn kit" với link đến [`/billing/confirm`](src/app/pages/BillingConfirm.tsx:25)
- Dùng chung hệ thống thanh toán Casso/PayOS với billing Plus subscription
- Không cần thêm code ở OrderPage

---

## Test Plan

Sau khi sửa, cần cập nhật [`OrderPage.test.tsx`](src/features/order/pages/OrderPage.test.tsx:49) với các test case mới:

1. **Email verification gate (real mode):** Mock `isRealMode=true`, `user.emailVerified=false` → submit → expect error message, expect `createOrder` NOT called
2. **Email verification skip (demo mode):** Mock `isRealMode=false` → submit → expect flow continues normally
3. **Backend fail + error display:** Mock `createOrder` rejects → expect error message visible, expect "Thử lại" + "Xem đơn local" buttons
4. **Backend fail + retry success:** Mock `createOrder` rejects first, resolves second → click "Thử lại" → expect navigate to order-status
5. **Backend fail + view local:** Click "Xem đơn local" → expect navigate to order-status
6. **Confirm dialog flow:** Fill form → click "Đặt đơn" → expect dialog → click "Xác nhận đặt đơn" → expect `createOrder` called
7. **Confirm dialog cancel:** Fill form → click "Đặt đơn" → expect dialog → click "Xem lại" → dialog closes, form unchanged

**Mock cần thêm:**

- `@/lib/auth/AuthContext`: mock `useAuthContext` trả về `{ user: { emailVerified: true/false } }`
- `@/app/utils/app-mode`: mock `isRealMode` trả về `true/false`

---

## Verify

Sau mỗi fix:

```bash
npm run typecheck
npm run build
```

Sau tất cả:

```bash
npm run typecheck
npm run build
npm run lint
```

> ⚠️ `npm run test:run` hiện không chạy được do lỗi hạ tầng vitest (`Cannot read properties of undefined (reading 'config')`). Đây là bug toàn cục không liên quan đến order. Sẽ verify test sau khi hạ tầng vitest được sửa.
